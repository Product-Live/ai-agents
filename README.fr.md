# Skills Data Factory de Product-Live

[English version](README.md)

Des skills et un agent qui aident les utilisateurs de Product-Live à concevoir des jobs Data Factory depuis leur assistant de code IA. Ils répondent aux questions sur Data Factory à partir de la documentation publique (`pl-explain`), créent, revoient, valident et empaquettent des jobs (`pl-job-build`, agent `pl-job-architect`), et mettent à jour une installation (`pl-update`).
Ils fonctionnent avec leurs propres fichiers et Node.js 18 ou plus ; `pl-explain` peut aussi lire la documentation publique en ligne. Ils n'appellent pas la plateforme Product-Live et n'exécutent pas de job : vous importez vous-même le `.job.zip` généré.
Version 1.0.2. Notes de version : [CHANGELOG.md](CHANGELOG.md).

## Prérequis

- Node.js 18 ou plus.
- macOS et Linux : `curl` et `tar`. Windows : PowerShell 5.1 ou plus.

## Installation

Copiez la commande de votre assistant : les commandes Claude Code se tapent dans Claude Code, les autres dans un terminal. Ouvrez ensuite une nouvelle session de votre assistant.

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

macOS, Linux :

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --codex
```

Windows (PowerShell) :

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -Codex
```

### Mistral Vibe

macOS, Linux :

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --vibe
```

Windows (PowerShell) :

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -Vibe
```

### Antigravity CLI

macOS, Linux :

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --gemini
```

Windows (PowerShell) :

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -Gemini
```

Pour installer dans un seul projet, lancez la commande depuis la racine du projet et ajoutez `--local` (macOS, Linux) ou `-Local` (Windows) à la fin.

## Exemples de demandes

- "Qu'attend la tâche table-import-items en entrée ?"
- "Crée un job qui importe chaque nuit un fichier CSV depuis un serveur SFTP dans la table PRODUCTS."
- "Revois le job de ./export-products et dis-moi pourquoi le validateur échoue."

## Personnalisation

Par défaut, les jobs sont rédigés en anglais et suivent les règles de conception livrées avec les skills. Pour changer ces comportements, ajoutez vos règles au fichier d'instructions de votre assistant (par exemple `CLAUDE.md`, `AGENTS.md` ou `GEMINI.md`) :

```markdown
## Jobs Data Factory

- Les jobs utilisent le français comme langue principale : titres, descriptions, README et messages en français, l'anglais dans titleLocal.eng.
- Transforme le JSON avec jq ; n'utilise JavaScript que pour ce que jq ne sait pas faire, comme les dates.
- Les clés de job commencent par le préfixe d'équipe "catalog-".
```

N'écrivez jamais de mot de passe, de jeton ni de clé d'API dans un fichier d'instructions.

## Mise à jour

- Claude Code : dans un terminal, `claude plugin update product-live@product-live`, puis une nouvelle session. Pour la mise à jour automatique : `/plugin`, onglet Marketplaces, `product-live`, Enable auto-update.
- Gemini CLI : `gemini extensions update product-live`.
- Codex, Vibe, Antigravity CLI : relancez la commande d'installation, ou demandez à votre assistant "mets à jour les skills Product-Live".

Pour connaître votre version, demandez à votre assistant "quelle version des skills Product-Live ai-je ?".

## Désinstallation

- Claude Code : `/plugin uninstall product-live@product-live`.
- Gemini CLI : `gemini extensions uninstall product-live`.
- Codex, Vibe, Antigravity CLI : la commande ci-dessous retire les skills Product-Live de tous les assistants où l'installateur les a posés, et rien d'autre. Pour une installation dans un seul projet, lancez-la depuis la racine du projet et ajoutez `--local` (`-Local` sous Windows).

macOS, Linux :

```bash
curl -fsSL https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.sh | bash -s -- --all --uninstall
```

Windows (PowerShell) :

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Product-Live/ai-agents/main/install.ps1))) -All -Uninstall
```

## Licence

MIT, voir [LICENSE](LICENSE).
