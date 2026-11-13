# Changelog

All notable changes to this job are documented in this file. The format is based on Keep a Changelog.

## [1.1.0] - 2026-10-29

### Changed

- Adapted from the public use case "Execute JavaScript code to read and manipulate JSON and text data sources": kebab-case key, shorter task references, assets renamed `return-string.js` and `read-resources.js`.

### Added

- `return_json_object` now returns a computed object, and `return_file_from_script` shows `log()`.
- `throw_error`: an optional task that fails on purpose, with its status exposed as a job output.
- README with the `$` contract and a table of what each task demonstrates.

## [1.0.0]

### Added

- First public version of the use case (seven tasks).
