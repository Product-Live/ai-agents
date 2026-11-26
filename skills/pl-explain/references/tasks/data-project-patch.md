# data-project-patch

> Reference token: DF-TASK-DATA-PROJECT-PATCH-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-project-patch/

## Purpose

Partially update a project: only the provided fields change, the others are left untouched.

## When to use

- Rename a project, move it under another parent, or change its access key without resending everything.

## When not to use

- When every property must be set at once: use `data-project-update` (full replacement).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| apiKey | STRING | no | automatic key of the current user | - | API key used to perform the request. When omitted, an automatically generated key acts on behalf of the current user. Pass a secret global variable, never a literal. |
| request | OBJECT | yes (per docs and per schema) | - | - | The request document. |
| request.contentType | STRING | yes, inside request | - | application/json, application/xml | Content type of the request body. |
| request.method | ENUM | yes, inside request | - | INLINE, ATTACHMENT | INLINE: the body is given in request.json. ATTACHMENT: the body is given as a file in request.file. |
| request.model | ENUM | no | default | default | Model of the request; the examples always spell it out. |
| request.json | OBJECT | when method = INLINE and contentType = application/json | - | - | The request body. |
| request.json.operations | ARRAY | yes, inside request.json | - | - | One entry per element to write. |
| request.json.operations[].key | STRING | yes | - | - | Unique key of the operation; echoed in the output next to its response. |
| request.json.operations[].element | OBJECT | yes | - | - | The element to write (properties listed below). |
| request.json.operations[].context | OBJECT | depends on the task (see below) | - | - | Extra context some elements need (for instance the id of the parent entity). |
| request.json.operations[].lookups | ARRAY | no | - | - | Resolves business keys into ids for this operation (lookups reference, alpha). |
| request.json.lookups | ARRAY | no | - | - | Same mechanism, declared once for the whole request. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create and data-suggestion-create) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Documented on data-job-execution-create and data-suggestion-create; the job schema accepts it on every create task and several documentation examples use it. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].context.projectId | STRING | yes | - | - | Id of the project to patch. |
| request.json.operations[].element.displayName | STRING | no | unchanged | - | New display name. |
| request.json.operations[].element.accessKey | STRING | no | unchanged | - | New access key. |
| request.json.operations[].element.parentId | STRING | no | unchanged | - | New parent project; `null` moves the project to the root. |

### Request grammar (shared by the data create, update and delete tasks)

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
| ${patch_project.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the project entity returned by the API (default INLINE JSON output). |
| ${patch_project.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation. |
| ${patch_project.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${patch_project.output.result.json[0].response.displayName} | STRING | Display name after the patch; the entity also carries `accessKey`, `depth`, `accountId`, `createdAt`, `updatedAt`. |

Verbatim output example:

```json
[
    {
        "key": "a",
        "response": {
            "object": "project",
            "id": "000000000000000000000001",
            "createdAt": "2023-10-06T09:00:00.000Z",
            "updatedAt": "2024-05-17T10:30:00.000Z",
            "displayName": "New Project Name",
            "accessKey": "new-project-name",
            "depth": 0,
            "accountId": "234"
        }
    }
]
```

## Example

```json
{
    "name": "data-project-patch",
    "taskReferenceName": "patch_project",
    "description": "Update project display name",
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
                            "projectId": "000000000000000000000001"
                        },
                        "element": {
                            "displayName": "New Project Name"
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
- The XML request page shared by every create task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value. Where a task page says otherwise (for example data-project-patch), the task page wins.
- `failOnError` is documented on data-job-execution-create and data-suggestion-create (default `false`); on this task it appears in examples or in the job schema without documentation. Treat it as probably supported, default `false`.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- Leave out any key that the input table does not list.
- The shared XML text included on this page claims a full replacement, which contradicts the task's own partial semantics; trust the task text (partial update).
- `accessKey` is patchable here but absent from the create and update element tables.
- The documented example adds `"failOnError": true`.

## Related tasks

- `data-project-update`: full replacement.
- `data-project-find`: resolve the project id.
