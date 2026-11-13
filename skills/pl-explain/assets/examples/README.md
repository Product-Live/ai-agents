# Curated Data Factory job examples

Fourteen folders holding fifteen small, complete job packages: `trigger-job-and-use-result/` holds two sub-packages (`export-items-by-ean/` and `init-table-from-owner-items/`), every other folder holds one. Each package has `job.json`, `README.md`, `CHANGELOG.md`, `.jobignore` and its `assets/`. Every example validates with the job builder's validator and packages as a `.job.zip`. Start with `demo-products-table`: it creates the `PL_DEMO_PRODUCTS` table that most of the other examples read or write.

Conventions shared by every example: kebab-case job `key`, snake_case `taskReferenceName`, `description` and `optional` on every task, `default` (never `defaultValue`) on user inputs, global variables read with `${workflow.globalVariables.<key>}`, shipped files referenced as bare `file://assets/<path>` strings. Periodicity, pipeline and visibility are configured in Settings after import, never in `job.json`; each README says what to configure.

| Folder | Title | Patterns | Tasks used | User inputs | Variables | Difficulty |
| -- | -- | -- | -- | -- | -- | -- |
| `demo-products-table/` | Create the demo products table | Table bootstrap from schema and items files; the shared fixture | `table-import-schema`, `table-import-items` | none | none | beginner |
| `import-items-from-csv/` | Import items from a CSV file | FILE input, CSV to XML, header-driven XSLT, import report | `file-conversion-csv-to-xml`, `file-transformation-xslt`, `table-import-items` | `file` (FILE) | none | beginner |
| `import-items-from-json-file/` | Import items from a JSON file | Dummy-source XSLT, `json-to-xml(unparsed-text())`, fail-fast `xsl:message` | `file-transformation-xslt`, `table-import-items` | `file` (FILE) | none | beginner |
| `export-selection-to-excel/` | Export selection to Excel | Selection export, schema as XSLT parameter, SELECT input, Excel templates, table key in a variable | `table-export-items`, `table-export-schema`, `file-transformation-xslt`, `file-generation-xlsx` | `output_file_type` (SELECT) | `excel_export_table_key` | intermediate |
| `export-job-executions-to-excel/` | Export job executions to Excel | API find with criteria, ATTACHMENT outputs, JS resources, `Generate-Excel` built in JS | `code-execute-javascript`, `data-job-execution-find`, `data-user-find`, `file-generation-xlsx` | `days` (TEXT) | none | intermediate |
| `list-users-to-excel/` | List every user of the account in an Excel file | Find with XML output, `xpath-functions` vocabulary in XSLT, Excel | `data-user-find`, `file-transformation-xslt`, `file-generation-xlsx` | none | none | beginner |
| `javascript-task-cheatsheet/` | JavaScript task cheat sheet | Every `code-execute-javascript` mode: inline or file, JSON or FILE response, resources, log, expected failure | `code-execute-javascript` | none | none | beginner |
| `search-items-by-option-across-partitions/` | Search items by option across all partitions | Id resolution by chained finds, SWITCH + TERMINATE guard, `partitionSelection: TABLE`, HTML message with access links | `data-table-find`, `switch`, `terminate`, `data-partition-find`, `data-item-find`, `code-execute-javascript`, `notification-display-message` | `lifeCycle` (SELECT), `screen` (SCREEN) | none | intermediate |
| `comment-on-multiple-items/` | Comment on multiple items | Grid selection from the launch context, find, jq operations, bulk create | `data-suggestion-find`, `json-transform-jq`, `data-comment-thread-create` | `comment` (TEXT) | none | beginner |
| `trigger-job-and-use-result/` | Trigger a job from another job and use its result (two jobs) | Job chaining with wait, cross-account API key, export in REQUEST mode, import on a shared table | `code-execute-javascript`, `data-job-find`, `data-job-execution-create`, `table-import-items`, `file-transformation-xslt`, `table-export-items` | `eans` (TEXTAREA) on the caller | `owner_api_key` (secret), `owner_account_key` | advanced |
| `ai-typo-detection-suggestions/` | Detect typos with AI and create suggestions | AI suggestion skeleton: settings task, guards, parallel fetch, prompt template, batch of AI calls, suggestion creation | `code-execute-javascript`, `switch`, `terminate`, `task-batch-execute`, `data-screen-find`, `data-item-find`, `data-field-find`, `ai-prompt-execute`, `data-suggestion-create` | none (settings in the first task) | `ai_api_key` (secret) | advanced |
| `nightly-sftp-csv-import/` | Nightly import of a CSV file from an SFTP server | Scheduled pickup, credentials in variables, SWITCH on `noFile`, CSV import, move to processed, report email | `protocol-ftp-get`, `switch`, `terminate`, `file-conversion-csv-to-xml`, `file-transformation-xslt`, `table-import-items`, `protocol-ftp-move`, `notification-send-email` | none (periodic) | `sftp_host`, `sftp_port`, `sftp_username`, `sftp_password` (secret), `import_report_recipients` | intermediate |
| `batch-execute-parallel/` | Run two finds in parallel with task-batch-execute | Inline batch of two task names, concurrency, result list and summary, merge in JS | `task-batch-execute`, `data-account-find`, `data-user-find`, `code-execute-javascript` | none | none | intermediate |
| `http-api-call/` | Call an HTTP API | GET with assertions, POST with JSON body, PL_KEY authentication, timeouts, retries, SWITCH on the status code | `protocol-http-perform`, `switch`, `terminate` | none | none | intermediate |

## Which example for which need

| Need | Start from |
| -- | -- |
| Load a file dropped by a user into a table | `import-items-from-csv` or `import-items-from-json-file` |
| Scheduled integration with a partner's server | `nightly-sftp-csv-import` |
| Give users an Excel of what they selected | `export-selection-to-excel`, with the caveat below: it does not follow the launch context and does not expand composite columns |
| Any report from Product-Live data | `list-users-to-excel` (XSLT) or `export-job-executions-to-excel` (JavaScript) |
| A mass action on selected items | `comment-on-multiple-items` |
| Show a result on screen with links | `search-items-by-option-across-partitions` |
| Call a third-party or the Product-Live API | `http-api-call` |
| Run many independent calls at once | `batch-execute-parallel` |
| Make two accounts or two jobs cooperate | `trigger-job-and-use-result` |
| Anything with a language model | `ai-typo-detection-suggestions` |
| Understand what a script receives and returns | `javascript-task-cheatsheet` |

Caveat for `export-selection-to-excel`: the table key comes from a global variable and the column order from the screen at `Position` 1 (or `screen_key`), not from the screen the job was launched from; the stylesheet reads screen columns only inside sections and never expands a `Column-Composite` column into its sub-columns. Copying it for an export of the current screen reproduces those gaps. For that need, read `${workflow.input.context.view.table.key}` and `${workflow.input.context.view.screen.key}`, read columns both inside and outside sections, read the sub-columns of each composite column both inside its `Section` elements and directly under it (the two documented shapes), and tolerate a composite column that lists none (not documented): see the `table-export-schema` and `table-import-schema` task references.

## Validating an example locally

- `node <path-to-skills>/pl-job-build/scripts/validate-job.js <folder>` then `package-job.js <folder>`. For `trigger-job-and-use-result/`, run both commands on each sub-folder (`trigger-job-and-use-result/export-items-by-ean` and `trigger-job-and-use-result/init-table-from-owner-items`), not on the parent folder.

Every example is adapted from the public Product-Live documentation and examples (learn.product-live.com), with keys, names and sample data cleaned up for this library; `nightly-sftp-csv-import` was written from the documented patterns.
