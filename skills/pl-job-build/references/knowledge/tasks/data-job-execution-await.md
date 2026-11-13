# data-job-execution-await

> Reference token: DF-TASK-DATA-JOB-EXECUTION-AWAIT-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-job-execution-await/

## Purpose

Wait until one or more job executions reach a terminal status and return them with their `output` (for example the files they produced). Standalone counterpart of the `wait` option of `data-job-execution-create`.

## When to use

- Orchestrate child jobs created earlier by another task, by the API or on another account, and consume their outputs afterwards.
- Separate the creation of executions from the wait (for example to create several executions, then await them all).

## When not to use

- When the same task creates and awaits: `data-job-execution-create` with `"wait": true` does both.
- Awaiting an execution scheduled on the job's own pipeline: a pipeline runs a single job at a time, so the wait blocks until timeout.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| apiKey | STRING | no | automatic key of the current user | - | A job execution is only visible to the account that created it; to await one created with another account's key, pass that key (from a secret global variable). |
| jobExecutionIds | ARRAY | yes (per docs and per schema) | - | up to 100 ids | Ids of the executions to wait for; a single id string is also accepted; duplicates are ignored. |
| pollingIntervalSeconds | NUMBER | no | 15 | minimum 5 | Delay between two status checks. |
| timeoutSeconds | NUMBER | no | 3600 | maximum 86400; timeoutSeconds divided by pollingIntervalSeconds must not exceed 720 | Overall wait budget; the task fails when it is exceeded. |
| failOnError | BOOLEAN | no | true | true, false | Fail when an awaited execution ends on a terminal status other than `COMPLETED`; `false` completes the task and the executions carry their status. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | Inline or file output. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml | Key under result that holds this output. |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${await_job_executions.output.totalElements} | NUMBER | Number of executions returned. |
| ${await_job_executions.output.result.json} | ARRAY | Terminal job execution entities (job executions API): `id`, `jobId`, `status`, `startedAt`, `endedAt`, `input`, `output`. |
| ${await_job_executions.output.result.json[0].output.export_file} | OBJECT | A file exposed by the awaited job through its `outputParameters` (files appear as `{"url": "..."}`); the key is the one the child job declared. |
| ${await_job_executions.output.statuses} | OBJECT | Map of job execution id to terminal status. |
| ${await_job_executions.output.message} | STRING | Human readable summary. |

## Example

```json
{
    "name": "data-job-execution-await",
    "taskReferenceName": "await_job_executions",
    "description": "Wait for the job executions to complete",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "jobExecutionIds": ["${create_job_execution.output.result.json[0].response.id}"],
        "pollingIntervalSeconds": 15,
        "timeoutSeconds": 1800
    }
}
```

For an execution created on a partner account add `"apiKey": "${workflow.globalVariables.partner_api_key}"`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- Terminal statuses: `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED`, `REMOVED`, `TERMINATED`, `TIMED_OUT`, `USER_ERROR`. With the default `failOnError: true`, anything other than `COMPLETED` fails the task.
- The task fails when an id is still unknown after 3 consecutive checks (wrong id, execution of another account, deleted execution); transient check errors are retried at the next interval.
- Limits: at most 100 ids; `pollingIntervalSeconds` at least 5; `timeoutSeconds` at most 86400 and at most 720 polls (`timeoutSeconds / pollingIntervalSeconds <= 720`).
- A pipeline runs a single job at a time: the awaited job must run on a different pipeline than the waiting job, otherwise the wait lasts until timeout.
- A job exposes files only through its `outputParameters` (or a `TERMINATE` task's `outputParameters`, which win); there is no implicit file listing in `output`.
- Set the job-level `timeoutSeconds` of the waiting job with the wait budget in mind.
- Leave out any key that the input table does not list.

## Related tasks

- `data-job-execution-create`: create the executions (with or without `wait`).
- `data-job-execution-find`: look executions up by status or job.
- `data-job-find`: resolve a job id.
- `terminate`: expose files in the child job's outputs.
- `wait`: fixed delay without polling.
