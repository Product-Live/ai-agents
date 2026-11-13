# data-item-create-or-update

> Reference token: DF-TASK-DATA-ITEM-CREATE-OR-UPDATE-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-item-create-or-update/

## Purpose

Create or update items (rows) in a partition, field by field, through a list of operations.

## When to use

- Targeted writes of a few items from a job: after an AI or HTTP lookup, after a computation, to create test items.
- Updating a handful of fields on known items.

## When not to use

- Bulk imports from files: use `table-import-items`.
- Proposing values for review instead of writing them: use `data-suggestion-create`.

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
| request.json.operations[].context | OBJECT | no | - | - | "Some element may require additional context to be created or updated." The documentation does not describe the context this task expects; leave it out (or empty) unless a documented example shows one. |
| request.json.operations[].lookups | ARRAY | no | - | - | Resolves business keys into ids for this operation (lookups reference, alpha). |
| request.json.lookups | ARRAY | no | - | - | Same mechanism, declared once for the whole request. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create only) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Documented only on data-job-execution-create; the job schema accepts it on every create task and several documentation examples use it. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].element.object | STRING | yes | - | item_create, item_update | `item_create` creates the item, or updates it in place when an item with the same identifier already exists in the partition (the operation then returns the existing item's id). `item_update` updates an existing item. |
| request.json.operations[].element.fields | ARRAY | yes | - | - | Field values to write. |
| request.json.operations[].element.fields[].key | STRING | yes | - | - | Field key; an `IDENTIFIER` field is required to create new items. |
| request.json.operations[].element.fields[].type | ENUM | yes | - | field types, for example IDENTIFIER, SINGLE-LINE-TEXT, LONG-TEXT, NUMBER | Type of the field, as returned by `data-field-find`. |
| request.json.operations[].element.fields[].value | OBJECT | yes | - | - | `{"data": <value>}`. |
| request.json.operations[].element.itemMetadata | OBJECT | yes | - | - | Placement of the item. |
| request.json.operations[].element.itemMetadata.partitionId | STRING | yes | - | - | Partition where the item is created or updated. |

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

XML element for this task (fragment from the documentation, with an invented product code):

```xml
<map key="element">
  <string key="object">item_create</string>
  <array key="fields">
    <map>
      <map key="value">
        <string key="data">2000000000213</string>
      </map>
      <string key="type">IDENTIFIER</string>
      <string key="key">EAN_13</string>
    </map>
  </array>
  <map key="itemMetadata">
    <string key="partitionId">1</string>
  </map>
</map>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${create_item.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the item entity returned by the API (default INLINE JSON output). |
| ${create_item.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation. |
| ${create_item.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |

The documentation's output example files are empty; the envelope is confirmed by the `data-item-link-create` example, which reads `${create_item_on_supplier_side.output.result.json[0].response.id}` from this task.

## Example

```json
{
    "name": "data-item-create-or-update",
    "taskReferenceName": "create_item",
    "description": "Create a new item",
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
                            "object": "item_create",
                            "fields": [
                                {
                                    "key": "EAN_13",
                                    "type": "IDENTIFIER",
                                    "value": {
                                        "data": "2000000000213"
                                    }
                                },
                                {
                                    "key": "TITLE",
                                    "type": "SINGLE-LINE-TEXT",
                                    "value": {
                                        "data": "My Product Title"
                                    }
                                }
                            ],
                            "itemMetadata": {
                                "partitionId": "1"
                            }
                        }
                    }
                ]
            }
        }
    }
}
```

The update variant is identical with `"object": "item_update"` and, for example, a `DESCRIPTION` field of type `LONG-TEXT`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- The XML request page shared by every create task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value. Where a task page says otherwise (for example data-project-patch), the task page wins.
- `failOnError` is documented only on data-job-execution-create (default `false`); on this task it appears in examples or in the job schema without documentation. Treat it as probably supported, default `false`.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- Leave out any key that the input table does not list.
- The shared XML page says omitted properties are reset; for items the per-field semantics are not spelled out, so it is ambiguous whether fields omitted from an `item_update` are cleared. Send every field you care about.
- The value shape for non-text field types (selections, multi-valued fields, dates, images) is not documented on this page; see the items API (`/api/reference/content-management-api/items/` on learn.product-live.com).
- No limits section and no rate limit stated on the page.
- The partition id, not its key, is required: resolve it with `data-partition-find` or a lookup.

## Related tasks

- `data-item-find`: check existence or read current values.
- `data-item-link-create`: link the created item to a partner's item.
- `data-partition-find`: resolve `partitionId`.
- `data-field-find`: field keys and types.
- `table-import-items`: bulk import.
- `data-suggestion-create`: propose rather than write.
