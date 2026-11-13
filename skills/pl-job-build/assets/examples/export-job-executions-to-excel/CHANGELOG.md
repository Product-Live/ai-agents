# Changelog

All notable changes to this job are documented in this file. The format is based on Keep a Changelog.

## [1.2.0] - 2026-10-29

### Changed

- Adapted from the public generic job: kebab-case key, snake_case task references (`find_job_executions`, `find_users`, `build_excel_request`, `generate_excel`), scripts rewritten in plain ES5 style with explicit number parsing of the `days` input.
- Output renamed `files` (the `file-generation-xlsx` task exposes `files`).

### Added

- Output `executions_found`.
- README with the pipeline, the user input and the adaptation notes.

## [1.1.0] - 2026-09-03

### Added

- Columns "Created By (name)" and "Created By (email)", resolved from the account users with `data-user-find`.

## [1.0.0] - 2026-02-10

### Added

- First release of the public generic job.
