# Final report format

Produce this report at the end of every create, modify or review task, in the user's language. Result first, tables over prose, no narration of the process. Replace every `<...>` placeholder; delete a section only when it is empty and say "none".

The template below describes a completed create or modify task. For review, use the adaptations in Rules below. If validation or packaging is incomplete, state the actual result and remaining work; do not use the success status or list a package that was not produced.

```markdown
## <Job title> (`<job-key>`)

Status: validated and packaged, not executed. Mode: <create | modify>.
Package: `./<job-key>/` and `./<job-key>.job.zip` (<N> errors, <M> warnings explained below).

### What the job does

<Two or three sentences: trigger, sources, outputs.>

### Tasks

| # | Reference name | Catalog task | Status | Purpose | Reads | Exposes |
| -- | -- | -- | -- | -- | -- | -- |
| 1 | `ftp_get` | `protocol-ftp-get` | GA | Fetch the oldest waiting CSV | variables `ftp_*` | `file`, `noFile` |
| 2 | `check_no_file` | SWITCH | GA | Stop in success when no file | `${ftp_get.output.noFile}` | - |
| 2a | `terminate_no_file` | TERMINATE | GA | Case `YES`: end with a message | - | `message` |
| 3 | `build_items` | `code-execute-javascript` | alpha | Parse the CSV and write the items document | `${ftp_get.output.file}` | `result` (file) |

### User inputs

| Key | Type | Required | Default | Purpose |
| -- | -- | -- | -- | -- |
| `language` | SELECT | yes | `eng` | Language of the labels |

(none when the job has no user input)

### Variables to create (Settings > Data Factory > Variables)

| Key | Secret | Description |
| -- | -- | -- |
| `ftp_host` | no | Host name of the SFTP server |
| `ftp_password` | yes | Password of the SFTP user |

### Outputs

| Key | Source | Type | Shown to the user as |
| -- | -- | -- | -- |
| `report` | `${import_items.output.report}` | FILE | downloadable import report |

### Validator warnings

| Warning | Why it is acceptable, or what you must decide |
| -- | -- |
| <message> | <explanation> |

### Assumptions

- <One line per accepted default or non-blocking assumption, with its source and the alternative.>

### Instructions and guidelines

| Source | Status | Rules that shaped the job |
| -- | -- | -- |
| Project instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md` at the project root) | applied / not found / no rule about jobs | <one line per rule applied> |
| User instruction files (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.gemini/GEMINI.md`, `~/.vibe/AGENTS.md`) | applied / not found / no rule about jobs | <one line per rule applied> |

- Not applied: <the instruction, its file, and the rule that wins: documented job format, secrets rules, or never claiming an execution>, or "none".
- Departures from the job design guidelines: <the XML task or XSLT asset, and its reason: XML-only task, volume, XML source or target imposed by the brief, instruction>, or "none".

### Documentation conflicts

- <"The documentation shows both X and Y; prefer X" with the choice made.>

### Reference tokens read

- Reference token: DF-<...>-01
- Reference token: DF-<...>-01

### Next steps

1. Import `<job-key>.job.zip` with the VS Code extension or in Settings (Data Factory > Jobs > Add job, drag the zip), in a project of your choice.
2. Create the variables above (mark the secret ones as protected) before the first run.
3. Configure in Settings: pipeline <recommended pipeline>, visibility <hidden | visible on tables ...>, periodicity <cron in UTC or "none">, status Draft until tested.
4. Test on a small selection or a small file, read the execution report, then switch the status to Production.
```

Rules:

- Every task in `job.json` appears in the Tasks table with the status written exactly as in `references/knowledge/tasks/index.md` (`GA`, `alpha`, `deprecated`).
- Tasks nested in a SWITCH case or a loop are listed right after their parent with a letter suffix: `2a`, `2b` for the tasks of the parent's cases in order (start the Purpose with the case key, for example "Case `NO`:"), `2a1` for a deeper level. Top-level numbering continues at `3` after the nested rows.
- Every `${workflow.globalVariables.<key>}` in `job.json` appears in the Variables table; the secret flag is `yes` for passwords, tokens, API keys and private keys.
- Every `${workflow.input.<key>}` appears in the User inputs table, or in Assumptions as "supplied by the calling job", except `${workflow.input.context.*}`, the launch context provided by the platform, which the Assumptions name as such (for example "reads the launch context: table, partition and screen of the grid").
- Questions that need an answer belong in the "Needs input" handoff (SKILL.md, Interaction rules), before design, not in a completion report. The Assumptions section records accepted defaults and non-blocking assumptions.
- The Instructions and guidelines section names every instruction file looked for (applied, or "not found"), lists every instruction not applied with the rule that wins, and every XML task or XSLT asset used where `references/job-guidelines.md` prefers the JSON route, with its reason. Review mode keeps the section: it reports the instructions applied to the review and the departures found.
- The Reference tokens section lists the `Reference token:` line of every file read under `references/knowledge/`, including one per task file, and the one of `references/job-guidelines.md`.
- Review mode uses "Status: reviewed, not modified, not packaged, not executed. Mode: review." State the actual validator error and warning counts. Replace "Package" with "Findings": a table (severity, location, finding, fix) ordered by severity, followed by the Mermaid flow diagram. Next steps lists proposed corrections and unresolved questions, not instructions to import a newly generated package. End with "Fixes applied: none". If applying fixes was requested, follow modify mode and list the changes instead.
- Modify mode adds a "Changes" list (what changed, why) and the new CHANGELOG version.
- Never write "the job ran", "imported", "works on the platform": the skill has no access to the platform.
