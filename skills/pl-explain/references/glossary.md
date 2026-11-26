# Glossary

> Reference token: DF-GLOSSARY-01

One-line definitions of the platform and Data Factory vocabulary used throughout this reference, in the sense the documentation gives them.
Data-model terms (tables, items, fields) come first, then exchange and collaboration terms, then Data Factory terms, then job-authoring terms.

## 1. Data model

| Term | Definition |
| -- | -- |
| Account | A Product-Live tenant that owns tables, jobs, variables and pipelines; identified by an id and an account key. |
| Table | A structured set of items with a schema (levels, partitions, identifiers, classifications, fields, matrix, sections, screens); identified by a key such as `PRODUCTS` (upper case is the documented best practice for new structures). |
| Partition | A subset that isolates items within a table (for example `ACTIVES` and `ARCHIVED`, or one brand per partition); every item belongs to one partition; at least one must be active; best practice: at most 150 000 items each per the glossary of the documentation, 100 000 per the schema page. |
| Level | The answer to "what does each row represent": a table has 1 to 5 levels (`index` 1 to 5) that model one-to-many relations such as product, color variant and size; singular keys. |
| Item | A row of a table at a given level, in one partition, identified by its identifier values; children items are nested under their parent on multi-level tables. |
| Identifier | A uniqueness constraint on a level (up to 5 per table): a value compared without case, accents and trailing spaces, unique across all partitions; at least one identifier must be filled to create an item. |
| Field | A simple property of an item with a data type (`SINGLE-LINE-TEXT`, `LONG-TEXT`, `HTML-TEXT`, `NUMBER`, `DATE`, `DATE-TIME`, `SINGLE-SELECT`, `MULTIPLE-SELECT`, `MULTIPLE-SELECT-QUANTIFIED`, `MULTIPLE-SELECT-QUANTIFIED-WITH-COMMENTS`, `IMAGE`, `ATTACHMENT`, `COMPOSITE`); key and data type cannot be changed; a field is never deleted. |
| Data type | The kind of value a field stores and how it is rendered; cannot be changed once the field exists. |
| Option | One selectable value of a select field, identified by a key and displayed by a title (and a color for single selects); archivable, never deleted. |
| Suffix | A unit or currency attached to a `NUMBER` field, either fixed (`Suffix`) or chosen per value among `Suffixes` (`<Field key="PRICE" suffix="EURO">`). |
| Composite field | A field made of child fields (up to 100, depth 5), optionally multi-valued (several lines per item); imported exhaustively; beta. |
| Collect strategy | The rule (`BY_FIELDS`, `BY_ID`, `BY_POSITION`) that matches suggested composite lines to existing lines when suggestions are collected. |
| Classification | A hierarchical tree of categories attached to a table (up to 5 classifications, depth 5); an item sits in one category per classification; allows category-specific fields. |
| Category | A node of a classification, identified by a key with an optional `parent` key; archivable, never deleted; no inheritance of fields between categories. |
| Matrix | The declaration of which fields are common to all items and which are specific to categories (`Common` and `Specific` links); a field is either common or specific, never both. |
| Section | A visual grouping of columns in the grid; never archived nor deleted. |
| Screen | The definition of which columns are displayed, in which sections, order, width and editability, for one level of a table; imported exhaustively; the active screen is part of the job context. |
| Column | One displayed element of a screen section: `Column-Identifier`, `Column-Classification`, `Column-Conditional-Formatting`, `Column-Field` or `Column-Composite`, with a position and options such as `read-only`, `fixed`, `width`. |
| Screen field | The front-end object behind a column (key, title, data type, status) that `FIELD` user inputs list and filter. |
| Conditional formatting | A computed status per item (8 fields per table per the limits page, 5 per the task page body; 10 statuses each) driven by rules such as required, length, regex, barcode, image size, numeric and inter-field comparisons; displayed as a colored column. |
| Formula | A rule set that fills a field or an identifier automatically (or limits the selectable options) from other values of the same item; the same engine as the rules engine, run synchronously; up to 2 000 rules per formula field. |
| Metadata | Free key / value pairs (each key unique within its element) attached to schema elements, used for example to flag fields for AI jobs (`ai-typo-check`). |
| Archiving | The only way to retire identifiers, classifications, categories, options, matrix links and screens ("you cannot delete data on the schema of a table, you can only archive some elements"): archived values stay visible to users and come back when the element is reactivated. |
| Differential import | Importing only the items and values that changed since the last import, never empty values; the recommended way to keep imports fast. |

## 2. Collaboration and exchange

| Term | Definition |
| -- | -- |
| Partner | Another account connected to yours (supplier, retailer, agency) with which tables and jobs can be shared; identified by an account key found in Settings > Network > Partners. |
| Partner group | A named set of partners to which shared tables and jobs can be assigned collectively. |
| Shared table | A table made visible to a partner account; the partner imports into it with `accountKey` set to the owner's key. |
| Publication | The act (and the record) of publishing items from a table owner to partners; created by a publishing job (`exchange-send-items`, `exchange-create-publications`). |
| Collect | The receiving side of a publication: a job on the partner account imports the published items (`exchange-receive-items`), as values (`UPDATE`) or as suggestions (`SUGGEST`). |
| Exchange | The family of tasks and features that move items between accounts: publish, collect, suggestions. |
| Suggestion | A proposed set of field values on an item, coming from a partner or from a job (including AI jobs), that a user reviews and applies or rejects; created by `data-suggestion-create` or `exchange-create-suggestions`, applied by `exchange-apply-suggestions` or `data-suggestion-apply`. |
| Comment thread | A discussion attached to an item or a suggestion (`data-comment-thread-create`); plain text only from jobs. |
| User group | A set of users of the account managed with the `data-user-group-*` tasks and used for permissions. |
| Team permissions | The per-table rights that administrators define, including which jobs a team sees in the Actions menu. |

## 3. Rules engine and mapping

| Term | Definition |
| -- | -- |
| Rules engine | The feature that maps and transforms values from source tables to a target table on demand (`rules-engine-execute-rules`), unlike formulas which run automatically. |
| Mapping | A set of rules between a source table and a target table, imported from XML (`rules-engine-import-rules`), exported (`rules-engine-export-rules`) or reported on (`rules-engine-generate-rules-report`). |
| Rule | One mapping instruction with conditions (condition groups on source values) and actions (copy, map options, set a value) targeting a field of the target table; rules are evaluated in order and the first matching rule of a target field wins. |
| Template | A Twig text template (`<Template>`, engine `twig.1` by default or `twig.2`) used by formula and rule actions to compute text, numbers or option lists. |

## 4. Data Factory

| Term | Definition |
| -- | -- |
| Data Factory | The orchestration platform of Product-Live that runs jobs made of tasks, with built-in monitoring and error alerting. |
| Job | The main execution unit: a repeatable, auditable process that orchestrates tasks; packaged as a ZIP defined by `job.json`; shown as an "Action" in the app. |
| Job definition | The content of `job.json`: metadata, user inputs, tasks and user outputs. |
| Package | The ZIP (`<key>.job.zip`) containing `job.json`, `assets/`, `README.md`, `CHANGELOG.md`, filtered by `.jobignore`. |
| Asset | A file shipped in the package's `assets/` folder and referenced as `file://assets/<path>`; resolved into a file object at upload. |
| Task | A unit of work executed by the platform (export items, transform a file, send an email); identified by its catalog `name`. |
| Catalog task | A task listed in the public task catalog, written with `"type": "SUB_WORKFLOW"` and its documented `inputParameters`. |
| Flow-control task | One of `SWITCH`, `DO_WHILE` (loop), `TERMINATE`, `SET_VARIABLE`, `WAIT` and the deprecated `DECISION`, written with the keyword in `type`. |
| Task reference name | The unique `taskReferenceName` of a task in a job, used in `${<ref>.output.<name>}` references. |
| Custom task (specialized processing) | A task executed on the customer's own infrastructure: an external application polls the API for tasks to process and returns results; named in a job with an account part and the task key (see `tasks/custom-task.md`). |
| Alpha task | A recent task, shown in alpha phase in the documentation. Alpha tasks are available on every account. |
| User inputs | The form fields (`userInputs`) shown when the job is launched; read as `${workflow.input.<key>}`. |
| User outputs | The `outputParameters` of the job (or of a `TERMINATE` task): files and values shown to the user after the execution. |
| Job context | The `${workflow.input.context}` object attached to every execution: origin, date, user, account, active view, selection query. |
| Job execution (action, job instance) | A concrete run of a job definition with its inputs, outputs, per-task events, reports and final status. |
| Status (execution) | `PENDING`, `RUNNING`, `COMPLETED`, `USER_ERROR`, `FAILED`, `TERMINATED`, `TIMEDOUT` (job executions page); the job chaining tasks also list `COMPLETED_WITH_ERRORS` and `REMOVED` and spell `TIMED_OUT`. |
| Status (job) | `DRAFT` while developing, `PRODUCTION` when ready; set in Settings. |
| Visibility | Which tables show the job in their Actions menu: hidden for all tables, visible for all tables, visible for selected tables. |
| Project | A folder in Settings > Data Factory > Jobs that organises jobs. |
| Pipeline | An execution stack in which jobs run one at a time, first in first out; every job is attached to exactly one pipeline; configured by Professional Services. |
| Periodicity rule | A 5-field cron expression (UTC) that launches the job automatically; up to 3 per job, each enabled or disabled; minimum 15 minutes apart. |
| Actions menu / Actions panel | In app.product-live.com: the menu of a table listing the visible jobs, and the panel showing the user's running and past executions with their outputs. |
| Report | The XML file (`${<ref>.output.report}`) produced by most tasks, listing logs with a type, a code, metadata and a message. |
| Log level | The `logLevel` input (`error`, `warning`, `info`, `debug`) that decides which logs a report records. |
| Global variable | An account-level key / value created in Settings, optionally protected (secret), read as `${workflow.globalVariables.<key>}`, overridable per job. |
| Local variable | A value created during an execution by `SET_VARIABLE`, read as `${workflow.variables.<key>}`, limited to 256 KB, `null` when missing. |
| Secret (protected variable) | A global variable whose value is hidden in the interface and reports; used for logins, passwords, tokens and API keys. |
| File object | The JSON representation of a file produced or uploaded in Data Factory (`url`, `name`, `hash`, ...); passed whole between tasks; temporary (the listing outputs call them temporary files). |
| Data Factory file | A file uploaded through `POST /v1/data_factory/files` (100 MB) to be used as a job execution input; deleted after 90 days unless a job uses it. |
| Lookup | A declaration in a data task request (`lookups[]`) that resolves a business key (job key, table key, partition key) into a technical id before the call. |
| Criteria (find request) | The JSON query language of the Product-Live API (`eq`, `search`, `in`, `and`, `or`, comparison operators, `caseSensitive`) used by `data-*-find` tasks and by the job context `query`. |
| Operation | One entry of a `data-*` write task request (`operations[]` with `key`, `element`, `context`, `lookups`); its `key` is associated with the element in the output. |
| Batch | One execution of `task-batch-execute`: a list of task executions distributed over 1 to 5 parallel slots, with results in input order and a summary. |
| Slot / concurrency | A parallel lane of a batch; `concurrency` sets how many run at once (1 to 5). |
| User selection | The items selected or filtered in the grid when a job is launched from the app; consumed by `mode: "USER_SELECTION"` tasks or read from `context.query`. |
| API key | The credential (`X-Api-Key` header) of the public API; a data task without `apiKey` acts as the current user, with `apiKey` as the key's account. |
| Audit log | The record of the changes made to your data (who made the change, when, what was modified), queryable with `data-audit-log-find` (for example the type `item.create`). |
| Data Factory log | A log entry created from a job with `data-log-create` (message, severity, emitter name), visible in the job execution details. |
| Item link | A link between one of your items and an item of a partner on the same table, used to find the linked item again when collecting data; created with `data-item-link-create`. |
| Field value | A predefined option of a selection-type field (title, status, color, hierarchy), searchable with `data-field-value-find`. |
| Partner invitation | The request that connects two accounts as partners (`data-partner-invitation-create`, `-find`). |
| Access link | A URL of the form `https://app.product-live.com/redirect?tableKey=...&partitionKey=...&filters=...` that opens the grid on given items, typically built by a script for a display message. |
| Refresh items | The `table-refresh-items` task (alpha) that recomputes formulas and conditional formatting on items, for example after a schema import run with `skipItemRefresh: "YES"`. |
| Delete items | The `table-delete-items` task, which permanently deletes the targeted items; its output file contains the deleted items. |
| Listing file | The XML (`Files/File/Url` and `File-Name`) produced by file tasks (`listing` output) describing the temporary files they generated. |
| Temporary file URL | The address of a file produced by a task (`https://app.product-live.com/files-data-factory/...`), sufficient on its own to download the file and therefore confidential. |
| Items request | The `Items-Request` XML document that filters a `table-export-items` run in `REQUEST` mode (`Filters/Filter-Identifier[@key][@operator]/Value`). |
| Grid XML | The generic `Csv-To-Xml` / `Xlsx-To-Xml` document (`File/Rows/R[@i]/C[@j]`) produced by the conversion tasks and mapped by an XSLT. |
| JSON-in-XML | The W3C `map` / `array` / `string` / `number` / `boolean` vocabulary (namespace `http://www.w3.org/2005/xpath-functions`) used by XML requests of data tasks and by `json-to-xml()`. |
| XSD key | A platform schema name (`xsdKey`, for example `table-import-items-input-request`) that `file-validation-xsd` uses to validate a generated request document. |
| Mode (task input) | A task switch between `FILE` (one `file` input), `FILES` (a `files` list) and `REQUEST` (an XML request document), or between behaviours such as `USER_SELECTION`, `ALL` and `REQUEST` on exports. |
| Allow partial | The `allowPartial` input of `file-generation-archive`: with `true`, the archive is still generated when a file cannot be added. |
| Generic job | A ready-to-use job published in the documentation (export to Excel, media ZIP, reports, AI enrichment) that can be imported and adapted. |
| Use case | A documented end-to-end scenario with its job package (CSV import from sFTP, job chaining, suggestions). |
| VS Code extension | The "Product-Live" extension that scaffolds (`Create Job`), validates, autocompletes, runs XSLT transformations and XSD validations, visualizes and packages jobs. |

## 5. Job-authoring terms used in this reference

| Term | Definition |
| -- | -- |
| Expression | A `${...}` reference inside a JSON string of `inputParameters` or `outputParameters`, resolved before the task runs. |
| Interpolation | Embedding an expression inside a longer string (documented for string values; how other values render inside text is not documented). |
| ENUM flag | A `YES` / `NO` output (`noFile`, `allFilesTransformed`, ...) tested by a `SWITCH`. |
| Guard | A `SWITCH` whose matching branch holds a `TERMINATE`, used to stop early on invalid inputs or empty selections. |
| Idempotent job | A job that can be re-run without side effects (no duplicates, no double sends); recommended for periodic jobs (recommendation of these skills). |
| Seed XML | A tiny static XML (`file://assets/empty.xml`) used as the input of an XSLT whose real data comes from `params`. |
| Request document | The XML (or JSON) document that configures a task (`Items-Request`, `Generate-Excel`, `Zips`, `Xslt`, `Table`), built by a script or an XSLT. A published `xsdKey` can help diagnose XML requests during development. |
| Wrong vs right pair | The presentation used in `pitfalls.md` for shapes that are not part of the job format and their correct form. |
