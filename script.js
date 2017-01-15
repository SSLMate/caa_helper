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

window.init_caa_helper = function (form, output, output_zonefile, output_rfc3597, output_generic) {
	"use strict";

	function aggregate (input_name) {
		var items = [];
		var inputs = form[input_name];

		for (var i = 0; i < inputs.length; ++i) {
			if (inputs[i].checked && !inputs[i].disabled) {
				items.push(inputs[i].value);
			}
		}
		return items;
	}

	function get_iodef_array () {
		var value = form.iodef.value;

		if (value !== "") {
			if (value.indexOf("mailto:") === 0 || value.indexOf("http:") === 0 || value.indexOf("https:") === 0) {
				return [value];
			}
			return ["mailto:" + value];

		}
		return [];
	}

	function array_equals (a, b) {
		if (a.length !== b.length) {
			return false;
		}
		for (var i = 0; i < a.length; ++i) {
			if (a[i] !== b[i]) {
				return false;
			}
		}
		return true;
	}

	function ensure_trailing_dot (str) {
		if (str.substr(-1) !== ".") {
			return str + ".";
		}
		return str;
	}

	function quote (str) {
		return "\"" + str.replace(/"/g, "\\\"") + "\"";
	}

	function make_unknown_record (bytes) {
		var str = "\\# " + bytes.length + " ";

		for (var i = 0; i < bytes.length; ++i) {
			var hexStr = bytes[i].toString(16).toUpperCase();

			if (hexStr.length === 1) {
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
			var bytes = [];

			bytes.push(this.flags);
			bytes.push(this.tag.length);
			for (var i = 0; i < this.tag.length; ++i) {
				bytes.push(this.tag.charCodeAt(i));
			}
			for (var k = 0; k < this.value.length; ++k) {
				bytes.push(this.value.charCodeAt(k));
			}
			return bytes;
		};
	}

	/*
	function decode_record (bytes) { // TODO
	}
	*/

	function make_records (issue, issuewild, iodef) {
		var records = [];

		if (issue.length === 0) {
			records.push(new Record(0, "issue", ";"));
		} else {
			for (var i = 0; i < issue.length; ++i) {
				records.push(new Record(0, "issue", issue[i]));
			}
		}
		if (!array_equals(issue, issuewild)) {
			if (issuewild.length === 0) {
				records.push(new Record(0, "issuewild", ";"));
			} else {
				for (var k = 0; k < issuewild.length; ++k) {
					records.push(new Record(0, "issuewild", issuewild[k]));
				}
			}
		}
		for (var ii = 0; ii < iodef.length; ++ii) {
			records.push(new Record(0, "iodef", iodef[ii]));
		}
		return records;
	}

	function set_output (output, elts) {
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

	function format_rfc3597_zone_file (domain, records) {
		var text = "";

		for (var i = 0; i < records.length; ++i) {
			text += domain + "\tTYPE257\t" + make_unknown_record(records[i].encode()) + "\n";
		}
		return text;
	}

	function create_zonefile_config (domain, records) {
		return [document.createTextNode(format_zone_file(domain, records))];
	}

	function create_rfc3597_config (domain, records) {
		return [document.createTextNode(format_rfc3597_zone_file(domain, records))];
	}

	function create_generic_config (domain, records) {
		var elts = [];

		for (var i = 0; i < records.length; ++i) {
			var li = document.createElement("li");
			var span = document.createElement("span");

			span.appendChild(document.createTextNode(records[i].format()));
			li.appendChild(span);
			elts.push(li);
		}
		return elts;
	}

	function display_records (domain, records) {
		set_output(output_zonefile, create_zonefile_config(domain, records));
		set_output(output_rfc3597, create_rfc3597_config(domain, records));
		set_output(output_generic, create_generic_config(domain, records));
		output.style.display = "block";
	}

	function hide_output () {
		output.style.display = "none";
	}

	function refresh () {
		var domain = form.domain.value;

		if (domain === "") {
			hide_output();
		} else {
			display_records(ensure_trailing_dot(domain), make_records(aggregate("issue"), aggregate("issuewild"), get_iodef_array()));
		}
	}

	for (var i = 0; i < form.elements.length; ++i) {
		var elt = form.elements[i];

		if (elt.name === "issue" || elt.name === "issuewild") {
			elt.onclick = refresh;
		}
		if (elt.name === "domain" || elt.name === "iodef") {
			elt.onchange = refresh;
			elt.onkeyup = refresh;
		}
	}

	refresh();
};
