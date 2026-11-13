# file-conversion-json-to-xml

> Reference token: DF-TASK-FILE-CONVERSION-JSON-TO-XML-01

Status: GA. Category: file-conversion. Documentation: https://learn.product-live.com/data-factory/references/tasks/file-conversion-json-to-xml/

## Purpose

Convert one or more JSON files to an XML format so that an XSLT can process API responses or JSON feeds.

## When to use

- After `protocol-http-perform`, `azure-storage-blob-list` or a JSON user input, before `file-transformation-xslt`.

## When not to use

- JSON-to-JSON shaping: `json-transform-jq`.
- Files that are not UTF-8 or exceed 100 MB.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes (per docs and per schema) | - | FILE, FILES, REQUEST, JSON | Source of the JSON. |
| file | FILE | when mode = FILE | - | - | A previous task output, a `file://assets/` asset or a user input (the page says `file://assets/file.csv`, a copy-paste from the CSV page). |
| files | FILES | when mode = FILES | - | - | Several files. |
| request | FILE | when mode = REQUEST | - | - | XML listing the files to fetch (grammar below). Use only when the other modes do not fit, typically after `protocol-ftp-list` and an XSLT filtering step. |
| json | STRING | when mode = JSON | - | - | A valid JSON document given inline as a string. |
| skipReportGeneration | BOOLEAN | no | false | true, false | `true` skips the report; the `report` output is then absent. |
| logLevel | ENUM | no | info | error, warning, info, debug | Minimum level of the logs written in the report (error < warning < info < debug). |

`request` file grammar (mode REQUEST): `Json-To-Xml/File` (0 or more) / `Url` (1).

```xml
<Json-To-Xml>
    <File>
        <Url>https://www.example.com/data-1.json</Url>
    </File>
</Json-To-Xml>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${json_to_xml.output.file} | FILE | The generated XML (grammar below). |
| ${json_to_xml.output.allFilesTransformed} | ENUM | `YES` or `NO`. |

Output XML (verbatim): W3C XPath Functions 3.1 json-to-xml mapping with capitalised element names: object `<Map>`, array `<Array>`, string `<String>`, number `<Number>`, boolean `<Boolean>`, null `<Null/>`; object properties carry `key`, array members do not.

```xml
<Json-To-Xml>
    <File>
        <File-Name>file.json</File-Name>
        <Data>
            <Map>
                <String key="title">New product</String>
                <Number key="price">12.2</Number>
                <Array key="colors">
                    <Map>
                        <String key="colorType">MAIN</String>
                        <String key="colorValue">red</String>
                    </Map>
                </Array>
            </Map>
        </Data>
    </File>
</Json-To-Xml>
```

`report` is not listed in the outputs table although the report inputs are documented.

## Example

```json
{
    "name": "file-conversion-json-to-xml",
    "taskReferenceName": "json_to_xml",
    "description": "Convert the API response to XML",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "mode": "FILE",
        "file": "${previous_task.output.file}"
    }
}
```

## Gotchas and limits

- Input file size limit 100 MB; the input must be UTF-8.
- Do not mix the two XML vocabularies: this task writes capitalised elements without namespace (`<Map>`, `<String key>`), whereas the `data-*` tasks' XML request and response files use the lowercase W3C vocabulary (`<map>`, `<string key>`) in the `http://www.w3.org/2005/xpath-functions` namespace.
- The output is generic: always pair this task with `file-transformation-xslt` before `table-import-items`.
- `${previous_task.output.file}` in the example stands for the reference name of the task that produced the file.
- Per schema only `mode` is required; `file`, `files`, `request` and `json` follow from the mode. `skipReportGeneration` and `logLevel` are documented but absent from the VS Code extension schema branch (the editor may flag them).

## Related tasks

- `file-conversion-csv-to-xml`: sibling conversion.
- `file-transformation-xslt`: reshape the output.
- `json-transform-jq`: JSON-to-JSON alternative; `protocol-http-perform`, `protocol-ftp-list`: usual sources.
