# protocol-ftp-delete

> Reference token: DF-TASK-PROTOCOL-FTP-DELETE-01

Status: GA | Category: protocol-ftp | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-ftp-delete/

## Purpose

"Allows to delete files on a FTP/SFTP server." Files are named by a list of remote paths (glob patterns allowed) or by an `<Ftp-Delete>` request document.

## When to use

- Clean-up after a successful `protocol-ftp-get` and import.
- Purging a drop folder by pattern (`/exports/*.csv`).

## When not to use

- When traceability matters: prefer `protocol-ftp-move` to an archive folder.
- More than 100 files per execution: delete in several passes.

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
| passphrase | STRING | no (per docs) | - | - | Passphrase of the private key, only taken into account with `PUBLIC_KEY`: "Leave it out for a key that has none." (The `protocol-ftp-get`, `-list`, `-move` and `-post` pages mark it required with `PUBLIC_KEY` instead.) |

Task inputs:

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| mode | ENUM | yes | - | FILES, REQUEST (FILE is listed, see gotchas) | "`FILES`: all the files in the input files will be deleted. `REQUEST`: the files will be deleted as defined in the request input." |
| files | ARRAY of STRING | if mode = FILES | - | - | "The list of files to delete. Glob patterns are supported here.", for example `["/exports/*.csv"]` (the documentation types it FILES; the example is an array of remote paths). |
| request | FILE | if mode = REQUEST | - | - | `<Ftp-Delete>` XML (grammar below). |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar (`/Ftp-Delete/File` 1..*, `File/Path` "Must start with /", glob allowed):

```xml
<Ftp-Delete>
    <File>
        <Path>/products-1.csv</Path>
    </File>
    <File>
        <Path>/sub-folder/products-2.csv</Path>
    </File>
</Ftp-Delete>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${ftp_delete.output.allFilesDeleted}` | ENUM YES/NO | NO when at least one deletion failed. |
| `${ftp_delete.output.listing}` | FILE | Per-file deletion status, "produced even when the task fails" (shape below). |
| `${ftp_delete.output.report}` | FILE | Common report output. |

The `listing` is a `Report` document, not the usual `Files` listing: `Report/Input` holds the request URL or the `files` list with `@type` = the mode; each `Report/Log` has `@type` `DELETE_SUCCESS` or `DELETE_FAILED` and a `Metadata` with the full path. "When the task could not attempt anything at all - a failed connection, for instance - the document holds a single `Log` of type `error`, carrying the error code in a `code` attribute and the message in `Metadata`."

```xml
<Report task="protocol-ftp-delete">
    <Input type="REQUEST">https://app.product-live.com/files-data-factory/1234...abcd</Input>
    <Log type="DELETE_SUCCESS">
        <Metadata>/exports/products-1.csv</Metadata>
    </Log>
    <Log type="DELETE_FAILED">
        <Metadata>/exports/products-2.csv</Metadata>
    </Log>
</Report>
```

## Example

```json
{
  "name": "protocol-ftp-delete",
  "taskReferenceName": "ftp_delete",
  "description": "Delete the imported files from the drop folder",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "connection": "SFTP",
    "host": "${workflow.globalVariables.supplier_ftp_host}",
    "username": "${workflow.globalVariables.supplier_ftp_login}",
    "password": "${workflow.globalVariables.supplier_ftp_password}",
    "port": 22,
    "mode": "FILES",
    "files": ["/exports/*.csv"]
  }
}
```

## Gotchas and limits

- Limit: "The limitation of files that can be deleted is 100 (it can depends on file size)." Best practice: "Always limit the number of files on a FTP folder".
- Glob semantics: patterns "apply to the file name only. The path is split at its last `/`: what precedes it is the folder to look in, what follows it is matched as a glob against the names of the files in that folder. That folder is not browsed recursively, so `/exports/*.csv` deletes every CSV directly under `/exports`, while `/exports/**/*.csv` does not reach into sub-folders. A pattern that matches nothing is reported as a `DELETE_FAILED` entry naming the pattern itself."
- `FILE` mode is listed in the `mode` values but no `file` input is documented, and the VS Code extension schema only allows `FILES` and `REQUEST`; use one of those two.
- Branch on `allFilesDeleted` and read the `listing`; the task status does not tell which files were deleted.
- SFTP ciphers supported: `aes256-cbc`, `aes192-cbc`, `aes128-cbc`, `aes128-gcm`, `aes256-gcm`, `blowfish-cbc`, `3des-cbc`, `cast128-cbc`, `arcfour`, `arcfour128`, `arcfour256`. "A server that offers none of them cannot be reached: the connection fails during the SSH handshake, which is reported as a connection error rather than an authentication error."
- Private key formats accepted: `BEGIN RSA PRIVATE KEY`, `BEGIN DSA PRIVATE KEY`, `BEGIN EC PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, `PuTTY-User-Key-File-2` (ssh-rsa, ssh-dss), `BEGIN SSH2 PUBLIC KEY`.
- Never inline credentials: `host`, `username`, `password` and `privateKey` belong in global variables (secret flag for the password and the key) and are documented in the job README.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `protocol-ftp-get` (fetch before deleting)
- `protocol-ftp-move` (archive instead of deleting)
- `protocol-ftp-list` plus `file-transformation-xslt` (build the `Ftp-Delete` request)
