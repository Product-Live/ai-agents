# decision

> Reference token: DF-TASK-DECISION-01

Status: deprecated (use switch) | Category: flow-control | Documentation: https://learn.product-live.com/data-factory/references/tasks/decision/

## Purpose

"A decision task is similar to case...switch statement in a programming language." A flow-control task of type `DECISION` that branches on the value of one input parameter.
The documentation states: "This Data Factory task is deprecated in favor of Switch (switch), which supports both value and JavaScript expression evaluators. We recommend migrating your existing jobs to switch."

## When to use

- Only when editing an existing job that already uses it.

## When not to use

- Any new job: use `switch` with `evaluatorType: "value-param"`.

## Inputs

The flow-control properties sit at task level. The `name` must be `decision` and the `type` is `DECISION`.

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| inputParameters | OBJECT | yes | | | "you must define a key with the output of a previous task. The output must be an ENUM. Best practice: use the name of the output parameter for the property key." |
| caseValueParam | STRING | yes | | | "the name of the parameter in task input whose value will be used as a switch." |
| decisionCases | OBJECT | yes | | | "Map where key is possible values of caseValueParam with value being list of tasks to be executed." |
| defaultCase | ARRAY | no | | | "List of tasks to be executed when no matching value is found in decision case" |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${decision.output.caseOutput} | ARRAY | A single-element array holding the evaluated value, for example `["YES"]` |

## Example

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

## Gotchas and limits

- Deprecated; the validator warns on it.
- Limit: "10 conditions".
- Migration to `switch`: keep `inputParameters` and `decisionCases`, replace `"type": "DECISION"` by `"type": "SWITCH"`, replace `caseValueParam` by `"evaluatorType": "value-param"` plus `"expression": "<the same key>"`, add `"defaultCase": []`.
- The input "must be an ENUM": "Most of the other task have output values with type ENUM. You must use one of the values."
- Lists under `decisionCases` and `defaultCase` must be literal arrays, never a `${...}` placeholder. Reference names inside branches must be unique job-wide.

## Related tasks

- `switch` (replacement), `terminate`
- `../control-flow.md`
