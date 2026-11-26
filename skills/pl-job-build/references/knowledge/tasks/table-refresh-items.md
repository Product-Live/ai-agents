# table-refresh-items

> Reference token: DF-TASK-TABLE-REFRESH-ITEMS-01

Status: GA | Category: table | Documentation: https://learn.product-live.com/data-factory/references/tasks/table-refresh-items/

## Purpose

"This task allows to manually perform a full item refresh on a given table. This may be useful if an error occurred while updating a table or if you voluntarily skipped the automatic refresh that occurs after a table update."
It recomputes formulas and conditional formattings of the items.

## When to use

- Right after a `table-import-schema` run with `skipItemRefresh: "YES"` that changed formulas, conditional formattings or options.
- Maintenance jobs after a failed automatic refresh.

## When not to use

- Ordinary business jobs: the refresh happens automatically after a structure update.
- Inside `task-batch-execute` (excluded task).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| mode | ENUM | yes | | ALL, BY_TABLE_KEY, BY_TABLE_ID | "When set to ALL, all tables in the current account will be refreshed. When set to BY_TABLE_KEY, only the table with the given key will be refreshed. When set to BY_TABLE_ID, only the table with the given id will be refreshed." |
| tableKey | STRING | if mode is BY_TABLE_KEY | | | "The key of the table to refresh" |
| tableId | STRING | if mode is BY_TABLE_ID | | | "The id of the table to refresh" |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

No `accountKey`: only tables of the current account.

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${refresh_items.output.updatedItems} | NUMBER | "The number of items that have been updated." |
| ${refresh_items.output.report} | FILE | Execution report (report inputs are documented; the output table does not list it) |

## Example

```json
{
  "name": "table-refresh-items",
  "taskReferenceName": "refresh_items",
  "description": "Recompute formulas and conditional formattings of the products table",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "mode": "BY_TABLE_KEY",
    "tableKey": "PRODUCTS"
  }
}
```

`mode: "ALL"` takes no other input.

## Gotchas and limits

- No limits snippet; the duration of a refresh is undocumented and `ALL` can be long. Keep the refresh scope limited to the items that need it.
- Cannot be batched with `task-batch-execute`.
- The documentation example uses a `taskReferenceName` with spaces; generate snake_case names instead.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `table-import-schema` (the automatic refresh this task replaces)
- `table-import-items`
