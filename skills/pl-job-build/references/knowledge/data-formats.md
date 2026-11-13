# Data formats

> Reference token: DF-DATA-FORMATS-01

The platform is strict about dates, numbers, encodings, file names and identifiers; a value that does not follow these formats is not imported as expected, and the import task still completes: read its report.
This file collects the documented formats for dates, numbers, booleans, encodings, file names and paths, language codes, whitespace and identifier normalisation, CSV conventions and XML / JSON hygiene.

## 1. Dates

- Format: ISO 8601 on import ("Format used is ISO8601"); exports give the item creation and update dates in UTC (`Z` suffix, as in `2020-04-10T13:40:23.830Z`).
- `DATE` fields accept a date (`2020-04-10`); `DATE-TIME` fields accept a date and time (`2020-04-10T13:40:23.830Z`, "Z means UTC").
- How other ISO 8601 forms (reduced precision, week dates, offsets) or an invalid date are handled is not documented: write `YYYY-MM-DD` for `DATE` and `YYYY-MM-DDTHH:mm:ss.sssZ` for `DATE-TIME` (recommendation), never `15/02/2022` or a space instead of `T`.
- The job context `triggerAt` and `DATE` user inputs are ISO strings in UTC (`2026-04-22T00:00:00.000Z`).
- Criteria on `createdAt` or `updatedAt`: "When searching for an entity on an exact createdAt or updatedAt date, you must use the caseSensitive: true parameter."
- jq has no date functions on the platform; compute dates in a `code-execute-javascript` task (`new Date().toISOString()`) or in XSLT (`current-dateTime()`, `format-dateTime()`) and pass them as data.

## 2. Numbers

Documented rules for `NUMBER` values (item import, quantities, XSLT outputs feeding imports):

- Only `.` as decimal separator; no thousands separator; no spaces inside; no letters, units or exponents.
- Maximum 15 digits in total; optional `-` or `+` sign; leading and trailing spaces are removed; `.1` is read as `0.1` and `1.` as `1`.
- Valid: `1`, `-1`, `+1`, `1.1`, `.1`, `1.`, `1000`. Invalid: `1 000`, `1,1`, `1,000.1`, `10e5`, `10 cm`, `Infinity`, `1/3`, `one`, `0x08`.
- On import, the unit goes in the `suffix` attribute (`<Field key="PRICE" suffix="EURO">12.9</Field>`), never in the value. With an invalid number or an unknown suffix key, "neither the value nor the unit are imported"; without a unit, the default unit of the field applies.
- `TEXT` user inputs are strings even when numeric; convert them where used.
- Precision is a display setting of the field (`Precision` 0 to 5); store the full value.

## 3. Booleans

- In `job.json`, `optional`, `required`, `multiple`, `allowPartial`, `failOnError`, `skipReportGeneration` are JSON booleans (`true` / `false`), never the strings `"true"` / `"false"`.
- Task outputs that answer yes or no are `ENUM` strings `YES` / `NO` (`noFile`, `allFilesTransformed`, `allFilesGenerated`, `allFilesValid`, `allEmailsSent`), to be tested as strings in a `SWITCH`. Some inputs follow the same convention (`skipItemRefresh: "YES"`).
- Treat XSLT params as strings (convention of these skills, see `scripting.md` section 4.2): published jobs pass `yes` / `no` and compare with `normalize-space(upper-case($p)) = 'YES'`.
- The documented field data types include no boolean type: model flags as `SINGLE-SELECT` options (recommendation).

## 4. Encodings

- UTF-8 end to end. CSV and JSON input files must be UTF-8 (documented limit of the conversion tasks). Declare UTF-8 in every generated XML, CSV and HTML file (recommendation).
- XSLT: `<xsl:output method="xml" indent="yes" encoding="UTF-8" />` is required; "@encoding always set UTF-8"; `@method` (`xml`, `html`, `xhtml`, `text`, `json`) must match the extension of the task's `fileName`.
- `code-execute-javascript` resources take an `encoding` per resource, `utf-8` by default (the other accepted values are not listed); convert a partner file that is not UTF-8 before it reaches a conversion task.
- Recommendation: check accents and symbols in converted and generated files; an encoding mismatch shows up as wrong characters.
- XML documents start with `<?xml version="1.0" encoding="UTF-8"?>`.

## 5. File names and paths

- Archive paths use a Unix-style representation relative to the archive root, where the leading `/` is optional (`/folder-1/image-1.jpg` is the same path without its first slash). The archive task reports invalid values in its report (for example `INVALID_ARCHIVE_NAME`, `INVALID_INPUT`), and a 2023 release note mentions the detection of Windows reserved words. The precise naming rules are not documented: keep names short and portable (letters, digits, `-`, `_` and `.`, no spaces, no Windows reserved names such as `con` or `nul`), as a recommendation.
- Task `fileName` inputs name the output file; in `FILES` and `REQUEST` modes an index is appended before the extension (`products1.xml`, `products2.xml`), so never rely on generated names: reference files through `${<ref>.output.file}` / `files`.
- Use an extension consistent with the content (`.xml`, `.csv`, `.html`, `.json`, `.xlsx`); for an XSLT output, the `xsl:output` method "must be the same as the extension" of `fileName`.
- Keep asset names kebab-case and ASCII (convention of these skills); the ZIP extension of packages is `.job.zip`.
- FTP: "Always create one folder for one type of file" and "Always limit the number of files on a FTP folder" (documented best practices); select files with a regex `filter` (`-products\\.xml$` ends with, `^products` starts with). Recommendation of these skills: `maxFiles: 1` with `sort: LAST_MODIFIED_ASC` when processed files are moved to a `processed` folder (a backlog drains oldest first), `LAST_MODIFIED_DESC` only when the newest file supersedes the older ones (with `maxFiles: 1` it leaves older files in the folder).

## 6. Language codes

ISO 639-3 codes are used everywhere a language is named: `titleLocal` / `descriptionLocal` in `job.json`, `Title-Local lang="..."` in schema imports, `requestLocal` of display messages.

| Code | Language |
| -- | -- |
| `ara` | Arabic |
| `zho` | Chinese |
| `eng` | English |
| `fra` | French |
| `deu` | German |
| `hin` | Hindi |
| `ita` | Italian |
| `jpn` | Japanese |
| `kor` | Korean |
| `nld` | Dutch |
| `por` | Portuguese |
| `rus` | Russian |
| `spa` | Spanish |

"If you need more languages we can add it on demand." Two-letter codes (`fr`, `en`) are not valid. Multilingual text fields are modelled as one field per language (documented best practice), with the language in the key as in the documentation examples (`TITLE_EN`, `DESCRIPTION_EN`).

## 7. Whitespace, trimming and identifier normalisation

- White space characters (developer reference, after ECMA-262): TAB, VT, FF, SPACE, NBSP, ZWNBSP. An element key must not consist only of white space.
- Leading and trailing spaces are removed from identifier values and from numbers on import; for the other field types the trimming rule is not documented, so trim values in the XSLT that builds the import (recommendation).
- Category keys with leading or trailing spaces are rejected on import (a 2026 release note added the check "preventing silent data corruption on existing items", and the schema page says the same for field keys): trim every key generated by an XSLT with `normalize-space()`.
- Identifier values are compared without taking case and accents into account, and after removing leading and trailing spaces: a value written without accents (`Pole qualite`) updates the item whose identifier carries them, and `REF-001` matches `ref-001`. Uniqueness spans all partitions of the table. References that are only unique with their case or accents must be modelled as `SINGLE-LINE-TEXT` fields, not identifiers. Maximum length 50 characters.
- Option, category and classification values are matched by key (`<Field key="COLOR">RED</Field>`), never by title.
- Keys of the data model: upper case, English, words separated by `_`, short (`PRODUCTS`, `ORDER_DETAILS`, `TITLE_EN`), as the documentation advises for new structures; when connecting an existing system, the best practices page says to reuse its keys or ids. Documented naming best practices: plural for tables and partitions, singular for levels, identifiers, classifications and categories.

## 8. CSV conventions

The `file-conversion-csv-to-xml` task turns a CSV into a generic grid (`Csv-To-Xml/File/Rows/R[@i]/C[@j]`, 1-based rows and cells, no indentation) that an XSLT then maps:

```json
{
  "name": "file-conversion-csv-to-xml",
  "taskReferenceName": "csv_to_xml",
  "description": "Convert the supplier CSV to XML",
  "optional": false,
  "type": "SUB_WORKFLOW",
  "inputParameters": {
    "mode": "FILE",
    "file": "${ftp_get.output.file}",
    "columnSeparator": ";",
    "textDelimiter": "\"",
    "escapeCharacter": "\"",
    "allowEmpty": false,
    "fileName": "products.xml"
  }
}
```

| Setting | Documented value |
| -- | -- |
| `columnSeparator` | usually `;`, `,` or `|` (required) |
| `textDelimiter` | usually `"` or `'` (required) |
| `escapeCharacter` | the escape for the delimiter inside text, usually the same as `textDelimiter` (`"Produit 1";"Tele 51"" ou plus"`) (required) |
| `allowEmpty` | `false` by default: empty cells are omitted from the XML; `true` keeps them |
| Header row | not a setting: the first row is `R[@i='1']`; the XSLT decides whether it is a header |
| Encoding | UTF-8 only; `.txt` files work (the extension is not checked); 250 MB maximum |

Conversion rules: illegal XML characters are removed; only `&`, `<`, `>` are encoded; no CDATA; in `FILES` mode a file whose conversion fails still yields a `<File>` element with no rows and `allFilesTransformed` is `NO` (count rows, not files).

CSV produced by an XSLT (`method="text"`) must follow the same conventions for the consumer: declare the separator, quote fields that contain it, double the quotes inside quoted fields, end lines with LF, write UTF-8.

## 9. XML and JSON hygiene

XML:

- Always a single root element and an XML declaration with UTF-8.
- Escape `&`, `<`, `>` (and quotes inside attributes) with entities; the conversion tasks never emit CDATA. Rule and formula templates are wrapped in `<![CDATA[...]]>` "to prevent the XML parser from interpreting special characters (such as `<`, `>`, `&`) as XML markup" (rules engine templates guide).
- Put HTML only in `HTML-TEXT` fields, "a long text field that can be formatted with html" (recommendation).
- Write XPaths that identify nodes uniquely (`Identifier[@key='EAN_13']`), avoid `//`, and declare namespaces (`xmlns="http://www.w3.org/2005/xpath-functions"` for the JSON-in-XML grammar used by data task requests and `json-to-xml()`).
- Validate generated request documents with `file-validation-xsd` and the platform `xsdKey` catalogue before feeding them to the consuming task.

JSON:

- `job.json` and every JSON asset: strict JSON, no comments, no trailing commas, double quotes only.
- Keep `schema` a string (`"1.0"`), `optional` a boolean, `timeoutSeconds` and `height` numbers.
- jq expressions live in `queryExpression` strings: escape inner double quotes (`\"`).
- JSON produced by a script with `response: "FILE"` is written as returned (objects are serialised); produce plain objects and arrays, not class instances or `undefined` values.
- Option field values in criteria take the option key (`"value": "NEW"`), not the label; `MULTIPLE-SELECT` and `COMPOSITE` fields are not searchable through criteria; `HTML-TEXT` values include their tags.

## Common mistakes

| Mistake | Correct form |
| -- | -- |
| `15/02/2022` or `2022-02-15 10:00:00` in a date field | `2022-02-15` or `2022-02-15T10:00:00.000Z` |
| `1 299,90` in a number field | `1299.90` with the currency as `suffix` |
| `"optional": "false"` | `"optional": false` |
| Comparing an `ENUM` output with a boolean | string cases `"YES"` / `"NO"` |
| XSLT output declared `method="xml"` for a `report.html` file | `method="html"` and a matching extension |
| Latin-1 CSV sent to `file-conversion-csv-to-xml` | convert to UTF-8 first |
| `fr` / `en` language codes | `fra` / `eng` |
| Keys with trailing spaces or lower case generated by an XSLT | `normalize-space(upper-case(...))` |
| Identifier values that differ only by case or accents | model them as text fields |
| Relying on `products1.xml` naming of generated files | reference `${<ref>.output.files}` |
| Comments or trailing commas copied from documentation samples into `job.json` | strict JSON |
