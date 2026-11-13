# exchange-send-items

> Reference token: DF-TASK-EXCHANGE-SEND-ITEMS-01

Status: GA (no alpha banner on the page). Category: exchange. Documentation: https://learn.product-live.com/data-factory/references/tasks/exchange-send-items/

## Purpose

Allow your partners to send you items. It must be used with the Receive Items task in another job: the sender (supplier) publishes an exported items file toward the table owner and triggers the owner's receive job.

## When to use

- Supplier side of a shared table, after a `table-export-items`, to push items to the distributor who owns the table.

## When not to use

- Publishing to your own account (refused) or to a multi-level table (refused).
- Publication by partner key without a receive job: `exchange-create-publications`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| request | FILE | yes (per docs and per schema) | - | - | An XML file with the same format as the Export Items task output. |
| screens | ARRAY | yes (per docs and per schema) | - | screen keys | With one screen, set one key in the array; with several shared screens, use a single-select job user input listing the screens available. |
| receiveJobKey | STRING | yes (per docs and per schema) | - | - | Key of the receive job (whose body is `exchange-receive-items`). |
| accountKey | STRING | required if the job is shared (optional per schema) | - | - | Your account key, found in Settings > Account > General. |
| skipReportGeneration | BOOLEAN | no | false | true, false | `true` skips the report; the `report` output is then absent. |
| logLevel | ENUM | no | info | error, warning, info, debug | Minimum level of the logs written in the report (error < warning < info < debug). |

The `request` file is the `table-export-items` output (abridged):

```xml
<Table key="products">
    <Items>
        <Item partition="active">
            <Identifier key="ean">1234567890123</Identifier>
            <Field key="titleEn">Phone X</Field>
        </Item>
    </Items>
</Table>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${send_items.output.suggestionIds} | ARRAY | Identifiers of the suggestions the publication created; the same list is handed to the receive job named in `receiveJobKey`. |

`report` is not listed in the outputs table although the report inputs are accepted.

## Example

```json
{
    "name": "exchange-send-items",
    "taskReferenceName": "send_items",
    "description": "Send products",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "request": "${export_items.output.file}",
        "screens": [
            "supplier"
        ],
        "receiveJobKey": "receive-items-from-suppliers",
        "accountKey": "${workflow.globalVariables.account_key}"
    }
}
```

## Gotchas and limits

- Publish and receive up to 10000 items at a time, on up to 3 screens.
- The table must have a single level: multi-level items get `CAN_NOT_USE_MULTI_LEVEL_ITEMS` and are not published.
- Publication only goes from a shared context (supplier) to the table owner (distributor); publishing to your own account is refused; only partitions and screens the sending account can reach.
- Archived options are not published (`SINGLE-SELECT`, `MULTIPLE-SELECT`, `MULTIPLE-SELECT-QUANTIFIED`, `MULTIPLE-SELECT-QUANTIFIED-WITH-COMMENTS`).
- The documented example hardcodes the account key as a literal; the example above reads it from a global variable instead.
- The page has no "Task name" line (the name appears only in the example); `skipReportGeneration` and `logLevel` come from the shared report include and are not in the VS Code extension schema branch (the editor may flag them).

## Related tasks

- `exchange-receive-items`: body of the receive job.
- `table-export-items`: produces the `request` file.
