# json-transform-jq

> Reference token: DF-TASK-JSON-TRANSFORM-JQ-01

Status: alpha (a recent task, available on every account) | Category: json-transform | Documentation: https://learn.product-live.com/data-factory/references/tasks/json-transform-jq/

## Purpose

"The JQ Transform task allows processing JSON data using the JQ query expression language" (the documentation links the jq 1.5 manual). The engine is a jq-compatible subset without date functions; the expression runs against the task's whole `inputParameters` object.

## When to use

- Reshape or filter JSON coming from `data-*-find` tasks, `protocol-http-perform` (`response.json`) or JSON user inputs.
- Build arrays of operations for `data-*-create` tasks or the `tasks[]` list of `task-batch-execute`.

## When not to use

- Anything involving dates (`now`, `todate`, `strftime`, ...): compute them in `code-execute-javascript` and pass them through `data`.
- Regex-heavy or multi-file logic, or when a file must be read: `code-execute-javascript`.
- XML in or out: `file-transformation-xslt`.
- This task is in alpha phase: a recent task, available on every account.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| data | OBJECT | yes | - | - | "An object containing the input data to be processed." Arbitrary keys, read in the expression as `.data.<key>`. |
| queryExpression | STRING | yes | - | - | "A valid JQ query expression. The expression can reference any property defined in the `inputParameters` object." The jq root `.` is the whole `inputParameters` object. |
| skipReportGeneration | BOOLEAN | no | false | true, false | Included by the page (common report inputs); relevance not documented. |
| logLevel | ENUM | no | info | error, warning, info, debug | Included by the page (common report inputs); relevance not documented. |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${jq_transform.output.result}` | OBJECT | "The first results returned by the JQ expression" (the first emitted value). |
| `${jq_transform.output.resultList}` | ARRAY | "A List of results returned by the JQ expression": every emitted value, one entry each. |
| `${jq_transform.output.error}` | STRING | Error message when the query failed. |

## Example

```json
{
  "name": "json-transform-jq",
  "taskReferenceName": "jq_transform",
  "description": "Filter the comment threads that are open and not assigned to the current account",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "data": {
      "accountId": "${workflow.input.context.userAccountId}",
      "commentThreads": "${find_comment_threads.output.result.commentThreads}"
    },
    "queryExpression": "[.data.accountId as $accountId | .data.commentThreads[] | select(.isClosed == false and .accountAssigneesId[] != $accountId)]"
  }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- "This task does not support the Data Factory global variables as an input parameter." Route a `${workflow.globalVariables.<key>}` value through a previous task's output instead.
- Dates: "The Dates section of the manual above is entirely unsupported to date: `now`, `todate`, `fromdate`, `strftime`, `strptime`, `mktime`, `gmtime` and the rest of the family. An expression using one of them does not produce a result - it fails and sets the `error` output."
- `.` is the whole `inputParameters` object: always write `.data.<key>`, never `.<key>`.
- A stream of several values (for example `.data.items[]`) gives the first value in `result` and all of them in `resultList`; wrap the expression in `[ ... ]` to get a single array in `result`.
- Keep to the well-supported core: path navigation, `select`, `map`, `reduce`, object construction, `tostring`, `tonumber`, `split`, `join`, `test`, `sub`, `gsub`, `sort_by`, `group_by`, `unique_by`, `to_entries`, `from_entries`, `with_entries`, `keys`, `length`, `add`, `any`, `all`, `@csv`. Lint every expression with the script lint of the job builder skill (`lint-script.js`) before shipping.
- The expression is a JSON string: escape inner double quotes (`\"`) and keep it on one line.
- The documentation's first example has a trailing comma after `"input": "${workflow.input.json}"` and omits `description` and `optional`; both are required in a job, so do not copy that example as is.
- Report inputs `skipReportGeneration` and `logLevel` are listed by the page.

## Related tasks

- `code-execute-javascript` (richer logic, dates, files)
- `task-batch-execute` (consume a built `tasks[]` list)
- `data-*-find`, `data-*-create` tasks, `protocol-http-perform` (JSON sources and sinks)
- `file-transformation-xslt` (XML equivalent)
