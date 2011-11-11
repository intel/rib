/*
 * gui-builder - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
// Build up code view

$(function() {
    var $previewTab;

    $previewTab = $('#preview-tab');
    // Refresh tab contents when click tab
    $previewTab.click(showPreview);

    function showPreview() {
	var previewHtmlCode = document.getElementById("text-code");
	var previewFrame = document.getElementById("preview-frame");

	console.log(previewHtmlCode.value);

	var doc = previewFrame.contentWindow.document;
	doc.open();
        /* Get the html source code from "design view" later, then
         * you can click preview to directly view the result.
         * But, we also need read the user input source code in text editor
         * to generate preview window ...
         */
	doc.writeln(previewHtmlCode.value);
	doc.close();
    }
});
