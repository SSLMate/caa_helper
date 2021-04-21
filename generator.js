/*
 * Copyright (C) 2016-2017 Opsmate, Inc.
 * 
 * This Source Code Form is subject to the terms of the Mozilla
 * Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * This software is distributed WITHOUT A WARRANTY OF ANY KIND.
 * See the Mozilla Public License for details.
 */
function init_caa_generator (caa_endpoint, certspotter_endpoint, form, ca_table, output_zonefile, output_rfc3597, output_tinydns, output_dnsmasq, output_generic, certspotter_link) {
	var session_id = null;
	try {
		var random_bytes = new Uint8Array(16);
		window.crypto.getRandomValues(random_bytes);
		session_id = Array.from(random_bytes).map(function(b) { return b.toString(16).padStart(2, "0") }).join("");
	} catch (e) {
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
	function strip_trailing_dot (str) {
		if (str.substr(-1) == ".") {
			return str.substr(0, str.length - 1);
		} else {
			return str;
		}
	}
	function make_dictionary (items) {
		var dict = {};
		for (var i = 0; i < items.length; ++i) {
			dict[items[i]] = true;
		}
		return dict;
	}
	function quote (str) {
		return '"' + str.replace(/\"/g, "\\\"") + '"';
	}
	function make_hex_string (bytes) {
		var str = "";
		for (var i = 0; i < bytes.length; ++i) {
			var hexStr = bytes[i].toString(16).toUpperCase();
			if (hexStr.length == 1) {
				str += "0";
			}
			str += hexStr;
		}
		return str;
	}
	function make_unknown_record (bytes) {
		return "\\# " + bytes.length + " " + make_hex_string(bytes);
	}
	function make_tinydns_generic_record (bytes) {
		var str = "";
		for (var i = 0; i < bytes.length; ++i) {
			str += "\\";
			var octalStr = bytes[i].toString(8);
			if (octalStr.length == 1) {
				str += "00";
			} else if (octalStr.length == 2) {
				str += "0";
			}
			str += octalStr;
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
	function decode_record (bytes) {
		function decode_string (bytes) {
			var str = "";
			for (var i = 0; i < bytes.length; ++i) {
				str += String.fromCharCode(bytes[i]);
			}
			return str;
		}

		if (bytes.length < 2) {
			return null;
		}
		var flags = bytes[0];
		var tag_len = bytes[1];
		var tag = decode_string(bytes.slice(2, 2 + tag_len));
		var value = decode_string(bytes.slice(2 + tag_len));
		return new Record(flags, tag, value);
	}
	function add_unknown_ca_to_form (identifier, allow_issue, allow_issuewild) {
		function create_name_col () {
			var th = document.createElement("th");
			th.className = "name_col";
			th.appendChild(document.createTextNode(identifier));
			return th;
		}
		function create_checkbox_col (className, inputName, checked) {
			var td = document.createElement("td");
			td.className = className;
			var input = document.createElement("input");
			input.type = "checkbox";
			input.name = inputName;
			input.value = identifier;
			input.checked = checked;
			input.onclick = refresh;
			td.appendChild(input);
			return td;
		}

		var tr = document.createElement("tr");
		tr.appendChild(create_name_col());
		tr.appendChild(create_checkbox_col("nonwild_col", "issue", allow_issue));
		tr.appendChild(create_checkbox_col("wild_col", "issuewild", allow_issuewild));
		ca_table.tBodies[0].appendChild(tr);
	}
	function iodef_from_form (value) {
		if (value == "" || value.indexOf("mailto:") == 0 || value.indexOf("http:") == 0 || value.indexOf("https:") == 0) {
			return value;
		} else {
			return "mailto:" + value;
		}
	}
	function iodef_to_form (value) {
		if (value.indexOf("mailto:") == 0) {
			return value.substr(7);
		} else {
			return value;
		}
	}
	function Policy (issue, issuewild, iodef) {
		this.issue = issue;
		this.issuewild = issuewild;
		this.iodef = iodef;

		this.make_records = function () {
			var records = [];
			var i;
			if (this.issue.length == 0) {
				records.push(new Record(0, "issue", ";"));
			} else {
				for (i = 0; i < this.issue.length; ++i) {
					records.push(new Record(0, "issue", this.issue[i]));
				}
			}
			if (!array_equals(this.issue, this.issuewild)) {
				if (this.issuewild.length == 0) {
					records.push(new Record(0, "issuewild", ";"));
				} else {
					for (i = 0; i < this.issuewild.length; ++i) {
						records.push(new Record(0, "issuewild", this.issuewild[i]));
					}
				}
			}
			if (this.iodef != "") {
				records.push(new Record(0, "iodef", this.iodef));
			}
			return records;
		};
		this.to_form = function () {
			function set_checkboxes (input_name, identifiers) {
				var inputs = form[input_name];
				for (var i = 0; i < inputs.length; ++i) {
					var values = inputs[i].value.split(' ');
					var checked = false;
					for (var j = 0; j < values.length; ++j) {
						var identifier = values[j];
						if (identifier in identifiers) {
							checked = true;
							delete identifiers[identifier];
							break;
						}
					}
					inputs[i].checked = checked;
				}
				for (identifier in identifiers) {
					add_unknown_ca_to_form(identifier, input_name == "issue", input_name == "issuewild");
				}
			}
			set_checkboxes("issue", make_dictionary(this.issue));
			set_checkboxes("issuewild", make_dictionary(this.issuewild));
			form["iodef"].value = iodef_to_form(this.iodef);
		};
	}
	function make_policy_from_form () {
		function get_checkboxes (input_name) {
			var items = [];
			var inputs = form[input_name];
			for (var i = 0; i < inputs.length; ++i) {
				if (inputs[i].checked) {
					items.push(inputs[i].value.split(' ')[0]);
				}
			}
			return items;
		}
		return new Policy(get_checkboxes("issue"), get_checkboxes("issuewild"), iodef_from_form(form["iodef"].value));
	}
	function InvalidRecordError (message) {
		this.message = message;
	}
	function PolicyCompatError (message) {
		this.message = message;
	}
	function make_policy_from_records (records) {
		function parse_issue_property (str) {
			var re = /^[ \t]*([-.0-9a-zA-Z]*)[ \t]*(;(([ \t]*[0-9a-zA-Z]+=[\x21-\x7E]*)*)[ \t]*)?$/;
			var m = re.exec(str);
			if (!m) {
				throw new InvalidRecordError("The issue or issuewild property is malformed");
			}
			if (m[3] && m[3] != "") {
				throw new PolicyCompatError("issue and issuewild parameters are not supported");
			}
			return m[1];
		}

		var has_issue = false;
		var issue = [];
		var has_issuewild = false;
		var issuewild = [];
		var iodef = "";

		for (var i = 0; i < records.length; ++i) {
			var record = records[i];
			var tag = record.tag.toLowerCase();
			if (tag == "issue") {
				var domain = parse_issue_property(record.value);
				if (domain != "") {
					issue.push(domain);
				}
				has_issue = true;
			} else if (tag == "issuewild") {
				var domain = parse_issue_property(record.value);
				if (domain != "") {
					issuewild.push(domain);
				}
				has_issuewild = true;
			} else if (tag == "iodef") {
				if (iodef != "") {
					throw new PolicyCompatError("At most one iodef property is supported");
				}
				iodef = record.value;
			} else {
				throw new PolicyCompatError("The " + record.tag + " property is not supported (only issue, issuewild, and iodef are supported)");
			}
		}

		if (!has_issue) {
			if (has_issuewild || iodef != "") {
				throw new PolicyCompatError("Policies without at least one issue property are not supported");
			}
			return null;
		}

		return new Policy(issue, has_issuewild ? issuewild : issue, iodef);
	}
	function set_text_output (elt, content) {
		while (elt.hasChildNodes()) {
			elt.removeChild(elt.firstChild);
		}
		elt.appendChild(document.createTextNode(content));
	}
	function format_zone_file (domain, records) {
		var text = "";
		for (var i = 0; i < records.length; ++i) {
			text += domain + "\tIN\tCAA\t" + records[i].format() + "\n";
		}
		return text;
	}
	function format_rfc3597_zone_file (domain, records) {
		var text = "";
		for (var i = 0; i < records.length; ++i) {
			text += domain + "\tIN\tTYPE257\t" + make_unknown_record(records[i].encode()) + "\n";
		}
		return text;
	}
	function format_tinydns_zone_file (domain, records) {
		// see https://cr.yp.to/djbdns/tinydns-data.html
		// see https://github.com/SSLMate/caa_helper/issues/21#issuecomment-293424734
		// :example.com:257:\000\005\151\163\163\165\145\143\157\155\157\144\157\143\141\056\143\157\155
		var text = "";
		for (var i = 0; i < records.length; ++i) {
			text += ":" + strip_trailing_dot(domain) + ":257:" + make_tinydns_generic_record(records[i].encode()) + "\n";
		}
		return text;
	}
	function format_dnsmasq_options (domain, records) {
		// see http://www.thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
		// --dns-rr=example.com,257,00056973737565636F6D6F646F63612E636F6D
		var text = "";
		for (var i = 0; i < records.length; ++i) {
			text += "--dns-rr=" + strip_trailing_dot(domain) + ",257," + make_hex_string(records[i].encode()) + "\n";
		}
		return text;
	}
	function set_generic_table (table, domain, records) {
		function add_cell (row, rowSpan, content) {
			var span = document.createElement("span");
			span.appendChild(document.createTextNode(content));
			var cell = row.insertCell(row.cells.length);
			cell.rowSpan = rowSpan;
			cell.appendChild(span);
			return span;
		}

		while (table.rows.length > 0) {
			table.deleteRow(0);
		}
		for (var i = 0; i < records.length; ++i) {
			var row = table.insertRow(table.rows.length);
			if (i == 0) {
				add_cell(row, records.length, domain);
				add_cell(row, records.length, "CAA");
			}
			add_cell(row, 1, records[i].format());
		}
	}
	function display_records (domain, records) {
		set_text_output(output_zonefile, format_zone_file(domain, records));
		set_text_output(output_rfc3597, format_rfc3597_zone_file(domain, records));
		set_text_output(output_tinydns, format_tinydns_zone_file(domain, records));
		set_text_output(output_dnsmasq, format_dnsmasq_options(domain, records));
		set_generic_table(output_generic, domain, records);
	}
	function refresh () {
		var domain = form["domain"].value.toLowerCase();
		display_records(domain == "" ? "example.com." : ensure_trailing_dot(domain), make_policy_from_form().make_records());
	}
	function apply_ca_filter () {
		var ca_filter = form["ca_filter"].value.toLowerCase();
		for (var i = 0; i < ca_table.tBodies[0].rows.length; ++i) {
			var row = ca_table.tBodies[0].rows[i];
			if (row.cells[0].textContent.toLowerCase().indexOf(ca_filter) == -1 && row.dataset.identifiers.indexOf(ca_filter) == -1) {
				row.className = "hidden";
			} else {
				row.className = "";
			}
		}
	}
	function clear_ca_filter () {
		form["ca_filter"].value = "";
		apply_ca_filter();
	}

	function handle_lookup_result (result) {
		var domain = strip_trailing_dot(result["domain"]);
		if (result["status"] == "success") {
			if (result["operation"] == "autogenerate" && result["has_unknown_ca"]) {
				alert(domain + " has certificates that were issued by unknown CAs.  These certificates have been ignored and will not be reflected in the auto-generated policy.");
			}
			try {
				var policy = make_policy_from_records(result["records"]);
				if (policy) {
					policy.to_form();
					refresh();
				} else {
					if (result["operation"] == "lookup") {
						alert(domain + " does not have a CAA policy.  Any certificate authority can issue certificates.");
					} else if (result["operation"] == "autogenerate") {
						alert("No unexpired certificates for " + domain + " were found in Certificate Transparency logs.");
					}
				}
			} catch (e) {
				if (e instanceof InvalidRecordError) {
					alert(domain + " has an invalid CAA record: " + e.message);
				} else if (e instanceof PolicyCompatError) {
					alert(domain + " has a complicated CAA policy that this tool doesn't support: " + e.message);
				} else {
					throw e;
				}
			}
		} else if (result["status"] == "broken") {
			alert(domain + " has broken DNS servers that do not handle CAA properly: " + result["message"]);
		} else if (result["status"] == "servfail") {
			alert("Error looking up the DNS records for " + domain + ": " + result["message"]);
		}
	}

	var lookup_xhr = new XMLHttpRequest();
	lookup_xhr.onreadystatechange = function() {
		if (lookup_xhr.readyState == 4) {
			if (lookup_xhr.status == 0) {
				alert("Unable to lookup policy because there was an error communicating with the server.");
			} else if (lookup_xhr.status != 200) {
				alert("Unable to lookup policy: " + lookup_xhr.responseText);
			} else if (lookup_xhr.getResponseHeader("Content-Type") != "application/json") {
				alert("Unable to lookup policy because the server sent us a bad response.");
			} else {
				handle_lookup_result(eval("(" + lookup_xhr.responseText + ")"));
			}
		}
	};

	function send_telemetry(action) {
		try {
			var data = {
				domain:		form["domain"].value,
				policy:		make_policy_from_form(),
			};
			navigator.sendBeacon(caa_endpoint + "/telemetry", new URLSearchParams({
				session_id:	session_id,
				action:		action,
				data:		JSON.stringify(data),
			}));
		} catch (e) {
			console.log(e);
		}
	}

	function empty_policy () {
		send_telemetry("empty_policy");
		new Policy([], [], "").to_form();
		refresh();
	}
	function use_sslmate_policy () {
		send_telemetry("use_sslmate_policy");
		var sslmate_cas = [ 'sectigo.com', 'letsencrypt.org' ];
		new Policy(sslmate_cas, sslmate_cas, "").to_form();
		refresh();
	}
	function autogenerate_policy () {
		send_telemetry("autogenerate_policy");
		var domain = form["domain"].value.toLowerCase();
		if (domain == "") {
			alert("Please enter a domain name.");
			form["domain"].focus();
			return;
		}
		lookup_xhr.open("GET", caa_endpoint + "/autogenerate/" + encodeURIComponent(ensure_trailing_dot(domain)));
		lookup_xhr.send();
	}
	function load_policy () {
		send_telemetry("load_policy");
		var domain = form["domain"].value.toLowerCase();
		if (domain == "") {
			alert("Please enter a domain name.");
			form["domain"].focus();
			return;
		}
		lookup_xhr.open("GET", caa_endpoint + "/lookup/" + encodeURIComponent(ensure_trailing_dot(domain)));
		lookup_xhr.send();
	}
	function fetch_brands () {
		return fetch(certspotter_endpoint + "/v1/brands").then(function(resp) { return resp.json(); });
	}
	function populate_ca_table (brands) {
		function make_name_cell (name, aliases) {
			var col = document.createElement("th");
			col.className = "name_col";
			col.appendChild(document.createTextNode(name));
			if (aliases.length > 0) {
				var aka = document.createElement("span");
				aka.className = "aka";
				aka.appendChild(document.createTextNode(aliases.join(", ")));
				col.appendChild(aka);
			}
			return col;
		}
		function make_checkbox_cell (class_name, name, value) {
			var checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.name = name;
			checkbox.value = value;

			var col = document.createElement("td");
			col.className = class_name;
			col.appendChild(checkbox);
			return col;
		}

		for (var i = 0; i < brands.length; ++i) {
			var brand = brands[i];
			var identifiers = brand.caa_domains.join(" ");
			if (brand.caa_domains.length === 0) {
				continue;
			}

			var row = document.createElement("tr");
			row.dataset.identifiers = identifiers;
			row.appendChild(make_name_cell(brand.name, brand.aliases));
			row.appendChild(make_checkbox_cell("nonwild_col", "issue", identifiers));
			row.appendChild(make_checkbox_cell("wild_col", "issuewild", identifiers));

			ca_table.tBodies[0].appendChild(row);
		}
	}

	fetch_brands().then(function(brands) {
		populate_ca_table(brands);

		for (var i = 0; i < form.elements.length; ++i) {
			var elt = form.elements[i];
			if (elt.name == "issue" || elt.name == "issuewild") {
				elt.onclick = refresh;
			} else if (elt.name == "domain" || elt.name == "iodef") {
				elt.onchange = refresh;
				elt.onkeyup = refresh;
			} else if (elt.name == "ca_filter") {
				elt.onchange = apply_ca_filter;
				elt.onkeyup = apply_ca_filter;
			} else if (elt.name == "clear_ca_filter") {
				elt.onclick = clear_ca_filter;
			} else if (elt.name == "empty_policy") {
				elt.onclick = empty_policy;
			} else if (elt.name == "use_sslmate_policy") {
				elt.onclick = use_sslmate_policy;
			} else if (elt.name == "autogenerate_policy") {
				elt.onclick = autogenerate_policy;
			} else if (elt.name == "load_policy") {
				elt.onclick = load_policy;
			}
		}

		refresh();
		apply_ca_filter();
	});

	certspotter_link.addEventListener("click", function() {
		send_telemetry("certspotter_link");
	});
	document.addEventListener("visibilitychange", function() {
		if (document.visibilityState == "hidden") {
			send_telemetry("end_session");
		}
	});
}
