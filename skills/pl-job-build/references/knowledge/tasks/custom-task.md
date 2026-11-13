# custom-task

> Reference token: DF-TASK-CUSTOM-TASK-01

Status: GA (requires an account-specific task created through the API) | Category: specialized processing | Documentation: https://learn.product-live.com/data-factory/references/specialized-processing/

## Purpose

An account-specific task executed on your own infrastructure. "A custom task refers to a task not natively supported by the Data Factory platform. The task creator is responsible for executing the task and returning the result to the platform."
The platform "can offload certain task processing to an external infrastructure" for private systems, sensitive data, resource-intensive processing or unsupported operations; an external application polls the API for pending task executions and submits their results.

## When to use

- A step that cannot be expressed with catalog tasks and scripts, and that the account already runs as a registered custom task.

## When not to use

- Anything a catalog task, `code-execute-javascript`, `json-transform-jq` or `file-transformation-xslt` can do.
- Jobs meant to be shared with other accounts: the task is created through the Tasks API of one account, and how it behaves in a shared job is not documented.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| name | STRING | yes | | an account part, a slash and the task key | The documentation pages do not show how a job names a custom task. The public sample repository linked from the specialized processing page writes `${account}/<task_key>`, where `<task_key>` is the `key` given when the custom task was created ("If you used the key 'my-task' when creating the task, the name of the task should be `${account}/my-task`"), and says to edit that name; it does not explain `${account}`. These skills write the owner's account key in its place (`<accountKey>/<task_key>`, a convention of these skills): confirm the exact name with the owner of the custom task. |
| type | STRING | yes | | SUB_WORKFLOW | Like every catalog task |
| inputParameters | OBJECT | yes | | | Free object, defined by the custom task itself |

`custom-task` is the name of this reference file, not a platform task name.

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${custom_step.output.<key>} | ANY | Whatever the external application returns as the execution `output`; the execution `status` is `COMPLETED` or `FAILED` |

## Example

```json
{
  "name": "your-account-key/my-custom-task",
  "taskReferenceName": "custom_step",
  "description": "Run the account-specific processing on our own servers",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "file": "${export_items.output.file}"
  }
}
```

## Gotchas and limits

- Requirements listed by the documentation: access to the platform, a pipeline, an API token, and the ability to run an application on your own servers or cloud. A sample implementation is published at https://github.com/Product-Live/data-factory-task-example; the API description is served at https://api.product-live.com/-json.
- The application polls `GET /v1/data_factory/tasks/{taskId}/poll` with an API key, then updates the task execution: "The only fields that can be updated are `status` and `output`", and `status` "can be updated to `COMPLETED` or `FAILED`". Which account may poll the executions of a custom task used in a shared job is not documented.
- Inputs, outputs and limits are defined by the custom task, not by the platform: ask the owner for its contract and document it in the job README.
- The offline validator cannot check the inputs of a custom task; it accepts the `<accountKey>/<task_key>` form with a warning. Replace `your-account-key` in the example by the real account key.
- The create body of the Tasks API carries a `retryCount` that the documentation does not explain; no timeout and no report are documented for a custom task.

## Related tasks

- `code-execute-javascript`, `json-transform-jq`, `file-transformation-xslt` (in-platform alternatives)
- `data-job-execution-create` (delegate to another job instead)
