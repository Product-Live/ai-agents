<?xml version="1.0" encoding="UTF-8"?>
<!--
    build-export-request.xslt

    INPUT  : a dummy document (assets/start.xml)
    OUTPUT : the Items-Request document consumed by table-export-items in REQUEST mode,
             filtering on the identifier EAN_13 with one Value per requested EAN
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="xs">

    <!-- Comma-separated list of the EAN values to export -->
    <xsl:param name="eans" as="xs:string" select="''"/>

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

    <xsl:template match="/">
        <xsl:if test="normalize-space($eans) = ''">
            <xsl:message terminate="yes">Missing parameter eans: launch this job from init-table-from-owner-items, or pass eansCsv (comma-separated EAN codes) in the execution input.</xsl:message>
        </xsl:if>
        <Items-Request>
            <Filters>
                <Filter-Identifier key="EAN_13" operator="EQUALS">
                    <xsl:for-each select="tokenize($eans, ',')[normalize-space(.) != '']">
                        <Value><xsl:value-of select="normalize-space(.)"/></Value>
                    </xsl:for-each>
                </Filter-Identifier>
            </Filters>
        </Items-Request>
    </xsl:template>

</xsl:stylesheet>
