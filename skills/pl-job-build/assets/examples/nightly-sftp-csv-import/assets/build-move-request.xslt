<?xml version="1.0" encoding="UTF-8"?>
<!--
    build-move-request.xslt

    INPUT  : the listing output of protocol-ftp-get (Files/File/Path, Url, Last-Modified, Size)
    OUTPUT : the Ftp-Move request expected by protocol-ftp-move: one File per fetched file,
             moved from its current path to the target folder, keeping its file name
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="xs">

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

    <!-- Target folder, with leading and trailing slash -->
    <xsl:param name="target_folder" as="xs:string" select="'/processed/'"/>

    <xsl:template match="/">
        <xsl:if test="not(Files/File)">
            <xsl:message terminate="yes">The protocol-ftp-get listing holds no file: build_move_request must run only after check_file_found has found a file; check the order of the tasks in job.json.</xsl:message>
        </xsl:if>
        <Ftp-Move>
            <xsl:for-each select="Files/File">
                <xsl:variable name="path" select="normalize-space(Path)"/>
                <xsl:variable name="name" select="tokenize($path, '/')[last()]"/>
                <File>
                    <Source-Path><xsl:value-of select="$path"/></Source-Path>
                    <Target-Path><xsl:value-of select="concat($target_folder, $name)"/></Target-Path>
                </File>
            </xsl:for-each>
        </Ftp-Move>
    </xsl:template>

</xsl:stylesheet>
