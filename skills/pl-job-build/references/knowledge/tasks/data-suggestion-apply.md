# data-suggestion-apply

> Reference token: DF-TASK-DATA-SUGGESTION-APPLY-01

Status: alpha (a recent task, available on every account). Category: data. Documentation: https://learn.product-live.com/data-factory/references/tasks/data-suggestion-apply/

## Purpose

Apply suggestions: the proposed field values are copied to the target item and the suggestion is marked as acknowledged. Optionally apply only specific fields of the suggestion.

## When to use

- Id-based acceptance of individual suggestions, all fields or a subset (`fieldsKey`).

## When not to use

- Fields deleted in the suggestion must be removed from the item too: `data-suggestion-apply-all`.
- Applying every suggestion attached to a list of exported items: `exchange-apply-suggestions`.

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
| request.json.operations[].context | OBJECT | yes (suggestionId) | - | - | Extra context the operation needs (listed below when applicable). |
| request.json.operations[].lookups | ARRAY | no | - | - | Resolves business keys into ids for this operation (lookups reference, alpha); assign must start with element., options. or context. |
| request.json.lookups | ARRAY | no | - | - | Same mechanism, declared once for the whole request. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create and data-suggestion-create) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Undocumented on this task; accepted by the job schema and used in several documentation examples of this family. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].context.suggestionId | STRING | yes | - | - | Id of the suggestion to apply. |
| request.json.operations[].element.isAcknowledged | BOOLEAN | no | - | true, false | `true` marks the suggestion as acknowledged when applying. |
| request.json.operations[].element.fieldsKey | ARRAY | no | all fields | - | Field keys to apply; when omitted, all fields are applied. |
| request.json.operations[].element.compositeFields | ARRAY | no | - | - | Composite field operations to apply; the documentation only points to an undocumented internal type name, so the shape is unknown. |

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
| ${apply_suggestion.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the suggestion entity returned by the API (default INLINE JSON output). |
| ${apply_suggestion.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation (note the extra `.response` compared with find tasks). |
| ${apply_suggestion.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${apply_suggestion.output.result.json[0].response.isAcknowledged} | BOOLEAN | Acknowledged flag after the apply; the response holds `object` (`suggestion`), `id`, `updatedAt`, `isAcknowledged`. |

## Example

```json
{
    "name": "data-suggestion-apply",
    "taskReferenceName": "apply_suggestion",
    "description": "Apply all fields from suggestion",
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
                            "suggestionId": "45678"
                        },
                        "element": {
                            "isAcknowledged": true
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
- The creation and update of suggestions is limited to 100 suggestions per minute.
- INLINE output is limited to 1000 elements; beyond that the task ends with an error. Use `options.limit`, or declare an ATTACHMENT output (`outputs: [{"mediaType": "application/xml", "outputMode": "ATTACHMENT", "outputKey": "xml"}]`) for large result sets.
- Subset form (verbatim element): `{ "isAcknowledged": true, "fieldsKey": ["TITLE_EN", "DESCRIPTION_EN"] }`.
- This task does not remove fields that were deleted in the suggestion; `data-suggestion-apply-all` does.
- `compositeFields` is documented only by reference to an internal type name; its shape is undocumented, do not emit it without checking with Product-Live.
- The XML request text shared by every write task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value; it is pulled into this page too. It does not describe this task.
- `failOnError` is documented on data-job-execution-create and data-suggestion-create (default `false`): operations run one by one and a rejected operation does not stop the others unless `failOnError` is `true`.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- `request` is required per docs and per schema. Leave out any key that the input table does not list.

## Related tasks

- `data-suggestion-apply-all`: full synchronization including deletions.
- `data-suggestion-find`: resolve suggestion ids (for example pending ones).
- `data-suggestion-create`, `exchange-apply-suggestions`.
