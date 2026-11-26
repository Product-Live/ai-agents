# Pre-flight checklist

Walk every line before packaging (create and modify modes) and during a review. Each line names the check and, after the colon, the fix. During a review, report failed checks and propose these fixes without applying them or creating a package unless requested. The validator (`node <skill-dir>/scripts/validate-job.js <dir>`) covers the structural lines; the judgment lines are yours.

## Identity

- [ ] Job `key` is kebab-case, ASCII, unique in the account and never changed on a modify: pick a stable key once, the platform cannot update it.
- [ ] `title` starts with an action verb ("Generate product catalog"): rename.
- [ ] Every text in the package is English (title, description, task descriptions, user input labels, README, CHANGELOG, comments, run-time messages) unless the user or an instruction file explicitly asked for another language; requested translations sit in `titleLocal.<lang>` / `descriptionLocal.<lang>` next to the English base value (`requestLocal.<lang>` next to the English `request` of a display message), and an instruction that makes another language the main one swaps the roles (base values in that language, English in `titleLocal.eng`, `descriptionLocal.eng`, `requestLocal.eng`); keys, file names, reference names and the names in the assets are English ASCII in every case: translate or move the text.
- [ ] Every `taskReferenceName` is snake_case and unique across the whole job, including tasks nested in SWITCH cases and loops: suffix `_yes`, `_no`, `_default`, `_1`.
- [ ] User input keys are unique and none is named `context`: rename the input.

## Structure

- [ ] Root holds `schema: "1.0"`, `key`, `title`, `tasks`, and only the optional keys `icon`, `titleLocal`, `description`, `descriptionLocal`, `userInputs` (array), `outputParameters` (object): delete anything else.
- [ ] Every task has `name`, `taskReferenceName`, `description`, `optional`, `type` and `inputParameters` (never `input`): add the missing envelope fields.
- [ ] Catalog tasks use `type: "SUB_WORKFLOW"` and `name` equal to the catalog name: fix the type.
- [ ] Flow-control tasks put the keyword in `type` (`SWITCH`, `DO_WHILE`, `TERMINATE`, `SET_VARIABLE`, `WAIT`) with free text in `name`: never `"name": "switch", "type": "SUB_WORKFLOW"`.
- [ ] `tasks`, `loopOver`, every `decisionCases.<case>` and `defaultCase` hold real arrays, never a placeholder string: inline the task list.
- [ ] 20 tasks or fewer at the top level (a convention of this skill, not a platform limit): split into chained jobs or batch entries.

## Wiring

- [ ] Every `${<ref>.output.<x>}` points to an earlier task and to an output that task documents: fix the reference or the order.
- [ ] No reference into a sibling SWITCH branch or into a loop from outside it: read the value from a TERMINATE output, a flag or the loop output map instead.
- [ ] `${<loopRef>.input.*}` and `${<loopRef>.output.iteration}` appear only inside that loop: move the consumer.
- [ ] FILE outputs feed FILE inputs (`mode: FILE` with `file`), FILES feed FILES (`mode: FILES` with `files`), ENUM `YES`/`NO` outputs feed SWITCH `value-param`: insert an archive task or a FILES-mode task for FILES into FILE.
- [ ] File objects are passed whole (`${x.output.file}`); `.url` only where a string URL is required (XSLT `params[].select`, jq or JS `data`): remove the `.url`.
- [ ] Every `${workflow.input.<key>}` is declared in `userInputs`, or the job `description` states that a calling job supplies it, except `${workflow.input.context.*}`, the launch context the platform attaches to every execution (the report's Assumptions name it as such): declare or document.
- [ ] No literal `${` that is not a resolvable expression (including inside jq or JS strings): resolve or remove.

## Variables and secrets

- [ ] Account variables use `${workflow.globalVariables.<key>}`; the legacy `${workflow.variable.<key>}` is replaced; `${workflow.variables.<key>}` appears only after a `SET_VARIABLE`: fix the root.
- [ ] One global variable per template string: split the string across two inputs or concatenate in a JavaScript task through `data`.
- [ ] No global variable in `loop`, `set-variable`, `wait` or `json-transform-jq` inputs, and never inside JavaScript code: pass it through a `code-execute-javascript` `data` object.
- [ ] Secrets (passwords, tokens, API keys, private keys) travel only from variables into connection inputs (FTP `password`/`privateKey`, HTTP `headers`/`authentication`, `apiKey`): remove them from XSLT params, emails, messages, logs and user inputs.
- [ ] Variable keys are lowercase `a-z0-9_` and listed in the report with their secret flag: fix the key, complete the table.

## Files and assets

- [ ] Every `file://assets/<path>` is a bare string written literally in `job.json`, the file exists under `assets/`, and `.jobignore` keeps it: add the file or fix the path.
- [ ] No `{ "url": "file://assets/..." }` object and no `file://assets/` string produced at runtime: declare the asset in a builder task's `data` and copy the resolved object.
- [ ] No `file-validation-xsd` diagnostic task in the final job: remove development diagnostics before packaging.
- [ ] No variable or expression inside an asset file: pass values as XSLT params or JS `data`.
- [ ] XSLT declares `xsl:output` with `encoding="UTF-8"` and the right `method`; JavaScript reads `$.data`/`$.resources`, calls `log()` and ends with `return`; jq uses no date function and no `${` literal: fix the asset.
- [ ] Every script asset follows `references/asset-guidelines.md`: English ASCII names, English comments and messages (unless the user explicitly asked for another language), every documented shape of its input handled (absent optional elements included), a stop signalled only on a broken contract or when the brief says fail, an actionable message for each stop: rewrite the asset.
- [ ] Each JavaScript script, SWITCH or loop expression and jq expression passes `scripts/lint-script.js` without error: fix the script.
- [ ] HTML for `notification-display-message` has no image, no heading above `h3`, no inline `style` attribute, no script, no asset or public URL reference: rewrite with classes in a `<style>` element.
- [ ] HTML for `notification-send-email` carries `<meta name="pl-mail-to">` and `<meta name="pl-mail-subject">`: add the meta tags.

## Flow control

- [ ] Every SWITCH has `evaluatorType` (`value-param` or `javascript`), an `expression` (the key of an `inputParameters` entry for `value-param`), string case keys and `defaultCase: []`: complete it.
- [ ] Guards keep the main flow at the top level: the matching case holds only a TERMINATE (or a message plus a TERMINATE).
- [ ] TERMINATE uses `terminationStatus` `COMPLETED` or `FAILED` and puts user-facing values in its own `outputParameters`: job-level outputs are not shown when a TERMINATE ends the job.
- [ ] Job `outputParameters` never depend on a task inside a SWITCH case that may not run (the value would be null): expose a flag or the TERMINATE output instead.
- [ ] No `DECISION` in a new job and no `protocol-rest-perform`: use `switch` and `protocol-http-perform`.
- [ ] Each `optional: true` task whose failure matters is followed by a SWITCH on `${<ref>.status}` (`COMPLETED_WITH_ERRORS`) or on its `YES`/`NO` output: add the check or make the task blocking.
- [ ] A periodic or unattended job that emails a report follows `notification-send-email` with a SWITCH on `allEmailsSent` ending in TERMINATE `FAILED`: add it (see `patterns.md` P11).
- [ ] Every XSLT task whose stylesheet can terminate on purpose (`xsl:message terminate="yes"`) is `optional: true` and followed by a SWITCH on `allFilesTransformed` that ends in TERMINATE `FAILED` with the user-facing message; every jq task whose expression can call `error(...)` on purpose is followed by a SWITCH on its `error` output that ends the same way: add the check (see `references/asset-guidelines.md`, section 3).
- [ ] A brief that says the job must "fail" on an empty selection or a missing file gets TERMINATE `FAILED` with a user-facing message, not the default `COMPLETED` exit: change the status.
- [ ] No `timeoutSeconds` at the job root or in a task envelope: remove it; retain only documented task input timeouts.
- [ ] No routine `SWITCH`/`TERMINATE` guard on `allFilesGenerated` after `file-generation-xlsx`: remove it unless an explicit business requirement needs that branch.
- [ ] `task-batch-execute` results are checked through `summary.errorCount` when one failed entry must fail the job: add the SWITCH plus TERMINATE.

## Scheduling and context

- [ ] A periodic job never uses `USER_SELECTION`, FIELD or SCREEN inputs, or `context.view` (absent for `PERIODIC` and `API` origins): switch to `mode: "ALL"` or `REQUEST`.
- [ ] A periodic job is idempotent (re-running it twice gives the same state): use `CREATE_OR_UPDATE`, move or delete processed files, derive windows from `context.triggerAt`.
- [ ] An inbox folder whose processed files are moved or deleted is read with `sort: LAST_MODIFIED_ASC` (or every file with `maxFiles` > 1 and `FILES`-mode consumers): `LAST_MODIFIED_DESC` with `maxFiles: 1` leaves older files behind forever.
- [ ] For a grid job with API test identifiers, trace both launch paths through the first JS task to their item reads and the shared processing. The grid path works with no test input. The API path restricts one run to the requested items. See `job-guidelines.md`, section 6.1.
- [ ] A job that needs a grid selection says so in its `description` and is meant to be visible only on the relevant tables: document it.
- [ ] Manual and periodic behaviours that differ are separated with a SWITCH on `${workflow.input.context.jobActionOrigin}`: add it.
- [ ] Chained jobs with `wait: true` run on different pipelines (one job per pipeline): document the pipelines.

## Packaging and docs

- [ ] The folder holds `job.json`, `assets/`, `README.md`, `CHANGELOG.md` and `.jobignore`: add the missing file from `templates/`.
- [ ] README, comments and report describe platform behaviour only as stated in `references/knowledge`; anything else is written "not documented": reword.
- [ ] An analytical report follows `references/bi-report-guidelines.md` for population, reconciled counts, identity evidence, chart meaning and exact tables; PDF output includes static rendering checks and their limits: correct the report or document the remaining checks.
- [ ] When the job moves or deletes a source file after `table-import-items`, the Outcome section of the README states what happens to that file when items are rejected (the import task still completes, so the file is moved or deleted anyway): document it, never "moved only after a successful import".
- [ ] The README holds a short objective and outcome, plus an implementation note for every task, including nested tasks (`references/job-guidelines.md`, section 7.1); setup, import and configuration steps belong to the report: complete or update the notes.
- [ ] CHANGELOG has an entry for this version (new version on every modify): add it.
- [ ] `.jobignore` excludes packages and keeps `README.md`, `CHANGELOG.md` and every referenced asset: fix the globs.
- [ ] When the job workspace is connected through the extension's MCP, every task supported by the local runner has a suite and the full run verifies the current files. Test suites, test-only fixtures and test output are excluded from the package. Report missing or blocked local checks separately.
- [ ] Create or modify: the validator reports zero errors and the packager wrote `<key>.job.zip`: fix and re-run. Review: report the actual validator result without running the packager.

## JSON hygiene

- [ ] `job.json` parses: no comments, no trailing commas, UTF-8 without BOM: fix the syntax.
- [ ] `schema` is the string `"1.0"`; `optional` and `required` are booleans; `height`, `concurrency`, `port`, `maxFiles` and documented task timeout inputs are numbers: fix the types.
- [ ] User inputs use `default` (never `defaultValue`), a `type` among `TEXT`, `SELECT`, `FILE`, `TEXTAREA`, `DATE`, `FIELD`, `SCREEN`, and SELECT carries `options[] {key, title}`: fix the input.
- [ ] Properties follow the documented order (`schema`, `key`, `title`, `icon`, `titleLocal`, `description`, `descriptionLocal`, `userInputs`, `tasks`, `outputParameters`): reorder.
- [ ] Only properties of the documented job format appear (root properties, task envelope, flow-control keys and the inputs of each task reference; section 3 of `references/knowledge/pitfalls.md`): delete anything else.

## Catalog

- [ ] Every `SUB_WORKFLOW` `name` exists in `references/knowledge/tasks/index.md` (custom `account/key` tasks allowed, with a warning the user confirms): fix the name.
- [ ] Required inputs of each task are present, enum values are exact, unknown inputs are removed: compare with `references/knowledge/tasks/<name>.md`.
- [ ] The job applies the developer instructions (SKILL.md, Step 0) and follows `references/job-guidelines.md` (JSON first: `data-*` tasks, jq and JavaScript; XML tasks and XSLT only when necessary), or the report names each instruction not applied and gives the reason of each departure from the guidelines (XML-only task, volume, XML source or target, instruction): switch to the JSON route or write the reason.
- [ ] The job `description` and each task `description` are short and written for end users (`references/job-guidelines.md`, section 7.2); the reasons and technical details are in the README implementation notes: move them there.
