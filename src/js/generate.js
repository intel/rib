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
    // Global variables
    var $codeTab,
    $codeArea,
    $designView,
    $designDoc,
    htmlDocBody,
    htmlDocContents;

    $codeTab = $('#code-tab');
    $codeArea = $('#code-area');
    $designView  =$('#design-view');
    $designDoc = $($designView[0].contentDocument);

    // Refresh tab contents when click tab
    $codeTab.click(showCodeView);

    function showCodeView() {
        var htmlDoc;

        //var designFrame = document.getElementById("design-view");
        //htmlContents = designFrame.conentWindow.document.body.innerHTML;
        htmlDoc = $designDoc[0];

        /* The html document contents of design view is not exactly same to the generated code.
         * We'd better rewrite Shane's serialize function to convert ADM to clean DOM later
         * + Remove style definition
         * + Text code format
         * + Remove undefined stuffs
         * + ...
         */
        //ADMUtils.serializeADMDesignToDOM();
        htmlDocBody = htmlDoc.body.innerHTML;
	htmlDocWrapper();

        console.log(htmlDocContents);


	$codeArea.html(function(index, oldHtml) {
	    var textArea;
	    var textAreaPrefix = '';
	    var textAreaSuffix = '</textarea>\n';
	    var codeAreaID = "text-code";

	    textAreaPrefix += '<textarea id="text-code" rows=40 style="border:3px; solid:#666666; bgcolor:#222222; line-height:18px; font:12px; width:100%; overflow-x:visible; overflow-y:visible">\n';
            textArea = textAreaPrefix + htmlDocContents + textAreaSuffix;
	    return textArea;
	});
    }

    function htmlDocWrapper() {
        var htmlDocPrefix = '';
        var htmlDocSuffix = '';

        htmlDocPrefix += '<!DOCTYPE html>\n';
        htmlDocPrefix += '<html>\n';
        htmlDocPrefix += '<head>\n';
        htmlDocPrefix += '<title>Page Title</title>\n';
        htmlDocPrefix += '<meta name="viewport" content="width=device-width, initial-scale=1">\n';
        htmlDocPrefix += '<link rel="stylesheet" href="./css/jquery.mobile-1.0b3.min.css" />\n';
        htmlDocPrefix += '<script type="text/javascript" src="./js/lib/jquery-1.6.2.min.js"></script>\n';
        htmlDocPrefix += '<script type="text/javascript" src="./js/lib/jquery.mobile-1.0b3.min.js"></script>\n';
        htmlDocPrefix += '</head>\n';
        htmlDocPrefix += '<body>\n';
        htmlDocSuffix += '\n';
        htmlDocSuffix += '</body>\n';
	htmlDocContents = htmlDocPrefix + htmlDocBody + htmlDocSuffix;
    }
});
