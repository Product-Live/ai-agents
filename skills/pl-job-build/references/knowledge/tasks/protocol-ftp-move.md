# protocol-ftp-move

> Reference token: DF-TASK-PROTOCOL-FTP-MOVE-01

Status: GA | Category: protocol-ftp | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-ftp-move/

## Purpose

"Allows to move one or more files via the FTP or SFTP protocol." Renames or moves files on the remote server (for example into a `processed/` folder) according to an `<Ftp-Move>` request document; there is no `mode` input.

## When to use

- Archiving processed files after `protocol-ftp-get` and a successful import, keeping a trace on the server.
- Renaming remote files without downloading them.

## When not to use

- Deleting files: `protocol-ftp-delete`.
- Copying a file to another server: `protocol-ftp-get` then `protocol-ftp-post`.

## Inputs

Connection inputs (shared by every `protocol-ftp-*` task):

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| connection | ENUM | yes | - | FTP, SFTP, FTPS | Protocol. |
| authenticationMethod | ENUM | if connection = SFTP | PASSWORD | PASSWORD, PUBLIC_KEY | "If connection is not SFTP and authenticationMethod is `PUBLIC_KEY`, the task fails." |
| host | STRING | yes | - | - | "You can use a dns or an IP address." Store it in a global variable. |
| port | NUMBER | yes | - | - | Server port (the documentation examples show `21` even for SFTP, which normally uses 22). |
| username | STRING | yes | - | - | Login, from a global variable. |
| password | STRING | for PASSWORD authentication | - | - | From a secret global variable. With SFTP and `PUBLIC_KEY`, setting it raises an invalid-input error (the documentation sentence is garbled; this is the most plausible reading). |
| privateKey | STRING | if authenticationMethod = PUBLIC_KEY | - | - | "It is required to use a secret variable to store the private key." |
| passphrase | STRING | if authenticationMethod = PUBLIC_KEY (per docs) | - | - | Passphrase of the private key, only taken into account with `PUBLIC_KEY`. Unverified: whether a key without a passphrase may omit it is not documented on this page (only the `protocol-ftp-delete` page says to leave it out for a key that has none). |

Task inputs:

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| request | FILE | yes | - | - | `<Ftp-Move>` XML (grammar below): `${previous_task.output.file}`, `file://assets/move.xml` or `${workflow.input.<key>}`. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar (`/Ftp-Move/File` 1..*; `Source-Path` and `Target-Path` are exact paths that "Must starts with /"):

```xml
<Ftp-Move>
    <File>
        <Source-Path>/products-1.csv</Source-Path>
        <Target-Path>/processed/products-1.csv</Target-Path>
    </File>
    <File>
        <Source-Path>/sub-folder/products-2.csv</Source-Path>
        <Target-Path>/processed/products-2.csv</Target-Path>
    </File>
</Ftp-Move>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${ftp_move.output.allFilesMoved}` | ENUM YES/NO | NO when at least one file was not moved. |
| `${ftp_move.output.report}` | FILE | Common report output (no `listing` is documented for this task). |

## Example

```json
{
  "name": "protocol-ftp-move",
  "taskReferenceName": "ftp_move",
  "description": "Move the imported files to the processed folder",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "connection": "SFTP",
    "host": "${workflow.globalVariables.supplier_ftp_host}",
    "username": "${workflow.globalVariables.supplier_ftp_login}",
    "password": "${workflow.globalVariables.supplier_ftp_password}",
    "port": 22,
    "request": "${build_move_request.output.file}"
  }
}
```

## Gotchas and limits

- Limits (shared with `protocol-ftp-get`): file size 250 Mb; 100 files in the same folder; one folder per file type.
- Whether the target folder must already exist is not documented; create it on the server beforehand.
- The request is usually built by `file-transformation-xslt` from the `listing` of `protocol-ftp-get` (`Files/File/Path`) so that only the files actually imported are moved. During development, diagnose it with `file-validation-xsd` and `xsdKey: protocol-ftp-move-input-request`; remove the diagnostic task from the final job.
- Branch on `allFilesMoved`; the task status alone does not say which files were moved.
- SFTP ciphers supported: `aes256-cbc`, `aes192-cbc`, `aes128-cbc`, `aes128-gcm`, `aes256-gcm`, `blowfish-cbc`, `3des-cbc`, `cast128-cbc`, `arcfour`, `arcfour128`, `arcfour256`; a server offering none of them fails during the SSH handshake, "reported as a connection error rather than an authentication error".
- Private key formats accepted: `BEGIN RSA PRIVATE KEY`, `BEGIN DSA PRIVATE KEY`, `BEGIN EC PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, `PuTTY-User-Key-File-2` (ssh-rsa, ssh-dss), `BEGIN SSH2 PUBLIC KEY`.
- Never inline credentials: `host`, `username`, `password` and `privateKey` belong in global variables (secret flag for the password and the key) and are documented in the job README.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `protocol-ftp-get` (fetch, process, then move)
- `protocol-ftp-list`, `file-transformation-xslt` (build the request)
- `file-validation-xsd` (development diagnostic for the request)
- `protocol-ftp-delete` (alternative clean-up)
