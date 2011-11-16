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
    var design_root = ADM.getDesignRoot(),
        body = $('<body/>'),
        head = '<head>\n',
        props = {}, i;

    // Serialize any <meta> properties
    props = design_root.getProperty("metas") ;
    for (i in props) {
        head += '<meta ' + props[i].key + '="' + props[i].value +
                 '" content="' + props[i].content + '">\n';
    }
    // Serialize any <link> properties
    props = design_root.getProperty("css") ;
    for (i in props) {
        head += '<link rel="stylesheet" href="' + props[i] + '">\n';
    }
    // Serialize any <script> properties
    props = design_root.getProperty("libs");
    for (i in props) {
        head += '<script src="' + props[i] + '"></script>\n';
    }
    head += '</head>\n';

    // Serialize the <body>
    ADM2DOM(design_root, body);

    return style_html('<html>\n' + head + body.html() + '\n</html>');
}
