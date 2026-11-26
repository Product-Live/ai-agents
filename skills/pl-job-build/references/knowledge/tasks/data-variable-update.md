# data-variable-update

> Reference token: DF-TASK-DATA-VARIABLE-UPDATE-01

Status: alpha (a recent task, available on every account). Category: data. Documentation: https://learn.product-live.com/data-factory/references/tasks/data-variable-update/

## Purpose

Fully update variables. The task performs a full replacement of the variable with the provided data, so the required properties (`id`, `key`, `name`, `value`) must be supplied in each operation; optional properties (`status`, `isSecret`) not provided are reset to their default value.

## When to use

- Change a value, rename a variable, archive it (`status: ARCHIVED`), toggle the secret flag.

## When not to use

- Numeric counters: `data-variable-increment` (atomic).
- Updating only a subset of properties without reading first: read the current variable with `data-variable-find` and merge your changes before calling this task (verbatim warning).

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
| request.json.operations[].element | OBJECT | yes | - | - | The element to write (properties listed below). |
| request.json.operations[].context | OBJECT | yes (variableId) | - | - | Extra context the operation needs (listed below when applicable). |
| request.json.operations[].lookups | ARRAY | no | - | - | Resolves business keys into ids for this operation (lookups reference, alpha); assign must start with element., options. or context. |
| request.json.lookups | ARRAY | no | - | - | Same mechanism, declared once for the whole request. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create and data-suggestion-create) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Undocumented on this task; accepted by the job schema and used in several documentation examples of this family. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].context.variableId | STRING | yes | - | - | Id of the variable to update. |
| request.json.operations[].element.id | STRING | yes | - | - | Must match `context.variableId`. |
| request.json.operations[].element.key | STRING | yes | - | matches ^[a-z0-9_]{1,50}$ | Key of the variable. |
| request.json.operations[].element.name | STRING | yes | - | - | Display name. |
| request.json.operations[].element.value | STRING | yes | - | - | New value (string). |
| request.json.operations[].element.status | ENUM | no | reset to default when omitted | ACTIVE, ARCHIVED, DELETED | Status. |
| request.json.operations[].element.isSecret | BOOLEAN | no | reset to default when omitted | true, false | Secret flag. |

### Request grammar (shared by the data create, update, patch, apply and delete tasks)

`request.json` is an `operations` array; each operation carries a unique `key`, the `element` to write and, when the task needs it, a `context`:

```json
{
  "operations": [
    { "key": "a", "element": { "...": "..." } },
    { "key": "b", "context": { "...": "..." }, "element": { "...": "..." } }
  ]
}
```

With `request.method = "ATTACHMENT"` and `request.contentType = "application/xml"`, the same structure is written in the W3C JSON-to-XML form (the documentation shows both `<?xml version="1.0"?>` and `<?xml version="1.1"?>` prologs; prefer 1.0):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<map xmlns="http://www.w3.org/2005/xpath-functions">
  <array key="operations">
    <map>
      <string key="key">a</string>
      <map key="context"></map>
      <map key="element">
        <string key="...">...</string>
      </map>
    </map>
  </array>
</map>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${update_variable.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the variable entity returned by the API (default INLINE JSON output). |
| ${update_variable.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation (note the extra `.response` compared with find tasks). |
| ${update_variable.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${update_variable.output.result.json[0].response.version} | STRING | Version after the update (for example "2"); the response also carries `key`, `name`, `status`, `value`, `isSecret`, `createdAt`, `updatedAt`. |

## Example

```json
{
    "name": "data-variable-update",
    "taskReferenceName": "update_variable",
    "description": "Update a variable's value",
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
                        "context": {
                            "variableId": "12345"
                        },
                        "element": {
                            "id": "12345",
                            "key": "my_variable",
                            "name": "My Variable",
                            "value": "new_value",
                            "status": "ACTIVE",
                            "isSecret": false
                        }
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
- Full replacement semantics: read-merge-write (verbatim element): `"id": "${find_variable.output.result.json[0].id}", "key": "${find_variable.output.result.json[0].key}", "name": "${find_variable.output.result.json[0].name}", "value": "${workflow.input.newValue}", "status": "${find_variable.output.result.json[0].status}", "isSecret": "${find_variable.output.result.json[0].isSecret}"`.
- Secret values are not returned by `data-variable-find`, so a read-merge-write of a secret variable cannot carry the old value.
- `failOnError` is documented on data-job-execution-create and data-suggestion-create (default `false`): operations run one by one and a rejected operation does not stop the others unless `failOnError` is `true`.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- `request` is required per docs and per schema. Leave out any key that the input table does not list.

## Related tasks

- `data-variable-find`: read before writing.
- `data-variable-create`, `data-variable-increment`.
