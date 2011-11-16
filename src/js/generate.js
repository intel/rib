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

function generateHTML(){
    var htmlDoc = $('<html/>');
    var design_root = ADM.getDesignRoot();
    var head = $("<head/>");
    var i;
    var metas = design_root.getProperty("metas") ;
    for (i in metas) {
        var mt = $('<meta/>');
        mt.attr( metas[i].key, metas[i].value);
        mt.attr('content', metas[i].content);
        head.append(mt);
    }
    var css = design_root.getProperty("css") ;
    for (i in css) {
        var link = $('<link/>');
        link.attr("rel", "stylesheet");
        link.attr("href", css[i]);
        head.append(link);
    }

    var libs = design_root.getProperty("libs");
    var scripts = "";
    //JQuery will try to execute script if we append it to head, so we have to compse a script string
    for (i in libs) {
        scripts += '<script type ="text/javascript" src="' + libs[i] + '"></script>';
    }
    ADM2DOM(design_root, htmlDoc);
    return style_html("<html><head>" + head.html() + scripts + "</head>" +
        htmlDoc.html() + "</html>");
}
