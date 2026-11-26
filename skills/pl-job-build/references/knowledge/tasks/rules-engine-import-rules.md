# rules-engine-import-rules

> Reference token: DF-TASK-RULES-ENGINE-IMPORT-RULES-01

Status: GA | Category: rules-engine | Documentation: https://learn.product-live.com/data-factory/references/tasks/rules-engine-import-rules/

## Purpose

"Import rules of the rules engine." Defines the whole mapping of one target table from a `<Rules-Engine>` XML document: links to source tables plus rules per identifier, classification and field.
"The file is interpreted as an exhaustive file. Therefore rules that are in the file are updated or created, and rules that are not in the file are removed."

## When to use

- Provisioning or migrating a mapping (restore an export, clone between tables or accounts).
- Generating rules programmatically, for example from a spreadsheet through `file-conversion-xlsx-to-xml` and `file-transformation-xslt`.

## When not to use

- Adding one rule to an existing mapping without first exporting it: the file replaces everything.
- Running the rules (`rules-engine-execute-rules`).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| request | FILE | yes | | | The `<Rules-Engine>` document (grammar below) |
| accountKey | STRING | only for shared tables | | | "The account key of the partner owning the shared table." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

### Request grammar

Root and source tables:

```xml
<Rules-Engine table="PRODUCTS_TARGET" account="target-account-key">
    <Source-Tables>
        <Table key="PRODUCTS_SOURCE" source-identifier="EAN_13" target-identifier="EAN" />
    </Source-Tables>
    <Rules>
        <Field key="LABEL" source-table="PRODUCTS_SOURCE">
            <Rule priority="1" name="Automate Label from Title">
                <Conditions>
                    <Condition-Group>
                        <Condition source="TITLE" operator="NOT_EMPTY" />
                        <Condition target="LABEL" operator="EMPTY" />
                    </Condition-Group>
                </Conditions>
                <Action type="SET_TEXT">
                    <Copy source="TITLE" trim-spaces="true" />
                </Action>
            </Rule>
        </Field>
        <Field key="DESCRIPTION" skip="true" />
    </Rules>
</Rules-Engine>
```

| XPath | Meaning | Occurs |
| -- | -- | -- |
| `Rules-Engine/@table`, `@account` | Target table key, target account key | 1, 1 |
| `Source-Tables/Table` | One link per source table: `@key`, `@source-identifier`, `@target-identifier`, `@account` (only when the source table belongs to another account) | 1..* |
| `Rules/Identifier`, `Rules/Classification`, `Rules/Field` | One element per target attribute, with `@key`, `@source-table` (mandatory when rules exist and `skip` is not `true`; must be declared in `Source-Tables`), `@source-account`, `@skip` | 0..5, 0..5, 0..* |
| `Rule` | `@priority` (execution order), `@name` (optional), `Conditions` (0..1), `Action` (1) | 0..1000 per attribute |
| `Conditions/Condition-Group` | AND inside a group, OR between groups; "Nesting group of conditions is not allowed" | 1..* |
| `Condition` | `@source` or `@target` (attribute key), `@operator`, `@use` (for example `SUFFIX_KEY`), child `Value` elements for operators that need one | 1..* |

Links: "One link per level of the target table, per source table." On a multi-level target the same source table may be listed once per level with a different `target-identifier`. Identifiers must be active. A rejected `Table` entry does not stop the import.

Condition operators by attribute type:

| Attribute type | Operators |
| -- | -- |
| IDENTIFIER | EMPTY, NOT_EMPTY, CONTAINS, EQUALS, STARTS_WITH, ENDS_WITH, IN, NOT_IN |
| CLASSIFICATION, SINGLE-SELECT, MULTIPLE-SELECT (all variants) | EMPTY, NOT_EMPTY, EQUALS, NOT_EQUALS, IN, NOT_IN (value = option or category key) |
| SINGLE-LINE-TEXT, LONG-TEXT, HTML-TEXT | EMPTY, NOT_EMPTY, CONTAINS, EQUALS, STARTS_WITH, ENDS_WITH |
| NUMBER, DATE, DATE-TIME | EMPTY, NOT_EMPTY, LESS_THAN, LESS_THAN_OR_EQUAL, GREATER_THAN, GREATER_THAN_OR_EQUAL, EQUALS (number with `.`; dates as `YYYY-MM-DDTHH:mm:ss.sssZ`) |
| NUMBER suffix (`use="SUFFIX_KEY"`) | EMPTY, NOT_EMPTY, EQUALS, NOT_EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH |
| IMAGE, ATTACHMENT | EMPTY, NOT_EMPTY |

```xml
<Condition target="COLOR" operator="NOT_IN">
    <Value>RED</Value>
    <Value>BLUE</Value>
</Condition>
<Condition source="PRICE" use="SUFFIX_KEY" operator="EQUALS">
    <Value>EURO</Value>
</Condition>
```

Actions (one `Action` per rule; `@type` depends on the target type):

| Target type | Action type | Allowed children |
| -- | -- | -- |
| SINGLE-LINE-TEXT, LONG-TEXT, HTML-TEXT | SET_TEXT | `Copy` (`@source` or `@target`, `@use` title / title-local / key, `@lang`, `@remove-carriage-returns`, `@trim-spaces`), `Value`, `Template` (`@trim-spaces`, `@engine` twig.1 default or twig.2) |
| NUMBER | SET_NUMBER | `Copy` (`@precision`, `@round` UP / DOWN / CEILING / FLOOR / HALF_UP / HALF_DOWN, `@suffix`), `Value`, `Template` (`@precision`, `@round`, `@engine`) |
| SINGLE-SELECT | SET_OPTION | `Map` (`@source`, `Entry @source @target @skip`), `Value` |
| MULTIPLE-SELECT (all variants) | SET_OPTIONS | `Map`, `Value` (`@quantity`, `@comment`) |
| CLASSIFICATION | SET_CATEGORY | `Map`, `Value` |
| IMAGE | SET_IMAGE | `Copy` (`@width-px`, `@height-px`, `@quality` 1..100, `@format` jpg / png) |
| ATTACHMENT | SET_ATTACHMENT | `Copy` |

`Map` rules for the three select actions:

- `SET_OPTION`: `Map/@source` is a `SINGLE-SELECT` field or a classification.
- `SET_OPTIONS`: `Map/@source` is a `MULTIPLE-SELECT`, `MULTIPLE-SELECT-QUANTIFIED` or `MULTIPLE-SELECT-QUANTIFIED-WITH-COMMENTS` field. "A `Classification` cannot be used as source."
- An `Entry` whose source option or category is archived must carry `skip="true"`, otherwise the rule is rejected (`RULE_SOURCE_OPTION_IS_ARCHIVED`). An archived target option or category is not checked.
- Several source options can point to the same target option. When an item holds several of them, the target option is set once, with the quantity and comment of the last one.

```xml
<Action type="SET_TEXT">
    <Template trim-spaces="true" engine="twig.1"><![CDATA[
        <b>Composition</b><br></br>{{source("COMPOSITION")}}
    ]]></Template>
</Action>
<Action type="SET_NUMBER">
    <Copy source="PRICE" precision="2" round="UP" suffix="EURO"/>
</Action>
<Action type="SET_OPTION">
    <Map source="MAIN_COLOR">
        <Entry source="RED" target="RED" />
        <Entry source="BURGUNDY" target="RED" />
        <Entry source="YELLOW" skip="true" />
    </Map>
</Action>
<Action type="SET_CATEGORY">
    <Value>FRIDGE</Value>
</Action>
<Action type="SET_IMAGE">
    <Copy source="FRONT_VIEW" width-px="1000" height-px="1000" quality="90" format="jpg" />
</Action>
```

Templates reference source attributes with `{{source("KEY")}}` (second parameter `title`, `title-local` or `key` for classifications and lists, third parameter the language). A multiple-select source copied as text is joined with `;`. Best practice: "Do the concatenation only if all attributes used are not empty. For this use the conditions."

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${import_rules.output.allRulesImported} | ENUM YES / NO | "YES the whole file went in, NO at least one entry of the file was refused." |
| ${import_rules.output.report} | FILE | "A report file of warnings and errors." Every entry is a `<Log type="error">` with the code in `<Metadata name="code">`; "This task never produces an info or a warning log" |

Report codes: `DUPLICATE_SOURCE_ON_TARGET_TABLE`, `SOURCE_TABLE_DOES_NOT_EXIST` (also used when the target table itself is missing or not accessible, in which case nothing is imported), `SOURCE_IDENTIFIER_DOES_NOT_EXIST`, `TARGET_IDENTIFIER_DOES_NOT_EXIST`, `NOT_FOUND` (unknown `@account`, message is a bare `nothing found`), `FIELD_SOURCE_INACCESSIBLE`, `RULE_TARGET_FIELD_INACCESSIBLE`, `RULE_SOURCE_FIELD_INACCESSIBLE`.

## Example

```json
{
  "name": "rules-engine-import-rules",
  "taskReferenceName": "import_rules",
  "description": "Replace the mapping of the target table with the rewritten export",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "request": "${rewrite_rules.output.file}"
  }
}
```

## Gotchas and limits

- Exhaustive import: rules absent from the file are removed. Always `rules-engine-export-rules` first, merge, then import; never import a partial file.
- "An unresolvable source table is not reported": a missing `@key`, or a `@key` naming no table under the resolved account, skips that entry "and every Table entry after it ... and no log says so". Symptoms: `allRulesImported: NO`, missing rules, and only knock-on `FIELD_SOURCE_INACCESSIBLE` rejections. Check `Source-Tables` first.
- Multi-level targets: a link joins the level of `source-identifier` to the level of `target-identifier`; rules on an element above the joined level fail with `FIELD_SOURCE_INACCESSIBLE`. "The task does not check that the levels are consistent."
- Limits: 20 000 fields with rules, 1 000 rules per field (`Rule` 0..1000), 500 source tables, 20 000 rules per table; `Rules/Identifier` and `Rules/Classification` at most 5 each.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `rules-engine-export-rules` (same grammar out), `rules-engine-execute-rules`
- `table-export-schema` (discover keys and types before writing rules)
- `file-transformation-xslt`, `switch` on `allRulesImported`
