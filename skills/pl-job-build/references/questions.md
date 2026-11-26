# Framing questionnaire (create mode)

Ask at most 5 questions per exchange, together, with lettered options and the recommended option marked "(recommended)" for choices; ask for concrete values as free text. Skip a question when the brief, an instruction file (SKILL.md, Step 0) or an earlier reply answers it. Prioritize goal, trigger, sources, outputs and failure policy; then user inputs, transformations and naming. Follow up only for essential information still missing or contradictory. In sub-agent mode, if answers are needed and direct interaction is unavailable, return the "Needs input" handoff from SKILL.md so the calling assistant can relay the questions, then resume with the user's answers before designing.

The defaults below are recommendations for open framing choices, not answers to assume silently. Apply them when the user asks for or accepts them; a reply of "defaults" does not supply concrete values or resolve contradictions. If the brief is already complete, proceed without extra questions.

Use the connected extension to resolve table, partition and field keys from the brief when possible (see "Account schema" in SKILL.md). Ask for remaining concrete values in the same message, including the FTP folder and file pattern, API domain and path, email recipients, cron expression, and the expected volume (items or file size) when the job reads a whole table or a file (it decides between the JSON route and the XML route, `job-guidelines.md`, section 5).

For web research or product enrichment, use the matching case in `references/use-cases.md` to establish the search identifier before design. Include any unanswered case-specific question in the same exchange; do not ask again when the user already supplied the choice.

## 1. Goal

What must the job do, from the business point of view (one sentence)?

- Free text; no default. Skip when the brief states it.

## 2. Trigger

How is the job launched?

- A: manually from a table grid, on the rows the user selected (recommended when the brief mentions a selection, "selected products", "from the grid"). Implies reading the grid selection: `data-item-find` in `REQUEST` mode with `${workflow.input.context.query}` behind a `queryMode` guard (JSON route, `job-guidelines.md`, section 6.1), or `table-export-items` with `mode: "USER_SELECTION"` (XML route); and a README note that rows must be selected.
- B: manually from Settings or the app without a selection. Implies `findMode` `ALL` or `REQUEST` on `data-item-find`, or `mode` `ALL` or `REQUEST` on `table-export-items`.
- C: on a schedule (periodic). Implies no selection, idempotent design, periodicity documented as a 5-field cron in UTC, a dedicated pipeline when the job is long.
- D: by another job or by the API. Implies inputs read with `${workflow.input.<key>}` that the caller supplies, results exposed in `outputParameters`.
- Default: A when a selection is mentioned, otherwise B. Skip when the brief says "daily", "every night", "scheduled" (C) or "called by" (D).

## 3. User inputs

What does the user provide when launching the job?

- A: nothing (recommended for periodic jobs).
- B: a file to upload (`FILE` input, wired whole to a `file` input).
- C: parameters: a language or option (`SELECT`), free text or a list (`TEXT`, `TEXTAREA`), a date (`DATE`), a field or screen of the current table (`FIELD`, `SCREEN`, grid launches only).
- Default: A for periodic jobs, otherwise whatever the brief lists. Skip when the brief names the inputs. Never name an input `context`.

## 4. Sources

Where does the data come from?

- A: items of a Product-Live table (resolve the table key and any needed partition keys).
- B: a file on an FTP, SFTP or FTPS server (ask the folder, the file name pattern and the connection variable names; credentials go to protected variables).
- C: an HTTP API (ask the domain, the path, the authentication type; tokens go to protected variables; the Product-Live API itself uses `PL_KEY`).
- D: a file uploaded by the user (see question 3).
- Default: A. Skip when the brief names the source. Several sources are allowed.

## 5. Transformations

How is the data reshaped? JSON first (`job-guidelines.md`):

- A: JSON first (recommended): jq (`json-transform-jq`) for shaping inline JSON (defaults, flags, `operations` arrays; no date functions), JavaScript (`code-execute-javascript`) for logic, regex, dates, aggregations, CSV and text parsing, JSON files and building files, the XML requests of other tasks included (the platform's JavaScript sandbox: standard ECMAScript, no network, no modules, 10 minutes per task).
- B: XSLT (`file-transformation-xslt`) for an XML source or target (platform exports and reports, CSV or Excel converted to XML, an XML feed), a volume above the limits of the JSON tasks, or when an instruction asks for it.
- C: an AI model (`ai-prompt-execute`) for text generation, extraction or classification, with human review of the results.
- Default: A; B only in the cases it lists (`job-guidelines.md`, section 1); never C unless the brief asks for AI. Skip when the brief, the sources or an instruction settle it.

## 6. Outputs

What must exist when the job ends?

- A: items created or updated in a table: `data-item-create-or-update` for targeted writes computed by the job, `table-import-items` for a file of items (mode `CREATE_OR_UPDATE` recommended, `UPDATE_ONLY` or `CREATE_ONLY` when the brief says so); see `job-guidelines.md`, section 3.
- B: downloadable files (Excel from a template, PDF from HTML, ZIP archive) exposed in `outputParameters`.
- C: an email with a report or attachments (`notification-send-email`, recipients as meta tags in the HTML).
- D: a message in the Actions panel (`notification-display-message`, exposed in `outputParameters`).
- E: files sent to an FTP server or an HTTP endpoint.
- Default: whatever the brief implies; D is added to grid-launched jobs when the result is a count or a status. Skip when the brief states the outputs. Several outputs are allowed.

## 7. Failure policy

What happens when something goes wrong?

- A: stop in error at the first technical failure (recommended): every task `optional: false`; configure a timeout only when the task documents such an input.
- B: continue and report: non-blocking tasks `optional: true`, their status or `YES`/`NO` flag checked with a SWITCH, the outcome exposed in `outputParameters`.
- C: stop in success on expected functional cases (no file on the server, empty selection): SWITCH on the flag plus TERMINATE `COMPLETED` with a message. Combine with A or B.
- Default: A plus C for the functional cases the pattern names (`noFile`, `itemsFound`, `queryMode`). Skip when the brief says "ignore errors", "must never fail" (B) or "fail if" (A).
- A brief that says the job must "fail" (or "stop in error", "end in error") on a functional case such as an empty selection or a missing file overrides C for that case: keep the SWITCH but end it with a TERMINATE `terminationStatus: "FAILED"` and a user-facing message (see "Fail when nothing is selected" in `patterns.md` P5). The graceful `COMPLETED` exit stays the default only when the brief is silent.
- Periodic or unattended jobs that email a report: the email task is followed by a SWITCH on `allEmailsSent` ending in TERMINATE `FAILED` (see `patterns.md` P11), whatever option is chosen, because nobody watches the execution.

## 8. Naming and localisation

- Job key: kebab-case derived from the title (for example `import-products-from-sftp`); propose it, do not ask, unless the user or an instruction file gave one or a naming rule.
- Title: an action verb first ("Import products from SFTP"); icon from the documented examples (`file-excel`, `file-add`, `file-zip`); the full icon list is only in the VS Code extension autocomplete.
- Labels and every other text of the package: English, whatever language the user writes in; another language only when the user or an instruction file explicitly asks for it ("French labels"), added as `titleLocal.<lang>` / `descriptionLocal.<lang>` next to the English value; every offered language when the brief has a run-time language choice. An instruction that makes another language the main one ("jobs use French as the main language") puts the base values in that language and English in `titleLocal.eng` / `descriptionLocal.eng`.
- Default: all derived; ask only when two reasonable keys exist. Skip otherwise.

## Question template

```text
Before I design the job, a few choices (reply with the letters or "defaults", and provide the requested concrete values):

1. Trigger: A) from the grid on selected rows (recommended) B) from Settings, all items C) scheduled
2. Failure policy: A) stop in error at the first technical failure (recommended) B) continue and report
3. Table key for the products table?
```
