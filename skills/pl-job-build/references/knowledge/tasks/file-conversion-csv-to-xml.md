# file-conversion-csv-to-xml

> Reference token: DF-TASK-FILE-CONVERSION-CSV-TO-XML-01

Status: GA. Category: file-conversion. Documentation: https://learn.product-live.com/data-factory/references/tasks/file-conversion-csv-to-xml/

## Purpose

Convert one or more CSV files to an XML format: a generic cell grid (`R` and `C` elements) that is then usually reshaped with `file-transformation-xslt`.

## When to use

- First step of any CSV or TXT import pipeline (for example `protocol-ftp-get`, this task, `file-transformation-xslt`, `table-import-items`).

## When not to use

- XLSX input: `file-conversion-xlsx-to-xml`. JSON input: `file-conversion-json-to-xml`.
- Files that are not UTF-8 or exceed 250 MB.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes (per docs and per schema) | - | FILE, FILES | One file or several. |
| file | FILE | when mode = FILE | - | - | `${previous_task.output.file}`, `file://assets/file.csv` or `${workflow.input.<key>}`. |
| files | FILES | when mode = FILES | - | - | `${previous_task.output.files}` or a FILES user input. |
| columnSeparator | STRING | yes (per docs and per schema) | - | usually ; or , or the pipe character | Column separator. |
| textDelimiter | STRING | yes (per docs and per schema) | - | usually " or ' | Text delimiter. |
| escapeCharacter | STRING | yes (per docs and per schema) | - | usually the same as textDelimiter | Escape character for the delimiter inside text (for example `"Produit 1";"Tele 51"" ou plus"`). |
| allowEmpty | BOOLEAN | no | false | true, false | `true`: empty values are exported as empty cells; `false`: empty cells are omitted. |
| fileName | STRING | no | input name with .xml (mode FILE), file.xml (mode FILES) | - | Name of the generated XML file. Not in the VS Code extension schema branch. |
| skipReportGeneration | BOOLEAN | no | false | true, false | `true` skips the report; the `report` output is then absent. |
| logLevel | ENUM | no | info | error, warning, info, debug | Minimum level of the logs written in the report (error < warning < info < debug). |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${csv_to_xml.output.file} | FILE | The generated XML (grammar below). |
| ${csv_to_xml.output.allFilesTransformed} | ENUM | `YES` or `NO`; only present when `mode = FILES`. |

Output XML (verbatim): `Csv-To-Xml/File` (one per input file) / `File-Name` / `Rows/R[@i]` (row, 1-based) / `R/C[@j]` (cell, 1-based).

```xml
<Csv-To-Xml>
    <File>
        <File-Name>products.csv</File-Name>
        <Rows>
            <R i="1">
                <C j="1">EAN</C>
                <C j="2">1234567890123</C>
                <C j="3">1234567890124</C>
            </R>
        </Rows>
    </File>
</Csv-To-Xml>
```

`report` is not listed in the outputs table although the report inputs are documented.

## Example

```json
{
    "name": "file-conversion-csv-to-xml",
    "taskReferenceName": "csv_to_xml",
    "description": "Convert the downloaded CSV file to XML",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "mode": "FILE",
        "file": "${previous_task.output.file}",
        "columnSeparator": ";",
        "textDelimiter": "\"",
        "escapeCharacter": "\""
    }
}
```

## Gotchas and limits

- Input file size limit 250 MB; the input must be UTF-8. A `.txt` file works (the extension is not checked).
- Illegal XML characters are removed; no CDATA; only `&`, `<` and `>` are encoded; an empty cell is omitted unless `allowEmpty`; the document is generated without indentation.
- With `mode = FILES`, files are processed in input order; a file whose conversion fails still gets a `<File>` with `File-Name` but no rows, `allFilesTransformed` is `NO` and the task completes (count rows, not `<File>` elements); a file that cannot be downloaded ends the task in error.
- `allFilesTransformed` exists only in FILES mode (documented but easy to miss).
- The output is a generic grid: always pair this task with `file-transformation-xslt` before `table-import-items`.
- `${previous_task.output.file}` in the example stands for the reference name of the task that produced the file.
- The `escapeCharacter` description of the page refers to an image; `fileName`, `skipReportGeneration` and `logLevel` are documented but absent from the VS Code extension schema branch (the editor may flag them).

## Related tasks

- `file-conversion-xlsx-to-xml`, `file-conversion-json-to-xml`: sibling conversions.
- `file-transformation-xslt`: reshape the grid.
- `protocol-ftp-get`, `table-import-items`: usual neighbours.
