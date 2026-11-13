# Job context

> Reference token: DF-JOB-CONTEXT-01

When a job is launched, Data Factory attaches a `context` object to the execution input. It describes who launched the job, from where, when, and on which items.
It is available in any task through `${workflow.input.context}` and its sub-properties.
This file documents its properties per launch origin, the user selection semantics and the rules for periodic and API-triggered jobs.

## 1. Reading the context

```json
{
  "name": "json-transform-jq",
  "taskReferenceName": "read_context",
  "description": "Read the launch origin and date",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "data": {
      "origin": "${workflow.input.context.jobActionOrigin}",
      "triggerAt": "${workflow.input.context.triggerAt}"
    },
    "queryExpression": ".data"
  }
}
```

The whole object can also be passed at once: `"context": "${workflow.input.context}"` in the `data` of a script.

## 2. Properties

| Property | Type | Description |
| -- | -- | -- |
| `jobAccountId` | string | ID of the account that owns the job. |
| `jobId` | string | ID of the launched job. |
| `jobInstanceId` | string | ID of the current job execution. |
| `jobActionOrigin` | enum | How the job was launched: `APP` (app.product-live.com), `SETTINGS` (settings.product-live.com), `API` (Data Factory API), `PERIODIC` (periodicity rule). |
| `triggerAt` | date | Date and time the job was launched, ISO 8601 in UTC (`2026-01-01T00:00:00.000Z`). |
| `userAccountId` | string | ID of the account of the user who launched the job (so it can differ from `jobAccountId`, for example when a partner runs a shared job). |
| `userId` | string | ID of the user who launched the job. |
| `view` | object | State of the screen when the job was launched: `view.context`, `view.table`, `view.partition`, `view.screen`, each `{ "id", "key" }`. Only present for `APP` and `SETTINGS`; absent for `API` and `PERIODIC`. `view.screen` identifies the screen definition only: users can hide, pin and reorder columns and save private screen settings (user guide, "Custom screens"), and neither the documented context properties nor the schema export grammar carry them, so a job has no documented way to reproduce the exact columns a user sees. |
| `queryMode` | enum `API_V1`, `LEGACY` | Format of the item selection. Absent when no item is selected and no filter is applied. |
| `query` | object | The selected or filtered items, in the Find request format. Only present when `queryMode` is `API_V1`. "You can pass it as is to a find task or endpoint to retrieve the same items." |
| `selection` | object | Deprecated legacy selection format. Known sub-properties used by published jobs: `selection.ids` (array of item ids), plus table / partition / screen ids and keys. Prefer `view` and `query`. |

### 2.1 Launched from the app with a selection

```json
{
  "context": {
    "jobAccountId": "123",
    "jobId": "000000000000000000000001",
    "jobInstanceId": "000000000000000000000002",
    "jobActionOrigin": "APP",
    "triggerAt": "2026-01-01T00:00:00.000Z",
    "userAccountId": "123",
    "userId": "456",
    "view": {
      "context": { "id": "123", "key": "00000000-0000-0000-0000-000000000001" },
      "table": { "id": "101", "key": "PRODUCTS" },
      "partition": { "id": "102", "key": "ACTIVES" },
      "screen": { "id": "103", "key": "ALL_COLUMNS" }
    },
    "queryMode": "API_V1",
    "query": {
      "type": "in",
      "caseSensitive": true,
      "field": "id",
      "value": ["789"]
    }
  }
}
```

### 2.2 Launched by the scheduler

```json
{
  "context": {
    "jobAccountId": "123",
    "jobId": "000000000000000000000001",
    "jobInstanceId": "000000000000000000000003",
    "jobActionOrigin": "PERIODIC",
    "triggerAt": "2026-01-01T00:00:00.000Z",
    "userAccountId": "123",
    "userId": "456"
  }
}
```

No `view`, no `query`, no `selection`.

## 3. `query` and `queryMode`

| User action in the grid | `queryMode` | `query` |
| -- | -- | -- |
| No item selected, no filter | absent | absent |
| Some items selected | `API_V1` | `{ "type": "in", "field": "id", "value": ["id1", "id2"] }` |
| All filtered items, no filter applied | `API_V1` | `{ "type": "true" }` |
| All filtered items, with filters | `API_V1` | one query per filter, combined with `{ "type": "and", "queries": [...] }` |
| A filter that cannot be expressed in the Find format (for example "items with new suggestions") | `LEGACY` | absent |

Grid filter conversion: "Contains v" becomes `{ "type": "search", "value": "%v%" }`; "Equals" becomes `in`; "Starts with" becomes `search` with `v%`; "Ends with" becomes `search` with `%v`; "Option is one of" becomes `in`; "Option is not one of" becomes `{ "type": "or", "queries": [{ "type": "isNull" }, { "type": "notIn", "value": [...] }] }`; number minimum / maximum become `greaterOrEqual` / `lowerOrEqual`; "Is empty" becomes `isNull`. Fields are referenced with `{ "key": "<FIELD_KEY>", "target": "item.fields" }`.

"When queryMode = LEGACY, query is not provided. Rely on the legacy selection property, or let the tasks that support the USER_SELECTION mode (for example table-export-items) handle the selection for you."

## 4. USER_SELECTION semantics

Two catalog tasks read the grid selection without touching the context:

- `table-export-items` with `"mode": "USER_SELECTION"`: "can only be used when the job is launched from the app.product-live.com application. A selection from the grid must be made by the user."
- `data-item-find` with `"findMode": "USER_SELECTION"`: "The request is built by the task from what the user selected in the grid."

Rules:

- Prefer these modes over reading `context.selection.ids` or `context.query` by hand: they handle every selection format.
- A job that consumes the selection must be made visible only on the relevant tables (visibility "Visible for selected tables") and its README must say that rows must be selected before launching.
- With `data-item-find`, the selection is read on the level of the screen the job was launched from ("a screen belongs to exactly one level"); the `table-export-items` page only says that the items selected by the user are exported.
- Jobs that do not consume the selection must not depend on `context.selection` being present.

The AI generic jobs read `context.view.table.id` and `context.view.screen.id` instead of asking for a table key: "the table and the screen come from where the job is launched, and the items come from the grid selection". They fail explicitly (switch and terminate) when launched outside a table.

## 5. Adapting a job to its origin

```json
{
  "name": "switch",
  "taskReferenceName": "by_origin",
  "description": "Branch on the launch origin",
  "optional": false,
  "type": "SWITCH",
  "inputParameters": {
    "case_value_param": "${workflow.input.context.jobActionOrigin}"
  },
  "evaluatorType": "value-param",
  "expression": "case_value_param",
  "decisionCases": {
    "APP": [],
    "PERIODIC": []
  },
  "defaultCase": []
}
```

Recording the launch date in an XSLT: `"params": [{ "name": "triggerAt", "select": "${workflow.input.context.triggerAt}" }]`.

Getting the current account id in a jq task: `"accountId": "${workflow.input.context.userAccountId}"`. The `context-account-get` and `context-user-get` tasks (alpha) return the full current account and user objects.

## 6. Periodic jobs and the context

A periodic execution has `jobActionOrigin: "PERIODIC"`, no `view`, no `query` and no selection. Therefore:

- A periodic job must not rely on `USER_SELECTION`, `FIELD` or `SCREEN` inputs, or `context.view`. "Periodicity must be set for Jobs like daily getting files within a sFTP server or daily export all items to an API with the mode: ALL."
- Use `mode: "ALL"` or `mode: "REQUEST"` (with a filter document) on `table-export-items`, and `findMode: "ALL"` or `"REQUEST"` on data tasks.
- What a periodic run receives for user inputs is not documented: put the configuration of a periodic job in a `data` block or in global variables rather than in user inputs (recommendation).
- Make periodic jobs idempotent (recommendation): re-running them must not create duplicates (use differential imports, `UPDATE_ONLY` where appropriate, "processed" folders on FTP).
- One job can serve both uses with a `SWITCH` on `jobActionOrigin` (section 5).

## 7. API-triggered jobs and job chaining

A job launched through the API (`POST /v1/data_factory/job_executions`) receives `jobActionOrigin: "API"` and the caller's `input` object; a job started by another job (`data-job-execution-create`) receives the `input` of its operation (the task page does not state the origin value of such a run):

```json
{
  "jobId": "000000000000000000000001",
  "info": { "title": "Export triggered by the parent job" },
  "input": {
    "eansCsv": "2000000000220;2000000000237",
    "file": { "url": "https://..." }
  }
}
```

- Every key of `input` is readable as `${workflow.input.<key>}`, whether or not it is declared in `userInputs`. Published chained jobs read `${workflow.input.eansCsv}` without declaring it; declare the keys anyway when humans may also launch the job, so the form shows them.
- `FIELD` and `SCREEN` inputs are populated from the screen the user has open; what an API caller should send for them is not documented, so do not use them in API-triggered jobs (recommendation).
- The context still carries `jobAccountId`, `jobId`, `jobInstanceId`, `triggerAt`, `userAccountId` and `userId`; `view` is absent.
- The triggered job exposes its results only through its `outputParameters` (or the `outputParameters` of its `TERMINATE` task); the caller reads them at `${run_job.output.result.json[0].response.output.<key>}`.
- When the caller waits for the result (`"wait": true`), the two jobs must run on different pipelines (see `lifecycle.md`).

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| A user input named `context` | any other key; `${workflow.input.context}` is the job context |
| `"${workflow.input.input.context}"` (seen in one old example) | `"${workflow.input.context}"` |
| Reading `context.selection.ids` in a new job | `USER_SELECTION` mode on the task, or `context.query` |
| `USER_SELECTION` or `context.view.*` in a periodic job | `mode: "ALL"` / `"REQUEST"`; configuration in variables or `data` |
| Assuming `view` exists for every origin | guard: it is absent for `API` and `PERIODIC` |
| Hardcoding `tableKey` in a job launched from the grid | read `context.view.table.key` when the job should follow the user |
| Promising "one column per column the user sees" from `context.view.screen` | promise the columns of the screen definition (read from the schema export); no documented property carries a user's private screen settings (hidden, pinned or reordered columns) |
| Expecting the scheduler to fill user inputs | `data` blocks or global variables (what a periodic run receives for an input is not documented) |
| Treating `triggerAt` as local time | it is UTC; convert in the consumer if needed |
