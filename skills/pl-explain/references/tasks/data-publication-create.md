# data-publication-create

> Reference token: DF-TASK-DATA-PUBLICATION-CREATE-01

Status: alpha (a recent task, available on every account). Category: data. Documentation: https://learn.product-live.com/data-factory/references/tasks/data-publication-create/

## Purpose

Create publications. A publication is a set of field values sent to a partner on a product: creating one sends your product data to a specific partner account, making it available for them to review and potentially create suggestions.

## When to use

- Low-level, id-based creation of one or many publications (one per item, partner account and screen), typically after a `data-item-find` or `data-item-create-or-update` and a `data-screen-find`.

## When not to use

- Publishing a whole table or partition by business keys: prefer `exchange-create-publications`, which also produces the publications file the partner consumes.

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
| request.json.operations[].context | OBJECT | no (empty or omitted for this task) | - | - | Extra context the operation needs (listed below when applicable). |
| request.json.operations[].lookups | ARRAY | no | - | - | Resolves business keys into ids for this operation (lookups reference, alpha); assign must start with element., options. or context. |
| request.json.lookups | ARRAY | no | - | - | Same mechanism, declared once for the whole request. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create and data-suggestion-create) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Undocumented on this task; accepted by the job schema and used in several documentation examples of this family. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].element.fromItemId | STRING | yes | - | - | Id of the source item (your item to publish). |
| request.json.operations[].element.toAccountId | STRING | yes | - | - | Id of the target partner account. |
| request.json.operations[].element.screenId | STRING | yes | - | - | Id of the screen defining which fields are included in the publication. |

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
| ${create_publication.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the publication entity returned by the API (default INLINE JSON output). |
| ${create_publication.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation (note the extra `.response` compared with find tasks). |
| ${create_publication.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${create_publication.output.result.json[0].response.status} | STRING | Status of the publication after creation: `SENT`. The entity also carries `object` (`publication`), `fromItemId`, `toAccountId`, `tableId`, `partitionId`, `screenId`, `sentAt`, `createdAt`, `updatedAt` and `fields[]` ({key, type, value: {data}}). |

## Example

```json
{
    "name": "data-publication-create",
    "taskReferenceName": "create_publication",
    "description": "Create a publication",
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
                            "fromItemId": "789",
                            "toAccountId": "234",
                            "screenId": "103"
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
- Rate limit: 100 requests per minute.
- INLINE output is limited to 1000 elements; beyond that the task ends with an error. Use `options.limit`, or declare an ATTACHMENT output (`outputs: [{"mediaType": "application/xml", "outputMode": "ATTACHMENT", "outputKey": "xml"}]`) for large result sets.
- Dynamic ids come from earlier tasks: `"fromItemId": "${create_item.output.result.json[0].response.id}"` (create result, with `.response`), `"screenId": "${find_screen.output.result.json[0].id}"` (find result, without), `"toAccountId": "${workflow.input.partnerAccountId}"`. The documented dynamic example adds `"failOnError": true`.
- No `context` is needed; the examples omit it.
- `failOnError` is documented on data-job-execution-create and data-suggestion-create (default `false`): operations run one by one and a rejected operation does not stop the others unless `failOnError` is `true`.
- The XML request text shared by every write task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value; it is pulled into this page too.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- `request` is required per docs and per schema. Leave out any key that the input table does not list.
- The task is absent from the public catalog index page (no Publication section) but present in the documentation sidebar.

## Related tasks

- `data-publication-find`, `data-publication-patch`: track and update the publications created.
- `data-screen-find`: resolve `screenId`.
- `exchange-create-publications`: bulk publication by business keys.
