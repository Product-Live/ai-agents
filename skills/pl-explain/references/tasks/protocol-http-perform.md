# protocol-http-perform

> Reference token: DF-TASK-PROTOCOL-HTTP-PERFORM-01

Status: GA | Category: protocol-http | Documentation: https://learn.product-live.com/data-factory/references/tasks/protocol-http-perform/

## Purpose

"This task allows you to perform HTTP calls with advanced features including multiple authentication methods, retry mechanisms, redirect handling, and response assertions."
It is the replacement of the deprecated `protocol-rest-perform` and the recommended way to call the Product-Live API (`api.product-live.com`) when no dedicated `data-*` or `table-*` task exists.

## When to use

- Any call to an external HTTP, REST or GraphQL API: read a remote JSON, download a file (`responses: ["FILE"]`), upload a file (multipart or binary).
- Push files to object storage (S3, GCS, Azure Blob, OVH, Scaleway) through the generic authentication types.
- Call the Product-Live API without storing a key (`authentication.type: PL_KEY`).

## When not to use

- Reading or writing platform entities covered by a `data-*` or `table-*` task (prefer the dedicated task).
- SOAP web services (`protocol-soap-perform`).
- Many independent calls from one step: wrap this task in `task-batch-execute` instead of a loop.

## Inputs

| Name | Type | Required | Default | Allowed values | Meaning |
| -- | -- | -- | -- | -- | -- |
| scheme | ENUM | no | HTTPS | HTTP, HTTPS | "The scheme of the service" |
| domain | STRING | yes | | | "The complete domain of the service. No validation is performed on the domain name. The domain name must not contain the scheme, the port or the path" |
| port | NUMBER | no | 80 (HTTP) or 443 (HTTPS) | | "The port of the service" |
| path | STRING | no | | | "The path of the service", for example `/v1/items`; a query string inside `path` is accepted |
| method | ENUM | no | GET | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS | "The method of the request" |
| headers | OBJECT | no | | | Request headers; max 100 headers, name <= 100 characters, value <= 10 000 characters |
| queryParameters | OBJECT | no | | | Query parameters, string values; same limits as headers |
| body | OBJECT | no | | | The request body, see `body.type` |
| body.type | ENUM | no | JSON | JSON, PLAIN, GRAPHQL, MULTIPART_FORM, FORM_URL_ENCODED, BINARY_FILE | Body kind |
| body.json | JSON | no | | | With `JSON`: "The body of the request in JSON format" |
| body.contentType | STRING | with PLAIN | | | With `PLAIN`: for example `text/plain`, `text/xml`, `text/csv`, `application/xml` |
| body.text | STRING | no | | | With `PLAIN`: "The text content of the body" |
| body.file | FILE | with BINARY_FILE | | | With `PLAIN` (alternative to `text`) or `BINARY_FILE` (required): the file to send |
| body.query | STRING | with GRAPHQL | | | "The GraphQL query" |
| body.variables | OBJECT | no | | | GraphQL variables |
| body.form | ARRAY | with MULTIPART_FORM or FORM_URL_ENCODED | | | Form parts, see below |
| body.form[].name | STRING | yes | | | Part name |
| body.form[].type | ENUM | MULTIPART_FORM only | | TEXT, FILE | Part kind |
| body.form[].text | STRING | if TEXT (always for FORM_URL_ENCODED) | | | Text value |
| body.form[].file | FILE | if FILE | | | File value, for example `file://assets/data.xml` |
| body.form[].contentType | STRING | no | auto-detected | | Part content type |
| body.form[].filename | STRING | no | auto-detected from URL | | Part file name |
| authentication | OBJECT | no | | | See `authentication.type` |
| authentication.useAuthentication | BOOLEAN | no | true | true, false | "every other value is considered as false" |
| authentication.type | ENUM | when authentication is used | | NONE, PL_KEY, BASIC, BEARER, API_KEY, OAUTH2_CLIENT_CREDENTIALS, AWS_SIGNATURE_V4, GCP_SERVICE_ACCOUNT_KEY | Authentication method |
| authentication.plKey | STRING | no | ephemeral key | | With `PL_KEY`: "If provided, uses this API key. Otherwise, an ephemeral API key is automatically generated for the current job's user context" |
| authentication.username, authentication.password | STRING | with BASIC | | | Basic credentials |
| authentication.token | STRING | with BEARER | | | Bearer token |
| authentication.apiKey | STRING | with API_KEY | | | API key value |
| authentication.headerName | STRING | no | X-Api-Key | | With `API_KEY`: header carrying the key |
| authentication.tokenUrl, authentication.clientId, authentication.clientSecret | STRING | with OAUTH2_CLIENT_CREDENTIALS | | | Client credentials flow |
| authentication.scope | STRING | no | | | OAuth2 scope(s), for example `read write` |
| authentication.accessKeyId, authentication.secretAccessKey, authentication.region, authentication.service | STRING | with AWS_SIGNATURE_V4 | | | SigV4 signing (`service` such as `s3`, `execute-api`, `es`) |
| authentication.sessionToken | STRING | no | | | SigV4 temporary credentials (STS) |
| authentication.gcpServiceAccountKeyProjectId, ...PrivateKeyId, ...PrivateKey, ...ClientEmail, ...ClientId | STRING | no | | | With `GCP_SERVICE_ACCOUNT_KEY`: service account key fields (`PrivateKey` in PEM format) |
| authentication.gcpServiceAccountKeyScope | ARRAY | no | | | GCP scopes, for example `["https://www.googleapis.com/auth/cloud-platform"]` |
| connectionTimeOutMilliseconds | NUMBER | no | 1000 | | "The connection timeout in milliseconds, if the value is 0 then no timeout is set" |
| readTimeOutMilliseconds | NUMBER | no | 150 (as documented) | | "The read timeout in milliseconds, if the value is 0 then no timeout is set" |
| responses | ARRAY of ENUM | no | ["JSON", "FILE", "STRING"] | JSON, FILE, STRING | Which of `response.json`, `response.file`, `response.string` are produced |
| retrySettings.maxRetries | NUMBER | no | 0 | 0-10 | "Maximum retry attempts" |
| retrySettings.retryDelayMs | NUMBER | no | 1000 | 0-300000 | "Initial delay between retries in milliseconds" |
| retrySettings.backoffStrategy | ENUM | no | EXPONENTIAL | FIXED, LINEAR, EXPONENTIAL | FIXED: always `retryDelayMs`; LINEAR: `retryDelayMs * attemptNumber`; EXPONENTIAL: `retryDelayMs * (2 ^ attemptNumber)` |
| retrySettings.maxRetryDelayMs | NUMBER | no | 30000 | 0-300000 | "Maximum delay between retries (caps the backoff)" |
| retrySettings.retryOnStatusCodes | ARRAY | no | [429, 500, 502, 503, 504] | | "HTTP status codes that trigger a retry" |
| retrySettings.retryOnNetworkError | BOOLEAN | no | true | | Retry on connection errors |
| retrySettings.retryOnTimeout | BOOLEAN | no | true | | Retry on timeouts |
| redirectSettings.mode | ENUM | no | FOLLOW | FOLLOW, MANUAL, ERROR | FOLLOW: follow redirects; MANUAL: return the redirect response; ERROR: fail on redirect |
| redirectSettings.maxRedirects | NUMBER | no | 10 | 0-50 | Redirect limit |
| redirectSettings.followSameHost | BOOLEAN | no | false | | "Only follow redirects to the same host" |
| redirectSettings.followSameProtocol | BOOLEAN | no | false | | "Only follow redirects with the same protocol" |
| redirectSettings.followDowngrade | BOOLEAN | no | true | | "Allow HTTPS to HTTP downgrade" |
| redirectSettings.preserveMethodOnRedirect | BOOLEAN | no | false | | Keep the method instead of converting to GET |
| assertions.enabled | BOOLEAN | no | false | | Enable assertions |
| assertions.failOnError | BOOLEAN | no | false | | "Fail the task if any assertion fails" |
| assertions.assertions[].name | STRING | no | | | Label |
| assertions.assertions[].target | ENUM | yes | | STATUS_CODE, RESPONSE_TIME, RESPONSE_SIZE, HEADER, COOKIE, BODY_STRING, BODY_JSON_PATH | What is checked |
| assertions.assertions[].targetKey | STRING | for HEADER, COOKIE, BODY_JSON_PATH | | | Header or cookie name, or a JSONPath such as `$.data.id` |
| assertions.assertions[].operator | ENUM | yes | | EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS, STARTS_WITH, ENDS_WITH, MATCHES_REGEX, EXISTS, NOT_EXISTS, LESS_THAN, LESS_THAN_OR_EQUALS, GREATER_THAN, GREATER_THAN_OR_EQUALS, IS_NULL, IS_NOT_NULL, IS_EMPTY, IS_NOT_EMPTY, IS_TYPE, IN, NOT_IN | Comparison |
| assertions.assertions[].expectedValue | ANY | no | | | "for operators that require it" |
| assertions.assertions[].expectedType | ENUM | no | | STRING, NUMBER, BOOLEAN, OBJECT, ARRAY, NULL | For `IS_TYPE` |
| assertions.assertions[].expectedValues | ARRAY | no | | | For `IN` / `NOT_IN` |
| skipReportGeneration | BOOLEAN | no | false | true, false | Skip the execution report |
| logLevel | ENUM | no | info | error, warning, info, debug | Log level recorded in the report |

Assertions example (verbatim from the documentation):

```json
{
  "enabled": true,
  "failOnError": true,
  "assertions": [
    { "name": "Status is 200", "target": "STATUS_CODE", "operator": "EQUALS", "expectedValue": 200 },
    { "name": "Content-Type is JSON", "target": "HEADER", "targetKey": "content-type", "operator": "CONTAINS", "expectedValue": "application/json" },
    { "name": "Status field is healthy", "target": "BODY_JSON_PATH", "targetKey": "$.status", "operator": "EQUALS", "expectedValue": "healthy" }
  ]
}
```

## Outputs

| Path | Type | Meaning |
| -- | -- | -- |
| ${http_perform.output.statusCode} | NUMBER | HTTP status, for example `200` |
| ${http_perform.output.reasonPhrase} | STRING | For example `OK` |
| ${http_perform.output.headers} | OBJECT | Response headers |
| ${http_perform.output.response.json} | JSON | Body as JSON when `responses` includes `JSON`; the usual input of `json-transform-jq`, `code-execute-javascript` or a `SWITCH` |
| ${http_perform.output.response.file} | FILE | Body as a file when `responses` includes `FILE`; feeds `file-transformation-xslt`, `table-import-items`, `protocol-ftp-post` |
| ${http_perform.output.response.string} | STRING | Body as a string when `responses` includes `STRING` |
| ${http_perform.output.curl} | STRING | "The cURL command to reproduce the request (API keys are obfuscated)" |
| ${http_perform.output.requestUrl} | STRING | Full URL called |
| ${http_perform.output.responseTimeMs} | NUMBER | Response time |
| ${http_perform.output.responseSizeBytes} | NUMBER | Response size |
| ${http_perform.output.cookies} | OBJECT | Response cookies |
| ${http_perform.output.assertionResults} | OBJECT | `allPassed`, `totalAssertions`, `passedCount`, `failedCount`, `details[]` (when assertions are enabled) |
| ${http_perform.output.redirectInfo} | OBJECT | `wasRedirected`, `redirectCount`, `originalUrl`, `finalUrl`, `redirectChain[]` |
| ${http_perform.output.retryInfo} | OBJECT | `attemptCount` ("1 = no retries"), the number of retries performed, `wasRetried`, `totalRetryDelayMs`, `attempts[]` |
| ${http_perform.output.report} | FILE | Execution report (absent when `skipReportGeneration` is `true`) |

## Example

```json
{
  "name": "protocol-http-perform",
  "taskReferenceName": "http_perform",
  "description": "Read the items of the account through the Product-Live API",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "scheme": "HTTPS",
    "method": "GET",
    "domain": "api.product-live.com",
    "path": "/v1/items",
    "headers": {
      "Accept": "application/json"
    },
    "connectionTimeOutMilliseconds": 10000,
    "readTimeOutMilliseconds": 30000,
    "responses": ["JSON"],
    "authentication": {
      "useAuthentication": true,
      "type": "PL_KEY"
    }
  }
}
```

Other documented shapes: `"body": {"type": "JSON", "json": {"keyName": "EAN", "stringEquals": ["2000000000244"]}}` for a POST; `"body": {"type": "MULTIPART_FORM", "form": [{"name": "file", "type": "FILE", "file": "file://assets/schema.xml", "filename": "schema.xml"}]}` for an upload; `"body": {"type": "BINARY_FILE", "file": "file://assets/image.png"}` for a binary upload; `"responses": ["FILE"]` to download.

## Gotchas and limits

- "The remote status code does not decide the task status": "By default the task succeeds as soon as it got a response, whatever that response was: a 404 or a 500 from the called service is reported in statusCode and the task still completes. Only transport failures (and the retries configured in retrySettings) end it in error." Always add `assertions` with `failOnError: true` or a `SWITCH` on `${http_perform.output.statusCode}`.
- Reacting to a failed call: mark the task `optional: true` and branch with a `SWITCH` on `"${http_perform.status}"` (braced form, two segments). `COMPLETED_WITH_ERRORS` is the documented value for an optional task that failed; switch on it and keep a `defaultCase` for every other value. The handling-failures page writes the reference without `${}`; prefer the braced form, since the evaluation of the unbraced form is not documented. `.status` only reflects transport failures, failed assertions or task errors, never a 4xx/5xx by itself.
- The documented default `readTimeOutMilliseconds` is 150 ms, which is very low and may be a typo; set it explicitly (or `0` for no timeout) for every real call.
- Limits: 100 headers and 100 query parameters, names <= 100 characters, values <= 10 000 characters. No documented body or response size limit. One call per task execution; use `task-batch-execute` for fan-out.
- Secrets: never write literal keys or tokens in `job.json`; reference a user input or an account variable (see `../variables-and-secrets.md`). Prefer `PL_KEY` for the Product-Live API.
- Report inputs `skipReportGeneration` / `logLevel` apply.

## Related tasks

- `protocol-rest-perform` (deprecated predecessor), `protocol-soap-perform`
- `json-transform-jq`, `code-execute-javascript`, `file-conversion-json-to-xml` (process `response.json`)
- `task-batch-execute` (many calls in parallel), `switch` (branch on `statusCode` or `.status`)
- `data-variable-find` (credentials stored as variables)
