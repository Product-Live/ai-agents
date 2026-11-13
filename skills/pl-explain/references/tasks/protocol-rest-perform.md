# protocol-rest-perform

> Reference token: DF-TASK-PROTOCOL-REST-PERFORM-01

Status: deprecated (use protocol-http-perform) | Category: protocol-rest | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-rest-perform/

## Purpose

"Allows to perform REST calls on a REST API." One XML request file describes a batch of up to 50 REST calls, sent with Basic or Bearer authentication.
The documentation states: "This Data Factory task is deprecated in favor of HTTP API (protocol-http-perform) ... We recommend migrating your existing jobs to protocol-http-perform."

## When to use

- Maintaining an existing job that already uses it.

## When not to use

- Any new job: use `protocol-http-perform` (one call) or `task-batch-execute` wrapping `protocol-http-perform` (many calls).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| endpoint | STRING | yes | | | "The endpoint." (base URL; each `Request/@path` is appended) |
| useAuthentication | BOOLEAN | yes | | true, false | "Does it need authentication?" |
| authenticationScheme | ENUM | yes | | BASIC, BEARER | Authentication scheme |
| bearer | STRING | if BEARER | | | "The token" |
| login | STRING | if useAuthentication is true (BASIC) | | | Login |
| password | STRING | if useAuthentication is true (BASIC) | | | Password |
| request | FILE | yes | | | "A file that defines all the requests." (`<Rest>` XML below) |
| timeout | NUMBER | yes (per the table; absent from the examples) | | | "Number of seconds before a request is considered in timeout." |
| requestInterval | NUMBER | yes (per the table; absent from the examples) | | | "Number of seconds between each requests. Ignored when nbRequestAtSameTime is greater than 1." |
| nbRequestAtSameTime | NUMBER | no | 1 | 1-10 | "Number of requests to perform in parallel ... Values above 10 are capped to 10." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

Request grammar: `Rest` (root) contains one `Rest-Call` per call; each has one `Request` (`@method`, `@path`, optional `Headers/Header@key`, optional `Parameters` holding `Query`, `Raw-Body` or `Form-Data`) and an optional free `Metadata` element echoed in the response.

```xml
<Rest>
    <Rest-Call>
        <Request method="GET" path="/pet/findByStatus">
            <Headers>
                <Header key="content-type">application/json</Header>
            </Headers>
            <Parameters>
                <Query name="status">available</Query>
            </Parameters>
        </Request>
        <Metadata>
            <ean>1234567890123</ean>
        </Metadata>
    </Rest-Call>
    <Rest-Call>
        <Request method="POST" path="/pet">
            <Parameters>
                <Raw-Body><![CDATA[{"name": "doggie"}]]></Raw-Body>
            </Parameters>
        </Request>
    </Rest-Call>
    <Rest-Call>
        <Request method="POST" path="/pet/1234/uploadImage">
            <Parameters>
                <Form-Data name="additionalMetadata" type="TEXT">New meta data</Form-Data>
                <Form-Data name="file" type="FILE">https://example.com/files/image.jpg</Form-Data>
            </Parameters>
        </Request>
    </Rest-Call>
</Rest>
```

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${rest_perform.output.responses} | FILE | "An xml file containing the responses for each request": the same `<Rest>` structure plus a `<Response>` per call (`Status-Code`, `Time-Ms`, `Size-Kb`, `Headers/Header@key`, `Body` in CDATA) |
| ${rest_perform.output.file} | FILE | "If the request generates a file" |
| ${rest_perform.output.files} | FILES | "If the requests generate multiple files" |
| ${rest_perform.output.allSuccess} | ENUM YES / NO | "YES: all calls had a success response. NO: at least one request had an error response." |
| ${rest_perform.output.report} | FILE | Execution report (report inputs are documented; the output table does not list it explicitly) |

## Example

```json
{
  "name": "protocol-rest-perform",
  "taskReferenceName": "rest_perform",
  "description": "Legacy batch of REST calls described in assets/request.xml",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "endpoint": "https://api.example.com",
    "useAuthentication": true,
    "authenticationScheme": "BEARER",
    "bearer": "${workflow.input.api_token}",
    "request": "file://assets/request.xml"
  }
}
```

BASIC variant: `"authenticationScheme": "BASIC", "login": "...", "password": "..."` instead of `bearer`.

## Gotchas and limits

- Deprecated: the job builder must not generate this task for new jobs; the validator warns on it.
- Limit: "50 requests in a file."
- The task ends `COMPLETED` even when calls fail; test `${rest_perform.output.allSuccess}` with a `SWITCH`.
- `Raw-Body` content "must be encapsulated in CDATA". `Form-Data type="FILE"` takes a file URL as text, not a FILE object.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `protocol-http-perform` (successor), `task-batch-execute` (batch of HTTP calls)
- `protocol-soap-perform` (same XML style)
- `file-transformation-xslt` (build the `<Rest>` file or parse `responses`)
