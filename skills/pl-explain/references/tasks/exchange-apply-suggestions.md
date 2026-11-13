# exchange-apply-suggestions

> Reference token: DF-TASK-EXCHANGE-APPLY-SUGGESTIONS-01

Status: alpha (a recent task, available on every account). Category: exchange. Documentation: https://learn.product-live.com/data-factory/references/tasks/exchange-apply-suggestions/

## Purpose

Apply all suggestions on a list of items, and optionally mark them as read.

## When to use

- Receiver side, after a `table-export-items`, to bulk-accept the suggestions attached to the exported items, optionally restricted to screens, fields, unread ones or item-creating ones.

## When not to use

- Applying one known suggestion by id: `data-suggestion-apply` or `data-suggestion-apply-all`.
- More than 100 items at a time (see limits): split the export.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| items | FILE | yes (per docs and per schema) | - | - | An export items file: the `file` output of `table-export-items`. Item ids are required, so only files really produced by that task work. |
| isAcknowledged | STRING | no | YES | YES, NO, NO_CHANGES, YES_IF_EMPTY | `YES`: all applied suggestions set to acknowledged. `NO`: set to not acknowledged. `NO_CHANGES`: no change. `YES_IF_EMPTY`: acknowledged only if all the suggested fields are applied (requires `fields`). |
| fields | FILE | when isAcknowledged = YES_IF_EMPTY | all fields | - | XML file restricting the fields to apply: `<Fields><Field key="TITLE"/><Field key="MAIN-IMAGE"/></Fields>` (`Fields/Field/@key`, 1 or more). Typically `file://assets/fields.xml`. Declared by the job schema only when `isAcknowledged` is `YES_IF_EMPTY`. |
| domain | STRING | no | api.product-live.com | - | API domain. |
| screens | OBJECT per docs, ARRAY of screen keys in every example and in the schema | no | all screens | - | Screens on which the suggestions must be applied, for example `["ALL_ATTRIBUTES", "MEDIA"]`. |
| extraFilters | ARRAY of criteria (docs table spells it `extraFields`, OBJECT) | no | - | - | Extra filters applied when selecting suggestions, in the find-request-body "suggestions" criteria shape, for example `{ "type": "eq", "field": "isAcknowledged", "value": false }`. The examples and the job schema use `extraFilters`; prefer it. |
| hasCreatedItem | STRING (seen only in an example) | no | - | NO (seen) | Undocumented: appears as `"hasCreatedItem": "NO"` in one example and nowhere in the input table or the schema. |
| skipReportGeneration | BOOLEAN | no | false | true, false | `true` skips the report; the `report` output is then absent. |
| logLevel | ENUM | no | info | error, warning, info, debug | Minimum level of the logs written in the report (error < warning < info < debug). |

Input `fields` file grammar (verbatim):

```xml
<Fields>
    <Field key="TITLE"/>
    <Field key="MAIN-IMAGE"/>
</Fields>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${apply_suggestions.output.report} | FILE | XML execution report (absent when skipReportGeneration = true). `Report/@task` is `exchange-apply-suggestions`; each `Log` has `@type` (info, error) and `@code` (`SUGGESTION_APPLIED`, `ERROR`), `Metadata[@name='suggestionCreationDate']`, `Metadata[@name='acknowledged']`, `Metadata[@key='newItem']` (`true` when the suggestion created an item), `Metadata-Collection[@name='identifiers']`, `Metadata-Collection[@name='modifications']` with `Old-Value` and `New-Value` (and `Added`, `Modified`, `Deleted` for multivalued fields), and `Message`. |

There is no applied-count or all-success output: the report is the only result.

## Example

```json
{
    "name": "exchange-apply-suggestions",
    "taskReferenceName": "apply_suggestions",
    "description": "Apply all suggestions based on items file",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "items": "${export_items.output.file}",
        "extraFilters": [
            {
                "type": "eq",
                "field": "isAcknowledged",
                "value": false
            }
        ]
    }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- Only items files exported with `table-export-items` can be used as input (item ids are required). Only 100 items can be processed at a time.
- The input table says `extraFields` (OBJECT) but every example and the job schema say `extraFilters` (ARRAY); the documentation shows both, prefer `extraFilters`.
- The table says `NO_CHANGES`; one example writes `"isAcknowledged": "NO-CHANGES"`. The documentation shows both; prefer `NO_CHANGES`.
- `hasCreatedItem` appears only in an example (`"NO"`), undocumented; `screens` is typed OBJECT in the table but is an array of screen keys in the examples and the schema.
- The documented examples use a hyphenated `taskReferenceName` (`exchange-apply-suggestions`); use snake_case instead so that `${ref.output.report}` stays readable.
- The heading "Input options definition" of the page actually describes the `fields` file.
- Per schema only `items` is required; the schema declares `fields` only when `isAcknowledged` is `YES_IF_EMPTY`, and the VS Code extension schema branch does not list `skipReportGeneration` although the shared report include documents it (the editor may flag it).

## Related tasks

- `table-export-items`: produces the `items` file.
- `data-suggestion-apply`, `data-suggestion-apply-all`, `data-suggestion-find`: id-based alternatives.
