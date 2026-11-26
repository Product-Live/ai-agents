# data-job-execution-create

> Reference token: DF-TASK-DATA-JOB-EXECUTION-CREATE-01

Status: alpha (a recent task, available on every account) | Category: data | Documentation: https://learn.product-live.com/data-factory/references/tasks/data-job-execution-create/

## Purpose

Trigger executions of other jobs, on the current account or on a partner's account, and optionally wait for them and get their outputs.

## When to use

- Parent and child job orchestration; triggering a partner's job.
- Scheduled fan-out; passing computed inputs to a generic job.

## When not to use

- Awaiting executions created elsewhere: use `data-job-execution-await`.
- A child job scheduled on the same pipeline as the parent with `wait: true`: a pipeline runs one job at a time, so the wait lasts until timeout.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| apiKey | STRING | no | automatic key of the current user | - | API key used to perform the request. When omitted, an automatically generated key acts on behalf of the current user. Pass a secret global variable, never a literal. |
| request | OBJECT | yes (per docs and per schema) | - | - | The request document. |
| request.contentType | STRING | yes, inside request | - | application/json, application/xml | Content type of the request body. |
| request.method | ENUM | yes, inside request | - | INLINE, ATTACHMENT | INLINE: the body is given in request.json. ATTACHMENT: the body is given as a file in request.file. |
| request.model | ENUM | no | default | default | Model of the request; the examples always spell it out. |
| request.json | OBJECT | when method = INLINE and contentType = application/json | - | - | The request body. |
| request.json.operations | ARRAY | yes, inside request.json | - | - | One entry per element to write. |
| request.json.operations[].key | STRING | yes | - | - | Unique key of the operation; echoed in the output next to its response. |
| request.json.operations[].element | OBJECT | yes | - | - | The element to write (properties listed below). |
| request.json.operations[].context | OBJECT | depends on the task (see below) | - | - | Extra context some elements need (for instance the id of the parent entity). |
| request.json.operations[].lookups | ARRAY | no | - | - | Resolves business keys into ids for this operation (lookups reference, alpha). |
| request.json.lookups | ARRAY | no | - | - | Same mechanism, declared once for the whole request. |
| request.file | OBJECT | when method = ATTACHMENT | - | - | File holding the request body: a file object produced by an earlier task or a file://assets/ reference. |
| failOnError | BOOLEAN | no | false (documented on data-job-execution-create and data-suggestion-create) | true, false | Fail the task when at least one operation is rejected; otherwise rejected operations are reported in the output with their error body. Documented on data-job-execution-create and data-suggestion-create; the job schema accepts it on every create task and several documentation examples use it. |
| outputs | ARRAY | no | [{"mediaType": "application/json", "outputMode": "INLINE", "outputKey": "json"}] | - | Output descriptors. |
| outputs[].mediaType | STRING | yes, inside outputs | - | application/json, application/xml | Media type of the output. |
| outputs[].outputMode | ENUM | yes, inside outputs | - | INLINE, ATTACHMENT | INLINE is only supported for application/json. |
| outputs[].outputKey | STRING | yes, inside outputs | - | json, xml (documented); one shared example uses free keys | Key under result that holds this output. |
| outputs[].model | ENUM | no | default | default | Model of the output. |
| request.json.operations[].element.jobId | STRING | yes | - | - | Id of the job to run; resolvable from a job key with a lookup (`"taskName": "data-job-find", "assign": "element.jobId", "entityKey": "<job key>"`). |
| request.json.operations[].element.info | OBJECT | yes | - | - | Execution information. |
| request.json.operations[].element.info.title | STRING | yes | - | - | Title shown for the execution. |
| request.json.operations[].element.input | OBJECT | yes | - | - | Inputs passed to the job's user inputs; may be `{}`. |
| wait | BOOLEAN | no | false | true, false | Wait until every created execution reaches a terminal status and return the terminal executions in place of the creation responses. |
| waitOptions.pollingIntervalSeconds | NUMBER | no | 15 | minimum 5 | Delay between status checks. |
| waitOptions.timeoutSeconds | NUMBER | no | 3600 | maximum 86400; at most 720 polls | Overall wait budget. |
| waitOptions.failOnError | BOOLEAN | no | true | true, false | Fail when an awaited execution ends on a status other than `COMPLETED`. |

On this task `failOnError` is documented: default `false`; `true` fails the task when at least one operation is rejected by the API; `false` reports rejected operations in the output with their error body.

### Request grammar (shared by the data create, update and delete tasks)

`request.json` is an `operations` array; each operation carries a unique `key`, the `element` to write and, when the task needs it, a `context`:

```json
{
  "operations": [
    { "key": "a", "element": { "...": "..." } },
    { "key": "b", "context": { "...": "..." }, "element": { "...": "..." } }
  ]
}
```

With `request.method = "ATTACHMENT"` and `request.contentType = "application/xml"`, the same structure is written in the W3C JSON-to-XML form (the documentation shows both `<?xml version="1.0"?>` and `<?xml version="1.1"?>` prologs; prefer 1.0):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<map xmlns="http://www.w3.org/2005/xpath-functions">
  <array key="operations">
    <map>
      <string key="key">a</string>
      <map key="context"></map>
      <map key="element">
        <string key="...">...</string>
      </map>
    </map>
  </array>
</map>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${create_job_execution.output.result.json} | ARRAY | One entry per operation: {"key": "<operation key>", "response": {...}} where response is the job_execution entity returned by the API (default INLINE JSON output). |
| ${create_job_execution.output.result.json[0].response.id} | STRING | Id of the entity written by the first operation. |
| ${create_job_execution.output.result.xml} | FILE | XML file, when outputs declares mediaType application/xml, outputMode ATTACHMENT and outputKey xml. |
| ${create_job_execution.output.result.json[0].response.status} | STRING | With `wait = true`, the terminal status of the execution. |
| ${create_job_execution.output.result.json[0].response.output.export_file} | OBJECT | With `wait = true`, a file exposed by the child job through its `outputParameters` (the key is the one the child job declared). |

## Example

```json
{
    "name": "data-job-execution-create",
    "taskReferenceName": "create_job_execution",
    "description": "Create a job execution",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "request": {
            "method": "INLINE",
            "contentType": "application/json",
            "model": "default",
            "json": {
                "operations": [
                    {
                        "key": "a",
                        "element": {
                            "jobId": "000000000000000000000001",
                            "info": {
                                "title": "Manual run"
                            },
                            "input": {}
                        }
                    }
                ]
            }
        }
    }
}
```

Run and wait: add `"wait": true, "waitOptions": {"pollingIntervalSeconds": 15, "timeoutSeconds": 1800}` to `inputParameters`. Dynamic inputs (verbatim): `"jobId": "${workflow.input.targetJobId}"`, `"input": {"sourceJobId": "${workflow.workflowId}", "processedItems": "${previous_task.output.itemCount}"}`; the expression used for the source identifier is not among the documented roots (see `../wiring.md`), so prefer passing explicit values. Another account: `"apiKey": "${workflow.globalVariables.partner_api_key}"`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- The XML request page shared by every create task states that the task performs a full replacement of the target entity and that omitted properties are reset to their default value. Where a task page says otherwise (for example data-project-patch), the task page wins.
- `failOnError` is documented on this task (default `false`) and this is the only create task where it is: elsewhere it appears in examples or in the job schema without documentation.
- The documentation writes `request.file` as the placeholder `"@my-request.xml"`; that syntax is never defined. In a real job pass a file object produced by an earlier task or a `file://assets/<name>.xml` asset.
- `outputs[].outputKey` is documented as `json` or `xml`, but the shared output example uses free keys (`json_inline`, `xml_attachment`); the documentation shows both, prefer `json` and `xml`.
- Leave out any key that the input table does not list.
- One job per pipeline: with `wait: true` the triggered job must run on a different pipeline than the waiting job, otherwise the wait deadlocks until timeout.
- Operations rejected at creation (with `failOnError: false`) keep their error response and are not awaited; if no operation returned an execution id, the task fails.
- With `wait: true` and an ATTACHMENT output, the file holds the terminal executions as `data-job-execution-find` returns them, without the `{key, response}` envelope.
- An API key grants every action on its account: store a partner key in a secret global variable.
- The VS Code extension schema does not list `wait` or `waitOptions`; the documentation does. Prefer the documentation; the editor may flag them.

## Related tasks

- `data-job-execution-await`: wait separately.
- `data-job-execution-find`: look executions up.
- `data-job-find`: resolve a job id (or use a lookup).
