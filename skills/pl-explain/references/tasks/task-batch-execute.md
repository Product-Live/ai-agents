# task-batch-execute

> Reference token: DF-TASK-TASK-BATCH-EXECUTE-01

Status: alpha (a recent task, available on every account) | Category: task | Documentation: https://learn.product-live.com/data-factory/references/tasks/task-batch-execute/

## Purpose

"This task executes a list of Data Factory tasks as a single batch: each entry of the list is one execution of a Data Factory task (any task that is not on the excluded tasks list) with its own input parameters. The entries are distributed over 1 to 5 parallel slots (concurrency) and run sequentially inside each slot; the per-entry results are aggregated into a single results list, always returned in input order".
It is the parallelism primitive of Data Factory: parallel work always goes through this catalog task.

## When to use

- N independent executions of the same task (or different tasks) from one step: N HTTP calls, N scripts, N spreadsheet generations, N item lookups.
- Any time a `loop` would only exist to repeat independent work.

## When not to use

- When each iteration depends on the previous one (`loop`).
- For `table-import-schema` and `table-refresh-items` (excluded; "an excluded name fails the batch immediately").

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| request | OBJECT | yes | | | "The tasks list to execute." |
| request.method | ENUM | yes | | INLINE, ATTACHMENT | "INLINE: the tasks list is provided inline in request.json. ATTACHMENT: the tasks list is loaded from request.file." |
| request.contentType | ENUM | yes | | application/json, application/xml | "application/xml is only meaningful with method: ATTACHMENT" |
| request.json | OBJECT | if INLINE | | | The wrapper `{ "tasks": [...] }`; may be a whole object produced by a previous task |
| request.json.tasks[] | ARRAY | if INLINE | | | "One entry per task execution. An empty array is valid" |
| request.json.tasks[].key | STRING | no | task_<n> | | "A caller-chosen identifier echoed in the matching result entry. Recommended" |
| request.json.tasks[].taskName | STRING | no | top-level taskName | | "The Data Factory task to execute for this entry. Overrides the top-level taskName." |
| request.json.tasks[].inputs | OBJECT | no | {} | | "The input parameters passed to the executed task, exactly as you would set them in the task's own inputParameters." |
| request.file | FILE | if ATTACHMENT | | | A JSON or XML tasks file |
| taskName | STRING | no | | | "The default Data Factory task to execute, used for every entry that does not set its own taskName." Every entry must end up with a task name |
| concurrency | NUMBER | no | 1 | 1-5 | "The number of parallel slots the entries are distributed over (round-robin). Inside a slot, entries run sequentially." Clamped to the number of entries |
| outputs | ARRAY | no | [{"outputKey": "json", "outputMode": "INLINE", "mediaType": "application/json"}] | | Each entry is exposed as `result.<outputKey>` |
| outputs[].outputKey | STRING | yes | | | Non-empty, unique |
| outputs[].outputMode | ENUM | yes | | INLINE, ATTACHMENT | INLINE only with `application/json` |
| outputs[].mediaType | ENUM | yes | | application/json, application/xml | ATTACHMENT + xml gives an XML file |
| logLevel | ENUM | no | warning | error, warning, info, debug | Job logs of the batch (start, one progress line per entry, completion summary, top 10 slowest); propagated to every executed task unless the entry sets its own |

No `skipReportGeneration` input and no `report` output.

Tasks file (ATTACHMENT, JSON): `{"tasks": [{"key": "get-product-1", "taskName": "protocol-http-perform", "inputs": {"domain": "api.example.com", "path": "/v1/products/1", "method": "GET", "responses": ["JSON"]}}]}`. The XML form uses the generic `map` / `array` / `string` / `number` / `boolean` elements (XPath functions namespace `http://www.w3.org/2005/xpath-functions`), each with a `key` attribute.

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${run_batch.output.result.json} | ARRAY | Default inline output: one entry per task, in input order: `{ "key", "index", "status", "success", "output", "error" }`. `status` is the terminal status of the executed task (`COMPLETED`, `COMPLETED_WITH_ERRORS`, ...); `output` is the full output of the executed task (for example `output.result` of `code-execute-javascript`, `output.statusCode` of `protocol-http-perform`) |
| ${run_batch.output.result.<outputKey>} | FILE | For ATTACHMENT outputs: a JSON file `{ "results": [...] }` or the same results as XML |
| ${run_batch.output.summary} | OBJECT | `total`, `successCount`, `errorCount`, `taskName`, `durationMs` |

## Example

```json
{
  "name": "task-batch-execute",
  "taskReferenceName": "run_batch",
  "description": "Call the partner API once per product, four calls at a time",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "taskName": "protocol-http-perform",
    "concurrency": 4,
    "request": {
      "method": "INLINE",
      "contentType": "application/json",
      "json": {
        "tasks": [
          { "key": "get-product-1", "inputs": { "domain": "api.example.com", "path": "/v1/products/1", "method": "GET", "responses": ["JSON"] } },
          { "key": "get-product-2", "inputs": { "domain": "api.example.com", "path": "/v1/products/2", "method": "GET", "responses": ["JSON"] } }
        ]
      }
    },
    "outputs": [
      { "outputKey": "json", "outputMode": "INLINE", "mediaType": "application/json" }
    ]
  }
}
```

Dynamic list: a `code-execute-javascript` builder returns the whole `{ "tasks": [...] }` wrapper and the batch takes `"json": "${build_tasks.output.result}"`.

## Gotchas and limits

- Alpha: a recent task, available on every account.
- "A failed entry does not stop the batch: the remaining entries still run, the batch itself ends COMPLETED, the failed entry is reported with success: false ... and summary.errorCount is incremented." Check `${run_batch.output.summary.errorCount}` with a `SWITCH` + `TERMINATE` when any failure must fail the job.
- For `protocol-http-perform` entries, a 4xx/5xx "is still a successful task execution and counts as a success"; add `assertions` with `failOnError: true` in the entry `inputs` to count it as a failure.
- Timeout: "The whole batch execution - and each parallel slot - is subject to a 7200 seconds (2 hours) timeout." Size batches so that `total / concurrency` sequential executions fit; split very large lists. Rate limits of the executed task still apply per entry.
- `file://assets/...` references are resolved when the job is created, not at run time: a reference built by a script is never resolved and the batch refuses to run. Recipe: declare the asset in the builder task's `data` (it is replaced by the file), copy it into each entry, return the wrapper. Never write `{ "url": "file://assets/..." }`.
- "Do not put a ${...} placeholder under a key named tasks" (nor `loopOver`, `decisionCases`, `defaultCase`): job creation fails with an opaque error. Write `"json": "${build_tasks.output.result}"`, never `"json": { "tasks": "${...}" }`.
- Array access such as `${run_batch.output.result.json[0].output.response.json}` is not shown in the documentation; prefer a `json-transform-jq` or `code-execute-javascript` step over `${run_batch.output.result.json}`.
- `concurrency` above 5 is rejected; nesting a batch inside a batch is allowed with the same constraints. An empty list completes immediately with a zeroed summary.

## Related tasks

- `code-execute-javascript` (frequent batch target; builds the tasks list), `json-transform-jq` (build `tasks[]` from a previous output)
- `protocol-http-perform` (with assertions), `file-generation-xlsx`, `data-item-find`
- `loop` (sequential, dependent iterations), `data-job-execution-create` (start other jobs instead of tasks)
