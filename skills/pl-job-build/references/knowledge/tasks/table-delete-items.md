# table-delete-items

> Reference token: DF-TASK-TABLE-DELETE-ITEMS-01

Status: GA | Category: table | Documentation: https://learn.product-live.com/data-factory/references/tasks/table-delete-items/

## Purpose

"This task allows to permanently delete items from a table." The documentation warns: "Items deleted with the Data Factory Task table-delete-items are permanently deleted. They cannot be restored, and must be reimported."

## When to use

- Purge a selection made in the grid (`USER_SELECTION`), empty whole partitions (`ALL`) or delete items matching an `<Items-Request>` filter (`REQUEST`).
- Always with `maximum` as a safety net and the produced `file` (the deleted items) kept as a backup.

## When not to use

- Archiving: move items to an archived partition with `table-import-items` instead of deleting them.
- Periodic jobs without a hard `maximum` and an explicit partition list.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| tableKey | STRING | yes | | | "The target table from which items must be deleted" |
| accountKey | STRING | for shared tables | | | "The table owner account key" |
| mode | ENUM | yes | | ALL, USER_SELECTION, REQUEST | "ALL: All items from any mentionned partition on the target table. USER_SELECTION: User selected items on the grid ... REQUEST: Filtered items based on a request xml file. The request file has the same format as for the table-export-items task" |
| partitions | ARRAY of STRING | if mode is REQUEST or ALL | | | "List of partitions key from which items must be deleted. At least one partition is required. Otherwise no item is deleted" |
| request | FILE | if mode is REQUEST | | | "The xml request file to filter items to be deleted" (`<Items-Request>` grammar of `table-export-items`) |
| fileName | STRING | yes | | | "The xml generated output file name. The file name must contain the extension: .xml. This file contains the deleted items" |
| maximum | NUMBER | no | | | "The maximum number of items to delete. If more items are selected/filtered/exist, the deletion stops at this number" |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

Request example (same grammar as `table-export-items`):

```xml
<Items-Request>
    <Filters>
        <Filter-Classification key="TYPOLOGY" operator="EQUALS">
            <Category>JACKET</Category>
        </Filter-Classification>
        <Filter-Field-Number key="STOCK" operator="RANGE">
            <Min>1</Min>
        </Filter-Field-Number>
    </Filters>
</Items-Request>
```

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${delete_items.output.itemsFound} | ENUM YES / NO | "If at least 1 item is deleted: YES, Otherwise NO" |
| ${delete_items.output.file} | FILE | "The xml file containing deleted items" (named after `fileName`; the format is not described, presumably the items XML of `table-export-items`) |
| ${delete_items.output.listing} | FILE | "List the generated xml file" |
| ${delete_items.output.report} | FILE | Execution report (report inputs are documented; the output table does not list it) |

## Example

```json
{
  "name": "table-delete-items",
  "taskReferenceName": "delete_items",
  "description": "Delete the items selected by the user in the grid (at most 100)",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "tableKey": "PRODUCTS",
    "mode": "USER_SELECTION",
    "maximum": 100,
    "fileName": "deleted-items.xml"
  }
}
```

REQUEST variant: `{"tableKey": "PRODUCTS", "partitions": ["ACTIVE", "ARCHIVED"], "mode": "REQUEST", "request": "file://assets/request.xml", "maximum": 100, "fileName": "deleted-items.xml"}`.

## Gotchas and limits

- Irreversible. An empty `partitions` list deletes nothing ("At least one partition is required. Otherwise no item is deleted"); whether an error is reported is not documented.
- `USER_SELECTION` "can only be used if the job is launched from the app.product-live.com interface": never in a periodic job. The selection is also available in the job context (see `../job-context.md`).
- Multi-level tables: "Selected items are deleted; All child items of selected items are deleted; Parent items of selected items are not deleted"; a selection can only hold one level. With filters, the deleted items are "those of the deepest level referenced by the filters", parents are kept "even when every one of their children ends up deleted".
- No documented hard limit on the number of items: use `maximum`.
- Recommended pattern: `table-export-items` backup, `table-delete-items` with `maximum`, `SWITCH` on `itemsFound`, expose `${delete_items.output.file}` in `outputParameters` or e-mail it.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `table-export-items` (request grammar; export before deleting)
- `notification-send-email`, `notification-display-message` (deliver the backup and the report)
- `switch` on `itemsFound`
