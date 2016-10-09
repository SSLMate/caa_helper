/*
 * Copyright (C) 2016 Opsmate, Inc.
 * 
 * This Source Code Form is subject to the terms of the Mozilla
 * Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * This software is distributed WITHOUT A WARRANTY OF ANY KIND.
 * See the Mozilla Public License for details.
 */
function init_caa_helper (form, output) {
	function aggregate (input_name) {
		var items = [];
		var inputs = form[input_name];
		for (var i = 0; i < inputs.length; ++i) {
			if (inputs[i].checked) {
				items.push(inputs[i].value);
			}
		}
		return items;
	}
	function get_iodef_array () {
		var value = form["iodef"].value;
		if (value != "") {
			if (value.indexOf("mailto:") == 0 || value.indexOf("http:") == 0 || value.indexOf("https:") == 0) {
				return [ value ];
			} else {
				return [ "mailto:" + value ];
			}
		}
		return [];
	}
	function array_equals (a, b) {
		if (a.length != b.length) {
			return false;
		}
		for (var i = 0; i < a.length; ++i) {
			if (a[i] != b[i]) {
				return false;
			}
		}
		return true;
	}
	function ensure_trailing_dot (str) {
		if (str.substr(-1) != ".") {
			return str + ".";
		} else {
			return str;
		}
	}
	function quote (str) {
		return '"' + str.replace(/\"/g, "\\\"") + '"';
	}
	function make_unknown_record (bytes) {
		var str = "\\# " + bytes.length + " ";
		for (var i = 0; i < bytes.length; ++i) {
			var hexStr = bytes[i].toString(16).toUpperCase();
			if (hexStr.length == 1) {
				str += "0";
			}
			str += hexStr;
		}
		return str;
	}
	function Record (flags, tag, value) {
		this.flags = flags;
		this.tag = tag;
		this.value = value;

		this.format = function () {
			return this.flags + " " + this.tag + " " + quote(this.value);
		};
		this.encode = function () {
			var i;
			var bytes = [];
			bytes.push(this.flags);
			bytes.push(this.tag.length);
			for (i = 0; i < this.tag.length; ++i) {
				bytes.push(this.tag.charCodeAt(i));
			}
			for (i = 0; i < this.value.length; ++i) {
				bytes.push(this.value.charCodeAt(i));
			}
			return bytes;
		};
	}
	function decode_record (bytes) { // TODO
	}
	function make_records (issue, issuewild, iodef) {
		var records = [];
		var i;
		if (issue.length == 0) {
			records.push(new Record(0, "issue", ";"));
		} else {
			for (i = 0; i < issue.length; ++i) {
				records.push(new Record(0, "issue", issue[i]));
			}
		}
		if (!array_equals(issue, issuewild)) {
			if (issuewild.length == 0) {
				records.push(new Record(0, "issuewild", ";"));
			} else {
				for (i = 0; i < issuewild.length; ++i) {
					records.push(new Record(0, "issuewild", issuewild[i]));
				}
			}
		}
		for (i = 0; i < iodef.length; ++i) {
			records.push(new Record(0, "iodef", iodef[i]));
		}
		return records;
	}
	function set_output (elts) {
		while (output.hasChildNodes()) {
			output.removeChild(output.firstChild);
		}
		for (var i = 0; i < elts.length; ++i) {
			output.appendChild(elts[i]);
		}
	}
	function format_zone_file (domain, records) {
		var text = "";
		for (var i = 0; i < records.length; ++i) {
			text += domain + "\tCAA\t" + records[i].format() + "\n";
		}
		return text;
	}
	function format_legacy_zone_file (domain, records) {
		var text = "";
		for (var i = 0; i < records.length; ++i) {
			text += domain + "\tTYPE257\t" + make_unknown_record(records[i].encode()) + "\n";
		}
		return text;
	}
	function create_bind_config (domain, records) {
		var div = document.createElement("div");
		var h = document.createElement("h2");
		h.appendChild(document.createTextNode("BIND (9.9.6+)"));
		div.appendChild(h);
		var pre = document.createElement("pre");
		pre.appendChild(document.createTextNode(format_zone_file(domain, records)));
		div.appendChild(pre);
		return div;
	}
	function create_legacy_bind_config (domain, records) {
		var div = document.createElement("div");
		var h = document.createElement("h2");
		h.appendChild(document.createTextNode("BIND (Legacy)"));
		div.appendChild(h);
		var pre = document.createElement("pre");
		pre.appendChild(document.createTextNode(format_legacy_zone_file(domain, records)));
		div.appendChild(pre);
		return div;
	}
	function create_generic_config (domain, records) {
		var div = document.createElement("div");
		var h = document.createElement("h2");
		h.appendChild(document.createTextNode("Generic"));
		div.appendChild(h);
		var ul = document.createElement("ul");
		for (var i = 0; i < records.length; ++i) {
			var li = document.createElement("li");
			var span = document.createElement("span");
			span.appendChild(document.createTextNode(records[i].format()));
			li.appendChild(span);
			ul.appendChild(li);
		}
		div.appendChild(ul);
		return div;
	}
	function display_records (domain, records) {
		var elts = [];
		elts.push(create_bind_config(domain, records));
		elts.push(create_legacy_bind_config(domain, records));
		elts.push(create_generic_config(domain, records));
		set_output(elts);
	}
	function refresh () {
		var domain = form["domain"].value;
		if (domain != "") {
			display_records(ensure_trailing_dot(domain), make_records(aggregate("issue"), aggregate("issuewild"), get_iodef_array()));
		} else {
			set_output([]);
		}
	}

	for (var i = 0; i < form.elements.length; ++i) {
		var elt = form.elements[i];
		if (elt.name == "issue" || elt.name == "issuewild") {
			elt.onclick = refresh;
		}
		if (elt.name == "domain" || elt.name == "iodef") {
			elt.onchange = refresh;
			elt.onkeyup = refresh;
		}
	}

	refresh();
}
