# protocol-ftp-list

> Reference token: DF-TASK-PROTOCOL-FTP-LIST-01

Status: GA | Category: protocol-ftp | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-ftp-list/

## Purpose

"Allows to list files on a FTP or SFTP server." Only files are listed (not directories), recursively down to the requested `depth`, as an XML `listing` with path, modification date and size.

## When to use

- Discover files before a `REQUEST`-mode `protocol-ftp-get`, `protocol-ftp-move` or `protocol-ftp-delete` (filter the listing with `file-transformation-xslt`).
- Audit a drop folder or detect the presence of files (`noFile`).

## When not to use

- Just fetching the newest file of a folder: `protocol-ftp-get` in `PARAMETERS` mode does it in one step.
- Folders deeper than 5 levels: "Maximum depth: 5".

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
| remoteFolder | STRING | yes | - | - | Folder path; `/` for the root. |
| depth | NUMBER | yes | - | 1 to 5 | "If you need to parse sub folders, you must indicates a depth greater than 1. Maximum depth: 5." |
| skipReportGeneration | BOOLEAN | no | false | true, false | When true, the `report` output is not produced. |
| logLevel | ENUM | no | info | error, warning, info, debug | Lowest level recorded in the report. |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| `${ftp_list.output.listing}` | FILE | `<Files><File><Path/><Last-Modified/><Size/></File></Files>`; "Only files are listed, not directories"; `Last-Modified` in UTC, `Size` documented in Kb. |
| `${ftp_list.output.noFile}` | ENUM YES/NO | YES when the folder holds no file. |
| `${ftp_list.output.report}` | FILE | Common report output. |

```xml
<Files>
    <File>
        <Path>/file-1.jpg</Path>
        <Last-Modified>2020-04-10T13:40:23.83Z</Last-Modified>
        <Size>1954387</Size>
    </File>
    <File>
        <Path>/sub-folder/file-2.jpg</Path>
        <Last-Modified>2020-04-10T13:40:23.83Z</Last-Modified>
        <Size>1954387</Size>
    </File>
</Files>
```

## Example

```json
{
  "name": "protocol-ftp-list",
  "taskReferenceName": "ftp_list",
  "description": "List the files waiting in the supplier drop folder",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "connection": "SFTP",
    "host": "${workflow.globalVariables.supplier_ftp_host}",
    "username": "${workflow.globalVariables.supplier_ftp_login}",
    "password": "${workflow.globalVariables.supplier_ftp_password}",
    "port": 22,
    "remoteFolder": "/exports",
    "depth": 1
  }
}
```

## Gotchas and limits

- Limits (shared with `protocol-ftp-get`): file size 250 Mb; 100 files in the same folder; "never have a folder and a file at the same level of path".
- The listing has no `Url` element: this task downloads nothing. Turn the `Path` values into an `<Ftp-Get>`, `<Ftp-Move>` or `<Ftp-Delete>` request with an XSLT.
- Branch on `noFile` before processing the listing.
- `Size` is documented in Kb but the example value looks like bytes; check a real listing before computing on it.
- SFTP ciphers supported: `aes256-cbc`, `aes192-cbc`, `aes128-cbc`, `aes128-gcm`, `aes256-gcm`, `blowfish-cbc`, `3des-cbc`, `cast128-cbc`, `arcfour`, `arcfour128`, `arcfour256`; a server offering none of them fails during the SSH handshake, "reported as a connection error rather than an authentication error".
- Private key formats accepted: `BEGIN RSA PRIVATE KEY`, `BEGIN DSA PRIVATE KEY`, `BEGIN EC PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, `PuTTY-User-Key-File-2` (ssh-rsa, ssh-dss), `BEGIN SSH2 PUBLIC KEY` (one line of the documentation misses its trailing dashes).
- Never inline credentials: `host`, `username`, `password` and `privateKey` belong in global variables (secret flag for the password and the key) and are documented in the job README.
- Report inputs `skipReportGeneration` and `logLevel` apply.

## Related tasks

- `protocol-ftp-get` (`REQUEST` mode from the listing)
- `protocol-ftp-move`, `protocol-ftp-delete` (act on listed files)
- `file-transformation-xslt` (turn `Files/File/Path` into a request document)
