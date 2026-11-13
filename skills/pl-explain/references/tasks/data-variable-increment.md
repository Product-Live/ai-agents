# data-variable-increment

> Reference token: DF-TASK-DATA-VARIABLE-INCREMENT-01

Status: alpha (a recent task, available on every account). Category: data. Documentation: https://learn.product-live.com/data-factory/references/tasks/data-variable-increment/

## Purpose

Atomically increment (or decrement) the numeric value of a variable.

## When to use

- Counters and sequence numbers shared across job executions (batch numbers, file sequences).

## When not to use

- Setting an arbitrary value: `data-variable-update`.
- A counter local to one execution: `SET_VARIABLE`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| apiKey | STRING | no | automatic key of the current user | - | API key used to perform the request. When omitted, an automatically generated key acts on behalf of the current user. Pass a secret global variable, never a literal. |
| request | OBJECT | yes (per docs and per schema) | - | - | The request document. |
| request.contentType | STRING | yes, inside request | - | application/json, application/xml | Content type of the request body. |
| request.method | ENUM | yes, inside request | - | INLINE, ATTACHMENT | INLINE: the body is given in request.json. ATTACHMENT: the body is given as a file in request.file. |
| request.model | ENUM | no | default | default | Model of the request; the examples always spell it out. |
| request.json | OBJECT | when method = INLINE and contentType = application/json | - | - | The request body. |
| request.json.operations | ARRAY | yes, inside request.json | - | - | One entry per element to write; operations run sequentially, one by one. |
| request.json.operations[].key | STRING | yes | - | - | Unique key of the operation; echoed in the output next to its response. |
| request.json.operations[].context | OBJECT | yes (variableId) | - | - | Extra context the operation needs (listed below when applicable). |
| request.json.operations[].lookups | ARRAY | no | - | - | Resolves business keys into ids for this operation (lookups reference, alpha); assign must start with element., options. or context. |
| request.json.lookups | ARRAY | no | - | - | Same mechanism, declared once for the whole request. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create only) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Undocumented on this task; accepted by the job schema and used in several documentation examples of this family. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].type | STRING | yes | - | increment | Must be `increment`. |
| request.json.operations[].context.variableId | STRING | yes | - | - | Id of the variable to increment. |
| request.json.operations[].valueField | STRING | yes | - | value | Field to increment on the target entity; for variables, `value`. |
| request.json.operations[].incrementBy | NUMBER | no | 1 | any number; negative to decrement | Value to add. |

The operation shape differs from the other write tasks: there is no `element`; only `contentType = application/json` is documented (no XML section).

```json
{
  "operations": [
    { "key": "a", "type": "increment", "context": { "variableId": "12345" }, "valueField": "value", "incrementBy": 1 }
  ]
}
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${increment_variable.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the variable entity returned by the API (default INLINE JSON output). |
| ${increment_variable.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation (note the extra `.response` compared with find tasks). |
| ${increment_variable.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${increment_variable.output.result.json[0].response.value} | STRING | New value after the increment, as a string (for example "11"); `version` is incremented per operation. |

## Example

```json
{
    "name": "data-variable-increment",
    "taskReferenceName": "increment_variable",
    "description": "Increment variable by 1",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "request": {
            "method": "INLINE",
            "contentType": "application/json",
            "model": "default",
            "json": {
                "operations": [
                    {
                        "key": "a",
                        "type": "increment",
                        "context": {
                            "variableId": "12345"
                        },
                        "valueField": "value",
                        "incrementBy": 1
                    }
                ]
            }
        }
    }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- INLINE output is limited to 1000 elements; beyond that the task ends with an error. Use `options.limit`, or declare an ATTACHMENT output (`outputs: [{"mediaType": "application/xml", "outputMode": "ATTACHMENT", "outputKey": "xml"}]`) for large result sets.
- The variable value must be numeric (integer or decimal). Error handling (verbatim): a non-numeric value (for example "abc") fails the task immediately; an empty ("") or null value is treated as 0, then incremented; a non-numeric `incrementBy` fails the task immediately.
- Operations in a batch are executed sequentially; multiple increments on the same variable in a single batch are supported and applied one after another (each reads the latest value).
- Needs the variable id: pair with `data-variable-find` (`"variableId": "${find_variables.output.result.json[0].id}"` with `"failOnError": true` in the documented example).
- The task is listed on the public catalog index page but not in the documentation sidebar.
- `failOnError` is documented only on data-job-execution-create (default `false`): operations run one by one and a rejected operation does not stop the others unless `failOnError` is `true`.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- `request` is required per docs and per schema. Leave out any key that the input table does not list.

## Related tasks

- `data-variable-find`: resolve the id.
- `data-variable-create`, `data-variable-update`.
