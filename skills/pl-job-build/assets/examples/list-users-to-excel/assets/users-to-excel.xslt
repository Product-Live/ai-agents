<?xml version="1.0" encoding="UTF-8"?>
<!--
    users-to-excel.xslt

    INPUT  : the XML rendering of a data-user-find result (outputs[].mediaType application/xml):
             an xpath-functions document, m:array/m:map with one m:string per user property
    OUTPUT : the Generate-Excel request expected by file-generation-xlsx
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:m="http://www.w3.org/2005/xpath-functions"
    exclude-result-prefixes="xs m">

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

    <xsl:template match="/m:array">
        <Generate-Excel>
            <File>
                <File-Name>users.xlsx</File-Name>
                <Template-Key>report</Template-Key>
                <Sheets>
                    <Sheet>
                        <Sheet-Name>Users</Sheet-Name>
                        <Cells>
                            <Cell-Text line="1" column="1">Id</Cell-Text>
                            <Cell-Text line="1" column="2">Created At</Cell-Text>
                            <Cell-Text line="1" column="3">Updated At</Cell-Text>
                            <Cell-Text line="1" column="4">First Name</Cell-Text>
                            <Cell-Text line="1" column="5">Last Name</Cell-Text>
                            <Cell-Text line="1" column="6">Email</Cell-Text>
                            <Cell-Text line="1" column="7">Status</Cell-Text>
                            <Cell-Text line="1" column="8">Role</Cell-Text>
                            <xsl:apply-templates select="m:map"/>
                        </Cells>
                    </Sheet>
                </Sheets>
            </File>
        </Generate-Excel>
    </xsl:template>

    <xsl:template match="m:map">
        <xsl:variable name="line" select="position() + 1"/>
        <Cell-Text line="{$line}" column="1"><xsl:value-of select="m:string[@key = 'id']"/></Cell-Text>
        <Cell-Text line="{$line}" column="2"><xsl:value-of select="m:string[@key = 'createdAt']"/></Cell-Text>
        <Cell-Text line="{$line}" column="3"><xsl:value-of select="m:string[@key = 'updatedAt']"/></Cell-Text>
        <Cell-Text line="{$line}" column="4"><xsl:value-of select="m:string[@key = 'firstName']"/></Cell-Text>
        <Cell-Text line="{$line}" column="5"><xsl:value-of select="m:string[@key = 'lastName']"/></Cell-Text>
        <Cell-Text line="{$line}" column="6"><xsl:value-of select="m:string[@key = 'email']"/></Cell-Text>
        <Cell-Text line="{$line}" column="7"><xsl:value-of select="m:string[@key = 'status']"/></Cell-Text>
        <Cell-Text line="{$line}" column="8"><xsl:value-of select="m:string[@key = 'role']"/></Cell-Text>
    </xsl:template>

</xsl:stylesheet>
