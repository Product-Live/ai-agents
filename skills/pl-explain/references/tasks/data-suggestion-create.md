# data-suggestion-create

> Reference token: DF-TASK-DATA-SUGGESTION-CREATE-01

Status: alpha (a recent task, available on every account). Category: data. Documentation: https://learn.product-live.com/data-factory/references/tasks/data-suggestion-create/

## Purpose

Create suggestions: proposed field values on an existing item, to be reviewed and applied later. Every documentation example uses an enrichment process as emitter (`emitterName`).

## When to use

- Push proposed values (text, numbers, options, dates, images or attachments by URL) onto an item without overwriting it; a reviewer or `data-suggestion-apply*` then applies them.

## When not to use

- Writing values directly on the item: `data-item-create-or-update`.
- Creating suggestions in bulk from a partner's publications: `exchange-create-suggestions`.

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
| failOnError | BOOLEAN | no | false | true, false | Every operation is attempted. If true, the task then ends FAILED when at least one request was refused (status 400 or more), after other suggestions were created. If false, the task completes with each response, including errors. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].element.object | STRING | yes | - | suggestion_create | Must be `suggestion_create`. |
| request.json.operations[].element.itemId | STRING | yes | - | - | Id of the item to create the suggestion for. |
| request.json.operations[].element.screenId | STRING | yes | - | - | Id of the screen defining which fields are included. |
| request.json.operations[].element.hasCreatedItem | BOOLEAN | yes | - | true, false | Whether the suggestion includes a newly created item (informational, but required). |
| request.json.operations[].element.emitterName | STRING | no | - | - | Name of the entity creating the suggestion. |
| request.json.operations[].element.fields | ARRAY | yes | - | - | Field values to suggest. |
| request.json.operations[].element.fields[].key | STRING | yes | - | - | Key of the field. |
| request.json.operations[].element.fields[].type | ENUM | yes | - | SINGLE-LINE-TEXT, LONG-TEXT, HTML-TEXT, IDENTIFIER, CLASSIFICATION, DATE, DATE-TIME, NUMBER, SINGLE-SELECT, MULTIPLE-SELECT, IMAGE, ATTACHMENT, MULTIPLE-SELECT-QUANTIFIED, MULTIPLE-SELECT-WITH-COMMENTS, MULTIPLE-SELECT-QUANTIFIED-WITH-COMMENTS | Field type. A type that disagrees with the table definition is replaced by the real type before validation. |
| request.json.operations[].element.fields[].value | OBJECT | yes | - | - | `{"data": ...}` plus `suffix` for NUMBER. |
| request.json.operations[].element.fields[].value.data | ANY | yes | - | depends on the type (table below) | The suggested value. |

`value` per field type (from the documentation):

| Field type | value |
| --- | --- |
| SINGLE-LINE-TEXT, LONG-TEXT, IDENTIFIER, CLASSIFICATION, HTML-TEXT, DATE, DATE-TIME | `{"data": "a string"}` |
| SINGLE-SELECT | `{"data": "OPTION_KEY"}` (the option key, not its label) |
| MULTIPLE-SELECT | `{"data": ["OPTION_KEY", "OTHER_KEY"]}` |
| NUMBER | `{"data": 42}`, optionally `{"data": 42, "suffix": "cm"}` |
| IMAGE, ATTACHMENT | `{"data": {"url": "https://..."}}` |
| MULTIPLE-SELECT-QUANTIFIED, MULTIPLE-SELECT-WITH-COMMENTS, MULTIPLE-SELECT-QUANTIFIED-WITH-COMMENTS | `{"data": [{"key": "OPTION_KEY", "quantity": 2, "comment": "a note"}]}` (`quantity` and `comment` optional) |

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
| ${create_suggestion.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the suggestion entity returned by the API (default INLINE JSON output). |
| ${create_suggestion.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation (note the extra `.response` compared with find tasks). |
| ${create_suggestion.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${create_suggestion.output.result.json[0].element} | OBJECT | Echo of the submitted element (specific to this task). |
| ${create_suggestion.output.result.json[0].response.toItemId} | STRING | Target item; the response also carries `object` (`suggestion`), `fromItemId`, `screenId`, `hasCreatedItem`, `emitterName`, `isAcknowledged` (false), `fromAccountId`, `deletedFields` ([]), `deletedCompositeRows` ([]), `createdAt`, `updatedAt`. |

## Example

```json
{
    "name": "data-suggestion-create",
    "taskReferenceName": "create_suggestion",
    "description": "Create a suggestion for a given item",
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
                            "object": "suggestion_create",
                            "itemId": "12345",
                            "screenId": "67890",
                            "hasCreatedItem": false,
                            "emitterName": "Product-Live AI agent",
                            "fields": [
                                {
                                    "key": "TITLE_EN",
                                    "type": "SINGLE-LINE-TEXT",
                                    "value": {
                                        "data": "Some title better than the original"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    }
}
```

## Gotchas and limits

- An empty `operations` list fails the task. Use a SWITCH to skip creation when a computed list is empty.

- Alpha task: a recent task, available on every account.
- The creation and update of suggestions is limited to 100 suggestions per minute. This page does not include the 1000-element INLINE limit.
- A field key the table does not hold (or holds archived) is dropped silently: a suggestion that comes back with fewer fields than you sent is the sign to check those keys. `{"data": 42}` on a text field and `{"data": "42"}` on a NUMBER are both refused.
- Images and attachments: any http or https URL, downloaded while the suggestion is created (a Product-Live-hosted file is copied). IMAGE must be JPEG, PNG, WebP or GIF, under 20 MB and under 50 megapixels; ATTACHMENT under 2 GB, format not checked (an address answering with an error page is attached as that page); a hotlink 403 is a refusal. Image field (verbatim): `{ "key": "FRONT_VIEW", "type": "IMAGE", "value": { "data": { "url": "https://www.example.com/media/ref-1234-front.jpg" } } }`.
- Keep the fields whose value is an address in an operation of their own: operations run one by one and a failing one does not stop the others, so a dead address then costs its own fields instead of every field suggested for that item (verbatim tip).
- `hasCreatedItem` is required even though it is informational; `context` is `{}` in the file examples.
- `failOnError` defaults to false. When true, all operations are still attempted before the task fails if any request was refused; this is not a rollback.
- The XML request text shared by every write task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value; it is pulled into this page too. It does not describe this task.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- `request` is required per docs and per schema. Leave out any key that the input table does not list.

## Related tasks

- `data-suggestion-find`, `data-suggestion-apply`, `data-suggestion-apply-all`.
- `data-screen-find`: resolve `screenId`; `data-item-find`: resolve `itemId`.
