# notification-send-email

> Reference token: DF-TASK-NOTIFICATION-SEND-EMAIL-01

Status: GA | Category: notification | Documentation: https://learn.product-live.com/data-factory/references/tasks/notification-send-email/

## Purpose

"Allows to send emails programmatically." One HTML file is one email: recipients, subject and attachments are declared with `<meta name="pl-mail-*">` elements in the HTML head, the body is the message.

## When to use

- Notify users or partners of a job result, with generated files (PDF, Excel, zip) attached or linked.
- Mass mailing from one template: produce one HTML per recipient with `file-transformation-xslt` and use `mode: FILES` (at most 50 emails per execution).

## When not to use

- Feedback to the user who launched an interactive job: `notification-display-message`.
- Attachments over 10 MB in total: upload them (`protocol-ftp-post`, `file-generation-archive`) and link them instead.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILE, FILES | One email or a list of emails. |
| file | FILE | if mode = FILE | - | - | HTML email: `${previous_task.output.file}`, `file://assets/mail.html` or `${workflow.input.<key>}`. |
| files | FILES | if mode = FILES | - | - | One HTML file per email. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

HTML contract: "Each HTML file must contain a `<meta name="pl-mail-to">` `<meta name="pl-mail-subject">` elements and optionally `<meta name="pl-mail-attachments">`." `pl-mail-to`, `pl-mail-cc` and `pl-mail-bcc` take `;`-separated addresses; `pl-mail-attachments` takes `;`-separated `fileName=url` pairs.

```html
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="pl-mail-to" content="user1@example.com;user2@example.com" />
        <meta name="pl-mail-cc" content="user3@example.com" />
        <meta name="pl-mail-bcc" content="user4@example.com" />
        <meta name="pl-mail-subject" content="New products" />
        <meta name="pl-mail-attachments" content="images.zip=https://app.product-live.com/files-data-factory/2345...bcde;pdf.zip=https://app.product-live.com/files-data-factory/789a...0123" />
        <style>
            body { font-family: 'Segoe UI', sans-serif; }
        </style>
    </head>
    <body>
        <p>Hello <b>mail!</b></p>
        <p>Attachments can also be <a href="https://app.product-live.com/files-data-factory/2345...bcde">linked</a>.
        In this case, if it's a Product-Live link it will be downloaded only if the user is connected.</p>
    </body>
</html>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${send_email.output.allEmailsSent}` | ENUM YES/NO | NO when at least one email was not sent. |
| `${send_email.output.report}` | FILE | Codes: `EMAIL_SEND_STARTED`, `EMAIL_INVALID_INPUT_ERROR` ("the file required by `mode` was not provided, or the list of files is empty"), `NO_SUBJECT_FOUND`, `NO_RECIPIENTS_FOUND`, `INVALID_EMAIL` (names the address), `FILES_NOT_DOWNLOADED_ERROR`, `EMAIL_LARGE_ATTACHMENTS_ERROR`, `EMAIL_ENDED_WITH_ERROR`, `EMAIL_ALL_HAVE_NOT_BEEN_SENT_ERROR`, `EMAIL_SEND_SUCCESS`. |

## Example

```json
{
  "name": "notification-send-email",
  "taskReferenceName": "send_email",
  "description": "Send the export summary to the catalog team",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "mode": "FILE",
    "file": "${file_transformation_html.output.file}"
  }
}
```

## Gotchas and limits

- Limits per email: attachments 10 (recommended 1); total size of attachments and content 10 MB (recommended 1 MB); recipients to + cc + bcc 100 (recommended 10); emails per task execution 50. "When a limit is exceeded, the corresponding email is ignored and a log entry with the matching error code is added": branch on `allEmailsSent` and read the report.
- FAQ: the HTML cannot reference files of the assets folder nor public URLs "for a security issue": no remote images or stylesheets in the body; inline `<style>` and links to platform files are fine.
- Attachment URLs are usually the `Url` values of a previous task's `listing` (`file-generation-pdf`, `file-generation-xlsx`, `file-generation-archive`); build the `pl-mail-attachments` content in the XSLT.
- The documentation's "Mode = FILES" example keeps `"mode": "FILE"` with a `files` input; that is a documentation bug, use `"mode": "FILES"` with `files`.
- Recipient addresses in a job should come from user inputs, variables or data, never hard-coded; put them in the HTML through XSLT params or data.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-xslt` (produce the HTML)
- `file-generation-pdf`, `file-generation-xlsx`, `file-generation-archive` (attachments through their `listing` URLs)
- `notification-display-message` (in-app alternative)
