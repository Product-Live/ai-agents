# Typical job use cases

Read the matching case when creating a job or modifying the affected flow. These cases add questions and design choices to `questions.md`; reuse answers from the brief, instruction files and earlier exchanges. They do not authorize platform access or execution.

## Web research and product enrichment

Applies when a job searches the web, scrapes product pages or uses AI to enrich product data, for example "suggest values found on the web for the selected items". Resolve the business identifier used to research each item before designing that flow. A platform item ID identifies the write target; it does not choose the search identifier.

The documentation publishes a ready-to-use job for this case ("Fill empty product fields from the web", generic job 19). Its conventions are good defaults: metadata `ai-web-enrich-identifier` set to `true` on the fields that identify the product, metadata `ai-web-enrich` set to `true` on the fields to fill, only empty fields by default, suggestions for human review, one AI call per item.

### Questions for this case

Reuse the brief and earlier answers; ask only what is missing, with the general rules of `questions.md`.

- Web search fields: EANs supplied for a test select the rows to read. They leave open which product values to search for online. Use an explicit identity metadata selector when supplied. For a field named by its label or key, resolve it with `list_fields` on the chosen table and use its actual key. If several fields match, show their labels, keys and levels so the user can choose. When the user leaves the search fields open, inspect that table and suggest suitable fields or a combination in the interactive question. A public product code, model number or manufacturer reference can be useful when present. Show each candidate by its own label and key. If the schema is unavailable, ask for the field label or key. The user can choose the barcode explicitly. Reuse the EANs already provided for row selection.
- When a row lookup field also qualifies as a web identifier, settle the overlap before design. If the metadata is unavailable during framing, ask conditionally. For example, "If the lookup field is tagged for web research, should its value also reach the provider, or should it only locate the item?" Use the interactive question flow. Confirm the affected launch modes when unclear and carry that answer into the design. An API-only exclusion leaves the grid's tagged identifiers available. Reuse an explicit choice from the brief.
- Context fields (recommended): one or more fields that make the product unambiguous on the web, such as the brand, the product name or a barcode. A manufacturer reference alone often matches several products or variants. Ask for their keys, or propose the `ai-web-enrich-identifier` metadata, which flags several identity fields.
- Fields to fill: the metadata key that flags them (`ai-web-enrich` in the documented job) and the value that selects them (`true` recommended).
- Scope of the proposals: only the target fields that are empty on the item (recommended, the default of the documented job: less noise and smaller prompts), or every target field, sending its current value and proposing a value only when the web gives a different one.
- Provider and model: see the recommendation below. Ask for the name of the protected variable that holds the key.

Do not ask about the language of text values or about selection fields: the rules below fix them.

### Recommend a provider and model

- Default recommendation: `mistral` with `mistral-small-latest`, the provider and model of the documented web job, used there with the `web-search` tool.
- On request of another provider, choose a model that the provider serves with its web search (`knowledge/tasks/ai-prompt-execute.md`). The documentation's OpenAI web search example uses `gpt-5.6-terra`. Model names change often: tell the user to check the provider's models page, and keep the model in a setting of the job that is easy to change.
- Compare the providers with the "Web search per provider" table of the task reference: Mistral does not support `maxUses` or a domain restriction (`allowedDomains`, `blockedDomains`); OpenAI and Anthropic do. When the user wants to restrict the search to some sites, recommend OpenAI or Anthropic.
- "openapi" in a brief most likely means OpenAI: confirm it in the provider question rather than assume it.

### Apply the chosen identifier

- At each launch, read the field definitions for the effective table and level. Derive the tagged web identifiers and the enrichment targets separately. In a mode with an agreed exclusion, remove the resolved lookup field from the identifiers by its actual field key. For an API test this key comes from the launch selection. A native grid selection has no equivalent lookup key; an exclusion intended for the grid needs an agreed field or selector that can be resolved there. Newly tagged identifiers participate on the next run.
- Build the provider input from the effective fields for each item. Keep an excluded lookup value local, including when composing product context, search queries and evidence checks. Keep the lookup value and platform item ID available for matching results. If no usable web identifier remains, skip the provider call and record why.
- When no field matches, report the missing configuration before issuing searches. When several fields match and their roles or combination are ambiguous, ask how to resolve them if known during design; otherwise surface the ambiguity at runtime without choosing one silently.
- Read each item's value from the chosen field and use that business value explicitly in the search or prompt, with the values of the context fields and their titles. Context values help the model check that it found the right product; they do not silently replace the chosen identifier. Keep platform item IDs for targeting the resulting suggestion or update.
- If the chosen value is absent or unusable for an item, do not issue a substitute search. Report that item according to the agreed failure policy; resolve the policy when it affects the required outcome.
- Document the selected criterion and missing or ambiguous identifier handling in the job README implementation notes.

The row filter, web search fields and fields to enrich serve three separate purposes. Include the search fields in the item lookup even when they do not carry the enrichment metadata. For two test EANs, one useful local case has two products with different manufacturer references: verify that each search uses its own reference and each suggestion targets the corresponding item.

### Build the prompt from the target fields

- For each target field, put its key, type, title and description in the prompt, plus its allowed options (keys and titles) for a selection field and its unit and precision for a number field. The title and description tell the model what the value must contain: read them from the field definitions at run time, never hard-code them in the prompt.
- Language: a text field holds one value. When the value must be written in a given language, the field's title or description says so, and the prompt passes it on. Do not derive a language from the field key (a `_FR` or `_EN` suffix), do not ask the user for a default language, and do not translate a value the description does not ask to translate.
- Selection fields only receive an existing option: ask the model for an option key from the supplied list, and drop any other answer in the parser. This is a rule of the job, not a choice for the user.
- Image and attachment fields are normal targets: `data-suggestion-create` takes them as `{"data": {"url": "https://..."}}` and downloads the file (`knowledge/tasks/data-suggestion-create.md`). Ask the model for the direct URL of the file, not of the page that shows it, with the page as its source. In the parser, reject an address with a page extension (`.html`, `.php`) and, for an image, an extension other than JPEG, PNG, WebP or GIF; an address without a visible extension is left to the platform check. Put these fields in a suggestion operation of their own, as the task page advises, so a dead address costs only those fields. Do not exclude them by default.
- Ask for a supporting fact and URL with each value, including the source unit and measurement basis when relevant. For example, a value per 100 cycles cannot populate an annual-consumption field without a documented annual basis.
- Ask the model to compare the source product with all chosen identifiers. Record conflicting identifiers and abstain until the conflict is resolved. A conflicting identifier supplied for web research can distinguish two variants with the same model name. Missing evidence does not authorize a substitute identifier.
- Omit unsupported facts, including a manufacturing origin inferred only from the brand's nationality. Keep unknown values distinct from zero, false and an empty string.

### Check the answer

- Read the AI task reference for the selected provider's response format and source behavior. Whether `responseFormat` combines with `tools` is not documented: for web research, ask for JSON in the prompt and parse the text.
- An empty `sources` list does not prove that no search occurred. Observed on a stage run (2026-11-24, `openai` with web search): the model wrote its URLs in the JSON values and `sources` came back empty for every item. Ask the model to cite its pages with its citation mechanism in a separate text property of the answer (`citations`), and keep markers out of the values. Keep the usage of the call (`usage.toolUse`) for the report, to show whether a search ran.
- When `sources` holds pages, keep a value only when its supporting URL is one of them. When `sources` is empty, do not reject every value: keep it, mark its source as "not confirmed" in the suggestion review material and the report, and count these values in the summary. The reviewer checks them first.
- Parse the answer, validate documented value shapes and allowed options, and match each supporting URL against the returned native sources when there are some. Validate calendar dates as described in `asset-guidelines.md`. Preserve the supporting facts and any unresolved contradictions in the result intended for review.
- Check the evidence against the target meaning where the available inputs allow it. Reject inconsistent units or measurement bases. A prompt instruction or a source URL alone does not prove a value correct; state remaining verification limits in the README and report. Additional AI calls are a design option, not a default requirement or a proof of accuracy.

### Show the selection decision in the execution report

Record the launch mode and the field keys tagged for identification and enrichment separately. For each item, report the key and value of each identifier actually sent in the provider request (an empty list if the call was skipped). Associate the outcome with its platform item ID and any local lookup reference. Use the suggestion IDs returned by the platform, or give the specific abstention reason. If submission failed or the response omitted an ID, record that outcome explicitly.

### Keep the provider key in its connection input

Bind the protected variable directly to the declared AI task's `apiKey`. A JavaScript task that builds prompts does not need the credential. If a dynamic batch would require copying the secret into that script or its returned task list, use a bounded loop with the declared AI task instead. A literal reference string produced by JavaScript is not a documented way to defer secret resolution. This exception leaves batch processing appropriate for independent work with a documented credential path, and for reads that require no provider key.

## Business intelligence and analytical reports

Applies when a job produces statistics, charts or an AI-assisted analysis of business data, including a PDF report on suggestions. Read [bi-report-guidelines.md](bi-report-guidelines.md) for aggregation, chart semantics and static report design. These choices apply to the report, not to unrelated jobs.

### Resolve the report's meaning

Reuse the brief and prior answers. Ask only for missing choices that change the result:

- Population and filters: selected items or another scope, included statuses, date window and reporting timezone. Distinguish a current snapshot from a historical activity report.
- Grouping: the category source and whether to use direct assignments or include ancestors. For requested direct assignments, retain that scope and disclose overlaps when an item has several assignments.
- Requested measures and comparisons: totals, creation-date distribution, ranking or other business questions. Resolve the ranking dimension from the brief: accounts, people or source labels. Use its documented stable identifier even when a name is missing, and label the ranking according to the available identity evidence.
- AI contribution, if requested: synthesis and review suggestions grounded in the retrieved records. Exact counts and rankings remain deterministic.
- Output and delivery, including the expected no-data outcome. Keep the user's chosen format and failure policy; a reporting request does not by itself require an email, an AI call or an empty PDF.

### Build from a shared evidence model

Retrieve the requested population using the selected task's documented scope and volume limits. Do not introduce a retrieval limit merely to shorten the report. Disclose intentional sampling; an incomplete retrieval must not appear as a complete population.

Compute the aggregates and evidence references once, then use them for the charts, exact tables and AI input. Include references for scope and methodology alongside record and aggregate references. Preserve deterministic statistics separately from AI prose. Use the guideline's dimension, identity and reconciliation rules when designing a ranking. For example, when the brief asks to rank accounts using `fromAccountId`, group by that ID. Use supplied names or read `knowledge/tasks/data-account-find.md` for a documented name lookup. In charts and tables, label each named account as `Account name (ID)`, even when its name is unique; fall back to the ID alone when no name is available. `emitterName` is optional context; only records without an account ID enter the unknown-account group. This grouping does not attest a human author or an emitting account.

For an open-suggestions report, read `knowledge/tasks/data-suggestion-find.md`: `isAcknowledged=false` is the documented pending filter. State that filter beside the report's chosen "open" label. A creation-date chart of this current cohort does not measure all suggestions created or resolved over time.

For PDF output, read `knowledge/tasks/file-generation-pdf.md` before choosing the HTML and asset arrangement. Include the aggregation rules, identity limitations and rendering checks in the job README implementation notes. Keep unverified rendering behavior explicit.

## Table creation, cloning and structure updates

Applies when a job imports a table definition from a supplied file, clones a table or updates its structure. Read `knowledge/tasks/table-import-schema.md` and the references of any transformation actually needed.

### Inspect the supplied format and resolve the target

Inspect the document before choosing a conversion. A file already shaped as the documented `Table/Schema` input can feed `table-import-schema` directly. An XML file is not, by itself, a reason to add XSLT. Use XSLT when the requested mapping or runtime transformation needs it.

Reuse the target table and update scope stated in the brief or earlier answers. If the source key could refer to an existing table with a different structure, resolve whether the user wants that table updated or a separate table created. Do not choose another target silently. For a bundled static asset and a fixed, approved target key, a local copy with only `Table/@key` changed can avoid a runtime transformation. Preserve the original source, verify the change is limited to that key, and document the prepared asset. A runtime-selected key needs a runtime design.

### Preserve the requested structure

For a full copy, keep all supplied definitions and relationships, including levels, partitions, identifiers, classifications, options, matrix, formulas, conditional rules, sections and screens. Do not rebuild only the fields. If a transformation is needed, prefer copying the structure and overriding the requested parts. For a targeted update, include the requested scope and its dependencies rather than unrelated structure.

Choose `INCREMENTAL` or `EXHAUSTIVE` from the intended treatment of definitions absent from the input. Supplied screen blocks replace their sections and columns even in `INCREMENTAL` mode; keep those blocks complete. See the task reference for replacement rules such as composite definitions. The number of matrix links and screen columns matters as well as the file size. A small compressed package can describe a large structure, and an unchanged full screen import still incurs replacement work. Explain that cost when it affects the intended use; do not invent a job timeout property.

### Separate source defects from job defects

When source files are available, inspect the keys and cross-references relevant to the proposed import before designing it. A well-formed document does not prove that all references exist or that the whole structure will be accepted. Preserve and report inconsistent source references; do not silently remove rules or manufacture missing definitions. Apply the semantics of the reference being checked: a literal condition value and an option selected by an action do not have the same validation needs.

Use local diagnostics appropriate to the change to compare the prepared document with the source. Compare keys, values, relationships and positions, allowing serialization differences. Remove development-only XSD tasks from the final job, as described in `asset-guidelines.md`. These design checks do not require a platform execution.

### Make examples repeatable and expose the real outcome

When the brief asks for example items, use stable identifiers and the source's existing partitions, categories and options. Mark values as fictitious. Reuse the same identifiers for a repeatable import, and describe any business conformity rules the example deliberately leaves unsatisfied.

Expose the reports provided by the schema and item import tasks. A completed import can contain ignored definitions or rejected values; explain this in the task notes. If the brief requires complete acceptance, design the rejection handling for that outcome. For XSLT, use `allFilesTransformed` where the required failure policy needs it; that task has no `report` output.
