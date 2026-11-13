# Changelog

All notable changes to this job are documented in this file. The format is based on Keep a Changelog.

## [1.0.0] - 2026-10-29

### Added

- First version, written from the patterns of the public example "Import items from a CSV file stored on an SFTP server" and of the task references: SFTP pickup with credentials in global variables, `SWITCH` on `noFile`, CSV to items pipeline, move to `/processed/`, HTML report email.
- Stylesheets `csv-to-items.xslt` (shared with `import-items-from-csv`), `build-move-request.xslt` and `import-report-email.xslt`.
- `sort: LAST_MODIFIED_ASC` so that a backlog of waiting files drains oldest first, and a `SWITCH` on `allEmailsSent` that fails the job when the report email was not sent.
