Prerequisites:
==============
1) RIB supports running only in a Chromium/Chrome browser at this time. It
   Does not work on Firefox.
2) Should work on Linux, Windows, and Mac. Primarily tested on Ubuntu 11.04,
   Windows 7, and Windows XP, with some testing on other Ubuntu versions and
   Mac.

To install Chromium on an Ubuntu 11.04 system:
$ sudo apt-get install chromium-browser

Running:
========
To run RIB, you have two options:

1) Start your Chromium browser with the "--allow-file-access-from-files"
   and "--enable-file-cookies" options and point it to
   file:///path/to/rib/index.html

For example:
$ chromium-browser --allow-file-access-from-files --enable-file-cookies index.html

2) Point a locally running webserver to the directory you've cloned the
   builder project to (may be just a symlink, depending on your web server
   options)

For example, something like:
$ sudo apt-get install thttpd
$ sudo ln -s <path-to-git-tree>/builder /var/www/builder
$ chromium-browser http://localhost/builder

You may need to configure thttpd to start up.

Legal Stuff:
============
Copyright (c) 2011-2012, Intel Corporation.

Unless otherwise noted below, all code is Licensed under the Apache Public
License version 2.0 (LICENSE-APLv2.txt).  For a complete list of files and
their source, license and copyright, look in the "FILES" file.

The following files were copied into this project from upstream and are
necessary for the runtime use of this application:

File:					License:	Copyright Holder:
-----					--------	-----------------
lib/jquery-1.6.4.js			MIT & GPLv2	The jQuery Project
lib/jquery-1.6.4.min.js			MIT & GPLv2	The jQuery Project
lib/jquery-ui-1.8.16.custom.js		MIT & GPLv2	The jQuery Project
lib/jquery-ui-1.8.16.custom.min.js	MIT & GPLv2	The jQuery Project
lib/jquery.mobile-1.0.js		MIT & GPLv2	The jQuery Project
lib/jquery.mobile-1.0.min.js		MIT & GPLv2	The jQuery Project
src/css/jquery.mobile-1.0.css		MIT & GPLv2	The jQuery Project
src/css/jquery.mobile-1.0.min.css	MIT & GPLv2	The jQuery Project
lib/js-beautify/beautify-html.js	MIT		Einar Lielmanis[4]
lib/js-beautify/beautify.js		MIT		Einar Lielmanis[4]
lib/web-ui-fw.js			MIT             Intel
lib/web-ui-fw-libs.js			MIT             Intel
src/css/web-ui-fw-theme.css		MIT             Intel
src/css/web-ui-fw-widgets.css		MIT             Intel
lib/jszip.js				MIT or GPLv3	Stuart Knightley[5]
lib/zipfile.js				Modified BSD    Arnaud Renervier[6]
lib/deflate.js				MIT/X11         Arnaud Renervier[6]
lib/CodeMirror-2.21/LICENSE		BSD-like	Marijn Haverbeke
lib/CodeMirror-2.21/lib/codemirror.css	BSD-like	Marijn Haverbeke
lib/CodeMirror-2.21/lib/codemirror.js	BSD-like	Marijn Haverbeke
lib/CodeMirror-2.21/mode/css/css.js	BSD-like	Marijn Haverbeke
lib/CodeMirror-2.21/mode/htmlmixed/htmlmixed.js
					BSD-like	Marijn Haverbeke
lib/CodeMirror-2.21/mode/javascript/javascript.js
					BSD-like	Marijn Haverbeke
lib/CodeMirror-2.21/mode/xml/xml.js	BSD-like	Marijn Haverbeke

The following files were copied into this project from upstream and are
only included as development tools (build, debugging, reporting).  They
are not to be included in any releases or packages for this project:

File:					License:	Copyright Holder:
-----					--------	-----------------
build/jslint.js				BSD-like	Douglas Crockford[2,3]
					(w/ conditions)
build/crxmake.sh			BSD		Google[7]

Notes:
[2] douglas@crockford.com
[3] Portions of the file (jslint.js) are copyright Intel Corporation, 2011-2012
[4] einar@jsbeautifier.org
[5] stuart@stuartk.co.uk
[6] arno@renevier.net
[7] Copyright 2011 Google (http://code.google.com/chrome/extensions/crx.html)
