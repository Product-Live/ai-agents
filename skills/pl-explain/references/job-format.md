# Job format: the package and job.json

> Reference token: DF-JOB-FORMAT-01

A Data Factory job is a ZIP package whose single source of truth is `job.json`: metadata, user inputs, an ordered list of tasks and user outputs.
This file describes the package layout, every `job.json` property, the task envelope and the naming conventions.
Pipeline, project, status, visibility and periodicity are NOT in `job.json`: they are configured in Settings after import.

## 1. Package anatomy (ZIP)

| File or folder | Role (documentation wording) |
| -- | -- |
| `job.json` | Core job definition: metadata, tasks to execute, user inputs, and outputs. |
| `assets/` | Contains all files used by your job (for example, XSLT, templates, or other resources). Referenced from `job.json` as `file://assets/<path>`. |
| `tests/` | Contains test files (for example, input XML files for testing workflows). |
| `.jobignore` | Lists files and folders that must be excluded when generating the final ZIP. |
| `README.md` | Job documentation for other users or for your future self (business description, inputs, variables to create, how to import). |
| `CHANGELOG.md` | Change log describing the history and versions of your job. |

Notes:

- The documentation shows both `tests/` (reference page) and `assets/TESTS/` (tutorial and default `.jobignore`) for test files. Both are optional, and `.jobignore` keeps them out of the package.
- Which files of the package the platform reads besides `job.json` and the assets it references is not documented. Convention of these skills: ship `job.json`, `README.md`, `CHANGELOG.md` and `assets/`.
- The structure table of the jobs page lists `job.json`, `assets` and the other entries at the root of the ZIP: do not wrap them in a top-level folder.
- Files in `assets/TESTS` are not visible in the autocompletion (wiring tutorial), and the default `.jobignore` excludes them from the package.

### 1.1 `.jobignore`

Each line is a glob matched against paths relative to the job folder. `node_modules` is always excluded automatically. Documented default content:

```text
*.job.zip
.jobignore
assets/TESTS/*
```

A more complete example from the documentation:

```text
*.job.zip
.jobignore
assets/TESTS/*
*.log
*.tmp
documentation/*
```

Packaged files use the `.job.zip` extension (for example `my-job.job.zip`) so that regular `.zip` files stored in `assets/` are not excluded by the `*.job.zip` pattern. The VS Code extension names packages `<key>-<timestamp>.job.zip` by default (strategies: `key-timestamp`, `key`, `key-date`).

Important: a file excluded by `.jobignore` is absent from the ZIP, so any `file://assets/<path>` reference to it fails at import time. Never ignore a file that `job.json` references.

### 1.2 README and CHANGELOG

What the documentation says: the README describes the job and the CHANGELOG logs its changes ("Use the README.md file to describe what your job does and use the CHANGELOG.md file to log changes."), and the VS Code extension command `Create Job` generates `job.json` with the standard job structure (`assets/`, `tests/`, `.jobignore`, `CHANGELOG.md`, `README.md`). The documentation does not prescribe headings for either file.

Structure of `README.md` (convention of these skills): a level-1 title with the job name, an `## Objective` section (what the job does and for whom) and an `## Outcome` section (what the user gets), half a page at most.

Recommended structure of `CHANGELOG.md` (convention of these skills): a level-1 title `Changelog`, then one dated section per version, newest first:

```markdown
## 1.0.0 - 2026-01-15

- First release
```

A good README also lists the user inputs, the global variables to create (with their secret flag), the pipeline, the visibility and the periodicity to configure in Settings, and how to import the package. Never ship the untouched template.

## 2. `job.json` properties

| Property | Required | Type | Description |
| -- | -- | -- | -- |
| `schema` | required | string | Schema version of the job definition. Must be `"1.0"` (a string, not a number). |
| `key` | required | string | Stable, unique identifier of the job within your account. Cannot be updated after creation. The documentation states no length limit: keep it short. |
| `title` | required | string | Human-readable name displayed to users. The documentation states no length limit. Best practice: start with an action verb ("Generate product catalog"). |
| `icon` | optional | string (enum) | Icon shown with the job in the UI. See section 4. |
| `titleLocal` | optional | object | Localized titles keyed by language code (`fra`, `eng`, ...). |
| `description` | optional | string | Short description explaining what the job does. |
| `descriptionLocal` | optional | object | Localized descriptions keyed by language code. |
| `userInputs` | optional | array | Form fields presented to the user when they start the job. It is an array. See `user-inputs.md`. |
| `tasks` | required | array | Ordered array of tasks that define the execution flow. |
| `outputParameters` | optional | object | Mapping of user-facing output keys to task outputs. It is an object, not an array. See `wiring.md`. |
| `timeoutSeconds` | optional | number | Job timeout in seconds. When exceeded the execution ends with status `TIMEDOUT`. `0` means no timeout. |

Documented property order: `schema`, `key`, `title`, `icon`, `titleLocal`, `description`, `descriptionLocal`, `userInputs`, `tasks`, `outputParameters`, `timeoutSeconds` (the "All Properties" example of the jobs page). Keep this order (convention of these skills).

A top-level `version` string appears in some published packages (the generic jobs of the documentation). It is not part of the documented property table: prefer recording versions in `CHANGELOG.md`.

### 2.1 Minimal example

```json
{
  "schema": "1.0",
  "key": "unique-job-key-in-your-account",
  "title": "My job title",
  "tasks": []
}
```

### 2.2 Complete example

```json
{
  "schema": "1.0",
  "key": "export-items-to-excel",
  "title": "Export items to Excel",
  "icon": "file-excel",
  "titleLocal": {
    "fra": "Exporter les produits vers Excel"
  },
  "description": "Exports the selected items and generates an Excel file.",
  "descriptionLocal": {
    "fra": "Exporte les produits selectionnes et genere un fichier Excel."
  },
  "userInputs": [
    {
      "key": "language",
      "title": "Language",
      "description": "Language of the exported titles",
      "required": true,
      "type": "SELECT",
      "options": [
        { "key": "fra", "title": "French" },
        { "key": "eng", "title": "English" }
      ],
      "default": "eng"
    }
  ],
  "tasks": [
    {
      "name": "table-export-items",
      "taskReferenceName": "export_items",
      "description": "Export the items selected in the grid",
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
      "taskReferenceName": "build_excel_request",
      "description": "Build the Excel generation request",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "mode": "FILE",
        "file": "${export_items.output.file}",
        "xslt": "file://assets/build-excel-request.xslt",
        "params": [
          { "name": "language", "select": "${workflow.input.language}" }
        ],
        "fileName": "excel-request.xml"
      }
    },
    {
      "name": "file-generation-xlsx",
      "taskReferenceName": "generate_excel",
      "description": "Generate the Excel file",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "request": "${build_excel_request.output.file}",
        "templates": [
          { "key": "template", "file": "file://assets/template.xlsx" }
        ]
      }
    }
  ],
  "outputParameters": {
    "excel_files": "${generate_excel.output.files}"
  },
  "timeoutSeconds": 0
}
```

## 3. Task envelope

Every task, catalog or flow-control, is an object in `tasks` (or nested in a branch) with this envelope:

| Property | Type | Required | Description |
| -- | -- | -- | -- |
| `name` | string | required | For a catalog task: the task name from the catalog (`table-export-items`, `file-transformation-xslt`, ...). For a flow-control task: free text (`switch`, `terminate`, `loop`, `set-variable`, `wait`). Exception: the deprecated `DECISION` task requires `"name": "decision"` ("The name of the task, must be: decision"). |
| `taskReferenceName` | string | required | The unique name of the task in your job. Used in `${<taskReferenceName>.output.<name>}` references. |
| `description` | string | required | The functional description of this task in your job. Documented as required; some official flow-control examples omit it. Always set it. |
| `optional` | boolean | required | `true`: the job continues if there is an error on this task. `false`: the job fails. Always set it explicitly. |
| `type` | string | required | `SUB_WORKFLOW` for every catalog task. Flow-control tasks use `SWITCH`, `DO_WHILE`, `TERMINATE`, `SET_VARIABLE`, `WAIT` (and the deprecated `DECISION`). |
| `inputParameters` | object | required | Input parameters of the task. The key is `inputParameters`, never `input`. |

Canonical shape of a catalog task:

```json
{
  "name": "table-export-items",
  "taskReferenceName": "table_export_items",
  "description": "Export items from a user selection",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "tableKey": "PL_DEMO_PRODUCTS",
    "mode": "USER_SELECTION",
    "fileName": "items.xml"
  }
}
```

Flow-control tasks add their own top-level properties next to `inputParameters`: `SWITCH` has `evaluatorType`, `expression`, `decisionCases`, `defaultCase`; `DO_WHILE` has `loopCondition`, `loopOver`; `DECISION` (deprecated) has `caseValueParam`, `decisionCases`, `defaultCase`. `TERMINATE`, `SET_VARIABLE` and `WAIT` only use `inputParameters`. Details are in `control-flow.md`.

Keys named `tasks`, `loopOver`, `decisionCases` and `defaultCase` must always hold real task lists, at any depth. A placeholder string there makes the job creation fail with an opaque error, before the job ever runs (documented on the `task-batch-execute` page; the general job reference does not state it).

## 4. Icon enum

The `icon` value must be one of the following (per the VS Code extension schema: the documentation does not list the values and says to "use the VS Code extension autocomplete to browse the full enum list"):

`alert`, `api`, `bell`, `book`, `bug`, `build`, `bulb`, `calculator`, `calendar`, `camera`, `carry-out`, `clock-circle`, `container`, `control`, `copy`, `diff`, `down-circle`, `file-add`, `file-excel`, `file-image`, `file-pdf`, `file-text`, `file-unknown`, `file-zip`, `folder`, `fund`, `heart`, `info-circle`, `mail`, `lock`, `plus-square`, `plus-circle`, `profile`, `setting`, `smile`, `thunderbolt`, `tool`, `video-camera`, `send`.

Typical choices: `file-excel` for Excel exports, `file-zip` for archives, `file-pdf` for PDF catalogs, `mail` for notification jobs, `api` for integrations, `calendar` for scheduled jobs. The jobs page describes the icon as "shown with the job in the UI".

## 5. Localization codes

`titleLocal`, `descriptionLocal` (and the `titleLocal` / `descriptionLocal` of user inputs and options) are objects keyed by ISO 639-3 codes. Documented codes: `ara` (Arabic), `zho` (Chinese), `eng` (English), `fra` (French), `deu` (German), `hin` (Hindi), `ita` (Italian), `jpn` (Japanese), `kor` (Korean), `nld` (Dutch), `por` (Portuguese), `rus` (Russian), `spa` (Spanish).

```json
{
  "title": "Generate product catalog",
  "titleLocal": {
    "fra": "Generer le catalogue produits",
    "deu": "Produktkatalog erzeugen"
  }
}
```

## 6. Naming conventions

| Element | Convention | Notes |
| -- | -- | -- |
| Job `key` | kebab-case, lowercase ASCII, stable (`export-items-by-ean`) | Unique per account and immutable: choose it once. The documentation uses both kebab-case and snake_case keys (`unique-job-key-in-your-account`, `my_first_job`); kebab-case is the convention of these skills. |
| `taskReferenceName` | snake_case, descriptive verb phrase (`export_items`, `check_inputs_valid`, `terminate_no_items`) | "The unique name of the task in your job": keep it unique across the whole job, including tasks nested in `decisionCases`, `defaultCase` and `loopOver` (the extension checks "Task reference name uniqueness"). The documentation states no character set: use letters, digits, `_` and `-`, and never the bare word `workflow` (convention of these skills, enforced by its validator). |
| Task `name` | the exact catalog name, kebab-case | Any other value is not a catalog task (what the upload does with it is not documented; the validator of these skills rejects it). Custom tasks: see `tasks/custom-task.md`. |
| User input `key` | one style per job (snake_case or camelCase) | Unique within `userInputs`. Never `context`, which would collide with the job context `${workflow.input.context}`, and never `workflow` (convention of these skills). |
| `outputParameters` keys | lowercase separated by `_` (`excel_files`) | Documented best practice. |
| Global variable keys | lowercase `a-z0-9_` (`main_ftp_password`) | See `variables-and-secrets.md`. |
| Asset file names | kebab-case (`build-excel-request.xslt`) | Keep assets flat or in a few numbered folders. |
| Task `fileName` inputs | a name with its extension (`items.xml`, `schema.xml`, `report.html`) | The input tables of `table-export-items` and `table-export-schema` say "without the file extension" / "It must not contain the extension", while every documented example of both tasks passes `items.xml`. Prefer the documented examples' form: a name with the extension that matches the content (`.xml`, `.html`, `.csv`, `.json`); the downstream tasks read the content by type. The two forms are not compared in the documentation. |

## 7. What is NOT in job.json

The following properties exist on the job resource but are configured in Settings (or through the API), never written in `job.json`:

| Setting | Where | Values |
| -- | -- | -- |
| Pipeline | Settings > Data Factory > Jobs (job edit) | one pipeline per job, mandatory to run |
| Project | Settings (project tree, right click to create) | folder for jobs |
| Status | Settings | `DRAFT` or `PRODUCTION` |
| Visibility | Settings | `NO_TABLES` ("Hidden for all tables"), `ALL_TABLES`, `TABLE_SELECTION` ("Visible for selected tables", requires table ids) |
| Periodicity | Settings > job > periodicity rules | up to 3 cron rules, 5 fields, UTC |
| Variable overrides | Settings > job > "Inputs and variables" | job-specific values of global variables |

Document the expected values in the README so the administrator who imports the package can configure them. See `lifecycle.md`.

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| `"schema": 1.0` (number) | `"schema": "1.0"` (string) |
| `"input": {...}` on a task | `"inputParameters": {...}` |
| `"outputParameters": [...]` (array) | `"outputParameters": {...}` (object) |
| `"userInputs": {...}` (object) | `"userInputs": [...]` (array) |
| Flow-control keyword in `name` with `type: "SUB_WORKFLOW"` (`"name": "switch", "type": "SUB_WORKFLOW"`) | the keyword goes in `type` (`"type": "SWITCH"`); `name` is free text |
| Duplicate `taskReferenceName` in two branches of a `SWITCH` | suffix them (`display_message_yes`, `display_message_no`) |
| Invented task names (`http-call`, `send-email`, `apply-stylesheet`) | real catalog names (`protocol-http-perform`, `notification-send-email`, `file-transformation-xslt`) |
| Comments or trailing commas in `job.json` | strict JSON only |
| `periodicity`, `pipelineId`, `status`, `visibility` inside `job.json` | configured in Settings; described in the README |
| Changing the `key` of an existing job to "version" it | keep the key; record versions in `CHANGELOG.md` |
| `file://assets/report.xlsx` referenced while `*.xlsx` is in `.jobignore` | never ignore referenced assets |
