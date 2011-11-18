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
var $headers = [
        {
            admPropoertyName: "metas",
            headerName: "meta",
        },
        {
            admPropoertyName: "css",
            headerName: "link",
            attrName: "href",
            additionalAttrs: [{name: "rel", value: "stylesheet"}]
        },
        {
            admPropoertyName: "libs",
            headerName: "script",
            attrName: "src",
        },
    ],
    $designHeaders = $.merge($.merge([],$headers), [
        {
            admPropoertyName: "design_metas",
            headerName: "meta",
        },
        {
            admPropoertyName: "design_css",
            headerName: "link",
            attrName: "href",
            additionalAttrs: [{name: "rel", value: "stylesheet"}]
        },
        {
            admPropoertyName: "design_libs",
            headerName: "script",
            attrName: "src",
        }
    ]);

function generateHTML(){
    var doc = constructNewDocument($headers);
    ADM2DOM(ADM.getDesignRoot(), doc.documentElement);
    return style_html(xmlserializer.serializeToString(doc));
}
