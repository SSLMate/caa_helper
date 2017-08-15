# Copyright (C) 2017 Opsmate, Inc.
#
# This Source Code Form is subject to the terms of the Mozilla
# Public License, v. 2.0. If a copy of the MPL was not distributed
# with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
# This software is distributed WITHOUT A WARRANTY OF ANY KIND.
# See the Mozilla Public License for details.

ENDPOINT = https://caarecord.org/api

-include config.mk

all: index.html

index.html: index.xml template.xslt
	xsltproc --stringparam endpoint "$(ENDPOINT)" template.xslt index.xml > $@

clean:
	rm -f index.html

ifneq ($(DESTDIR),)
install: $(FILES)
	install -m 644 index.html $(DESTDIR)/index.html
	gzip -n9 < $(DESTDIR)/index.html > $(DESTDIR)/index.htmlgz
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
