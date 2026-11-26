# Local task tests

Use this reference when building or changing a job with tasks that the Product-Live VS Code extension can test locally. Apply the workflow to JavaScript, XSLT and XSD tasks supported by the connected version. The extension runs suites against task code and fixtures in the open workspace. Platform execution is separate.

## Discover the runner

The calling assistant checks the connection before invoking `pl-job-local-tester`. Find the Product-Live MCP tools by name or description. The client can add a prefix to tool names. Use the connected tools' schemas for arguments and the returned contract for supported tasks and suite formats.

The same connection can offer `validate_job`: SKILL.md (Step 4) calls it on the saved `job.json` after the skill's validator, whether or not the job has testable tasks.

1. Call `describe_tests` without arguments to confirm the connected workspace contains the requested job folder. This check can happen before `job.json` exists. Use the requested job even if other jobs are listed.
2. After the definition is saved, call `describe_tests` with its absolute `jobPath`. Read the returned tasks, suite paths, authoring conventions and DSL schema. A live response for the intended job, supported tasks and available `run_tests` and `get_test_run` tools are required for delegation. If the connection is lost during testing, use the blocker guidance below.
3. In create or modify mode, cover each supported task, including tasks in branches and loops. Create missing suites and retain existing cases. Add or revise cases whose behavior the brief changes. If the connected extension cannot test some applicable tasks, report the gap and test the tasks it supports. If the job contains no locally testable tasks, report local tests as not applicable.

The JavaScript runner records each `out.logs` entry as `<timestamp> --- <message>`. When the log is part of the expected behavior, compare the message and keep the output assertions. For example:

```js
const messages = out.logs.map(line => line.replace(/^.*? --- /, ''));
expect(messages).toContain('Export ready.');
```

If publication reports that local tests must pass, inspect the failed cases with `get_test_run` using the `runId` from `run_tests`. If the run was refused before it returned an ID, act on the reason from `run_tests` first. For an unsaved document, identify the affected file and ask the user to save their edits if needed.

The tool contracts determine the supported shapes. For JavaScript, use the returned Vitest convention with `runScript` and `DF_TEST_PATH`. Call the actual job asset with concrete `data` and `resources`. Use a file-backed script for new JavaScript that the extension should test. For XSLT or XSD, use the returned `<taskReferenceName>.df-test.json` format and the task's actual stylesheet or schema where the contract binds it. Store test inputs and expectations outside `job.json`. Keep development-only validation tasks out of the delivered job.

## Write useful cases

- Start from the brief and the documented input and output contracts. Name each case by the behavior it checks. Write expected values independently of the implementation. For example, for a price total, choose two synthetic rows and calculate the expected total before running the script.
- Cover the normal case and the edge cases that change the outcome: an empty selection, a missing optional value, duplicates, a category-specific field or a deliberately rejected input when relevant. Use small fixtures that make the cause of a failure easy to read.
- Check the business result. Assert values, types, identifiers, counts and ordering where they matter. Use parsed JSON or the runner's XML comparison for structural assertions. Use exact text comparison for contracts where serialization matters. For expected errors, assert the documented error condition. For XSD, assert the intended valid or invalid verdict of a well-formed XML fixture. A runner error, missing file or malformed fixture does not establish schema rejection.
- Keep inputs deterministic. Use fictitious records, explicit dates and timezones, and representative saved responses for data normally supplied by another task. Use a fixed clock input where the runner supports it. Keep actual credentials, customer data and live API calls out of suites and fixtures.
- Keep fixtures and expected output in the job folder, with portable paths in the format the runner returns. Prefer a dedicated test-only folder such as `assets/TESTS/`. Complete skipped drafts before relying on their coverage. Keep reusable helpers small and separate assertions for independent cases.

## Execute and correct

For XSLT, use the Product-Live VS Code extension through MCP for every compilation or execution check, including a single fixture or an older version used as a baseline. If the workspace, task or tools are unavailable, follow "Connection and blockers". Do not invoke a separate processor or launch a platform job as a substitute for a local test.

| Tool | Arguments | Use |
| -- | -- | -- |
| `run_tests` | `jobPath`, optionally `taskReferenceName` and `scenario` | Start a full or targeted local run and retain its `runId` |
| `get_test_run` | `runId` | Read state, assertions, failures and freshness |
| `cancel_test_run` | `runId` | Stop a run that is no longer needed |

Save the job, assets, suites and fixtures before starting. Poll `get_test_run` for the returned `runId` while it is active. Use assertion messages, logs and expected/actual artifacts to diagnose failures. The VS Code test output channel holds runner logs that the tool does not return.

In create or modify mode, fix the code, inputs or a demonstrably incorrect expectation and rerun the affected cases. Keep valid expectations when implementation disagrees with the brief. Repeat while you can resolve the failure within the task. After the last relevant edit, run the complete job suite with `jobPath` alone. A passing targeted case is only evidence for that case. Record a full run as passed only when `get_test_run` confirms `verified: true` and `stale: false` for the current files. Missing suites, skipped cases, partial results and cancellations leave local coverage incomplete. In review mode, run the requested existing suites and report findings without editing them.

Keep suites, test-only fixtures and local test output out of the `.job.zip`. Check `.jobignore`, including any existing `.test.ts` suites and custom fixture folders. Keep assets the job references at runtime in the package. Recheck static validation and lint after changing job code. Report local results, validation and packaging separately.

## Connection and blockers

Tell the user when an applicable connection check fails, while other build steps can continue. Report the reason the available evidence supports.

| Observed state | What to tell the user |
| -- | -- |
| Local status confirms VS Code is closed | Open VS Code in the job workspace to enable local JavaScript and XSLT tests. |
| Extension missing, disabled or incompatible in the job's VS Code window | Install, enable or update the Product-Live extension for local tests, as applicable. |
| MCP unreachable, missing tools or connected to a different workspace | Name the connection issue and explain how to connect the job workspace. The MCP check alone cannot determine the state of VS Code or the installed extension. |
| Connection already configured, but the tools are missing from this session | The assistant connects to MCP servers when its session starts and does not retry by itself. If VS Code was opened or reloaded after that, the server was not listening yet. Ask the user to reconnect `product-live-vscode` (in Claude Code, the `/mcp` command; in other assistants, usually a new session), then check again. |

If the tools are unavailable for an applicable job, offer to use a compatible [Product-Live VS Code extension](https://marketplace.visualstudio.com/items?itemName=Product-Live.product-live) and connect `product-live-vscode`. The extension also provides the Jobs and Testing views for local task development. Open the job workspace in VS Code, enable the Product-Live Jobs view and keep the window open. **Product-Live: Copy Tests MCP Configuration** starts the server if needed in a trusted workspace. Add the copied URL and authorization header to the assistant's MCP settings. Keep the credential out of job files, conversation logs and version control. Respect workspace trust and change installations or connection settings only at the user's request.

Before the final report of a job with locally testable tasks, ask the user, with the interactive question tool when there is one, whether to wait while they connect or reconnect `product-live-vscode`, or to finish without local tests. Give the connection steps above in the question. Finish without tests only on that answer, or when the user cannot be asked.

When a connection, runtime, fixture or business decision prevents further progress, describe the blocker and keep applicable tests marked incomplete. Continue independent validation and packaging where possible. Mark a package with unresolved tests as provisional in the report.

If the calling assistant has confirmed the connection but the tester cannot call its tools, the tester returns a handoff with the job path, suite paths, requested tool and arguments, the next result needed and any observed failures. The caller relays the call and resumes the tester with the actual result. Repeat for execution and polling as needed, keeping suite creation and failure analysis with the tester. This also applies to Vibe, where only the calling assistant can use the MCP tools.
