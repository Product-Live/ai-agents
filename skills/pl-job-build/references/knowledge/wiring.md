# Wiring inputs, outputs and files

> Reference token: DF-WIRING-01

Tasks are wired with `${...}` expressions written as JSON strings inside `inputParameters` and `outputParameters`.
This file lists every documented expression root, the input/output types and their compatibility rules, the file object, the `file://assets/...` asset reference, task status references and the rules that decide which outputs users see.

## 1. Expression roots

| Expression | Meaning |
| -- | -- |
| `${workflow.input.<key>}` | Value of the user input `<key>` (or of the execution `input.<key>` when the job is launched through the API or by another job). |
| `${workflow.input.<fileInput>.url}` | URL of an uploaded `FILE` input; `.name` for its file name. Only in string contexts. Repository practice: the documentation shows no `.url` or `.name` sub-path expression; they follow from the dot navigation of the file object. |
| `${workflow.input.<key>.key}` | Key of a selected `SCREEN` or `FIELD` input. A published use case job reads `${workflow.input.screen.key}` for a `SCREEN` input; for `FIELD` it is repository practice, the documentation only says that "the selected field object is passed to the job". |
| `${workflow.input.context}` and `${workflow.input.context.<prop>}` | Job context: `jobActionOrigin`, `triggerAt`, `view.table.key`, `query`, `selection.ids`, ... See `job-context.md`. |
| `${<taskReferenceName>.output.<name>}` | An output of a previous task: `${table_export_items.output.file}`, `${ftp_get.output.noFile}`, `${find_products.output.totalElements}`. |
| `${<ref>.output.<name>.<sub>.<sub>}` | Dot navigation inside an object output: `${calculate_start_date.output.result.startDateISO}`, `${data_job_execution_find.output.result.json}`. |
| `${<ref>.output.result.json[0].response.id}` | Array indexing with `[n]` (0-based) inside an expression. |
| `${<ref>.status}` | Status of a previous task: `COMPLETED_WITH_ERRORS` for an optional task that failed (documented); `COMPLETED` for a successful task is an inference. See section 6. |
| `${workflow.globalVariables.<key>}` | Account-level (global) variable, including protected secrets. The variables tutorial also writes the singular `${workflow.variable.<key>}`. See `variables-and-secrets.md`. |
| `${workflow.variables.<key>}` and `${workflow.variables.<key>.<sub>}` | Local variable set earlier by a `SET_VARIABLE` task; `null` when missing. |
| `${<loopRef>.input.<key>}`, `${<loopRef>.output.iteration}`, `${<loopRef>.output}` | Inside or after a `DO_WHILE` loop. See `control-flow.md`. |
| `file://assets/<path>` | A file shipped in the package. Not an expression: a bare string resolved at upload time (section 5). |

Rules:

- The documented convention is `${previous-taskReferenceName.output.valid-output-name}`; the VS Code autocompletion only proposes outputs of tasks placed above the current one. What a reference to a task that runs later (or in a sibling branch that did not run) resolves to is not documented: never write one.
- Every string value in `inputParameters` is scanned: references work at any depth (inside `request.json`, `data`, `params[].select`, `headers`).
- What an expression that cannot be resolved becomes is not documented: a literal `${` surviving in an input is a bug. Never write `${` in a value that is not a resolvable reference.
- Only these roots are documented: any other root is not part of the job format, and the validator rejects it.

## 2. String interpolation

A reference can be embedded in a longer string, as the documented examples do with string values (a token, a key, a name):

```json
{
  "headers": {
    "Authorization": "Bearer ${workflow.globalVariables.my_api_token}"
  },
  "path": "/storage/v1/b/${workflow.variables.bucket_name}/o",
  "fileName": "schema-${get_current_table.output.result.key}.xml",
  "message": "Invalid job configuration: ${prepare_inputs.output.result.validationErrors}"
}
```

Limits: a single template string cannot contain two global variables (`"${workflow.globalVariables.prefix} ${workflow.globalVariables.name}"` does not work). How a file object, an object or an array is rendered inside a longer string is not documented: keep such references as the entire value.

## 3. Whole objects and arrays

A reference that is the entire value injects the resolved value with its type:

```json
{
  "json": "${build_tasks.output.result}",
  "operations": "${generate_comment_threads.output.result.operations}",
  "value": "${parse_eans.output.result.eans}",
  "elements": "${find_tables.output.result.json}"
}
```

The exceptions are the structural keys `tasks`, `loopOver`, `decisionCases` and `defaultCase`: they must hold literal arrays of tasks. For a batch built at runtime, write `"json": "${build_tasks.output.result}"` where the script returns `{ "tasks": [...] }`, never `"json": { "tasks": "${build_tasks.output.result.tasks}" }`.

## 4. Input and output types

| Type | Description | Examples of outputs |
| -- | -- | -- |
| `FILE` | One file object | `file`, `report`, `listing`, `result` (scripts with `response: FILE`), `result.json` of a data task with `outputMode: ATTACHMENT` |
| `FILES` | An array of file objects | `files` (XSLT in `FILES` mode, Excel, archive, unarchive) |
| `ENUM` | A fixed set of values, usually `YES` or `NO`, meant to be tested by a `SWITCH` | `noFile`, `allFilesTransformed`, `allFilesGenerated`, `allFilesValid`, `allEmailsSent`, `itemsFound` |
| `NUMBER` | A number | `totalElements`, `iteration` |
| `TEXT` / `STRING` | A string | `message` (display message), `result` (XSLT with `output: STRING`) |
| `OBJECT` | A JSON object navigable with dots | `result` (scripts, jq, data tasks), `summary` (batch) |

Compatibility rules:

- "When you are wiring two tasks, it can only be done with the same type for output and input." A `FILE` output goes to a `FILE` input, a `FILES` output to a `FILES` input.
- Tasks with a `mode` property take `FILE` with a `file` input and `FILES` with a `files` input. "You can view the mode = FILES as a loop that will do the same Task whatever input files they are."
- To feed a `FILES` output into a `FILE` input, use a task that merges or archives the files, pick one with `[0]`, or switch the consumer to its `FILES` mode.
- An `ENUM` output is not a boolean: compare it with string case keys (`"YES"`, `"NO"`).
- File tasks can end `COMPLETED` with partial output. Their `YES`/`NO` flags and reports describe that outcome; add a `SWITCH` when a business condition needs it. An Excel export passes outputs directly without a routine generation guard.

## 5. File objects and `file://assets/...`

A file object looks like this (the exact property set varies by producer):

```json
{
  "url": "https://app.product-live.com/files-data-factory/...",
  "name": "items.xml",
  "hash": "<SHA-256 of the content>"
}
```

Rules:

- Pass the whole object: `"file": "${export_items.output.file}"`. This is the wiring rule of these skills (convention of these skills), not a quotation: a `FILE` input receives the complete file object, never its `.url` string alone. It follows from the documented type rule: "When you are wiring two tasks, it can only be done with the same type for output and input."
- Use `.url` only where the URL itself is the value (the `.url` sub-path is repository practice: the documentation names the `url` property of file objects but shows no `${...}.url` expression): a string inside the `data` of a jq or JavaScript task, a text template, a link that an XSLT writes into its output. To let an XSLT read a file, pass the whole file reference in `params[].select` (`${<ref>.output.file}`, `file://assets/<path>` or a FILE user input `${workflow.input.<key>}`), the documented form: the stylesheet receives the file's location as a string (a path or a URL) and opens it with `doc($p)`, `document($p)` or `unparsed-text($p)`.
- The URL "is sufficient on its own to download it", so treat file URLs as confidential. They are temporary files; jobs that must archive results push them to FTP, cloud storage or email.
- A `FILE` typed input accepts three forms: a previous task output (`${x.output.file}`), a user `FILE` input (`${workflow.input.zip_file}`), or an asset reference (`file://assets/<path>`).

`file://assets/<path>` semantics:

- Syntax: a bare string, path relative to the package root, always under `assets/`: `"xslt": "file://assets/transform.xslt"`, `"templates": [{ "key": "t", "file": "file://assets/template.xlsx" }]`, `"expressionFile": "file://assets/script.js"`, `"resources": [{ "key": "config", "file": "file://assets/config.json", "loadAs": "JSON" }]`.
- "That reference is resolved when the job is created, not while it runs": every `file://assets/...` string written literally in `job.json`, at any depth, is replaced by the file object when the package is uploaded. The platform rejects the package if the file is missing.
- A `file://assets/...` string produced at runtime (by a script, a jq expression or an XSLT) is never resolved. To use an asset in a runtime-built list, declare it in the builder task's `data` (`"template": "file://assets/shoes.xlsx"`): the script receives the resolved file object in `$.data.template` and copies it where needed.
- "Do not wrap the reference in a url object": `{ "url": "file://assets/shoes.xlsx" }` is not a runtime form of the reference.
- Interaction with `.jobignore`: an ignored file is not in the ZIP, so its reference fails at import. The validator checks that each referenced asset exists on disk and survives `.jobignore`.
- Files produced by tasks are referenced only through expressions (`${ref.output.file}`), never by name or URL.

## 6. Task status references

To react to the failure of a task without stopping the job, mark it `optional: true` and test its status in a `SWITCH`:

```json
{
  "name": "switch",
  "taskReferenceName": "check_http_status",
  "description": "React to a failed HTTP call",
  "optional": false,
  "type": "SWITCH",
  "inputParameters": {
    "status": "${protocol_http_perform.status}"
  },
  "evaluatorType": "value-param",
  "expression": "status",
  "decisionCases": {
    "COMPLETED_WITH_ERRORS": [
      {
        "name": "notification-send-email",
        "taskReferenceName": "notify_failure",
        "description": "Send the error email",
        "optional": false,
        "type": "SUB_WORKFLOW",
        "inputParameters": {
          "mode": "FILE",
          "file": "file://assets/error-email.html"
        }
      }
    ]
  },
  "defaultCase": []
}
```

The handling-failures page writes the reference as the bare `"protocol_http_perform.status"`; prefer the braced form `"${protocol_http_perform.status}"`, which is the form of every other documented task reference. How the bare form is evaluated is not documented, so always keep a `defaultCase`. Values: `COMPLETED_WITH_ERRORS` for an optional task that failed (documented); `COMPLETED` for a successful task is inferred from the job execution statuses, not shown for `${ref.status}` in the documentation, so prefer a `COMPLETED_WITH_ERRORS` case plus `defaultCase` over a `COMPLETED` case. The documentation marks a task `optional` so that the job continues after its failure; do not rely on a `FAILED` case. The braced form ran on a stage job on 2026-11-24, inside a loop and inside a SWITCH branch. Some versions of the VS Code extension wrongly report it as an invalid path: keep it, and do not replace it with a guess from the outputs of the failed task (what those outputs resolve to after a failure is not documented).

## 7. User outputs (`outputParameters`)

```json
{
  "outputParameters": {
    "excel_files": "${file_generation_xlsx.output.files}",
    "zip_files": "${file_generation_archive.output.files}",
    "found": "${find_products.output.totalElements}",
    "message": "${display_message.output.message}"
  }
}
```

- The key is any label (best practice: lowercase with `_`); the value references a task output (files, numbers, strings or objects). Files become downloadable at the end of the action and in the Actions history panel (user outputs tutorial); the job execution API returns every user output in the execution `output`.
- Without an entry here, a result "is not downloadable" even if the task produced it.
- A `notification-display-message` only shows if its `message` output is exposed through `outputParameters`.
- Tasks executed inside a `SWITCH` branch are not visible in the execution details; expose what happened inside through `outputParameters`. What a reference to a task in a branch that did not run resolves to is not documented.
- When the job ends through a `TERMINATE` task, the job ends "in success but the user will not view the outputs" unless the `TERMINATE` task lists them in its own `outputParameters` (decision-and-terminate tutorial). "When you terminate a Job you must explicitly define which outputParameters must be displayed."
- Job chaining: a triggered job exposes its result only through its own `outputParameters` (or those of its `TERMINATE`). The caller reads them at `${run_job.output.result.json[0].response.output.<key>}`.

## 8. Report inputs and outputs

Most catalog tasks accept two optional report inputs and produce a `report` output. Check the task reference before using them: `file-transformation-xslt` and `table-export-schema` support neither these inputs nor the `report` output.

| Property | Type | Default | Description |
| -- | -- | -- | -- |
| `skipReportGeneration` | boolean | `false` | When `true`, the report generation is skipped and the `report` output is not available. |
| `logLevel` | enum `error`, `warning`, `info`, `debug` | `info` | Log level recorded in the report: `error` < `warning` < `info` < `debug`. (`task-batch-execute` defaults to `warning` and propagates it to every entry.) |
| `report` (output) | `FILE` | | XML file containing the logs of the task execution. Usable as input of an XSLT (`"file": "${import_items.output.report}"`) and filtered with XPath such as `Report/Log[@type='error']`. |

Report shape:

```xml
<Report task="table-import-items" date="2026-01-15T10:00:00.000Z" action-id="...">
    <Input name="mode">CREATE_ONLY</Input>
    <Log type="info">
        <Metadata name="xpath">/Table/Items/Item[3]</Metadata>
        <Metadata name="code">...</Metadata>
        <Metadata name="table-key">PRODUCTS</Metadata>
        <Metadata name="partition-key">ACTIVES</Metadata>
        <Metadata-Collection name="identifier">
            <Metadata name="EAN_13">1234567890123</Metadata>
        </Metadata-Collection>
        <Message>The following item was not imported. It was already existing in the table "products": EAN_13: 1234567890123</Message>
    </Log>
</Report>
```

Recommendation of these skills: automate on the `code` metadata (and `type`) rather than on the `Message` text, which is meant for people; the documentation does not say whether message texts are stable. The `<Input>` elements echo the task inputs, which is why secrets must never be passed to inputs that end up in reports (see `variables-and-secrets.md`).

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| `"file": "${export.output.file.url}"` into a `FILE` input | `"file": "${export.output.file}"` |
| `"file": { "url": "file://assets/data.xml" }` | `"file": "file://assets/data.xml"` |
| `"files": "${xslt.output.file}"` (`FILE` into `FILES`) | match types: `"file": "${xslt.output.file}"` or use the `FILES` mode with `${xslt.output.files}` |
| `"json": { "tasks": "${build.output.result.tasks}" }` | `"json": "${build.output.result}"` |
| `"status": "protocol_http_perform.status"` (bare) | `"status": "${protocol_http_perform.status}"` |
| `${workflow.input.file}` embedded in text (`"Input: ${workflow.input.file}"`) | keep the reference as the whole value; use `.name` or `.url` in text |
| Referencing a task that runs later or in another branch | reorder tasks; expose branch results through `outputParameters` or a `SET_VARIABLE` written by every branch |
| `"${workflow.globalVariables.a}-${workflow.globalVariables.b}"` | one global variable per template string |
| Literal `${` left in an input (`"${TODO}"`) | resolve or remove it before packaging |
| A job ending with `TERMINATE` but files listed only in the job-level `outputParameters` | repeat the useful outputs in the `TERMINATE` task's `outputParameters` |
