# table-import-items

> Reference token: DF-TASK-TABLE-IMPORT-ITEMS-01

Status: GA | Category: table | Documentation: https://learn.product-live.com/data-factory/references/tasks/table-import-items/

## Purpose

"Import items into a Product-Live table." Creates or updates items from a `<Table key><Items><Item>` XML document, the same shape `table-export-items` produces.

## When to use

- Terminal step of every import pipeline: file from FTP, HTTP or a user input, converted (`file-conversion-*`) and transformed (`file-transformation-xslt`) into the items XML.
- Re-import of the `items` output of `rules-engine-execute-rules`, or writing back computed values.

## When not to use

- Unitary JSON writes from a script (`data-item-create-or-update`).
- Changing the table structure (`table-import-schema`).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| request | FILE | yes | | | The `<Table>` items document (grammar below) |
| accountKey | STRING | no | | | "The account key of the partner required when importing items on a shared table. The account key can be found in Settings > Network > Partners." |
| mode | ENUM | no | CREATE_OR_UPDATE | CREATE_OR_UPDATE, UPDATE_ONLY, CREATE_ONLY | "CREATE_OR_UPDATE = if the item exist, it is updated, if not the item is created. UPDATE_ONLY if the item exist, it is updated, if not the item is not created. CREATE_ONLY if the item exist, it is not updated, if not the item is created." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

### Request grammar (items XML)

| XPath | Meaning | Occurs |
| -- | -- | -- |
| `Table/@key` | The key of the table | 1 |
| `Table/Items/Item` | One element per item | 0..* |
| `Item/@partition` | The partition key (top-level items) | 1 |
| `Item/Identifier @key` | Identifier value; "At least one." | 1..5 |
| `Item/Classification @key` | The category key | 0..5 |
| `Item/Field @key` | Field value, written according to the data type | 0..* |
| `Field/@delete` | `delete="true"` on an empty element removes the value | 0..1 |
| `Field/@quantity`, `Field/@comment` | MULTIPLE-SELECT-QUANTIFIED (and -WITH-COMMENTS) | 0..1 |
| `Field/@suffix` | NUMBER unit key | 0..1 |
| `Field/@file-key` | IMAGE / ATTACHMENT: "Use this attribute to store the MD5 or the ETag of the file. Therefore if you import the same file twice, then it will be downloaded once." | 0..1 |
| `Field/@file-hash` | IMAGE / ATTACHMENT: "This is the file id in Product-Live, this field is used when items are exported from Product-Live and then imported again. If both file-key and file-hash are filled, then file-key is ignored." | 0..1 |
| `Field/Field` | Children of a COMPOSITE field, each written according to its own type | 0..* |
| `Item/Item` | Child-level items of a multi-level table (no `partition`, their own identifiers) | 0..* |

Single level, with every value form:

```xml
<Table key="PRODUCTS">
  <Items>
      <Item partition="ACTIVES">
          <Identifier key="EAN_13">1234567890123</Identifier>
          <Classification key="TYPOLOGY">LAPTOPS</Classification>
          <Field key="TITLE_EN">Laptop 1</Field>
          <Field key="DESCRIPTION_EN" delete="true"/>
          <Field key="PRICE" suffix="EURO">1899.99</Field>
          <Field key="CONNECTORS">USB</Field>
          <Field key="CONNECTORS">HDMI</Field>
          <Field key="CONNECTORS_QUANTIFIED" quantity="2">USB</Field>
          <Field key="CONNECTORS_COMMENTED" quantity="2" comment="1 USB-C and 1 USB 2.0">USB</Field>
          <Field key="PUBLICATION">2020-04-10T13:40:23.830Z</Field>
          <Field key="IMAGE_1" file-key="33a64df551425fcc55e4d42a148795d9f25f89d4">https://example.com/valid-url-1.jpg</Field>
          <Field key="IMAGE_2" file-hash="a1d0c6e83f027327d8461063f4ac58a6">https://example.com/valid-url-2.jpg</Field>
          <Field key="BATTERY">
              <Field key="BATTERY_TYPE_CODE">AAA</Field>
              <Field key="BATTERY_QUANTITY">4</Field>
          </Field>
      </Item>
  </Items>
</Table>
```

Multi-level (nested `Item` elements, one identifier set per level):

```xml
<Table key="PRODUCTS">
  <Items>
      <Item partition="ACTIVES">
          <Identifier key="REFERENCE">00034</Identifier>
          <Field key="TITLE_EN">Black lapel collar dress</Field>
          <Item>
              <Identifier key="REFERENCE_COLOR">00034-RED</Identifier>
              <Field key="COLOR">RED</Field>
              <Item>
                  <Identifier key="SKU">00034-RED-34</Identifier>
                  <Field key="SIZE">34</Field>
                  <Field key="PRICE" suffix="EURO">19.9</Field>
              </Item>
          </Item>
      </Item>
  </Items>
</Table>
```

Value conventions: text types as element text; SINGLE-SELECT and Classification take the option or category key; MULTIPLE-SELECT repeats the `Field` element once per option; NUMBER uses `.` as decimal separator, at most 15 digits, optional sign, no thousands separator, no letters (`1 000`, `1,1`, `10e5`, `10 cm` are invalid); DATE `2020-04-10`, DATE-TIME `2020-04-10T13:40:23.830Z` ("Z means UTC"); IMAGE and ATTACHMENT take a public URL plus `file-key` or `file-hash`; COMPOSITE values are nested `Field` elements and a multi-valued composite repeats the parent `Field`.

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${import_items.output.report} | FILE | The only output: `<Report task="table-import-items">` with one `Log` per rejected item carrying `Metadata` `xpath`, `code`, `table-key`, `partition-key` and a `Metadata-Collection name="identifier"`. No counts, no YES/NO flag |

To detect rejected items, parse the report with an XSLT (for example count `Log[@type='error']`) and branch with a `SWITCH`.

## Example

```json
{
  "name": "table-import-items",
  "taskReferenceName": "import_items",
  "description": "Import the transformed items into the products table",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "request": "${transform_to_items.output.file}",
    "mode": "UPDATE_ONLY"
  }
}
```

## Gotchas and limits

- Limits: input file 2 Gb; each item 500 Ko. "Best practice: never send empty data and use differential import to only import data that have been modified."
- Items are matched through their `Identifier` values "without taking case and accents into account"; leading and trailing spaces are removed before the comparison.
- The default `mode` creates items: use `UPDATE_ONLY` for enrichment jobs that must not create garbage items.
- A NUMBER with an invalid value or an unknown suffix key is not imported at all ("neither the value nor the unit are imported"); a default unit applies when no suffix is given.
- IMAGE / ATTACHMENT: the URL "must be public e.g. without authentication"; IMAGE max 20 Mb and 36 Mp, formats JPEG, PNG, GIF, WebP; ATTACHMENT max 2 Gb; "the maximum upload time is set to 1 minute". Always set `file-key` (your ETag) or `file-hash` (round trip) so files are not downloaded again.
- COMPOSITE (beta): "The import of a COMPOSITE field value is exhaustive. Any missing field value within the COMPOSITE field is deleted." A multi-valued composite replaces all existing lines, in the given order.
- The top-level `partition` key is table specific: read it from a `table-export-schema`.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `table-export-items` (same shape out, `file-hash` round trip), `table-export-schema` (keys, partitions, options)
- `file-transformation-xslt` (producer), `file-conversion-csv-to-xml`, `file-conversion-xlsx-to-xml`, `file-conversion-json-to-xml` (sources), `file-validation-xsd` (development diagnostic)
- `rules-engine-execute-rules` (`items` output), `data-item-create-or-update` (unitary JSON writes)
