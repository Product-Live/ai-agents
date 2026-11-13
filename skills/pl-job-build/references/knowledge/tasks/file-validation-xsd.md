# file-validation-xsd

> Reference token: DF-TASK-FILE-VALIDATION-XSD-01

Status: GA | Category: file-validation | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-validation-xsd/

## Purpose

"Allows to do an XSD validation. For example you need to check your Import Table XML file." Validates one or more XML files against your own schema or against one of the platform schemas identified by `xsdKey`, with an XSD 1.0/1.1 validator.

## When to use

- After an XSLT that builds the `request` of another task (import items or schema, archive, Excel, FTP, SOAP, rules) and before that task: "This is the usual way to check a generated `request` file before feeding it to the task it targets."
- To validate partner files on reception, with `failOnError: true` to stop the job on an invalid file.

## When not to use

- The file is not XML (JSON, CSV): there is no equivalent task; validate in a script.
- No platform key covers the target (`Items-Request` of `table-export-items`, `file-generation-pdf`, `notification-*`, `file-transformation-*`): ship your own `.xsd` or skip.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILE, FILES | One file or a list. |
| file | FILE | if mode = FILE | - | - | `${previous_task.output.file}`, `file://assets/file.xml` or `${workflow.input.<key>}`. |
| files | FILES | if mode = FILES | - | - | Files to validate. |
| xsd | FILE reference | if xsdKey is not set | - | - | "Your own XSD file.", for example `file://assets/file.xsd` (the documentation types it STRING). |
| xsdKey | STRING | if xsd is not set | - | see list below | Key of a platform schema. |
| xsdVersion | STRING | no | 1.0 | 1.0, 1.1 | XSD version used by the validator. |
| failOnError | BOOLEAN | yes | - | true, false | "`true`: the task will fail if only one file is invalid." |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Documented `xsdKey` values: `azure-storage-blob-put-input-request`, `file-conversion-json-to-xml-input-request`, `file-generation-archive-input-request`, `file-generation-xlsx-input-request`, `protocol-ftp-get-input-request`, `protocol-ftp-move-input-request`, `protocol-ftp-post-input-request`, `protocol-rest-perform-input-request`, `protocol-soap-perform-input-request`, `rules-engine-import-rules-input-request`, `table-import-items-input-request`, `table-import-schema-input-request`.

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${validate_xsd.output.allFilesValid}` | ENUM YES/NO | NO when at least one file is invalid. |
| `${validate_xsd.output.report}` | FILE | Codes: `VALIDATION_SUCCESS` (info, file name and duration), `VALIDATION_ERROR` (error, file name and validation message), `XSD_KEY_INVALID` (warning, unknown `xsdKey`). |

## Example

```json
{
  "name": "file-validation-xsd",
  "taskReferenceName": "validate_xsd",
  "description": "Check the generated import request against the platform schema",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILE",
    "file": "${transform_xslt.output.file}",
    "xsdKey": "table-import-items-input-request",
    "xsdVersion": "1.0",
    "failOnError": true
  }
}
```

## Gotchas and limits

- Limit: input file size 500 Mb.
- XSD version: the FAQ answers "XSD 1.0" while the `xsdVersion` input accepts `1.1`; the documentation shows both, treat 1.1 as available through the input. Set `xsdVersion` explicitly (the VS Code extension schema marks it required) and use `1.1` only when the schema needs assertions or conditional types.
- With `failOnError: false` the task ends COMPLETED whatever the result: branch on `allFilesValid` with a `SWITCH` and a `TERMINATE` guard.
- An unknown `xsdKey` is only a warning (`XSD_KEY_INVALID`); check the report when a key is misspelled, and use the keys exactly as the task page lists them (for items: `table-import-items-input-request`).
- Provide exactly one of `xsd` or `xsdKey`.
- Whether remote `xs:include` and `xs:import` resolve is not documented: keep your own schemas self-contained in `assets/` (recommendation).
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-xslt` (produces the document to validate)
- `table-import-items`, `table-import-schema`, `file-generation-archive`, `file-generation-xlsx`, `protocol-ftp-get`, `protocol-ftp-move`, `protocol-ftp-post`, `protocol-soap-perform`, `rules-engine-import-rules` (targets of the platform keys)
- `switch`, `terminate` (stop the job on an invalid file)
