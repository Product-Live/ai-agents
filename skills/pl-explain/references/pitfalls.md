# Pitfalls

> Reference token: DF-PITFALLS-01

Three parts: recurring mistakes and their fixes, the format traps (shapes that look plausible but are not part of the Data Factory job format), and the closed list of what `job.json` may contain.
Each mistake and each trap comes with its fix: the cause or the wrong form, then the right form.

## 1. Recurring user mistakes

| # | Symptom | Cause and fix |
| -- | -- | -- |
| 1 | "My jobs are all waiting for execution but none is running." | One job at a time per pipeline, FIFO; the app shows how many actions are ahead. Long periodic jobs on the same pipeline as interactive jobs serialise everything: ask for a second pipeline. Contact support if the queue does not progress for more than 30 minutes (FAQ). |
| 2 | Item import "did nothing" or values were not updated. | Empty XML elements are ignored (not deletions); an invalid number or an unknown suffix is not imported; a line whose identifiers match two different items fails on the uniqueness constraint; `UPDATE_ONLY` never creates and `CREATE_ONLY` never updates. The task completes anyway: always read the report. |
| 3 | Unexpected items created by an enrichment job. | Keep `mode` explicit (`UPDATE_ONLY`) and test imports on a small file first. |
| 4 | Identifier conflicts after "cleaning" values. | `REF-001` and `ref-001`, or values that differ only by accents, are the same identifier; trailing spaces are ignored; uniqueness spans partitions. Model non-unique references as text fields. |
| 5 | Screens wiped after a table update. | "The Screen definition is always exhaustive": an import that includes a screen, incremental or not, must include all its sections and columns. Export the schema, edit, re-import. |
| 6 | Trying to delete fields, options, levels or sections. | Never possible: only archiving (identifiers, classifications, categories, options, matrix links, screens). Field keys and data types cannot be changed: plan them. |
| 7 | A formula changed identifier or field values unexpectedly. | The documentation lists the formula use cases (composite identifiers among them) but not how a formula treats existing values or other formulas: test formula changes on a test table first (recommendation). |
| 8 | A schema import does not take all formula rules or conditional formatting fields. | Respect the documented limits: 8 conditional formatting fields per table (5 in the page body), 10 statuses per field, 2 000 rules per formula field, 5 000 values per condition. |
| 9 | Big imports or exports time out. | Use `INCREMENTAL` schema imports, differential item imports ("never send empty data"), batches, fewer formulas, off-peak schedules. |
| 10 | A periodic job ran twice or did not run. | Design periodic jobs to be idempotent; branch on `context.jobActionOrigin` when manual and scheduled runs differ; respect the 15-minute minimum; a still-running execution queues the next one. |
| 11 | A variable is "not found" or empty in the job. | Key mismatch (pattern `^[a-z0-9_]{1,50}$`), variable created on the wrong account (variables of a shared job resolve on the owner's account), a variable that is not `ACTIVE`, an empty value. What happens to a variable that does not exist, is not active or is empty is not documented: create every variable, with its value, before the first run. |
| 12 | A secret appears in a report, an email or a message. | Secrets go only into connection inputs (FTP password, HTTP headers, `apiKey`). Never into XSLT params, templates, logs or display messages. |
| 13 | An email was not received. | A limit was exceeded (10 attachments, 10 MB, 100 recipients to + cc + bcc, 50 emails per execution): the email is ignored and a log entry is added. Check `allEmailsSent` and the report. |
| 14 | An image or attachment was not imported. | URL not public (it must be reachable without authentication), file too large (images 20 MB and 36 megapixels on the import page, attachments 2 GB), an upload longer than 1 minute, an unsupported image format, or an unchanged `file-key` / `file-hash` (the same file is downloaded once on purpose). |
| 15 | A file upload fails. | 2 GB per user input file but a 1-minute upload window; the API files endpoint accepts 100 MB. Prefer FTP or HTTP sources for large inputs. |
| 16 | The job was launched without the expected row selection. | A job that consumes `USER_SELECTION` must be visible only on the relevant tables and its README must say that rows must be selected. |
| 17 | A job sent to the Jobs API as a JSON body differs from its package. | The API job resource is not `job.json`: its examples carry `pipelineId`, `projectId`, `status` and `visibility` and write task inputs under `input`, where `job.json` uses `inputParameters`. Recommendation: upload the `.job.zip` (`PUT /v1/data_factory/jobs/{jobId}/zip`) or import it in Settings rather than rewriting the job as an API body. |
| 18 | Mapping rules are not applied. | Mapping rules run asynchronously, on demand or on a schedule (`rules-engine-execute-rules` in a job), or on selected items when an action is configured; the rules engine must be enabled on the account. |
| 19 | An export filter does not select what was expected. | Check the filter elements and operator names against the `table-export-items` page; filter dates follow ISO 8601. |
| 20 | Characters corrupted in generated files. | UTF-8 end to end (the CSV and JSON conversion tasks require UTF-8 input); declare the encoding in `xsl:output`; check accents and symbols in the generated files (recommendation). |
| 21 | A file is missing from a generated archive. | Read the archive report (for example `INVALID_ARCHIVE_NAME`, `FILENAME_ALREADY_EXISTS`, `URL_NOT_REACHABLE`); keep file names short and portable (recommendation). |
| 22 | A task has no `report` output. | Check that the task documents this output. `file-transformation-xslt` and `table-export-schema` do not provide one or support `skipReportGeneration` or `logLevel`. Use the XSLT flag `allFilesTransformed`, or the schema export task status and `file` output. For tasks that do provide a report, `skipReportGeneration: true` disables it; lower `logLevel` when the report is only too verbose. |
| 23 | A script fails on `console.log`, `require`, `fetch` or `process`. | Plain ECMAScript only: the standard built-ins, `$` and `log()`; no network, no modules, 10 minutes per task. |
| 24 | A jq expression fails on dates. | `strftime`, `todate`, `now` do not exist; compute dates in JavaScript or XSLT. |
| 25 | A taxonomy import rejects categories. | Category keys with leading or trailing spaces are rejected (2026 release note); trim every key generated by an XSLT. |
| 26 | A rules export fails or misses rules. | The export fails when the table carries no rules, when the account running the job has no access to the table, or when `accountKey` matches no account; it exports only the rules of the account running the job. |
| 27 | Moving items to an archive partition did not free their identifier values. | Identifier uniqueness spans all partitions (identifiers guide). |
| 28 | A shared job behaves differently for the partner. | Variables of a shared job resolve on the owner's account; tasks without `apiKey` run in the context of the account running the job, tasks with an `apiKey` in the key's account; a table shared to an account is not returned by key-based finds on that account. |
| 29 | AI job surprises. | API key in a protected variable; suggestions must be reviewed; size batches from a measured first run. |
| 30 | A job "succeeded" although files failed. | File tasks can complete with partial output: inspect their flags and reports. Add a branch for a required business outcome, without a routine `allFilesGenerated` guard after an Excel export. |

## 2. Format traps

Each trap is a shape that looks plausible but is not part of the job format, followed by the right form. Section 3 lists everything that `job.json` may contain.

### T1. Job identity and root shape

Wrong: identity or inputs written with properties the format does not have, for example a root `jobName` instead of `key` and `title`, or user inputs declared outside `userInputs`.

```json
{
  "jobName": "export-items",
  "inputs": ["language"],
  "tasks": []
}
```

Right: `key` identifies the job (stable, kebab-case), `title` names it, user inputs are objects in the `userInputs` array, and versions are recorded in `CHANGELOG.md`.

```json
{
  "schema": "1.0",
  "key": "export-items",
  "title": "Export items",
  "userInputs": [],
  "tasks": [],
  "outputParameters": {}
}
```

### T2. Catalog task envelope

A catalog task is one flat object: `name` is the catalog task name, `type` is `SUB_WORKFLOW`, and `inputParameters` holds the inputs documented in `tasks/<name>.md` at its first level.

Wrong: the inputs wrapped one level down (`"inputParameters": { "input": { "mode": "FILE" } }`), or the catalog task name written anywhere other than `name`.

Right: `"name": "file-transformation-xslt"`, `"type": "SUB_WORKFLOW"`, `"inputParameters": { "mode": "FILE", "file": "${export_items.output.file}", "xslt": "file://assets/transform.xslt" }`.

### T3. Task types

`type` takes one of six values: `SUB_WORKFLOW` for every catalog task, and `SWITCH`, `DO_WHILE`, `TERMINATE`, `SET_VARIABLE` or `WAIT` for flow control (`DECISION` only in an existing job that already uses it). Every other capability is a catalog task with `"type": "SUB_WORKFLOW"`:

| Need | Catalog task | Main inputs | Status |
| -- | -- | -- | -- |
| Call an HTTP API | `protocol-http-perform` | `scheme`, `method`, `domain`, `path`, `headers`, `body`, `responses`, `authentication`, `assertions`, `connectionTimeOutMilliseconds` | GA |
| Run JavaScript | `code-execute-javascript` | `expression` or `expressionFile`, `data`, `resources`, `response` | alpha |
| Reshape JSON | `json-transform-jq` | `data`, `queryExpression` | alpha |
| Run independent executions in parallel | `task-batch-execute` | `taskName`, `concurrency` (1 to 5), `request`, `outputs` | alpha |
| Prompt a language model | `ai-prompt-execute` | see the task reference | alpha |
| Start another job | `data-job-execution-create` | see the task reference | alpha |

### T4. TERMINATE inputs

The `inputParameters` of a `TERMINATE` hold two keys: `terminationStatus` (`COMPLETED` ends the job in success, `FAILED` ends it in error) and, optionally, `outputParameters` (the values shown to the user, which replace the job-level ones). `TERMINATED` is the status of an execution stopped by a user, never a value to write.

```json
{
  "name": "terminate",
  "taskReferenceName": "terminate_invalid_configuration",
  "description": "Stop when the configuration is invalid",
  "optional": false,
  "type": "TERMINATE",
  "inputParameters": {
    "terminationStatus": "FAILED",
    "outputParameters": { "message": "Invalid configuration" }
  }
}
```

### T5. HTTP calls

`protocol-http-perform` takes the address in parts: `scheme` (`HTTP` or `HTTPS`), `domain` (without scheme, port or path), `port`, `path` and `queryParameters`. No input takes a whole URL.

Wrong: `"url": "https://api.example.com/v1/items"`, or `"domain": "https://api.example.com/v1"`.

Right:

```json
{
  "name": "protocol-http-perform",
  "taskReferenceName": "get_items",
  "description": "Fetch the items",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "scheme": "HTTPS",
    "method": "GET",
    "domain": "api.example.com",
    "path": "/v1/items",
    "headers": { "Accept": "application/json" },
    "responses": ["JSON"],
    "connectionTimeOutMilliseconds": 10000
  }
}
```

### T6. Scripts

JavaScript runs in the `code-execute-javascript` catalog task: `expression` is a function body that returns the result (`"return { sum: $.data.a + $.data.b };"`), or `expressionFile` points to a `file://assets/<name>.js` asset. Inputs go under `data` and are read as `$.data.<key>`; `log()` traces; `eval()` is forbidden; there is no network. The `javascript` expression of a `SWITCH` and the `loopCondition` of a `DO_WHILE` are different: bare JavaScript expressions that read the task's `inputParameters` as `$.<key>`; these skills write them in ES5 syntax, without `return` or `log()`.

### T7. Variable root confusion

Wrong: `${workflow.variables.api_key}` for an account variable, `${workflow.input.secret}` for a secret, two global variables in one string, a global variable inside script code or inside the inputs of `loop` / `set-variable` / `wait` / `json-transform-jq`.

Right: `${workflow.globalVariables.api_key}` (the variables tutorial writes the singular `${workflow.variable.api_key}`) for account variables; `${workflow.variables.x}` only for values set by `SET_VARIABLE`; secrets never travel as user inputs.

### T8. Loops

A `DO_WHILE` carries `inputParameters` (typically `elements`, an array), `loopCondition` and `loopOver`. Inside the body, the loop exposes `${<loopRef>.input.<key>}` and `${<loopRef>.output.iteration}` (1-based); a `json-transform-jq` task extracts the current element (`.data.elements[.data.iteration - 1]`, idiom in `control-flow.md` section 2), and state carried from one iteration to the next goes through `SET_VARIABLE`. Nesting a loop inside another loop is not documented: avoid it, and use `task-batch-execute` for independent iterations or a triggered job for the inner level.

### T9. Placeholders in structural positions

Wrong: `"loopOver": "${...}"`, `"decisionCases": { "YES": "${...}" }`, `"json": { "tasks": "${build.output.result.tasks}" }`, `{ "url": "file://assets/x.xlsx" }`, a `file://assets/...` string produced at runtime.

Right: literal arrays under `tasks`, `loopOver`, `decisionCases`, `defaultCase`; `"json": "${build.output.result}"`; bare `"file://assets/x.xlsx"` written in `job.json`; the builder task receives the asset in `data` and copies the resolved file object.

### T10. Missing or duplicate identity fields

Wrong: two tasks named `transform` in different branches; tasks without `description` or `optional`; reference names with spaces.

Right: unique snake_case `taskReferenceName` across the whole job including nested branches; `description` and `optional` on every task.

### T11. SWITCH evaluators

`evaluatorType` is `value-param` or `javascript`. With `value-param`, `expression` names a key of `inputParameters`; with `javascript`, `expression` is a JavaScript expression that reads `$.<key>` (ES5 syntax by convention of these skills).

### T12. DECISION in new jobs

Wrong for new jobs: `"type": "DECISION"` with `caseValueParam`. Right: `SWITCH` with `"evaluatorType": "value-param"`. Keep `DECISION` only when editing a job that already uses it.

### T13. Outputs that may never exist

What an `outputParameters` entry referencing a task inside a `SWITCH` branch that did not run resolves to is not documented. If the job may end with `TERMINATE`, put the user-facing values in the `TERMINATE` task's `outputParameters` (they win).

### T14. Secrets inline

Wrong: `"password": "hunter2"`, `"X-Api-Key": "sk-..."`. Right: `"${workflow.globalVariables.supplier_ftp_password}"` plus a README entry asking the administrator to create a protected variable.

### T15. Unsupported job timeout

`timeoutSeconds` is not supported at the job root or in a task envelope, including with value `0`. Use it only at a documented task input path: `data-job-execution-await.inputParameters.timeoutSeconds` or `data-job-execution-create.inputParameters.waitOptions.timeoutSeconds`. The execution status `TIMEDOUT` does not add a property to the package format.

### T16. Cron fields

Periodicity is a 5-field cron (`0 9 * * *`), evaluated in UTC, configured in Settings, never in `job.json`. Six-field or seconds-based expressions are not valid.

### T17. Type-mismatched wiring

Wrong: a `FILE` output into a `files` input (or the reverse), an `ENUM` into a string field, `mode: FILE` without `file`, `mode: FILES` without `files`. Right: same type on both ends; a merge or archive task, or the `FILES` mode of the consumer, when a list must become one file.

### T18. Wrong `type` for flow control

Wrong: `"name": "switch", "type": "SUB_WORKFLOW"`. Right: the keyword in `type` (`SWITCH`, `DO_WHILE`, `TERMINATE`, `SET_VARIABLE`, `WAIT`); `name` is free text for these.

### T19. User input shapes

`${workflow.input.<key>}` for scalars; `.url` for a `FILE` only in string contexts; `.key` for `FIELD` / `SCREEN`; arrays with `multiple: true`; `DATE` arrives as an ISO string; never name an input `context`; the property is `default`, never `defaultValue`.

### T20. JSON hygiene

No comments, no trailing commas (several documentation samples contain them; never copy them); `schema` is the string `"1.0"`; `optional` is a boolean; documented task timeout inputs are numbers.

### T21. Statuses in job logic

Branch only on documented values. `${<ref>.status}` of an optional task that failed is `COMPLETED_WITH_ERRORS` (documented); `COMPLETED` for a successful task is an inference, so prefer a `COMPLETED_WITH_ERRORS` case plus `defaultCase`. Job execution statuses are `PENDING`, `RUNNING`, `COMPLETED`, `USER_ERROR`, `FAILED`, `TERMINATED` and `TIMEDOUT` on the job executions page; the job chaining tasks add `COMPLETED_WITH_ERRORS` and `REMOVED` to their terminal statuses and spell `TIMED_OUT` (`lifecycle.md` section 7). A case written for any other value never matches.

### T22. Catalog hallucination

Every `SUB_WORKFLOW` `name` must exist in the task catalog (`tasks/index.md`). Names such as `http-call`, `apply-stylesheet`, `send-email`, `data-item-update` do not exist. Say so when a task is deprecated (`protocol-rest-perform` replaced by `protocol-http-perform`; `decision` replaced by `switch`).

## 3. The closed job format

`job.json` contains only what this table lists. Anything not listed is not part of the job format; the validator rejects it.

| Element | What exists |
| -- | -- |
| Root properties | Required: `schema` (the string `"1.0"`), `key`, `title`, `tasks` (array). Optional: `icon`, `titleLocal`, `description`, `descriptionLocal`, `userInputs` (array), `outputParameters` (object). Write them in the order `schema`, `key`, `title`, `icon`, `titleLocal`, `description`, `descriptionLocal`, `userInputs`, `tasks`, `outputParameters`. A free-text `version` string appears in published packages but not in the documented property table; the validator of these skills accepts it; prefer `CHANGELOG.md`. |
| Task envelope | `name`, `taskReferenceName`, `description`, `optional` (boolean), `type`, `inputParameters` (object) |
| Task `type` | `SUB_WORKFLOW` (catalog tasks), `SWITCH`, `DO_WHILE`, `TERMINATE`, `SET_VARIABLE`, `WAIT`; `DECISION` (deprecated) only in existing jobs |
| Flow-control keys, next to the envelope | `SWITCH`: `evaluatorType`, `expression`, `decisionCases`, `defaultCase`. `DO_WHILE`: `loopCondition`, `loopOver`. `DECISION`: `caseValueParam`, `decisionCases`, `defaultCase`. `TERMINATE`, `SET_VARIABLE`, `WAIT` and catalog tasks have none: everything else goes in `inputParameters`. |
| Catalog task inputs | the inputs listed in `tasks/<name>.md`, at the first level of `inputParameters` |
| `TERMINATE` inputs | `terminationStatus` (`COMPLETED` or `FAILED`), `outputParameters` (object, optional), and the report inputs shared by most tasks, `skipReportGeneration` and `logLevel` (optional) |
| `SET_VARIABLE` inputs | variable names mapped to values (strings, numbers, booleans, arrays, objects) |
| `WAIT` inputs | exactly one of `duration` or `until` |
| `SWITCH` evaluators | `value-param`, `javascript` |
| Expression roots | `${workflow.input.<key>}`, `${workflow.input.context}` and its properties (`job-context.md`), `${workflow.globalVariables.<key>}` (singular form `${workflow.variable.<key>}` in the variables tutorial), `${workflow.variables.<key>}`, `${<ref>.output.<path>}`, `${<ref>.status}`; inside a loop `${<loopRef>.input.<key>}` and `${<loopRef>.output.iteration}`; after a loop `${<loopRef>.output}`. Object and array values accept dot navigation and `[n]` indexing (`${<ref>.output.result.json[0].response.id}`). |
| Shipped files | bare `"file://assets/<path>"` strings, written literally in `job.json` |
| User input types | `TEXT`, `TEXTAREA`, `SELECT`, `FILE`, `DATE`, `FIELD`, `SCREEN` |
| User input properties | `key`, `title`, `titleLocal`, `description`, `descriptionLocal`, `required`, `type`, `multiple`, and `default` for `TEXT`, `TEXTAREA` and `SELECT`; `SELECT` adds `mode` and `options` (each with `key`, `title` and an optional `titleLocal`); `FIELD` adds `options.filters`. Any other property is not part of the documented format: leave it out. |
| Statuses | the values listed in T21 |

Value rules that apply everywhere:

- Every `${` opens one of the expressions above; a literal `${` that resolves to nothing is a bug.
- A shipped file is the bare string `"file://assets/<path>"`, never an object such as `{ "url": "file://assets/..." }` and never a `file://` string built at run time.
- User inputs take `default`, never `defaultValue`.
- One global variable per template string, never inside script code, never in the inputs of a loop, `SET_VARIABLE` or `WAIT` (T7).

The validator reports what falls outside these lists as an error, with three warnings instead: the deprecated `DECISION`, an input that a task reference does not list (a recent input may be missing from the catalog: check the task page), and a user input property that is not listed above. Rewrite the job rather than argue that the platform "might accept it".
