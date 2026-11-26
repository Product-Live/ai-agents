# Product-Live AI agents & skills

[Version française](README.fr.md)

Product-Live agents and skills are in public beta. We continue to add features and publish fixes.

Use these skills in your coding assistant to work with Data Factory jobs.

| Skill | When to use it |
| -- | -- |
| `pl-explain` | Ask a question about Data Factory. The skill can consult the public documentation online. |
| `pl-job-build` | Create or edit local job files, validate them, run local task tests and build a `.job.zip`. |
| `pl-job-audit` | Review an existing job against your requirements and get findings in priority order. |
| `pl-job-run` | Create or update a job on your account, launch it with your inputs, inspect an execution or download its output files. |
| `pl-update` | Check your installed version, update or uninstall the skills. |

Version 1.1.0. Release notes: [CHANGELOG.md](CHANGELOG.md).

## Requirements

- Node.js 18 or later.
- macOS and Linux: `curl` and `tar`. Windows: PowerShell 5.1 or later.

## Install

Copy the command of your assistant: the Claude Code commands go in Claude Code, the other commands in a terminal. Then start a new session of your assistant.

### Claude Code

```text
/plugin marketplace add Product-Live/ai-agents
/plugin install product-live@product-live
```

### Gemini CLI

```bash
gemini extensions install https://github.com/Product-Live/ai-agents
```

### OpenAI Codex

macOS, Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --codex
```

Windows (PowerShell):

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -Codex
```

### Mistral Vibe

macOS, Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --vibe
```

Windows (PowerShell):

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -Vibe
```

### Antigravity CLI

macOS, Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --gemini
```

Windows (PowerShell):

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -Gemini
```

To install in one project only, run the command from the root of the project and add `--local` (macOS, Linux) or `-Local` (Windows) at the end.

## Examples of requests

- "What does the table-import-items task expect as input?"
- "Create a job that imports a CSV file from an SFTP server into the PRODUCTS table every night."
- "Review the job in ./export-products and tell me why the validator fails."
- "Use pl-job-run to inspect execution 123. Download the spreadsheet and check which products it contains."

## From a local build to a platform run

"Create a Product-Live job" prepares the files in your workspace. If you also ask to create, update or run it on Product-Live, `pl-job-build` passes the saved folder and your requested action to `pl-job-run` after validation and packaging succeed. For a job already on the platform, use `pl-job-run` directly with the job or execution ID.

Sign in and select your account in the Product-Live VS Code extension. Your main assistant runs `pl-job-run` directly and checks the saved job through the extension before sending it. Before creation it shows the account, environment, project, pipeline, title and key. It asks you to choose if several projects or pipelines are eligible.

By default, you confirm job creations, updates and runs. In VS Code Settings, `productlive.testsMcp.allowCreateAndUpdateWithoutConfirmation` controls confirmation for creation and updates. The creation preview still appears. `productlive.testsMcp.allowRunWithoutConfirmation` controls confirmation for runs.

If the result is wrong, ask for a fix and another run. `pl-job-run` passes the execution ID and observed output to `pl-job-build`. After the local fix is checked and packaged, `pl-job-run` updates the same platform job and runs it again.

## Customize

By default, jobs are written in English and follow the job design guidelines shipped with the skills. To change these defaults, add your rules to the instruction file of your assistant (for example `CLAUDE.md`, `AGENTS.md` or `GEMINI.md`):

```markdown
## Data Factory jobs

- Jobs use French as the main language: titles, descriptions, README and messages in French, English as titleLocal.eng.
- Shape JSON with jq; use JavaScript only for what jq cannot do, such as dates.
- Job keys start with the team prefix "catalog-".
```

Never write passwords, tokens or API keys in an instruction file.

For a job with stylesheet logic, `pl-xslt-expert` writes or reviews the XSLT and diagnoses unexpected output. For example, ask it to find why a join loses rows or to update a mapping while preserving the other fields. The assistant runs XSLT checks exclusively through the Product-Live VS Code extension's MCP.

## Job audits

Ask `pl-job-audit` to audit a job folder or a `.job.zip`. Give it the expected outcome when available. It reports how the job meets the brief, handles data and account changes, protects secrets, supports maintenance and was tested. Findings name the affected task, the impact and a suggested improvement. Missing evidence is marked as unverified.

`pl-job-build` calls the same read-only agent, `pl-job-auditor`, after validation and local testing and before packaging. The build addresses confirmed defects within scope and includes the final audit in its report.

## Local task tests

Add a compatible [Product-Live extension for VS Code](https://marketplace.visualstudio.com/items?itemName=Product-Live.product-live) for the Jobs and Testing views. Connecting it through MCP lets `pl-job-build` author and run local tests during job creation and updates.

1. Open the job workspace in VS Code, trust it and enable the Product-Live Jobs view. Reload the window if prompted.
2. Run **Product-Live: Copy Tests MCP Configuration**. The command starts the server if needed.
3. Add the `product-live-vscode` URL and authorization header to your assistant's MCP settings. Keep VS Code open and keep the credential out of job files, chat and version control.

`pl-job-architect` prepares the job and checks it with the static validator and linter. Once the MCP responds for the job workspace, `pl-job-local-tester` writes and runs suites for supported tasks such as JavaScript, XSLT and XSD validation. It uses synthetic fixtures, fixes failures and verifies a full run on the final files before packaging. In Vibe, the calling assistant relays MCP calls for the tester. If the connection is unavailable, the skill points out what is missing and reports which tests could not run. Local task results cover only the tested code and fixtures.

You can ask the assistant to list the tables in the account selected in VS Code, find a table's fields or partitions, or show the columns in a section of a screen. For example, ask "Which field holds the EAN in my products table?" The assistant uses the extension to look up the available fields and asks you to choose if the schema leaves more than one match.

When a job needs an account variable, `pl-job-build` helps you choose an existing key or marks a new key as "to create" in its report. Before publishing, `pl-job-run` checks which keys are still missing and asks for confirmation to create them. Enter secret values in VS Code.

## Update

- Claude Code: in a terminal, `claude plugin update product-live@product-live`, then start a new session. To update automatically: `/plugin`, tab Marketplaces, `product-live`, Enable auto-update.
- Gemini CLI: `gemini extensions update product-live`.
- Codex, Vibe, Antigravity CLI: run the install command again, or ask your assistant "update the Product-Live skills".

When you use `pl-job-build` or `pl-job-run`, the assistant checks for a newer version once per conversation. If one is available, it shows the update command and continues your task. To check your installed version directly, ask `pl-update`.

## Uninstall

- Claude Code: `/plugin uninstall product-live@product-live`.
- Gemini CLI: `gemini extensions uninstall product-live`.
- Codex, Vibe, Antigravity CLI: the command below removes the Product-Live skills from every assistant where the installer put them, and nothing else. For an install in one project, run it from the project root and add `--local` (`-Local` on Windows).

macOS, Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --all --uninstall
```

Windows (PowerShell):

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -All -Uninstall
```

## License

MIT, see [LICENSE](LICENSE).
