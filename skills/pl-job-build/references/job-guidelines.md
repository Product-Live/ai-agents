# Job design guidelines

> Reference token: DF-JOB-GUIDELINES-01

The house rules for creating, modifying and reviewing Data Factory jobs with this skill. Read this file in step 2 of every create and modify task and in every review. Every task capability stated here comes from `references/knowledge/` (the task files `references/knowledge/tasks/<task-name>.md` first); where those files are silent, this file says "not documented".

These guidelines rank below the developer's instructions (SKILL.md, "Step 0" and "Precedence"): an instruction such as "always use XSLT for transformations" or "write transformations in jq, not in JavaScript" replaces the matching rule here. Neither these guidelines nor an instruction can override the documented job format, the secrets rules or the rule never to claim that a job was executed.

## 1. The core rule: JSON first

Prefer JSON flows:

- read and write platform data with the `data-*` tasks, which take and return JSON;
- shape JSON with `json-transform-jq`;
- use `code-execute-javascript` for logic, parsing and building files, including the XML request that a task requires when that task documents such an input (for example the `<Generate-Excel>` request of `file-generation-xlsx` or the items document of `table-import-items`).

Use XML tasks and XSLT only when necessary, that is in one of these cases:

1. The task that does the job only accepts or only produces XML, and no JSON alternative fits (section 4).
2. The volume is above the documented limits of the JSON tasks (section 5).
3. The brief imposes an XML source or target: an XML feed, an XML file to deliver, a platform export or report to process.
4. An instruction asks for it.

Write the case that applies in the task `description` and list it in the report (section 8).

Why (a house choice, not a platform requirement):

- One data model from end to end. The `data-*` tasks speak the JSON of the Product-Live API (their `request.json` follows its query language), jq and JavaScript read `result` and `response.json` directly, and values travel between tasks as `${<ref>.output.result...}` references instead of conversion files (`references/knowledge/wiring.md`).
- Fewer steps and fewer assets: no conversion to XML followed by a stylesheet whose only role is to reshape the data.
- Each engine where it is strongest: jq for declarative reshaping, JavaScript for regex, dates, aggregation and file content, XSLT for XML (`references/knowledge/scripting.md`).

JSON first does not replace design principle 1 (SKILL.md): a catalog task that reads, writes, sends or generates still beats a script. A script replaces a conversion plus a stylesheet, never a platform action.

## 2. Alpha tasks: recent tasks, used like the others

The preferred JSON tasks are shown in alpha phase in the documentation: every `data-*` task, `context-account-get`, `context-user-get`, `code-execute-javascript` and `json-transform-jq`. Alpha marks a recent task, and alpha tasks are available on every account (`references/knowledge/tasks/index.md`).

- Use them like GA tasks: never ask whether they are enabled. Keep their documented status in the task table, without a separate warning or section solely because they are alpha.
- When an instruction rules out alpha tasks, replace each one with its GA equivalent from the table below and give the instruction as the reason (section 8).
- The `javascript` evaluator of a `SWITCH` belongs to `switch`, which is GA: computed conditions stay available on every route.

| Alpha JSON task | GA equivalent |
| -- | -- |
| `data-item-find` | `table-export-items` (`ALL`, `USER_SELECTION`, or `REQUEST` with an `<Items-Request>`) |
| `data-item-create-or-update` | `table-import-items` (`CREATE_OR_UPDATE`, `UPDATE_ONLY` or `CREATE_ONLY`) |
| `data-field-find`, `data-field-value-find`, `data-level-find`, `data-partition-find`, `data-screen-find`, `data-section-find` | `table-export-schema`: the whole structure (levels, partitions, fields and options, sections, screens) in one XML file |
| the other `data-*` and `context-*` tasks (users, jobs, executions, variables, projects, partners, suggestions, comments, logs) | no GA task is documented for them: say so; the closest documented approach is `protocol-http-perform` with `PL_KEY` authentication on the Product-Live API, whose endpoints are documented on learn.product-live.com, not in the knowledge files |
| `json-transform-jq`, `code-execute-javascript` | `file-transformation-xslt` (XSLT 3.0: reads JSON with `json-doc()` or `json-to-xml(unparsed-text())`, computes dates with `format-dateTime()`, writes XML, CSV, TXT, JSON or HTML), after `file-conversion-csv-to-xml`, `file-conversion-xlsx-to-xml` or `file-conversion-json-to-xml` when the input is a file in another format |

The other alpha tasks (`loop`, `set-variable`, `wait`, `task-batch-execute`, `ai-prompt-execute`, `file-transformation-merge-xml`, the alpha exchange tasks) are used like any other task, where the design principles (SKILL.md) and the decision table below call for them.

## 3. Decision table

| Need | Preferred task(s) (JSON route) | Fall back to XML or XSLT when |
| -- | -- | -- |
| Read items | `data-item-find`: `REQUEST` with a `criteria`, or `ALL`; one partition (`request.json.context`), a table, a list of partitions or the account (`findOptions.partitionSelection`); `options.includedFieldKeys` to keep only the fields the job needs; the grid selection as in section 6.1 | the whole table is read ("bulk exports of a whole table as a file: use `table-export-items`", says the task reference), the volume exceeds a JSON limit (section 5), or the job interprets field values whose JSON shape is not documented and no real `data-item-find` output is available to test with (section 6.4): `table-export-items` |
| Write items | `data-item-create-or-update` for targeted writes computed by the job (after a lookup, an HTTP or AI call, a computation): `item_create` creates the item, or updates it in place when an item with the same identifier exists in the partition; `item_update` updates; the `operations` built by jq, or written as a JSON request file by a script (section 6.3) | a file of items (the task reference sends bulk imports from files to `table-import-items`), a need for `UPDATE_ONLY`, `CREATE_ONLY` or the import report of rejected items, or typed values whose JSON shape is not documented: `table-import-items`, its items document written by `code-execute-javascript` from JSON or text (XSLT only when the source is already XML) |
| Read other platform data | the matching `data-*-find` task (tables, partitions, fields, field values, levels, screens, sections, users, jobs, executions, variables, projects, partners, suggestions, comment threads, audit logs, publications), `context-account-get`, `context-user-get`; `lookups` resolve business keys into ids inside a request | the complete structure of a table in one document (a clone, a backup, an XSLT that reads the schema): `table-export-schema` |
| Call an HTTP API | `protocol-http-perform` with `responses: ["JSON"]`: `response.json` feeds jq, a script or a `SWITCH`; a large answer comes as `responses: ["FILE"]` and a script reads it through `resources` (section 5) | the API answers XML (`responses: ["FILE"]`, then XSLT) or is a SOAP service (`protocol-soap-perform`, XML) |
| Shape JSON | `json-transform-jq` on inline JSON: filters, maps, defaults, `YES`/`NO` flags, `operations` arrays, batch task lists | the data is XML (XSLT). A JSON file (an `ATTACHMENT` output, a downloaded file) is not a reason for XSLT: jq takes no file input, so a script reads the file with `resources` |
| Logic, parsing CSV or text, dates | `code-execute-javascript`: a CSV or text file loaded with `resources` and `loadAs: "TEXT"`, a JSON file with `loadAs: "JSON"`; dates with `Date` (jq has no date functions) | large or growing files (section 5): `file-conversion-csv-to-xml`, then XSLT; an Excel file: `file-conversion-xlsx-to-xml` is the only documented reader of `.xlsx` files and produces XML, then XSLT |
| Build files | `code-execute-javascript` with `response: "FILE"` and an `outputFileName`: CSV, TXT, JSON, HTML (emails, display messages, PDF input) and the XML requests that tasks document (section 6.3) | the source is XML (an export, a converted file, a report); one step must produce several files (one HTML per email or per PDF): a script returns one file per execution, so use XSLT in `FILES` or `REQUEST` mode, or one script per file in `task-batch-execute` |
| Produce Excel | `file-generation-xlsx` (GA) with its `<Generate-Excel>` request written by `code-execute-javascript` from the JSON data: `response: "FILE"`, `outputFileName: "excel-request.xml"`, then `"request": "${<ref>.output.result}"`, as in the `export-job-executions-to-excel` example | the data is already XML (a `table-export-items` file, a converted CSV or Excel file): XSLT writes the request |
| Import a table structure | none: `table-import-schema` takes only a `<Table>` schema document, and no `data-*` task creates fields, options, sections or screens | always XML: a script writes the document from JSON or text, XSLT from XML (a `table-export-schema` file to clone or rename) |
| Rules engine | none: `rules-engine-import-rules` and `rules-engine-export-rules` use the `<Rules-Engine>` document, `rules-engine-execute-rules` takes an `<Items-Request>` in `REQUEST` mode and returns its `items` as XML | always XML |
| Exchange with partner accounts | id-based publications and suggestions on the items a job has found: `data-publication-create`, `data-suggestion-create`, `data-suggestion-apply` | a whole table or partition: the exchange tasks of the catalog work on items export files and publications documents in XML (`exchange-send-items` and `exchange-receive-items`, GA; `exchange-create-publications`, `exchange-create-suggestions`, `exchange-apply-suggestions`, alpha). |
| Delete items | none: no `data-*` task deletes items | `table-delete-items` (`USER_SELECTION`, `ALL`, or `REQUEST` with an `<Items-Request>` that a script can write) |

## 4. Tasks that only speak XML

These needs have no JSON alternative (case 1 of section 1). Keep the rest of the flow in JSON and confine XML to the edge of the task.

XML in: a script writes the document from JSON or text (section 6.3); XSLT only when the source is already XML.

- `table-import-items` (`<Table>` items document), `table-import-schema` (`<Table>` schema document), `rules-engine-import-rules` (`<Rules-Engine>`), `file-generation-xlsx` (`<Generate-Excel>`), `file-generation-archive` (`<Archives>`), `azure-storage-blob-put` (its XML request).
- The `REQUEST` modes of `table-export-items`, `table-delete-items` and `rules-engine-execute-rules` (`<Items-Request>`), and the XML requests of `protocol-ftp-get`, `protocol-ftp-post`, `protocol-ftp-move` and `protocol-ftp-delete`.
- HTML rather than XML, written the same way: `file-generation-pdf` (each HTML file needs a `<title>`, which names the PDF), `notification-send-email` (`<meta name="pl-mail-*">` tags), `notification-display-message` (sanitised HTML, `references/knowledge/scripting.md`, section 6).

XML out: XSLT reads it. A script can load an XML file with `loadAs: "XML"`, but the property names of the object it receives (attributes, text) are not documented, so XSLT stays the reader of XML.

- `table-export-items`, `table-export-schema`, `rules-engine-export-rules`, the `items` output of `rules-engine-execute-rules`, every `file-conversion-*-to-xml` output, the `listing` outputs (FTP, Azure Storage, generation tasks), the responses of `protocol-soap-perform`, the exchange files of the listed exchange tasks, and the `report` of most tasks.

## 5. Volume limits

Documented limits, side by side (`references/knowledge/limits.md` and the task files):

| Concern | JSON route | XML route |
| -- | -- | -- |
| Items read by one task | `data-item-find`: the `INLINE` output holds at most 1000 elements, beyond that the task ends in error (use `options.limit` or an `ATTACHMENT` output); `pageSize` 200 by default, 1000 at most (higher values are clamped); the `TABLE` and `LIST` scopes cover at most 1000 partitions, `ALL` at most 100 tables of 100 partitions | `table-export-items`: 200 000 items per export |
| Items written by one task | `data-item-create-or-update`: no limit and no rate limit stated on the task page | `table-import-items`: file up to 2 GB, 500 KB per item |
| API rate | the `data-*` tasks perform their requests on the Product-Live API on behalf of the current user; the API reference gives a default rate limit of 100 requests per minute, and the `task-batch-execute` page says that the public API limits still apply to each entry; how many requests one task execution sends is not documented (recommendation of this skill: a larger `pageSize` and a lower batch `concurrency` keep the request rate down); `data-publication-create`: 100 requests per minute; suggestions: 100 per minute | not stated for the file tasks |
| Inline JSON | keep every task input small: a payload limit exists (a release note mentions the message logged when it is exceeded) but its value is not published; jq reads only its inline `data`; larger JSON travels as a file that a script loads with `resources` | files between tasks |
| Scripts | `code-execute-javascript`: 10 minutes for the whole task; the size of a resource is not documented | `file-transformation-xslt`: input up to 500 MB; `file-conversion-csv-to-xml` 250 MB and `file-conversion-json-to-xml` 100 MB, UTF-8 only |
| jq | no time limit documented (bound the job with `timeoutSeconds`); no date functions; no global variables as inputs | - |
| Lookups | 1000 keys per lookup and per `taskName` per request | - |
| Fan-out | `task-batch-execute`: 1 to 5 parallel slots, 7200 seconds per batch and per slot | `file-generation-xlsx` and `file-generation-pdf`: 50 files per execution |

How to apply them:

- Above a JSON-route limit, take the XML route and name the limit in the report.
- Where the JSON route has no documented limit (writes, resource size, how much a script can process within the task time limit), decide on the nature of the data, as the task references do: selections, lookups, deltas and targeted writes stay on the JSON route; whole tables and files of items take the XML route.
- When the brief gives neither the volume nor the nature of the data, ask it in the framing questions (`references/questions.md`), through the calling assistant when direct interaction is unavailable. Do not guess the data scope because the work is delegated.

## 6. Working on the JSON route

### 6.1 Read the grid selection

- `findMode: "USER_SELECTION"` is documented on the `data-item-find` page and in `references/knowledge/job-context.md`: the task builds the request from the grid selection and resolves the level from the launch screen (the `levelId` input overrides it). It belongs to `data-item-find` only (the shared `findMode` enum of the other fetch tasks lists `ALL` and `REQUEST`); the validator accepts it there.
- Or read the selection with `findMode: "REQUEST"`: `request.json.criteria` is `"${workflow.input.context.query}"` (the documentation says the launch query can be passed as is to a find task) and `request.json.context.partitionId` is `"${workflow.input.context.view.partition.id}"`. On a multi-level table, add `request.json.context.levelId`: the level of the launch screen, which `data-screen-find` returns (`levelId`).
- Guard first: `query` exists only when `queryMode` is `API_V1`. It is absent when nothing is selected and when the grid filter cannot be written in the Find format (`LEGACY`). A `SWITCH` on `${workflow.input.context.queryMode}` ends the other cases with a `TERMINATE` and a user-facing message: skeleton in `references/patterns.md`, P2.
- When the job must also accept `LEGACY` selections, take the XML route: `table-export-items` with `mode: "USER_SELECTION"` handles every selection format (`job-context.md`, section 4).

### 6.2 Large results and JSON files

- Above 1000 elements, or when the result would make the next task input too long, declare `"outputs": [{"mediaType": "application/json", "outputMode": "ATTACHMENT", "outputKey": "json"}]`: `${<ref>.output.result.json}` is then a file (`references/knowledge/wiring.md`, section 4). The outputs table of the data tasks allows this combination, and the `export-job-executions-to-excel` and `ai-typo-detection-suggestions` examples use it.
- Read that file in `code-execute-javascript`: `"resources": [{"key": "items", "file": "${<ref>.output.result.json}", "loadAs": "JSON"}]`, then pick the resource by its `key`. The file normally holds the array of elements; the example scripts also accept an object that wraps the array, because the exact content of the file is not documented.
- Keep the payload small: `options.includedFieldKeys` on `data-item-find`, a `criteria` rather than `ALL`, `options.limit` when only the first elements matter.
- `findOptions` (partition scopes) and `pageSize` are documented on the `data-item-find` page and accepted by the validator. The VS Code extension schema does not list them, so the editor may flag them: keep them when the job needs them.

### 6.3 Write an XML or HTML file from a script

- Set `response: "FILE"` and an `outputFileName` (`items.xml`, `excel-request.xml`, `report.html`): the returned string is written as is, and `${<ref>.output.result}` is the file object to pass to the FILE input of the next task.
- Escape `&`, `<`, `>`, `"` and `'` in every value written into XML or HTML, and start an XML document with `<?xml version="1.0" encoding="UTF-8"?>`, as the script of the `export-job-executions-to-excel` example does.
- Follow, element by element, the grammar of the reference file of the task that consumes the document. Validate it with `file-validation-xsd` and the task's `xsdKey` when the platform publishes one (the list is in `references/knowledge/scripting.md`, section 5).
- A JSON request file for a data task is written the same way and passed as `"request": {"method": "ATTACHMENT", "contentType": "application/json", "model": "default", "file": "${<ref>.output.result}"}`.
- A script returns one file per execution. Several files from one step (one email per recipient, one PDF per item) need XSLT in `FILES` or `REQUEST` mode, or one script per file in `task-batch-execute`.
- File objects passed in `data` (for example `"files": "${generate_excel.output.files}"`) give the script their `url` and, usually, their `name` (the property set varies by producer): enough to fill `pl-mail-attachments` or an `<Archives>` request without reading an XML `listing`.

### 6.4 Field values in JSON

- A `data-item-find` item carries `fields[]` entries `{"key", "type", "value": {"data": ...}}`. The knowledge files show the value of identifier and text fields only, and state that the value shape of the other types (selections, multi-valued fields, dates, images) is not documented on the data task pages.
- A script that interprets such values must handle every form the target table can contain. When the forms it needs are not documented, take the XML route: the value forms of `table-export-items` and `table-import-items` are documented.
- Writing typed values with `data-item-create-or-update` has the same limit: the field `type` comes from `data-field-find`, but the value shape of the non-text types is not documented on the task page.

### 6.5 Dates and periodic windows

- jq has no date functions: compute dates in a script with `Date` and pass the result on.
- A periodic job derives its time window from `${workflow.input.context.triggerAt}`, passed to the script in `data`.

## 7. Other house rules

Summarised here, defined once elsewhere:

| Topic | Where |
| -- | -- |
| Developer instructions and their precedence | SKILL.md, "Step 0" and "Precedence" |
| Language of the package | SKILL.md, "Language": English by default; an instruction can set another main language |
| Script assets (JavaScript, jq, XSLT) | `references/asset-guidelines.md`: English names, every documented input shape handled, a stop only on purpose, linted with `scripts/lint-script.js` |
| Job shapes | `references/patterns.md`: the JSON route first, the XML route as the fallback |
| Framing questions and their defaults | `references/questions.md` |
| Pre-flight and review checks | `references/checklist.md` |
| Final report | `references/report-format.md` |
| Guards, idempotence, secrets, outputs | SKILL.md, "Design principles" |

## 8. Departures, modify and review

- Every XML task or XSLT asset used where this file prefers the JSON route carries its reason (a case of section 1) in the task `description`, and the report lists it under "Instructions and guidelines" (`references/report-format.md`).
- Modify mode: new parts follow these guidelines; a working XML part stays as it is unless the change request touches it or asks for the JSON route.
- Review mode: a departure without a reason is a low-severity finding whose fix proposes the JSON route; it is applied only on request.
