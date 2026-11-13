# wait

> Reference token: DF-TASK-WAIT-01

Status: alpha (a recent task, available on every account) | Category: flow-control | Documentation: https://learn.product-live.com/data-factory/references/tasks/wait/

## Purpose

A flow-control task of type `WAIT` that pauses the job for a duration or until a date. Provide exactly one of `duration` or `until`. Full idioms: `../control-flow.md`.

## When to use

- Polling a partner system after a delay, or waiting for an asynchronous process started by a previous task.
- Scheduling the second half of a job at a fixed date.

## When not to use

- Periodic execution: configure the job periodicity in Settings instead.
- Long pauses in a busy pipeline: a waiting job occupies its pipeline.

## Inputs

The `name` is free text (the documentation uses `waiting_task`), the `type` is `WAIT`, and the properties sit under `inputParameters`.

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| inputParameters.duration | STRING | one of duration / until | | | "Wait for a specific duration." Examples `2 days 3 hours`, `1 hour 30 minutes`, `1 day 2 hours 30 minutes 10 seconds`, `2h30m`. Units in the order days > hours > minutes > seconds; spellings `days/day/d`, `hours/hour/hrs/hr/h`, `minutes/minute/mins/min/m`, `seconds/second/secs/sec/s`; case-insensitive; space optional; out-of-order units are invalid |
| inputParameters.until | STRING | one of duration / until | | | "Wait until a specific date." Formats `yyyy-MM-dd HH:mm`, `yyyy-MM-dd HH:mm z` (for example `2025-12-25 09:00 CEST`), `yyyy-MM-dd`. "A date already in the past does not wait: the task completes immediately" |

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| (none) | | No output |

## Example

```json
{
  "name": "wait",
  "taskReferenceName": "wait_task",
  "description": "Wait two hours before polling the partner API",
  "optional": false,
  "type": "WAIT",
  "inputParameters": {
    "duration": "2 hours"
  }
}
```

Date variant: `"inputParameters": {"until": "2025-12-25 09:00 CEST"}`.

## Gotchas and limits

- Alpha: a recent task, available on every account.
- "duration and until are mutually exclusive - Provide exactly one of them: Setting both makes the task end in error ... Setting neither makes the task wait indefinitely - the job stays in progress until it is cancelled or hits its own timeout." Always set the job `timeoutSeconds` when using this task.
- Global variables are not supported as inputs of this task.
- One running job per pipeline: a waiting job blocks the other jobs of its pipeline.

## Related tasks

- `data-job-execution-create` and `data-job-execution-await` (job chaining with waiting)
- `loop` (poll until a condition), `switch`
- `../control-flow.md`, `../lifecycle.md`
