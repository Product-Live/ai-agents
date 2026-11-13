# Changelog

All notable changes to this job are documented in this file. The format is based on Keep a Changelog.

## [1.1.0] - 2026-10-29

### Changed

- Adapted from the public use case: the table is `PL_DEMO_PRODUCTS` (the demo table) instead of `PRODUCTS`; task references `build_message` and `write_message_file`; `description` and `optional` set on every task.
- The `SCREEN` input no longer declares a `default` (not a documented property of that input type).

### Added

- Outputs `items_found` and `partitions_with_matches`.
- README.

## [1.0.0] - 2026-08-21

### Added

- First public version of the use case.
