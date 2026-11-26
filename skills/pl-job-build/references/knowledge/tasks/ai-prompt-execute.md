# ai-prompt-execute

> Reference token: DF-TASK-AI-PROMPT-EXECUTE-01

Status: alpha (a recent task, available on every account) | Category: ai | Documentation: https://learn.product-live.com/data-factory/references/tasks/ai-prompt-execute/

## Purpose

"This task sends a prompt to OpenAI, Mistral or Anthropic and returns the answer in the same format for the three providers." The prompt is given inline (`prompt`), in a text file (`promptFile`) or as a conversation (`messages`). Images and PDF documents can be attached, and the provider's web search can be enabled with `tools`.

## When to use

- Text generation, translation, classification or extraction over product data.
- Grounding values on the web with their sources (web search tool).
- Reading a PDF datasheet or a product photo.
- One call per execution. Use `task-batch-execute` for independent calls only when the credential stays in a documented connection input. If preparing the batch would pass the secret through JavaScript or its output, use a declared AI task inside a bounded loop with `apiKey` bound directly to the protected variable.

## When not to use

- Deterministic transformations that a jq query, an XSLT or a JavaScript snippet can do.
- Bulk calls inside a loop without a budget: the whole task must finish within 600 seconds.
- Any flow where the API key would be written as a literal: pass it through a secret global variable.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| provider | ENUM | yes | - | openai, mistral, anthropic | The AI provider to call. |
| model | STRING | yes | - | provider model id | The provider's model ID, for example `mistral-small-latest`. "A model name containing another provider's name fails the task, for example `gpt-4o-mini` with `mistral`." |
| apiKey | STRING | yes | - | - | The provider's API key. Store it in a protected variable and pass the reference, for example `${workflow.globalVariables.mistral_api_key}`. |
| prompt | STRING | one of prompt, promptFile, messages | - | - | The user prompt. |
| promptFile | STRING or OBJECT | one of prompt, promptFile, messages | - | - | A text file holding the user prompt: a URL, or a file object with a `url`, such as a job asset `file://assets/prompt.md`. |
| messages | ARRAY | one of prompt, promptFile, messages | - | - | A conversation, for example for few-shot prompting: objects with a `role` (`system`, `user` or `assistant`) and a `content`. |
| systemPrompt | STRING | no | - | - | Instructions that set the model's behavior. |
| systemPromptFile | STRING or OBJECT | no | - | - | A text file holding the system prompt, in the same forms as `promptFile`. |
| attachments | ARRAY | no | - | - | Images and PDF documents sent with the prompt (sub-table below). |
| attachments[].type | ENUM | yes | - | image, document | `image` for a picture, `document` for a PDF. Any other value fails the task. |
| attachments[].url | STRING | one of url, file, fileId | - | - | An HTTP(S) URL, downloaded by the provider, or a base64 data URI such as `data:application/pdf;base64,...`. The only source for images. |
| attachments[].file | OBJECT | one of url, file, fileId | - | - | PDF only. A Data Factory file object with a `url`, such as a job `FILE` input. The task uploads it to the provider, so it needs no public URL. |
| attachments[].fileId | STRING | one of url, file, fileId | - | - | PDF only. The ID of a file already stored by the selected provider, readable with the same API key. |
| attachments[].filename | STRING | no | the file's own name | - | The name sent with the PDF. With `file`, it must end in `.pdf`: set it when the file's name has no extension, as after an HTTP download. |
| tools | ARRAY | no | - | - | Server-side tools the provider runs while it writes the answer, such as web search (sub-table below). |
| tools[].type | ENUM | yes | - | web-search, provider-specific | `web-search` is written the same way for the three providers and is declared once. `provider-specific` sends the tool definition written in `providerOptions` for the selected provider. |
| tools[].maxUses | NUMBER | no | - | - | The maximum number of tool uses for one answer. |
| tools[].allowedDomains | ARRAY | no | - | host names without a scheme | Restricts the search to these sites, such as `example.com`. An empty array restricts nothing. |
| tools[].blockedDomains | ARRAY | no | - | same format | Excludes these sites. Cannot be combined with `allowedDomains`. An empty array restricts nothing. |
| tools[].providerOptions | OBJECT | no | - | - | Options of this tool in the selected provider's own vocabulary, keyed by provider. On a `provider-specific` entry, the whole tool definition: `maxUses`, `allowedDomains` and `blockedDomains` then fail the task. |
| providerOptions | OBJECT | no | - | - | Request options in the selected provider's own vocabulary, keyed by provider (`openai`, `mistral`, `anthropic`). Only the key of the selected provider is read. A key the task already sets from its own inputs fails the task. |
| responseFormat | ENUM | no | - | json_object | Enables JSON mode on OpenAI and Mistral. Anthropic ignores it. Ask for JSON in the prompt as well. |
| temperature | NUMBER | no | not sent | - | Controls response variability. Some models reject it, for example `claude-opus-5`, which fails the task. |
| maxTokens | NUMBER | no | 4096 | - | The maximum number of tokens the model may generate. |
| failOnRefusal | BOOLEAN | no | true | true, false | Fails the task when the provider refuses to answer. `false` continues with `stopReason: "refusal"` and the `content` returned, often empty. |
| failOnTruncation | BOOLEAN | no | false | true, false | Fails the task when `stopReason` is `max_tokens` or `max_tool_iterations`. By default, the partial answer is returned. |
| failOnToolError | BOOLEAN | no | false | true, false | Fails the task when the provider reports a tool failure. By default, the answer is returned and the failures are listed in `toolErrors`. |
| outputFileName | STRING | no | - | - | Saves `content` as a file with this name and returns it in `outputFile`. |

Which prompt is used: "A non-empty `messages` array is used instead of `prompt` and `promptFile`. Otherwise, `promptFile` replaces `prompt` when set, and `systemPromptFile` replaces `systemPrompt`. Prompt files are read as text: send a PDF with `attachments`."

PDF sources per provider:

| PDF source | openai | mistral | anthropic |
| --- | --- | --- | --- |
| HTTP(S) `url` | no | yes | yes |
| Base64 data URI in `url` | yes | yes | yes |
| `file` | yes | yes | yes |
| `fileId` | yes | yes | yes |

Web search per provider:

| Capability | openai | mistral | anthropic |
| --- | --- | --- | --- |
| `maxUses` | yes, counts every tool call of the answer | no, fails the task | yes |
| `allowedDomains`, `blockedDomains` | yes | no, fails the task | yes |
| `toolErrors` | yes | no, `failOnToolError: true` fails the task | yes |
| `attachments` in the same call | no, fails the task | no, fails the task | yes |

With OpenAI, a `messages` content written as an array of parts fails the task when `tools` is set: write the content as a string.

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${translate_text.output.content} | STRING | The text of the answer. It stays a string in JSON mode: parse it in a following task. With `tools`, the provider's citation markers are removed. |
| ${translate_text.output.provider} | STRING | The provider that was called. |
| ${translate_text.output.model} | STRING | The model ID returned by the provider, which can be more specific than the input. |
| ${translate_text.output.responseId} | STRING or null | The provider's ID for the answer. |
| ${translate_text.output.stopReason} | STRING | `end_turn` (complete answer), `max_tokens` (stopped at `maxTokens`), `refusal`, `tool_use` or `max_tool_iterations` (the provider stopped its own tool loop before the answer was finished). Other provider values are returned as they are. |
| ${translate_text.output.usage.promptTokens} | NUMBER | Prompt tokens. On Mistral with `tools`, the tools' own tokens are included here. |
| ${translate_text.output.usage.completionTokens} | NUMBER | Generated tokens. |
| ${translate_text.output.usage.totalTokens} | NUMBER | Total tokens. |
| ${translate_text.output.usage.toolUse} | OBJECT | With `tools`: the number of tool runs, for example `{"web-search": 2}`. |
| ${translate_text.output.usage.cacheReadInputTokens} | NUMBER | Anthropic only; also `usage.cacheCreationInputTokens`. |
| ${translate_text.output.sources} | ARRAY or null | With `tools`: the pages behind the answer, as objects with `url`, `title` and `cited`, each page once, the cited ones first. |
| ${translate_text.output.toolErrors} | ARRAY or null | With `tools`: the tool failures the provider reported, as objects with `type` and `code`. |
| ${translate_text.output.responseTimeMs} | NUMBER | Duration of the call to the provider, in milliseconds. |
| ${translate_text.output.outputFile} | OBJECT | Only with `outputFileName`: the saved answer, as a file object with a `url`. |

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

The documentation also shows a JSON answer (`systemPrompt` asking for a JSON object and `"responseFormat": "json_object"`), few-shot prompting with `messages`, prompts from job assets (`systemPromptFile`, `promptFile`), and web search with `"tools": [{"type": "web-search"}]` (`mistral` with `mistral-small-latest`), optionally restricted with `allowedDomains` (`openai` with `gpt-5.6-terra`).

Structured answer pattern: set `"responseFormat": "json_object"`, ask for JSON in the prompt, set `maxTokens` and `"failOnTruncation": true`, then parse `${extract_attributes.output.content}` with a `code-execute-javascript` task whose expression is `return JSON.parse($.data.content);`.

### JSON values from web research

Whether `responseFormat` can be combined with `tools` is not documented. For web research, omit `responseFormat`, request JSON in the prompt and parse the returned text (convention of these skills). The validator warns on `responseFormat: "json_object"` combined with `web-search` on `openai`.

Ask for the supporting URL of each proposed value, then compare it with the returned `sources` in the answer parser. A URL written by the model is not evidence that the provider read the page, and source membership only checks provenance: it does not establish that the page supports the fact. If the required sources are absent or the answer is unusable, follow the job's agreed failure policy: skip and report the item, or fail when the brief requires it.

## Gotchas and limits

- Alpha task: a recent task, available on every account.
- "The whole task must finish within 600 seconds." Budget tools inside loops and batches accordingly.
- "Each call to the provider times out after 150 seconds without a response."
- "The call that generates the answer is retried up to twice on HTTP 408, 429, 500, 502, 503, 504 and 529."
- Provider errors fail the task with a message that names the provider and the HTTP status, followed by the provider's own message, for example `[mistral] Authentication failed (HTTP 401). Check your API key`. A failed PDF upload gives `[openai] File upload failed (HTTP 401)`.
- These inputs fail the task before the provider is called: no prompt; a model name containing another provider's name; `temperature` on a model that rejects it; an attachment `type` other than `image` or `document`; no source or several sources on one attachment; a `file` whose `filename` does not end in `.pdf`; a PDF HTTP(S) `url` or a non-PDF data URI with OpenAI; a second `web-search` entry; a domain restriction with Mistral; `attachments` and `tools` together with OpenAI or Mistral; a `messages` content as an array of parts with OpenAI and `tools`.
- A `file` is uploaded to the provider with a 24-hour expiry requested. The task never deletes a file stored by the provider.
- `providerOptions` exception: with a tool declared, OpenAI and Mistral calls are sent with `store: false`, and `"providerOptions": {"openai": {"store": true}}` changes it.
- Without `tools`, the task calls OpenAI Chat Completions, Mistral Chat Completions and Anthropic Messages. With `tools`, it calls OpenAI Responses, Mistral Conversations and Anthropic Messages.
- With `tools`, use a model that the provider serves with its web search. Model names change often: take them from the provider's models page and do not hardcode one as the only valid value.
- An empty `sources` array does not prove that no search occurred, and `failOnToolError: true` does not guarantee sources: check provenance in the answer parser.
- The VS Code extension schema requires `provider`, `model` and `apiKey` (same as the documentation) but does not list `tools`, `providerOptions` or `failOnToolError`; the documentation does. Prefer the documentation; the editor may flag those keys.

## Related tasks

- `code-execute-javascript`: parse and validate the JSON answer, check `sources`.
- `protocol-http-perform`: download a private PDF (`response.file`) or upload a file to the provider to reuse its id.
- `task-batch-execute`: one prompt per item in parallel.
- `loop`: sequential iteration when the batch is not appropriate.
- `data-suggestion-create`: push proposed values rather than writing them directly.
