# Agents & Skills Product-Live

[English version](README.md)

Les agents et skills Product-Live sont en bêta publique. Nous continuons de les enrichir et de publier des correctifs au fil des versions.

Utilisez ces skills dans votre assistant de code pour travailler sur vos jobs Data Factory.

| Skill | Quand l'utiliser |
| -- | -- |
| `pl-explain` | Poser une question sur Data Factory. Le skill peut consulter la documentation publique en ligne. |
| `pl-job-build` | Créer ou modifier les fichiers du job, les valider, lancer les tests locaux des tâches et produire un `.job.zip`. |
| `pl-job-audit` | Vérifier un job existant par rapport à vos exigences et obtenir la liste des écarts par ordre de priorité. |
| `pl-job-run` | Créer ou mettre à jour un job sur votre compte, le lancer avec vos paramètres, examiner une exécution ou télécharger ses fichiers de sortie. |
| `pl-update` | Vérifier la version installée, mettre à jour ou désinstaller les skills. |

Version 1.1.0. Notes de version : [CHANGELOG.md](CHANGELOG.md).

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
- "Utilise pl-job-run pour examiner l'exécution 123. Télécharge le tableur et vérifie quels produits il contient."

## De la préparation locale à l'exécution sur la plateforme

"Crée un job Product-Live" prépare les fichiers dans votre espace de travail. Si vous demandez aussi de créer, de mettre à jour ou de lancer le job sur Product-Live, `pl-job-build` transmet le dossier et votre demande à `pl-job-run` une fois la validation et l'empaquetage réussis. Pour un job déjà publié, utilisez directement `pl-job-run` avec l'identifiant du job ou de l'exécution.

Connectez-vous et sélectionnez votre compte dans l'extension Product-Live pour VS Code. Votre assistant principal utilise directement `pl-job-run` et vérifie le job enregistré via l'extension avant de l'envoyer. Avant la création, il affiche le compte, l'environnement, le projet, le pipeline, le titre et la clé. Il vous demande de choisir si plusieurs projets ou pipelines sont disponibles.

Par défaut, vous confirmez chaque création, mise à jour ou lancement de job. Dans les paramètres de VS Code, `productlive.testsMcp.allowCreateAndUpdateWithoutConfirmation` règle la confirmation des créations et des mises à jour. L'aperçu reste affiché avant la création. `productlive.testsMcp.allowRunWithoutConfirmation` règle la confirmation des lancements.

Si le résultat est incorrect, demandez une correction et un nouvel essai. `pl-job-run` transmet l'identifiant de l'exécution et le résultat observé à `pl-job-build`. Une fois la correction vérifiée et le job empaqueté, `pl-job-run` met à jour le même job sur la plateforme et le relance.

## Personnalisation

Par défaut, les jobs sont rédigés en anglais et suivent les règles de conception livrées avec les skills. Pour changer ces comportements, ajoutez vos règles au fichier d'instructions de votre assistant (par exemple `CLAUDE.md`, `AGENTS.md` ou `GEMINI.md`) :

```markdown
## Jobs Data Factory

- Les jobs utilisent le français comme langue principale : titres, descriptions, README et messages en français, l'anglais dans titleLocal.eng.
- Transforme le JSON avec jq ; n'utilise JavaScript que pour ce que jq ne sait pas faire, comme les dates.
- Les clés de job commencent par le préfixe d'équipe "catalog-".
```

N'écrivez jamais de mot de passe, de jeton ni de clé d'API dans un fichier d'instructions.

Pour un job qui utilise une feuille XSLT, `pl-xslt-expert` écrit ou relit la transformation et analyse les résultats inattendus. Vous pouvez lui demander pourquoi une jointure perd des lignes ou comment modifier une correspondance en préservant les autres champs. L'assistant exécute les vérifications XSLT exclusivement via le MCP de l'extension VS Code Product-Live.

## Audit des jobs

Demandez à `pl-job-audit` d'auditer un dossier de job ou un `.job.zip`. Précisez le résultat attendu si vous le connaissez. Le bilan couvre le besoin métier, le traitement des données, les effets sur le compte, les secrets, la maintenance et les tests. Chaque écart indique la tâche concernée, son impact et une amélioration possible. Le bilan signale les points qui restent à vérifier.

`pl-job-build` appelle le même agent en lecture seule, `pl-job-auditor`, après la validation et les tests locaux, avant l'empaquetage. Le build corrige les défauts confirmés dans le périmètre demandé et inclut l'audit final dans son rapport.

## Tests locaux des tâches

Ajoutez une version compatible de [l'extension Product-Live pour VS Code](https://marketplace.visualstudio.com/items?itemName=Product-Live.product-live) pour accéder aux vues Jobs et Testing. La connexion MCP permet à `pl-job-build` d'écrire et d'exécuter des tests locaux lors de la création ou de la modification d'un job.

1. Ouvrez le workspace du job dans VS Code, marquez-le comme espace de confiance et activez la vue Jobs de Product-Live. Rechargez la fenêtre si VS Code le demande.
2. Lancez **Product-Live: Copy Tests MCP Configuration**. La commande démarre le serveur si nécessaire.
3. Ajoutez l'URL et l'en-tête d'autorisation de `product-live-vscode` aux paramètres MCP de votre assistant. Gardez VS Code ouvert et le jeton hors des fichiers du job, des conversations et du contrôle de version.

`pl-job-architect` prépare le job et lance la validation statique et le lint. Dès que le MCP répond pour le workspace du job, `pl-job-local-tester` écrit et exécute les suites pour les tâches prises en charge, comme JavaScript, XSLT et la validation XSD. Il utilise des données fictives, corrige les échecs et vérifie un passage complet sur les fichiers finaux avant l'empaquetage. Dans Vibe, l'assistant principal relaie les appels MCP pour l'agent de test. Si la connexion est indisponible, la skill indique ce qui manque et quels tests n'ont pas pu s'exécuter. Les résultats locaux portent uniquement sur le code et les données de test utilisés.

Vous pouvez demander à l'assistant de lister les tables du compte sélectionné dans VS Code, de rechercher les champs ou les partitions d'une table, ou d'afficher les colonnes d'une section d'écran. Par exemple, demandez "Quel champ contient l'EAN dans ma table de produits ?". L'assistant consulte les champs via l'extension et vous demande de choisir si plusieurs correspondent.

Si le job utilise une variable de compte, `pl-job-build` vous aide à choisir une clé existante ou signale une clé à créer dans son rapport. Avant la publication, `pl-job-run` vérifie quelles clés manquent encore et vous demande de confirmer leur création. Saisissez les valeurs secrètes dans VS Code.

## Mise à jour

- Claude Code : dans un terminal, `claude plugin update product-live@product-live`, puis une nouvelle session. Pour la mise à jour automatique : `/plugin`, onglet Marketplaces, `product-live`, Enable auto-update.
- Gemini CLI : `gemini extensions update product-live`.
- Codex, Vibe, Antigravity CLI : relancez la commande d'installation, ou demandez à votre assistant "mets à jour les skills Product-Live".

Quand vous utilisez `pl-job-build` ou `pl-job-run`, l'assistant vérifie une fois par conversation si une version plus récente existe. Si elle est disponible, il indique la commande de mise à jour et poursuit votre demande. Pour vérifier directement la version installée, demandez-la à `pl-update`.

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
