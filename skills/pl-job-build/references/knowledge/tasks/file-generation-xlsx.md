# file-generation-xlsx

> Reference token: DF-TASK-FILE-GENERATION-XLSX-01

Status: GA | Category: file-generation | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-generation-xlsx/

## Purpose

Generates one or more Excel workbooks by filling cells of an `.xlsx` or `.xlsm` template shipped in the job assets ("This task allows to generate one or more Excel documents"). The template keeps its styles: inserting text, numbers or images "does not alter the style present for this cell in the target template file".

## When to use

- Branded or formatted Excel exports, with text, numbers, images and hyperlinks, possibly several sheets per workbook and several workbooks per run.
- The request is usually produced by `file-transformation-xslt` from a `table-export-items` file.

## When not to use

- To read an Excel file: use `file-conversion-xlsx-to-xml`.
- More than 50 workbooks per execution: batch the requests (for example with `task-batch-execute`).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| request | FILE | yes | - | - | `<Generate-Excel>` XML (grammar below): `${previous_task.output.file}`, `file://assets/request.xml` or `${workflow.input.<key>}`. |
| templates | ARRAY | yes | - | - | Template files; "The file must be a .xlsx file in the assets folder of the job." |
| templates[].key | STRING | yes | - | - | Key referenced by `<Template-Key>` in the request. |
| templates[].file | FILE | yes | - | - | `.xlsx` (Excel Workbook) or `.xlsm` (Macro-Enabled Workbook), for example `file://assets/shoes.xlsx`. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar:

```xml
<Generate-Excel>
  <File>
    <File-Name>products.xlsx</File-Name>
    <Template-Key>shoes</Template-Key>
    <Sheets>
        <Sheet>
            <Sheet-Name>products</Sheet-Name>
            <Cells>
                <Cell-Text line="1" column="1">EAN</Cell-Text>
                <Cell-Text line="1" column="2">Price</Cell-Text>
                <Cell-Text line="1" column="3">Image</Cell-Text>
                <Cell-Text line="1" column="4">Link</Cell-Text>
                <Cell-Text line="2" column="1">0123456789012</Cell-Text>
                <Cell-Number line="2" column="2">12.3</Cell-Number>
                <Cell-Image line="2" column="3">https://example.com/28a01a76849106eb.jpg?preset=small</Cell-Image>
                <Cell-Link line="2" column="4" type="URL" url="https://www.example.com">Link to the product page</Cell-Link>
            </Cells>
        </Sheet>
    </Sheets>
  </File>
</Generate-Excel>
```

| XPath | Occurs | Meaning |
| --- | --- | --- |
| `/Generate-Excel/File` | 1..* | One output workbook |
| `File/File-Name` | 1 | Output file name |
| `File/Template-Key` | 1 | Key of one of the `templates[]` entries |
| `File/Sheets/Sheet` | 1..* | One sheet to fill |
| `Sheet/Sheet-Name` | 1 | Sheet name; created when it does not exist in the template (the documentation reads "If the sheet does exist it will be created") |
| `Sheet/Cells/Cell-Text` | 0..* | Text cell; `@line` and `@column` start at 1 |
| `Sheet/Cells/Cell-Number` | 0..* | Number cell, `.` as decimal separator |
| `Sheet/Cells/Cell-Image` | 0..* | Image URL; "The image will fit the space of the cell." |
| `Sheet/Cells/Cell-Link` | 0..* | Hyperlink; `@type` is `URL`, `FILE` (local path), `EMAIL` (mailto) or `DOCUMENT` (another cell, `@url` such as `'Sheet1'!A1`) |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${generate_xlsx.output.files}` | FILES | The generated workbooks. |
| `${generate_xlsx.output.listing}` | FILE | `<Files><File><Url/><File-Name/></File></Files>`. |
| `${generate_xlsx.output.allFilesGenerated}` | ENUM YES/NO | NO when at least one workbook was not generated. |
| `${generate_xlsx.output.report}` | FILE | Codes: `GENERATE_EXCEL_START`, `GENERATE_EXCEL_COMPLETE`, `GENERATE_EXCEL_COMPLETE_WITH_MISSING_IMAGES`, `GENERATE_EXCEL_COMPLETE_WITH_MISSING_FILES`, `GENERATE_EXCEL_IMAGE_FAILED`, `GENERATE_EXCEL_INVALID_NUMBER`, `GENERATE_EXCEL_INVALID_XML`, `GENERATE_EXCEL_INVALID_PARAMETERS`, `GENERATE_EXCEL_FILE_FAILED`, `GENERATE_EXCEL_UNKNOWN_ERROR`. |

## Example

```json
{
  "name": "file-generation-xlsx",
  "taskReferenceName": "generate_xlsx",
  "description": "Fill the shoes template with the exported items",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "request": "${build_excel_request.output.file}",
    "templates": [
      {
        "key": "shoes",
        "file": "file://assets/shoes.xlsx"
      }
    ]
  }
}
```

## Gotchas and limits

- Limit: "The limitation of files created is 50."
- Sheet names: at most 31 characters (longer names are truncated, for example `PRODUCT_KEY_1_WITH_A_VERY_LONG_SHEET_NAME` becomes `PRODUCT_KEY_1_WITH_A_VERY_LONG`), unique within a workbook, not empty, none of `/ ? * [ ]`. A violation means the document is not generated and `allFilesGenerated` is `NO`.
- Template sheets that the request does not fill: whether they are kept in the generated workbook or removed is not documented (the documentation only says a `Sheet-Name` missing from the template is created). When the sheets are dynamic (one per category, per language), reuse the template's existing sheet for something every workbook needs, for example a summary sheet, by naming it in the request, so that no empty placeholder sheet can be left behind.
- The template must be a `file://assets/...` reference; it is resolved when the job is uploaded, so the file must be present in the package (and not excluded by `.jobignore`).
- A `Cell-Number` whose content is not a number produces `GENERATE_EXCEL_INVALID_NUMBER`; keep numbers in the XSLT with `.` as decimal separator.
- Missing images do not stop the generation (`GENERATE_EXCEL_COMPLETE_WITH_MISSING_IMAGES`): check the report when visuals matter.
- The documentation's inputs table has no "Required" column; the required flags above come from the inline descriptions. Validate a generated request with `file-validation-xsd` and `xsdKey: file-generation-xlsx-input-request`.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-xslt` (build the request)
- `table-export-items` (source of the data)
- `file-validation-xsd` (check the request)
- `file-conversion-xlsx-to-xml` (reverse direction)
- `task-batch-execute` (one workbook per request file with a shared template)
