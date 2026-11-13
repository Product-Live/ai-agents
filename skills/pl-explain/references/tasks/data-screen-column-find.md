# data-screen-column-find

> Reference token: DF-TASK-DATA-SCREEN-COLUMN-FIND-01

Status: alpha (a recent task, available on every account). Category: data. Documentation: https://learn.product-live.com/data-factory/references/tasks/data-screen-column-find/

## Purpose

Find screen columns. Screen columns define which fields appear as columns in a screen and their display properties (position, width, read-only, fixed).

## When to use

- Introspect a screen's layout (which `fieldId`s, in what `position`), for example to build an export template or to decide which fields a suggestion or publication will carry.

## When not to use

- Resolving field keys and types: `data-field-find`.
- Listing screens or sections: `data-screen-find`, `data-screen-section-find`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| apiKey | STRING | no | automatic key of the current user | - | API key used to perform the request. When omitted, an automatically generated key acts on behalf of the current user. Pass a secret global variable, never a literal. |
| findMode | ENUM | yes (per docs and per schema) | - | ALL, REQUEST | ALL fetches every element; REQUEST fetches the elements matching request.json.criteria. |
| request | OBJECT | when findMode = REQUEST per docs (optional per schema) | - | - | The request document. Documentation examples pass it even with findMode = ALL, to carry options.limit or context. |
| request.contentType | STRING | yes, inside request | - | application/json, application/xml | Content type of the request body. |
| request.method | ENUM | yes, inside request | - | INLINE, ATTACHMENT | INLINE: the body is given in request.json. ATTACHMENT: the body is given as a file in request.file. |
| request.model | ENUM | no | default | default | Model of the request; the examples always spell it out. |
| request.json | OBJECT | when method = INLINE and contentType = application/json | - | - | The request body: context (when the task needs one), criteria, options, lookups. |
| request.json.context | OBJECT | yes | - | - | Scope of the search. |
| request.json.context.screenSectionId | STRING | yes, inside context | - | - | Id of the screen section to search columns in. |
| request.json.criteria | OBJECT | no | - | see the grammar below | A single criteria object; combine conditions with and or or plus queries[]. Only applied when findMode = REQUEST. |
| request.json.options | OBJECT | no | - | - | Holds limit, sort and sortOrder. |
| request.json.options.limit | STRING (written as a JSON number in every example) | no | no limit (the maximum available) | - | Maximum number of elements returned. |
| request.json.options.sort | STRING | no | - | - | Field to sort the elements by. |
| request.json.options.sortOrder | ENUM | no | - | ASC, DESC | Sort order. XML examples also use lowercase asc and desc; case sensitivity is not documented. |
| request.json.lookups | ARRAY | no | - | - | Resolves business keys into ids before the request is sent (lookups reference, alpha): taskName, assign, and one of entityKey, entityKeys or criteria. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| pageSize | NUMBER | no | 200 | 1 to 1000 (higher values are clamped) | Number of elements fetched per page when the results are paginated. Documented in the shared fetch table; absent from the VS Code extension schema branch of this task. |

Searchable fields seen in the documentation: `fieldId`, `isFixed`; sort by `position`.

### Request grammar (shared by every data-*-find task)

`request.json` follows the JSON query language of the Product-Live API (`/api/reference/find-request-body/` on learn.product-live.com). `criteria` is a single object, not an array; `caseSensitive` (boolean, default `false`) may be added to any criteria. Operators seen in the documentation: `eq`, `search` (partial text match), `in`, `and`, `or`, `greater`, `greaterOrEqual`, `lower`, `lowerOrEqual`.

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

With `request.method = "ATTACHMENT"` and `request.contentType = "application/xml"`, the same structure is written in the W3C JSON-to-XML form (`<map>`, `<array>`, `<string key>`, `<number key>`, `<boolean key>`; the documentation shows both `<?xml version="1.0"?>` and `<?xml version="1.1"?>` prologs, prefer 1.0):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<map xmlns="http://www.w3.org/2005/xpath-functions">
  <map key="options">
    <number key="limit">100</number>
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
| ${find_screen_columns.output.totalElements} | NUMBER | Total number of elements returned by the task. |
| ${find_screen_columns.output.result.json} | ARRAY | Array of screen_column objects (default INLINE JSON output, no key/response wrapper). |
| ${find_screen_columns.output.result.json[0].id} | STRING | Id of the first element. |
| ${find_screen_columns.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. Usable wherever a FILE is expected. |
| ${find_screen_columns.output.result.json[0].fieldId} | STRING | Field shown by the first column; the entity also carries `object` (`screen_column`), `position` (number), `width` (for example `MEDIUM`), `isFixed`, `isReadOnly`, `isLinesReadOnly`, `screenSectionId`, `createdAt`, `updatedAt`. |

## Example

```json
{
    "name": "data-screen-column-find",
    "taskReferenceName": "find_screen_columns",
    "description": "Find all columns for a screen section",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "findMode": "ALL",
        "request": {
            "method": "INLINE",
            "contentType": "application/json",
            "model": "default",
            "json": {
                "context": {
                    "screenSectionId": "105"
                },
                "options": {
                    "limit": 100
                }
            }
        }
    }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- INLINE output is limited to 1000 elements; beyond that the task ends with an error. Use `options.limit`, or declare an ATTACHMENT output (`outputs: [{"mediaType": "application/xml", "outputMode": "ATTACHMENT", "outputKey": "xml"}]`) for large result sets.
- Reaching the columns needs the chain table, screen, screen section, columns (three find tasks) unless the ids are already known; `context.screenSectionId` is documented under "Context requirements", not in the shared fetch table.
- `options.limit` is typed STRING in the shared table but written as a JSON number in every example; `sortOrder` appears as `ASC`/`DESC` in JSON and `asc`/`desc` in XML. The documentation shows both; prefer uppercase in JSON.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- Only `findMode` is required per schema; `request` is required per docs when `findMode = REQUEST`. Leave out any key that the input table does not list.

## Related tasks

- `data-screen-find`, `data-screen-section-find`: resolve the screen section id.
- `data-field-find`: field definitions behind `fieldId`.
