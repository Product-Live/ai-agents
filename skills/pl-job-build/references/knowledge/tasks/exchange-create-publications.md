# exchange-create-publications

> Reference token: DF-TASK-EXCHANGE-CREATE-PUBLICATIONS-01

Status: alpha (a recent task, available on every account). Category: exchange. Documentation: https://learn.product-live.com/data-factory/references/tasks/exchange-create-publications/

## Purpose

Create publications from a list of items toward a partner (v1 sender flow).

## When to use

- Listed sender path today: `table-export-items`, then this task, then hand the `publications` XML to the partner's `exchange-create-suggestions`.

## When not to use

- Supplier-to-table-owner flow with an automatic receive job: `exchange-send-items`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| items | FILE | yes (per docs and per schema) | - | - | A valid items input: `${previous_task.output.file}` or `${workflow.input.file}`, in the `table-export-items` output format. |
| screenKey | STRING | yes (per docs and per schema) | - | - | Key of the screen on which to create the publications. |
| partnerAccountKey | STRING | yes (per docs and per schema) | - | - | Account key to which to create the publications. |

The `items` file is the `table-export-items` output (abridged):

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
| ${create_publications.output.publications} | FILE | XML `<Publications><Publication id="22154" fromItemId="6590598" screenId="3970" partitionId="2394" tableId="1476"/></Publications>` (one `Publication` per created publication). |
| ${create_publications.output.allPublicationsCreated} | ENUM | `YES` or `NO`. |
| ${create_publications.output.report} | FILE | XML report: `Report[@task="exchange-create-publications"][@date]/Log[@type][@code]` with codes `PUBLICATION_CREATED` and `ERROR_WHEN_PUBLICATION_CREATION`, `Metadata-Collection[@name="publicationDefinition"]` (id, fromItemId, screenId, partitionId, tableId), `Metadata-Collection[@name="identifiers"]`, on error `Metadata-Collection[@name='errorData']` (errorMessage, position in the items file, HTTP status), `Message`. |

## Example

```json
{
    "name": "exchange-create-publications",
    "taskReferenceName": "create_publications",
    "description": "Create publications",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "items": "${table_export_items.output.file}",
        "screenKey": "SUPPLIERS",
        "partnerAccountKey": "${workflow.globalVariables.partnerKey}"
    }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- No limits are stated on the page.
- The documented example reads the partner key as `${workflow.variable.partnerKey}`; other pages use `${workflow.globalVariables.<key>}`. The documentation shows both; prefer `${workflow.globalVariables.<key>}` (the example above is adapted accordingly).
- The input table omits `skipReportGeneration` and `logLevel` although `report` is an output; the schema branch does not list them either.
- The report XPath table of the page lists `position` twice.

## Related tasks

- `table-export-items`: produces the `items` file.
- `exchange-create-suggestions`: partner side (v1).
- `data-publication-create`: id-based alternative.
