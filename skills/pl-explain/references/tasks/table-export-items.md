# table-export-items

> Reference token: DF-TASK-TABLE-EXPORT-ITEMS-01

Status: GA | Category: table | Documentation: https://learn.product-live.com/data-factory/references/tasks/table-export-items/

## Purpose

"This task allows to export items from a table in the XML format." It produces the `<Table><Items><Item>` document that is the common currency of Data Factory jobs: XSLT producers of XLSX, PDF, CSV or JSON, `exchange-*` tasks, `rules-engine-execute-rules` and `table-import-items` all consume it.
Its `<Items-Request>` grammar is reused by `table-delete-items` and `rules-engine-execute-rules` (`mode: REQUEST`).

## When to use

- First data step of almost every export, report or synchronisation job: all items, a user selection, or a filtered subset.
- Round trips: export, transform, re-import (keep `file-hash` on images and attachments).

## When not to use

- Small JSON reads inside a script (`data-item-find`).
- More than 200 000 items in one export (hard limit; split by partition or filters).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| tableKey | STRING | yes | | | "The key of the table from which items are exported." |
| mode | ENUM | yes | | ALL, USER_SELECTION, REQUEST | "ALL = all items, USER_SELECTION = items selected by the user, REQUEST = items are filtered by a request, in this case a request parameter must be added." |
| request | FILE | if mode is REQUEST | | | The `<Items-Request>` document (grammar below) |
| maximum | NUMBER | no | | | "Defines the maximum items to be exported." (hard cap 200 000) |
| partitions | ARRAY of STRING | no | all active partitions | | "In USER_SELECTION mode, the parameter is ignored. In REQUEST and ALL modes, if none is set, items from all active partitions are exported. Items from archived partitions are not exported." |
| fileName | STRING | yes | | | "Defines name of the output file (without the file extension)". Every documented example passes `items.xml`: prefer that form, a name with the `.xml` extension (see `job-format.md` section 6). |
| accountKey | STRING | only for shared tables | | | "The account key of the partner owning the shared table." |
| xmlVersion | STRING | no | 1.0 | 1.0, 1.1 | "The XML version 1.1 supports additional unicode characters." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

### Request grammar (`<Items-Request>`)

```xml
<Items-Request>
    <Filters>
        <Filter-Field-Single-Select key="SEASON" operator="EQUALS">
            <Option>SPRING</Option>
            <Option>SUMMER</Option>
        </Filter-Field-Single-Select>
        <Filter-Field-Single-Line-Text key="TITLE" operator="STARTS_WITH">
            <Value>DRESS</Value>
        </Filter-Field-Single-Line-Text>
        <Filter-Field-Number key="PRICE" operator="NOT_EMPTY" />
        <Filter-Classification key="TYPOLOGY" operator="EMPTY" />
        <Filter-Created-At>
            <Start>2020-12-28</Start>
            <End>2020-12-29</End>
        </Filter-Created-At>
    </Filters>
    <Properties>
        <Field key="PRICE" />
        <Field key="STOCK" />
    </Properties>
</Items-Request>
```

- `Filters`: every criterion is combined with AND; one criterion per attribute key.
- `Properties`: "Identifiers and classifications are always exported." Absent element: all properties; present: only the listed fields; empty: only identifiers and classifications. A `COMPOSITE` field is exported whole (its children cannot be listed).

| Filter | Operators and children |
| -- | -- |
| `Filter-Created-At`, `Filter-Updated-At` | `Start` (included), `End` (excluded), ISO 8601 date or date-time; an invalid date ends the task in error. On multi-level tables, parents and children of matching items are exported too |
| `Filter-Identifier key operator` + `Value` | EQUALS (several values = OR), CONTAINS, STARTS_WITH, ENDS_WITH, NOT_EMPTY, EMPTY; up to 25 identifier filters |
| `Filter-Classification key operator` + `Category` | EQUALS, NOT_EMPTY, EMPTY, NOT_IN (category key) |
| `Filter-Conditional-Formatting key` + `Status` | EQUALS only (status key) |
| `Filter-Field-Single-Line-Text key operator` + `Value` | EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH, NOT_EMPTY, EMPTY; also used for LONG-TEXT and HTML-TEXT fields |
| `Filter-Field-Single-Select`, `Filter-Field-Multiple-Select` (and `-Quantified`, `-Quantified-With-Comments`) + `Option` | EQUALS, NOT_IN, EMPTY, NOT_EMPTY (option key; quantities and comments cannot be filtered) |
| `Filter-Field-Number key operator` | RANGE with `Min` / `Max` (both included, at least one), EMPTY, NOT_EMPTY; with `use="SUFFIX_KEY"`: IN / NOT_IN + `Suffix`, EMPTY, NOT_EMPTY |
| `Filter-Field-Date`, `Filter-Field-Date-Time` | RANGE with `Start` / `End`, EMPTY, NOT_EMPTY |
| `Filter-Field-Attachment key operator` + `Extension` | EQUALS, NOT_EMPTY, EMPTY |
| `Filter-Field-Image key operator="EQUALS"` | children `Height-Min-Px`, `Height-Max-Px`, `Width-Min-Px`, `Width-Max-Px`, `Extension`, `Color-Space`, `Color-Profile`; also NOT_EMPTY, EMPTY |
| `Filter-Field-Composite key operator` | EMPTY, NOT_EMPTY |
| `Filter-Sent` (`sent`, `modified`, `never`, `rejected`), `Filter-Inbox` (`new`, `suggestions`, `empty`), `Filter-Comment`, `Filter-Comment-Status`, `Filter-Comment-Assignee` | Publication, suggestion and comment state (shared tables, single-level only) |

### Output grammar (items XML)

Same shape as the `table-import-items` request, plus export-only attributes:

```xml
<Table key="PRODUCTS">
    <Items>
        <Item partition="ACTIVE" created="2022-01-01T00:00:00.000Z" updated="2022-01-01T00:00:00.000Z">
            <Identifier key="EAN">1234567890123</Identifier>
            <Classification key="TAXONOMY">PHONE</Classification>
            <Conditional-Formatting key="COMPLIANCE">VALID</Conditional-Formatting>
            <Field key="TITLE_EN">Phone X</Field>
            <Field key="PRICE" suffix="EURO">999.9</Field>
            <Field key="CONNECTORS" quantity="2">USB</Field>
            <Field key="FRONT_IMAGE" width-px="2000" height-px="2000" size-kb="2456" original-file-name="front.jpg" file-hash="0CMqLzPax2h9W/zAdG2x0g==" color-space="RGB" color-profile="NONE">https://example.com/files/front.jpg</Field>
        </Item>
    </Items>
</Table>
```

| XPath | Meaning |
| -- | -- |
| `Table/@key`, `Table/@account` | Table key; owning account key (documented, absent from the examples) |
| `Item/@partition`, `@created`, `@updated` | Partition key (top level only); dates in UTC |
| `Item/@id` (beta) | Technical item id expected by the Items API and by `exchange-apply-suggestions`; "only produced on export" |
| `Item/@new`, `@suggestions`, `@sent`, `@lastSentSuggestionStatus` | Publish and collect dates and status (`sent`, `received`, `acknowledged`, `rejected`); single-level tables only |
| `Identifier`, `Classification`, `Conditional-Formatting` (`@calculationInProgress="true"` while pending) | 0..5 each, `@key` |
| `Field @key` | Values as in `table-import-items`: repeated elements for multiple-select, `@quantity`, `@comment`, `@suffix`, image attributes (`width-px`, `height-px`, `size-kb`, `file-hash`, `original-file-name`, `color-space`, `color-profile`, optional `mime-type`, `file-key`), nested `Field` for COMPOSITE, HTML escaped as text |
| nested `Item` | Child level items (no `partition` attribute) |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${export_items.output.file} | FILE | "Items in the XML format described below." |
| ${export_items.output.itemsFound} | ENUM YES / NO | "YES: at least one item has been found. NO: no items have been found." The standard early-exit guard (`SWITCH` + `TERMINATE`) |
| ${export_items.output.listing} | FILE | "An XML file containing information regarding the generated file." |
| ${export_items.output.report} | FILE | Execution report |

## Example

```json
{
  "name": "table-export-items",
  "taskReferenceName": "export_items",
  "description": "Export the items selected by the user",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "tableKey": "PRODUCTS",
    "mode": "USER_SELECTION",
    "maximum": 1000,
    "partitions": ["active", "archived"],
    "fileName": "items.xml"
  }
}
```

Other documented shapes: `{"tableKey": "PRODUCTS", "mode": "ALL", "maximum": 100, "partitions": ["active", "archived"], "fileName": "items.xml"}`; `{"tableKey": "PRODUCTS", "mode": "REQUEST", "maximum": 100, "partitions": ["active"], "request": "file://assets/filter.xml", "fileName": "items.xml"}`.

## Gotchas and limits

- "The maximum number of items that may be exported in a single export is set to 200 000."
- "Item export only exports information that is not archived: Active identifiers; Active classifications and categories; Fields which have an active (non-archived) link in matrix; Active options; Active suffixes." Archived suffixes are used when filtering but not exported.
- `USER_SELECTION` "can only be used when the job is launched from the app.product-live.com application"; `partitions` is ignored in that mode; never in a periodic job. The same selection is available in the job context in the find-request format.
- Multi-level tables: `maximum` "is checked at each item declination"; when reached "the export stops, and the last exported item declination is ignored"; date filters pull whole families.
- Filters are AND only; one criterion per attribute key; an unknown option key makes `EQUALS` export nothing and `NOT_IN` export everything. Items without a value are not exported by `EQUALS` but are by `NOT_IN`.
- Always write a `<Properties>` element listing only the needed fields: smaller files and faster XSLT.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `table-export-schema` (keys, types, options), `file-transformation-xslt`, `file-generation-xlsx`, `file-generation-pdf`
- `table-import-items` (round trip with `file-hash`), `table-delete-items` and `rules-engine-execute-rules` (same request grammar)
- `exchange-send-items`, `exchange-create-publications`, `exchange-apply-suggestions` (consume this file)
- `switch` on `itemsFound`, `data-item-find` (JSON alternative for small reads)
