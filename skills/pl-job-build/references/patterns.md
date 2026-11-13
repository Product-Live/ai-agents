# Job patterns

Thirteen shapes that cover most Data Factory jobs. Each skeleton is valid JSON showing the `tasks` array (or the one task that carries the pattern); `<UPPER_SNAKE>` strings are placeholders to replace, variable names such as `ftp_host` are suggestions to rename. Before copying a task, read `references/knowledge/tasks/<name>.md`: the skeletons show the shape, the task file is the source of truth for inputs and outputs. Reference names must stay unique job-wide; one global variable per template string.

The patterns follow `references/job-guidelines.md`: where the knowledge supports it, a pattern leads with the preferred route (JSON first: `data-*` tasks, jq, JavaScript) and keeps the XML route (XML tasks and XSLT) as the fallback for XML-only tasks, large volumes, XML sources or targets, or an instruction.

## Index

| Pattern | Pick it when | Core tasks |
| -- | -- | -- |
| P1 Import pipeline | a file (FTP, HTTP, upload) must become items | preferred: `code-execute-javascript` writes the items document, `table-import-items`; XML route: `file-conversion-csv-to-xml`, `file-transformation-xslt`, `table-import-items` |
| P2 Export pipeline | items must become a downloadable or delivered file | preferred: `data-item-find`, `code-execute-javascript`, `file-generation-xlsx`; XML route: `table-export-items`, `file-transformation-xslt`, `file-generation-xlsx` / `-pdf` / `-archive` |
| P3 API call and transform | data lives behind an HTTP API | `protocol-http-perform`, `json-transform-jq` or `code-execute-javascript` |
| P4 Request builder | a task wants an XML request built from inputs | preferred: `code-execute-javascript` with `response: "FILE"`; XML route: `file-transformation-xslt` on a seed file |
| P5 Guarded flow | an expected functional case must end the job cleanly | `SWITCH` (`value-param`) plus `TERMINATE` |
| P6 Normalise inputs | optional inputs need defaults and flags | `json-transform-jq` |
| P7 Loop | iterations depend on each other | `DO_WHILE` plus `json-transform-jq` |
| P8 Parallel fan-out | N independent executions of a task | `task-batch-execute` |
| P9 Job chaining | a job reuses another job and its result | `data-job-execution-create` with `wait` and a `data-job-find` lookup |
| P10 AI suggestions | a model proposes values for human review | `ai-prompt-execute`, `data-suggestion-create` |
| P11 Notification and report | the user must see or receive a summary | `code-execute-javascript` (JSON data) or `file-transformation-xslt` (XML reports), `notification-display-message`, `notification-send-email` |
| P12 Shared and cross-account | partner tables or another account are involved | `accountKey`, `apiKey` from protected variables |
| P13 Periodic job | the job runs on a schedule | `SWITCH` on `jobActionOrigin`, `mode: "ALL"` |

Patterns combine: a nightly import is P13 plus P1 plus P5 plus P11; an AI enrichment is P10 inside P8 behind a P5 guard.

## P1. Import pipeline (file to items: script first, conversion and XSLT as fallback)

When: items arrive as a CSV, Excel or JSON file and must land in a table.

Preferred route (a CSV, text or JSON file): `protocol-ftp-get` (or `protocol-http-perform` with `responses: ["FILE"]`, or a `FILE` user input), guard on `noFile` (as in the XML route below), `code-execute-javascript` that loads the file as a resource (`loadAs: "TEXT"` for CSV or text, `"JSON"` for JSON), maps the rows and returns the `<Table key><Items><Item partition>` document as a file, `table-import-items`, optional `protocol-ftp-move`. A file of items goes to `table-import-items`, not to `data-item-create-or-update` (`references/job-guidelines.md`, section 3).

```json
[
  {"name": "code-execute-javascript", "taskReferenceName": "build_items", "description": "Parse the CSV and write the table import document", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"expressionFile": "file://assets/csv-to-items.js", "resources": [{"key": "csv", "file": "${ftp_get.output.file}", "loadAs": "TEXT"}], "data": {"tableKey": "<TABLE_KEY>", "partitionKey": "<PARTITION_KEY>", "separator": ";"}, "response": "FILE", "outputFileName": "items.xml"}},
  {"name": "table-import-items", "taskReferenceName": "import_items", "description": "Create or update the items", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"request": "${build_items.output.result}", "mode": "CREATE_OR_UPDATE"}}
]
```

The script (`<job-dir>/assets/csv-to-items.js`) picks the resource by its key, parses every documented shape of the CSV (quoted fields, separators, doubled quotes and line breaks inside quotes, empty cells), escapes `&`, `<`, `>`, `"` and `'` in every value, and returns the document with the XML declaration (`references/job-guidelines.md`, section 6.3). `resources[].encoding` defaults to `utf-8`.

XML route (fallback: an Excel file, which only `file-conversion-xlsx-to-xml` reads; a large or growing file; an XML source; an instruction): `file-conversion-csv-to-xml` (or `-xlsx-to-xml`, `-json-to-xml`), `file-transformation-xslt` producing the same document, `table-import-items`.

```json
[
  {"name": "protocol-ftp-get", "taskReferenceName": "ftp_get", "description": "Fetch the oldest waiting products CSV", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"connection": "SFTP", "host": "${workflow.globalVariables.ftp_host}", "username": "${workflow.globalVariables.ftp_user}", "password": "${workflow.globalVariables.ftp_password}", "port": 22, "mode": "PARAMETERS", "remoteFolder": "/<FOLDER>", "sort": "LAST_MODIFIED_ASC", "filter": "<FILE_NAME_REGEX>", "maxFiles": 1}},
  {"name": "switch", "taskReferenceName": "check_no_file", "description": "Stop in success when no file arrived", "optional": false, "type": "SWITCH", "inputParameters": {"noFile": "${ftp_get.output.noFile}"}, "evaluatorType": "value-param", "expression": "noFile", "decisionCases": {"YES": [{"name": "terminate", "taskReferenceName": "terminate_no_file", "description": "Nothing to import", "optional": false, "type": "TERMINATE", "inputParameters": {"terminationStatus": "COMPLETED", "outputParameters": {"message": "No file found on the server"}}}]}, "defaultCase": []},
  {"name": "file-conversion-csv-to-xml", "taskReferenceName": "csv_to_xml", "description": "Convert the CSV to the generic row/cell XML", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"mode": "FILE", "file": "${ftp_get.output.file}", "columnSeparator": ";", "textDelimiter": "\"", "escapeCharacter": "\""}},
  {"name": "file-transformation-xslt", "taskReferenceName": "build_items", "description": "Map the rows to the table import format", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"mode": "FILE", "file": "${csv_to_xml.output.file}", "xslt": "file://assets/csv-to-items.xslt", "fileName": "items.xml"}},
  {"name": "table-import-items", "taskReferenceName": "import_items", "description": "Create or update the items", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"request": "${build_items.output.file}", "mode": "CREATE_OR_UPDATE"}}
]
```

Expose `"report": "${import_items.output.report}"` in `outputParameters`: the report is the only output of the import and the only way to see rejected items. Rejected items do not fail the task, so a later `protocol-ftp-move` also moves a file whose rows were rejected: say so in the README, never "the file moves only after a successful import". In an unattended (periodic) import that emails the report, follow `notification-send-email` with the `allEmailsSent` check of P11.

Notes and pitfalls: an inbox folder whose processed file is moved or deleted afterwards needs `sort: "LAST_MODIFIED_ASC"` so that a backlog drains oldest first (or process every file: `maxFiles` > 1 and the consumers in `FILES` mode); `LAST_MODIFIED_DESC` with `maxFiles: 1` leaves the older files in the folder forever and suits only a folder where the newest file supersedes the others; credentials come from protected variables, never literals; the docs' FTP examples show port 21 even for SFTP (use the server's real port); `filter` is a regex with JSON-escaped backslashes; test `noFile`, not `file`; identifiers are matched without case and accents, empty elements are ignored (not deletions); `UPDATE_ONLY` and `CREATE_ONLY` exist when the brief needs them; to archive the processed file build an `Ftp-Move` request from `${ftp_get.output.listing}` with an XSLT (the listing is XML, an XML source on both routes) and call `protocol-ftp-move`; on the XML route the CSV must be UTF-8 (250 MB max).

## P2. Export pipeline (items to a file: find and script first, export and XSLT as fallback)

When: the user wants a file (Excel, PDF, ZIP) built from items, downloaded, emailed or pushed to an FTP server.

Preferred route (a grid selection, a filtered subset): guard on `queryMode`, `data-item-find` with a JSON `ATTACHMENT` output, optional `data-field-find` for header labels (`title`, `titleLocal`), `code-execute-javascript` writing the generation request from the JSON (`response: "FILE"`), `file-generation-xlsx`, then `outputParameters`, `notification-send-email` (P11) or `protocol-ftp-post`. The skeleton reads the grid selection (`references/job-guidelines.md`, section 6.1):

```json
[
  {"name": "switch", "taskReferenceName": "check_selection", "description": "Stop when the launch context carries no readable selection (nothing selected, or a grid filter the Find format cannot express)", "optional": false, "type": "SWITCH", "inputParameters": {"queryMode": "${workflow.input.context.queryMode}"}, "evaluatorType": "javascript", "expression": "$.queryMode == 'API_V1' ? 'OK' : 'NO_SELECTION'", "decisionCases": {"NO_SELECTION": [{"name": "terminate", "taskReferenceName": "terminate_no_selection", "description": "Nothing the job can read", "optional": false, "type": "TERMINATE", "inputParameters": {"terminationStatus": "COMPLETED", "outputParameters": {"message": "No readable selection: select the items in the grid, then run the job again."}}}]}, "defaultCase": []},
  {"name": "data-item-find", "taskReferenceName": "find_items", "description": "Read the selected items as a JSON file", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"findMode": "REQUEST", "request": {"method": "INLINE", "contentType": "application/json", "model": "default", "json": {"context": {"partitionId": "${workflow.input.context.view.partition.id}"}, "criteria": "${workflow.input.context.query}", "options": {"includedFieldKeys": ["<FIELD_KEY>"]}}}, "outputs": [{"mediaType": "application/json", "outputMode": "ATTACHMENT", "outputKey": "json"}]}},
  {"name": "code-execute-javascript", "taskReferenceName": "build_excel_request", "description": "Write the Generate-Excel request from the selected items", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"expressionFile": "file://assets/build-excel-request.js", "resources": [{"key": "items", "file": "${find_items.output.result.json}", "loadAs": "JSON"}], "response": "FILE", "outputFileName": "excel-request.xml"}},
  {"name": "file-generation-xlsx", "taskReferenceName": "generate_excel", "description": "Fill the Excel template", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"request": "${build_excel_request.output.result}", "templates": [{"key": "report", "file": "file://assets/template.xlsx"}]}}
]
```

On a multi-level table, add `levelId` to `request.json.context` (the level of the launch screen, from `data-screen-find`). The `export-job-executions-to-excel` example shows the script side: resources loaded as JSON, values escaped, the request returned as a string. Field values other than identifiers and text have a JSON shape the knowledge files do not document: test the script on a real `data-item-find` output of the table, or take the XML route (`references/job-guidelines.md`, section 6.4).

XML route (fallback: a whole table, a volume above the JSON limits, `LEGACY` selections, values whose JSON shape is not documented, an instruction): `table-export-items`, guard on `itemsFound` (P5), optional `table-export-schema` for dynamic headers, `file-transformation-xslt` building the generation request, `file-generation-xlsx` (or `-pdf`, `-archive`), then the same deliveries.

```json
[
  {"name": "table-export-items", "taskReferenceName": "export_items", "description": "Export the items selected by the user", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"tableKey": "<TABLE_KEY>", "mode": "USER_SELECTION", "fileName": "items.xml"}},
  {"name": "table-export-schema", "taskReferenceName": "export_schema", "description": "Export the active structure to build the headers", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"tableKey": "<TABLE_KEY>", "mode": "ACTIVE", "fileName": "schema.xml"}},
  {"name": "file-transformation-xslt", "taskReferenceName": "build_excel_request", "description": "Build the Generate-Excel request from the items and the schema", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"mode": "FILE", "file": "${export_items.output.file}", "xslt": "file://assets/build-excel-request.xslt", "params": [{"name": "schema", "select": "${export_schema.output.file}"}, {"name": "language", "select": "${workflow.input.language}"}], "fileName": "excel-request.xml"}},
  {"name": "file-generation-xlsx", "taskReferenceName": "generate_excel", "description": "Fill the Excel template", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"request": "${build_excel_request.output.file}", "templates": [{"key": "report", "file": "file://assets/template.xlsx"}]}}
]
```

Expose `"excel_files": "${generate_excel.output.files}"`. PDF variant: an HTML file with a `<title>` (it names the PDF), written by a script on the preferred route or by an XSLT with `method="html"` on the XML route, then `file-generation-pdf` with `mode: "FILE"` and `settings: {"width": "210mm", "height": "297mm"}`. ZIP variant: an `<Archives>` request written the same way, then `file-generation-archive` with `allowPartial`. FTP delivery: `protocol-ftp-post` with `mode: "FILE"`, `remoteFolder` and the connection variables.

Notes and pitfalls: without a template from the user, copy `templates/template.xlsx` (one empty sheet `Sheet1`) to `<job-dir>/assets/template.xlsx` and fill `Sheet1` in the request; a grid selection only exists when the job is launched from the grid (periodic jobs use `ALL` or `REQUEST`); `findMode: "USER_SELECTION"` on `data-item-find` and `mode: "USER_SELECTION"` on `table-export-items` are both documented and accepted by the validator; the `INLINE` output of `data-item-find` stops at 1000 elements, hence the `ATTACHMENT` output; `maximum` caps the export (hard limit 200 000); a `FILES` output never feeds a `FILE` input directly (archive it or use a `FILES`-mode task); sheet names are 31 characters max; generation tasks end in success even when a file was not generated: test `allFilesGenerated`.

## P3. API call and transform (protocol-http-perform, json-transform-jq or code-execute-javascript)

When: data lives behind an HTTP API, or the Product-Live API offers something no catalog task does.

```json
[
  {"name": "protocol-http-perform", "taskReferenceName": "call_api", "description": "Fetch the price list", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"scheme": "HTTPS", "method": "GET", "domain": "<API_DOMAIN>", "path": "/<PATH>", "headers": {"Accept": "application/json"}, "authentication": {"useAuthentication": true, "type": "BEARER", "token": "${workflow.globalVariables.api_token}"}, "responses": ["JSON"], "connectionTimeOutMilliseconds": 10000, "readTimeOutMilliseconds": 30000}},
  {"name": "json-transform-jq", "taskReferenceName": "shape_prices", "description": "Keep the fields the import needs", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"data": {"payload": "${call_api.output.response.json}"}, "queryExpression": "[.data.payload.items[] | {ean: .ean, price: .price}]"}}
]
```

Notes and pitfalls: `domain` holds no scheme, port or path; the documented default `readTimeOutMilliseconds` is very low, set it; `PL_KEY` authentication calls the Product-Live API with an ephemeral key of the launching user (no secret to store); the jq root is the whole `inputParameters` object, hence `.data.payload`; jq has no date functions and refuses global variables as inputs (pass them through a JavaScript `data` object); use `code-execute-javascript` (`$.data`, `return`) when regex, dates or file content are involved; a large answer does not belong in a task input (a payload limit exists but its value is not published): request `responses: ["FILE"]` and load the file in `code-execute-javascript` with `resources` and `loadAs: "JSON"` (jq takes no file input); an XML answer is an XML source (`responses: ["FILE"]`, then XSLT); `responses: ["FILE"]` plus `file-conversion-json-to-xml` and an XSLT is the XML route, for the cases of section 1 of `job-guidelines.md`; `assertions` with `failOnError: true` fail the task on a bad status code, otherwise 4xx and 5xx responses are successful executions.

## P4. Request builder (script first, seed XML and XSLT as fallback)

When: a task takes its options in an XML request (`Items-Request`, `Archives`, `Generate-Excel`, `Ftp-Post`, `Ftp-Move`, table import) and the values come from user inputs or variables. To read items only, `data-item-find` with a `criteria` needs no XML request at all (P2); this pattern serves the tasks that only take an XML request (`references/job-guidelines.md`, section 4).

Preferred route: a script writes the request from its `data` (user inputs, and global variables, which are resolved before the script runs) and returns it as a file; no seed file is needed.

```json
[
  {"name": "code-execute-javascript", "taskReferenceName": "build_request", "description": "Write the Items-Request from the user inputs", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"expressionFile": "file://assets/build-request.js", "data": {"season": "${workflow.input.season}"}, "response": "FILE", "outputFileName": "request.xml"}},
  {"name": "table-export-items", "taskReferenceName": "export_items", "description": "Export the items matching the request", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"tableKey": "<TABLE_KEY>", "mode": "REQUEST", "request": "${build_request.output.result}", "fileName": "items.xml"}}
]
```

XML route (fallback: an instruction): an XSLT on a seed file writes the same request from its params.

```json
[
  {"name": "file-transformation-xslt", "taskReferenceName": "build_request", "description": "Build the Items-Request from the user inputs", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"mode": "FILE", "file": "file://assets/seed.xml", "xslt": "file://assets/build-request.xslt", "params": [{"name": "season", "select": "${workflow.input.season}"}], "fileName": "request.xml"}},
  {"name": "table-export-items", "taskReferenceName": "export_items", "description": "Export the items matching the request", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"tableKey": "<TABLE_KEY>", "mode": "REQUEST", "request": "${build_request.output.file}", "fileName": "items.xml"}}
]
```

The seed file (`<job-dir>/assets/seed.xml`) is a one-element document such as `<Seed/>`; the XSLT ignores it and writes the request from its params.

Notes and pitfalls: the script escapes `&`, `<`, `>`, `"` and `'` in every value it writes; a file passed in `params[].select` arrives as a document the XSLT opens; the documentation shows static strings both quoted (`"'VALUE'"`) and bare (`"red"`), prefer passing user inputs or files; validate generated requests with `file-validation-xsd` and a platform `xsdKey` when one exists (`table-import-items-input-request`, `file-generation-xlsx-input-request`, `file-generation-archive-input-request`, `protocol-ftp-post-input-request`, ...); the same XSLT trick substitutes placeholders in static assets, since variables cannot be used inside asset files.

## P5. Guarded flow (SWITCH value-param on a YES/NO flag plus TERMINATE)

When: an expected functional case (nothing selected, no file, a failed optional task) must end the job cleanly instead of failing it.

```json
{
  "name": "switch",
  "taskReferenceName": "check_items_found",
  "description": "Stop in success when the selection is empty",
  "optional": false,
  "type": "SWITCH",
  "inputParameters": {
    "itemsFound": "${export_items.output.itemsFound}"
  },
  "evaluatorType": "value-param",
  "expression": "itemsFound",
  "decisionCases": {
    "NO": [
      {
        "name": "terminate",
        "taskReferenceName": "terminate_no_items",
        "description": "Nothing to process",
        "optional": false,
        "type": "TERMINATE",
        "inputParameters": {
          "terminationStatus": "COMPLETED",
          "outputParameters": {
            "message": "No item selected"
          }
        }
      }
    ]
  },
  "defaultCase": []
}
```

Fail when nothing is selected: when the brief says the job must "fail" (or "stop in error") on an empty selection or a missing file, keep the same SWITCH and change only the TERMINATE: `terminationStatus: "FAILED"` and a message that tells the user what to do. The execution then ends in error and stays visible as such in Settings.

```json
{
  "name": "terminate",
  "taskReferenceName": "terminate_no_items",
  "description": "Fail: the job needs at least one selected item",
  "optional": false,
  "type": "TERMINATE",
  "inputParameters": {
    "terminationStatus": "FAILED",
    "outputParameters": {
      "message": "No item selected. Select at least one item in the grid, then run the job again."
    }
  }
}
```

Notes and pitfalls: with `value-param`, `expression` names a key of `inputParameters`; case keys are strings; always write `defaultCase: []` (documented as required, omitted in some examples); keep the main flow at the top level and put only the TERMINATE in the matching case; a TERMINATE's `outputParameters` replace the job-level ones, so put the user-facing message there; `terminationStatus: "FAILED"` for real errors; the `javascript` evaluator (`"expression": "$.count > 0 ? 'SOME' : 'NONE'"`, ES5 syntax) handles computed conditions; to react to an `optional: true` task, switch on its status with a `COMPLETED_WITH_ERRORS` case: the documentation shows both `"status": "protocol_http_perform.status"` and the `${...}` form, prefer `"${protocol_http_perform.status}"`; details of tasks inside a SWITCH are not visible in the execution details, so expose what happened through outputs.

## P6. Normalise optional inputs with jq

When: optional user inputs may arrive empty and the flow needs defaults and YES/NO flags.

```json
{"name": "json-transform-jq", "taskReferenceName": "normalise_inputs", "description": "Apply defaults to optional inputs and derive flags", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"data": {"language": "${workflow.input.language}", "comment": "${workflow.input.comment}"}, "queryExpression": "def clean: if . == null or . == \"\" then null else . end; {language: ((.data.language | clean) // \"eng\"), comment: (.data.comment | clean), hasComment: (if (.data.comment | clean) == null then \"NO\" else \"YES\" end)}"}}
```

Downstream tasks read `${normalise_inputs.output.result.language}` and a SWITCH branches on `${normalise_inputs.output.result.hasComment}`.

Notes and pitfalls: treat `null` and `""` alike; TEXT inputs are strings even when numeric (`"30"`); SELECT inputs deliver the option key; `multiple: true` and `mode: "MULTIPLE"` deliver arrays; DATE inputs arrive as ISO strings; never write a literal `${` inside the jq expression; `result` holds the first emitted value, `resultList` all of them.

## P7. Loop over elements (DO_WHILE idiom, alpha)

When: each iteration depends on the previous one or must run strictly in sequence; otherwise use P8.

```json
{"name": "loop", "taskReferenceName": "loop", "description": "Process the elements one after the other", "optional": false, "type": "DO_WHILE", "inputParameters": {"elements": "${build_elements.output.result.elements}"}, "loopCondition": "if ($.loop['iteration'] >= $.elements.length) { false; } else { true; }", "loopOver": [
  {"name": "json-transform-jq", "taskReferenceName": "get_current_element", "description": "Pick the element of this iteration", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"data": {"elements": "${loop.input.elements}", "iteration": "${loop.output.iteration}"}, "queryExpression": ".data.elements[.data.iteration - 1]"}},
  {"name": "code-execute-javascript", "taskReferenceName": "process_element", "description": "Do the per-element work", "optional": true, "type": "SUB_WORKFLOW", "inputParameters": {"data": {"element": "${get_current_element.output.result}"}, "expressionFile": "file://assets/process-element.js"}}
]}
```

Notes and pitfalls: `iteration` is 1-based and the condition (a JavaScript expression; ES5 syntax by convention of these skills) is evaluated after each iteration; `$.<key>` reads the loop inputs and `$.loop['iteration']` the counter (use the loop's own reference name); the loop refuses global variables as inputs; results are collected under `${loop.output}` keyed by iteration number, harvest them after the loop with jq (`to_entries | map(select(.key | test("^[0-9]+$")))`) or a JavaScript task; references to `${loop.input.*}` only work inside the loop; nested loops are not documented, avoid them; reference names inside the loop must be unique job-wide.

## P8. Parallel fan-out (task-batch-execute, alpha)

When: N independent executions of the same task (or different tasks) must run from one step, up to 5 at a time.

```json
[
  {"name": "code-execute-javascript", "taskReferenceName": "build_tasks", "description": "Build one batch entry per request file, reusing the template asset", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"expressionFile": "file://assets/build-tasks.js", "data": {"template": "file://assets/template.xlsx", "requests": "${split_requests.output.files}"}}},
  {"name": "task-batch-execute", "taskReferenceName": "run_batch", "description": "Generate one Excel file per request, 3 at a time", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"taskName": "file-generation-xlsx", "concurrency": 3, "request": {"method": "INLINE", "contentType": "application/json", "json": "${build_tasks.output.result}"}}},
  {"name": "switch", "taskReferenceName": "check_batch_errors", "description": "Fail the job when an entry failed", "optional": false, "type": "SWITCH", "inputParameters": {"errorCount": "${run_batch.output.summary.errorCount}"}, "evaluatorType": "javascript", "expression": "$.errorCount > 0 ? 'FAILED' : 'OK'", "decisionCases": {"FAILED": [{"name": "terminate", "taskReferenceName": "terminate_batch_failed", "description": "At least one entry failed", "optional": false, "type": "TERMINATE", "inputParameters": {"terminationStatus": "FAILED", "outputParameters": {"message": "Some batch entries failed, see the execution details"}}}]}, "defaultCase": []}
]
```

The builder script (`<job-dir>/assets/build-tasks.js`) returns `{ tasks: [{ key: 'xlsx-1', inputs: { request: ..., templates: [{ key: 'report', file: $.data.template }] }}] }`: the asset reference was resolved when the job was created, so the script copies the file object into each entry.

Notes and pitfalls: never write `"json": {"tasks": "${...}"}` (a placeholder under a `tasks` key breaks job creation); the inline form `"json": {"tasks": [{"key": "...", "taskName": "...", "inputs": {...}}]}` works for a fixed list; `concurrency` is 1 to 5; the batch and each slot have a 7200-second budget; a failed entry never stops the batch (hence the SWITCH on `summary.errorCount`); results come back in input order as `result.json[i]` with `key`, `index`, `status`, `success`, `output` or `error`; `table-import-schema` and `table-refresh-items` cannot be batched.

## P9. Job chaining (data-job-find lookup plus data-job-execution-create with wait, alpha)

When: a job must reuse another job (a generic export, a partner's job) and consume its result.

```json
{"name": "data-job-execution-create", "taskReferenceName": "run_child_job", "description": "Run the export job by key and wait for it", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"request": {"method": "INLINE", "contentType": "application/json", "model": "default", "json": {"operations": [{"key": "a", "lookups": [{"taskName": "data-job-find", "assign": "element.jobId", "entityKey": "<CHILD_JOB_KEY>"}], "element": {"info": {"title": "Export triggered by <JOB_KEY>"}, "input": {"eans": "${parse_inputs.output.result.eans}"}}}]}}, "wait": true, "waitOptions": {"pollingIntervalSeconds": 15, "timeoutSeconds": 1800}}}
```

Read the child result with `${run_child_job.output.result.json[0].response.output.<CHILD_OUTPUT_KEY>}` (`[0]` is the operation index, `output` holds the child's `outputParameters`).

Notes and pitfalls: the lookup turns the job key into the id at run time (no hard-coded id); the child reads `${workflow.input.eans}` without declaring a user input, say so in the job `description` of both jobs; the child exposes results only through `outputParameters` (a TERMINATE's outputs win); a pipeline runs one job at a time, so the child must run on a different pipeline or the wait blocks until timeout; the wait budget is consumed inside the parent's `timeoutSeconds`; `waitOptions.failOnError` defaults to true; without `wait` the task returns `response.id` for a fire-and-forget trigger; `apiKey` from a protected variable runs the trigger in another account (P12).

## P10. AI suggestions (ai-prompt-execute plus data-suggestion-create, human review, alpha)

When: a model proposes values (titles, translations, attributes) that a person reviews before they reach the items.

```json
[
  {"name": "ai-prompt-execute", "taskReferenceName": "improve_title", "description": "Ask the model for a better title, as a JSON object", "optional": true, "type": "SUB_WORKFLOW", "inputParameters": {"provider": "mistral", "model": "<MODEL>", "apiKey": "${workflow.globalVariables.mistral_api_key}", "systemPromptFile": "file://assets/system-prompt.md", "prompt": "Rewrite this product title and answer with {\"title\": \"...\"}: ${get_current_element.output.result.title}", "responseFormat": "json_object", "maxTokens": 1024, "failOnTruncation": true}},
  {"name": "code-execute-javascript", "taskReferenceName": "parse_answer", "description": "Parse the JSON answer", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"data": {"content": "${improve_title.output.content}"}, "expression": "return JSON.parse($.data.content);"}},
  {"name": "data-suggestion-create", "taskReferenceName": "create_suggestion", "description": "Propose the title on the item for human review", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"request": {"method": "INLINE", "contentType": "application/json", "model": "default", "json": {"operations": [{"key": "a", "element": {"object": "suggestion_create", "itemId": "${get_current_element.output.result.id}", "screenId": "${workflow.input.context.view.screen.id}", "hasCreatedItem": false, "emitterName": "<EMITTER_NAME>", "fields": [{"key": "<FIELD_KEY>", "type": "SINGLE-LINE-TEXT", "value": {"data": "${parse_answer.output.result.title}"}}]}}]}}}}
]
```

Notes and pitfalls: items come from the grid selection, read with `data-item-find` in `REQUEST` mode and `${workflow.input.context.query}` behind a `queryMode` guard (`references/job-guidelines.md`, section 6.1; the `ai-typo-detection-suggestions` example reads it with `findMode: "USER_SELECTION"` inside a batch entry), with `outputMode: "ATTACHMENT"` beyond a few hundred items (the `INLINE` output stops at 1000 elements), and `screenId` from `context.view.screen.id`, so the job only works from a grid; the API key goes from a protected variable straight into `apiKey`, never through a script; `content` is always a string, parse it; one AI call has a 600-second budget, parallelise with P8 (`taskName: "ai-prompt-execute"`); suggestions are limited to 100 per minute and option fields take option keys; a field key the table does not hold is dropped silently; suggestions are reviewed, then applied with `data-suggestion-apply`; keep the model and prompt settings in the first task's `data` when admins, not end users, own them.

## P11. Notification and report (notification-display-message HTML, notification-send-email)

When: the user must see a summary in the Actions panel or receive it by email.

```json
[
  {"name": "file-transformation-xslt", "taskReferenceName": "build_report_html", "description": "Render the import report as HTML", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"mode": "FILE", "file": "${import_items.output.report}", "xslt": "file://assets/report.xslt", "params": [{"name": "recipients", "select": "${workflow.globalVariables.report_recipients}"}], "fileName": "report.html"}},
  {"name": "notification-display-message", "taskReferenceName": "display_report", "description": "Show the report in the Actions panel", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"request": "${build_report_html.output.file}", "height": 300}},
  {"name": "notification-send-email", "taskReferenceName": "send_report", "description": "Email the report; recipients and subject are meta tags in the HTML", "optional": true, "type": "SUB_WORKFLOW", "inputParameters": {"mode": "FILE", "file": "${build_report_html.output.file}"}}
]
```

Expose `"message": "${display_report.output.message}"` and `"emails_sent": "${send_report.output.allEmailsSent}"`: a message that is not exposed in `outputParameters` is never displayed.

The skeleton renders the import report, an XML file: XSLT is the right tool for that XML source. When the summary comes from JSON (counts from a find, batch results, a script result), take the preferred route: a `code-execute-javascript` task with `response: "FILE"` and `outputFileName: "report.html"` writes the HTML (meta tags included for an email, values escaped), and its `${<ref>.output.result}` feeds `request` or `file` the same way. Attachment URLs come from the generated file objects passed in the script's `data` (`url`, `name`), without reading a `listing`.

Periodic or unattended jobs: nobody reads the execution, so an email that was not sent must fail the job. Follow `notification-send-email` with a SWITCH on `allEmailsSent` whose `NO` case is a TERMINATE `FAILED`. With an `optional: true` email task that failed, `allEmailsSent` is empty: the `javascript` evaluator below treats anything but `YES` as not sent. Put the outputs the user still needs (the import report, for example) in the TERMINATE's `outputParameters`, since they replace the job-level ones.

```json
{"name": "switch", "taskReferenceName": "check_email_sent", "description": "Fail the unattended job when the report email was not sent", "optional": false, "type": "SWITCH", "inputParameters": {"sent": "${send_report.output.allEmailsSent}"}, "evaluatorType": "javascript", "expression": "$.sent == 'YES' ? 'SENT' : 'NO'", "decisionCases": {"NO": [{"name": "terminate", "taskReferenceName": "terminate_email_not_sent", "description": "The report email was not sent", "optional": false, "type": "TERMINATE", "inputParameters": {"terminationStatus": "FAILED", "outputParameters": {"message": "The job ran but the report email was not sent: see the execution details", "report": "${import_items.output.report}"}}}]}, "defaultCase": []}
```

Attach large reports only when needed: an email above 10 MB (attachments plus content) is dropped, so summarise a large report in the HTML body (counts, first errors), expose the full file in `outputParameters`, and attach the full file only when the brief asks for it and its size stays well below the limit (1 MB recommended).

Notes and pitfalls: the display HTML is sanitised (no image, headings from `h3`, no inline `style` attribute, a `<style>` element with classes is kept, no script, no asset or public URL reference); the email HTML needs `<meta name="pl-mail-to">` and `<meta name="pl-mail-subject">`, optionally `pl-mail-cc`, `pl-mail-bcc` and `pl-mail-attachments` (`name=url;name=url`); limits per email: 10 attachments, 10 MB, 100 recipients, 50 emails per execution; an email that exceeds one is ignored and a log entry is added to the execution report (test `allEmailsSent`); one HTML file per email (`mode: "FILES"` for several); `data-log-create` (element `message`, `emitterName`, `severity`, `messageType: "MARKDOWN"`) writes into the execution details instead; never put a secret in a report.

## P12. Shared and cross-account jobs

When: the job reads a table shared by a partner, or acts in another account.

```json
[
  {"name": "table-export-items", "taskReferenceName": "export_partner_items", "description": "Export items from the table shared by the partner", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"tableKey": "<SHARED_TABLE_KEY>", "accountKey": "${workflow.globalVariables.partner_account_key}", "mode": "ALL", "fileName": "items.xml"}},
  {"name": "data-job-execution-create", "taskReferenceName": "run_on_partner_account", "description": "Trigger a job in the partner account with its API key", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"apiKey": "${workflow.globalVariables.partner_api_key}", "request": {"method": "INLINE", "contentType": "application/json", "model": "default", "json": {"operations": [{"key": "a", "lookups": [{"taskName": "data-job-find", "assign": "element.jobId", "entityKey": "<PARTNER_JOB_KEY>"}], "element": {"info": {"title": "Triggered by <JOB_KEY>"}, "input": {}}}]}}, "wait": true, "waitOptions": {"pollingIntervalSeconds": 15, "timeoutSeconds": 1800}}}
]
```

Notes and pitfalls: `accountKey` on `table-*` and `rules-engine-*` tasks designates the shared-table context (the partner key is in Settings > Network > Partners), not the executing identity; `apiKey` on `data-*` tasks switches the identity to the key's account, and an API key grants every action on that account, so it lives in a protected variable; variables of a shared job are resolved on the owner's account (a release note mentions the overloading of variables on shared jobs without describing it); a table shared to an account is not returned by key-based finds on that account (reading and writing with an explicit `partitionId` works); file URLs cross accounts and must be treated as confidential; in the shared-job use cases the owner account attaches the jobs to their pipelines.

## P13. Periodic job design (idempotent, no selection, origin switch)

When: the job runs on a schedule (nightly import, hourly sync) and may also be launched by hand.

```json
[
  {"name": "switch", "taskReferenceName": "check_origin", "description": "Refuse grid launches: this job processes the whole table", "optional": false, "type": "SWITCH", "inputParameters": {"origin": "${workflow.input.context.jobActionOrigin}"}, "evaluatorType": "value-param", "expression": "origin", "decisionCases": {"APP": [{"name": "terminate", "taskReferenceName": "terminate_from_app", "description": "Meant to run from the schedule or from Settings", "optional": false, "type": "TERMINATE", "inputParameters": {"terminationStatus": "COMPLETED", "outputParameters": {"message": "This job runs on its schedule; launch it from Settings to force a run"}}}]}, "defaultCase": []},
  {"name": "table-export-items", "taskReferenceName": "export_all", "description": "Export every active item; a periodic job has no user selection", "optional": false, "type": "SUB_WORKFLOW", "inputParameters": {"tableKey": "<TABLE_KEY>", "mode": "ALL", "fileName": "items.xml"}}
]
```

Notes and pitfalls: `jobActionOrigin` is `APP`, `SETTINGS`, `API` or `PERIODIC`; `context.view`, `query` and selections are absent for `PERIODIC` and `API`, so no `USER_SELECTION`, FIELD or SCREEN input; make every run idempotent (`CREATE_OR_UPDATE`, move or delete processed files, compute date windows from `${workflow.input.context.triggerAt}`); periodicity is configured in Settings, not in `job.json`: up to 3 rules, 5-field cron evaluated in UTC, 15 minutes minimum (the tutorials advise 30), a trigger that fires while the previous run is still active is queued, not replaced; put long periodic jobs on their own pipeline so interactive jobs are not blocked; set `timeoutSeconds`; document the cron, the pipeline and the variables in the README; a whole-table read is an XML-route case by default (`references/job-guidelines.md`, section 5): for a table that the brief or an instruction says is small, `data-item-find` with `findMode: "ALL"`, `"findOptions": {"partitionSelection": "TABLE", "tableKey": "<TABLE_KEY>"}` and a JSON `ATTACHMENT` output reads it in JSON (`findOptions` is documented on the task page and accepted by the validator; the VS Code extension schema does not list it, so the editor may flag it).
