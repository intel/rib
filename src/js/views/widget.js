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

// Widget view widget


(function($, undefined) {

    $.widget('gb.widgetView',  $.gb.treeView, {

        _create: function() {
            var widget = this;
            $.getJSON("src/assets/groups.json", function (groups) {
                var resolveRefs = function (root, data) {
                    $.each(data, function(name, value) {
                        var refObj;
                        if (value &&  typeof value == "string" &&
                            value.indexOf('#') == 0) {
                            refObj = root;
                            $.each(value.substring(1).split('.'),
                                function (i, attr) {
                                    refObj = refObj[attr];
                                });
                            data.splice(data.indexOf(value), 1, refObj);
                        }
                        else if (value && typeof value === "object")
                            resolveRefs(root, value);
                    });
                };
                resolveRefs(groups, groups);
                widget._setOption("model", groups);
                widget.findDomNode(groups[0]['Functional Groups'])
                      .trigger('click');
            });
            return this;
        },

        _nodeSelected: function (treeModelNode, data) {
            $(':gb-paletteView').paletteView('option', "model", treeModelNode);
        },

        resize: function(event, widget) {
            this.element.height(
                Math.round((this.element.parent().height() - 20) * 0.3));
        },
    });
})(jQuery);
