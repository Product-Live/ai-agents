# azure-storage-blob-list

> Reference token: DF-TASK-AZURE-STORAGE-BLOB-LIST-01

Status: GA | Category: storage | Documentation: https://learn.product-live.com/data-factory/references/tasks/azure-storage-blob-list/

## Purpose

List the blobs of a Microsoft Azure Storage container into an XML listing file, optionally filtered by a path prefix.

## When to use

- Discover the files to download or process from an Azure container (for example product images).
- Feed the listing to an XSLT transformation or a loop that downloads each blob.

## When not to use

- Listing an FTP or SFTP server: use `protocol-ftp-list`.
- Containers with a very large number of blobs when the job has a short time budget: the whole container is paged through and the task ends in `TIMED_OUT` rather than truncating.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- | --- |
| authenticationMode | ENUM | yes | - | CONNECTION_STRING, SHARED_KEY, SAS_TOKEN | Authentication mode (the documentation leaves its description cell empty). |
| connectionString | STRING | when authenticationMode = CONNECTION_STRING | - | - | The Azure Storage connection string. |
| sharedKey | STRING | when authenticationMode = SHARED_KEY | - | - | The shared key. |
| sasToken | STRING | when authenticationMode = SAS_TOKEN | - | - | The SAS token. |
| account | STRING | when authenticationMode = SHARED_KEY or SAS_TOKEN | - | - | The storage account name. |
| container | STRING | yes | - | - | The container to list. |
| prefix | STRING | no | - | - | Keep only the files whose full name (including path) begins with this prefix. |
| skipReportGeneration | BOOLEAN | no | false | true, false | When `true`, no report is generated and `report` is absent from the outputs. |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report (`error` < `warning` < `info` < `debug`). |

## Outputs

| Path | Type | Meaning |
| --- | --- | --- |
| ${azure_list.output.listing} | FILE | XML file with the path of the available files on the server (structure below). |
| ${azure_list.output.report} | FILE | XML execution log; absent when `skipReportGeneration = true`. |

`listing` structure (verbatim from the documentation):

```xml
<Azure-Storage-Blob-List>
    <Account>mystorage</Account>
    <Container>my-container</Container>
    <Url>https://mystorage.blob.core.windows.net/my-container</Url>
    <Files>
        <File>
            <Name>img/products-1.jpg</Name>
            <Deleted/>
            <Metadata/>
            <Properties>
                <Created-On>2021-06-12T20:06:12</Created-On>
                <Last-Modified>2021-06-12T20:06:12</Last-Modified>
                <Content-Length>211326</Content-Length>
                <Content-Type>application/octet-stream</Content-Type>
                <Content-MD5>c802e1bd9b5f2b0d244bbc982f5082b3</Content-MD5>
            </Properties>
        </File>
    </Files>
</Azure-Storage-Blob-List>
```

| XPath | Meaning | Occurs |
| --- | --- | --- |
| `/Azure-Storage-Blob-List` | root | 1 |
| `./Account`, `./Container`, `./Url` | account, container and container URL | 1 each |
| `./Files/File` | one element per blob | 0 or more |
| `File/Name` | blob name, with its path | 1 |
| `File/Deleted` | true when soft delete is used | 1 |
| `File/Metadata` | blob metadata | 0 or more |
| `File/Properties/Created-On`, `Last-Modified`, `Content-Length`, `Content-Type`, `Content-MD5` | blob properties | 1 each |

## Example

```json
{
  "name": "azure-storage-blob-list",
  "taskReferenceName": "azure_list",
  "description": "List the product images available in the Azure container",
  "type": "SUB_WORKFLOW",
  "optional": false,
  "inputParameters": {
    "authenticationMode": "CONNECTION_STRING",
    "connectionString": "${workflow.globalVariables.azure_connection_string}",
    "container": "your-container"
  }
}
```

## Gotchas and limits

- No cap on the number of blobs: the task pages through the whole container; a huge container ends in `TIMED_OUT` instead of a truncated listing.
- Credentials (`connectionString`, `sharedKey`, `sasToken`) belong in secret global variables; the documentation examples use literal placeholders.
- Report inputs: `skipReportGeneration` (default `false`) and `logLevel` (default `info`); the `report` output disappears when the report is skipped.
- Required per schema: `authenticationMode` and `container` (same as the documentation); the credential inputs are conditionally required per docs.

## Related tasks

- `azure-storage-blob-put`: upload blobs.
- `protocol-http-perform`: download the listed URLs.
- `file-transformation-xslt`: turn the listing into a download request or a report.
- `loop`: iterate over the listed files.
- `protocol-ftp-list`: FTP equivalent.
