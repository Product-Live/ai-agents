# Writing and reviewing job stylesheets

Read the calling task in `job.json` and the first consumer of its output. Use `knowledge/tasks/file-transformation-xslt.md` for the task contract and `asset-guidelines.md` for parameter types, output encoding and deliberate failures. Apply the following checks to the affected mapping.

## Match the task to the stylesheet

- Identify the principal XML document and each file passed in a parameter. Match every supplied parameter name to its top-level `xsl:param`. Check what an omitted optional parameter does before calling `doc()` on it. A spelling error can leave a default in use.
- Check the output method against the consumer. For a task returning a string, follow the reference to its `result` output. For a task transforming several files, check how the consumer handles partial success when the brief requires every file. [Product-Live transformation task](https://learn.product-live.com/data-factory/references/tasks/file-transformation-xslt/)

## Choose the mapping

- For a join, identify the row key, its scope and the intended number of matches. Preserve leading zeros in text identifiers. Handle missing and duplicate keys according to the brief. Selecting the first match with `[1]` can hide a duplicate. A general comparison such as `$a = $b` succeeds if any pair matches. Use it for membership. When matching a pair of fields, compare both fields on the same candidate row. [XPath comparisons](https://www.w3.org/TR/xpath-31/#id-general-comparisons)
- Use a scoped path for a single lookup. For repeated lookups across documents, bind the lookup document outside the row loop and declare an `xsl:key`. For example, `key('row-by-code', $code, $lookupDoc)` searches the supplied document even when the current row is in another tree. Guard an empty key when it has no business meaning. [XSLT keys](https://www.w3.org/TR/xslt-30/#key)
- Bind element names to the namespace URI of the input, including when its XML uses a default namespace. A test document with no namespace can hide a path that selects nothing in the intended input. [XPath node tests](https://www.w3.org/TR/xpath-31/#id-node-tests)
- For an edit that must preserve the rest of a document, use a mode with `on-no-match="shallow-copy"` and a template matching just the changed nodes. For a new export with a fixed set of fields, construct that output explicitly. [XSLT built-in template rules](https://www.w3.org/TR/xslt-30/#built-in-rule)

## Keep the XPath context visible

Inside a predicate, `.` is the candidate being filtered. In nested loops, bind the outer value before entering the inner selection. For example, `$catalog/Entry[@code = @code]` compares each entry's code with itself. Capture the code while the input row is still in scope.

```xml
<xsl:variable name="rowCode" as="xs:string" select="string(@code)"/>
<xsl:variable name="matches" as="element(Entry)*"
              select="$catalog/Entry[@code = $rowCode]"/>
```

Here `$catalog` holds the parent element of the entries. A fixture with row code `B` and entries `A` and `B` should select only `B`. If this lookup repeats across many rows, apply the key guidance above. Keep a simple `xsl:for-each` when the output is a fixed list. Use matching templates when child elements require different processing or the input is recursive. Name a mode when the same nodes have a second rendering, such as a summary and a detail view. [XPath predicates](https://www.w3.org/TR/xpath-31/#id-predicates) and [Refactoring XSLT](https://datypic.com/services/xslt/refactoring.pdf)

## Keep computed values typed until output

Use `select` for a calculated variable. A variable with content and no `as` or `select` can hold an implicit document node. Testing that node gives true even when its text is `false`. For example, write `<xsl:variable name="hasRows" as="xs:boolean" select="exists(Row)"/>` and test `$hasRows`. An input with no rows exercises the false branch. [XPath effective boolean value](https://www.w3.org/TR/xpath-31/#id-ebv)

Give a reusable calculation a function with an explicit result type. Use `xsl:sequence` to return its value. Reserve `xsl:value-of` for a point where the output needs text. For example, this function takes zero or one amount element and returns an optional decimal. It assumes the stylesheet binds `f` to its own function namespace and `xs` to the XML Schema namespace.

```xml
<xsl:function name="f:amount" as="xs:decimal?">
  <xsl:param name="amount" as="element(Amount)?"/>
  <xsl:sequence select="if ($amount castable as xs:decimal)
                        then xs:decimal($amount) else ()"/>
</xsl:function>
```

For this contract, `<Amount>0</Amount>` returns zero. A missing or malformed amount returns the empty sequence. Test presence with `exists($amountValue)` so zero survives. If the brief requires malformed values to be reported separately, keep the original input for that check. Apply numeric formatting at the output boundary. For text, `normalize-space()` also collapses internal whitespace. Use it only when the field permits that change. [XPath casting](https://www.w3.org/TR/xpath-31/#id-castable) and [normalize-space](https://www.w3.org/TR/xpath-functions-31/#func-normalize-space)

## Make grouping and serialization deliberate

- To emit one summary per code, group once with `xsl:for-each-group` and compute each summary from `current-group()`. Choose `group-by="@code"` for all rows sharing a code. Choose `group-adjacent="@code"` when consecutive runs carry meaning and each row has one code. For the keys `A, B, A`, the first approach yields two groups and the second yields three. With `group-by="@code"`, a row missing that attribute belongs to no group. Decide where it should appear before computing totals. [XSLT grouping](https://www.w3.org/TR/xslt-30/#grouping)
- Construct XML or HTML with literal elements, attribute value templates and text nodes. For example, `<Entry code="{@code}"><xsl:value-of select="Label"/></Entry>` lets the serializer escape values in their proper positions. Concatenating tags and using `disable-output-escaping` makes the result depend on serialization and the input text. Include an ampersand in a synthetic label and a quote in an attribute value. Assert their parsed values. [XML serialization](https://www.w3.org/TR/xslt-xquery-serialization-31/#xml-output)

## Diagnose and test the result

Start with one synthetic input that distinguishes the intended behavior from the suspected error. For a join, put the same code in two documents with different labels and assert the label from the intended document. Add an unmatched or duplicate row when its handling matters. For a selective update, check the changed value and an adjacent subtree that should survive.

For a regression, identify the smallest input that reproduces the change. Assert the new behavior and an unaffected case. If the previous output matters, use a trusted saved expectation or run the previous and current job versions on the same fixture through the extension's MCP. Keep the versions in separate job folders for that comparison. For a volume issue, vary synthetic row counts and report the observed counts or timings for the cases actually run.

All stylesheet runs, including quick checks and baseline comparisons, use the Product-Live VS Code extension through its MCP. Follow `local-tests.md` for discovery, supported suites, run evidence and connection blockers. If execution is unavailable, report the static finding, the expected result and the untested case.
