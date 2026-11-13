# rules-engine-generate-rules-report

> Reference token: DF-TASK-RULES-ENGINE-GENERATE-RULES-REPORT-01

Status: GA (thinly documented, treat as low confidence) | Category: rules-engine | Documentation: https://learn.product-live.com/data-factory/references/tasks/rules-engine-generate-rules-report/

## Purpose

"Generate rules report based on existing rules." Produces a report file describing the rules of a source table toward a target account.
The documentation page is about 1 KB long; the format of the produced report is not documented.

## When to use

- Documenting or auditing the mapping a supplier maintains for a given retailer, then e-mailing the file or attaching it to a display message.

## When not to use

- When a predictable, parseable output is required: prefer `rules-engine-export-rules` followed by an XSLT.
- Inside a job that must branch on the content of the report (its shape is unknown).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| targetAccountName | STRING (the table says ARRAY, the example passes a string) | yes | | | "The target account for which the report have to be generated. Use uppercase letters and replace any spaces with underscores." |
| sourceTableKey | STRING | yes | | | "The Rules source table key." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${generate_rules_report.output.report} | FILE | "The report." The documentation does not say whether this is the generic execution report or the rules report itself |

## Example

```json
{
  "name": "rules-engine-generate-rules-report",
  "taskReferenceName": "generate_rules_report",
  "description": "Generate the rules report for the partner account",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "targetAccountName": "PARTNER_ACCOUNT",
    "sourceTableKey": "PRODUCTS"
  }
}
```

## Gotchas and limits

- Perspective is inverted compared with the other rules-engine tasks: this task takes a source table key and a target account name, not a target table key and an account key.
- `targetAccountName` is typed ARRAY in the documentation table but used as a STRING in the example; the example value also uses a hyphen although the text asks for uppercase letters and underscores. Follow the text (uppercase, underscores) and pass a string.
- No limits snippet, no description of the report content. The documentation shows both the ARRAY type and a STRING example; prefer the STRING form.
- Report inputs `skipReportGeneration` / `logLevel` apply.
- Recommendation: flag this task as "to verify" in any generated job and offer `rules-engine-export-rules` + XSLT as the documented alternative.

## Related tasks

- `rules-engine-export-rules` (documented alternative)
- `notification-send-email`, `notification-display-message` (deliver the report)
