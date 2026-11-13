# file-transformation-merge-xml

> Reference token: DF-TASK-FILE-TRANSFORMATION-MERGE-XML-01

Status: alpha (a recent task, available on every account) | Category: file-transformation | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-transformation-merge-xml/

## Purpose

"Allows to merge XML files into a single XML file." Each input document is wrapped in a `<File><File-Name/><Data>...</Data></File>` element of one `<Merge-Xml>` document, so a single XSLT can process a whole batch.

## When to use

- Several files fetched by `protocol-ftp-get` or produced by a loop must be processed by one `file-transformation-xslt` run.
- Reverse of `file-transformation-split-xml`: regroup chunks after per-chunk processing.

## When not to use

- More than 200 files: "the task ends with an error". Merge in several passes.
- Inputs that are not well-formed XML: the file is reported with a W3C error code and skipped.
- This task is in alpha phase: a recent task, available on every account.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILES, REQUEST | FILES: merge the `files` input. REQUEST: merge the files listed in `request`. |
| files | FILES | if mode = FILES | - | - | `${previous_task.output.files}` or `${workflow.input.<key>}`. |
| request | FILE | if mode = REQUEST | - | - | XML listing the files to merge (grammar below). |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar (`mode: REQUEST`; `/Merge-Xml/File` occurs 0..*, `File/Url` exactly once):

```xml
<Merge-Xml>
  <File>
    <Url>https://app.product-live.com/files-data-factory/2345...bcde</Url>
  </File>
  <File>
    <Url>https://app.product-live.com/files-data-factory/789a...0123</Url>
  </File>
</Merge-Xml>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${merge_xml.output.file}` | FILE | The merged document (shape below). |
| `${merge_xml.output.allFilesMerged}` | ENUM YES/NO | NO when at least one input could not be merged. |
| `${merge_xml.output.report}` | FILE | One `ADDED_FILE` info log per merged file; errors carry a W3C code such as `err:FODC0006` (input not well-formed). |

Output document (`File/File-Name` is the original name, `File/Data` the original content):

```xml
<Merge-Xml>
  <File>
    <File-Name>1.xml</File-Name>
    <Data>
      [[XML content]]
    </Data>
  </File>
  <File>
    <File-Name>2.xml</File-Name>
    <Data>
      [[XML content]]
    </Data>
  </File>
</Merge-Xml>
```

## Example

```json
{
  "name": "file-transformation-merge-xml",
  "taskReferenceName": "merge_xml",
  "description": "Merge the files fetched from the FTP server into a single document",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILES",
    "files": "${ftp_get.output.files}"
  }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- Limit: "The maximum files to be merged is limited to `200`. If more files are provided, the task ends with an error."
- "Whatever the severity `info`, `warning` or `error`, the task final status is success. The task ends up in error only when an unknown error is encountered." Branch on `allFilesMerged`, not on the task status.
- The consuming XSLT must address content through `/Merge-Xml/File/Data/<root-of-original>`; the original root element is nested, not replaced.
- The documentation's report example shows `Report/@task` as `task-transformation-merge-xml`, which does not match the task name; do not rely on that attribute.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-split-xml` (reverse operation)
- `file-transformation-xslt` (process the merged document)
- `protocol-ftp-get`, `loop` (sources of many files)
