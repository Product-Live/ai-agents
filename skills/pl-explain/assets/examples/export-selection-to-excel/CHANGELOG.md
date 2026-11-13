# Changelog

All notable changes to this job are documented in this file. The format is based on Keep a Changelog.

## [2.0.13] - 2026-10-29

### Changed

- Adapted from the public generic Excel export job (stylesheet version 2.0.13): kebab-case job key, global variable renamed `excel_export_table_key` and read with the `${workflow.globalVariables.*}` syntax, asset files renamed in kebab-case.
- Media links are written exactly as the export provides them (see README).
- English description and French localisation swapped so that English is the default language.

### Added

- README describing the pipeline, the XSLT parameters and the variable to create.
