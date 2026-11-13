# ai-prompt-execute

> Reference token: DF-TASK-AI-PROMPT-EXECUTE-01

Status: alpha (a recent task, available on every account) | Category: ai | Documentation: https://learn.product-live.com/data-factory/references/tasks/ai-prompt-execute/

## Purpose

Call a language model at OpenAI, Mistral or Anthropic with a prompt (inline, from a file, or as a conversation), optional image and PDF attachments and optional provider server-side tools (web search). The answer comes back in one normalized shape (`content`, `stopReason`, `usage`, `sources`) whatever the provider.

## When to use

- Text generation, translation, classification or extraction over product data.
- Grounding values on the web with their sources (web search tool).
- Reading a PDF datasheet or a product photo.
- One call per execution; wrap it in `task-batch-execute` with `taskName: "ai-prompt-execute"` to run one prompt per item in parallel.

## When not to use

- Deterministic transformations that a jq query, an XSLT or a JavaScript snippet can do.
- Bulk calls inside a loop without a budget: the whole task must finish within 600 seconds.
- Any flow where the API key would be written as a literal: pass it through a secret global variable.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| provider | ENUM | yes | - | openai, mistral, anthropic | Provider to call. |
| model | STRING | yes | - | provider model id | Model id (for example `mistral-small-latest`). A model id that does not belong to the selected provider fails the task before the call. |
| apiKey | STRING | yes | - | - | Provider API key without a `Bearer ` prefix. Store it in a secret global variable: `${workflow.globalVariables.mistral_api_key}`. |
| prompt | STRING | one of prompt, promptFile, messages | - | - | The user prompt. |
| promptFile | STRING or OBJECT | one of prompt, promptFile, messages | - | - | Text file holding the user prompt: a URL, a file object with a non-empty `url`, or a job asset `file://assets/prompt.md`. Read as text (a PDF given here is not attached). An empty value or file fails the task. |
| messages | ARRAY | one of prompt, promptFile, messages | - | - | Conversation: objects with `role` (`system`, `user`, `assistant`) and `content` (string, or array of parts in the provider's native format). A non-empty `messages` wins over `prompt` and `promptFile`. |
| systemPrompt | STRING | no | - | - | System instructions; also applied in `messages` mode. |
| systemPromptFile | STRING or OBJECT | no | - | - | File holding the system prompt; when set, `systemPrompt` is ignored even if the file is empty. |
| attachments | ARRAY | no | - | - | Images and PDF documents (sub-table below). |
| attachments[].type | ENUM | yes | - | image, document | `image` for a picture, `document` for a PDF; any other value fails. |
| attachments[].url | STRING | one of url, file, fileId | - | - | HTTP(S) URL fetched by the provider (must be public) or a base64 data URI. The only source for images. OpenAI does not accept a PDF by HTTP URL. |
| attachments[].file | OBJECT | one of url, file, fileId | - | - | PDF only: a file object with a non-empty `url` (job `FILE` input, `response.file` of an HTTP download), uploaded to the provider by the task. |
| attachments[].fileId | STRING | one of url, file, fileId | - | - | PDF only: a file already stored at the provider (not a Data Factory file id). |
| attachments[].filename | STRING | no | - | must end in `.pdf` | Name sent with a `file` upload; set it for HTTP-downloaded files, whose generated names have no extension. |
| attachments[].contentType | STRING | no | - | application/pdf | Consistency check for `file` attachments; not sent to the provider. |
| tools | ARRAY | no | - | - | Provider server-side tools (sub-table below). |
| tools[].type | ENUM | yes | - | web-search, provider-specific | `web-search` is normalized once (a second entry fails); `provider-specific` sends the provider's own tool definition given in `providerOptions`. |
| tools[].maxUses | NUMBER | no | - | - | Maximum tool uses per answer (OpenAI `max_tool_calls`, Anthropic `max_uses`); Mistral: not supported, fails before the call. |
| tools[].allowedDomains | ARRAY | no | - | bare ASCII host names, up to 100 on OpenAI | Restricts the search; covers subdomains; cannot be combined with `blockedDomains`; Mistral: fails before the call. |
| tools[].blockedDomains | ARRAY | no | - | same format | Excluded hosts; same rules as `allowedDomains`. |
| tools[].providerOptions | OBJECT | no | - | - | Tool-level provider options keyed by provider; on a `provider-specific` entry it is the tool definition itself. `maxUses`, `allowedDomains` and `blockedDomains` are forbidden on a `provider-specific` entry. |
| providerOptions | OBJECT | no | - | - | Raw request options keyed by provider (`{"openai": {...}}`); only the key matching `provider` is read; a key the task already sets fails the task before the call. |
| responseFormat | ENUM | no | - | json_object | JSON mode on OpenAI and Mistral; the prompt must also ask for JSON (OpenAI rejects it otherwise); ignored by Anthropic without error. |
| temperature | NUMBER | no | not sent | - | Many current models reject it (fails before the call for OpenAI `o<digit>*` models and several Anthropic models). Leave unset unless documented for the model. |
| maxTokens | NUMBER | no | 4096 | - | Maximum generated tokens; covers reasoning on reasoning models and every turn of a tool loop. |
| failOnRefusal | BOOLEAN | no | true | true, false | Fail on a provider refusal or content filter; `false` continues with `stopReason: "refusal"`. |
| failOnTruncation | BOOLEAN | no | false | true, false | Fail when the answer stops at `maxTokens` or `max_tool_iterations`; recommended `true` for JSON answers (except inside a loop over items). Never fails on `tool_use`. |
| failOnToolError | BOOLEAN | no | false | true, false | Fail on a tool failure inside a successful answer (reported by OpenAI and Anthropic only); with a tool declared on `mistral`, `true` fails before the call. |
| outputFileName | STRING | no | - | plain file name, no folders | Saves `content` to a file with this name and returns it in `outputFile`. |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${translate_text.output.content} | STRING | The answer text; always a string, even in JSON mode (parse it in a following task). Can be empty. Citation markers are stripped. |
| ${translate_text.output.provider} | STRING | Provider called. |
| ${translate_text.output.model} | STRING | Model id returned by the provider (may be dated); falls back to the input. |
| ${translate_text.output.stopReason} | STRING or null | `end_turn`, `max_tokens`, `refusal`, `tool_use`, `max_tool_iterations`, another provider value, or `null`. |
| ${translate_text.output.sources} | ARRAY or null | `[{url, title, cited}]`, cited pages first; `null` when no tool was declared; empty array when the search brought nothing back. |
| ${translate_text.output.toolErrors} | ARRAY or null | `[{type, code}]`; `[]` when a tool was declared and nothing failed; `null` without a tool; always `[]` on Mistral. |
| ${translate_text.output.usage.promptTokens} | NUMBER | Prompt tokens (0 when the provider returns none); Mistral adds tool tokens here. |
| ${translate_text.output.usage.completionTokens} | NUMBER | Generated tokens. |
| ${translate_text.output.usage.totalTokens} | NUMBER | Total tokens. |
| ${translate_text.output.usage.toolUse} | OBJECT | Only with a tool, for example `{"web-search": 2}`. |
| ${translate_text.output.usage.cacheReadInputTokens} | NUMBER | Anthropic only; 0 unless `cache_control` is set in `messages` content blocks. Same for `usage.cacheCreationInputTokens`. |
| ${translate_text.output.responseTimeMs} | NUMBER | Duration of the last generation attempt. |
| ${translate_text.output.outputFile} | OBJECT | Only with `outputFileName`: a file object (`id`, `url`, `hash`, `filename`) usable as a FILE input downstream. |

## Example

```json
{
    "name": "ai-prompt-execute",
    "taskReferenceName": "translate_text",
    "description": "Translate a text to French",
    "type": "SUB_WORKFLOW",
    "optional": false,
    "inputParameters": {
        "provider": "mistral",
        "model": "mistral-small-latest",
        "apiKey": "${workflow.globalVariables.mistral_api_key}",
        "prompt": "Translate the following text to French: Hello World"
    }
}
```

Structured answer pattern: set `"responseFormat": "json_object"`, ask for JSON in the prompt, set `maxTokens` and `"failOnTruncation": true`, then parse `${extract_attributes.output.content}` with a `code-execute-javascript` task whose expression is `return JSON.parse($.data.content);`.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- Time budget: the whole task (prompt files, uploads, generation with retries, output file) must finish within 600 seconds; reaching 600 seconds fails the task with no partial answer. Budget tools inside loops and batches accordingly.
- Retries: the task retries temporary provider errors (rate limit, overload, server errors, network errors, timeouts) a few times; uploads are not retried.
- Pre-call checks (model and provider consistency, forbidden option combinations) run at execution, not at import; inside a batch they run once per entry.
- `attachments` and `tools` in the same call fail before the call on `openai` and `mistral`; Anthropic composes both. Attachments go after the prompt text (OpenAI, Mistral) or before it (Anthropic); in `messages` mode they are added to the last `user` message (the task fails if there is none).
- Mistral with a tool plus `responseFormat` may wrap the JSON in a Markdown fence or append text: take the first complete JSON object. A tool loop may repeat a correct answer until `maxTokens`, giving `stopReason: "max_tokens"` on a usable answer: judge the content, not the token count.
- An empty `sources` array can mean "answered from memory" or "search failed inside an HTTP 200"; guard with a following `code-execute-javascript` task that throws when `$.data.sources` is empty.
- `max_tool_iterations` (Anthropic): the task sends one generation request and never continues a paused loop; `failOnTruncation: true` catches it (inside a loop over items, mark the task optional and judge `content` downstream instead).
- Uploaded files are never deleted by the task; ids of automatic uploads are not returned; Mistral may dedupe identical content (do not delete a Mistral file another job may use).
- Without `tools`, OpenAI and Mistral models that return chunked content give an empty `content` with no error.
- Error messages are `[provider] <reason> (HTTP <status>)`: 400 bad request (unknown model, rejected parameter such as `temperature`, JSON mode without "JSON" in the prompt, missing `fileId`), 401 authentication failed, 403 access denied, 404 model or endpoint not found, 429 rate limit, 529 provider overloaded, other 5xx server error; "No HTTP status received" on a network error or timeout.
- Model ids change often: take them from the provider's current model list and do not hardcode one as the only valid value.
- The VS Code extension schema requires `provider`, `model` and `apiKey` (same as the documentation) but does not list `tools`, `providerOptions` or `failOnToolError`; the documentation does. Prefer the documentation; the editor may flag those keys.

## Related tasks

- `code-execute-javascript`: parse and validate the JSON answer, check `sources`.
- `protocol-http-perform`: download a private PDF (`response.file`) or upload a file to the provider to reuse its id.
- `task-batch-execute`: one prompt per item in parallel.
- `loop`: sequential iteration when the batch is not appropriate.
- `data-suggestion-create`: push proposed values rather than writing them directly.
