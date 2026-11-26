# loop

> Reference token: DF-TASK-LOOP-01

Status: alpha (a recent task, available on every account) | Category: flow-control | Documentation: https://learn.product-live.com/data-factory/references/tasks/loop/

## Purpose

"This task allows to perform a loop over a list of elements inside a Data Factory job. The loop is a DO_WHILE loop that executes a set of tasks until a condition is met."
The body runs first, then the condition is evaluated; iterations are sequential and `iteration` is 1-based. Full idioms: `../control-flow.md`.

## When to use

- Sequential processing where each iteration depends on the previous one (state carried through `set-variable`).
- Processing a short list of elements one after the other (PDF documents, products) when a batch is not possible.

## When not to use

- Independent executions: `task-batch-execute` ("instead of hand-writing a loop with per-iteration wiring").
- Nested loops (not documented, so their behaviour is not guaranteed: use a batch or a triggered job for the inner level).

## Inputs

The flow-control properties sit at task level. The `name` is free text (the documentation uses `loop`), the `type` is `DO_WHILE`.

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| inputParameters | OBJECT | yes (documented; not required by the job schema) | | | "Input parameters of the loop.", typically `elements` (an array). Global variables are not supported here |
| loopCondition | STRING | yes | | | "The condition to evaluate if the loop should continue." A JavaScript expression (written in ES5 syntax by convention of these skills) evaluated after each iteration; `$.<loopRef>['iteration']` and `$.<inputKey>` are available; must yield `true` to continue |
| loopOver | ARRAY | yes | | | "The list of tasks to execute inside the loop." A literal array, never a placeholder |

Inside the body, the loop's own inputs and outputs are read as `${<loopRef>.input.<key>}` and `${<loopRef>.output.iteration}`.

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${item_loop.output.iteration} | NUMBER | "The current iteration of the loop" (1-based; after the loop, the number of iterations run) |
| ${item_loop.output.<n>.<innerRef>} | OBJECT | After the loop, one entry per iteration number holding the outputs of each inner task, for example `${item_loop.output.1.get_current_element.result}` |

## Example

```json
{
  "name": "loop",
  "taskReferenceName": "item_loop",
  "description": "Process the elements one after the other",
  "optional": false,
  "type": "DO_WHILE",
  "inputParameters": {
    "elements": [1, 2, 3]
  },
  "loopCondition": "if ($.item_loop['iteration'] >= $.elements.length) { false; } else { true; }",
  "loopOver": [
    {
      "name": "json-transform-jq",
      "taskReferenceName": "get_current_element",
      "description": "Pick the element of the current iteration",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "data": {
          "elements": "${item_loop.input.elements}",
          "iteration": "${item_loop.output.iteration}"
        },
        "queryExpression": ".data.elements[.data.iteration - 1]"
      }
    }
  ]
}
```

## Gotchas and limits

- Alpha: a recent task, available on every account.
- "This task does not support the Data Factory global variables as an input parameter." Pass them through a previous task's output instead.
- The body runs at least once (do-while): guard an empty list with a `switch` before the loop.
- Write `loopCondition` in plain ES5 JavaScript, without arrow functions, `let`, `const` or template strings (convention of these skills). In the documented statement form, the last evaluated expression is the result.
- Never put a `${...}` placeholder under `loopOver` (job creation fails). References to inner tasks from outside the loop go through `${<loopRef>.output.<n>.<innerRef>}`.
- State across iterations goes through `set-variable` (write in the body, read with `${workflow.variables.x}`).
- Sequential by design: N iterations take N times the task duration; split long work or use a batch for independent iterations.

## Related tasks

- `task-batch-execute` (independent executions in parallel), `set-variable` (state across iterations), `switch`
- `json-transform-jq`, `code-execute-javascript` (pick the current element)
- `../control-flow.md`
