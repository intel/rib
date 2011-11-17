/*
 * gui-builder - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
"use strict";
// Build up code view

$(function() {
    var $previewTab;

    $previewTab = $('#preview-tab');
    // Refresh tab contents when click tab
    $previewTab.click(showPreview);

    function showPreview() {
        $( "#tabs-3" ).show();
        var previewFrame = document.getElementById("preview-frame");

        var doc = previewFrame.contentWindow.document;
        doc.open();
        doc.writeln(generateHTML());
        doc.close();
    }
});
