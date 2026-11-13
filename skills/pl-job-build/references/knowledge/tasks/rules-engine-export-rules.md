# rules-engine-export-rules

> Reference token: DF-TASK-RULES-ENGINE-EXPORT-RULES-01

Status: GA | Category: rules-engine | Documentation: https://learn.product-live.com/data-factory/references/tasks/rules-engine-export-rules/

## Purpose

"Export rules of the rules engine." Dumps the mapping of one target table as a `<Rules-Engine>` XML file, in the grammar consumed by `rules-engine-import-rules`.

## When to use

- Backup or versioning of a mapping.
- Copy a mapping between tables or accounts: export, rewrite `@table` / `@account` / keys with `file-transformation-xslt`, then `rules-engine-import-rules`.
- Always before an `rules-engine-import-rules` so the imported file stays exhaustive.

## When not to use

- Producing a human-readable report (`rules-engine-generate-rules-report` is the dedicated task, though thinly documented).
- Exporting a partner's own rules: not possible, see gotchas.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| tableKey | STRING | yes | | | "The table key of the table to export the rules from." |
| accountKey | STRING | only for shared tables | | | "The account key of the partner owning the shared table ... omit it and the task exports the rules of the table in the account the job runs under." |

"This task produces no execution report, so it takes none of the report-related inputs."

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${export_rules.output.file} | FILE | "An XML document holding the table's rules. It uses the same Rules-Engine grammar as the rules-engine-import-rules request document" |

No `report` output.

## Example

```json
{
  "name": "rules-engine-export-rules",
  "taskReferenceName": "export_rules",
  "description": "Export the mapping rules of the target table",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "tableKey": "PRODUCTS"
  }
}
```

## Gotchas and limits

- "The rules exported are the ones the account running the job has defined on that table. For a table a partner shared with you, accountKey only says where to find the table - it never exports the partner's own rules."
- "There is no partial success: every error aborts the task and no file is produced." The task fails when `tableKey` is missing, no table matches the key, the account has no access, or "the table carries no rules at all - an empty export is not produced".
- A wrong `accountKey` gives `An error occured, unable to retrieve table owner`, "the same message you get if the account service is unreachable".
- Mapping limits apply: 20 000 fields with rules, 1 000 rules per field, 500 source tables, 20 000 rules per table.
- The documentation example uses a `taskReferenceName` with spaces; generate snake_case names instead.

## Related tasks

- `rules-engine-import-rules` (same grammar in), `rules-engine-generate-rules-report`, `rules-engine-execute-rules`
- `file-transformation-xslt` (rewrite the export), `notification-send-email` (ship the file)
