# protocol-ftp-get

> Reference token: DF-TASK-PROTOCOL-FTP-GET-01

Status: GA | Category: protocol-ftp | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-ftp-get/

## Purpose

"Allows to recover one or more files via the FTP or SFTP protocol." Typical case: a daily CSV dropped on an SFTP server to import. `PARAMETERS` mode selects the N newest, oldest or largest files of a folder matching a regex; `REQUEST` mode downloads explicit paths.

## When to use

- Inbound integrations: "get the latest file" = `PARAMETERS` + `LAST_MODIFIED_DESC` + `maxFiles: 1` + a `filter`, then a `SWITCH` on `noFile`. Use this form only when the newest file supersedes the older ones (a full snapshot).
- Inbox folders (each file is processed, then moved or deleted with `protocol-ftp-move` or `protocol-ftp-delete`): use `LAST_MODIFIED_ASC` so that a backlog drains oldest first, one file per run, or process every file at once (`maxFiles` > 1 and the consumers in `FILES` mode with `${ftp_get.output.files}`). `LAST_MODIFIED_DESC` with `maxFiles: 1` takes the newest file on each run and leaves the older files in the folder forever.
- Explicit paths after `protocol-ftp-list` and an XSLT filter: `REQUEST` mode ("Use this method only if the other methods does not fit with your needs").

## When not to use

- Files over 250 Mb or folders with more than 100 files: restructure the remote folders.
- HTTP(S) sources: `protocol-http-perform`.

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
| mode | ENUM | yes | - | PARAMETERS, REQUEST | Folder search or explicit paths. |
| remoteFolder | STRING | if mode = PARAMETERS | - | - | "The complete path to the folder. If you want to search in the root folder, just set /". |
| sort | ENUM | if mode = PARAMETERS | - | LAST_MODIFIED_ASC, LAST_MODIFIED_DESC, ALPHABETICAL_ASC, ALPHABETICAL_DESC, SIZE_ASC, SIZE_DESC | "Defines how files must be ordered when they are read." |
| filter | STRING (regex) | no | none | - | Regex on the file name; "it is mandatory when you have several types of files in the same directory. If the value is empty, in this case we consider that there is no regex." Example `-products\\.xml$` (backslash escaped in JSON). |
| maxFiles | NUMBER | if mode = PARAMETERS | - | integer >= 1 | "The number of files to recover." |
| request | FILE | if mode = REQUEST | - | - | `<Ftp-Get>` XML (grammar below). |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

Request grammar (`/Ftp-Get/File` 0..*, `File/Path` exact path, "Must starts with /"):

```xml
<Ftp-Get>
    <File>
        <Path>/products-1.csv</Path>
    </File>
    <File>
        <Path>/sub-folder/products-2.csv</Path>
    </File>
</Ftp-Get>
```

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${ftp_get.output.file}` | FILE | "The first file recovered, or `null` if none was." With `PARAMETERS`, first according to `sort`; with `REQUEST`, first listed that could be recovered. |
| `${ftp_get.output.files}` | FILES | All recovered files, same order. |
| `${ftp_get.output.listing}` | FILE | `<Files><File><Url/><Path/><Last-Modified/><Size/></File></Files>`; `Last-Modified` in UTC, `Size` documented "in Kb". |
| `${ftp_get.output.noFile}` | ENUM YES/NO | YES when no file was found: "Test `noFile` rather than `file` to branch on that case." |
| `${ftp_get.output.allFilesRecovered}` | ENUM YES/NO | NO when at least one file could not be recovered. |
| `${ftp_get.output.report}` | FILE | Common report output. |

```xml
<Files>
  <File>
    <Url>https://app.product-live.com/files-data-factory/2345...bcde</Url>
    <Path>/products-1.csv</Path>
    <Last-Modified>2020-04-10T13:40:23.83Z</Last-Modified>
    <Size>1954387</Size>
  </File>
</Files>
```

## Example

```json
{
  "name": "protocol-ftp-get",
  "taskReferenceName": "ftp_get",
  "description": "Fetch the latest products file from the supplier SFTP server",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "connection": "SFTP",
    "host": "${workflow.globalVariables.supplier_ftp_host}",
    "username": "${workflow.globalVariables.supplier_ftp_login}",
    "password": "${workflow.globalVariables.supplier_ftp_password}",
    "port": 22,
    "mode": "PARAMETERS",
    "remoteFolder": "/exports",
    "sort": "LAST_MODIFIED_DESC",
    "filter": "-products\\.xml$",
    "maxFiles": 1
  }
}
```

## Gotchas and limits

- Limits: input file size 250 Mb; "100 files in the same folder (can be less depending on file sizes)".
- Best practices: "Always limit the number of files on a FTP folder"; "Always create one folder for one type of file eg. never have a folder and a file at the same level of path. This way you can always use the Last file method to retrieve your file on the server."
- Branch on `noFile` (and `allFilesRecovered`) with a `SWITCH`; a `null` `file` passed to the next task fails there with a less clear error.
- `Size` is documented in Kb but the example value (`1954387`) looks like bytes; do not compute on it without checking a real listing.
- The `filter` is a regular expression, not a glob: escape dots (`\\.` in JSON) and anchor with `$`.
- SFTP ciphers supported: `aes256-cbc`, `aes192-cbc`, `aes128-cbc`, `aes128-gcm`, `aes256-gcm`, `blowfish-cbc`, `3des-cbc`, `cast128-cbc`, `arcfour`, `arcfour128`, `arcfour256`; a server offering none of them fails during the SSH handshake, "reported as a connection error rather than an authentication error".
- Private key formats accepted: `BEGIN RSA PRIVATE KEY`, `BEGIN DSA PRIVATE KEY`, `BEGIN EC PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, `PuTTY-User-Key-File-2` (ssh-rsa, ssh-dss), `BEGIN SSH2 PUBLIC KEY`.
- Never inline credentials: `host`, `username`, `password` and `privateKey` belong in global variables (secret flag for the password and the key) and are documented in the job README. Set `timeoutSeconds` on the job for slow servers.
- Validate a generated request with `file-validation-xsd` and `xsdKey: protocol-ftp-get-input-request`.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `protocol-ftp-list` (discover files for `REQUEST` mode)
- `protocol-ftp-move`, `protocol-ftp-delete` (post-processing of the remote files)
- `file-conversion-unarchive`, `file-conversion-csv-to-xml`, `file-conversion-xlsx-to-xml` (process the files)
- `switch` (branch on `noFile`)
