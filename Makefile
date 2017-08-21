# Copyright (C) 2017 Opsmate, Inc.
#
# This Source Code Form is subject to the terms of the Mozilla
# Public License, v. 2.0. If a copy of the MPL was not distributed
# with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
# This software is distributed WITHOUT A WARRANTY OF ANY KIND.
# See the Mozilla Public License for details.

ENDPOINT = https://sslmate.com/caa/api

-include config.mk

all: index.html support.html

index.html: index.xml template.xslt cas.xml
	xsltproc --stringparam endpoint "$(ENDPOINT)" template.xslt index.xml > $@

support.html: support.xml template.xslt
	xsltproc --stringparam endpoint "$(ENDPOINT)" template.xslt support.xml > $@

cas.xml: CAInformationReportCSVFormat mkcasxml.go
	sed '1 d' < CAInformationReportCSVFormat | go run mkcasxml.go > cas.xml

CAInformationReportCSVFormat:
	curl -sS https://ccadb-public.secure.force.com/mozilla/CAInformationReportCSVFormat > CAInformationReportCSVFormat

clean:
	rm -f *.html

ifneq ($(DESTDIR),)
install: $(FILES)
	install -m 755 -d $(DESTDIR)
	install -m 644 index.html $(DESTDIR)/index.html
	gzip -n9 < $(DESTDIR)/index.html > $(DESTDIR)/index.htmlgz
	install -m 644 support.html $(DESTDIR)/support.html
	gzip -n9 < $(DESTDIR)/support.html > $(DESTDIR)/support.htmlgz
	yui-compressor --type js --nomunge < generator.js > $(DESTDIR)/generator.js
	gzip -n9 < $(DESTDIR)/generator.js > $(DESTDIR)/generator.jsgz
	yui-compressor --type css < style.css > $(DESTDIR)/style.css
	gzip -n9 < $(DESTDIR)/style.css > $(DESTDIR)/style.cssgz
	install -m 644 github_ribbon.png $(DESTDIR)/github_ribbon.png
else
install:
	@echo "Please set DESTDIR variable to use 'make install'"
	@false
endif

.PHONY: all clean install
