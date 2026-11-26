# Changelog

All notable changes to this job are documented in this file. The format is based on Keep a Changelog.

## [1.1.1] - 2026-11-18

### Fixed

- Bind the protected provider key directly to a declared AI task inside a sequential loop, instead of passing it through the script that builds batch entries.
- Check optional task failures before reading their answer outputs, and keep per-item failures from reusing an earlier answer.
- Count suggestions from returned ids and report creation errors separately from AI errors.

### Changed

- Build a credential-free prompt plan and document every task, including loop and branch tasks.

## [1.1.0] - 2026-10-29

### Changed

- Adapted from the public generic job "Detect Typos with Mistral AI": kebab-case key, provider-neutral title, provider and model moved to the `data` of `prepare_inputs` (`provider`, `model`) and validated; API key variable renamed `ai_api_key`.
- Scripts rewritten without type annotations and with shorter logs; `temperature` no longer sent to the model.

### Added

- README with the settings table, the outcomes table and the adaptation notes.

## [1.0.0] - 2026-04-03

### Added

- First public version of the generic job.
