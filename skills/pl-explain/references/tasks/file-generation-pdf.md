# file-generation-pdf

> Reference token: DF-TASK-FILE-GENERATION-PDF-01

Status: GA | Category: file-generation | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-generation-pdf/

## Purpose

Renders HTML files into PDF files: "Allows to generate one or more PDF files. For each PDF file that must be generated an HTML input file is expected." Stylesheets, images and fonts can be shipped in the job `assets/` folder and referenced relatively.

## When to use

- Product sheets, catalogues or reports: produce the HTML with `file-transformation-xslt` (typically from a `table-export-items` file), then render it here.
- One PDF per item: produce one HTML per PDF (XSLT in `FILES` or `REQUEST` mode, or `file-transformation-split-xml` plus a loop) and use `mode: FILES`.

## When not to use

- For an on-screen summary: use `notification-display-message`.
- For more than 50 documents per execution: batch the inputs.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILE, FILES | One HTML file or a list of HTML files (the documentation gives `mode` no description). |
| file | FILE | if mode = FILE | - | - | "A valid FILE input in HTML format": `${previous_task.output.file}`, `file://assets/page.html` or `${workflow.input.<key>}`. |
| files | FILES | if mode = FILES | - | - | Each file is an HTML file. |
| rootFolder | OBJECT | no | - | - | Needed when the HTML references files of the assets folder: "you must indicates the folder in the folder that is containing the files referenced". |
| rootFolder.path | STRING | if rootFolder is set | - | - | "The path of the folder. It must starts with `file://assets/`", for example `file://assets/Generate-PDF/`. |
| rootFolder.exclude | ARRAY of STRING | no | - | - | Files of that folder not needed for rendering, "otherwise they will be downloaded each time you create a PDF" (the documentation types it STRING; its example is an array). |
| settings | OBJECT | yes | - | - | Page settings (the documentation types it STRING; it is an object in the example). |
| settings.width | STRING | yes | - | value in mm or cm | Page width, for example `210mm`. |
| settings.height | STRING | yes | - | value in mm or cm | Page height, for example `297mm`. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Input HTML contract: "Each HTML file must contain a `<Title>` element, this is element is used for the output file name of the generated PDF file." `<title>products</title>` and `<title>products.pdf</title>` both yield `products.pdf`. Assets are referenced "relatively to the assets folder".

```html
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>products.pdf</title>
        <style>
            body { margin: 0; padding: 0; font-family: 'Lucida Sans', sans-serif; }
        </style>
    </head>
    <body>
        Hello pdf world!
    </body>
</html>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${generate_pdf.output.files}` | FILES | The PDF files generated. |
| `${generate_pdf.output.listing}` | FILE | `<Files><File><Url/><File-Name/></File></Files>`. |
| `${generate_pdf.output.allFilesGenerated}` | ENUM YES/NO | NO when at least one PDF was not generated. |
| `${generate_pdf.output.report}` | FILE | Common report output; carries a warning naming an unusable title string. |

No singular `file` output is documented for this task: read `files` (or the `listing`) even in `FILE` mode.

## Example

```json
{
  "name": "file-generation-pdf",
  "taskReferenceName": "generate_pdf",
  "description": "Generate a pdf from a html file",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILE",
    "file": "${file_transformation_html.output.file}",
    "rootFolder": {
      "path": "file://assets/Generate-PDF/",
      "exclude": [
        "input.xml",
        "test.html"
      ]
    },
    "settings": {
      "width": "210mm",
      "height": "297mm"
    }
  }
}
```

## Gotchas and limits

- Limit: "The limitation of files created is 50."
- A title containing a character that cannot be used in a file name means that PDF is not generated; the task still completes, `allFilesGenerated` is `NO` and the report holds a warning. Branch on `allFilesGenerated`.
- "A missing asset does not fail the generation": unresolved images or stylesheets are simply not rendered. "Check the generated file rather than the task status when a visual is missing."
- Keep `rootFolder.exclude` up to date: every non-excluded file of the folder is downloaded for each PDF.
- The documentation's types for `settings` (STRING) and `rootFolder.exclude` (STRING) are wrong; follow its JSON example (object and array). Its `listing` example shows `.xlsx` names copied from the Excel task.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-xslt` (produce the HTML)
- `file-transformation-split-xml`, `loop` (one HTML per document)
- `file-generation-archive` (bundle the PDFs)
- `notification-send-email`, `protocol-ftp-post` (deliver them)
