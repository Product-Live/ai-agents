# switch

> Reference token: DF-TASK-SWITCH-01

Status: GA | Category: flow-control | Documentation: https://learn.product-live.com/data-factory/references/tasks/switch/

## Purpose

A flow-control task of type `SWITCH`: evaluates an expression and runs the list of tasks found under the matching key of `decisionCases`, or `defaultCase` when nothing matches.
It replaces the deprecated `decision` task and "supports both value and JavaScript expression evaluators". Full idioms: `../control-flow.md`.

## When to use

- Branch on an ENUM output (`YES` / `NO` flags such as `itemsFound`, `allFilesGenerated`, `allSuccess`, `withError`).
- Guard pattern: a matching case holding a `TERMINATE`, other branches empty, so the main flow stays at the top level.
- React to the failure of an `optional: true` task through `${<ref>.status}`.
- Branch on the launch origin (`${workflow.input.context.jobActionOrigin}`: `APP`, `PERIODIC`).

## When not to use

- Loops (`loop`), parallel work (`task-batch-execute`).
- Nesting the whole remaining flow inside a branch: "the best practice is to only use the Decision as a test for the cases that you want to detect."

## Inputs

Unlike catalog tasks, the flow-control properties sit at task level, next to `inputParameters`. The `name` is free text (the documentation uses `switch` or `switch_task`) and the `type` is `SWITCH`; there is no `SUB_WORKFLOW`.

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| inputParameters | OBJECT | yes | | | The values the expression can read; keys are free (`switchCaseValue`, `status`, `case_value_param`) |
| evaluatorType | ENUM | documented as not required, required by the job schema | javascript | value-param, javascript | "value-param: Use a parameter directly as the value to determine the list of tasks to execute. javascript: Evaluate a javascript expressions and use its result as the value" |
| expression | STRING | yes | | | With `value-param`: the name of a key of `inputParameters`. With `javascript`: the expression to evaluate, inputs readable as `$.<key>` (ES5 syntax by convention of these skills) |
| decisionCases | OBJECT | yes | | | "Object where the key is a possible value that can result from the expression ... and the value associated is a list of tasks to be executed"; keys are strings, values are literal arrays |
| defaultCase | ARRAY | documented as required, omitted in some official examples | | | "List of tasks to be executed when no matching value is found inside the decisionCases parameter"; always write it, at least `[]` |
| skipReportGeneration | BOOLEAN | no | false | true, false | Report input (documented on the page) |
| logLevel | ENUM | no | info | error, warning, info, debug | Report input (documented on the page) |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${check_status.output.evaluationResult} | ARRAY | "A single-element array holding the evaluated value of expression - the key looked up in decisionCases." |
| ${check_status.output.selectedCase} | STRING | "The same evaluated value, as a plain string." |

Outputs of tasks inside a branch that did not run resolve to `null`.

## Example

```json
{
  "name": "switch",
  "taskReferenceName": "check_status",
  "description": "React when the optional HTTP call failed",
  "optional": false,
  "type": "SWITCH",
  "inputParameters": {
    "status": "${http_perform.status}"
  },
  "evaluatorType": "value-param",
  "expression": "status",
  "decisionCases": {
    "COMPLETED_WITH_ERRORS": [
      {
        "name": "terminate",
        "taskReferenceName": "terminate_http_failed",
        "description": "Stop the job in error after a failed call",
        "optional": false,
        "type": "TERMINATE",
        "inputParameters": {
          "terminationStatus": "FAILED",
          "outputParameters": {
            "message": "The partner API could not be reached"
          }
        }
      }
    ]
  },
  "defaultCase": []
}
```

JavaScript evaluator (documented): `"evaluatorType": "javascript", "expression": "$.inputValue.length > 1 ? 'success' : 'failure'"` with cases `success` and `failure`.

## Gotchas and limits

- Status references: prefer the braced form `"${<ref>.status}"` (exactly two segments). The handling-failures page shows `"status": "protocol_http_perform.status"` without `${}`; every other documented task reference is braced, and how the unbraced form is evaluated is not documented. Use the braced form and keep a `defaultCase`.
- The handling-failures example switches on `COMPLETED_WITH_ERRORS` for a task marked `optional: true` that failed. Other values of `${<ref>.status}` are not documented for this use (the batch output lists `COMPLETED` among terminal task statuses), so switch on `COMPLETED_WITH_ERRORS` and route everything else to `defaultCase`. The documentation marks a task `optional` precisely so that the job continues after its failure; do not rely on a `FAILED` case.
- For `protocol-http-perform`, `.status` does not reflect a 4xx/5xx response (the task completes); branch on `${<ref>.output.statusCode}` or use assertions.
- "Details regarding the tasks executed inside the SWITCH task are not visible in job execution details. We recommend the use of the outputParameters to display necessary information regarding what happened inside the SWITCH task."
- `decisionCases` keys are strings: `"YES"`, `"NO"`, `"true"`, `"COMPLETED_WITH_ERRORS"`. Lists under `decisionCases` and `defaultCase` must be literal arrays, never a `${...}` placeholder.
- Reference names inside branches must be unique job-wide; tasks inside a branch can be referenced afterwards like any task.
- The documentation shows `evaluatorType` as optional with default `javascript` while the job schema requires it; always write it. Same for `defaultCase`: documented as required, omitted in some examples; always write it.
- Global variables (`${workflow.globalVariables.x}`) may be read in `inputParameters`, one per template string.

## Related tasks

- `terminate` (guard pattern), `decision` (deprecated predecessor), `loop`, `set-variable`
- `protocol-http-perform` (status and `statusCode` branching), `table-export-items` (`itemsFound` guard)
- `../control-flow.md`, `../wiring.md`
