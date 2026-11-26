# data-item-link-create

> Reference token: DF-TASK-DATA-ITEM-LINK-CREATE-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-item-link-create/

## Purpose

Create item links: a link between one of your items and one of your partner's items on the same table, so that later collections retrieve the linked item and create suggestions on it even when its identifiers change.

## When to use

- After creating or matching supplier and retailer items, persist the pairing so later `exchange-*` and suggestion flows find the counterpart.

## When not to use

- Items on different tables: both items must belong to the same table.
- Creating the items themselves: use `data-item-create-or-update`.

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
| request.json.operations[].element.fromItemId | STRING | yes | - | - | Id of the source item (typically the supplier's item). |
| request.json.operations[].element.toItemId | STRING | yes | - | - | Id of the target item (typically the retailer's item). |

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
| ${create_item_link.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the item_link entity returned by the API (default INLINE JSON output). |
| ${create_item_link.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation. |
| ${create_item_link.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${create_item_link.output.result.json[0].response.tableId} | STRING | Table of the linked items; the entity also carries `fromItemId`, `toItemId`, `createdAt`, `updatedAt`. |

Verbatim output example:

```json
[
    {
        "key": "a",
        "response": {
            "object": "item_link",
            "id": "88",
            "updatedAt": "2024-07-17T15:42:11.000Z",
            "createdAt": "2024-07-17T15:42:11.000Z",
            "tableId": "1",
            "fromItemId": "789",
            "toItemId": "790"
        }
    }
]
```

## Example

```json
{
    "name": "data-item-link-create",
    "taskReferenceName": "create_item_link",
    "description": "Create item links",
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
                            "toItemId": "790"
                        }
                    }
                ]
            }
        }
    }
}
```

Chained after two create tasks (verbatim element): `"fromItemId": "${create_item_on_supplier_side.output.result.json[0].response.id}", "toItemId": "${create_item_on_retailer_side.output.result.json[0].response.id}"`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- The XML request page shared by every create task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value. Where a task page says otherwise (for example data-project-patch), the task page wins.
- `failOnError` is documented on data-job-execution-create and data-suggestion-create (default `false`); on this task it appears in examples or in the job schema without documentation. Treat it as probably supported, default `false`.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- Leave out any key that the input table does not list.
- Rate limit: creation is limited to 100 requests per minute.
- The page includes the shared 1000-element INLINE limit, which concerns fetch outputs.
- The documented example adds `"failOnError": true` at the top level of `inputParameters`.

## Related tasks

- `data-item-create-or-update`: create the items to link.
- `data-item-find`: find the item ids.
- `exchange-*` tasks: use the links during collections.
- `data-suggestion-create`: suggestions on linked items.
