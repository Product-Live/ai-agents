<?xml version="1.0" encoding="UTF-8"?>
<!--
    csv-to-items.xslt (same stylesheet as the import-items-from-csv example)

    INPUT  : the Csv-To-Xml document produced by file-conversion-csv-to-xml
             (Csv-To-Xml/File/Rows/R[@i]/C[@j], 1-based row and column indexes)
    OUTPUT : the items document expected by table-import-items
             (Table/Items/Item/Identifier|Classification|Field)

    The first row (R[@i = 1]) is the header: the text of each C[@j] is the key
    written on the matching cell of every following row. A header equal to the
    identifier key produces an Identifier element, a header equal to the
    classification key produces a Classification element, every other header
    produces a Field element. Empty cells are omitted by the conversion task, so
    an empty value never reaches this stylesheet (nothing is overwritten with "").
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

    <!-- Adapt these four values to your table -->
    <xsl:param name="table_key" select="'PL_DEMO_PRODUCTS'"/>
    <xsl:param name="partition_key" select="'ACTIVES'"/>
    <xsl:param name="identifier_key" select="'EAN_13'"/>
    <xsl:param name="classification_key" select="'TYPOLOGY'"/>

    <xsl:template match="/">
        <Table key="{$table_key}">
            <Items>
                <xsl:apply-templates select="Csv-To-Xml/File/Rows/R[@i > 1]"/>
            </Items>
        </Table>
    </xsl:template>

    <xsl:template match="R">
        <Item partition="{$partition_key}">
            <xsl:apply-templates select="C"/>
        </Item>
    </xsl:template>

    <xsl:template match="C">
        <xsl:variable name="j" select="@j"/>
        <xsl:variable name="key" select="normalize-space(../../R[@i = 1]/C[@j = $j])"/>
        <xsl:variable name="value" select="normalize-space(.)"/>
        <xsl:choose>
            <xsl:when test="$key = ''"/>
            <xsl:when test="$key = $identifier_key">
                <Identifier key="{$key}"><xsl:value-of select="$value"/></Identifier>
            </xsl:when>
            <xsl:when test="$key = $classification_key">
                <Classification key="{$key}"><xsl:value-of select="$value"/></Classification>
            </xsl:when>
            <xsl:otherwise>
                <Field key="{$key}"><xsl:value-of select="$value"/></Field>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>
