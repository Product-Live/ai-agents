# data-field-find

> Reference token: DF-TASK-DATA-FIELD-FIND-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-field-find/

## Purpose

Find the fields (schema columns) of a table: identifiers, text fields, numbers, dates, selections, images and more.

## When to use

- Discover a table's schema before building an import or an export.
- Resolve a field id from its key (needed by `data-field-value-find`).
- Check a field's `type` before writing values with `data-item-create-or-update`.

## When not to use

- Exporting the whole schema as a file: use `table-export-schema`.
- Reading the options of a selection field: use `data-field-value-find`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| apiKey | STRING | no | automatic key of the current user | - | API key used to perform the request. When omitted, an automatically generated key acts on behalf of the current user. Pass a secret global variable, never a literal. |
| findMode | ENUM | yes (per docs and per schema) | - | ALL, REQUEST | ALL fetches every element; REQUEST fetches the elements matching request.json.criteria. |
| request | OBJECT | when findMode = REQUEST (optional per schema) | - | - | The request document. Documentation examples pass it even with findMode = ALL, to carry options.limit. |
| request.contentType | STRING | yes, inside request | - | application/json, application/xml | Content type of the request body. |
| request.method | ENUM | yes, inside request | - | INLINE, ATTACHMENT | INLINE: the body is given in request.json. ATTACHMENT: the body is given as a file in request.file. |
| request.model | ENUM | no | default | default | Model of the request; the examples always spell it out. |
| request.json | OBJECT | when method = INLINE and contentType = application/json | - | - | The request body: context (when the task needs one), criteria, options, lookups. |
| request.json.criteria | OBJECT | no | - | see the grammar below | A single criteria object. Combine conditions with and or or plus queries[]. |
| request.json.options | OBJECT | no | - | - | Holds limit, sort and sortOrder. |
| request.json.options.limit | STRING (written as a JSON number in every example) | no | no limit | - | Maximum number of elements returned. |
| request.json.options.sort | STRING | no | - | - | Field to sort the elements by. |
| request.json.options.sortOrder | ENUM | no | - | ASC, DESC | Sort order. XML examples also use lowercase asc and desc; case sensitivity is not documented. |
| request.json.lookups | ARRAY | no | - | - | Resolves business keys into ids before the request is sent (lookups reference, alpha). |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| pageSize | NUMBER | no | 200 | 1 to 1000 (higher values are clamped) | Number of elements fetched per page when the results are paginated. |
| request.json.context | OBJECT | yes, even with findMode = ALL | - | - | Scope of the search. |
| request.json.context.tableId | STRING | yes | - | - | Id of the table whose fields are searched. |

Searchable fields seen in the documentation: `key` (for example `TITLE_EN`), `type` (for example `SINGLE-LINE-TEXT`), `title` (`search`), `levelId` and `metadata.<key>`; sort by `key`. Metadata values are strings, for example `"true"`, and the match ignores case. Combine metadata, levelId and field type criteria with `and` and `queries`.

### Request grammar (shared by every data-*-find task)

`request.json` follows the JSON query language of the Product-Live API (`/api/reference/find-request-body/` on learn.product-live.com). `criteria` is a single object, not an array; `caseSensitive` (boolean, default `false`) may be added to any criteria. Operators seen in the documentation: `eq`, `search` (partial text match), `in`, `notIn`, `and`, `or`, `greater`, `greaterOrEqual`, `lower`, `lowerOrEqual`.

```json
{
  "criteria": {
    "type": "and",
    "queries": [
      { "type": "search", "caseSensitive": true, "field": "name", "value": "John" },
      { "type": "in", "field": "id", "value": ["123", "456", "789"] }
    ]
  },
  "options": {
    "sort": "createdAt",
    "sortOrder": "DESC",
    "limit": 50
  }
}
```

With `request.method = "ATTACHMENT"` and `request.contentType = "application/xml"`, the same structure is written in the W3C JSON-to-XML form (`<map>`, `<array>`, `<string key>`, `<number key>`, `<boolean key>`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<map xmlns="http://www.w3.org/2005/xpath-functions">
  <map key="options">
    <string key="limit">10</string>
    <string key="sort">name</string>
    <string key="sortOrder">asc</string>
  </map>
  <map key="criteria">
    <string key="field">name</string>
    <string key="type">eq</string>
    <string key="value">John</string>
  </map>
</map>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${find_fields.output.totalElements} | NUMBER | Total number of elements returned by the task. |
| ${find_fields.output.result.json} | ARRAY | Array of field objects (default INLINE JSON output). |
| ${find_fields.output.result.json[0].id} | STRING | Id of the first element. |
| ${find_fields.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. Usable wherever a FILE is expected. |
| ${find_fields.output.result.json[0].key} | STRING | Field key; the entity also carries `object` (`field`), `tableId`, `levelId`, `type`, `title`, `titleLocal`, `description`, `descriptionLocal`, `multiValued`, `isUnique`, `metadata`, `displayInfo` (`prefix`, `suffix`, `precision`). |
| ${find_fields.output.result.json[0].type} | STRING | Field type, for example `IDENTIFIER`, `SINGLE-LINE-TEXT`, `LONG-TEXT`, `NUMBER`, `SINGLE-SELECT`, `MULTIPLE-SELECT`. |

## Example

```json
{
    "name": "data-field-find",
    "taskReferenceName": "find_fields",
    "description": "Find fields by type",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "findMode": "REQUEST",
        "request": {
            "method": "INLINE",
            "contentType": "application/json",
            "model": "default",
            "json": {
                "context": {
                    "tableId": "101"
                },
                "criteria": {
                    "type": "eq",
                    "field": "type",
                    "value": "SINGLE-LINE-TEXT"
                }
            }
        }
    }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- INLINE output is limited to 1000 elements; beyond that the task ends with an error. Use `options.limit`, or declare an ATTACHMENT output (`outputs: [{"mediaType": "application/xml", "outputMode": "ATTACHMENT", "outputKey": "xml"}]`) for large result sets.
- `criteria` is a single object: use `in` or `notIn` for lists of values and `and` or `or` with `queries[]` for several conditions.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task (for example an XSLT output) or a `file://assets/<name>.xml` asset.
- `options.limit` is typed STRING in the shared table but written as a JSON number in every example; `sortOrder` appears as `ASC`/`DESC` in JSON and `asc`/`desc` in XML. The documentation shows both; prefer uppercase in JSON.
- Only `findMode` is required per schema; `request` is required per docs when `findMode = REQUEST`. Leave out any key that the input table does not list.
- Searchable fields and full operator list: `/api/reference/find-request-body/` on learn.product-live.com.
- `request.json.context.tableId` is required even with `findMode: "ALL"`; it is not part of the shared fetch table.
- The task needs the table id, not its key: resolve it with `data-table-find` or a lookup.
- The full list of field types is not given on this page.

## Related tasks

- `data-field-value-find`: options of a selection field.
- `data-level-find`: levels referenced by `levelId`.
- `data-table-find`: resolve the table id.
- `table-export-schema`: export the schema as a file.
- `data-item-create-or-update`: write values with the right `type`.
