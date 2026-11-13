# set-variable

> Reference token: DF-TASK-SET-VARIABLE-01

Status: alpha (a recent task, available on every account) | Category: flow-control | Documentation: https://learn.product-live.com/data-factory/references/tasks/set-variable/

## Purpose

A flow-control task of type `SET_VARIABLE` that creates or updates local variables "scoped to the job execution context". Each key of `inputParameters` becomes a variable readable later with `${workflow.variables.<name>}`. Full idioms: `../control-flow.md`.

## When to use

- Carry state across iterations of a `loop` or out of a `switch` branch (both branches set the same variable, the next top-level task reads it).
- Keep a configuration object or a plan for a final report.

## When not to use

- Account-level secrets or settings: those are global variables created in Settings (`${workflow.globalVariables.x}`, see `../variables-and-secrets.md`).
- Large payloads: each local variable is limited to 256 KB.

## Inputs

The `name` is free text (the documentation uses `Set variable`), the `type` is `SET_VARIABLE`. The job schema requires only `type`.

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| inputParameters | OBJECT | yes (documented) | | | "a map of key/value pairs. The key is the name of the variable and the value is the value of the variable. The value can be a string, a number, a boolean, an array or an object." |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| (none) | | No output; read the variable with `${workflow.variables.<name>}` or a nested path such as `${workflow.variables.configuration.domain}` |

## Example

```json
{
  "name": "set-variable",
  "taskReferenceName": "set_variable",
  "description": "Keep the API configuration for the following tasks",
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
    }
  }
}
```

## Gotchas and limits

- Alpha: a recent task, available on every account.
- "The size of a local variable is limited to 256 KB. Exceeding this limit will result in a task error."
- Global variables are not supported as inputs of this task.
- Reading `${workflow.variables.x}` before a `set-variable` task wrote it is not documented; the validator warns on it. Set the variable in a top-level task before any branch reads it.
- Local variables live only in the current execution; they are not shared between jobs.

## Related tasks

- `loop` (state across iterations), `switch`, `terminate`
- `data-variable-find`, `data-variable-create`, `data-variable-update`, `data-variable-increment` (account-level variables)
- `../control-flow.md`, `../variables-and-secrets.md`
