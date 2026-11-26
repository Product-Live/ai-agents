# context-account-get

> Reference token: DF-TASK-CONTEXT-ACCOUNT-GET-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/context-account-get/

## Purpose

Return the account (organization) in which the job is executed, as a one-element array in the format of the accounts API.

## When to use

- Stamp outputs, file names or logs with the current account name or key.
- Resolve the current account id for later `data-*` requests.

## When not to use

- Finding other accounts (partners, suppliers): use `data-account-find`.
- Identifying the user who launched the job: use `context-user-get`.

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
| ${get_current_account.output.totalElements} | NUMBER | Always 1. |
| ${get_current_account.output.output.json} | ARRAY | One account object: `object` (`account`), `id`, `createdAt`, `updatedAt`, `key`, `name`. |
| ${get_current_account.output.output.json[0].id} | STRING | Id of the current account. |
| ${get_current_account.output.output.json[0].key} | STRING | Key of the current account. |
| ${get_current_account.output.output.json[0].name} | STRING | Name of the current account. |
| ${get_current_account.output.output.xml} | FILE | XML file (`<array xmlns="http://www.w3.org/2005/xpath-functions"><map>...</map></array>`) when an ATTACHMENT XML output is declared. |

The first `.output` in an expression selects the task output; the second selects its `output` map. `${get_current_account.output}` still returns the complete task output, including `totalElements`. Keys in the map follow `outputs[].outputKey`; `json` is the default key.

Example output (adapted from the documentation):

```json
[
    {
        "object": "account",
        "id": "1",
        "createdAt": "2025-09-01T13:17:54.000Z",
        "updatedAt": "2025-09-01T13:17:54.000Z",
        "key": "00000000-0000-0000-0000-000000000001",
        "name": "Example Account"
    }
]
```

## Example

```json
{
    "name": "context-account-get",
    "taskReferenceName": "get_current_account",
    "description": "Get current account",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {}
}
```

XML variant: `"inputParameters": { "outputs": [ { "mediaType": "application/xml", "outputMode": "ATTACHMENT", "outputKey": "xml" } ] }`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- `output.json` is an array even though it always holds one element: read `[0]`.
- The page includes the shared 1000-element INLINE limit although at most one element is returned; irrelevant here.
- Required per schema: none; the only accepted key is `outputs`.

## Related tasks

- `context-user-get`: the user executing the job.
- `data-account-find`: other accounts.
- `data-partner-find`: partner links of the current account.
