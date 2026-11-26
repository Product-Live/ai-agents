# Analytical report guidelines

Use for business intelligence reports with statistics, charts or AI-assisted synthesis. PDF guidance applies when PDF is the requested output. Layout values are adjustable design defaults, not platform guarantees. Read the relevant task references for the actual data and rendering contracts.

## Define the evidence

- Put the population, filters, extraction timestamp and timezone before the findings. Distinguish selected items from distinct items with matching records.
- Deduplicate records by a documented stable identifier before aggregation. Compute counts, date buckets, category membership and rankings deterministically. Use that same result for charts, tables and AI input.
- Keep zero separate from missing, invalid or unavailable data. Show unknown dates, emitters and category assignments as explicit counts. Percentages state their denominator; counts are the primary measure for small populations.
- Use the requested category membership rule. Direct assignments do not include ancestors. If records belong to several groups, count each record once within each group and disclose that group totals can exceed the unique population. Retain an unassigned group.
- Label AI prose as AI-assisted synthesis. Supply the computed statistics and supporting evidence references; require references for material observations. Include references for report scope, filters, aggregation rules and data-quality notes so methodological observations can cite their actual support. Record, category and aggregate references remain available for findings about the data. Keep measured facts separate from proposed review actions. AI text must not invent counts, identities, causes, urgency or historical trends.
- Treat recommended word counts and observation counts as editorial targets. Shorten or paginate an otherwise valid, evidenced answer instead of failing the job for a modest excess. Keep structural and evidence checks distinct from presentation budgets; use a blocking length limit only when the brief requires one.

## Choose charts with explicit meaning

| Question | Useful presentation | Interpretation to preserve |
| -- | -- | -- |
| When were the included records created? | Vertical bars by date bucket, with an exact table | Name the included population, date field, bucket interval and timezone. A current open cohort is not a history of all creations or resolutions. |
| Which accounts, people or sources appear most often? | Descending horizontal bars with direct values, plus a ranking table | Rank the dimension requested in the brief, using its documented identifier. Volume does not establish quality, severity or employee performance. |
| Which categories contain records? | Count table with distinct affected items; horizontal bars when useful | Distinguish direct membership, overlap and unassigned records. |

Count axes start at zero and use integer ticks. Label bars directly where space permits. Avoid smoothing, forecasts, dual axes or decorative scores that add an unsupported interpretation.

### Creation dates

- Use valid creation dates and a stated timezone. Choose daily, weekly or monthly buckets that fit the range and page; roughly 8 to 24 buckets is a useful starting point. State week boundaries and the covered dates.
- Derive the range from the included valid dates unless a window is requested. Do not drop old records to fit the page. For a limited chart window, disclose the out-of-range count and denominator.
- Fill empty buckets with zero only when retrieval is complete. Dated counts plus unknown-date counts reconcile with the population; include out-of-range counts in this reconciliation when applicable.
- For one bucket or a few records, retain a requested chart and emphasize exact counts. Explain that the sample is small and descriptive. If no valid dates exist, replace the dated chart with the unknown-date count.
- For currently open suggestions, use a title such as "Currently open suggestions by creation date" and a caption explaining that only suggestions still open at extraction are included. Do not infer historical throughput, resolution rates or growth from this cohort.

### Emitter and contributor rankings

Choose the grouping dimension from the brief: accounts, people or supplied source labels. Use the stable identifier for that dimension when available, even when its display name is missing. Use supplied names or a documented lookup to resolve display labels, then show those names directly in charts and tables. For account rankings, every known name uses the format `Account name (ID)`, including unique names. Display only the identifier when its name is absent or unmatched. Keep identifiers as grouping keys and evidence references. Do not substitute generic aliases for available names.

| Available evidence | Label and grouping |
| -- | -- |
| Attested human authorship | "Contributors", grouped by a stable person identifier. |
| Attested emitting account | "Emitting accounts", grouped by the documented account identifier. An account is not necessarily one person. |
| Associated account identifier without attested authorship | "Associated accounts", grouped by that identifier when accounts are the requested dimension. Do not promote association to an attested creator or emitting account. |
| Source label without attested authorship | "Suggestion sources" or "Emitters" when source labels are the requested dimension. Explain what the supplied label represents and what is unknown. |
| Missing grouping key for the requested dimension | An explicit unknown group for that dimension, with its count. |

For an account ranking, group by account identifier alone. Source labels are optional context; several labels on one account remain one group. Unknown accounts are records without an account identifier, including records that have only a source label.

For a source-label ranking, use a stable source identifier when documented. If the intended dimension distinguishes sources within account contexts, use the label and account pair to avoid merging homonyms across accounts; this pair is not the key for an account ranking. If only labels exist, disclose grouping by supplied label and its homonym limitation. An emitter label does not attest a human author. Do not infer identities from suggestion text.

Choose a readable top-N cutoff, for example five known groups, with a deterministic tie-break. Explain a tie at the cutoff. Show Other known groups and the unknown group separately when present, with labels matching the requested dimension. Top-N + Other + Unknown must equal the unique population. State how many groups Other contains and preserve the full ranking in an exact table. Labels used for separate groups must remain distinguishable in that table.

## Make the PDF readable without interaction

A useful reading order is scope and snapshot, main counts, short AI-assisted observations when requested, charts, category detail, then full tables and methodology. Adjust it to the decision the reader needs to make. Avoid a cover page or repeated summaries that delay the evidence.

- Start with a single column and a familiar page size. A4 portrait, 14 to 18 mm margins and 10 to 11 pt body text are reasonable defaults; adapt to the content. Add pages instead of shrinking tables or clipping labels.
- Keep a chart with its title, axes and caption. Repeat table headers after page breaks, keep headings with their following content, and wrap long labels. Give labels enough room at the final page size; link shortened labels to full values in the table. Give long appendices clear section or page references.
- Flow short category sections consecutively rather than forcing one page per category. Use a compact evidence appendix with references back to the findings; avoid repeating the same full record in several sections. Preserve exact values and requested evidence while reducing repetition, not text size.
- Preserve every chart's data in selectable-text tables with the same aggregation, order, labels and unknown handling. Provide descriptive chart titles, real headings and a logical reading order. Use adequate contrast and verify grayscale readability; colour alone must not carry meaning.
- Use static styles and packaged assets. Do not depend on CDN scripts, remote fonts, hover states or interactive charts to make the PDF understandable.
- Read `knowledge/tasks/file-generation-pdf.md` for HTML titles, relative assets and `rootFolder`. SVG support is not documented there. If choosing SVG, supply a static fallback, such as HTML bars or a packaged image, and test that fallback. Document the chosen representation and rendering limits; local browser output does not prove platform rendering.
- Inspect an available rendered artifact for missing visuals, clipping, pagination and readable text. Task completion alone does not prove a visual rendered. If platform output is unavailable, state which local checks passed and which conversion checks remain. Do not claim PDF accessibility conformance from an HTML template alone.

## Check representative cases

Use synthetic records to check the aggregation and layout where local validation is available: one record, sparse or missing dates, known identifiers without names, one account with several source labels, missing grouping keys, identical labels on different identifiers, tied rankings, long names, overlapping categories and multi-page tables. Verify totals and visible evidence, not only template syntax. Respect the agreed no-data and failure outcomes; do not present a partial report as a complete one. Describe the actual checks and remaining limits in the existing report format.
