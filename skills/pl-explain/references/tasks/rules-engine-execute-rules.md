# rules-engine-execute-rules

> Reference token: DF-TASK-RULES-ENGINE-EXECUTE-RULES-01

Status: GA | Category: rules-engine | Documentation: https://learn.product-live.com/data-factory/references/tasks/rules-engine-execute-rules/

## Purpose

"Execute rules of the rules engine." Runs the mapping rules defined on a target table over a set of items and, by default, writes the computed values back to the items.

## When to use

- Recompute mapped attributes after a source import.
- On demand from a user selection (`USER_SELECTION`), on whole partitions (`ALL`) or on items filtered by an `<Items-Request>` document (`REQUEST`).
- Dry run with `importComputedItems: "NO"`: the computed items are only returned as a file.

## When not to use

- Creating items: "Executing mapping rules only ever updates existing items. It never creates one, whatever the rules say."
- Defining the rules themselves (`rules-engine-import-rules`).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| mode | ENUM | yes | | USER_SELECTION, ALL, REQUEST | No description in the documentation. `USER_SELECTION`: items selected in the app when the job is launched; `ALL`: all items of the given `partitions`; `REQUEST`: items selected by `request` |
| tableKey | STRING | if mode is ALL or REQUEST | | | "The target table key." (the examples also pass it with `USER_SELECTION`) |
| accountKey | STRING | if mode is ALL or REQUEST | | | "The account key of the partner owning the shared table." (examples pass `""` for an own table) |
| partitions | ARRAY of STRING | if mode is ALL | | | "To limit the execution to some specific partitions." for example `["active"]` |
| request | FILE | if mode is REQUEST | | | "An XML file containing the request to select the items to execute the rules on. The expected format is the same as the export items task request parameter." (see `table-export-items`) |
| importComputedItems | ENUM | no | YES | YES, NO | "YES: The computed items will be imported. NO: The computed items will not be imported, but will be available in the output of the task." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${execute_rules.output.items} | FILE | "Items in the same format as the export items task." (usable by `table-import-items` or an XSLT) |
| ${execute_rules.output.withWarning} | ENUM YES / NO | "YES: at least one warning. NO: no warnings." |
| ${execute_rules.output.withError} | ENUM YES / NO | "YES: at least one error. NO: no errors." |
| ${execute_rules.output.report} | FILE | "An XML file containing the log of each warnings/errors." Codes: `DATE_INVALID_VALUE`, `DATE_TIME_INVALID_VALUE` (warnings), `ACTION_EXECUTION_ERROR` (error) |

## Example

```json
{
  "name": "rules-engine-execute-rules",
  "taskReferenceName": "execute_rules",
  "description": "Apply the mapping rules on the active items of the target table",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "mode": "ALL",
    "tableKey": "PRODUCTS",
    "accountKey": "",
    "partitions": [
      "active"
    ]
  }
}
```

Other documented shapes: `{"mode": "USER_SELECTION", "tableKey": "PRODUCTS", "accountKey": "", "partitions": ["active"]}`; `{"mode": "REQUEST", "request": "${export_request.output.file}"}`; dry run = the `ALL` example plus `"importComputedItems": "NO"`.

## Gotchas and limits

- Mapping limits (per target table and account): 20 000 fields with rules, 1 000 rules per field, 500 source tables, 20 000 rules per table.
- Best practice from the documentation: "Limit the execution to only active items."
- "A rule whose target element already has a formula is ignored: the rule is not executed, and a message is added to the report."
- "Emptying the source empties the target": when a copied source field is empty and the conditions are met, the target is emptied, "and it produces no log at all".
- Applying rules "triggers a recalculation of the conditional formatting of every item it touched". "Classification rules run before field rules."
- A table with no rule is not an error (a warning in the execution detail). Rules targeting archived elements are not applied; an archived identifier or matrix link used as a source reads as empty.
- Test `withError` (and `withWarning`) with a `SWITCH`; the task status alone does not tell whether rules were refused.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `rules-engine-import-rules` (defines the rules), `rules-engine-export-rules`
- `table-export-items` (request grammar, `USER_SELECTION` pattern), `table-import-items` (re-import `items` after a dry run)
- `switch` on `withError`, `notification-display-message`
