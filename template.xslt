<!--
	Copyright (C) 2017 Opsmate, Inc.

	This Source Code Form is subject to the terms of the Mozilla
	Public License, v. 2.0. If a copy of the MPL was not distributed
	with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

	This software is distributed WITHOUT A WARRANTY OF ANY KIND.
	See the Mozilla Public License for details.
-->
<xsl:stylesheet version="1.0"
	exclude-result-prefixes="caa xhtml"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xhtml="http://www.w3.org/1999/xhtml"
	xmlns:caa="http://xmlns.sslmate.com/caa"
	xmlns="http://www.w3.org/1999/xhtml">

	<xsl:output
		method="html"
		encoding="UTF-8"
		indent="no"
		doctype-system="about:legacy-compat"
		omit-xml-declaration="yes" />

	<xsl:param name="endpoint"/>

	<xsl:template mode="copy" match="comment()" priority="11"/>
	<xsl:template mode="copy" match="@*|node()" priority="10">
		<xsl:copy>
			<xsl:apply-templates mode="copy" select="@*|node()"/>
		</xsl:copy>
	</xsl:template>
	<xsl:template match="/" priority="20">
		<xsl:apply-templates select="/page"/>
	</xsl:template>
	<xsl:template match="page">
		<html xml:lang="en" lang="en">
			<head>
				<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title><xsl:value-of select="title"/></title>
				<meta name="robots" content="noarchive" />
				<link rel="icon" type="image/png" href="https://sslmate.com/assets/img/favicon.png" />
				<link rel="stylesheet" type="text/css" href="style.css" />
				<script type="text/javascript">
					var caa_endpoint = '<xsl:value-of select="$endpoint"/>';
				</script>
				<xsl:apply-templates mode="copy" select="head/node()"/>
			</head>
			<body>
				<a id="github_ribbon" href="https://github.com/SSLMate/caa_helper"></a>
				<div id="root">
					<div id="masthead">
						<h1>CAA Record Generator</h1>
						<p class="by">By <a href="https://sslmate.com">SSLMate</a></p>
					</div>

					<xsl:apply-templates mode="copy" select="body/node()"/>
				</div>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
