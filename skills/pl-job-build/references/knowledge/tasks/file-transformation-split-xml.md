# file-transformation-split-xml

> Reference token: DF-TASK-FILE-TRANSFORMATION-SPLIT-XML-01

Status: GA | Category: file-transformation | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-transformation-split-xml/

## Purpose

"Allows to split one XML file to multiple XML files based on XPath." Every node matched by the XPath becomes one output file, named after `fileName` with a numeric suffix.

## When to use

- Chunking a large `table-export-items` file (one file per `Item`, or per group of items after an XSLT regrouping) to iterate with `loop` or `task-batch-execute`.
- Producing one HTML per PDF for `file-generation-pdf`.

## When not to use

- More than 50 chunks: the page carries the "50 files created" limit; regroup nodes with an XSLT first.
- To merge files back: use `file-transformation-merge-xml`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILE, FILES | One input document or a list. |
| file | FILE | if mode = FILE | - | - | `${previous_task.output.file}`, `file://assets/file.xml` or `${workflow.input.<key>}`. |
| files | FILES | if mode = FILES | - | - | Input documents. |
| xpath | STRING | yes | - | absolute XPath | "The XPath, must starts with `/`", for example `/Table/Items/Item`. |
| fileName | STRING | yes | - | must end with `.xml` | "The output file name. Must ends with .xml. Suffix will be automatically added: -1 -2 -3..." |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${split_xml.output.files}` | FILES | "An array of XML files", one per matched node. |
| `${split_xml.output.listing}` | FILE | `<Files><File><Url/><File-Name/></File></Files>` (`product-1.xml`, `product-2.xml`, ...). |
| `${split_xml.output.allFilesGenerated}` | ENUM YES/NO | NO when at least one chunk was not produced. |
| `${split_xml.output.report}` | FILE | Common report output. |

## Example

```json
{
  "name": "file-transformation-split-xml",
  "taskReferenceName": "split_xml",
  "description": "Split the export into one file per item",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILE",
    "file": "${export_items.output.file}",
    "xpath": "/Table/Items/Item",
    "fileName": "product.xml"
  }
}
```

## Gotchas and limits

- Limit: the page includes the generic file-generation limit, "The limitation of files created is 50." Whether a split producing more than 50 nodes fails or truncates is not documented: pre-group nodes with an XSLT so that at most 50 chunks are produced, and read `allFilesGenerated`.
- The shape of each output file is not documented (presumably the matched node as document root, without its ancestors). Test with a real file before writing the consuming XSLT.
- The naming across several inputs in `FILES` mode is not documented. Do not rely on generated names; read the `listing` or `files` output.
- The suffix uses a hyphen (`product-1.xml`), unlike `file-transformation-xslt` which documents `products1.xml` without separator.
- XPath only: no filtering by value beyond what the XPath predicate expresses; put any reshaping in an XSLT before or after the split.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-merge-xml` (reverse operation)
- `file-transformation-xslt` (regroup before, reshape after)
- `loop`, `task-batch-execute` (iterate over the chunks)
- `file-generation-pdf` (one HTML per PDF)
