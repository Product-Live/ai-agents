# file-generation-archive

> Reference token: DF-TASK-FILE-GENERATION-ARCHIVE-01

Status: GA | Category: file-generation | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-generation-archive/

## Purpose

Builds one or more archives (`zip` by default, `7z`, `tar`, `gzip`) from a list of file URLs described in an XML `request` document. The documentation says "Allows to generate an archive with a .zip extension"; one request can describe several archives.

## When to use

- Bundling exported files or images (outputs of `table-export-items`, `file-generation-pdf`, `file-generation-xlsx`) before `protocol-ftp-post`, an email attachment or a job result.
- Renaming files inside the bundle: each `File/Path` sets the name in the archive, and "the source and target extension may not match".

## When not to use

- To extract an archive: use `file-conversion-unarchive`.
- For more than about 500 files or files over 2 GB: split into several archives.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| request | FILE | yes | - | - | `<Archives>` XML (grammar below): `${previous_task.output.file}`, `file://assets/archives.xml` or `${workflow.input.<key>}`. "You can use a static file stored in the asset folder, or you can generate this file from a Transform XSLT task." |
| allowPartial | BOOLEAN | yes | - | true, false | true: "if there is an error adding a file to an archive, the archive is still generated although it is incomplete". false: "If there is an error adding a file, the archive is not generated, a log is added to the execution report and the task continues to run". |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar:

```xml
<Archives>
    <Archive>
        <File-Name>images.zip</File-Name>
        <Compression-Method>zip</Compression-Method>
        <Compression-Level>NORMAL</Compression-Level>
        <Password>********</Password>
        <Files>
            <File>
                <Path>image-1.jpg</Path>
                <Url>https://example.com/ee0c68fabf0a2b3c76b2643bff3cc215030f0caf.jpg</Url>
            </File>
            <File>
                <Path>image-2.jpg</Path>
                <Url>https://example.com/7a597747dbc536e53eeb47760b5145d002b5bc25.jpg</Url>
            </File>
        </Files>
    </Archive>
</Archives>
```

| XPath | Occurs | Meaning |
| --- | --- | --- |
| `/Archives` | 1 | Root (the former name `Zips` is still accepted but deprecated) |
| `/Archives/Archive` | 1..* | One archive to generate (former name `Zip`) |
| `Archive/File-Name` | 1 | Name of the generated archive, with its extension |
| `Archive/Compression-Method` | 0..1 | `zip` (default), `7z`, `tar`, `gzip` |
| `Archive/Compression-Level` | 0..1 | `NONE`, `FASTEST`, `FAST`, `NORMAL` (default), `MAX`, `ULTRA`; `tar` only accepts `NORMAL` |
| `Archive/Password` | 0..1 | Only for `7z` and `zip` |
| `Archive/Files/File` | 0..* | One source file ("Creating an empty archive is allowed.") |
| `File/Path` | 1 | Unix-style path inside the archive, relative to its root; a leading `/` is optional |
| `File/Url` | 1 | Source file URL (a temporary file URL from a previous task, an asset or an external URL) |

## Outputs

Outputs are available whenever the task completes its execution (status COMPLETED or FAILED), not on CANCELED or TIMED_OUT.

| Path | Type | Meaning |
| --- | --- | --- |
| `${generate_archive.output.file}` | FILE | "The first archive defined in the `request` parameter." |
| `${generate_archive.output.files}` | FILES | All generated archives. |
| `${generate_archive.output.listing}` | FILE | `<Files><File><Url/><File-Name/></File></Files>`; an archive that could not be generated does not appear. |
| `${generate_archive.output.allFilesGenerated}` | ENUM YES/NO | NO when at least one archive was not generated. |
| `${generate_archive.output.report}` | FILE | Each log carries an `xpath` metadata such as `/Archives/Archive[position()=1]/Files/File[position()=2]/`. |

## Example

```json
{
  "name": "file-generation-archive",
  "taskReferenceName": "generate_archive",
  "description": "Bundle the exported images into one zip",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "request": "${build_archive_request.output.file}",
    "allowPartial": true
  }
}
```

## Gotchas and limits

- Limits: maximum size of a file added to an archive 2GB; no hard limit on the number of files but "recommended to not exceed 500 files".
- Status semantics ("A log does not mean the task failed"): an invalid parameter before archiving (bad `allowPartial` value, missing `request` file) ends the task FAILED; once archiving has started, every problem is a log and "the task ends in success" whatever the severity. Read `allFilesGenerated`, `listing` and `report`; never trust the status alone.
- Directories: the documentation shows `/folder-1/image-1.jpg` paths in its example and its path section, but also states "Creating directories in generated archives is not supported. Only a `Path` mentioning a file at the root of the archive is supported. Otherwise, the archive is not generated". The documentation shows both; prefer root-level paths until verified on the platform.
- "gzip compression only compresses a single file": several files with `gzip` produce `GZIP_COMPRESSION_IS_NOT_SUPPORTED_FOR_MULTIPLE_FILES` and no archive; assemble a `tar` first.
- A duplicate `Path` inside one archive is skipped (`FILENAME_ALREADY_EXISTS`). An unreachable `Url` gives `URL_NOT_REACHABLE`: with `allowPartial: true` the archive is generated without that file, with `false` it is not generated.
- Other report codes: `ARCHIVE_GENERATED` (info), `ARCHIVE_NOT_GENERATED` (always present when an archive is missing, next to the cause), `ARCHIVE_IS_EMPTY`, `INVALID_ARCHIVE_NAME`, `INVALID_COMPRESSION_METHOD`, `INVALID_COMPRESSION_LEVEL`, `EMPTY_TAG` (NORMAL level used), `GZIP_COMPRESSION_INVALID_PATH` (warnings), `INVALID_INPUT` (error, names the input).
- Validate a generated request with `file-validation-xsd` and `xsdKey: file-generation-archive-input-request`.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-conversion-unarchive` (reverse operation)
- `file-transformation-xslt` (build the request, for example from the image URLs of a `table-export-items` file)
- `file-validation-xsd` (check the request)
- `protocol-ftp-post`, `notification-send-email` (deliver the archive)
