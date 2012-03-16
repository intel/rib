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

// Tree view widget


(function($, undefined) {

    $.widget('gb.treeView', {

        options: {
            model: null
        },

        _setOption: function(key, value) {
            switch (key) {
                case 'model':
                    this.options.model = value;
                    this.refresh();
                    break;
                default:
                    break;
            }
        },

        _toTreeModel: function(model) {
            return model;
        },

        destroy: function() {
            // TODO: unbind any ADM event handlers
            $(this.element).find('.'+this.widgetName).remove();
        },

        refresh: function(event, widget) {
            var widget = widget || this;
            widget.element.addClass('treeView');
            if (widget.options.model) {
                var container = $('<ul/>').appendTo(this.element.empty());
                widget._createTreeView(container, container,
                                       this._toTreeModel(this.options.model));
                widget.setSelected(widget._getSelected?widget._getSelected():null);
            }
        },

        _createTreeView: function (container, rootContainer, node) {
            var widget = this;
            $.each(node, function(i, v) {
                if ( $.isPlainObject(v)) {
                    //This is children definition
                    $.each(v, function(name , value) {
                        var folderNode;
                        if (name === "_hidden_node"||name === "_origin_node") {
                            return true;
                        }
                        container.prev().prev().addClass('folder')
                            .removeClass('singleItem').html('');
                        folderNode = $('<li/>')
                            .appendTo(container)
                            .append($('<span/>').addClass('singleItem')
                                .html("&#x2022;")
                                .click(function(e) {
                                    $(this).toggleClass("close")
                                    .parent()
                                    .children("ul").toggle();
                                    e.stopPropagation();
                                }))
                            .append($('<a/>')
                                .append($('<span>').text(name)
                                                   .addClass('widgetType'))
                                .click(function (e) {
                                    e.stopPropagation();
                                    widget._nodeSelected(value, v._origin_node,
                                                         $(this));
                                    return false;
                                })
                                .each(function () {
                                    var origin_node = v._origin_node||value;
                                    $(this).data('origin_node', origin_node);
                                })
                            );

                        if (typeof widget._render === "function") {
                            widget._render(folderNode, v._origin_node);
                        }
                        widget._createTreeView($('<ul/>')
                                                   .addClass('widgetGroup')
                                                   .appendTo(folderNode),
                                               rootContainer, value);
                    });
                }
            });
        },

        _setSelected: function (domNode) {
            if (domNode[0]) {
                this.element.find('.ui-selected')
                    .removeClass('ui-selected')
                    .removeClass('ui-state-active');
                domNode.addClass('ui-state-active')
                    .addClass('ui-selected')
                    [0].scrollIntoViewIfNeeded();
            }
        },

        findDomNode: function (node) {
           return $('a', this.element).filter( function() {
               return $(this).data("origin_node") === node; });
        },

        setSelected: function (node) {
           this._setSelected(this.findDomNode(node));
        },

    });
})(jQuery);
