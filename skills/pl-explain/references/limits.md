# Limits

> Reference token: DF-LIMITS-01

Every number that constrains a job: platform limits (tasks, inputs, variables, payloads), per-task limits by task family, the task durations that task pages publish and public API rate limits.
A figure appears only when a public documentation page states it; elsewhere the row says that the value is not documented. Recommendations name their source, or say that they are a convention of these skills.
When two documents disagree, both values are given and the safer one is recommended.

## 1. Platform and job-level limits

| Limit | Value | Recommendation |
| -- | -- | -- |
| Tasks within a job | no hard limit documented | convention of these skills: 20 at most; split larger flows and chain jobs |
| Job timeout configuration | no `timeoutSeconds` property in the job package | use only timeout inputs documented by the task |
| User input file (`FILE`) | 2 GB per file; upload window 1 minute | use FTP or HTTP sources for large files |
| Task input payload | not documented (a September 2026 release note says that `data-item-find` now logs a readable message when a payload limit is exceeded, without giving the value) | pass files between tasks; never inline item lists or large documents |
| Local variable (`SET_VARIABLE`) | 256 KB per variable | keep references, not data |
| Global variable | single string value; key `^[a-z0-9_]{1,50}$`; a single template cannot combine several variables | |
| Periodicity | minimum 15 minutes between executions; 3 rules per job; UTC (periodic jobs reference; the periodicity tutorial also mentions a time zone setting) | not below every 30 minutes (scalability tutorial) |
| Pipeline | one running job per pipeline, FIFO | ask for a second pipeline when scheduled and interactive jobs compete |
| Report | size not documented | use `logLevel` and `skipReportGeneration` to keep reports readable |
| Lookups | 1000 keys per lookup and 1000 distinct keys per `taskName` across the request | |
| Data task INLINE output | 1000 elements maximum, otherwise the task ends in error | `outputMode: ATTACHMENT` for item lists; `limit` for small lookups |
| Data task `pageSize` | default 200, maximum 1000 (values above are clamped) | |
| Decision | 10 conditions | prefer `SWITCH` |
| Switch | tasks inside branches are not visible in execution details | expose results through `outputParameters` |
| Batch (`task-batch-execute`) | concurrency 1 to 5; 7200 seconds per batch and per slot; `table-import-schema` and `table-refresh-items` excluded | |
| AI task (`ai-prompt-execute`) | 600 seconds per task including attachment uploads; 150 seconds without a response per provider call; the generating call is retried up to twice on HTTP 408, 429, 500, 502, 503, 504 and 529; provider rate limits apply | in a batch, size each slot at roughly `total / concurrency` sequential executions plus orchestration overhead, well within 7200 seconds (`task-batch-execute` page) |
| Suggestion creation | 100 suggestions per minute | |

## 2. Data model limits (tables and items)

| Limit | Value |
| -- | -- |
| Levels per table | 5 |
| Identifiers per table | 5 (`index` 1 to 5, immutable) |
| Identifier value length | 50 characters; compared without case, accents and trailing spaces; unique across partitions |
| Classifications per table | 5; category tree depth 5 |
| Conditional formatting fields per table | 8 per the limits page, 5 per the task page body; 10 statuses per field |
| Fields per table | 500 000 |
| Sections per table | 50 000 |
| Options per select field | 30 000 (best practice 500) |
| Rules per formula field | 2 000; 5 000 values per condition |
| Composite depth | 5; up to 100 child fields; 100 child column fields in a screen |
| Items per partition | best practice: "Limit your partitions to 150 000 items" (glossary), 100 000 on the schema page; plan for 100 000 |
| Items per export | 200 000 (`table-export-items`); the import pages publish no item count, only the file and item sizes |
| Item size | 500 KB (public import limits page) |
| Filter values in the app | 150 values per filter when filtering products in the grid (2025 release notes); no value count is published for task filters |
| Image | 20 MB; 50 megapixels on the `data-suggestion-create` page, 36 megapixels on the `table-import-items` page (plan for 36); formats JPEG, PNG, GIF, WebP |
| Attachment | 2 GB (import page) |
| Publication / collect | 10 000 items and 3 screens at a time |

## 3. Per-task limits (public limits pages)

### 3.1 Table tasks

| Task | Limits |
| -- | -- |
| `table-import-items` | input file 2 GB; each item 500 KB; "never send empty data and use differential import" |
| `table-import-schema` | input file 900 MB; 50 000 sections; 500 000 fields; 5 identifiers; 8 conditional formatting fields; 5 000 values in a Rule-Condition or Formula condition; 5 classifications; 30 000 options per field (best practice 500); 2 000 rules per formula field; classification depth 5; composite depth 5; cannot run inside a batch |
| `table-export-items` | 200 000 items per export; only non-archived structure is exported |
| `table-export-schema` | output file 250 MB |
| `table-delete-items` | no limits page; the deletion is permanent, the `file` output holds the deleted items and `maximum` caps how many are deleted |

### 3.2 File tasks

| Task | Limits |
| -- | -- |
| `file-conversion-csv-to-xml` | input file 250 MB; UTF-8 only |
| `file-conversion-json-to-xml` | input file 100 MB; UTF-8 only |
| `file-conversion-xlsx-to-xml` | input file 250 MB |
| `file-conversion-unarchive` | input ZIP 1 GB (best practice 100 MB); all unarchived files 6 GB in total (best practice 500 MB); 15 000 files (best practice 200) |
| `file-generation-archive` | 2 GB per file added; recommended at most 500 files per archive; an empty archive is allowed and logged as `ARCHIVE_IS_EMPTY` (warning) |
| `file-generation-xlsx`, `file-generation-pdf`, `file-transformation-split-xml` | 50 files created per execution |
| `file-transformation-merge-xml` | 200 files maximum, otherwise the task ends in error |
| `file-transformation-xslt` | input file 500 MB; "never call the same xpath twice"; check http://www.xsltfunctions.com/ before writing a function |
| `file-validation-xsd` | input file 500 MB |

### 3.3 Protocol tasks

| Task | Limits |
| -- | -- |
| `protocol-ftp-get`, `protocol-ftp-list`, `protocol-ftp-move` | input file 250 MB; 100 files in the same folder; one folder per file type ("never have a folder and a file at the same level"); SFTP ciphers `aes256-cbc`, `aes192-cbc`, `aes128-cbc`, `aes128-gcm`, `aes256-gcm`, `blowfish-cbc`, `3des-cbc`, `cast128-cbc`, `arcfour`, `arcfour128`, `arcfour256` (another cipher fails the handshake, reported as a connection error) |
| `protocol-ftp-delete`, `protocol-ftp-post` | about 100 files; same cipher list |
| `protocol-rest-perform` (deprecated), `protocol-soap-perform` | 50 requests in a file |
| `protocol-http-perform` | no documented file limit; set `connectionTimeOutMilliseconds`; a 4xx or 5xx response is still a successful execution unless `assertions` with `failOnError: true` |

### 3.4 Notification, storage, exchange, rules

| Task | Limits |
| -- | -- |
| `notification-send-email` | per email: 10 attachments (recommended 1), 10 MB total (1 MB), 100 recipients to + cc + bcc (10); 50 emails per task execution; when a limit is exceeded the email is ignored and a log entry is added |
| `notification-display-message` | HTML only: no reference to the assets folder, no public URLs, no JavaScript, no images, headings from `h3` (see `scripting.md`) |
| `azure-storage-blob-put` | 1 000 files; 2 GB per file; 20 GB in total |
| `azure-storage-blob-list` | no limit on the number of blobs; a very large container ends in a timeout rather than a truncated list |
| `data-comment-thread-create` | plain text only (no mentions, no markdown) |
| `exchange-send-items`, `exchange-receive-items` | 10 000 items at a time; up to 3 screens |
| `rules-engine-*` | per mapping: 20 000 fields with rules; 1 000 rules per field; 500 source tables; 20 000 rules per table |

### 3.5 Script tasks

| Context | Limit |
| -- | -- |
| `code-execute-javascript` | 10 minutes for the whole task (`TIMED_OUT` beyond); no network, no modules, `eval()` forbidden; the task page recommends `expressionFile` over an inline `expression` for complex scripts |
| `SWITCH` javascript expression, `loopCondition` | no duration is documented; keep them to a comparison or a ternary and write ES5 syntax (repository recommendations) |
| `json-transform-jq` | time limit not documented. Date functions and global variables as inputs are unsupported. |

## 4. Documented task durations

Three task pages publish a fixed duration, and two publish a configurable wait budget. Each applies to the task itself; it does not define a job package timeout.

| Task | Documented duration |
| -- | -- |
| `code-execute-javascript` | 10 minutes for the whole task; beyond that the task ends in `TIMED_OUT` and its outputs are not available |
| `ai-prompt-execute` | 600 seconds per task, covering prompt files, attachment uploads, the call with its retries and the output file |
| `task-batch-execute` | 7200 seconds (2 hours) for the whole batch and for each parallel slot |
| `data-job-execution-await`, `data-job-execution-create` (`wait: true`) | wait budget `timeoutSeconds` (`waitOptions.timeoutSeconds` on the create task): default 3600, maximum 86400, at most 720 polls (`timeoutSeconds / pollingIntervalSeconds`); the task fails when it is exceeded |

No other task page states a duration, yet a task can still end in `TIMED_OUT` on its own: the `azure-storage-blob-list` page says that a very large container "is bounded by the task execution time". Split long work into smaller runs and keep files small. Configure a timeout only when the task documents such an input.

## 5. Public API rate limits

| Endpoint family | Limit |
| -- | -- |
| Public API (`https://api.product-live.com/v1/...`, header `X-Api-Key`) | 100 requests per minute; HTTP 429 with code `RATE_LIMIT` when exceeded |
| `POST /v1/data_factory/files` (upload an input file) | 100 MB per file; 100 requests per minute; files deleted after 90 days unless used by a job |
| Suggestion creation | 100 suggestions per minute |

The `task-batch-execute` page says that "any rate limit of the executed task still applies to each entry (for example the Product-Live public API limits)" and that raising `concurrency` does not raise those limits; how the `data-*` tasks count their own calls is not documented. Recommendation: keep batches of such tasks moderate (`concurrency` and `pageSize` are the knobs).

## 6. Sizing rules of thumb

- "100k Items with 150 properties is usually a 100 MB file."
- An AI batch: each slot runs roughly `total / concurrency` sequential executions plus per-entry orchestration overhead and must fit within 7200 seconds (`task-batch-execute` page); measure a representative first run (`responseTimeMs` and the batch summary) before sizing the full run (recommendation).
- Jobs slow down with data volume, large media, peak hours and complex rules; large ZIP image exports can time out: use smaller selections.
- Recommendation (convention of these skills): keep intermediate data in files and inline JSON in `inputParameters` small.

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| Inlining an item list in a `data` block | pass the file and load it with `resources` or `outputMode: ATTACHMENT` |
| `outputMode: INLINE` on a find task that returns more than 1000 elements | `ATTACHMENT`, or `limit` |
| `concurrency: 10` on a batch | 1 to 5 |
| A `WAIT` of several days on a shared pipeline | a scheduled second job, or a dedicated pipeline |
| Exporting 500 000 items in one `table-export-items` task | 200 000 items per export; split by partition or filter |
| 60 emails from one `notification-send-email` | 50 per execution; split or batch |
