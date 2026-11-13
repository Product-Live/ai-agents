<?xml version="1.0" encoding="UTF-8"?>
<!--
    import-report-email.xslt

    INPUT  : the report output of table-import-items
             (Report[@task][@date]/Input[@name], Log[@type]/Metadata[@name], Metadata-Collection, Message)
    OUTPUT : an HTML email for notification-send-email. Recipients and subject travel as
             <meta name="pl-mail-to"> and <meta name="pl-mail-subject"> in the head.

    The output method is xml so that the meta elements are serialised exactly as
    <meta name="..." content="..."/>, the form shown in the task documentation.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="xs">

    <xsl:output method="xml" indent="yes" encoding="UTF-8" omit-xml-declaration="yes"/>

    <!-- Recipients, separated by ; (the task splits on ; and does not trim) -->
    <xsl:param name="recipients" as="xs:string" select="''"/>
    <!-- URL of the protocol-ftp-get listing, read with document() to name the imported file -->
    <xsl:param name="listing" as="xs:string" select="''"/>
    <xsl:param name="subject_prefix" as="xs:string" select="'Nightly CSV import'"/>

    <xsl:variable name="errors" select="count(/Report/Log[@type = 'error'])"/>
    <xsl:variable name="warnings" select="count(/Report/Log[@type = 'warning'])"/>
    <xsl:variable name="infos" select="count(/Report/Log[@type = 'info'])"/>
    <xsl:variable name="file_name">
        <xsl:choose>
            <xsl:when test="normalize-space($listing) != ''">
                <xsl:value-of select="tokenize(normalize-space(document($listing)/Files/File[1]/Path), '/')[last()]"/>
            </xsl:when>
            <xsl:otherwise>unknown file</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="status" select="if ($errors > 0) then 'with errors' else 'OK'"/>

    <xsl:template match="/">
        <xsl:if test="normalize-space($recipients) = ''">
            <xsl:message terminate="yes">Missing parameter recipients: set the import_report_recipients variable</xsl:message>
        </xsl:if>
        <html lang="en">
            <head>
                <meta charset="UTF-8"/>
                <meta name="pl-mail-to" content="{normalize-space($recipients)}"/>
                <meta name="pl-mail-subject" content="{$subject_prefix} - {$file_name} - {$status}"/>
                <style>
                    body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222222; }
                    table { border-collapse: collapse; margin-top: 12px; }
                    th, td { border: 1px solid #cccccc; padding: 4px 8px; text-align: left; vertical-align: top; }
                    th { background: #f0f0f0; }
                    .error { color: #b00020; }
                </style>
            </head>
            <body>
                <p>The nightly import of <b><xsl:value-of select="$file_name"/></b> ended <b><xsl:value-of select="$status"/></b>.</p>
                <ul>
                    <li>Errors: <xsl:value-of select="$errors"/></li>
                    <li>Warnings: <xsl:value-of select="$warnings"/></li>
                    <li>Information entries: <xsl:value-of select="$infos"/></li>
                </ul>
                <xsl:if test="/Report/Log">
                    <table>
                        <tr>
                            <th>Type</th>
                            <th>Code</th>
                            <th>Identifier</th>
                            <th>Message</th>
                        </tr>
                        <xsl:for-each select="/Report/Log">
                            <tr>
                                <td><xsl:value-of select="@type"/></td>
                                <td><xsl:value-of select="Metadata[@name = 'code']"/></td>
                                <td>
                                    <xsl:for-each select="Metadata-Collection[@name = 'identifier']/Metadata">
                                        <xsl:value-of select="concat(@name, ': ', .)"/>
                                        <xsl:if test="position() != last()"><br/></xsl:if>
                                    </xsl:for-each>
                                </td>
                                <td><xsl:value-of select="normalize-space(Message)"/></td>
                            </tr>
                        </xsl:for-each>
                    </table>
                </xsl:if>
                <p>Report date: <xsl:value-of select="/Report/@date"/>. The full report is attached to the job execution in Data Factory.</p>
            </body>
        </html>
    </xsl:template>

</xsl:stylesheet>
