# Job lifecycle: import, configuration, execution

> Reference token: DF-LIFECYCLE-01

A job is authored as a package, imported in Settings, configured (pipeline, project, status, visibility, periodicity, variables) and then executed manually, by the scheduler, by the API or by another job.
This file follows that lifecycle: creation and import, Draft / Production, visibility, projects, pipelines, periodicity, executions and statuses, outputs, reports and logs, chaining and sharing.

## 1. Creating and importing a job

Three ways to produce and upload the package:

| Route | How |
| -- | -- |
| VS Code extension (recommended) | Install the "Product-Live" extension (https://marketplace.visualstudio.com/items?itemName=Product-Live.product-live). `Create Job` scaffolds `job.json`, `assets/`, `tests/`, `.jobignore`, `CHANGELOG.md`, `README.md`. The extension validates `job.json` live (task names, parameters, reference names, asset paths), autocompletes outputs and runs XSLT / XSD locally (Java 64-bit required). `Package Job` (`Ctrl+Alt+P`, or right click on `job.json`) applies `.jobignore` and writes `<key>-<timestamp>.job.zip`. |
| Settings upload | settings.product-live.com > Data Factory > Jobs > Add job: drag and drop the `.job.zip` in the drop zone, then fill the form (import tutorial). To update an existing job, open it and upload a new ZIP: "Job key can not be updated." |
| API | `POST /v1/data_factory/jobs` creates a job from a JSON body (including `pipelineId`, `projectId`, `periodicity`, `status`, `visibility`, `tasks`); `PUT /v1/data_factory/jobs/{jobId}/zip` uploads a ZIP on an existing job. Prefer the ZIP upload: it is the format the validator of these skills checks. The Jobs API page lists no delete endpoint; `data-project-delete` deletes a project together with all the jobs it contains. |

At upload time the platform resolves every `file://assets/...` reference and rejects the package when a referenced file is missing; which other checks the upload runs (duplicate user input keys, referenced global variables) is not documented, so keep input keys unique and create the variables before the upload. After changing assets or `job.json`, re-package and re-import.

## 2. Draft and Production

The job status is set in Settings: `DRAFT` while developing, `PRODUCTION` when ready. "Later when you will have to monitor several jobs in production, and you will have to detect jobs in error, it will allow to simply filter Jobs in status Production and Error, without the draft ones."

## 3. Visibility

| API value | Settings label | Effect |
| -- | -- | -- |
| `NO_TABLES` | Hidden for all tables | Only launchable by administrators from Settings (or by the scheduler and the API). |
| `ALL_TABLES` | Visible for all tables | Appears in the Actions menu of every table. |
| `TABLE_SELECTION` | Visible for selected tables | Appears in the Actions menu of the listed tables only (a list of table ids is required). |

Administrators can further restrict which jobs each team sees per table. Jobs that consume the grid selection should be visible only on the tables they support. If a job does not appear in the Actions menu, refresh the app (`Ctrl + Shift + R`).

## 4. Projects

Projects are folders in Settings > Data Factory > Jobs (right click on the project panel to create one): "containers that organize jobs". Deleting a project deletes all the jobs it contains (`data-project-delete`). The API job resource carries a `projectId`.

## 5. Pipelines

| Rule | Description |
| -- | -- |
| Single execution | Only one job can run on a pipeline at a time. |
| FIFO scheduling | Jobs are scheduled First In, First Out: the first job submitted is the first executed. |
| Cooperative scheduling | No preemption. A running job must complete before the next one can start, no matter how long it takes. |
| Cancellation | Cancelling a running job releases the pipeline immediately; cancelling a queued job removes it from the queue. |

- "A job must be associated with one and only one pipeline. A job that is not associated with a pipeline cannot be executed." Pipelines are configured by the Product-Live Professional Services team; contact your representative to add one.
- Queued jobs wait in status `PENDING`; the app displays the number of jobs ahead in the queue and lets the user "Continue in background".
- Several pipelines protect critical scheduled jobs (nightly exports, automated imports) from ad-hoc or test jobs; AI jobs are best run at night on a dedicated pipeline; chained jobs that wait for each other need two pipelines.
- A shared job is attached to a pipeline by its owner (the published shared-job example attaches both of its jobs on the owner account), and queued actions may belong to other accounts sharing the same pipeline (FAQ).
- If the queue does not progress for more than 30 minutes, contact support (FAQ).

## 6. Periodicity

Configured in Settings (job edit) or through the API `periodicity` array, never in `job.json`:

```json
{
  "periodicity": [
    { "isEnabled": true, "cronExpression": "0 9 * * *" },
    { "isEnabled": true, "cronExpression": "0 18 * * 1-5" }
  ]
}
```

- Up to 3 rules per job, each independently enabled or disabled (`isEnabled: false` pauses a rule without deleting it).
- 5-field cron: minute (0-59), hour (0-23), day of month (1-31), month (1-12), day of week (0-7, 0 and 7 = Sunday); special characters `*`, `,`, `-`, `/`.
- "All cron schedules are evaluated in UTC." (periodic jobs reference). The periodicity tutorial describes a time zone setting, a behaviour when an execution is still running (`Allow`, `Forbid`, `Replace`) and a starting deadline in the Settings form, while the reference page describes UTC schedules and queued executions. The two pages disagree: write cron expressions in UTC unless the form of your account offers a time zone (recommendation).
- Minimum interval 15 minutes (`*/2 * * * *` and `* * * * *` are rejected). Best practice: not below every 30 minutes (scalability tutorial); for near-real-time needs use an API integration instead.
- Executions are queued on the job's pipeline. "If a previous execution is still running when the next periodic trigger fires, the new execution is queued. It does not cancel or replace the running execution."
- Origin in the context: `PERIODIC` (see `job-context.md`). A periodic job cannot rely on a user selection ("the Job expect a user selection to be executed" with `mode: "USER_SELECTION"`, periodicity tutorial). What a periodic run receives for user inputs is not documented: keep the configuration in a `data` block or in global variables, and make the job safe to re-run (recommendations).

Examples: `0 9 * * *` (every day at 09:00 UTC), `0 9 * * 1-5` (weekdays), `0 9,18 * * *` (twice a day), `0 */6 * * *` (every 6 hours), `0 9 1 * *` (first day of the month), `0,30 * * * *` (every 30 minutes).

Troubleshooting a job that did not run (FAQ): check that the rule is enabled, that the job has not been disabled or deleted, that a previous execution is not still running (it queues the new one), that the pipeline is not blocked, and whether a maintenance or an incident interrupted scheduled executions.

## 7. Executions and statuses

"A job execution is a concrete run of a job definition. It records when the job started, which tasks were executed, the inputs and outputs used, and the final status of the run."

| Status | Meaning |
| -- | -- |
| `PENDING` | Created, not started: queued on a pipeline or scheduled. |
| `RUNNING` | In progress. |
| `COMPLETED` | Finished successfully (including a `TERMINATE` with `COMPLETED`). |
| `USER_ERROR` | Errors related to user-controlled data or configuration: invalid or missing user inputs, business or quota violations (for example exceeding a limit when creating items). |
| `FAILED` | Technical issues: invalid job definition, infrastructure problems, unexpected platform errors, or a `TERMINATE` with `FAILED`. Contact support when the cause is not in the job. |
| `TERMINATED` | Explicitly stopped by a user before completion. |
| `TIMEDOUT` | Exceeded the job's `timeoutSeconds`. (The chaining tasks spell it `TIMED_OUT`.) |

Transitions: `PENDING` to `RUNNING` or `TERMINATED`; `RUNNING` to `COMPLETED`, `USER_ERROR`, `TIMEDOUT`, `FAILED` or `TERMINATED`.

The job chaining tasks (`data-job-execution-create` with `wait`, `data-job-execution-await`) list two more terminal statuses that the job executions page does not describe: `COMPLETED_WITH_ERRORS` and `REMOVED`. `COMPLETED_WITH_ERRORS` is also the status of a failed task marked `optional: true` (handling failures page).

Where to look: Settings > Data Factory > Actions lists executions; each execution shows the per-task events log, the downloadable task outputs and the reports. In the app, the Actions panel keeps the history of the current user's executions, with a "Selection" link showing the selected rows. Through the API, `GET /v1/data_factory/job_executions/{id}` returns `status`, `input`, `output` (the job's `outputParameters`) and dates.

A task can also end in `TIMED_OUT` on its own, independently of `timeoutSeconds`: three task pages document a fixed duration and the chaining tasks a configurable wait budget (`limits.md` section 4); the others publish none.

## 8. Outputs, reports, logs

- User outputs (`outputParameters`) make results downloadable at the end of the action in the app and in the Actions history panel (user outputs tutorial); the job execution API returns them in `output`. See `wiring.md`.
- A `notification-display-message` shows HTML in the Actions panel when its `message` output is exposed in `outputParameters`.
- Most tasks produce a `report` XML file (`${<ref>.output.report}`) listing logs with a code, a type (`error`, `warning`, `info`, `debug`) and metadata. Reports are downloadable from the execution details and can be processed by an XSLT in the next task. `logLevel` and `skipReportGeneration` control their size.
- `data-log-create` writes a Data Factory log entry (markdown message, severity), visible in the job execution details.
- Files produced by tasks are temporary files. The release notes announce that, starting July 1, 2026, "files generated by Data Factory will no longer be available beyond 1 year of age"; a file uploaded through the Data Factory files API is deleted after 90 days unless a job uses it. Jobs that must keep results push them to FTP, cloud storage or email.

## 9. Handling failures

| Mechanism | Use |
| -- | -- |
| `timeoutSeconds` (job level) | "particularly useful to avoid blocking a pipeline when an external system is slow or unresponsive"; `0` = no timeout. |
| `optional: true` on a task | the job continues; test `${<ref>.status}` (`COMPLETED_WITH_ERRORS`) in a `SWITCH` to react. |
| ENUM flags (`noFile`, `allFilesTransformed`, `allFilesGenerated`, `allFilesValid`, `allEmailsSent`) | file tasks usually complete even when some files failed; branch on the flag. |
| `TERMINATE` with `COMPLETED` or `FAILED` | decide the outcome explicitly after a functional check; expose a message in its `outputParameters`. |
| `<xsl:message terminate="yes">` in an XSLT | makes the transformation fail: the task page says the task still completes with `allFilesTransformed` = `NO`, the decision-and-terminate tutorial says it ends in error. Reserve it for a broken job contract or a failure the brief asks for, set `optional: true` on the task and branch on `allFilesTransformed` (a `SWITCH` ending in `TERMINATE` `FAILED`). |
| `throw new Error(...)` in a script, `error(...)` in jq | `throw` fails the task (the job stops unless the task is `optional: true`); for jq only the `error` output is documented: test it with a `SWITCH`. Same rule as for XSLT: stop only on a broken contract or when the brief says the job must fail; any other data shape gets a fallback and a report that does not stop the job. |
| `summary.errorCount` of a batch | a batch never fails on a failed entry; check the count. |
| `waitOptions.failOnError` and `waitOptions.timeoutSeconds` of `data-job-execution-create` | control what a failed or slow triggered job does to the caller. |

"For your Jobs you will need to simply differentiate technical errors and functional errors, and most of the time when you have functional errors you don't want that the Job ends in errors."

## 10. Job chaining and waiting

`data-job-execution-create` launches another job by id (or by key through a lookup on `data-job-find`) with its inputs in `element.input`. With `"wait": true` the task polls the execution until a terminal status and returns it, including its `output`; `waitOptions` sets `pollingIntervalSeconds`, `timeoutSeconds` and `failOnError` (default `true`: any terminal status other than `COMPLETED` fails the caller). `data-job-execution-await` waits for executions created earlier.

Rules:

- "One job per pipeline: a pipeline runs a single job at a time. The triggered job must run on a different pipeline than the job that waits for it, otherwise the waiting job blocks its own trigger until the wait times out."
- The wait budget is consumed inside the calling job, whose own `timeoutSeconds` still applies.
- The triggered job's results are read at `${run_job.output.result.json[0].response.output.<key>}`, where `<key>` is declared in the child's `outputParameters`.
- Cross-account triggering passes `"apiKey": "${workflow.globalVariables.partner_api_key}"`.

## 11. Sharing jobs with partners

A job can be shared with partner accounts so they launch it from their own interface. Facts to design for:

- Variables of a shared job are resolved on the job owner's account, so a partner running the job gets the owner's values. A 2022 release note added the overloading of variables on shared jobs; how a partner overrides a variable is not described further. The pipeline is the one the owner attached the job to.
- Tasks without `apiKey` run in the context of the account running the job; tasks with an `apiKey` run in the key's account. `accountKey` on `table-import-items` designates the shared-table context (the owner's account key), not the executing identity.
- A table shared to an account is not returned by key-based find tasks run on that account; reading and writing items with an explicit `partitionId` works.

## 12. Operating checklist

1. Package with the VS Code extension (Problems panel empty) or the offline validator.
2. Create the global variables listed in the README (secrets marked protected).
3. Import the ZIP in Settings; set pipeline, project, status `DRAFT`, visibility.
4. Run from Settings with test data; read the execution details and reports.
5. Add periodicity rules if needed (UTC, at least 15 minutes apart, idempotent job).
6. Switch to `PRODUCTION`; record the version in `CHANGELOG.md`.

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| Writing `periodicity`, `pipelineId` or `status` in `job.json` | configure them in Settings; document them in the README |
| Chained jobs waiting on the same pipeline | different pipelines for the caller and the callee |
| A cron with 6 fields or local time | 5 fields, UTC |
| `*/5 * * * *` | at least 15 minutes between executions |
| Re-uploading a package with a new `key` to update a job | same key; the job is updated in place |
| Assuming a `COMPLETED` job means every file succeeded | test the `YES`/`NO` flags and read the reports |
| Treating `TIMEDOUT` as "task too slow" only | the job budget (`timeoutSeconds`) includes waits for triggered jobs |
| Expecting job files to persist | push results to FTP, storage or email |
