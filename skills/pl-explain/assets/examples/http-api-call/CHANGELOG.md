# Changelog

All notable changes to this job are documented in this file. The format is based on Keep a Changelog.

## [1.0.0] - 2026-10-29

### Added

- First version, written from the examples of the public `protocol-http-perform` task page: a GET with assertions and a POST with a JSON body on the Product-Live API (`api.product-live.com`) with `PL_KEY` authentication, retry settings on the POST, a `SWITCH` guard on the status code with a `TERMINATE` branch exposing the cURL command, job-level `timeoutSeconds` (600) and a README.
