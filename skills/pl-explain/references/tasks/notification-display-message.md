# notification-display-message

> Reference token: DF-TASK-NOTIFICATION-DISPLAY-MESSAGE-01

Status: GA | Category: notification | Documentation: https://learn.product-live.com/data-factory/references/tasks/notification-display-message/

## Purpose

"Allows to display a message in the app.product-live.com Actions panel": a sanitized HTML snippet shown to the user who launched the job, optionally localized. The message only appears when the job exposes it through its `outputParameters`.

## When to use

- End-of-job summaries for interactive jobs launched from the application: counts, statuses, links to `app.product-live.com` screens. Generated files are offered for download through the job's `outputParameters`, not through a link in the message (see the gotchas).
- Error explanations on a `SWITCH` branch before a `TERMINATE`.

## When not to use

- Periodic jobs with no user in front of the panel: use `notification-send-email` or a log.
- Rich layouts with images or scripts: the sanitizer strips them (see gotchas).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| request | FILE | yes | - | - | "A valid FILE input in HTML format." The default message, usually `${<xslt_task>.output.file}`. |
| requestLocal | OBJECT | no | - | - | "An object where keys are ISO languages and values must be a valid FILE": localized variants on top of `request`. |
| requestLocal.eng | FILE | no | - | - | English variant. |
| requestLocal.fra | FILE | no | - | - | French variant. |
| requestLocal.deu | FILE | no | - | - | German variant. |
| requestLocal.spa | FILE | no | - | - | Spanish variant. |
| height | NUMBER | yes | - | - | "The display height in px." |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Input HTML example (only allowlisted elements, classes styled through a `<style>` element):

```html
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        .table-display-message { border-collapse: collapse; }
        .table-display-message th, .table-display-message td { border: 1px solid #d9d9d9; padding: 5px; }
    </style>
</head>
<body>
    The export holds <b>65</b> products
    <table class="table-display-message">
        <thead>
            <tr><th>Total</th><th>Status</th><th>Link</th></tr>
        </thead>
        <tbody>
            <tr><td>30</td><td>Valid</td><td><a href="https://app.product-live.com/search">Open</a></td></tr>
            <tr><td>35</td><td>Invalid</td><td><a href="https://app.product-live.com/search">Open</a></td></tr>
        </tbody>
    </table>
</body>
</html>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${display_message.output.message}` | TEXT | "The message to display in the Actions panel." Must be exposed in the job `outputParameters`. |
| `${display_message.output.report}` | FILE | Common report output. |

## Example

```json
{
  "name": "notification-display-message",
  "taskReferenceName": "display_message",
  "description": "Display the import summary in the Actions panel",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "request": "${file_transformation_html.output.file}",
    "requestLocal": {
      "eng": "${file_eng.output.file}",
      "fra": "${file_fra.output.file}"
    },
    "height": 300
  }
}
```

and, at the root of `job.json`:

```json
{
  "outputParameters": {
    "summary": "${display_message.output.message}"
  }
}
```

## Gotchas and limits

- "The message only shows if the job exposes it": the `message` output "must be exposed as a job result, through the job's `outputParameters`. A job that never exposes it runs fine and displays nothing. A single job may expose several display messages." When the task sits in a `SWITCH` branch, the reference may resolve to null on the other branches; put the value in a `TERMINATE` `outputParameters` when needed.
- Language fallback: "When there is no entry for the viewer's language, the `request` message is displayed - so always provide a usable `request`, even when you localise."
- Sanitizer allowlist (anything else "is stripped silently"). Elements: `html`, `head`, `meta`, `base`, `style`, `body`, `div`, `span`, `p`, `br`, `hr`, `h3`, `h4`, `h5`, `h6`, `blockquote`, `pre`, `code`, `b`, `i`, `strong`, `em`, `strike`, `a`, `ul`, `ol`, `li`, `table`, `caption`, `thead`, `tbody`, `tr`, `th`, `td`. Attributes: `href`, `target`, `rel`, `lang`, `charset`, `name`, `content`, `class`.
- Consequences: no images (`img` and `src` are not allowed), no `h1` or `h2` (start at `h3`), inline `style` attributes are stripped (use classes and a `<style>` element), no JavaScript.
- Links, what is documented: the limits page says the HTML "cannot reference assets in assets folder", "cannot reference assets on public urls" and cannot use JavaScript; `a` with `href` and `target` is on the allowlist and the documented example links to an `app.product-live.com` page (`https://app.product-live.com/search`), so links to `app.product-live.com` pages work. Links to other public URLs and to job assets are not allowed.
- Links to generated files: whether an `href` pointing to a file produced by the job (for example a `Url` of the `listing` output of `file-generation-xlsx` written into the HTML by an XSLT) survives the sanitizer and stays downloadable is not documented. The reliable download path is to expose the file in the job's `outputParameters` (`"excel_files": "${generate_excel.output.files}"`, or the `file` output of a task that has one); the message can tell the user where to find it.
- The documentation's example uses `description: "Send emails"` (copy-paste from the email task) and writes `requestLocal[].eng`; `requestLocal` is an object, not an array.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-xslt` (produce the HTML from a report or an export)
- `switch`, `terminate` (branch to an error message and expose it)
- `notification-send-email` (asynchronous notification)
- `table-export-items` (data behind a summary)
