# Asset authoring guidelines (XSLT, JavaScript, jq)

Read this file before writing or changing any script asset of a job: an XSLT stylesheet for `file-transformation-xslt`, a JavaScript file or expression for `code-execute-javascript`, a jq expression for `json-transform-jq`, and the JavaScript expressions of `SWITCH` and `DO_WHILE` tasks. The engine constraints themselves (task time limit, jq subset, XSLT parameters) are in `references/knowledge/scripting.md`; which engine a job uses is decided by `references/job-guidelines.md` (JSON first: jq and JavaScript; XSLT only when necessary); this file says how to write assets that survive real data.

## 1. Language: English unless the user asks otherwise

Names are English ASCII in every case, whatever the user asks: variable, function, template, parameter and file names. An XSLT param carries the name of the user input key it receives (`references/knowledge/scripting.md`, section 4.2), and a key never changes language.

Everything else an asset contains or produces is written in English, unless the user or an instruction file (SKILL.md, Step 0) explicitly asks for another language:

- comments;
- messages: `xsl:message`, `log()`, thrown errors, jq error strings;
- text the job shows or sends: HTML messages, email subjects and bodies, Excel headers and sheet names written by the asset, summary lines.

Writing to you in French is not a request for French output. A request is explicit: "write the email in French", "French column headers", "comments in French", or an instruction such as "jobs use French as the main language"; the requested language then applies to the comments and texts it names. An HTML message for `notification-display-message` keeps an English version: the task takes it in `request` and the translation in `requestLocal.<lang>` (documented languages: `eng`, `fra`, `deu`, `spa`), and the platform shows `request` when no entry matches the viewer's language. When the brief offers a language choice at run time (a `language` user input), the produced text follows that choice: keep one English source string and select the translation by the input value, never hard-code a single non-English language.

Values that come from the platform (titles, `Title-Local` labels, option labels, item values) are data, not text you write: output them as they are.

## 2. Read only documented shapes, and all of them

Every element, attribute or JSON property an asset reads must appear in the reference file of the task that produced the input (`references/knowledge/tasks/<task-name>.md`) or in the public documentation page it cites. Before writing a path:

1. Look up its occurrence. `1` is always present; `0..1` and `0..*` may be absent; a choice ("either A or B") means both shapes exist in real data.
2. Write code for every documented shape, including the absent one.
3. Never infer a mandatory structure from a single example: documentation examples show one shape, the occurrence column tells which shapes exist.

Example: in a screen of a schema export, a composite column is a `Column-Composite` element whose sub-columns are `Column-Field` elements, "either all within the `./Column-Composite/Section` or none of them", and the `Section` occurs `0..*`. Two shapes are documented: sub-columns grouped in sections, and sub-columns directly under the composite column. The page gives no occurrence for the sub-columns themselves, so a composite column that lists none is not documented: that it can occur is an inference, and the asset tolerates it anyway. An asset that requires the `Section` fails on tables whose composite columns list their sub-columns directly:

```xml
<!-- Shape 1: sub-columns grouped in sections (documented) -->
<Column-Composite key="BATTERIES" position="8">
    <Section key="BATTERIES" position="1">
        <Column-Field key="BATTERIES_INCLUDED" position="1"/>
    </Section>
</Column-Composite>
<!-- Shape 2: sub-columns directly under the composite column (documented) -->
<Column-Composite key="BATTERIES" position="8">
    <Column-Field key="BATTERIES_INCLUDED" position="1"/>
</Column-Composite>
<!-- Shape 3: no sub-column listed (not documented; tolerate it) -->
<Column-Composite key="BATTERIES" position="8"/>
```

The same `0..*` rule applies to the sections of the grid itself: the occurrence table gives `Grid/Common/Section` and `Grid/Specific/Section` as `0..*`, and lists `Grid/Common/Column-Identifier` directly under `Grid/Common`. Read the columns of `Common` and of each `Specific` both inside sections and directly, as for `Column-Composite`.

A tolerant XSLT reads both nesting levels, sorts the sub-columns (a column position is relative to its section) and decides what to do with an empty list:

```xml
<!-- Top level: field definitions by key, sub-fields of composite fields included (a field key is unique in a table). -->
<xsl:key name="field-by-key" match="Schema/Fields/Field | Field[@type = 'COMPOSITE']/Field" use="@key"/>

<xsl:template match="Column-Composite">
    <!-- Sub-columns may sit in sections or directly under the composite column. -->
    <xsl:variable name="sub_columns" select="(Section/Column-Field, Column-Field)"/>
    <!-- Definition of the composite field, looked up in the schema export that holds this screen. -->
    <xsl:variable name="definition" select="key('field-by-key', @key)"/>
    <xsl:choose>
        <xsl:when test="exists($sub_columns)">
            <!-- Section order first, then column order inside the section. -->
            <xsl:apply-templates select="$sub_columns">
                <xsl:sort select="(parent::Section/@position, 0)[1]" data-type="number"/>
                <xsl:sort select="@position" data-type="number"/>
            </xsl:apply-templates>
        </xsl:when>
        <xsl:otherwise>
            <!-- No sub-column listed (not documented): fall back to every sub-field of the composite definition and report it. -->
            <xsl:message>Composite column <xsl:value-of select="@key"/> lists no sub-column: exporting all its sub-fields.</xsl:message>
            <xsl:apply-templates select="$definition/Field"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>
```

A sub-column whose definition is itself `COMPOSITE` (composite fields nest up to 5 levels; how a screen lists such a sub-column is not documented) gets a fallback, its raw value or its sub-fields flattened, and a non-stopping report; never a stop.

When the documentation does not say how a shape behaves (here: which sub-fields a composite column without sub-columns displays), choose the conservative behaviour, write it in a comment and list it as an assumption in the report.

## 3. Signal a stop only on purpose

An asset signals a stop (`xsl:message terminate="yes"`, `throw new Error(...)`, jq `error(...)`) in two cases only:

1. The job's own contract is broken: a required parameter is empty, the input file is not the format the previous task documents, a key passed by the launch context does not exist.
2. The brief says the job must fail in that situation ("fail when nothing is selected").

Everything else is data the asset must handle: an optional element that is absent, a field type the job does not format specially, an empty value, a missing translation, an unknown option key. Handle it with a fallback (raw value, key instead of title, empty cell), and report it without stopping:

| Engine | Report without stopping | Signal a stop on purpose |
| -- | -- | -- |
| XSLT | `<xsl:message>` (no `terminate`), or a warning row or sheet in the output | `<xsl:message terminate="yes">`, plus the `allFilesTransformed` SWITCH and a TERMINATE `FAILED` in `job.json` |
| JavaScript | `log('...')`, or a `warnings` array in the returned object | `throw new Error('...')` |
| jq | a `warnings` array in the output object | `error("...")`, plus a SWITCH on the `error` output and a TERMINATE `FAILED` in `job.json` |

How the stop reaches the job:

- JavaScript: a `throw` fails the task, and the job stops there unless the task is `optional: true`.
- XSLT: the documentation shows both behaviours. The task page says that a file whose transformation fails is left out of `files`, that `allFilesTransformed` becomes `NO`, and that the task itself still completes; the decision-and-terminate tutorial says that `terminate="yes"` makes the task end in error, and sets `optional: true` on that task so that the job goes on to the check. Cover both: set `optional: true` on the XSLT task and follow it with a SWITCH (`javascript` evaluator, input `"transformed": "${<ref>.output.allFilesTransformed}"`, expression `"$.transformed == 'YES' ? 'OK' : 'FAILED'"`) whose `FAILED` case is a TERMINATE `FAILED` carrying the user-facing message in its `outputParameters`, as for `allEmailsSent` in `references/patterns.md` P11. The expression treats anything but `YES`, an empty value included, as a failure. XSLT has no `report` output; the failure branch supplies its own message. Without the check, the next task fails later on a missing file with an unrelated error, and the message never reaches the user.
- jq: the only documented effect of a failing expression is the `error` output ("an optional error message, indicating that the JQ query failed processing"); whether the task or the job fails is not documented. Follow the task with a SWITCH on `${<ref>.output.error}` (`javascript` evaluator, expression `"$.error ? 'FAILED' : 'OK'"`) whose `FAILED` case is a TERMINATE `FAILED` with the user-facing message.

Every stopping message says what is wrong, where (key, path or position) and what to do, in one sentence: "Screen CURRENT_VIEW not found in the schema export of table PRODUCTS: launch the job from a grid that displays a screen."

## 4. Validate values and lint the scripts before packaging

### Calendar dates from untrusted input

When accepting an AI-proposed `DATE` or `DATE-TIME`, validate the calendar date as well as its string shape. `Date.parse` can normalize an impossible day into the next month. A small check for a `YYYY-MM-DD` value is:

```javascript
function isCalendarDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + 'T00:00:00Z');
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
```

For `DATE-TIME`, validate the full documented timestamp shape and timezone, check its leading date with this function, then check that parsing succeeds. A finite timestamp alone is insufficient. Reject the proposed value with a reason according to the job's failure policy; do not silently normalize it.

### Static script checks

Lint each JavaScript script, SWITCH or loop expression and jq expression with `scripts/lint-script.js` and fix every error. The lint is a static check: it never runs the script and never proves that the job works on the platform. Cover every documented shape of section 2 in the code itself (each optional element absent, each choice branch, empty values, repeated values, missing translations), not only the shape of the documentation example.

## 5. Write for the engine that runs the asset

- XSLT: XSLT 3.0 and XPath 3.1 only, no processor-specific extension; `params[].select` values arrive as literal strings, file parameters as a path or URL string to open with `doc()` or `unparsed-text()`; declare each top-level `xsl:param` supplied by the job with a default and `as="xs:string"`, then convert inside (`xs:integer($n)`) and compare flags as strings (`normalize-space(upper-case($flag)) = 'YES'`). A `YES`/`NO` flag declared `as="xs:boolean"` cannot receive `YES`; whether the platform passes `xs:string` or untyped values is not documented. Declare `encoding="UTF-8"` on `xsl:output`; use `xsl:key` for lookups on large exports instead of repeated path searches.
- JavaScript (`code-execute-javascript`): standard ECMAScript, no network, no modules, 10 minutes per task; read inputs from `$.data` and `$.resources`, return the result, `throw` to fail. A script that writes XML or HTML (the request of another task, an email) escapes every value and returns one file per execution (`references/job-guidelines.md`, section 6.3).
- JavaScript expressions of `SWITCH` and `DO_WHILE`: write ES5 syntax (no `let`, `const`, arrow functions or template literals) and no side effects; this is a conservative convention of these skills, the documentation states no language version.
- jq: the platform subset has no date functions; guard optional paths with `?` and `// default`. The expression is written inline in `queryExpression`, a JSON string on one line with inner double quotes escaped: the task takes no expression file. When the logic no longer fits on a readable line, move it to `code-execute-javascript` with `expressionFile`.

## 6. Make the asset easy to read and to change

- One responsibility per template, function or jq definition, with a short English comment that says why, not what.
- Parameters for everything the user may change (keys, labels, file names); no account-specific value buried in the code.
- Deterministic output: explicit sort keys, stable column order, no dependency on the order of a map.
- The header comment of each asset states its input (which task output), its parameters, its output (which task consumes it) and the assumptions of section 2.

## Checklist before packaging

- [ ] Every name is English ASCII; every comment and produced text is English, unless the user explicitly asked for another language (a display message then keeps its English `request` and adds `requestLocal.<lang>`).
- [ ] Every path read is documented, and every documented shape (absent optional elements, both sides of a choice, columns inside or outside sections) is handled.
- [ ] The asset signals a stop only on a broken contract or when the brief says fail; every other case has a fallback and a non-stopping report.
- [ ] An XSLT that can stop on purpose runs in an `optional: true` task followed by a SWITCH on `allFilesTransformed` that ends in TERMINATE `FAILED`; a jq expression that can call `error(...)` on purpose is followed by a SWITCH on `error` that ends the same way.
- [ ] Every stopping message names the problem, the place and the remedy.
- [ ] Every top-level stylesheet parameter supplied by the job has a default and `as="xs:string"`.
- [ ] Every JavaScript script, SWITCH or loop expression and jq expression passes `scripts/lint-script.js` without error.
