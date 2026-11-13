# file-conversion-xlsx-to-xml

> Reference token: DF-TASK-FILE-CONVERSION-XLSX-TO-XML-01

Status: GA | Category: file-conversion | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-conversion-xlsx-to-xml/

## Purpose

Converts one or more `.xlsx` workbooks into a generic row/cell XML document ("You need to convert one or more XLSX file to an XML format"). You name the sheets and the rectangular areas to extract; the task writes every non-empty cell with its row and column numbers.

## When to use

- An Excel file (user upload, FTP drop, email attachment) must be mapped to a platform format: run this task, then `file-transformation-xslt` to produce a `table-import-items` request.
- Several workbooks share the same layout: use `mode: FILES`; all of them land in one output document.

## When not to use

- The input is `.xls` (legacy binary format): it "cannot be converted". Save it as `.xlsx` first.
- The input is CSV: use `file-conversion-csv-to-xml`.
- You want to produce an Excel file: use `file-generation-xlsx`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILE, FILES | Single file or list of files (the documentation types it STRING and leaves the description empty; the values come from its examples). |
| file | FILE | if mode = FILE | - | - | "A valid `xlsx` input file": `${previous_task.output.file}`, `file://assets/file.xlsx` or `${workflow.input.<key>}`. |
| files | FILES | if mode = FILES | - | - | List of xlsx files. |
| sheets | ARRAY | yes | - | - | "An array of `xlsx` sheets" to extract. |
| sheets[].name | STRING | yes | - | - | Name of the sheet in the workbook. |
| sheets[].areas | ARRAY | yes | - | - | Rectangular areas to parse in that sheet. |
| sheets[].areas[].startColumn | NUMBER | yes | - | 1-based | First column of the area. |
| sheets[].areas[].endColumn | NUMBER | yes | - | 1-based | Last column of the area. |
| sheets[].areas[].startLine | NUMBER | yes | - | 1-based | First row of the area. |
| sheets[].areas[].endLine | NUMBER | yes | - | 1-based | Last row of the area. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${xlsx_to_xml.output.file}` | FILE | One `Xlsx-To-Xml` XML document holding every converted input file (shape below). |
| `${xlsx_to_xml.output.allFilesTransformed}` | ENUM YES/NO | NO when at least one input file failed; that file simply has no `<File>` element. |
| `${xlsx_to_xml.output.report}` | FILE | Execution report (common report output). |

Output document:

```xml
<Xlsx-To-Xml>
    <File>
        <File-Name>products.xlsx</File-Name>
        <Sheets>
            <Sheet>
                <Sheet-Name>products</Sheet-Name>
                <Sheet-Index>1</Sheet-Index>
                <Rows>
                    <R i="1">
                        <C j="1">EAN</C>
                    </R>
                    <R i="2">
                        <C j="1">1234567890123</C>
                    </R>
                </Rows>
            </Sheet>
        </Sheets>
    </File>
</Xlsx-To-Xml>
```

| XPath | Occurs | Meaning |
| --- | --- | --- |
| `/Xlsx-To-Xml/File` | 0..* | One element per successfully converted input file |
| `File/File-Name` | 1 | Original file name |
| `File/Sheets/Sheet` | 0..* | One per requested sheet; `Sheet-Index` is the 1-based position in the workbook |
| `Sheet/Rows/R` | 0..* | One per non-empty row; `@i` is the row number in the sheet |
| `R/C` | 0..* | One per non-empty cell; `@j` is the column number in the sheet |

"Extracting the area `B5:D10` therefore yields rows numbered from `5` and columns from `2`."

## Example

```json
{
  "name": "file-conversion-xlsx-to-xml",
  "taskReferenceName": "xlsx_to_xml",
  "description": "Extract the products sheet of the uploaded workbook",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILE",
    "file": "${workflow.input.products_file}",
    "sheets": [
      {
        "name": "products",
        "areas": [
          {
            "startColumn": 1,
            "endColumn": 12,
            "startLine": 1,
            "endLine": 5000
          }
        ]
      }
    ]
  }
}
```

## Gotchas and limits

- Input file size limit: 250 Mb.
- `endLine` and `endColumn` are mandatory: there is no "until the last row" option. Choose a generous `endLine`; empty rows are skipped anyway ("Empty lines are not exported").
- Cells are sparse: a row may miss some `C` elements (empty cells, or a cell whose formula could not be evaluated, which is skipped with a warning naming the cell). In the consuming XSLT, address cells with `C[@j = 3]`, never by position.
- "Why is there no `<File>` in the generated output file? It can be due to the fact that you mentioned a sheet that does not exist in the xlsx file." Sheet names are matched exactly.
- If every file fails, the output document holds no `<File>` at all while the task still ends COMPLETED: test `allFilesTransformed`.
- No `files` or `listing` output exists for this task; the single `file` output carries everything.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-xslt` (map the row/cell XML to a target format)
- `file-conversion-csv-to-xml` (same idea for CSV)
- `file-generation-xlsx` (reverse direction)
- `table-import-items` (typical destination)
