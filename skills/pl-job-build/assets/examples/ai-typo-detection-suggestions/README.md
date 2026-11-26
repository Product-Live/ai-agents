# Detect typos with AI and create suggestions

## Purpose and outcome

Select items in the grid and launch the job. Fields flagged with `ai-typo-check` are sent to the configured model for spelling checks. Each item with corrections receives one suggestion for human review. Product values change only when someone accepts a suggestion.

Screen and item reads run in parallel. AI calls run sequentially in a declared loop: the protected key goes directly into `check_item_typos.apiKey`, without entering a script, a generated request list or a local variable. This is an example of choosing a loop when dynamic batch credential binding is not documented. It does not prohibit batches for other work.

An AI failure or unusable answer is counted for that item and processing continues. Empty selections and items without flagged values require no AI call. Creation responses determine the final suggestion count.

## Prerequisites and settings

Create the protected account variable `ai_api_key` with the chosen provider's key, without a `Bearer` prefix. Mark text fields to check with metadata `ai-typo-check = true` (boolean `true` or string `"true"`). Flag text fields only: this example does not select fields by type.

The job has no user inputs. It reads the grid selection with `data-item-find` in `USER_SELECTION` mode and takes the table and screen from the launch context. Edit the first task's `data` to configure:

| Setting | Default | Meaning |
| -- | -- | -- |
| `provider` | `mistral` | `openai`, `mistral` or `anthropic` |
| `model` | `mistral-small-latest` | Model available at the selected provider |
| `suggestionName` | `AI - Typo detection` | Emitter name on each suggestion |
| `metadataKey` | `ai-typo-check` | Metadata key identifying fields to check |
| `context` | `${workflow.input.context}` | Keep the launch context reference |

## Implementation notes

### Selection and plan

| Task reference | Implementation note |
| -- | -- |
| `prepare_inputs` | Validate provider, model and settings, then read table and screen ids from the launch context. This script receives no key. |
| `check_inputs_valid` | Enter the failure branch when configuration or context validation fails. |
| `terminate_invalid_inputs` | End with FAILED and expose the validation errors. |
| `fetch_screens_and_items` | Read the screen by id and selected items in a batch with concurrency 2. Item data is a JSON attachment; this batch contains no AI credential. |
| `check_screen_found` | Require a screen result before reading its id downstream. |
| `terminate_no_screen` | End with FAILED and explain that the job needs a valid table screen. |
| `extract_field_keys` | Read the item attachment and collect unique field keys and item count. |
| `check_items_exist` | Enter the empty-selection branch when the count is zero. |
| `terminate_no_items` | End with COMPLETED and ask for a selection, before any AI call. |
| `check_keys_exist` | Enter the no-values branch when no field key was collected. |
| `terminate_no_keys` | End with COMPLETED when selected items carry no values. |
| `find_fields` | Read definitions for the collected keys on the launch table, including their metadata. |
| `build_ai_plan` | Filter values by the metadata flag and fill `assets/prompt-template.txt`. Return only item ids, prompts and counts; skip items without a flagged value. |
| `check_ai_items_exist` | Guard the loop when the plan is empty, because a DO_WHILE body runs at least once. |
| `terminate_no_ai_items` | End with COMPLETED and expose total and skipped counts when no prompt was built. |

### AI loop

| Task reference | Implementation note |
| -- | -- |
| `analyze_items` | Process the prompt plan sequentially with a literal loop body, keeping the credential reference on the AI connection input. |
| `current_item` | Select the plan element using the loop's one-based iteration number. |
| `check_item_typos` | Bind `ai_api_key` directly to `apiKey`. Request JSON with a 1024-token answer budget and no web tool. A truncated answer fails this optional task and is counted as an AI error. |
| `check_ai_status` | Check for COMPLETED_WITH_ERRORS before reading answer outputs, which may be absent after failure. |
| `remember_ai_failure` | Set an unsuccessful result for this iteration so an earlier answer cannot be reused. |
| `remember_ai_answer` | Set a successful result containing only the answer text. |
| `collect_ai_result` | Attach the current item id and expose the branch result in the numbered loop output. |

The template asks for spelling corrections only, in `{"corrections":[{"fieldKey":"FIELD_KEY","fieldType":"SINGLE-LINE-TEXT","correctedValue":"corrected text"}]}`. An empty array means no typo. `responseFormat: json_object` applies to supported providers; Anthropic ignores that option, so the JSON instruction remains in the prompt. The parser still checks the answer shape. `temperature` is omitted because support depends on the model.

### Suggestions and counts

| Task reference | Implementation note |
| -- | -- |
| `build_all_suggestions` | Read numbered loop results in order. Count failed, missing or malformed answers and build one nonempty `suggestion_create` operation per item with corrections. |
| `check_has_suggestions` | Invoke creation only when there is at least one operation. |
| `create_suggestions` | Submit prepared suggestions with `failOnError: false`. The optional task allows reporting a task failure; returned responses can also contain individual operation errors. |
| `check_creation_status` | Branch on an optional task failure before reading creation outputs. |
| `remember_creation_failure` | Set an empty response list so each prepared operation is counted as a creation error. |
| `remember_created_suggestions` | Keep returned operation responses for counting. |
| `remember_no_suggestions` | Set an empty response list when there were no corrections to create. |
| `summarize_creations` | Count returned suggestion ids. Missing or rejected responses contribute to `suggestionErrors`. |

## Outputs and limits

| Output | Meaning |
| -- | -- |
| `itemsProcessed` | Selected items read |
| `itemsAnalyzed` | Items sent to the model |
| `itemsSkipped` | Items with no flagged field holding a value |
| `suggestionsCreated` | Returned suggestion ids, one per successfully created suggestion |
| `aiErrors` | Failed AI requests and answers that could not be parsed or had the wrong shape |
| `suggestionErrors` | Prepared operations without a returned suggestion id, including a failed creation task |

A guard exposes its own message and outputs when it terminates the job. The spelling checks remain model suggestions for review, not a guarantee that every proposed value is correct. A long answer can exceed 1024 tokens and is counted as an error. Split large selections to stay within task and suggestion-creation limits; a dedicated pipeline can keep slow AI work from delaying imports.

## Import and adaptation

1. Create `ai_api_key` in Settings > Data Factory > Variables and mark it secret.
2. Set the field metadata and, if needed, change the provider and model in `prepare_inputs`.
3. Package the example with the VS Code extension or `node <skill-dir>/scripts/package-job.js ai-typo-detection-suggestions` from the job builder skill.
4. Import the archive in Settings > Data Factory > Jobs and configure its pipeline and table visibility.
5. Select items in the application, run the job and review the suggestions.

For a different provider key, change the global-variable reference on `check_item_typos.apiKey`. Keep credentials out of `build_ai_plan`, local variables and prompts. For another text check, adapt the prompt template, metadata selector and answer parser together. A web-enrichment job also needs explicit research identifiers and source handling; adding a web tool to this JSON-mode example is not sufficient.
