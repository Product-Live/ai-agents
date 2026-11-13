# table-import-schema

> Reference token: DF-TASK-TABLE-IMPORT-SCHEMA-01

Status: GA | Category: table | Documentation: https://learn.product-live.com/data-factory/references/tasks/table-import-schema/

## Purpose

"You need to import a structure to a Product-Live table." Creates or updates a table definition (levels, partitions, identifiers, classifications, fields, matrix, formulas, conditional formattings, sections, screens) from one XML document.

## When to use

- Provisioning a new table, adding fields, options or categories to an existing one (`INCREMENTAL`), cloning a table (`table-export-schema`, XSLT, `table-import-schema`), re-synchronising from a master definition (`EXHAUSTIVE`).

## When not to use

- Inside `task-batch-execute` (excluded task).
- Partial documents with `mode: EXHAUSTIVE`: everything absent from the file is archived.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| request | FILE | yes | | | The `<Table>` schema document (grammar below) |
| mode | ENUM | no | INCREMENTAL | INCREMENTAL, EXHAUSTIVE | "The import in incremental mode allows the partial update of the table, EXHAUSTIVE This mode allows the exhaustive update of the table, any element not present in the request document will be archived." |
| skipItemRefresh | ENUM | no | NO | YES, NO | "When set to YES, items conditionnal formattings and formulas are not refreshed. Use with caution if you are sure that no conditional formatting or formulas have been modified to speed up import." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

No `accountKey`: a schema is always imported into a table of the current account.

### Request grammar (schema XML)

```xml
<Table key="PRODUCTS">
    <Title>Products</Title>
    <Title-Local lang="fra">Produits</Title-Local>
    <Description>Products table</Description>
    <Color>BLUE</Color>
    <Position>1</Position>
    <Schema>
        <Levels>
            <Level key="PRODUCT" index="1">
                <Title>Product</Title>
            </Level>
        </Levels>
        <Partitions>
            <Partition key="ACTIVES">
                <Title>Actives</Title>
                <Position>1</Position>
            </Partition>
            <Partition key="ARCHIVED" status="ARCHIVED">
                <Title>Archived</Title>
            </Partition>
        </Partitions>
        <Identifiers>
            <Identifier key="EAN_13" index="1" level="PRODUCT">
                <Title>EAN 13</Title>
            </Identifier>
        </Identifiers>
        <Classifications>
            <Classification key="TYPOLOGY">
                <Title>Typology</Title>
                <Categories>
                    <Category key="HOME_APPLIANCE">
                        <Title>Home appliance</Title>
                    </Category>
                    <Category key="PHONES" parent="HOME_APPLIANCE">
                        <Title>Phones</Title>
                    </Category>
                </Categories>
            </Classification>
        </Classifications>
        <Fields>
            <Field key="TITLE_EN" type="SINGLE-LINE-TEXT" level="PRODUCT">
                <Title>Title EN</Title>
                <Title-Local lang="fra">Titre EN</Title-Local>
                <Metadata key="VISIBLE-WEBSITE">TRUE</Metadata>
            </Field>
            <Field key="PRICE_EURO" type="NUMBER" level="PRODUCT">
                <Title>Price EUR</Title>
                <Suffix>EUR</Suffix>
                <Precision>2</Precision>
            </Field>
            <Field key="LIFE_CYCLE" type="SINGLE-SELECT" level="PRODUCT">
                <Title>Life cycle</Title>
                <Options>
                    <Option key="ACTIVE" color="GREEN">
                        <Title>Active</Title>
                    </Option>
                    <Option key="INACTIVE" color="BLACK">
                        <Title>Inactive</Title>
                    </Option>
                </Options>
            </Field>
            <Field key="DESCRIPTION_EN" type="LONG-TEXT" level="PRODUCT">
                <Title>Description EN</Title>
            </Field>
            <Field key="MAIN_IMAGE" type="IMAGE" level="PRODUCT">
                <Title>Main image</Title>
            </Field>
            <Field key="SCREEN_RESOLUTION" type="SINGLE-LINE-TEXT" level="PRODUCT">
                <Title>Screen resolution</Title>
            </Field>
        </Fields>
        <Matrix>
            <Common>
                <Field key="TITLE_EN" />
                <Field key="PRICE_EURO" />
                <Field key="LIFE_CYCLE" />
                <Field key="DESCRIPTION_EN" />
                <Field key="MAIN_IMAGE" />
            </Common>
            <Specific classification="TYPOLOGY" category="PHONES">
                <Field key="SCREEN_RESOLUTION" />
            </Specific>
        </Matrix>
        <Conditional-Formattings>
            <Conditional-Formatting key="COMPLIANCE" level="PRODUCT">
                <Title>Compliance</Title>
                <Default-Status key="VALID">
                    <Title>Valid</Title>
                    <Color>GREEN</Color>
                </Default-Status>
                <Statuses>
                    <Status key="INVALID">
                        <Title>Invalid</Title>
                        <Color>RED</Color>
                        <Priority>1</Priority>
                        <Rules>
                            <Common>
                                <Identifier key="EAN_13">
                                    <Rule-Barcode type="EAN13"/>
                                    <Rule-Required/>
                                </Identifier>
                                <Field key="TITLE_EN">
                                    <Rule-Required />
                                    <Rule-Max-Length max="27" />
                                </Field>
                            </Common>
                        </Rules>
                    </Status>
                </Statuses>
            </Conditional-Formatting>
        </Conditional-Formattings>
        <Sections>
            <Section key="INFORMATIONS">
                <Title>Informations</Title>
            </Section>
        </Sections>
        <Screens>
            <Screen key="ALL_PROPERTIES" level="PRODUCT">
                <Title>All properties</Title>
                <Position>1</Position>
                <Grid>
                    <Line-Height>SHORT</Line-Height>
                    <Common>
                        <Section key="INFORMATIONS" position="1">
                            <Column-Identifier key="EAN_13" position="1" />
                            <Column-Classification key="TYPOLOGY" position="2" />
                            <Column-Conditional-Formatting key="COMPLIANCE" position="3" />
                            <Column-Field key="TITLE_EN" position="4" />
                            <Column-Field key="DESCRIPTION_EN" position="5" display="MARKDOWN"/>
                            <Column-Field key="PRICE_EURO" position="6" />
                        </Section>
                    </Common>
                    <Specific classification="TYPOLOGY" category="PHONES">
                        <Section key="INFORMATIONS" position="1">
                            <Column-Field key="SCREEN_RESOLUTION" position="1" />
                        </Section>
                    </Specific>
                </Grid>
            </Screen>
        </Screens>
    </Schema>
</Table>
```

| Element | Essential attributes and children | Facts |
| -- | -- | -- |
| `Table` | `@key`; `Title` (1), `Title-Local @lang`, `Description`, `Description-Local`, `Color` (NONE, RED, GREEN, BLUE, ORANGE, YELLOW, PURPLE, BLACK, BROWN), `Position` | Keys: "use english in upper case separated by underscore"; "Keys with heading or trailing spaces are rejected." Languages: ara, zho, eng, fra, deu, hin, ita, jpn, kor, nld, por, rus, spa |
| `Levels/Level` | `@key`, `@index` (1..5, cannot be updated), `Title` | "A table must have at least one level at index 1." Up to 5 levels |
| `Partitions/Partition` | `@key`, `@status="ARCHIVED"` (optional), `Title`, `Position` | "At least one partition must be active." Best practice: at most 100 000 items per partition |
| `Identifiers/Identifier` | `@key`, `@index` (1..5), `@level`, `Title` | Up to 5; values unique "without taking case and accents into account" |
| `Classifications/Classification` | `@key`, `Title`, `Categories/Category @key @parent` | Up to 5 classifications, tree depth 5; cyclic categories imported with a warning |
| `Fields/Field` | `@key`, `@type`, `@level`, `Title`; NUMBER: `Suffix`, `Prefix`, `Precision` (0..5) or `Suffixes/Suffix @key @default @status`; SINGLE-SELECT and MULTIPLE-SELECT (plus `-QUANTIFIED`, `-QUANTIFIED-WITH-COMMENTS`): `Options/Option @key @color`; COMPOSITE (beta): `@multi-valued`, nested `Field` without `@level`, `Field/@unique`, `CollectStrategies/CollectStrategy @type (BY_FIELDS, BY_ID, BY_POSITION) @priority` | Types: SINGLE-LINE-TEXT, LONG-TEXT, HTML-TEXT, NUMBER, DATE, DATE-TIME, SINGLE-SELECT, MULTIPLE-SELECT, MULTIPLE-SELECT-QUANTIFIED, MULTIPLE-SELECT-QUANTIFIED-WITH-COMMENTS, IMAGE, ATTACHMENT, COMPOSITE. "a data type cannot be changed"; a duplicate key is ignored with a warning; COMPOSITE import is exhaustive |
| `Matrix` | `Common/Field @key`, `Specific @classification @category / Field @key` | "Do not reference the identifiers or the classifications or the conditional formatting here". "There is no inheritance between categories". A field absent from the matrix is not usable on items |
| `Formulas` | undocumented | Only use cases are listed; the grammar is not on the page. Do not generate; copy from an export |
| `Conditional-Formattings/Conditional-Formatting` | `@key`, `@level`, `Title`, `Default-Status @key` (`Title`, `Color`), `Statuses/Status @key` (`Title`, `Color`, `Priority`, `Rules/Common` and `Rules/Specific` holding `Identifier`, `Classification`, `Field` with `Rule-*` children) | Up to 10 statuses per formatting; lower `Priority` wins. Rules: `Rule-Required`, `Rule-Min-Length`, `Rule-Max-Length`, `Rule-Regex`, `Rule-Barcode type`, `Rule-Is-Leaf`, `Rule-Less-Than`, `Rule-Greater-Than` (and `-Or-Equal`), `Rule-Decimal-Places`, `Rule-Min-Values`, `Rule-Max-Values`, `Rule-Only-Active-Options`, `Rule-Must-Be-Selectable`, `Rule-Max-Size-Kb`, `Rule-Extension`, image size and color rules, `Rule-Must-Be-*-Another-Field field`, `Rule-Required-If-Another-Field-*`, `Rule-Condition key` (same condition grammar as `rules-engine-import-rules`) |
| `Sections/Section` | `@key`, `Title` | Groups columns in the grid |
| `Screens/Screen` | `@key`, `@level`, `Title`, `Position`, `Grid` (0..1) with `Line-Height` (SHORT, MEDIUM, TALL, EXTRA_TALL), `Common` (1) and `Specific @classification @category` (0..*), each holding `Section @key @position` elements with `Column-Identifier`, `Column-Classification`, `Column-Conditional-Formatting`, `Column-Field` (`@read-only`, `@fixed`, `@width` SMALL / MEDIUM / LARGE / EXTRA_LARGE, `@display="MARKDOWN"` on LONG-TEXT), `Column-Composite` (`@read-only`, `@lines-read-only`, `@fixed`, `@width`; sub-columns as `Column-Field`, "Either all `Column-Field` are within the `./Column-Composite/Section` or none of them are": the nested `Section` occurs 0..*, so the sub-columns sit either all inside sections or all directly under the composite column; the page gives no occurrence for the sub-columns themselves, so a composite column that lists none is not documented and must be tolerated by code that reads screens; at most 100 child columns) | Links "must be valid links that have already be declared in the Matrix element"; without a screen the fields are not visible in the grid. `Grid/Common/Section` and `Grid/Specific/Section` occur 0..*, and the Occurs table lists `Grid/Common/Column-Identifier` directly under `Grid/Common` (the same table writes the section's `@key` and `@position` as `Grid/Common/@key` and `Grid/Common/@position`, so the missing `Section/` may be a documentation shortcut): code that reads screens must not require the `Section` and reads columns both inside sections and directly under `Common` and `Specific`, as for `Column-Composite`. A column's `@position` is relative to its section. In the grid a composite column shows no value but a link that opens a screen showing all the fields composing it (user guide, "Composite fields") |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${import_schema.output.report} | FILE | The only output: execution report with warnings for ignored elements (duplicate field, cyclic categories, invalid `use-if-empty`) |

## Example

```json
{
  "name": "table-import-schema",
  "taskReferenceName": "import_schema",
  "description": "Create or update the products table structure",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "request": "file://assets/schema.xml",
    "mode": "INCREMENTAL"
  }
}
```

## Gotchas and limits

- Limits: input file 900 Mb; 50 000 sections per table; 500 000 fields per table; 5 identifiers; 8 conditional formatting fields per the limits page (the page body says 5); 5 classifications; 30 000 options per field (best practice 500); 2 000 rules per formula field; 5 000 values per condition; classification depth 5; composite depth 5.
- "The data type of a field can't be changed. The key of a field can't be changed. The order of the fields or sections doesn't matter." Level `index`, identifier `index` and suffix `key` cannot be updated either.
- `EXHAUSTIVE` archives everything absent from the file; `INCREMENTAL` (default) adds and updates.
- Minimal viable table (implied by the documentation): one level (index 1), one active partition, one identifier with `level`, fields with `level`, a `Matrix/Common` listing every field, one section and one screen referencing it.
- Excluded from `task-batch-execute`; triggers an item refresh unless `skipItemRefresh: "YES"` (then run `table-refresh-items` when needed).
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `table-export-schema` (same grammar out), `table-import-items`, `table-refresh-items`
- `rules-engine-import-rules` (shared condition grammar)
- `file-conversion-xlsx-to-xml` and `file-transformation-xslt` (build a schema from a spreadsheet)
