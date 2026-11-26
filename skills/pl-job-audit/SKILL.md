---
name: pl-job-audit
description: Audit an existing Product-Live Data Factory job folder or .job.zip against its brief and job design practices. Use for an evidence-based verdict and prioritized improvements. For editing or packaging, use pl-job-build. To diagnose a specific execution on Product-Live, use pl-job-run.
license: MIT
metadata:
  author: "Product-Live"
---

# Audit a Data Factory job

Use the job folder or package supplied by the user. If several jobs could be the target, resolve which one to inspect. For a package, inspect its contents in a fresh temporary directory. Keep extraction inside that directory and leave the original package and workspace untouched.

Call `pl-job-auditor` with the absolute job folder, whether the input was a package, the user's brief or stated purpose, applicable project and user instructions, and available validation or test evidence. A missing brief limits the assessment of intent. Continue with the evidence at hand. The auditor uses the job builder's installed checklist and references. When agents are unavailable, invoke the installed `pl-job-build` skill in review mode and apply its audit step directly.

Return the auditor's verdict, its five assessment rows and its prioritized improvements in the user's language. The audit is read-only. If the user also requests existing local tests, coordinate them through the Product-Live VS Code MCP for the intended workspace and give the actual results to the auditor. A package normally excludes suites and fixtures. Record missing evidence when those files or the matching workspace are unavailable.
