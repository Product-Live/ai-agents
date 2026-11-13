# Data import rules: table schema and items

> Reference token: DF-DATA-IMPORT-RULES-01

`table-import-schema` creates or updates the structure of a table; `table-import-items` creates or updates its items. Both consume an XML `request` document and produce a `report`.
Their behaviour has silent rules (modes, archiving instead of deleting, identifier matching, exhaustive screens) that decide whether an import "did nothing" or wiped something.
This file states those rules as the public pages document them; where a page is silent, it says so.

## 1. `table-import-schema`

### 1.1 Inputs and modes

| Input | Type | Default | Description |
| -- | -- | -- | -- |
| `request` | FILE | required | The `<Table>` schema document. |
| `mode` | enum `INCREMENTAL`, `EXHAUSTIVE` | `INCREMENTAL` | "The import in incremental mode allows the partial update of the table, EXHAUSTIVE this mode allows the exhaustive update of the table, any element not present in the request document will be archived." |
| `skipItemRefresh` | enum `YES`, `NO` | `NO` | "When set to YES, items conditional formattings and formulas are not refreshed. Use with caution if you are sure that no conditional formatting or formulas have been modified to speed up import." |
| `skipReportGeneration`, `logLevel` | | | report inputs |

Output: `report` only. The task cannot run inside `task-batch-execute`.

```json
{
  "name": "table-import-schema",
  "taskReferenceName": "import_table_schema",
  "description": "Create or update the PRODUCTS table structure",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "request": "file://assets/table.xml",
    "mode": "INCREMENTAL"
  }
}
```

`INCREMENTAL` (default) is additive: elements present in the file are created or updated, absent elements are untouched. `EXHAUSTIVE` treats the file as the whole table: "any element not present in the request document will be archived" (the table life cycle guide shows it for identifiers, classifications, categories, options and matrix links; levels, fields and sections cannot be archived). "If you use the mode = EXHAUSTIVE under the hood a differential is done before updating the schema" (scalability tutorial): use it only with a complete document (typically an edited `table-export-schema` output), and prefer `INCREMENTAL` with only the attributes updated since the last import for day-to-day changes. Unless `skipItemRefresh` is `YES`, the import refreshes the conditional formattings and formulas of the items, which is why that input exists "to speed up import"; schedule large schema imports off-peak (recommendation).

### 1.2 Document shape

```xml
<Table key="PRODUCTS">
    <Title>Products</Title>
    <Title-Local lang="fra">Produits</Title-Local>
    <Color>BLUE</Color>
    <Position>1</Position>
    <Schema>
        <Levels />
        <Partitions />
        <Identifiers />
        <Classifications />
        <Fields />
        <Matrix />
        <Formulas />
        <Conditional-Formattings />
        <Sections />
        <Screens />
    </Schema>
</Table>
```

A usable table needs: one `Level` at `index="1"`, at least one active `Partition`, an `Identifier` (an item needs at least one filled identifier), the `Fields`, a `Matrix` that declares them common or specific, and a `Screen` ("The visibility of a Field is defined by the screen").

### 1.3 Immutable and non-deletable elements

"In Product-Live you cannot delete data on the schema of a table, you can only archive some elements" (table life cycle guide).

| Element | Rules |
| -- | -- |
| Table `key` | unique in your account; `Title`, `Color`, `Position` (positive integer from 1), `Schema` are required; colors `NONE`, `RED`, `GREEN`, `BLUE`, `ORANGE`, `YELLOW`, `PURPLE`, `BLACK`, `BROWN` (plus `CYAN`, `MAGENTA` for options and statuses) |
| Levels | up to 5; `index` 1 to 5, cannot be updated; a table must have a level at index 1; levels cannot be archived; "You must never add a level on a table that is in production" |
| Partitions | at least one active partition; the schema page archives a partition with `status="ARCHIVED"` while the table life cycle guide says that partitions cannot be archived ("If you don't need a partition, just don't use it"): prefer leaving a partition unused; identifier uniqueness spans all partitions, so moving an item to an archive partition does not free its identifier values |
| Identifiers | up to 5 per table; `index` cannot be updated; archivable, never deletable; archived identifiers are not exported and their conditional formatting rules are ignored; declaring an archived identifier again reactivates it |
| Fields | `key` and data type cannot be changed; fields cannot be archived (archive their matrix link instead) nor deleted; "Trying to create two fields with different data type will generate a warning, and the second field will be ignored" (glossary of the documentation) |
| Options | `key` unique in the option list; `color` only on `SINGLE-SELECT` options; archivable, never deletable; archived options are not exported; `EXHAUSTIVE` archives missing options |
| Classifications | up to 5; categories form a flat list with `parent` keys; "Cyclic categories are imported with warning and without reference to the other category"; classifications and categories are archivable and not exported once archived |
| Matrix | `Common` and `Specific classification="..." category="..."` blocks; links archivable, not deletable; "there is no inheritance between categories"; never reference identifiers, classifications or conditional formatting here; a field is either common or specific, never both |
| Sections | cannot be archived nor deleted |
| Screens | see 1.4 |
| Suffixes (`NUMBER` fields) | `key` cannot be updated; archivable (`status="ARCHIVED"`), not deletable; "Only the first unit set as default is imported as default" |
| Composite fields (beta) | the child definition is exhaustive: a child missing from the import is deleted together with its item values; up to 100 children, depth 5 |
| Metadata | key and value pairs; each key unique within its element (no count or length limit is documented) |

Keys: at most 255 characters and not only white space (element key reference); best practice: English, upper case with `_`, as short as possible. Field keys (schema page) and category keys (2026 release note) with leading or trailing spaces are rejected.

### 1.4 Screens and sections replacement rules

"The links defined in Common and Specific must be valid links that have already been declared in the Matrix element." Screen columns: `Column-Identifier`, `Column-Classification`, `Column-Conditional-Formatting`, `Column-Field`, `Column-Composite`, each with `key` and a `position` relative to its section (first column is 1); options `read-only`, `fixed`, `width` (`SMALL`, `MEDIUM`, `LARGE`, `EXTRA_LARGE`), `display="MARKDOWN"` (`LONG-TEXT` only); `Grid/Line-Height` `SHORT`, `MEDIUM`, `TALL`, `EXTRA_TALL`; a composite column holds at most 100 child column fields.

Critical rule: "The Screen definition is always exhaustive" (table life cycle guide), whatever the import `mode`: a screen present in the file replaces the previous definition of that screen, sections and columns included. To change one column, export the schema, edit the screen, re-import the complete screen. Screens can be archived; to reactivate one, send back its whole definition.

### 1.5 Formulas and conditional formatting

- Formula use cases are documented (composite identifiers, computed volumes, dependent lists, limited options per category, status computation, links to related items) but the `<Formulas>` grammar is not fully documented on the task page: copy real examples from a `table-export-schema` output rather than writing them from scratch.
- Formulas use the same engine as the rules engine and run instantly when a value they reference is modified; they are evaluated in priority order and the last matching rule wins (rules engine guide). Limits: 2 000 rules per formula field; 5 000 values per condition; a `COMPOSITE` field cannot be the target of a formula rule. Other behaviours (cycles, a formula added to an identifier that already holds values, the replacement of existing rules) are not documented: test formula changes on a test table first (recommendation).
- Conditional formatting: 8 fields per table per the limits page (5 in the page body), 10 statuses per field; each status carries a `Priority` ("the priority when two rules match"; 0 is the default status) and a `Color`; "If two rules are declared with the same rule identity for the same status and target field, the import keeps the last rule declared in the XML." Archived values count as empty values in the rules, and rules on archived identifiers or classifications are ignored (table life cycle guide). Rule catalogue: `Rule-Required`, `Rule-Min-Length`, `Rule-Max-Length`, `Rule-Regex`, `Rule-Barcode type="EAN13"`, `Rule-Is-Leaf`, size and resolution rules for images and attachments, numeric comparisons, inter-field comparisons, conditional requirements and `Rule-Condition` with the rules engine condition grammar.

### 1.6 Report (schema)

The schema page documents two warnings: a second field with the same key and another data type is ignored, and cyclic categories are imported without the parent reference. It does not list the report codes: read the codes of a real report (`Report/Log/@type`, `Metadata[@name='code']`) rather than relying on a fixed list.

## 2. `table-import-items`

### 2.1 Inputs and modes

| Input | Type | Default | Description |
| -- | -- | -- | -- |
| `request` | FILE | required | The `<Table key><Items><Item>` document. |
| `accountKey` | string | | "The account key of the partner required when importing items on a shared table" (Settings > Network > Partners). |
| `mode` | enum | `CREATE_OR_UPDATE` | `CREATE_OR_UPDATE`: existing items are updated, others created. `UPDATE_ONLY`: existing items are updated, others are not created. `CREATE_ONLY`: new items are created, existing ones are not updated. |
| `skipReportGeneration`, `logLevel` | | | report inputs |

Output: `report` only. To detect rejected items, parse the report (`Report/Log[@type='error']`). Use `UPDATE_ONLY` for enrichment jobs that must never create items.

```json
{
  "name": "table-import-items",
  "taskReferenceName": "import_items",
  "description": "Import the items built by the transformation",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "request": "${build_items.output.file}",
    "mode": "CREATE_OR_UPDATE"
  }
}
```

### 2.2 Document shape

```xml
<Table key="PRODUCTS">
  <Items>
      <Item partition="ACTIVES">
          <Identifier key="EAN_13">1234567890123</Identifier>
          <Classification key="TYPOLOGY">LAPTOPS</Classification>
          <Field key="TITLE_EN">Laptop 1</Field>
          <Field key="CONNECTORS">USB</Field>
          <Field key="CONNECTORS">HDMI</Field>
          <Field key="PRICE" suffix="EURO">1899.99</Field>
          <Field key="ON_LINE">2020-04-10</Field>
          <Field key="MAIN_IMAGE" file-key="33a64df551425fcc55e4d42a148795d9f25f89d4">https://example.com/images/laptop-1.jpg</Field>
          <Field key="DESCRIPTION_EN" delete="true"/>
      </Item>
  </Items>
</Table>
```

Value conventions: text fields take the element content; classifications take the category key; select fields take the option key, one `<Field>` per selected option for multiple selects; quantified selects add `quantity` and `comment` attributes; numbers follow the number rules with the unit in `suffix`; dates are ISO 8601; images and attachments take a public URL plus `file-key` (your ETag or MD5) or `file-hash` (the platform file id, for round trips); composite fields nest `<Field>` elements and repeat the parent for multi-valued composites; nested `<Item>` elements (without `partition`) model lower levels.

### 2.3 Behaviour rules

| Rule | Detail |
| -- | -- |
| Empty elements are not deletions | In the import file, "do not import elements that are empty. Even if they are ignored it can be significant in file size" (scalability tutorial). Use `delete="true"` to clear a value. "Never send empty data and use differential import to only import data that have been modified." |
| A rejected line does not fail the task | A table import can partially succeed: some rows are imported while others fail validation. Common causes listed by the FAQ: duplicate identifiers, missing mandatory fields, values exceeding character limits, invalid references to non-existing taxonomy items. Read the report. |
| Identifier matching | An imported item is matched against the existing items through its identifier values, compared without case and accents, after removing leading and trailing spaces; uniqueness spans all partitions; a value longer than 50 characters is logged as an error (identifiers guide). |
| Identifier conflicts | "If the imported line carries several Identifiers that match different existing Items, the import cannot resolve the conflict: the line is matched on the first filled Identifier, and the import then fails on the uniqueness constraint of the other one." At least one identifier must remain filled on an item, and an import is not a reliable way to correct the spelling of an identifier value. |
| Partition | `partition` is required on every top-level `Item`; moving an item to an archive partition does not free its identifier values. |
| Mode | `UPDATE_ONLY` never creates an item; `CREATE_ONLY` never updates an existing one. |
| Multi-level | Lower levels are `<Item>` elements nested in their parent, without `partition` (multi-level example of the task page). |
| Text fields | `HTML-TEXT` values keep their tags, and find criteria match the tags too. |
| Numbers | "To import a number with a unit on a field, the value must be a valid number, and the suffix key must exist on the field. Otherwise neither the value nor the unit are imported." Without a unit, the default unit of the field applies; 15 digits at most. |
| Images and attachments | Public URL without authentication; images JPEG, PNG, GIF or WebP, 20 MB, 36 megapixels on this page (50 on the `data-suggestion-create` page); attachments 2 GB; the upload time is limited to 1 minute; `file-key` or `file-hash` avoids downloading the same file twice ("If both file-key and file-hash are filled, then file-key is ignored"). |
| Composite fields | Exhaustive per field: any child value missing from the import is deleted; a multi-valued composite replaces all lines, order preserved. |
| Deleting items | Use `table-delete-items`: the deletion is permanent and its `file` output holds the deleted items. |
| Sizes | 500 KB per item; 2 GB per input file. |

### 2.4 Report (items)

Each log carries a `type` (`error`, `warning` or `info`), metadata (`xpath`, `code`, table and partition keys, the identifiers) and a `Message`. Recommendation of these skills: automate on `Metadata[@name='code']` and the `type` attribute rather than on the `Message` text. The public task page does not list the codes: match the codes found in a real report of the target table.

## 3. Export counterpart

`table-export-items` exports at most 200 000 items and only non-archived structure (active identifiers, classifications and categories, fields with an active matrix link, options, suffixes); items of archived partitions are not exported; on a multi-level table, the date filters apply to each item and the parents and children of the matching items are exported too. Exported files can be imported again with `file-hash`, so that they are not downloaded twice. Export the schema with `table-export-schema` to discover the exact keys, partitions and options before writing an import XSLT.

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| `EXHAUSTIVE` with a partial schema document | `INCREMENTAL`, or a complete exported document |
| Importing one screen column change in `INCREMENTAL` with a partial `Common` block | the full screen (all sections and columns) |
| Trying to delete a field, level, section or option | archive it (where allowed); keys are permanent, plan them |
| Expecting `<Field key="X"></Field>` to clear a value | `<Field key="X" delete="true"/>` |
| Option titles or category titles as values | option and category keys |
| Numbers with a comma or a unit in the value | `12.9` with `suffix="EURO"` |
| Re-downloading every image at each import | `file-key` (your ETag or MD5) or `file-hash` (platform id) |
| Expecting the job to fail when an item is rejected | the task completes; parse the report |
| `CREATE_OR_UPDATE` in an enrichment job | `UPDATE_ONLY` |
| Treating `Pole qualite` and `Pole Qualite` as two identifiers | they are the same value; use a text field for case-sensitive codes |
| Sending the whole catalogue every night | differential import: only modified items, never empty values |
