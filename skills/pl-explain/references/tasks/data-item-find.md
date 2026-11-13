# data-item-find

> Reference token: DF-TASK-DATA-ITEM-FIND-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-item-find/

## Purpose

Find items (rows) in one partition, in every partition of a table, in a list of partitions, or across the whole account, by id or by field value. The richest of the fetch tasks.

## When to use

- Look items up by EAN or another identifier before enriching or updating them.
- Read a few items' fields; check existence before a create.
- Iterate over the items matching a criteria.

## When not to use

- Bulk exports of a whole table as a file: use `table-export-items`.
- More than 1000 items inline: switch to an ATTACHMENT output, a `limit`, or `LIST` batches.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| apiKey | STRING | no | automatic key of the current user | - | API key used to perform the request. When omitted, an automatically generated key acts on behalf of the current user. Pass a secret global variable, never a literal. |
| findMode | ENUM | yes (per docs and per schema) | - | ALL, REQUEST, USER_SELECTION | ALL fetches every element; REQUEST fetches the elements matching request.json.criteria; USER_SELECTION builds the request from the items the user selected in the grid at launch (this task only, see the gotchas). |
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
| request.json.context | OBJECT | yes with the DEFAULT partition scope | - | - | Either form A (`partitionId`) or form B (`tableKey` + `partitionKey`); mutually exclusive; mixing ids and keys is rejected. Must not designate a partition when `findOptions.partitionSelection` is `TABLE`, `LIST` or `ALL`. |
| request.json.context.partitionId | STRING | form A | - | - | Id of the partition to search. |
| request.json.context.tableKey | STRING | form B | - | - | Business key of the table, paired with `partitionKey`. |
| request.json.context.partitionKey | STRING | form B | - | - | Business key of the partition. |
| request.json.context.levelId | STRING | on a multi-level table | - | - | Level to read; required on a multi-level table. |
| request.json.options.includedFieldKeys | ARRAY | no | all fields | root field keys | Whitelist of field keys kept in each item's `fields[]`; `[]` gives `fields: []`; unknown keys ignored; root metadata (`id`, `itemMetadata`, `createdAt`, `updatedAt`, `parent`, `children`) always kept; composite fields returned whole; no dot notation; not a security mechanism. |
| findOptions | OBJECT | no | - | - | Scope options. |
| findOptions.partitionSelection | ENUM | no | DEFAULT | DEFAULT, TABLE, LIST, ALL | Partition scope (matrix below). |
| findOptions.tableKey | STRING | with TABLE; with LIST when partitionKeys is used | - | - | Table business key; forbidden with `partitionIds`. |
| findOptions.partitionKeys | ARRAY | LIST only | - | 1 to 1000 keys, deduplicated, every key must exist | Partition keys inside `findOptions.tableKey`. |
| findOptions.partitionIds | ARRAY | LIST only | - | 1 to 1000 ids, deduplicated | Partition ids; exclusive with `partitionKeys` and `tableKey`. |
| levelId | STRING | no | - | - | `USER_SELECTION` mode only: overrides the level resolved from the launch screen. |

Scope matrix (`findMode` x `findOptions.partitionSelection`):

| findMode | partitionSelection | Items returned |
| --- | --- | --- |
| REQUEST | DEFAULT | Items matching `criteria` in the partition designated by `context`. |
| ALL | DEFAULT | Every item of that partition. |
| REQUEST | TABLE | Items matching `criteria` across every partition of `findOptions.tableKey`. |
| ALL | TABLE | Every item of the table. |
| REQUEST | LIST | Items matching `criteria` across the listed partitions. |
| ALL | LIST | Every item of the listed partitions. |
| REQUEST | ALL | Items matching `criteria` across every partition of the account. |
| ALL | ALL | Every item of the account. |

Field targeting: to search on an item field instead of a root property, `criteria.field` is an object `{"target": "item.fields", "key": "<field key>"}` (both required):

```json
{
    "criteria": {
        "type": "eq",
        "caseSensitive": true,
        "field": {
            "target": "item.fields",
            "key": "EAN_13"
        },
        "value": "2000000000046"
    }
}
```

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
| ${find_items.output.totalElements} | NUMBER | Total number of elements returned by the task. |
| ${find_items.output.result.json} | ARRAY | Array of item objects (default INLINE JSON output). |
| ${find_items.output.result.json[0].id} | STRING | Id of the first element. |
| ${find_items.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. Usable wherever a FILE is expected. |
| ${find_items.output.result.json[0].fields} | ARRAY | Field values: `{"key": "EAN_13", "type": "IDENTIFIER", "value": {"data": "1234567890123"}}`. |
| ${find_items.output.result.json[0].itemMetadata} | OBJECT | `tableId`, `tableKey`, `tableOwnerAccountId`, `levelId`, `levelKey`, `partitionId`, `createdAt`, `updatedAt`. |
| ${find_items.output.result.json[0].parent} | OBJECT | On child-level items: the ancestor item (itself with `fields` and `parent`). |

## Example

```json
{
    "name": "data-item-find",
    "taskReferenceName": "find_items",
    "description": "Find items by EAN code",
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
                    "partitionId": "102"
                },
                "criteria": {
                    "type": "eq",
                    "caseSensitive": true,
                    "field": {
                        "target": "item.fields",
                        "key": "EAN_13"
                    },
                    "value": "2000000000046"
                }
            }
        }
    }
}
```

Whole-table scope: replace `context` by `"findOptions": {"partitionSelection": "TABLE", "tableKey": "PRODUCTS"}` at the top level of `inputParameters` and keep only `criteria` in `json`. Other documented variants: by ids (`"type": "in", "field": "id"`), by keys (`"context": {"tableKey": "PRODUCTS", "partitionKey": "ACTIVES"}`), every item of a partition (`"findMode": "ALL"`, `"options": {"limit": 500}`), account-wide (`"partitionSelection": "ALL"`), whitelist (`"options": {"includedFieldKeys": ["EAN_13", "TITLE"]}`), multi-level (`"context": {"partitionId": "102", "levelId": "104"}`).

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- INLINE output is limited to 1000 elements; beyond that the task ends with an error. Use `options.limit`, or declare an ATTACHMENT output (`outputs: [{"mediaType": "application/xml", "outputMode": "ATTACHMENT", "outputKey": "xml"}]`) for large result sets.
- `criteria` is a single object: use `in` or `notIn` for lists of values and `and` or `or` with `queries[]` for several conditions.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task (for example an XSLT output) or a `file://assets/<name>.xml` asset.
- `options.limit` is typed STRING in the shared table but written as a JSON number in every example; `sortOrder` appears as `ASC`/`DESC` in JSON and `asc`/`desc` in XML. The documentation shows both; prefer uppercase in JSON.
- Only `findMode` is required per schema; `request` is required per docs when `findMode = REQUEST`. Leave out any key that the input table above does not list.
- Searchable fields and full operator list: `/api/reference/find-request-body/` on learn.product-live.com.
- Multi-partition scopes run the same request once per partition and merge the results: `totalElements` is the sum, nothing says which partition an item came from, and one failing partition fails the task. `TABLE` and `LIST` iterate over at most 1000 partitions; `ALL` covers at most 100 tables of 100 partitions each; `TABLE` fails on a table with no partition or with 1000 partitions; `TABLE` cannot be narrowed with `partitionKeys` or `partitionIds`.
- Designating a partition in `request.json.context` together with `TABLE`, `LIST` or `ALL` fails with `findOptions.partitionSelection: "..." is mutually exclusive with request.json.context.{...}`.
- Multi-level tables need `context.levelId`: get it with `data-level-find` (or from the screen with `data-screen-find`).
- `includedFieldKeys` dramatically reduces the payload; use it whenever only a few fields are needed.
- `findMode: "USER_SELECTION"` (request built from the items the user selected in the grid at launch; the task resolves the level from the launch screen, and the top-level `levelId` overrides it) is documented on this page only: the shared `findMode` table of the fetch tasks lists `ALL` and `REQUEST`. The VS Code extension schema lists neither `USER_SELECTION` nor `findOptions`, `levelId` or `pageSize`, so the editor may flag them; the documentation is the authority.

## Related tasks

- `data-level-find`: resolve `levelId`.
- `data-partition-find`: resolve `partitionId`.
- `data-item-create-or-update`, `data-item-link-create`: write items found here.
- `table-export-items`: bulk export as a file.
- `json-transform-jq`, `code-execute-javascript`: post-process `fields[]`.
