# terminate

> Reference token: DF-TASK-TERMINATE-01

Status: GA | Category: flow-control | Documentation: https://learn.product-live.com/data-factory/references/tasks/terminate/

## Purpose

"Force a job to terminate in Success or Error." A flow-control task of type `TERMINATE`, almost always placed inside a `switch` branch (guard pattern). Full idioms: `../control-flow.md`.

## When to use

- Graceful early exit with `COMPLETED`: nothing to do, empty selection, no file on the FTP.
- Stop with `FAILED` on a configuration or context error (invalid inputs, wrong launch origin, failed optional task).
- Show a user-facing message: expose it through the task's own `outputParameters`.

## When not to use

- Ending the job normally: "What happen if I don't put the Terminate task? The Job will continue" to the end.
- "Do I need to use a decision task after each task? No! Do not over engineer your Jobs."

## Inputs

The `name` is free text (the documentation uses `terminate`), the `type` is `TERMINATE`, and the properties sit under `inputParameters`.

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| inputParameters.terminationStatus | ENUM | yes | | COMPLETED, FAILED | "COMPLETED the job will end in success. FAILED the job will end in error." |
| inputParameters.outputParameters | OBJECT | no | | | "an object of outputs that you want to display to users." Values may be strings, numbers, booleans, arrays or objects, including `${...}` references |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| (none) | | The task has no outputs; the job ends |

## Example

```json
{
  "name": "terminate",
  "taskReferenceName": "terminate_no_items",
  "description": "End the job in success when no item was selected",
  "optional": false,
  "type": "TERMINATE",
  "inputParameters": {
    "terminationStatus": "COMPLETED",
    "outputParameters": {
      "message": "${display_no_items.output.message}"
    }
  }
}
```

Error variant: `"terminationStatus": "FAILED"` with `"outputParameters": {"error_message": "${display_error.output.message}"}`.

## Gotchas and limits

- "When you terminate a Job you must explicitly define which outputParameters must be displayed." The job-level `outputParameters` are not shown after a terminate: "If you do this the Job will end in success but the user will not view the outputs."
- Only `COMPLETED` and `FAILED` are valid statuses.
- Outputs of a `switch` branch are not visible in the execution details; put user-facing values in the terminate's `outputParameters`.
- Keep the guard readable: the branch that matches the error case holds the terminate; the other branches stay empty so the main flow continues at the top level.

## Related tasks

- `switch` (guard pattern), `notification-display-message` (message to expose)
- `../control-flow.md`, `../lifecycle.md`
