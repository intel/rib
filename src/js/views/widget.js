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

    $.widget('gb.widgetView', {

        _create: function() {
            var widget = this;
            widget.element.addClass('gbTreeView');
            $.getJSON("src/assets/groups.json", function (groups) {
                var listSubGroups = function (container, group) {
                    $.each(group, function(i , v) {
                        if ( $.isPlainObject(v)) {
                            //This is group definition
                            $.each(v, function(name , value) {
                                var groupNode;
                                if (name === "atomic groups") return true;
                                container.prev().prev().addClass('folder')
                                    .removeClass('singleItem').html('');
                                groupNode = $('<li/>')
                                        .appendTo(container)
                                        .append($('<span/>').addClass('singleItem').html("&#x2022;"))
                                        .append($('<a/>')
                                            .append($('<span>').text(name).addClass('widgetType'))
                                            .click(function (e) {
                                                e.stopPropagation();
                                                widget.element.find('.ui-selected')
                                                    .removeClass('ui-selected')
                                                    .removeClass('ui-state-active');
                                                $(this).addClass('ui-state-active')
                                                    .addClass('ui-selected');
                                                $(':gb-paletteView').paletteView('option',
                                                    "model", value);

                                            })
                                        )
                                        .click( function (e) {
                                            e.stopPropagation();
                                            $(this).toggleClass("close")
                                                .children("ul").toggle();
                                        });
                                listSubGroups($('<ul/>').addClass('widgetGroup')
                                        .appendTo(groupNode), value);
                            });
                        }
                    });
                }, resolveRefs = function (root, data) {
                    $.each(data, function(name, value) {
                        if (value &&  typeof value == "string" && value.indexOf('#') == 0) {
                            var refObj = root;
                            $.each(value.substring(1).split('.'), function (i, attr) {
                                refObj = refObj[attr];
                            });
                            data.splice(data.indexOf(value), 1, refObj);
                        }
                        else if (value && typeof value === "object")
                            resolveRefs(root, value);
                    });
                };
                try{
                    var groupContainer = $('<ul/>').appendTo(widget.element);
                    resolveRefs(groups, groups);
                    listSubGroups(groupContainer, groups);
                    $('> li > a', groupContainer).first().trigger('click');
                }catch (e) {
                    alert(e);
                }

            });
            return this;
        },

        destroy: function() {
            // TODO: unbind any ADM event handlers
            $(this.element).find('.'+this.widgetName).remove();
        },

        resize: function(event, widget) {
            this.element.height(this.element.parent().height() -
                    this.element.next().height());
        },
    });
})(jQuery);
