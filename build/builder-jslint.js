/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
var print = require("sys").print,
	srcs = [
		"src/js/adm.js",
		"src/js/widgets.js",
		"src/js/builder.js",
		"src/js/template.js",
		"src/js/properties.js",
		"src/js/palette.js",
		"src/js/fs.js",
		"src/js/serialize.js",
		"src/js/generate.js",
		"src/js/preview.js",
		"src/js/outline.js",
		"src/js/pageTemplate.js",
        ],
        options = {
		plusplus: false,
		nomen: false,
		forin: true,
		strict: true,
		devel: true,
	},
	// All of the following are known issues that we think are 'ok'
	// (in contradiction with JSLint):
	// Examples (from jquery project jslint exceptions):
	//
	// "Use '===' to compare with 'null'."
	// "Expected a 'break' statement before 'case'."
	// "'e' is already defined."
	ok = {
		// adm/adm.js:
		// FIXME: This exception should eventually be solved by
		//        restructuring the adm.js code...
		"'ADMNode' was used before it was defined.": true,
		"Extra comma.": true,
	},

	report = "<!DOCTYPE HTML>\n" +
		"<html>\n" +
		"<head>\n" +
		"<title>RIB JSLint Report</title>\n" +
		"<link rel=\"stylesheet\" type=\"text/css\" href=\"report.css\" />\n" +
		"</head>\n" +
		"<body>\n" +
		"<h1 id=\"top\">JSLint report for: builder</h1>\n" +
                "<div class=\"TOC\">Table of Contents:<ul>\n" +
		"<li><a href=\"#\">Top</a></li>\n",

	checkFile = function (fileName) {
		var src = require("fs").readFileSync(fileName, "utf8");
		var JSLINT = require("./jslint.js").JSLINT;
		var rpt;
		JSLINT(src, options);

		var e = JSLINT.errors, found = 0, w;

		for ( var i = 0; i < e.length; i++ ) {
			w = e[i];

			if ( !ok[ w.reason ] ) {
				found++;
				print( "\n" + w.evidence + "\n" );
				print( "\t" + fileName + "[" + w.line + ":" + w.character + "]: " + w.reason );
			}
		}

		if ( found > 0 ) {
			print( "\n" + fileName + ": " + found + " Error(s) found.\n" );
		} else {
			print( fileName + ": JSLint check passed.\n" );
		}

		report += "<h2 id=\"" + fileName + "\">" + fileName + "</h2>\n";
		report += JSLINT.report() + "\n";
	};

for (var f in srcs) {
	report += "<li><a href=\"#" + srcs[f] + "\">" + srcs[f] + "</a></li>\n";
};

report += "</div></ul>\n";

for (var f in srcs) {
	checkFile(srcs[f]);
};

report += "</body>\n</html>";

require("fs").writeFileSync("build/jslint-report.html", report, "utf8");

