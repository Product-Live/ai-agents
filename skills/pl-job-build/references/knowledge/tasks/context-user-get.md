# context-user-get

> Reference token: DF-TASK-CONTEXT-USER-GET-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/context-user-get/

## Purpose

Return the user executing the job, as a one-element array in the format of the users API.

## When to use

- Personalize a notification (send the result email to the user who launched the job).
- Audit who ran the job; name the emitter of a log.

## When not to use

- Finding other users: use `data-user-find`.
- Identifying the account: use `context-account-get`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. No `apiKey`, `findMode` or `request` on this task. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml | Key under output that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${get_current_user.output.totalElements} | NUMBER | Always 1. |
| ${get_current_user.output.output.json} | ARRAY | One user object: `object` (`user`), `id`, `createdAt`, `updatedAt`, `email`, `firstName`, `lastName`. |
| ${get_current_user.output.output.json[0].id} | STRING | Id of the current user. |
| ${get_current_user.output.output.json[0].email} | STRING | Email of the current user. |
| ${get_current_user.output.output.json[0].firstName} | STRING | First name; `[0].lastName` for the last name. |
| ${get_current_user.output.output.xml} | FILE | XML file when an ATTACHMENT XML output is declared. |

The first `.output` in an expression selects the task output; the second selects its `output` map. `${get_current_user.output}` still returns the complete task output, including `totalElements`. Keys in the map follow `outputs[].outputKey`; `json` is the default key.

Example output (verbatim from the documentation):

```json
[
    {
        "object": "user",
        "id": "1",
        "createdAt": "2025-09-01T13:17:54.000Z",
        "updatedAt": "2025-09-01T13:17:54.000Z",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
    }
]
```

## Example

```json
{
    "name": "context-user-get",
    "taskReferenceName": "get_current_user",
    "description": "Get current user",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {}
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- `output.json` is an array with a single element: read `[0]`.
- In a periodic (scheduled) job there is no interactive user; do not rely on this task for a human recipient in that case.
- The page includes the shared 1000-element INLINE limit although one element is returned; irrelevant here.
- Required per schema: none; the only accepted key is `outputs`.

## Related tasks

- `context-account-get`: the current account.
- `data-user-find`: other users.
- `notification-send-email`: email the current user.
