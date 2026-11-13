# file-transformation-xslt

> Reference token: DF-TASK-FILE-TRANSFORMATION-XSLT-01

Status: GA | Category: file-transformation | Documentation: https://learn.product-live.com/data-factory/references/tasks/file-transformation-xslt/

## Purpose

"Allows to do an XSLT transformation. An XSLT transformation allows to switch from one XML format to another file format among XML, CSV, TXT, JSON or HTML." It is the workhorse of almost every job: it maps external XML to the platform import format, platform exports to partner formats, and builds the XML `request` documents of other tasks.

## When to use

- Any mapping, filtering or reshaping of XML.
- Building request documents (`Archives`, `Generate-Excel`, `Ftp-Post`, `Items-Request`, `Table` import, `Rules-Engine`, ...), HTML for PDF, email or display message, CSV or TXT exports, JSON output.
- Computing a small value (a count, a flag) with `output: STRING` and consuming it in a `SWITCH`.

## When not to use

- The input is JSON and the logic is simple: `json-transform-jq` keeps it in JSON. For regex-heavy or multi-file logic on JSON, `code-execute-javascript`.
- The input is not XML: convert first (`file-conversion-csv-to-xml`, `file-conversion-xlsx-to-xml`, `file-conversion-json-to-xml`).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILE, FILES, REQUEST | FILE: transform the `file` input. FILES: transform each file of `files`. REQUEST: transform each file listed in `request`. |
| file | FILE | if mode = FILE | - | - | `${previous_task.output.file}`, `file://assets/file.xml` or `${workflow.input.<key>}`. |
| files | FILES | if mode = FILES | - | - | Input documents. |
| request | FILE | if mode = REQUEST | - | - | XML listing documents to transform and their output names (grammar below). |
| xslt | FILE reference | yes | - | - | "The XLST file. Usually a static file in the assets folder.", for example `file://assets/transform.xslt` (the documentation types it STRING). |
| params | ARRAY | no | - | - | Stylesheet parameters, objects `{name, select}` (the documentation types it STRING; its example is an array). |
| params[].name | STRING | if params | - | - | Must match a top-level `<xsl:param name="...">` of the stylesheet exactly. |
| params[].select | STRING or FILE reference | if params | - | - | A non-empty plain string value (`red`, `50`), a file (`file://assets/settings.xml`, `${previous_task.output.file}`, a FILE user input) or any `${workflow.input.<key>}`. See the gotchas: write bare values; how the platform evaluates the value is not documented. |
| output | ENUM | no | FILE | FILE, STRING | "Only taken into account when `mode = FILE`." With `STRING`, the transformation is returned in the `result` output instead of being written to a file. |
| fileName | STRING | yes, except mode = FILE with output = STRING | - | - | Output file name; in `FILES` and `REQUEST` modes an index is appended. The extension should match the `method` of `xsl:output`. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar (`mode: REQUEST`; `/Xslt/File` occurs 0..*; `File/Url` "can come from a previous task, from the job assets, or be a public url"; `File/File-Name` is "The name to give to the output of this transformation"):

```xml
<Xslt>
  <File>
    <Url>https://app.product-live.com/files-data-factory/2345...bcde</Url>
    <File-Name>products-1.xml</File-Name>
  </File>
  <File>
    <Url>https://app.product-live.com/files-data-factory/1234...abcd</Url>
    <File-Name>products-2.xml</File-Name>
  </File>
</Xslt>
```

Stylesheet skeleton (official snippet; `xsl:output` is required, `@method` is `xml|html|xhtml|text|json` and "must be the same as the extension" of `fileName`, `@encoding` always `UTF-8`):

```xml
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:fn="fn"
    xmlns:pl="http://product-live.com"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    version="3.0"
    exclude-result-prefixes="xs fn pl">

    <xsl:output method="xml" indent="yes" encoding="UTF-8" cdata-section-elements="" />

    <xsl:param name="color" select="'red'" />
    <xsl:param name="settings" as="xs:string" select="'./TESTS/settings.xml'" />

    <xsl:template match="/">
        <Result color="{$color}" currency="{document($settings)/settings/defaultCurrency}" />
    </xsl:template>
</xsl:stylesheet>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${transform_xslt.output.file}` | FILE | "The first transformation result. Present in every mode." |
| `${transform_xslt.output.files}` | FILES | "All transformation results, in every mode": only the successful ones, in input order. |
| `${transform_xslt.output.listing}` | FILE | `<Files><File><Url/><File-Name/></File></Files>` of the generated files. |
| `${transform_xslt.output.result}` | STRING | "The transformation as a string. Only when `mode = FILE` and `output = STRING`; in that case no file is produced." |
| `${transform_xslt.output.allFilesTransformed}` | ENUM YES/NO | NO when at least one transformation failed. |
| `${transform_xslt.output.report}` | FILE | Reasons of the failed transformations. |

## Example

```json
{
  "name": "file-transformation-xslt",
  "taskReferenceName": "transform_xslt",
  "description": "Map the supplier file to the table import format",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILE",
    "file": "${xlsx_to_xml.output.file}",
    "xslt": "file://assets/transform.xslt",
    "params": [
      {
        "name": "color",
        "select": "red"
      },
      {
        "name": "settings",
        "select": "file://assets/settings.xml"
      },
      {
        "name": "items",
        "select": "${export_items.output.file}"
      },
      {
        "name": "language",
        "select": "${workflow.input.language}"
      }
    ],
    "fileName": "result.xml"
  }
}
```

## Gotchas and limits

- Engine: the FAQ says "You can use XSLT 1.0 or 2.0 or 3.0 or 3.1" (3.1 is an XPath version, not an XSLT one). Write stylesheets for an XSLT 3.0 processor with XPath 3.1 functions (`xsl:for-each-group`, `xsl:merge`, `xsl:iterate`, `xsl:try`, maps and arrays, `json-to-xml()`, `xml-to-json()`, `parse-json()`, `json-doc()`, `unparsed-text()`, `doc()`, regex functions, `format-date()`). Whether `xsl:result-document` (several outputs) is honoured by the platform is not documented: produce one output per transformation and use `mode: FILES` for many inputs.
- How the platform evaluates `params[].select` (as a literal or as an XPath expression) is not documented. The documentation shows both a quoted form (the prose: "If you need to pass a static string, the string must be encapsulated in simple quotes") and a bare form (the example: `"select": "red"`); prefer the bare form and never rely on how surrounding quotes are handled. Write `"select": "red"`, `"select": "50"`; never `"select": "'red'"`. To pass "no value", omit the param entry so that the stylesheet's own `<xsl:param select="...">` default applies, or pass an explicit sentinel the stylesheet tests (`"select": "none"`); never `"select": ""` (the offline validator rejects an empty `select`, and what the platform does with one is not documented). Local runners may treat a quoted value differently from the platform; bare values avoid the difference.
- A file passed as a parameter (`file://assets/...`, `${task.output.file}`, a FILE user input): the documentation does not describe the value the stylesheet receives. The generic jobs it publishes open such params with `document($p)`, `doc($p)` or `unparsed-text($p)`; follow that pattern (convention of these skills: declare the param `as="xs:string"`, write `document($p)/Table` rather than `$p/Table`; `json-doc($p)` and `unparsed-text-lines($p)` work the same way).
- The documentation types `params` as `STRING`; how a value is typed inside the stylesheet (`xs:string` or `xs:untypedAtomic`) is not documented. Convention of these skills: declare every `xsl:param` `as="xs:string"` and convert inside the stylesheet: `xs:integer($count)`, and `normalize-space(upper-case($flag)) = 'YES'` for a `YES`/`NO` flag. Never declare `as="xs:boolean"` for a `YES`/`NO` flag (the conversion of `YES` fails), and do not rely on `as="xs:integer"` either: the local runners pass untyped values, and the platform typing is not documented.
- Inside the stylesheet, `<xsl:param select="...">` IS an XPath expression (quotes needed: `select="'yes'"`); in `job.json` it is NOT. Give every parameter a default so the stylesheet runs standalone.
- What happens to a `params[].name` that matches no top-level `xsl:param` is not documented (in standard XSLT, a declared parameter that is not supplied takes its stylesheet default). Keep the names identical.
- Never pass a secret through `params`: the report lists the task inputs.
- `output: STRING` is only honoured with `mode: FILE`. The documentation marks `fileName` as not required in that case, while the VS Code extension schema always requires `mode`, `xslt` and `fileName`; the documentation shows both, prefer always setting `fileName`.
- Naming in `FILES` and `REQUEST` modes: the page says outputs are named after `fileName` with the position appended "before the extension and without a separator" (`products1.xml`, `products2.xml`), but its listing example shows `product-1.xml`. Never rely on generated names; read `files` or the `listing`.
- How a failed transformation surfaces: the task page says a file that fails "is left out, `allFilesTransformed` becomes `NO`, and the reason is written to the `report` - the task itself still completes, so read `allFilesTransformed` rather than the task status". The decision-and-terminate tutorial says `<xsl:message terminate="yes">` forces "the task to end in error" and sets `optional: true` on that task so that the job goes on to the flag check (the reporting tutorial does the same). The documentation shows both behaviours: write for both. Reserve `terminate="yes"` for a broken job contract or a failure the brief asks for (every other data shape gets a fallback and a report that does not stop the job). Set `optional: true` on every XSLT task whose stylesheet can terminate on purpose and follow it with a `SWITCH` (`javascript` evaluator, input `transformed: ${<ref>.output.allFilesTransformed}`, expression `$.transformed == 'YES' ? 'OK' : 'FAILED'`, so that an absent value also lands in `FAILED`) whose `FAILED` case is a `TERMINATE` `FAILED` with a user-facing message and the task `report` in its `outputParameters`. Without that guard, what the next task receives when no file was produced is not documented.
- Limits: input file size 500 Mb. Performance rules: "never call the same xpath twice" (declare a variable), avoid `//`, check http://www.xsltfunctions.com/ before writing a function.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-validation-xsd` (check a generated request before the consuming task)
- `file-transformation-split-xml`, `file-transformation-merge-xml` (chunk or regroup inputs)
- `file-conversion-csv-to-xml`, `file-conversion-xlsx-to-xml`, `file-conversion-json-to-xml` (get XML in)
- `json-transform-jq`, `code-execute-javascript` (JSON-side logic)
- `table-export-items`, `table-import-items` (usual source and destination)
