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
            $.getJSON("src/assets/groups.json", function (groups) {
                var listSubGroups = function (container, group) {
                    $.each(group, function(name , value) {
                        if (!value.icon) {
                            //This is a group
                            var groupNode = $('<li/>')
                                    .appendTo(container)
                                    .append($('<a>' + name + '</a>')
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
                            listSubGroups(
                                $('<ul/>').appendTo(groupNode), value);
                        }
                    });
                };
                try{
                    var groupContainer = $('<ul/>').appendTo(widget.element);
                    listSubGroups(groupContainer, groups);
                    $('> li > a', groupContainer).trigger('click');
                    widget.element.height(groupContainer.height());
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
