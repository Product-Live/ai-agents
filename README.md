# Product-Live Data Factory skills

[Version française](README.fr.md)

Skills and an agent that help Product-Live users design Data Factory jobs from their AI coding assistant. They answer questions about Data Factory from the public documentation (`pl-explain`), create, review, validate and package jobs (`pl-job-build`, agent `pl-job-architect`), and update an installation (`pl-update`).
They run with their own files and Node.js 18 or later; `pl-explain` may also read the public documentation online. They do not call the Product-Live platform or run a job: you import the generated `.job.zip` yourself.
Version 1.0.2. Release notes: [CHANGELOG.md](CHANGELOG.md).

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

## Customize

By default, jobs are written in English and follow the job design guidelines shipped with the skills. To change these defaults, add your rules to the instruction file of your assistant (for example `CLAUDE.md`, `AGENTS.md` or `GEMINI.md`):

```markdown
## Data Factory jobs

- Jobs use French as the main language: titles, descriptions, README and messages in French, English as titleLocal.eng.
- Shape JSON with jq; use JavaScript only for what jq cannot do, such as dates.
- Job keys start with the team prefix "catalog-".
```

Never write passwords, tokens or API keys in an instruction file.

## Update

- Claude Code: in a terminal, `claude plugin update product-live@product-live`, then start a new session. To update automatically: `/plugin`, tab Marketplaces, `product-live`, Enable auto-update.
- Gemini CLI: `gemini extensions update product-live`.
- Codex, Vibe, Antigravity CLI: run the install command again, or ask your assistant "update the Product-Live skills".

To know which version you have, ask your assistant "which version of the Product-Live skills do I have?".

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
