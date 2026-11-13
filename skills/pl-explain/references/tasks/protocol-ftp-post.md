# protocol-ftp-post

> Reference token: DF-TASK-PROTOCOL-FTP-POST-01

Status: GA | Category: protocol-ftp | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-ftp-post/

## Purpose

"Allows to send one or more files via the FTP or SFTP protocol. For example you want to daily export products to a sFTP server." Files are uploaded into a target folder (`FILE` and `FILES` modes) or to exact target paths listed in an `<Ftp-Post>` request.

## When to use

- Outbound integrations: export produced by `file-transformation-xslt` (CSV, XML), `file-generation-archive`, `file-generation-xlsx`, pushed to a partner server.
- Renaming on upload: `REQUEST` mode, where each `File/Path` sets the exact remote name.

## When not to use

- HTTP(S) destinations or object storage: `protocol-http-perform`.
- More than 100 files per execution: bundle them with `file-generation-archive`.

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
| mode | ENUM | yes | - | FILE, FILES, REQUEST | One file, a list of files, or a request with exact target paths. |
| remoteFolder | STRING | if mode = FILE or FILES | - | - | Target folder (`/` for the root), for example `/products/`. |
| file | FILE | if mode = FILE | - | - | File to send; it keeps its own file name (renaming requires `REQUEST` mode). |
| files | FILES | if mode = FILES | - | - | Files to send. |
| request | FILE | if mode = REQUEST | - | - | `<Ftp-Post>` XML (grammar below): source URL and exact target path per file. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar (`/Ftp-Post/File` 1..*; `File/Url` is "Usually the url generated in the listing file of a previous task. It can also be an external url."; `File/Path` is the target path, "Must starts with /"):

```xml
<Ftp-Post>
    <File>
        <Url>https://app.product-live.com/files-data-factory/4567...def0</Url>
        <Path>/products-1.csv</Path>
    </File>
    <File>
        <Url>https://app.product-live.com/files-data-factory/5678...ef01</Url>
        <Path>/sub-folder/products-2.csv</Path>
    </File>
</Ftp-Post>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${ftp_post.output.allFilesSent}` | ENUM YES/NO | "A failed upload does not stop the task: it keeps going with the next file and reports `NO` at the end." |
| `${ftp_post.output.report}` | FILE | Common report output. |

## Example

```json
{
  "name": "protocol-ftp-post",
  "taskReferenceName": "ftp_post",
  "description": "Upload the daily export to the partner SFTP server",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "connection": "SFTP",
    "host": "${workflow.globalVariables.partner_ftp_host}",
    "username": "${workflow.globalVariables.partner_ftp_login}",
    "password": "${workflow.globalVariables.partner_ftp_password}",
    "port": 22,
    "mode": "FILE",
    "remoteFolder": "/products/",
    "file": "${transform_xslt.output.file}"
  }
}
```

## Gotchas and limits

- Limit (shared with `protocol-ftp-delete`): 100 files per execution; "Always limit the number of files on a FTP folder".
- "Test `allFilesSent` rather than the task status to know whether the transfer was complete - this holds for all three modes."
- In `FILE` and `FILES` modes the remote name is the source file name: name the file upstream (`fileName` of the XSLT task) or use `REQUEST` mode with the `Url` values of a previous `listing`.
- Whether `remoteFolder` or the folders of `Path` must pre-exist is not documented; create them on the server beforehand.
- Validate a generated request with `file-validation-xsd` and `xsdKey: protocol-ftp-post-input-request`.
- SFTP ciphers supported: `aes256-cbc`, `aes192-cbc`, `aes128-cbc`, `aes128-gcm`, `aes256-gcm`, `blowfish-cbc`, `3des-cbc`, `cast128-cbc`, `arcfour`, `arcfour128`, `arcfour256`; a server offering none of them fails during the SSH handshake, "reported as a connection error rather than an authentication error".
- Private key formats accepted: `BEGIN RSA PRIVATE KEY`, `BEGIN DSA PRIVATE KEY`, `BEGIN EC PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, `PuTTY-User-Key-File-2` (ssh-rsa, ssh-dss), `BEGIN SSH2 PUBLIC KEY`.
- Never inline credentials: `host`, `username`, `password` and `privateKey` belong in global variables (secret flag for the password and the key) and are documented in the job README. Set `timeoutSeconds` on the job for large uploads.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `file-transformation-xslt` (produce the export, build the request)
- `file-generation-archive`, `file-generation-xlsx`, `file-generation-pdf` (files to send, through their `listing`)
- `file-validation-xsd` (check the request)
- `table-export-items` (data source)
- `protocol-ftp-get` (inbound counterpart)
