# User inputs

> Reference token: DF-USER-INPUTS-01

User inputs are the form fields shown to the user when a job is launched; their values reach the tasks as `${workflow.input.<key>}`.
There are seven types: `TEXT`, `TEXTAREA`, `SELECT`, `FILE`, `DATE`, `FIELD` and `SCREEN`. All support the optional `multiple` property.
This file lists every property of each type, the shape of the value received by the job, and the rules that apply to all of them.

## 1. Rules common to every input

| Property | Required | Description |
| -- | -- | -- |
| `key` | required | Unique identifier of the input. Used to reference the value in tasks: `${workflow.input.<key>}`. Unique within the job; never `context` (the job context) nor `workflow` (convention of these skills). |
| `title` | required | Label displayed to the user in the form. |
| `titleLocal` | optional | Localized labels keyed by language code (`fra`, `eng`, `deu`, ...). |
| `description` | optional | Additional explanation displayed under the field. |
| `descriptionLocal` | optional | Localized descriptions. |
| `required` | required | `true` or `false` (boolean): whether the field must be filled in. |
| `type` | required | One of `TEXT`, `TEXTAREA`, `SELECT`, `FILE`, `DATE`, `FIELD`, `SCREEN`. |
| `multiple` | optional | Default `false`. When `true`, the user can add or remove entries (plus / minus buttons) and the job receives an array instead of a single value. |
| `default` | optional | Default value used when the user does not change the field (`TEXT`, `TEXTAREA`, `SELECT`). The property is `default`, never `defaultValue`. |

Other facts:

- `userInputs` is an array placed after `title` (and the other metadata) in `job.json`. "The order of user inputs displayed is the same as the order in your Job."
- Keep input keys (and option keys inside a `SELECT`) unique: the documentation calls the key a "Unique identifier of the input". What the upload does with a duplicate key is not documented.
- Never name an input `context`: `${workflow.input.context}` is reserved for the job context (see `job-context.md`).
- Only the properties listed in this file are part of the documented format; leave any other property out of a user input.
- When the job is launched from the API or by another job, the `input` object of the execution plays the same role: a key that is not declared in `userInputs` is still readable as `${workflow.input.<key>}` (see `job-context.md`).

## 2. TEXT

A single-line text field. The documentation describes text values as strings ("an array of strings" with `multiple`), so treat the value as a string even when it looks like a number (`"days": "30"`) and convert it where you use it (`$.data.days || 30` in a script, `xs:integer($days)` in XSLT).

```json
{
  "key": "catalog_name",
  "title": "Catalog name",
  "titleLocal": {
    "fra": "Nom du catalogue"
  },
  "description": "The catalog name on the cover page",
  "descriptionLocal": {
    "fra": "Le nom du catalogue affiche sur la page de garde"
  },
  "required": true,
  "type": "TEXT",
  "default": "New catalog"
}
```

| Property | Required | Description |
| -- | -- | -- |
| `type` | required | Must be `TEXT`. |
| `default` | optional | Default value used when the user does not change the field. |
| `multiple` | optional | Default `false`. If `true`, allows adding multiple text entries. The job receives an array of strings. |

## 3. TEXTAREA

Same as `TEXT` but with a larger input area (4 rows minimum). Useful for multi-line content such as a list of EAN codes, one per line. The value is one string containing line breaks; split it in a script or with `tokenize()` in XSLT.

```json
{
  "key": "ean_list",
  "title": "EAN codes",
  "description": "Enter EAN codes, one per line",
  "required": true,
  "type": "TEXTAREA",
  "default": ""
}
```

Properties: `key`, `title`, `description`, `required`, `type` (`TEXTAREA`), `default` (optional), `multiple` (optional: multiple textarea entries, array of strings).

## 4. SELECT

A dropdown. The job receives the option `key`, not its title.

```json
{
  "key": "export_language",
  "title": "Select language",
  "description": "Select the language of the exported catalog",
  "required": true,
  "mode": "SINGLE",
  "type": "SELECT",
  "options": [
    {
      "key": "fra",
      "title": "French"
    },
    {
      "key": "spa",
      "title": "Spanish"
    }
  ],
  "default": "fra"
}
```

| Property | Required | Description |
| -- | -- | -- |
| `type` | required | Must be `SELECT`. |
| `mode` | optional | Number of selectable options: `SINGLE` (default) or `MULTIPLE`. |
| `options` | required | Array of selectable options, each with a `key` and a `title` (published jobs also give options a `titleLocal`). Keep option keys unique within the input (recommendation). |
| `default` | optional | Default selected value: the `key` of an option. |
| `multiple` | optional | Default `false`. If `true`, allows selecting multiple options. Equivalent to `mode: "MULTIPLE"`. The job receives an array. |

With `mode: "MULTIPLE"` the documentation states that the job receives an array; published jobs consume the value in XSLT with `tokenize($fields, ',')`, which suggests a comma-joined string in some contexts. Test the exact shape on your account before relying on it; in a script, normalise with `Array.isArray(v) ? v : String(v).split(',')`.

## 5. FILE

A file upload. The job receives a file object, not a URL string.

```json
{
  "key": "zip_file",
  "title": "Zip file",
  "description": "Use a zip file with images at the root",
  "required": true,
  "type": "FILE"
}
```

| Property | Required | Description |
| -- | -- | -- |
| `type` | required | Must be `FILE`. |
| `multiple` | optional | Default `false`. If `true`, allows uploading multiple files. The job receives an array of file objects. |

There is no `default` for a `FILE` input. Limits: maximum 2 GB per file; the upload time is limited to 1 minute, so the practical maximum depends on the connection speed. For large files prefer an FTP or HTTP source.

Once uploaded, the following properties are accessible in the job:

```json
{
  "input": {
    "file": {
      "id": "000000000000000000000001",
      "url": "https://files.example.com/...",
      "name": "my_zip_file.zip",
      "hash": "0000000000000000000000000000000000000000000000000000000000000001",
      "type": "file",
      "key": "...",
      "createdAt": "2024-04-22T13:43:21Z",
      "updatedAt": "2024-04-22T13:43:21Z"
    }
  }
}
```

How to wire it:

- Into a `FILE` typed task input, pass the whole object: `"file": "${workflow.input.zip_file}"`.
- To let an XSLT read the file, pass the whole object in `params[].select` (`"select": "${workflow.input.zip_file}"`, the documented form); the value the stylesheet receives is not documented, and the generic jobs of the documentation open file params with `doc($p)`, `document($p)` or `unparsed-text($p)` (see `scripting.md` section 4.2).
- Where the URL itself is the value (a link written into an HTML output, a string inside `data` of a script), use `${workflow.input.zip_file.url}`; `.name` gives the original file name.
- Never build a `{ "url": ... }` object by hand around the reference.

## 6. DATE

A date picker. The selected date is passed to the job as an ISO 8601 string (for example `2026-04-22T00:00:00.000Z`).

```json
{
  "key": "start_date",
  "title": "Start date",
  "description": "Select the start date",
  "required": true,
  "type": "DATE"
}
```

Properties: `key`, `title`, `description`, `required`, `type` (`DATE`), `multiple` (optional: "allows selecting multiple dates", array of ISO strings). The documentation example shows `"default": ""` on a `DATE` input although `default` is not in its property table; omit it.

## 7. FIELD

A dropdown populated with the fields visible on the screen currently displayed by the user. Only fields present on that screen are listed. The selected field object is passed to the job. Supports filtering via `options.filters`.

```json
{
  "key": "target_field",
  "title": "Target field",
  "description": "Select a field",
  "required": true,
  "type": "FIELD"
}
```

```json
{
  "key": "image_field",
  "title": "Image field",
  "description": "Select an IMAGE field",
  "required": true,
  "type": "FIELD",
  "options": {
    "filters": [
      { "field": "dataType", "operator": "in", "value": ["IMAGE"] }
    ]
  }
}
```

```json
{
  "key": "title_fields",
  "title": "Title fields",
  "description": "Select fields whose key contains TITLE",
  "required": false,
  "type": "FIELD",
  "multiple": true,
  "options": {
    "filters": [
      { "field": "key", "operator": "contains", "value": "TITLE" }
    ]
  }
}
```

Filter properties (filters are combined with AND):

| Property | Description |
| -- | -- |
| `field` | The screen field property to filter on: `dataType`, `key`, `title`, `status`, or any other property of the field object. |
| `operator` | `in`, `equals`, `contains`, `startsWith`, `endsWith`. |
| `value` | A string for most operators, or an array of strings for `in`. |

Data types usable in filter values: `IMAGE`, `ATTACHMENT`, `NUMBER`, `SINGLE-LINE-TEXT`, `LONG-TEXT`, `HTML-TEXT`, `SINGLE-SELECT`, `MULTIPLE-SELECT`, `MULTIPLE-SELECT-QUANTIFIED`, `DATE`, `DATE-TIME`, `COMPOSITE`, `IDENTIFIER`, `CLASSIFICATION`. Use the hyphenated form (`SINGLE-LINE-TEXT`); the underscore form is also matched automatically.

The documentation only says that "the selected field object is passed to the job" and lists `dataType`, `key`, `title` and `status` as properties the filters can test; that the passed object carries these properties is an inference (undocumented). Its exact property list is not documented, so wire `${workflow.input.target_field.key}` (repository practice) and nothing more specific. A `FIELD` input lists the fields of the screen the user has open, so it fits jobs launched from a table in the app: the job context carries no `view` for `API` and `PERIODIC` launches, and what the input lists when the job is launched from Settings is not documented.

## 8. SCREEN

A dropdown populated with the screens available on the current table. The selected screen object is passed to the job.

```json
{
  "key": "target_screen",
  "title": "Screen",
  "description": "Select the target screen",
  "required": false,
  "type": "SCREEN"
}
```

Properties: `key`, `title`, `description`, `required`, `type` (`SCREEN`), `multiple` (optional, "allows selecting multiple screens"). The only sub-path shown publicly is the screen key, in a published use case job (`${workflow.input.screen.key}` for an input named `screen`): `${workflow.input.target_screen.key}` here. Like `FIELD`, it depends on a table being open in the app.

## 9. How values arrive in tasks

| Input type | Value received | Typical wiring |
| -- | -- | -- |
| `TEXT`, `TEXTAREA` | string | `"days": "${workflow.input.days}"` |
| `SELECT` (single) | option key (string) | `"select": "${workflow.input.language}"` |
| `SELECT` (`mode: MULTIPLE`) | array of option keys (see section 4) | normalise in a script or jq task |
| `FILE` | file object (`id`, `url`, `name`, `hash`, ...) | `"file": "${workflow.input.zip_file}"`; `.url` only in string contexts |
| `DATE` | ISO 8601 string (`2026-04-22T00:00:00.000Z`) | `"value": "${workflow.input.start_date}"` in a criteria |
| `FIELD` | field object (property list not documented, see section 7) | `"${workflow.input.target_field.key}"` |
| `SCREEN` | screen object (`key`, ...) | `"${workflow.input.target_screen.key}"` |
| any type with `multiple: true` | array of the above | pass the whole reference to `data` of a script and iterate |

A reference embedded in a longer string suits string values (`"Catalog ${workflow.input.catalog_name}"`); how a file object renders inside text (`"${workflow.input.zip_file} copy"`) is not documented. Keep a file reference as the entire value.

What an optional input left empty resolves to is not documented: guard it in scripts (`$.data.screenKey || ''`) and prefer giving a `default` to text inputs.

## 10. Complete example

```json
{
  "schema": "1.0",
  "key": "export-catalog",
  "title": "Export catalog",
  "icon": "file-pdf",
  "userInputs": [
    {
      "key": "language",
      "title": "Language",
      "description": "Select language",
      "required": true,
      "type": "SELECT",
      "options": [
        { "key": "french", "title": "French" },
        { "key": "english", "title": "English" }
      ],
      "default": "english"
    },
    {
      "key": "cover_image",
      "title": "Cover image",
      "description": "Optional image shown on the first page",
      "required": false,
      "type": "FILE"
    },
    {
      "key": "valid_from",
      "title": "Valid from",
      "required": true,
      "type": "DATE"
    }
  ],
  "tasks": [
    {
      "name": "table-export-items",
      "taskReferenceName": "export_items",
      "description": "Export the selected items",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "tableKey": "PRODUCTS",
        "mode": "USER_SELECTION",
        "fileName": "items.xml"
      }
    },
    {
      "name": "file-transformation-xslt",
      "taskReferenceName": "build_catalog_html",
      "description": "Build the HTML catalog",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "mode": "FILE",
        "file": "${export_items.output.file}",
        "xslt": "file://assets/catalog.xslt",
        "params": [
          { "name": "language", "select": "${workflow.input.language}" },
          { "name": "cover_image_url", "select": "${workflow.input.cover_image.url}" },
          { "name": "valid_from", "select": "${workflow.input.valid_from}" }
        ],
        "fileName": "catalog.html"
      }
    }
  ],
  "outputParameters": {
    "catalog": "${build_catalog_html.output.file}"
  }
}
```

Best practice from the user inputs tutorial: use the same `name` for an XSLT param as the user input key. The published AI jobs group the values that end users must not change in the `data` block of their first task rather than in `userInputs`. Recommendation of these skills: give text inputs a `default` when a sensible one exists.

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| `"defaultValue": "30"` | `"default": "30"` |
| `"required": "true"` (string) | `"required": true` (boolean) |
| An input with `"key": "context"` | any other key; `context` is reserved |
| `"type": "Text"` or `"type": "text"` | upper case `"TEXT"` |
| `SELECT` without `options` | `options` is required and each option needs `key` and `title` |
| `"default": "French"` (the title) on a `SELECT` | the option key: `"default": "french"` |
| `"file": "${workflow.input.zip_file.url}"` into a `FILE` typed input | `"file": "${workflow.input.zip_file}"` |
| Expecting a number from a `TEXT` input | it is a string; convert it |
| A `FIELD` or `SCREEN` input on a periodic or API-launched job | there is no active screen; use `TEXT` inputs or configuration in `data` |
| Two inputs with the same `key` | keys are unique ("Unique identifier of the input"); what the upload does with a duplicate is not documented |
