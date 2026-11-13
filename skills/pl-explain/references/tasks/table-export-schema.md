# table-export-schema

> Reference token: DF-TASK-TABLE-EXPORT-SCHEMA-01

Status: GA | Category: table | Documentation: https://learn.product-live.com/data-factory/references/tasks/table-export-schema/

## Purpose

"You need to export a structure from a Product-Live table." Dumps the table definition (levels, partitions, identifiers, classifications, fields and options, matrix, conditional formattings, sections, screens) as the same `<Table><Schema>` XML that `table-import-schema` consumes.

## When to use

- First step of almost every export or import design: discover keys, types, options and partitions before writing an XSLT.
- Back up or clone a table structure: export, rename with `file-transformation-xslt`, `table-import-schema`.
- Drive dynamic headers: an XSLT reads the schema to build spreadsheet columns.

## When not to use

- Exporting item values (`table-export-items`).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| tableKey | STRING | yes | | | "Reference a table key." |
| mode | ENUM | yes | | ALL, ACTIVE | "ACTIVE = only elements that are not archived are exported. ALL = all elements are exported regardless their status." |
| fileName | STRING | yes | | | "Defines name of the output file. It must not contain the extension." The documented example nevertheless passes `items.xml`: prefer that form, a name with the `.xml` extension (see `job-format.md` section 6). |
| accountKey | STRING | only for tables shared by a partner | | | "You need to indicates the account key only if it's a shared table by a partner otherwise do not use this property. You can find the partner key in Settings > Network > Partners" |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${export_schema.output.file} | FILE | "The table schema in the XML format described below. The output format is basically the same as the input format" of `table-import-schema` (see that file for the grammar) |
| ${export_schema.output.report} | FILE | Execution report |

## Example

```json
{
  "name": "table-export-schema",
  "taskReferenceName": "export_schema",
  "description": "Export the active structure of the products table",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "tableKey": "PRODUCTS",
    "mode": "ACTIVE",
    "fileName": "schema.xml"
  }
}
```

## Gotchas and limits

- Screens in the export follow the `table-import-schema` grammar, including its optional parts. The `Section` elements of `Grid/Common` and `Grid/Specific` occur 0..*, and the Occurs table also lists a column directly under `Grid/Common`. A `Column-Composite` lists its sub-columns inside `Section` elements or directly as `Column-Field` children (both documented); a composite column without sub-columns is not documented. Code that reads screens (an XSLT building an Excel export, for example) reads columns both inside and outside sections and tolerates a composite column that lists none: it falls back, for example, to every sub-field of the composite definition (the user guide says the composite screen opened from the grid shows all the fields composing it) and reports the fallback.
- The export holds the screen definitions only: the private screen settings users save in the app (hidden, pinned or reordered columns) have no element in the grammar, so they are not exported (inference from the grammar).
- Output file size limit: 250 Mb.
- "In collect strategies, the use-if-empty attribute is only exported when it is set to false. A field exported without this attribute uses the default value true. Importing the exported file again keeps the same matching behavior."
- The documentation shows both "must not contain the extension" and an example with `items.xml`; prefer the example form, a name with the `.xml` extension (see `job-format.md` section 6).
- Use `mode: "ACTIVE"` in export pipelines so archived fields do not pollute generated headers; use `ALL` for backups.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `table-import-schema` (grammar and re-import), `table-export-items`
- `file-transformation-xslt`
