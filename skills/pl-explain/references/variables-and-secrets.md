# Variables and secrets

> Reference token: DF-VARIABLES-AND-SECRETS-01

Data Factory has two kinds of variables: global variables, created at account level in Settings and read with `${workflow.globalVariables.<key>}`, and local variables, created during an execution by a `SET_VARIABLE` task and read with `${workflow.variables.<key>}`.
Secrets (logins, passwords, tokens, API keys) are global variables marked as protected; a job never contains a secret in clear text.
This file gives the syntax, the limits, the secrets policy and the README convention for the variables a job needs.

## 1. Global variables

"Global variables are defined at the account level and are accessible across all jobs and tasks within that account. They are ideal for storing shared values like API keys, database connection strings, or other configuration settings."

- Created in Settings > Data Factory > Variables (https://settings.product-live.com/data-factory/variables/), and listed in the README of every job that uses them (a job can also manage variables with the `data-variable-*` tasks, section 1.3).
- Each variable has a key, a name, a value, a status and a "secret" (protected) flag. A secret variable "stays hidden in the interface and in the job execution reports" (a published use case), and "Secret variables have their values encrypted and are not returned in API responses" (`data-variable-create` page). The AI trust page adds that the generated call inputs of a task contain the resolved key: treat execution details as sensitive even when the variable is protected.
- Key: lowercase letters, digits and underscores, 1 to 50 characters (pattern `^[a-z0-9_]{1,50}$` on the `data-variable-create` page), unique within the account. Write it in the job exactly as created.
- A global variable stores a single string value (no arrays, no objects). Workaround: store a JSON string and parse it with a `json-transform-jq` task.
- "If a global variable is redefined within a job, the job-specific value will take precedence. To override a global variable, edit the target job and navigate to the Inputs and variables section."
- A variable has a status, `ACTIVE`, `ARCHIVED` or `DELETED` (`data-variable-*` task pages); how an expression resolves a variable that is not active is not documented, so keep the variables a job references active.
- A variable that does not exist on the account at upload time: whether the upload of the package is rejected, or the job is accepted and the expression resolves to nothing at run time, is not documented. Create every variable the README lists before importing the job, and never rely on either behaviour.
- The expression "is replaced with the value" stored in Settings, and no error is documented for a variable whose value is empty: fill every variable before the first run.

### 1.1 Syntax

```json
"${workflow.globalVariables.variable_key}"
```

```json
{
  "schema": "1.0",
  "key": "example",
  "title": "Example",
  "tasks": [
    {
      "name": "protocol-http-perform",
      "taskReferenceName": "protocol_http_perform",
      "description": "Call the partner API",
      "optional": false,
      "type": "SUB_WORKFLOW",
      "inputParameters": {
        "domain": "api.example.com",
        "method": "GET",
        "headers": {
          "Authorization": "Bearer ${workflow.globalVariables.my_variable}",
          "Content-Type": "application/json"
        }
      }
    }
  ]
}
```

Singular form: the variables tutorial and several published examples write `${workflow.variable.<key>}` (singular) for the account variables created in Settings, while the variables reference page writes `${workflow.globalVariables.<key>}`. Both forms appear in the documentation; prefer `${workflow.globalVariables.<key>}` in new jobs and treat the singular form as an alias when reading existing ones. Do not confuse either with `${workflow.variables.<key>}` (plural), which is the local variable syntax.

### 1.2 Limitations

- "A single template cannot contain multiple global variables." `"${workflow.globalVariables.prefix} ${workflow.globalVariables.name}"` does not work: compose the value in a script or an XSLT instead.
- The `loop` (`DO_WHILE`), `set-variable`, `wait` and `json-transform-jq` tasks "do not support the Data Factory global variables as an input parameter". Pass the value through the output of a previous task (a `code-execute-javascript` task that receives it in `data`, for example).
- "Data Factory variables cannot be used inside the Javascript code itself. However, they can be passed as values in the data parameter: they will be resolved at the workflow level before the script executes." The documentation describes no substitution inside asset files either (XSLT, HTML, JSON): do not write a variable reference inside an asset; pass the value as an XSLT param or a script `data` value instead (repository recommendation; `json-transform-jq` accepts no global variable at all).
- Shared jobs: "Variables of a shared job are resolved on the job owner's account, so a partner running the job gets the owner's values." A 2022 release note added the overloading of variables on shared jobs; the rules of that override are not described further.

### 1.3 Reading variables with tasks

The `data-variable-find`, `data-variable-create`, `data-variable-update` and `data-variable-increment` tasks (alpha) manage account variables from a job, for example to keep a counter or a "last run" marker (`data-variable-increment` increments atomically).

## 2. Local variables

"Local variables are created during job execution and are useful for storing values specific to a particular job run, such as task results or script outputs. They can be defined using the `SET_VARIABLE` task and accessed with the `${workflow.variables.*}` syntax."

```json
{
  "name": "set-variable",
  "taskReferenceName": "set_configuration",
  "description": "Keep the API configuration for the next tasks",
  "optional": false,
  "type": "SET_VARIABLE",
  "inputParameters": {
    "configuration": {
      "domain": "api.example.com",
      "maxAttempt": 3,
      "allowRedirect": true
    },
    "runPlan": "${plan_enrichment.output.result}"
  }
}
```

Read with `${workflow.variables.configuration.domain}` or `${workflow.variables.runPlan}`:

- Values can be strings, numbers, booleans, arrays or objects.
- "If a local variable is accessed but does not exist, it will return null."
- "The size of a local variable is limited to 256 KB. Exceeding this limit will result in a task error." Keep large payloads in files and store only their references.
- Local variables are only available within the current job execution; there is no cross-execution or cross-job state (use account variables or a table for that).

## 3. Secrets policy

| Rule | Why |
| -- | -- |
| Never write a login, password, token or API key in `job.json`, in an asset or in the README. | The package is shared and versioned: whoever receives it can read it. |
| Store every secret in a protected global variable and reference it with `${workflow.globalVariables.<key>}`. | "Always use variables to store login, password, tokens." (variables tutorial) |
| Pass secrets only into connection inputs: `password` / `username` / `host` of FTP tasks, `headers.Authorization` or `authentication` of HTTP tasks, `apiKey` of data tasks, the provider key of `ai-prompt-execute`. | These inputs are designed for credentials. |
| Never pass a secret to an XSLT param, an email template, a display message, a `data-log-create` message or a script `data` value that is echoed. | Task reports list "Inputs used in the task" (`Report/Input`), and anything a template, a message or a log prints is visible to its readers: the protected flag hides the variable, not what a task outputs. |
| Treat execution details as sensitive. | The resolved inputs of a task (including AI call payloads) are recorded in the execution details. Restrict who can read them. |
| An API key grants every action on its account. | Recommendation: a key dedicated to the job; when the key changes, update the variable value, not the job (variables tutorial). |

Example of a correct FTP task:

```json
{
  "name": "protocol-ftp-get",
  "taskReferenceName": "ftp_get",
  "description": "Get the latest products file from the supplier sFTP",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "connection": "SFTP",
    "host": "${workflow.globalVariables.supplier_ftp_host}",
    "username": "${workflow.globalVariables.supplier_ftp_login}",
    "password": "${workflow.globalVariables.supplier_ftp_password}",
    "port": "${workflow.globalVariables.supplier_ftp_port}",
    "mode": "PARAMETERS",
    "remoteFolder": "/",
    "sort": "LAST_MODIFIED_DESC",
    "filter": "-products\\.xml$",
    "maxFiles": 1
  }
}
```

Secrets never travel as user inputs either: a `TEXT` input asking for a password would display it in the launch form and in the execution input.

## 4. README convention: "variables to create"

Every job that references global variables documents them so the administrator creates them before importing the package. Recommended README section:

```markdown
## Variables to create

Create these variables in Settings > Data Factory > Variables before importing the job.

| Key | Secret | Description | Example |
| -- | -- | -- | -- |
| supplier_ftp_host | no | Host name of the supplier sFTP server | sftp.example.com |
| supplier_ftp_port | no | Port of the sFTP server | 22 |
| supplier_ftp_login | no | Login used by the job | data-factory |
| supplier_ftp_password | yes | Password of the login above | (secret) |
| products_table_key | no | Key of the table receiving the items | PRODUCTS |
```

Naming seen in published jobs: snake_case keys, namespaced per job when the value is specific (`export_excel_table_key`, `media_export_table_key`) and shared names for credentials (`mistral_api_key`, `api_key`). Write the exact key in the README and in `job.json`: what a misspelt global variable key gives (a rejected upload or an empty value at run time) is not documented, while a local variable that does not exist documentedly returns `null`.

## 5. Choosing between the mechanisms

| Need | Use |
| -- | -- |
| Credentials, API keys, host names, table keys that differ per account | global variable (protected when sensitive) |
| A value the launching user chooses each time | user input (`userInputs`) |
| Configuration that administrators edit once and users never see | `data` block of the first task, or a global variable |
| State shared between tasks, branches or loop iterations of one execution | local variable (`SET_VARIABLE`) |
| A counter or marker that survives executions | `data-variable-increment` / `data-variable-update` on an account variable |
| A list or object that must be shared across jobs | JSON string in a global variable, parsed with `json-transform-jq` |

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| `"password": "hunter2"` in `job.json` | `"password": "${workflow.globalVariables.supplier_ftp_password}"` plus a README entry |
| `${workflow.variables.api_key}` for an account variable | `${workflow.globalVariables.api_key}` (`variables` is for `SET_VARIABLE` values) |
| `${workflow.globalVariables.x}` written inside a `.js`, `.xslt` or `.html` asset | pass it as `data` or an XSLT param from `job.json` |
| `${workflow.globalVariables.x}` in the inputs of `loop`, `set-variable`, `wait` or `json-transform-jq` | route it through a previous task's output |
| Two variables in one string | one variable per template string |
| A variable key with upper case or hyphens (`FTP-Password`) | `ftp_password` |
| A secret passed to an XSLT `params[].select` or into an email body | connection inputs only |
| Expecting a clear error when a variable is missing or empty | no error is documented for either case; verify keys and create the variables, with their values, before upload |
| Relying on the partner's variables in a shared job | variables resolve on the owner's account |
| Storing a 1 MB plan in a local variable | keep it in a file; local variables are capped at 256 KB |
