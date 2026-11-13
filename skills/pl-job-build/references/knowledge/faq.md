# Frequently asked questions

> Reference token: DF-FAQ-01

Short answers to the questions users ask most when they design, import and run Data Factory jobs.
Each answer points to the reference file that holds the details and the verbatim examples.
Public documentation: https://learn.product-live.com/data-factory/ (task pages at `https://learn.product-live.com/data-factory/references/tasks/<name>/`).

## Getting started

**What is a Data Factory job?**
A workflow made of chained tasks (export, transform, import, generate files, call APIs, send emails) packaged as a ZIP whose definition is `job.json`. It runs on a pipeline of your account, manually from the app or Settings, on a schedule, through the API or from another job. See `job-format.md` and `lifecycle.md`.

**What is the smallest valid job?**
`{ "schema": "1.0", "key": "my-job", "title": "My job", "tasks": [] }`. A useful job adds at least one catalog task and an `outputParameters` entry so the user can download the result. See `job-format.md` section 2.

**How do I create and import a job?**
Author the package (ideally with the Product-Live VS Code extension, which validates `job.json` and packages it), create the global variables it needs in Settings, then upload the `.job.zip` in Settings > Data Factory > Jobs and set pipeline, project, status and visibility. See `lifecycle.md` sections 1 to 4.

**Which tasks exist?**
About a hundred catalog tasks grouped by family: table schema and items, file conversion, transformation, generation and validation, FTP, HTTP / SOAP, notifications, rules engine, storage, exchange, AI, code execution, data (`data-*`) tasks, plus the flow-control tasks. The catalog lives in `tasks/index.md`; never invent a task name. See `pitfalls.md` T22.

**Where do I find examples?**
The documentation ships ready-to-use generic jobs and use cases (export to Excel, ZIP of images, reports, CSV import from sFTP, AI enrichment). The `assets/examples/` folder of this skill contains curated packages. Patterns are summarised in `control-flow.md` section 9 and `scripting.md`.

## Job format

**Is `schema` a number?**
No: it is the string `"1.0"`. `optional` is a boolean, `timeoutSeconds` is a number, `userInputs` is an array, `outputParameters` is an object. See `job-format.md` section 2 and `pitfalls.md` T20.

**Can I change the job key later?**
No. "Job key can not be updated." Updates are uploaded on the same key; versions go in `CHANGELOG.md`. See `job-format.md` section 6.

**Where do pipeline, status, visibility and periodicity go?**
Not in `job.json`. They are configured in Settings (or through the API job resource) after import. Document the expected values in the README. See `job-format.md` section 7 and `lifecycle.md`.

**Which icons can I use?**
One of the 39 values listed in `job-format.md` section 4 (`file-excel`, `file-zip`, `file-pdf`, `mail`, `api`, `calendar`, ...).

**Do `description` and `optional` have to be on every task?**
The task properties page marks both as required; some official flow-control examples omit them. Always set them: `description` documents intent and `optional` decides whether a failure stops the job. See `job-format.md` section 3.

**What is in `assets/` and what does `.jobignore` do?**
`assets/` holds every file the job references with `file://assets/<path>` (XSLT, scripts, templates, HTML). `.jobignore` lists globs excluded from the ZIP (`*.job.zip`, `.jobignore`, `assets/TESTS/*` by default; `node_modules` always). Never ignore a referenced asset. See `job-format.md` section 1 and `wiring.md` section 5.

## Inputs and outputs

**How do I ask the user for a value?**
Declare it in `userInputs` (`TEXT`, `TEXTAREA`, `SELECT`, `FILE`, `DATE`, `FIELD`, `SCREEN`) and read it with `${workflow.input.<key>}`. Use `default` for default values. See `user-inputs.md`.

**How do I pass a file from one task to the next?**
Reference the whole file object: `"file": "${export_items.output.file}"`. Use `.url` only where the URL itself is the value (a link written into an output, a string in script data); an XSLT param takes the whole reference. Match `FILE` with `file` inputs and `FILES` with `files` inputs. See `wiring.md` sections 4 and 5.

**Why is my result not downloadable?**
Because it is not listed in `outputParameters`. Add `"my_file": "${generate_excel.output.files}"`. If the job ends through a `TERMINATE` task, the outputs must be repeated in that task's `outputParameters`. See `wiring.md` section 7.

**Why does my display message not appear?**
Its `message` output must be exposed in `outputParameters` (or in the `TERMINATE` task). The HTML is sanitised: no images, no `h1` / `h2`, no inline styles, no JavaScript. See `scripting.md` section 6.

**How do I read the items selected in the grid?**
Use `table-export-items` with `mode: "USER_SELECTION"` or `data-item-find` with `findMode: "USER_SELECTION"`. The job must be launched from a table in the app with a selection. See `job-context.md` section 4.

**How does the job know where it was launched from?**
`${workflow.input.context.jobActionOrigin}` is `APP`, `SETTINGS`, `API` or `PERIODIC`; `context.view` gives the table, partition and screen for `APP` and `SETTINGS`; `context.triggerAt` is the launch date in UTC. See `job-context.md`.

## Tasks and flow control

**How do I branch?**
With a `SWITCH` task: `evaluatorType: "value-param"` to match a value from `inputParameters` (an ENUM output such as `noFile`), or `"javascript"` for a short JavaScript expression on `$.<key>` (written in ES5 syntax by convention of these skills). Always include `defaultCase: []`. See `control-flow.md` section 1.

**How do I stop a job early?**
With a `TERMINATE` task inside the matching `SWITCH` branch: `terminationStatus: "COMPLETED"` (nothing to do) or `"FAILED"` (configuration error), with a message in its `outputParameters`. See `control-flow.md` section 3.

**How do I loop over a list?**
With the `loop` task (`type: "DO_WHILE"`): `elements` in `inputParameters`, a `loopCondition` on `$.<loopRef>['iteration']`, and a `json-transform-jq` task picking `.data.elements[.data.iteration - 1]`. Prefer `task-batch-execute` when iterations are independent. See `control-flow.md` section 2.

**How do I run tasks in parallel?**
With `task-batch-execute`: a list of `{ key, taskName, inputs }` entries and `concurrency` from 1 to 5; results come back in input order with a `summary`. A failed entry never stops the batch: check `summary.errorCount`. See `control-flow.md` section 7.

**What is the difference between `decision` and `switch`?**
`decision` is deprecated; `switch` replaces it with two evaluators. Migrate by replacing `caseValueParam` with `evaluatorType: "value-param"` and `expression`. See `control-flow.md` section 6.

**How do I trigger another job and use its result?**
`data-job-execution-create` with `wait: true` and `waitOptions`; the child exposes its result in its own `outputParameters`, read at `${run_job.output.result.json[0].response.output.<key>}`. The two jobs must run on different pipelines. See `lifecycle.md` section 10.

**How do I call an external API?**
`protocol-http-perform` with `scheme`, `method`, `domain`, `path`, `headers`, `body`, `responses` and an `authentication` block; the token comes from a protected global variable. `protocol-rest-perform` is deprecated. See the task page and `pitfalls.md` T5.

## Variables and secrets

**Where do I store a password or an API key?**
In a protected global variable created in Settings > Data Factory > Variables, referenced as `${workflow.globalVariables.<key>}` and passed only to connection inputs (FTP password, HTTP headers, `apiKey`). List it in the README. See `variables-and-secrets.md` sections 1 and 3.

**`globalVariables`, `variable` or `variables`?**
`${workflow.globalVariables.x}` is the documented form for account variables; `${workflow.variable.x}` is the singular form used by the variables tutorial for the same account variables; `${workflow.variables.x}` reads a local variable set by `SET_VARIABLE`. See `variables-and-secrets.md`.

**Why is my variable empty at run time?**
Check the value stored in Settings (the expression is replaced with that value, so an empty value gives nothing usable; no error is documented for that case), the key (exact, pattern `^[a-z0-9_]{1,50}$`; the behaviour for an unknown key is not documented), the account (variables of a shared job are resolved on the owner's account), the variable status (`ACTIVE`, `ARCHIVED` or `DELETED`; how a non-active variable resolves is not documented), and where the variable is used (not supported in loop, set-variable, wait and jq inputs, inside script code, or two in one string). See `variables-and-secrets.md` section 1.2.

**Can a variable hold a list or an object?**
A global variable holds a single string: store JSON text and parse it with `json-transform-jq`. A local variable (`SET_VARIABLE`) can hold objects and arrays up to 256 KB. See `variables-and-secrets.md` section 2.

## Scheduling and pipelines

**How do I schedule a job?**
Add up to 3 periodicity rules in Settings (5-field cron, UTC, at least 15 minutes apart; the scalability tutorial advises not below every 30 minutes). The job must not rely on a grid selection. What a periodic run receives for user inputs is not documented: keep the configuration in a `data` block or in global variables, and make the job safe to re-run (recommendations). See `lifecycle.md` section 6 and `job-context.md` section 6.

**Why is my job "waiting for execution"?**
A pipeline runs one job at a time, first in first out; the app shows how many actions are ahead. Ask for a second pipeline when scheduled and interactive jobs compete. See `lifecycle.md` section 5.

**Why did my scheduled job not run?**
Check that the rule is enabled, that the job has not been disabled or deleted, that a previous execution is not still running (it queues the next one), that the pipeline is not blocked, and whether a maintenance or an incident interrupted scheduled executions (FAQ of the documentation). See `lifecycle.md` section 6.

## Failures and errors

**What do the execution statuses mean?**
The job executions page lists `PENDING`, `RUNNING`, `COMPLETED`, `USER_ERROR` (invalid inputs or quotas), `FAILED` (technical), `TERMINATED` (stopped by a user) and `TIMEDOUT` (`timeoutSeconds` exceeded). The job chaining tasks also list `COMPLETED_WITH_ERRORS` and `REMOVED` among the terminal statuses and spell `TIMED_OUT`. See `lifecycle.md` section 7.

**How do I continue after a failing task?**
Set `optional: true` and test `${<ref>.status}` in a `SWITCH` with a `COMPLETED_WITH_ERRORS` case. Prefer the braced form (the unbraced form also appears in the documentation, but its evaluation is not described). See `wiring.md` section 6.

**My import "did nothing". Why?**
Empty elements are ignored (not deletions), an invalid number (or an unknown suffix) is not imported, a line whose identifiers match two different items fails on the uniqueness constraint, and the mode (`UPDATE_ONLY`, `CREATE_ONLY`) may exclude the item. The task completes anyway: read the report. See `data-import-rules.md` section 2 and `pitfalls.md` section 1.

**Why did a schema import wipe my screen columns?**
A screen present in the import replaces all its sections and columns, even in `INCREMENTAL` mode. Always import complete screens. See `data-import-rules.md` section 1.4.

**Which date and number formats are accepted?**
ISO 8601 dates (`2026-04-22`, `2026-04-22T10:00:00.000Z`) and numbers with a dot decimal separator, no thousands separator, unit in the `suffix` attribute. See `data-formats.md`.

**The task completed but some files failed. How do I detect it?**
Most file tasks complete even on partial failure: test `allFilesTransformed`, `allFilesGenerated`, `allFilesValid`, `allEmailsSent`, `noFile` with a `SWITCH`. See `wiring.md` section 4.

## Performance and limits

**How many tasks can a job have?**
No hard limit is documented; keep jobs at 20 tasks or fewer (convention of these skills) and chain jobs for longer flows. Other key numbers: 256 KB per local variable, 200 000 items per export, 500 KB per imported item, 1000 elements for inline data task outputs. See `limits.md`.

**How long can a task run?**
The job budget is `timeoutSeconds` (0 = none). Three task pages also document a duration of their own: 10 minutes for `code-execute-javascript`, 600 seconds per `ai-prompt-execute` task, 2 hours per batch and per slot for `task-batch-execute`; the job chaining tasks have a configurable wait budget (default 3600 seconds, maximum 86400). The other tasks publish no duration but can still end in `TIMED_OUT`, so split long work. See `limits.md` section 4.

**How do I make imports faster?**
Differential imports only (never empty values), `INCREMENTAL` schema imports, `file-hash` / `file-key` on images, fewer formulas and conditional formatting, off-peak schedules, `outputMode: ATTACHMENT` for large data task results. See `limits.md` section 6 and `data-import-rules.md`.

## AI tasks

**How do AI jobs work?**
`ai-prompt-execute` (alpha) calls a language model provider with your own API key stored in a protected variable, usually inside a `task-batch-execute` for parallelism, and the job writes suggestions (`data-suggestion-create`) that people review: AI suggests, your team decides. See the task page and `limits.md` section 1 for sizing.

**How do I size an AI batch?**
Each AI task has a 600-second budget and each batch slot 2 hours; a batch holds roughly `7200 / average call duration` items per slot with 5 slots at most, minus a margin for orchestration overhead and retries. Measure a small run first, group several fields per prompt and run at night on a dedicated pipeline (scalability tutorial). See `limits.md`.

## Tooling

**Which scripting languages can I use?**
JavaScript in `code-execute-javascript` (sandboxed, `$.data`, `$.resources`, `log()`, `return`, no network, no modules, 10 minutes per task), short JavaScript expressions in `SWITCH` and loop conditions (ES5 syntax by convention of these skills), jq (a subset without date functions) in `json-transform-jq`, XSLT 1.0 to 3.0 with XPath 3.1 in `file-transformation-xslt`, XSD 1.0 or 1.1 in `file-validation-xsd`. See `scripting.md`.

**How do I test an XSLT or a script locally?**
With the VS Code extension: `Run XSLT/XSD` (`Ctrl+Enter`) and the Problems panel; or with the static script lint of the job builder skill (`lint-script.js`). See `lifecycle.md` section 1.

**How do I validate a job before importing it?**
Open the folder in VS Code with the extension (schema validation, reference checks, asset existence) or run the offline validator shipped with the job builder skill; then package and upload. The platform resolves every `file://assets/...` reference at upload and rejects the package when a referenced file is missing; which other checks it runs (duplicate input keys, unknown variables) is not documented. See `lifecycle.md` section 12.

**What vocabulary should I know?**
Tables, partitions, levels, items, identifiers, fields, options, classifications, categories, matrix, sections, screens, partners, publications, suggestions, pipelines, projects, executions, reports, variables. See `glossary.md`.
