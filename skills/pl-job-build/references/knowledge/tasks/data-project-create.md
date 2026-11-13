# data-project-create

> Reference token: DF-TASK-DATA-PROJECT-CREATE-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-project-create/

## Purpose

Create projects, the containers that organize jobs in Data Factory, optionally nested under a parent project.

## When to use

- Provisioning or bootstrapping jobs that set up a project tree for a customer or an environment.

## When not to use

- Renaming or moving an existing project: use `data-project-patch`.
- Checking whether a project exists: use `data-project-find` first.

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
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create only) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Documented only on data-job-execution-create; the job schema accepts it on every create task and several documentation examples use it. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].element.displayName | STRING | yes | - | - | Display name of the project. |
| request.json.operations[].element.parentId | STRING | no | null (root level) | - | Id of the parent project; `null` for a root-level project. |

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
| ${create_project.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the project entity returned by the API (default INLINE JSON output). |
| ${create_project.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation. |
| ${create_project.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |

The documentation's output example files for this task are empty; by analogy with `data-project-patch` and `data-project-update`, `response` carries `object` (`project`), `id`, `createdAt`, `updatedAt`, `displayName`, `accessKey`, `depth`, `accountId`.

## Example

```json
{
    "name": "data-project-create",
    "taskReferenceName": "create_project",
    "description": "Create a single project",
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
                        "element": {
                            "displayName": "My New Project"
                        }
                    }
                ]
            }
        }
    }
}
```

Nested project (verbatim element): `{"displayName": "My Child Project", "parentId": "12345"}`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- The XML request page shared by every create task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value. Where a task page says otherwise (for example data-project-patch), the task page wins.
- `failOnError` is documented only on data-job-execution-create (default `false`); on this task it appears in examples or in the job schema without documentation. Treat it as probably supported, default `false`.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- Leave out any key that the input table does not list.
- `accessKey` is generated from `displayName` (see the patch and update outputs); it is not an input of this task.

## Related tasks

- `data-project-find`: check existence, resolve ids.
- `data-project-patch`, `data-project-update`, `data-project-delete`: change or remove projects.
- `data-job-find`: jobs of a project.
