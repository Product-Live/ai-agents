# code-execute-javascript

> Reference token: DF-TASK-CODE-EXECUTE-JAVASCRIPT-01

Status: alpha (a recent task, available on every account) | Category: code | Documentation: https://learn.product-live.com/data-factory/references/tasks/code-execute-javascript/

## Purpose

Run a JavaScript snippet (inline or from a job asset) in the platform's isolated JavaScript sandbox over input data and loaded files, and return a JSON value or a generated file.

## When to use

- Logic between tasks: parse the JSON answer of `ai-prompt-execute`, compute or aggregate values, validate and throw, concatenate variables.
- Build CSV, XML or text content and return it as a file (`response: "FILE"`).
- Prepare a value that a `SWITCH` task will branch on.

## When not to use

- Declarative reshaping of JSON: `json-transform-jq` is simpler and cheaper.
- XML transformations: use `file-transformation-xslt`.
- Anything needing network access, Node.js modules or more than 10 minutes of execution: the sandbox forbids all three.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| expression | STRING | one of expression, expressionFile (required per docs; optional per schema) | - | - | Inline JavaScript code with access to `$.data` and `$.resources`. Must `return` a value. |
| expressionFile | FILE | one of expression, expressionFile | - | - | File holding the code; the documentation says the file must have a `url` property and the examples pass `"file://assets/script.js"`. |
| data | OBJECT | no | - | - | Exposed to the script as `$.data`. Global variables cannot be used inside the code, but can be passed here (`"var1": "${workflow.globalVariables.my_var}"`) since they are resolved before execution. |
| resources | ARRAY | no | - | - | Files to load, exposed as `$.resources` (array of `{key, content}`). |
| resources[].key | STRING | yes, inside resources | - | - | Identifier of the resource. |
| resources[].file | OBJECT or STRING | yes, inside resources | - | - | The file to load; documented as a file object with `url`, the examples pass `"file://assets/config.json"`. |
| resources[].loadAs | ENUM | no | TEXT | TEXT, JSON, XML | How the content is parsed; JSON resources arrive already parsed. |
| resources[].encoding | STRING | no | utf-8 | - | Text encoding of the file. |
| response | STRING | no | JSON | JSON, FILE | `FILE`: the returned value is written to a file and `result` becomes a file reference (strings are written as-is, objects serialized to JSON). |
| outputFileName | STRING | no | - | - | Name of the generated file (for example `output.csv`). |

Script context: `$.data` (object), `$.resources` (array of `{key, content}`), `log(...)` (function accepting several arguments; written to the `logs` output). Standard ECMAScript only; the script must `return` a value; `throw new Error("...")` fails the task with that message.

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${sum_product.output.result} | OBJECT or FILE | With `response = JSON`: the returned value, addressable by path (`${sum_product.output.result.sum}`). With `response = FILE`: a file reference with `url`, `hash` and `name`. |
| ${sum_product.output.logs} | FILE | File holding the output of the `log(...)` calls. |

## Example

```json
{
    "name": "code-execute-javascript",
    "taskReferenceName": "sum_product",
    "description": "Compute the sum of two numbers",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "data": {
            "a": 10,
            "b": 20
        },
        "expression": "return { sum: $.data.a + $.data.b };"
    }
}
```

File output: add `"response": "FILE"` and `"outputFileName": "output.csv"`; the returned string is written as-is. Resources: `"resources": [{ "key": "config", "file": "file://assets/config.json", "loadAs": "JSON" }]` then `return { firstItem: $.resources[0].content };` or `$.resources.find(function (r) { return r.key === 'config'; }).content`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- Maximum execution time 10 minutes: beyond that the task ends in `TIMED_OUT` with no outputs.
- Isolated context: no Node.js modules, no network, no `require`, `fetch` or `import`; `eval()` is forbidden and fails the task.
- `${workflow.globalVariables.x}` and other references are never substituted inside the code itself: pass every dynamic value through `data`.
- A thrown error fails the task with its message; combine with `"optional": true` when the check must not block the job.
- Prefer `expressionFile` with a `file://assets/<name>.js` asset for anything longer than a line; default every input (`$.data.name || 'default'`); use `log()` generously, the `logs` file is the only trace.
- Required per schema: none; the documentation requires one of `expression` or `expressionFile`. The documented inputs are `expression`, `expressionFile`, `data`, `resources`, `response` and `outputFileName`: leave out any other key.

## Related tasks

- `ai-prompt-execute`: parse its `content`.
- `json-transform-jq`: declarative alternative for JSON reshaping.
- `set-variable`: store a computed value.
- `switch`: branch on `result`.
- `file-transformation-xslt`: XML transformations.
