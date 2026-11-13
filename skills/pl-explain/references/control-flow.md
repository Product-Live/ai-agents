# Control flow

> Reference token: DF-CONTROL-FLOW-01

Flow control in a job is done with a small set of task types: `SWITCH` (conditions), `DO_WHILE` (sequential loop), `TERMINATE` (explicit end), `SET_VARIABLE` (local state), `WAIT` (pause) and the deprecated `DECISION`.
Parallel fan-out is not a task type but a catalog task, `task-batch-execute`.
This file gives the exact JSON shape of each construct, their expression syntax, scoping rules and worked examples.

## 1. SWITCH

A `SWITCH` evaluates an expression and runs the list of tasks found under the matching key of `decisionCases`, or `defaultCase` when nothing matches.

| Property | Type | Required | Description |
| -- | -- | -- | -- |
| `inputParameters` | object | required | The values the expression can read. |
| `evaluatorType` | enum `value-param`, `javascript` | not required (default `javascript`) | `value-param`: use a parameter directly as the value. `javascript`: evaluate a JavaScript expression and use its result. |
| `expression` | string | required | With `value-param`: the name of a key of `inputParameters`. With `javascript`: the expression to evaluate, where inputs are read as `$.<key>`. |
| `decisionCases` | object | required | Keys are the possible values (always strings), values are lists of tasks. An empty list `[]` means "do nothing". |
| `defaultCase` | array | required | Tasks executed when no key matches. Documented as required; some official examples omit it. Always write it, at least `[]`. |

Outputs: `evaluationResult` (a single-element array holding the evaluated value) and `selectedCase` (the same value as a plain string).

### 1.1 `value-param` on an ENUM output

```json
{
  "name": "switch",
  "taskReferenceName": "check_files_generated",
  "description": "Branch on the archive generation result",
  "optional": false,
  "type": "SWITCH",
  "inputParameters": {
    "switchCaseValue": "${file_generation_archive.output.allFilesGenerated}"
  },
  "evaluatorType": "value-param",
  "expression": "switchCaseValue",
  "decisionCases": {
    "YES": [],
    "NO": [
      {
        "name": "notification-display-message",
        "taskReferenceName": "display_message_no",
        "description": "Explain that some archives failed",
        "optional": false,
        "type": "SUB_WORKFLOW",
        "inputParameters": {
          "request": "file://assets/all_files_generated_no.html",
          "height": 300
        }
      }
    ]
  },
  "defaultCase": []
}
```

### 1.2 `javascript` evaluator

```json
{
  "name": "switch",
  "taskReferenceName": "check_items_exist",
  "description": "Stop early if no item is selected",
  "optional": false,
  "type": "SWITCH",
  "evaluatorType": "javascript",
  "expression": "$.itemCount == 0 ? 'EMPTY' : 'OK'",
  "inputParameters": {
    "itemCount": "${extract_field_keys.output.result.itemCount}"
  },
  "decisionCases": {
    "EMPTY": [
      {
        "name": "terminate",
        "taskReferenceName": "terminate_no_items",
        "description": "No item is selected",
        "optional": false,
        "type": "TERMINATE",
        "inputParameters": {
          "terminationStatus": "COMPLETED",
          "outputParameters": {
            "message": "No item is selected. Select the items to check in the grid, then launch this job again."
          }
        }
      }
    ]
  },
  "defaultCase": []
}
```

Expression rules for the `javascript` evaluator:

- The root object is `$`; each key of `inputParameters` is `$.<key>`. The evaluated value is the key looked up in `decisionCases` (the `selectedCase` output is that value "as a plain string"). How a non-string result (a boolean such as `$.n > 1`) is turned into a case key is not documented, so return explicit string keys with a ternary, as the documented example does, and always provide a `defaultCase`.
- Use ES5 syntax only: no `let`, `const`, arrow functions, template literals or optional chaining. This is a conservative recommendation of these skills, not a documented rule: the documentation calls the switch and loop expressions JavaScript expressions and states no language version, so ES5 is the safe common subset. No `return` at top level: every documented expression is a bare expression or an `if` statement, never a function body. No `log()`, no `$.data` (that is the script task convention).
- Keep it short (repository recommendation; no duration is documented): a comparison or a ternary. Heavy logic belongs in a `code-execute-javascript` task whose result the switch reads.
- Documented expression (switch reference page): `"$.inputValue.length > 1 ? 'success' : 'failure'"`. Repository examples in the same style (not from the documentation): `"$.isValid == true ? 'OK' : 'INVALID'"`, `"$.count > 0 ? 'OK' : 'NOT_FOUND'"`, `"$.status === 'ready' ? 'CONTINUE' : 'STOP'"`.

### 1.3 Semantics and design rules

- `decisionCases` keys are strings compared with the evaluated value: `"YES"`, `"NO"`, `"COMPLETED_WITH_ERRORS"`, `"APP"`, `"PERIODIC"`, or the strings a javascript expression returns (`"success"`, `"failure"` in the documented example).
- Only the matching branch runs. After the switch, the job continues with the next top-level task.
- "Details regarding the tasks executed inside the SWITCH task are not visible in job execution details. We recommend the use of the outputParameters to display necessary information regarding what happened inside the SWITCH task." What a reference to a task of a branch that did not run resolves to is not documented: never rely on it.
- Reference names inside branches must be unique job-wide (`display_message_yes`, `display_message_no`, `display_message_default`).
- Guard pattern (used by the published AI jobs): a `SWITCH` whose matching case contains a `TERMINATE` and whose other branches are empty, so the main flow stays readable at the top level. "Only use the Decision as a test for the cases that you want to detect." "Do not over engineer your Jobs."
- Branching on an optional task's status: `"status": "${protocol_http_perform.status}"` with a `COMPLETED_WITH_ERRORS` case (see `wiring.md`). Branching on the launch origin: `"case_value_param": "${workflow.input.context.jobActionOrigin}"` with `APP` and `PERIODIC` cases (see `job-context.md`).

## 2. DO_WHILE (the `loop` task, alpha)

"The loop is a DO_WHILE loop that executes a set of tasks until a condition is met." The body runs first, then the condition is evaluated; iterations are sequential and `iteration` is 1-based.

| Property | Type | Required | Description |
| -- | -- | -- | -- |
| `type` | string | required | Must be `DO_WHILE`. |
| `inputParameters` | object | required | Inputs of the loop, typically `elements` (an array). Global variables are not supported here. |
| `loopCondition` | string | required | A JavaScript expression evaluated after each iteration; must yield a boolean (`true` continues). Write ES5 syntax (conservative recommendation: the documentation states no language version). |
| `loopOver` | array | required | The tasks executed inside the loop (a literal array). |

Outputs: `iteration` (the current iteration number) and, after the loop, one entry per iteration keyed by its number containing the outputs of each inner task: `{ "1": { "get_current_element": { "result": ... } }, "2": { ... }, "iteration": 3 }`.

### 2.1 Loop idiom

```json
{
  "name": "loop",
  "taskReferenceName": "export_loop",
  "description": "Loop over each table and export its schema",
  "optional": false,
  "type": "DO_WHILE",
  "inputParameters": {
    "elements": "${find_tables.output.result.json}"
  },
  "loopCondition": "if ($.export_loop['iteration'] >= $.elements.length) { false; } else { true; }",
  "loopOver": [
    {
      "name": "json-transform-jq",
      "taskReferenceName": "get_current_table",
      "description": "Get the current table from the list",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "data": {
          "elements": "${export_loop.input.elements}",
          "iteration": "${export_loop.output.iteration}"
        },
        "queryExpression": ".data.elements[.data.iteration - 1]"
      }
    },
    {
      "name": "table-export-schema",
      "taskReferenceName": "export_schema",
      "description": "Export the schema of the current table",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "tableKey": "${get_current_table.output.result.key}",
        "mode": "ALL",
        "fileName": "schema-${get_current_table.output.result.key}.xml"
      }
    }
  ]
}
```

How it works:

- `loopCondition` reads the loop's own inputs as `$.<key>` and its own output as `$.<loopRef>['iteration']` (the form of the documentation); read nothing else from `$`. The condition must return a real boolean (`true` runs another iteration): the documentation describes no other result type, so always end with an explicit `true` or `false`. The documented statement form above relies on the value of the last statement; the expression form `$.export_loop['iteration'] < $.elements.length` is not shown in the documentation.
- Inside the loop, the loop's inputs and outputs are read with `${<loopRef>.input.<key>}` and `${<loopRef>.output.iteration}`. The current element is extracted with a `json-transform-jq` task: `.data.elements[.data.iteration - 1]` (1-based iteration, 0-based array).
- A page loop uses a counter instead of a list: `"loopCondition": "if ($.loop_task['iteration'] < $.numberOfPage) { true; } else { false; }"` with `"numberOfPage": "${parse_structure.output.result.numberOfPage}"`.

### 2.2 Harvesting results after the loop

```json
{
  "name": "json-transform-jq",
  "taskReferenceName": "collect_schema_files",
  "description": "Collect the file produced by each iteration",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "data": {
      "loopOutput": "${export_loop.output}"
    },
    "queryExpression": "[.data.loopOutput | to_entries[] | select(.key | test(\"^[0-9]+$\")) | .value.export_schema.file]"
  }
}
```

### 2.3 Rules

- No global variables (`${workflow.globalVariables.*}`) in the loop's `inputParameters`; pass them through a previous task's output instead.
- Avoid nesting a loop inside another loop (repository recommendation: nested loops are not documented, so their behaviour is not guaranteed); use a batch or a triggered job for the inner level.
- State across iterations goes through `SET_VARIABLE` (write in the body, read with `${workflow.variables.x}`): the loop itself exposes only its inputs and `iteration`.
- Prefer `task-batch-execute` when iterations are independent: "instead of hand-writing a loop with per-iteration wiring". Use the loop "when each iteration depends on the previous one".

## 3. TERMINATE

"Force a job to terminate in Success or Error." No outputs.

| Property | Type | Required | Description |
| -- | -- | -- | -- |
| `terminationStatus` | enum `COMPLETED`, `FAILED` | required | `COMPLETED`: the job ends in success. `FAILED`: the job ends in error. |
| `outputParameters` | object | not required | The outputs displayed to the user. They replace the job-level `outputParameters`. |

```json
{
  "name": "terminate",
  "taskReferenceName": "terminate_invalid_inputs",
  "description": "Force the job to terminate in error",
  "optional": false,
  "type": "TERMINATE",
  "inputParameters": {
    "terminationStatus": "FAILED",
    "outputParameters": {
      "error_message": "${display_error.output.message}"
    }
  }
}
```

Facts: "What happen if I don't put the Terminate task? The Job will continue." "When you terminate a Job you must explicitly define which outputParameters must be displayed." Use `COMPLETED` for a graceful early exit (nothing to do, empty selection) and `FAILED` for a configuration or context error. The only valid statuses are `COMPLETED` and `FAILED`.

## 4. SET_VARIABLE (alpha)

Creates or updates local variables scoped to the current job execution. `inputParameters` is a map of variable name to value; values can be strings, numbers, booleans, arrays or objects. No output.

```json
{
  "name": "set-variable",
  "taskReferenceName": "initialize_run",
  "description": "Keep the plan for the loop and the final report",
  "optional": false,
  "type": "SET_VARIABLE",
  "inputParameters": {
    "configuration": {
      "domain": "api.example.com",
      "maxAttempt": 3,
      "allowRedirect": true,
      "defaultHeaders": {
        "Content-Type": "application/json"
      }
    },
    "runPlan": "${plan_enrichment.output.result}"
  }
}
```

Read later with `${workflow.variables.configuration.domain}` or `${workflow.variables.runPlan.targets}`. A missing local variable resolves to `null`. Each local variable is limited to 256 KB. Global variables cannot be used as inputs of this task. There are no "global variables" created at runtime: local variables live only in the current execution; account-level variables are created in Settings (see `variables-and-secrets.md`).

Typical use: both branches of a `SWITCH` set the same variable so the next top-level task can read it unconditionally; carry a plan into a loop and the results out of it.

## 5. WAIT (alpha)

Pauses the job. Provide exactly one of `duration` or `until`.

```json
{
  "name": "wait",
  "taskReferenceName": "wait_before_poll",
  "description": "Wait two hours before polling the partner API",
  "optional": false,
  "type": "WAIT",
  "inputParameters": {
    "duration": "2 hours"
  }
}
```

| Input | Description |
| -- | -- |
| `duration` | Wait for a specific duration. Examples: `2 days 3 hours`, `1 hour 30 minutes`, `1 day 2 hours 30 minutes 10 seconds`, `2h30m`. Units in order days > hours > minutes > seconds; accepted spellings `days/day/d`, `hours/hour/hrs/hr/h`, `minutes/minute/mins/min/m`, `seconds/second/secs/sec/s`; case-insensitive; out-of-order units are invalid. |
| `until` | Wait until a specific date: `yyyy-MM-dd HH:mm`, `yyyy-MM-dd HH:mm z` (for example `2025-12-25 09:00 CEST`) or `yyyy-MM-dd`. A date already in the past does not wait. |

Setting both makes the task end in error. Setting neither makes the task wait indefinitely until the job is cancelled or hits its own `timeoutSeconds`. No output; global variables are not supported as inputs. Remember that a waiting job occupies its pipeline.

## 6. DECISION (deprecated)

"This Data Factory task is deprecated in favor of Switch, which supports both value and JavaScript expression evaluators." Keep it only when editing an existing job that already uses it.

```json
{
  "name": "decision",
  "taskReferenceName": "decision",
  "description": "Handle the case where no file has been recovered from the FTP",
  "optional": false,
  "type": "DECISION",
  "inputParameters": {
    "noFile": "${ftp_get.output.noFile}"
  },
  "caseValueParam": "noFile",
  "decisionCases": {
    "YES": [],
    "NO": []
  },
  "defaultCase": []
}
```

Migration to `SWITCH`: keep `inputParameters` and `decisionCases`, replace `"type": "DECISION"` by `"type": "SWITCH"`, replace `caseValueParam` by `"evaluatorType": "value-param"` plus `"expression": "<the same key>"`, add `"defaultCase": []`. Output of a decision: `caseOutput` (array of one string). Limit: 10 conditions.

## 7. Parallelism: `task-batch-execute` (alpha)

A catalog task (`"type": "SUB_WORKFLOW"`) that runs a list of task executions as one batch, distributed over 1 to 5 parallel slots (`concurrency`), sequentially inside each slot, with results always returned in input order.

```json
{
  "name": "task-batch-execute",
  "taskReferenceName": "run_http_batch",
  "description": "Perform independent HTTP calls, 4 at a time",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "taskName": "protocol-http-perform",
    "concurrency": 4,
    "request": {
      "method": "INLINE",
      "contentType": "application/json",
      "json": {
        "tasks": [
          {
            "key": "get-product-1",
            "inputs": {
              "domain": "api.example.com",
              "path": "/v1/products/1",
              "method": "GET",
              "responses": ["JSON"]
            }
          },
          {
            "key": "get-product-2",
            "taskName": "protocol-http-perform",
            "inputs": {
              "domain": "api.example.com",
              "path": "/v1/products/2",
              "method": "GET",
              "responses": ["JSON"]
            }
          }
        ]
      }
    },
    "outputs": [
      { "outputKey": "json", "outputMode": "INLINE", "mediaType": "application/json" }
    ]
  }
}
```

- `request.json.tasks[]`: entries `{ "key", "taskName", "inputs" }`; `taskName` defaults to the top-level `taskName`; `inputs` are "exactly as you would set them in the task's own inputParameters" (default `{}`); default keys are `task_<n>`. The list can also come from a file (`"method": "ATTACHMENT"`, `"file": "${build_tasks_file.output.result}"`) or from a script result (`"json": "${build_tasks.output.result}"` where the script returns `{ "tasks": [...] }`).
- Results: `result.<outputKey>` is an array (INLINE) or a file (ATTACHMENT) of `{ "key", "index", "status", "success", "output", "error" }` entries, read as `${run_http_batch.output.result.json[0].output.response.json}`; `summary` holds `{ total, successCount, errorCount, taskName, durationMs }`.
- "A failed entry does not stop the batch": the batch ends `COMPLETED`; check `summary.errorCount` with a `SWITCH` and `TERMINATE` when any failure must fail the job.
- Limits: `concurrency` 1 to 5 (clamped to the number of entries); 7200 seconds per batch and per slot; `table-import-schema` and `table-refresh-items` cannot run in a batch; `file://assets/...` is only resolved when written literally in `job.json`; `logLevel` defaults to `warning`.

## 8. Reference scoping rules

- `taskReferenceName` values are unique across the whole job, including nested branches and loop bodies.
- A task can reference any task placed before it in execution order. A reference into a branch of a previous `SWITCH` that did not run has no documented value: let every branch write the same `SET_VARIABLE` instead.
- Inside a loop body, references to the loop itself use `${<loopRef>.input.<key>}` and `${<loopRef>.output.iteration}`; references to body tasks of the current iteration use the normal `${<ref>.output.<name>}` form.
- Outside the loop, only the aggregated `${<loopRef>.output}` is meaningful.
- Local variables (`${workflow.variables.x}`) are readable anywhere after the `SET_VARIABLE` task that created them, including in later branches and iterations.

## 9. Worked example: FTP ingestion with a no-file branch

```json
{
  "schema": "1.0",
  "key": "import-products-from-sftp",
  "title": "Import products from sFTP",
  "icon": "file-add",
  "tasks": [
    {
      "name": "protocol-ftp-get",
      "taskReferenceName": "ftp_get",
      "description": "Get the latest products file",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "connection": "SFTP",
        "host": "${workflow.globalVariables.main_ftp_host}",
        "username": "${workflow.globalVariables.main_ftp_login}",
        "password": "${workflow.globalVariables.main_ftp_password}",
        "port": "${workflow.globalVariables.main_ftp_port}",
        "mode": "PARAMETERS",
        "remoteFolder": "/products",
        "sort": "LAST_MODIFIED_DESC",
        "filter": "-products\\.csv$",
        "maxFiles": 1
      }
    },
    {
      "name": "switch",
      "taskReferenceName": "check_no_file",
      "description": "Stop gracefully when there is no file",
      "optional": false,
      "type": "SWITCH",
      "inputParameters": {
        "noFile": "${ftp_get.output.noFile}"
      },
      "evaluatorType": "value-param",
      "expression": "noFile",
      "decisionCases": {
        "YES": [
          {
            "name": "terminate",
            "taskReferenceName": "terminate_no_file",
            "description": "Nothing to import",
            "optional": false,
            "type": "TERMINATE",
            "inputParameters": {
              "terminationStatus": "COMPLETED",
              "outputParameters": {
                "message": "No new file on the sFTP server."
              }
            }
          }
        ]
      },
      "defaultCase": []
    },
    {
      "name": "file-conversion-csv-to-xml",
      "taskReferenceName": "csv_to_xml",
      "description": "Convert the CSV to XML",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "mode": "FILE",
        "file": "${ftp_get.output.file}",
        "columnSeparator": ";",
        "textDelimiter": "\"",
        "escapeCharacter": "\""
      }
    },
    {
      "name": "file-transformation-xslt",
      "taskReferenceName": "build_items",
      "description": "Build the items import document",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "mode": "FILE",
        "file": "${csv_to_xml.output.file}",
        "xslt": "file://assets/csv-to-items.xslt",
        "fileName": "items.xml"
      }
    },
    {
      "name": "table-import-items",
      "taskReferenceName": "import_items",
      "description": "Import the items",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "request": "${build_items.output.file}",
        "mode": "CREATE_OR_UPDATE"
      }
    }
  ],
  "outputParameters": {
    "report": "${import_items.output.report}"
  }
}
```

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| `"name": "switch", "type": "SUB_WORKFLOW"` | `"type": "SWITCH"` |
| `"evaluatorType": "value"` or any value other than `value-param` / `javascript` | one of the two documented evaluators |
| `value-param` with `expression` set to a reference (`"${x.output.flag}"`) | `expression` names a key of `inputParameters` that holds the reference |
| `decisionCases` keys as booleans or numbers (`true: [...]`) | string keys that the expression returns explicitly (`"OK"`, `"NOT_FOUND"`); JSON keys are strings anyway |
| Missing `defaultCase` | always `"defaultCase": []` |
| `let`, `const`, arrow functions or template literals in `expression` or `loopCondition` | ES5 syntax |
| `return $.x > 1 ? 'A' : 'B'` in a switch expression | `$.x > 1 ? 'A' : 'B'` (no `return`) |
| `"loopOver": "${build.output.tasks}"` | a literal array of tasks |
| `"terminationStatus": "TERMINATED"` or `"SUCCESS"` | `COMPLETED` or `FAILED` |
| Nested `DO_WHILE` loops | a batch or a triggered job for the inner level |
| `"duration": "3 hours 2 days"` | units in order: `2 days 3 hours` |
| Reading the loop element with `${loop.output.element}` | a `json-transform-jq` task with `.data.elements[.data.iteration - 1]` |
| New job written with `DECISION` | `SWITCH` with `evaluatorType: "value-param"` |
