<?xml version="1.0" encoding="UTF-8"?>
<!--
    json-to-items.xslt

    INPUT  : a dummy XML document (assets/empty.xml); the real input is the JSON
             file passed through the jsonFile parameter (a FILE user input or a
             previous task output resolves to a URL that unparsed-text() can read)
    OUTPUT : the items document expected by table-import-items

    Expected JSON shape (see tests/input-example.json):
    [
      {
        "identifiers":    { "EAN_13": "2000000000015" },
        "classification": { "TYPOLOGY": "LAPTOP" },
        "fields":         { "TITLE_EN": "...", "WEIGHT_KG": 1.4 }
      }
    ]

    json-to-xml() turns the JSON into the W3C xpath-functions vocabulary
    (array / map / string / number / boolean, each with a @key attribute).
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:j="http://www.w3.org/2005/xpath-functions"
    exclude-result-prefixes="xs j">

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

    <!-- URL of the JSON file to read; the job passes ${workflow.input.file} -->
    <xsl:param name="jsonFile" as="xs:string" select="''"/>

    <!-- Adapt these two values to your table -->
    <xsl:param name="table_key" select="'PL_DEMO_PRODUCTS'"/>
    <xsl:param name="partition_key" select="'ACTIVES'"/>

    <xsl:template match="/">
        <xsl:if test="normalize-space($jsonFile) = ''">
            <xsl:message terminate="yes">Missing parameter jsonFile: pass the JSON file to read</xsl:message>
        </xsl:if>
        <xsl:variable name="json" select="json-to-xml(unparsed-text($jsonFile))"/>
        <Table key="{$table_key}">
            <Items>
                <xsl:for-each select="$json/j:array/j:map">
                    <Item partition="{$partition_key}">
                        <xsl:apply-templates select="j:map[@key = 'identifiers']/*"/>
                        <xsl:apply-templates select="j:map[@key = 'classification']/*"/>
                        <xsl:apply-templates select="j:map[@key = 'fields']/*"/>
                    </Item>
                </xsl:for-each>
            </Items>
        </Table>
    </xsl:template>

    <xsl:template match="j:map[@key = 'identifiers']/*">
        <Identifier key="{@key}"><xsl:value-of select="normalize-space(.)"/></Identifier>
    </xsl:template>

    <xsl:template match="j:map[@key = 'classification']/*">
        <Classification key="{@key}"><xsl:value-of select="normalize-space(.)"/></Classification>
    </xsl:template>

    <!-- Strings, numbers and booleans are written as text; null values are skipped -->
    <xsl:template match="j:map[@key = 'fields']/*[not(self::j:null)]">
        <Field key="{@key}"><xsl:value-of select="normalize-space(.)"/></Field>
    </xsl:template>

    <xsl:template match="j:map[@key = 'fields']/j:null"/>

</xsl:stylesheet>
