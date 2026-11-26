# protocol-soap-perform

> Reference token: DF-TASK-PROTOCOL-SOAP-PERFORM-01

Status: GA | Category: protocol-soap | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-soap-perform/

## Purpose

"Allows to perform SOAP calls on a SOAP API." Three modes: a `<Soap>` request document listing up to 50 calls (`REQUEST`), or one file / several files sent as the SOAP message (`FILE` / `FILES`).

## When to use

- Legacy supplier or retailer web services exposing SOAP envelopes.
- One envelope per item produced by `file-transformation-xslt` or `file-transformation-split-xml`, sent with `mode: FILES`.

## When not to use

- REST or JSON APIs: `protocol-http-perform`.
- WS-Security or token authentication: not supported (Basic only).

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| endpoint | STRING | yes | | | "The endpoint." |
| useAuthentication | BOOLEAN | yes | | true, false | When `true`, "an authorization header carrying HTTP Basic credentials is added" |
| login | STRING | if useAuthentication is true | | | Basic login |
| password | STRING | if useAuthentication is true | | | Basic password |
| mode | ENUM | yes (absent from the minimal example) | undocumented | REQUEST, FILE, FILES | "REQUEST: perform the calls described in the request document. FILE / FILES: send the given file, or each of the given files, as the SOAP message." |
| request | FILE | if mode is REQUEST | | | "A file that defines all the requests." |
| file | FILE | if mode is FILE | | | "The file to send as the SOAP message." |
| files | FILES | if mode is FILES | | | "The files to send, one call per file." |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

Request grammar: `Soap` (root), one `Soap-Call` per call, each with one `Request` (`@path` 0..1, `Headers/Header@key` 0..*, `Soap-Message` holding the full envelope) and an optional `Metadata` element echoed in the response.

```xml
<Soap>
  <Soap-Call>
    <Request>
        <Soap-Message>
          <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope/" soap:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
            <soap:Body xmlns:m="http://www.example.org/stock">
              <m:GetStockPrice>
                <m:StockName>IBM</m:StockName>
              </m:GetStockPrice>
            </soap:Body>
          </soap:Envelope>
        </Soap-Message>
        <Headers>
            <Header key="customHeader">value</Header>
        </Headers>
    </Request>
    <Metadata>
      <ean>1234567890123</ean>
    </Metadata>
  </Soap-Call>
</Soap>
```

Default headers on every call: `content-type: text/xml`, `cache-control: no-cache`, `mime-version: 1.0`. "Header names are case-insensitive ... A header you declare in Request/Headers replaces the default of the same name, and if you declare the same name twice, the last one wins."

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${soap_perform.output.responses} | FILE | "An xml file containing the responses for each request. Only in mode = REQUEST." Same `<Soap>` structure plus `<Response><Status-Code>...</Status-Code><Content>envelope</Content></Response>`; an unreachable endpoint yields `<Response><Error>Unable to contact the webservice.</Error></Response>` |
| ${soap_perform.output.file} | FILE | "The response received. Only in mode = FILE." |
| ${soap_perform.output.files} | FILES | "The responses received, one per call. Only in mode = FILES." |
| ${soap_perform.output.listing} | FILE | "An xml file listing the responses. Only in mode = FILE or FILES." (shape undocumented) |
| ${soap_perform.output.allSuccess} | ENUM YES / NO | "YES: all calls had a success response. NO: at least one request had an error response." |
| ${soap_perform.output.report} | FILE | Execution report; log codes `SOAP_REQUEST_START`, `SOAP_REQUEST_SUCCESS`, `SOAP_REQUEST_ERROR`, `SOAP_INVALID_INPUT`, `SOAP_INVALID_XML_INPUT`, `SOAP_TASK_COMPLETE_SUCCESS`, `SOAP_TASK_COMPLETE_ERROR` |

## Example

```json
{
  "name": "protocol-soap-perform",
  "taskReferenceName": "soap_perform",
  "description": "Call the partner stock web service",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "endpoint": "https://ws.example.com/stock",
    "useAuthentication": true,
    "login": "${workflow.input.ws_login}",
    "password": "${workflow.input.ws_password}",
    "mode": "REQUEST",
    "request": "file://assets/request.xml"
  }
}
```

## Gotchas and limits

- "The task ends COMPLETED even when every call failed - a non-2xx response is a result, not a task failure. allSuccess is the output to test: it is YES only when every response carried a 2xx status." Also: "allSuccess is also YES when no call was made at all ... A YES therefore means 'nothing failed', not 'something succeeded'".
- Limit: "50 requests in a file."
- Only Basic authentication; no timeout input is documented.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `protocol-http-perform` (REST / JSON)
- `file-transformation-xslt` (build envelopes, parse `responses`), `file-transformation-split-xml` (one envelope per file, then `mode: FILES`)
- `switch` on `allSuccess`
