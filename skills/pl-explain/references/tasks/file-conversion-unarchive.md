# file-conversion-unarchive

> Reference token: DF-TASK-FILE-CONVERSION-UNARCHIVE-01

Status: GA | Category: file-conversion | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-conversion-unarchive/

## Purpose

Uncompresses one or more archives (`zip`, `7z`, `tar`, `gzip`, optionally password-protected) and exposes the extracted files as task outputs. The documentation sums it up as "Allows to uncompress an archive with a .zip extension".

## When to use

- Right after fetching an archive (`protocol-ftp-get`, `protocol-http-perform` with a FILE response, or a user upload read with `${workflow.input.<key>}`) and before processing the files it contains.
- When each archive needs its own compression method or password: use `mode: REQUEST` with an `<Archives>` document.

## When not to use

- To build an archive: use `file-generation-archive`.
- When the archive exceeds 1 Go or holds more than 15 000 files: split it upstream.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILE, FILES, REQUEST | FILE: unarchive the `file` input. FILES: unarchive each archive of `files`. REQUEST: unarchive the archives listed in `request`, each with its own method and password. |
| file | FILE | if mode = FILE | - | - | `${previous_task.output.file}`, `file://assets/archive.zip` or `${workflow.input.<key>}`. |
| files | FILES | if mode = FILES | - | - | `${previous_task.output.files}` or `${workflow.input.<key>}`. |
| request | FILE | if mode = REQUEST | - | - | XML document listing the archives (grammar below). |
| compressionMethod | ENUM | see gotchas | auto-detected | zip, 7z, tar, gzip | "If no compression method is specified, the application will attempt to detect the most appropriate decompression mode." |
| password | STRING | see gotchas | - | - | "If appropriate, the password to decrypt the file." |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar (`mode: REQUEST`):

```xml
<Archives>
    <Archive>
        <Url>https://example.com/files/archive.zip</Url>
        <Compression-Method>7z</Compression-Method>
        <Password>********</Password>
    </Archive>
</Archives>
```

| XPath | Occurs | Meaning |
| --- | --- | --- |
| `/Archives` | 1 | Root |
| `/Archives/Archive` | 0..* | One archive to process |
| `/Archives/Archive/Url` | 1 | URL of the archive |
| `/Archives/Archive/Compression-Method` | 0..1 | `zip`, `7z`, `tar` or `gzip`; detected when absent |
| `/Archives/Archive/Password` | 0..1 | Password of this archive, if any |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${unarchive.output.allFilesTransformed}` | ENUM YES/NO | YES when every archive was processed; NO when at least one file was not extracted. |
| `${unarchive.output.file}` | FILE | "The first file found in the archive. Absent when the archive holds no file." |
| `${unarchive.output.files}` | FILES | All extracted files, across all processed archives. |
| `${unarchive.output.listing}` | FILE | XML listing of the extracted files (below). |
| `${unarchive.output.report}` | FILE | Execution report (absent when `skipReportGeneration` is true). |

Listing shape:

```xml
<Files>
    <File source="my-zip.zip">
        <Path>/folder/image-1.jpg</Path>
        <Url>https://example.com/image-1.jpg</Url>
        <Md5>a28ZCRcCSc8orBK+iXxTUw==</Md5>
        <Sha256>c4d5710e040627a040f0fd7a6ceddfc642e8cddc8a83a7e6c104d67a2ca493c7</Sha256>
        <Size>1954387</Size>
    </File>
</Files>
```

`File/@source` names the archive the file came from, `Path` is the complete path inside that archive (always starts with `/`), `Size` is in bytes.

## Example

```json
{
  "name": "file-conversion-unarchive",
  "taskReferenceName": "unarchive",
  "description": "Unarchive the file fetched from the FTP server",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILE",
    "file": "${ftp_get.output.file}"
  }
}
```

## Gotchas and limits

- Limits: input archive 1 Go (best practice 100 Mo); total size of unarchived files 6 Go (best practice 500 Mo); maximum 15 000 files (best practice 200).
- The documentation tags `compressionMethod` and `password` as "required if mode = FILE or mode = FILES", but their descriptions say the method is auto-detected and the password is used "if appropriate". Treat both as optional; set `compressionMethod` explicitly when you know it.
- The task ends COMPLETED even when an entry fails (`UNABLE_TO_EXTRACT_FILE` is a warning: "A single entry of the archive could not be extracted. The others still are."). Branch on `allFilesTransformed` with a `SWITCH`, not on the task status.
- `file` is absent (not `null`) for an empty archive; the order of `files` is not documented.
- Report codes: `ARCHIVE_PROCESSED_SUCCESSFULLY` (info), `URL_NOT_REACHABLE`, `UNABLE_TO_EXTRACT_FILE` (warnings), `UNABLE_TO_OPEN_FILE`, `INVALID_PASSWORD`, `ARCHIVE_SIZE_TOO_BIG`, `TOO_MANY_FILES`, `INVALID_XML_FILE` (REQUEST mode), `UNARCHIVE_FAILED_TO_UPLOAD` (errors).
- Use the `listing` `Path` values in an XSLT to filter extracted files by folder or extension before feeding them to the next task.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-generation-archive` (reverse operation)
- `protocol-ftp-get`, `protocol-http-perform` (fetch the archive)
- `file-conversion-csv-to-xml`, `file-conversion-xlsx-to-xml`, `table-import-items` (process the extracted files)
- `loop`, `task-batch-execute` (iterate over `files`)
