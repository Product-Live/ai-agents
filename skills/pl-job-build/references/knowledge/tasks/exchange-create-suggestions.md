# exchange-create-suggestions

> Reference token: DF-TASK-EXCHANGE-CREATE-SUGGESTIONS-01

Status: alpha (a recent task, available on every account). Category: exchange. Documentation: https://learn.product-live.com/data-factory/references/tasks/exchange-create-suggestions/

## Purpose

Create suggestions on items from a list of publications received from partners (v1 receiver flow). For each publication: if an item matches the publication's identifier, the suggestion goes on that item; otherwise a new item is created and the suggestion is put on it.

## When to use

- Consuming the `publications` XML produced by a partner's `exchange-create-publications`.

## When not to use

- Items sent with `exchange-send-items`: `exchange-receive-items`.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| publications | FILE | yes (per docs and per schema) | - | - | A valid publications input: the output of `exchange-create-publications`, usually passed as a job user input. |
| screens | ARRAY | required per docs / optional per schema | - | screen keys | Each publication generates a distinct suggestion on each screen. |
| matching | OBJECT | required per docs / optional per schema | - | - | Reconciliation rules: `first` tried, then `second` to `fifth`; no match creates a new item. |
| matching.first | STRING | yes, inside matching | - | - | Key of the first identifier. |
| matching.second | STRING | no | - | - | Next identifier, in order; likewise `matching.third`, `matching.fourth`, `matching.fifth`. |

The `publications` file grammar is the `exchange-create-publications` output:

```xml
<Publications>
    <Publication id="22154" fromItemId="6590598" screenId="3970" partitionId="2394" tableId="1476"/>
</Publications>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${create_suggestions.output.suggestions} | FILE | XML `<Suggestions><Suggestion suggestionId="22107" toItemId="6590627" screenId="3971" hasCreatedItem="true" fromAccountId="4212"/></Suggestions>`. |
| ${create_suggestions.output.report} | FILE | XML report with codes `SUGGESTION_CREATED` (info, `suggestionDefinition` including `publicationId` and nested identifiers), `PUBLICATION_RECEIVED` (info, `publicationData`: publicationId, status), `WARNING_PUBLICATION_NOT_SENT` (warning, `warningData`: warningMessage, publicationId, screenId, screenKey, status), `ERROR_WHEN_SUGGESTION_CREATION` (error, `errorData`: errorMessage, status). |
| ${create_suggestions.output.allSuggestionsCreated} | ENUM | `YES` or `NO`. |

## Example

```json
{
    "name": "exchange-create-suggestions",
    "taskReferenceName": "create_suggestions",
    "description": "Collect suggestions from received publications",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "publications": "${workflow.input.publications}",
        "screens": [
            "ALL_PROPERTIES"
        ],
        "matching": {
            "first": "EAN",
            "second": "SKU"
        }
    }
}
```

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- No limits are stated on the page.
- The documented example uses `"taskReferenceName": "Collect suggestions"` (a space) and `"publications": "${data-publication-find.output.file}"`, which is not a real output (`data-publication-find` has no `file` output). The example above is corrected: snake_case reference and a job user input carrying the partner's file.
- Per schema only `publications` is required; `screens` and `matching` are required per docs.
- The report XPath table of the page lists `Metadata[@name="status"]` twice with different meanings.

## Related tasks

- `exchange-create-publications`: sender side (v1).
- `data-suggestion-create`: id-based alternative.
