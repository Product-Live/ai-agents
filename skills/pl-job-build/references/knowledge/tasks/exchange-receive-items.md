# exchange-receive-items

> Reference token: DF-TASK-EXCHANGE-RECEIVE-ITEMS-01

Status: GA (no alpha banner on the page). Category: exchange. Documentation: https://learn.product-live.com/data-factory/references/tasks/exchange-receive-items/

## Purpose

Receive items from partners. It must be used with the Send Items task: this task is the body of the receive job that `exchange-send-items` triggers through `receiveJobKey`, and collects the suggestions that the sender created.

## When to use

- The job named by a supplier's `exchange-send-items` (`receiveJobKey`), on the table owner side.

## When not to use

- Publications produced by `exchange-create-publications`: use `exchange-create-suggestions`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| exist | ENUM | yes (per docs and per schema) | - | SUGGEST, UPDATE | Behaviour when the item exists in the target table: `SUGGEST` proposes an update to the user; `UPDATE` automatically applies all suggested updates. |
| matching | OBJECT | yes (per docs and per schema) | - | - | Reconciliation rules: `first` then `second` to `fifth`; no match creates a new item. |
| matching.first | STRING | yes, inside matching | - | - | Key of the first identifier. |
| matching.second | STRING | no | - | - | Next identifier, in order; likewise `matching.third`, `matching.fourth`, `matching.fifth`. |
| handleDeletedValues | BOOLEAN | no | - | true, false | Collect deleted field values: a field deletion is published when it is empty and there was a value in the last published suggestion. |
| new | STRING (seen only in the example) | no | - | CREATE (seen) | Undocumented: `"new": "CREATE"` appears in the example but not in the input table nor in the schema. |
| skipReportGeneration | BOOLEAN | no | false | true, false | `true` skips the report; the `report` output is then absent. |
| logLevel | ENUM | no | info | error, warning, info, debug | Minimum level of the logs written in the report (error < warning < info < debug). |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${receive_items.output.createdItemsCount} | NUMBER | Items created. |
| ${receive_items.output.updatedItemsCount} | NUMBER | Items updated. |
| ${receive_items.output.allSuccess} | ENUM | `YES` or `NO`. |
| ${receive_items.output.report} | FILE | XML report; codes `ITEM_CREATED_IN_COLLECT`, `ITEM_UPDATED_IN_COLLECT`, `SUGGESTION_CREATED` (info); `IDENTIFIER_NOT_FOUND`, `IDENTIFIER_IS_ARCHIVED`, `IDENTIFIER_ALREADY_EXISTS`, `NO_MATCHING_OPTIONS_RECEIVED`, `ITEM_QUOTA_ERROR`, `MAX_ITEM_SIZE`, `TECHNICAL_ERROR` (error, each rejects that one suggestion and the task carries on). |

## Example

```json
{
    "name": "exchange-receive-items",
    "taskReferenceName": "receive_items",
    "description": "Receive products",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "new": "CREATE",
        "exist": "SUGGEST",
        "matching": {
            "first": "EAN"
        },
        "handleDeletedValues": true
    }
}
```

## Gotchas and limits

- Publish and receive up to 10000 items at a time, on up to 3 screens.
- Suggestion lifecycle: `SENT` (partner published with Send Items), then `RECEIVED` (collected successfully) or `REJECTED` (collect failed), then `ACKNOWLEDGED` (applied; item created or updated). When collecting a suggestion fails, the task opens a system comment thread on the publication, owned by and assigned to the sending account, holding the reason.
- A `COMPLETED` task can still have rejected suggestions: check `allSuccess` and the report.
- The page never says where the input suggestions come from: the `suggestionIds` of the sender are handed to the receive job named in `receiveJobKey`; there is no explicit input for them.
- The page has no "Task name" line (the name appears only in the example) and `new` is used in the example without documentation.
- Report inputs: `skipReportGeneration` and `logLevel` are documented through the shared report include; the schema branch lists only `exist`, `matching`, `handleDeletedValues`.

## Related tasks

- `exchange-send-items`: sender side.
- `data-suggestion-apply`: manual apply of the collected suggestions.
