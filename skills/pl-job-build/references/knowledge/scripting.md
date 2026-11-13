# Scripting: JavaScript, expressions, jq, XSLT, XSD and HTML

> Reference token: DF-SCRIPTING-01

Four languages appear inside a job: JavaScript (the `code-execute-javascript` task, plus `SWITCH` and loop expressions), jq (`json-transform-jq`), XSLT with XPath (`file-transformation-xslt`, split and merge) and XSD (`file-validation-xsd`); display messages and emails are HTML.
Each has its own contract and restrictions; the only documented duration is the 10-minute limit of `code-execute-javascript`.
This file gives the exact contract of each, what is supported, and the patterns that work.

Rule for every language: an asset stops the job on purpose only when the job's own contract is broken (a required parameter is empty, the input is not the format the previous task documents) or when the brief says the job must fail in that situation. Every other data shape (an absent optional element, the other side of a documented choice, an empty value, an unknown option key) gets a fallback (raw value, key instead of title, empty cell) and is reported without stopping the job. A stopping message says what is wrong, where, and what to do. How a stop reaches the job differs per engine: a JavaScript `throw` fails the task (section 1.3); for XSLT the documentation shows two behaviours (section 4.1); for jq only the `error` output is documented (section 3).

## 1. `code-execute-javascript` (alpha)

"This task allows to execute Javascript code to produce a result based on the given input parameters." It runs in the platform's JavaScript sandbox: standard ECMAScript, no network, no modules; the whole task stops after 10 minutes (`TIMED_OUT`).

### 1.1 Inputs

| Property | Type | Required | Description |
| -- | -- | -- | -- |
| `expression` | string | required if `expressionFile` is absent | The JavaScript code executed inline. Must `return` a value. |
| `expressionFile` | FILE | required if `expression` is absent | A file containing the code, typically `file://assets/script.js`. Preferred for anything beyond one line. |
| `data` | object | optional | Input data, available as `$.data`. References (`${...}`) are resolved before the script runs, including global variables and asset references. |
| `resources` | array | optional | Files to load. Each entry: `key` (identifier), `file` (`file://assets/...`, `${<ref>.output.file}` or a user FILE input), `loadAs` (`TEXT` default, `JSON`, `XML`), `encoding` (default `utf-8`). Available as `$.resources`, an array of `{ key, content }`. |
| `response` | string | optional | `JSON` (default): the returned value is the `result` output. `FILE`: the returned value is written to a file and `result` is the file reference. |
| `outputFileName` | string | optional | Name of the file written when `response` is `FILE` (for example `output.csv`). |

### 1.2 Outputs

| Property | Type | Description |
| -- | -- | -- |
| `result` | OBJECT or FILE | The returned value (`response: JSON`), navigable as `${sum_product.output.result.sum}`; or a file reference with `url`, `hash`, `name` (`response: FILE`). |
| `logs` | FILE | The lines written with `log()`. |

### 1.3 Script context

| Global | Description |
| -- | -- |
| `$.data` | The `data` object. Nested access with dots: `$.data.users[0].name`. |
| `$.resources` | Array of loaded resources, each `{ key, content }`; `content` is a string (`TEXT`), the parsed value (`JSON`) or an object built from the XML (`XML`). |
| `log(...)` | Writes to the `logs` output; accepts several arguments. `console` is not among the documented globals: use `log()`. |

Rules:

- "The script must return a value using the return keyword." The code is the body of a function: end it with a top-level `return <value>;`. The first example of the task page ends with `f();` instead; the documentation shows both, follow the stated rule.
- With `response: JSON`, return plain objects, arrays, strings, numbers or booleans (JSON-compatible values). With `response: FILE`, a returned string is written as is and an object is serialised to JSON.
- `throw new Error('message')` fails the task with that message; with `optional: true` the job continues and the next task can test `${<ref>.status}`. Throw only on a broken job contract or when the brief says the job must fail (rule at the top of this file).
- `eval()` is forbidden and fails the task. The script "runs in an isolated context with no access to Node.js modules or network": `require`, `import` and `fetch` are not available, and no global other than `$` and `log()` is documented (do not rely on `process`, timers or a file system).
- Plain ECMAScript only: write with the standard built-ins (`Array`, `Object`, `String`, `Number`, `Date`, `Math`, `JSON`, `RegExp`) plus `$` and `log()`, and do not rely on the host APIs of a browser, of Node.js or of any other runtime. Modern syntax (`const`, arrow functions, template literals, `Array.prototype.map`) appears in the examples of the task page; published jobs mostly use conservative ES5 style, which is a safe choice.
- Global variables cannot be written inside the code; pass them through `data`.
- "Always provide default values for input data to avoid runtime errors": `var count = $.data.count || 10;`.
- Large data goes through `resources` or files, never inline (recommendation): no size limit is published for task inputs.
- `loadAs: "XML"` produces an object whose property names are not documented; normalise repeated and single elements with a helper such as `function arr(x) { return x == null ? [] : Array.isArray(x) ? x : [x]; }` and prefer JSON sources when you control the producer.

### 1.4 Examples

Inline expression with data:

```json
{
  "name": "code-execute-javascript",
  "taskReferenceName": "compute_and_export",
  "description": "Compute result and export as file",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "expression": "return { sum: $.data.a + $.data.b };",
    "data": { "a": 10, "b": 20 },
    "response": "FILE"
  }
}
```

Script file, resources and a CSV output:

```json
{
  "name": "code-execute-javascript",
  "taskReferenceName": "generate_csv_file",
  "description": "Generate a CSV file with progress logging",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "expressionFile": "file://assets/generate-csv.js",
    "data": { "count": 5 },
    "resources": [
      { "key": "config", "file": "file://assets/config.json", "loadAs": "JSON" },
      { "key": "items", "file": "${export_items.output.file}", "loadAs": "XML" }
    ],
    "response": "FILE",
    "outputFileName": "output.csv"
  }
}
```

```javascript
var config = $.resources.filter(function (r) { return r.key === 'config'; })[0].content;
var count = $.data.count || 10;
var headers = 'id,name,value\n';
var rows = '';

log('Generating CSV with ' + count + ' rows for ' + config.name);

for (var i = 0; i < count; i++) {
    var value = Math.round(Math.random() * 1000);
    rows += (i + 1) + ',item_' + (i + 1) + ',' + value + '\n';
}

log('CSV generation complete');

return headers + rows;
```

Validation that handles bad items without stopping (the default: skip or fall back, and report):

```javascript
var items = $.data.items || [];
var warnings = [];
var processed = 0;
for (var i = 0; i < items.length; i++) {
    if (items[i].value == null) {
        warnings.push('Item at index ' + i + ' has no "value": skipped; fill it and run the job again to include it');
        continue;
    }
    processed++;
}
return { processed: processed, warnings: warnings };
```

Validation that fails the task, only when the brief says the job must fail on such items (the message names the problem, the place and the remedy):

```javascript
var items = $.data.items || [];
for (var i = 0; i < items.length; i++) {
    if (items[i].value == null) {
        throw new Error('Item at index ' + i + ' has no "value": fill it or remove the item from the selection, then run the job again');
    }
}
return { processed: items.length };
```

Builder of a batch (`task-batch-execute`) reusing an asset resolved at upload time:

```javascript
// $.data.template already holds the asset file object: the file://assets reference was resolved when the job was created.
var template = $.data.template;
var requests = $.data.requests || [];
var tasks = [];
for (var i = 0; i < requests.length; i++) {
    tasks.push({
        key: 'xlsx-' + (i + 1),
        inputs: { request: requests[i], templates: [{ key: 'shoes', file: template }] }
    });
}
return { tasks: tasks };
```

## 2. `SWITCH` and loop expressions

The `javascript` evaluator of `SWITCH` and the `loopCondition` of `DO_WHILE` are JavaScript expressions; these skills keep them to ES5 syntax and to a comparison or a ternary (conventions of these skills, see the table below).

| Rule | Detail |
| -- | -- |
| Root | `$` is the `inputParameters` object of the switch or loop: `$.inputValue`, `$.count`, `$.elements.length`; inside a loop condition also `$.<loopRef>['iteration']`. Not `$.data`. |
| Result | Switch: the evaluated value is the key looked up in `decisionCases` (`selectedCase` gives it "as a plain string"); how a result that is not a string is matched is not documented, so return string keys. Loop: an explicit boolean (`true` continues); other result types are not documented. |
| Syntax | ES5 only (repository recommendation: the documentation states no language version): `var`, `function () {}`, ternaries, `if` statements. No `let`, `const`, arrow functions, template literals, optional chaining, `Array.prototype.includes`. No top-level `return`. No `log()`, no `console`, no I/O. |
| Budget | No duration is documented; keep it to a comparison or a ternary (repository recommendation). Compute anything heavier in a `code-execute-javascript` task and switch on its result. |

Documented forms: `"$.inputValue.length > 1 ? 'success' : 'failure'"`, `"$.itemCount == 0 ? 'EMPTY' : 'OK'"`, `"if ($.loop['iteration'] >= $.elements.length) { false; } else { true; }"`, `"if ($.loop_task['iteration'] < $.numberOfPage) { true; } else { false; }"`.

## 3. `json-transform-jq` (alpha)

"The JQ Transform task allows processing JSON data using the JQ query expression language." The platform implements a subset of jq (manual 1.5 linked by the documentation).

| Property | Type | Required | Description |
| -- | -- | -- | -- |
| `data` | object | required | The input data. The jq root `.` is the whole `inputParameters` object, so expressions start with `.data...`. |
| `queryExpression` | string | required | A jq expression, written inline (the task takes no expression file). Escape inner double quotes in JSON. |

Outputs: `result` (the first value emitted), `resultList` (all emitted values), `error` (message when the expression failed).

```json
{
  "name": "json-transform-jq",
  "taskReferenceName": "generate_comment_threads",
  "description": "Generate comment threads",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "data": {
      "message": "${workflow.input.comment}",
      "suggestions": "${fetch_suggestions.output.json}"
    },
    "queryExpression": ".data.message as $comment | [.data.suggestions[] | { \"object\": \"comment_thread\", \"comments\": [{\"message\": $comment}], \"targetType\": \"suggestion\", \"targetId\": .id}]"
  }
}
```

Rules:

- "The Dates section of the manual is entirely unsupported to date: `now`, `todate`, `fromdate`, `strftime`, `strptime`, `mktime`, `gmtime` and the rest of the family. An expression using one of them does not produce a result; it fails and sets the error output. Compute dates before the task instead."
- Global variables are not supported as inputs of this task.
- A failing expression sets the `error` output; whether the task or the job then fails is not documented. When the job must stop (broken contract, or the brief says the job must fail), test the `error` output with a `SWITCH` that ends in a `TERMINATE` `FAILED`; otherwise report problems in a `warnings` array of the output object.
- A stream of several values (`.data.items[]`) fills `result` with the first and `resultList` with all; wrap in `[ ... ]` to get one array in `result`.
- The documented workaround for structured values in a global variable is a JSON string parsed by this task. In jq, `fromjson` parses a string; it is not meant for a value that is already an object, so do not apply it to data that arrived as JSON (test it on your account, like the rest of the subset).
- The documentation does not list which functions the subset includes, beyond the unsupported Dates section. Functions these skills rely on (test them on your account before relying on them): path navigation, `select`, `map`, `reduce`, object construction, `tostring` / `tonumber`, `split` / `join`, `test` / `match` / `sub` / `gsub`, `sort_by` / `group_by` / `unique_by`, `to_entries` / `from_entries` / `with_entries`, `keys`, `length`, `add`, `any` / `all`, `@csv`, `tojson` / `fromjson`, `try ... catch`.
- Typical uses: pick the current loop element (`.data.elements[.data.iteration - 1]`), harvest loop outputs, build `operations` arrays for data tasks, build `tasks` lists for a batch, normalise optional user inputs (treat `null`, `""` and an unresolved placeholder alike and apply defaults).

## 4. XSLT

`file-transformation-xslt` runs "an XSLT transformation [that] allows to switch from one XML format to another file format among XML, CSV, TXT, JSON or HTML". The FAQ says "You can use XSLT 1.0 or 2.0 or 3.0 or 3.1": write XSLT 3.0 stylesheets and use XPath 3.1 functions.

### 4.1 Stylesheet skeleton

```xml
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:pl="http://product-live.com"
    version="3.0"
    exclude-result-prefixes="xs pl">

    <xsl:output method="xml" indent="yes" encoding="UTF-8" />

    <xsl:param name="language" as="xs:string" select="'eng'" />

    <xsl:template match="/">
        <Table key="PRODUCTS">
            <Items>
                <xsl:for-each select="Csv-To-Xml/File/Rows/R[@i > 1]">
                    <Item partition="ACTIVES">
                        <Identifier key="EAN_13"><xsl:value-of select="normalize-space(C[@j = 1])" /></Identifier>
                        <Field key="TITLE_EN"><xsl:value-of select="normalize-space(C[@j = 2])" /></Field>
                    </Item>
                </xsl:for-each>
            </Items>
        </Table>
    </xsl:template>
</xsl:stylesheet>
```

- `xsl:output` is required: `@method` (`xml`, `html`, `xhtml`, `text`, `json`) must match the extension of the task's `fileName`; `@encoding` is always `UTF-8`.
- Custom functions use `xsl:function name="pl:..."` with the `http://product-live.com` namespace.
- Performance rules from the documentation: never use `//`; never call the same XPath twice (declare a variable); use built-in functions (check http://www.xsltfunctions.com/); learn `xsl:merge` for differential imports; always generate a root element.
- `<xsl:message terminate="yes">Missing parameter eans: pass a comma-separated list of EAN codes</xsl:message>` fails the transformation of that file. The task page says the task still completes with `allFilesTransformed` = `NO` and the reason in the `report`; the decision-and-terminate tutorial says the task ends in error and sets `optional: true` on it. Write for both: set `optional: true` on the task and test `${<ref>.output.allFilesTransformed}` right after it with a `SWITCH` whose non-`YES` case ends in a `TERMINATE` `FAILED` carrying a user-facing message (details in `tasks/file-transformation-xslt.md`). Use it only for a broken job contract or when the brief says the job must fail; an absent optional element or the other side of a documented choice is data to handle with a fallback and to report without stopping: a warning row or sheet in the output, or a non-terminating `xsl:message` (where the platform records one is not documented).

### 4.2 Parameters

```json
{
  "params": [
    { "name": "color", "select": "red" },
    { "name": "settings", "select": "file://assets/settings.xml" },
    { "name": "items", "select": "${export_items.output.file}" },
    { "name": "language", "select": "${workflow.input.language}" }
  ]
}
```

- The documentation types `params` as `STRING` but does not say how a value is typed inside the stylesheet (`xs:string` or `xs:untypedAtomic`). Convention of these skills: treat every param as a string and declare each `xsl:param` `as="xs:string"` with a default, compare with `$language = 'eng'`, convert with `xs:integer($n)`, test flags with `normalize-space(upper-case($flag)) = 'YES'`; never declare `as="xs:boolean"` for a `YES`/`NO` flag.
- Quoting: the task page prose says a static string "must be encapsulated in simple quotes", but its own example and every runnable published job pass bare values (`"select": "red"`). Prefer bare values; declare a default in the stylesheet (`select="'eng'"`) for local runs. Quoted values appear in published jobs only as `'TODO_...'` placeholders.
- A file param (`file://assets/x.xml`, `${<ref>.output.file}`, a FILE user input `${workflow.input.<key>}`: pass the whole reference, the documented form): the documentation does not describe the value the stylesheet receives; the generic jobs it publishes open such params with `doc($param)`, `document($param)` or `unparsed-text($param)`, so follow that pattern (`json-doc($url)` for JSON is a convention of these skills).
- Use the same param `name` as the user input key.

### 4.3 Useful patterns

| Need | XSLT 3.0 pattern |
| -- | -- |
| Read a JSON file | `json-to-xml(unparsed-text($url))` then XPath on the `map` / `array` / `string` elements of the `http://www.w3.org/2005/xpath-functions` namespace; or `json-doc($url)` with `?key` lookups |
| Produce JSON | `<xsl:output method="json" />` with `xsl:map`, `xsl:map-entry`, `array { }`, or `xml-to-json()` |
| Produce CSV or TXT | `<xsl:output method="text" />`, explicit separators and quoting, `&#10;` line ends |
| Produce HTML (email, PDF, display message) | `<xsl:output method="html" />`, `fileName` ending in `.html`; emails declare recipients and subject with `<meta name="pl-mail-to" content="a@example.com;b@example.com" />` and `<meta name="pl-mail-subject" content="..." />` |
| Group rows | `xsl:for-each-group` with `current-grouping-key()` |
| Differential import | `xsl:merge` with `current-merge-group()` between a previous export and the new file |
| Dates | `current-dateTime()`, `format-dateTime()`, `xs:date($s)` |
| Split one input into many outputs | the `file-transformation-split-xml` task (`xpath` starting with `/`) rather than `xsl:result-document`, whose secondary outputs are not documented as collected |
| Build the request document of another task | an XSLT fed by a tiny seed XML (`file://assets/empty.xml`) with the real data in `params` |

Modes: `FILE` (`file` input), `FILES` (`files` input, one transformation per file, index appended to `fileName`), `REQUEST` (an `<Xslt><File><Url/><File-Name/></File></Xslt>` document). Outputs: `file` (first result, every mode), `files` (all successful results), `listing`, `allFilesTransformed` (`YES`/`NO`), `report`, and `result` (a string) when `mode: FILE` with `output: STRING`, handy to compute a flag for a switch. Input file limit 500 MB.

## 5. XSD

`file-validation-xsd` validates an XML file against your own schema (`xsd`: `file://assets/file.xsd`) or a platform schema (`xsdKey`); `xsdVersion` is `1.0` by default and accepts `1.1`; `failOnError: true` fails the task when at least one file is invalid; outputs `allFilesValid` (`YES`/`NO`) and `report` (codes `VALIDATION_SUCCESS`, `VALIDATION_ERROR`, `XSD_KEY_INVALID`).

```json
{
  "name": "file-validation-xsd",
  "taskReferenceName": "validate_items_request",
  "description": "Check the import document before importing",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "mode": "FILE",
    "file": "${build_items.output.file}",
    "xsdKey": "table-import-items-input-request",
    "failOnError": true
  }
}
```

Platform `xsdKey` catalogue: `azure-storage-blob-put-input-request`, `file-conversion-json-to-xml-input-request`, `file-generation-archive-input-request`, `file-generation-xlsx-input-request`, `protocol-ftp-get-input-request`, `protocol-ftp-move-input-request`, `protocol-ftp-post-input-request`, `protocol-rest-perform-input-request`, `protocol-soap-perform-input-request`, `rules-engine-import-rules-input-request`, `table-import-items-input-request`, `table-import-schema-input-request`. In jobs, use the keys exactly as the task page lists them. Validate reasonably sized documents only (input limit 500 MB).

## 6. HTML for `notification-display-message`

The HTML passed in `request` (an asset or a generated file) is sanitised. Allowed elements: `html`, `head`, `meta`, `base`, `style`, `body`, `div`, `span`, `p`, `br`, `hr`, `h3`, `h4`, `h5`, `h6`, `blockquote`, `pre`, `code`, `b`, `i`, `strong`, `em`, `strike`, `a`, `ul`, `ol`, `li`, `table`, `caption`, `thead`, `tbody`, `tr`, `th`, `td`. Allowed attributes: `href`, `target`, `rel`, `lang`, `charset`, `name`, `content`, `class`. Everything else is stripped silently.

Consequences and limits: no images, no `h1` / `h2` (start at `h3`), no inline `style` attributes (use a `<style>` element and classes), no JavaScript, no reference to files of the assets folder, no public URLs for resources. The `height` input (pixels) is required, and the `message` output must be exposed in `outputParameters` or in a `TERMINATE` task for the message to appear. `requestLocal` (`eng`, `fra`, `deu`, `spa`) adds localized variants next to the required `request`; the page does not say which one a user sees.

```html
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        .summary th, .summary td { border: 1px solid #d9d9d9; padding: 5px; }
    </style>
</head>
<body>
    <h3>Import summary</h3>
    <table class="summary">
        <thead><tr><th>Total</th><th>Status</th></tr></thead>
        <tbody><tr><td>30</td><td>Imported</td></tr></tbody>
    </table>
    <p><a href="https://app.product-live.com/search" target="_blank">Open the items</a></p>
</body>
</html>
```

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| A script without `return` (`function f() { ... } f();`) | end with `return <value>;` |
| `console.log(...)` | `log(...)` |
| `require('fs')`, `fetch(...)`, `process.env` | not available; load files with `resources`, call APIs with `protocol-http-perform` |
| `${workflow.globalVariables.x}` inside the script | pass it in `data` |
| `let` / `=>` / backtick strings in a `SWITCH` expression or `loopCondition` | ES5 syntax |
| `return` at the top of a switch expression | the bare expression |
| `$.data.count` in a switch expression | `$.count` (the root is the switch inputs) |
| `now`, `todate`, `strftime` in jq | compute dates in JavaScript or XSLT |
| jq expression starting with `.items` | `.data.items` |
| `"select": "'red'"` for an XSLT literal | `"select": "red"` (the documentation shows both forms; the bare form matches its example and avoids relying on quote handling, which is not documented) |
| `method="xml"` for a `.html` or `.csv` output | `html` or `text` |
| `//Item` in XPath | an absolute path such as `/Table/Items/Item` |
| `<h1>` or `<img>` in a display message | `<h3>` and text; images are stripped |
| Inline `style="..."` attributes in a display message | a `<style>` element with classes |
| Expecting `xsl:result-document` outputs to be collected | one result per transformation; use `mode: FILES` or the split task |
