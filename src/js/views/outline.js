/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
"use strict";

// Outline view widget

(function($, undefined) {

    $.widget('rib.outlineView', $.rib.treeView, {

        _create: function() {
            var o = this.options,
                e = this.element;

            // Chain up to base class _create()
            $.rib.treeView.prototype._create.call(this);

            $(window).resize(this, function(event) {
                var el = event.data.element;
                if (el.parent().height() == 0)
                    return;
                var newHeight = Math.round((el.parent().height()
                                -el.parent().find('.pageView').height()
                                - el.parent().find('.property_title')
                                      .height()
                                - 20) // height of ui-state-default + borders
                                * 0.6);
                el.height(newHeight);
            });

            this.enableKeyNavigation();

            return this;
        },

        _selectionChangedHandler: function(event, widget) {
            var node, rootNode, nodeInOutline, currentNode;

            widget = widget || this;

            if (!widget.options.model) {
                return;
            }

            // Make sure we show the page as selected if no node is selected
            if (event && event.node !== undefined) {
                node = event.node;
            } else {
                console.error('Event object may be discontruced, in outline selection handler.');
                return;
            }
            // When a page is selected, we will close all other page subtrees
            // and ensure the selected pages' subtree is opened
            if (node && node.getType() === 'Page') {
                // node is <a> element, need the "folder" <span> before it
                var fldr = widget.findDomNode(node).find('> .folder').eq(0);
                // "Close" all other page folders
                $('>ul>li>span.folder:not(.close)', widget.element).not(fldr)
                    .trigger('click');
                // Make sure this page folder is "Open"
                if (fldr.hasClass('close')) {
                    fldr.trigger('click');
                }
            }
            widget.setSelected(node);
        },

        removeNode: function(node, parentNode) {
            $.rib.treeView.prototype.removeNode.call(this, node);
            parentNode = parentNode || node.getParent();
            if (parentNode.getChildren().length === 0 ||
                (parentNode.getChildren().length === 1 &&
                 parentNode.getChildren()[0] === node)) {
                this.element.find('li.label').filter( function () {
                    return $(this).data('adm-node') === parentNode;
                }).remove();
            }
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            switch (event.type) {
            case "nodeAdded":
                widget.addNode(event.node);
                break;
            case "nodeRemoved":
                widget.removeNode(event.node, event.parent);
                break;
            case "nodeMoved":
                widget.moveNode(event.node, event.oldParent);
                break;
            case "propertyChanged":
                if (event.node && event.node.getType() === 'Design') {
                    break;
                }
                widget.removeNode(event.node);
                widget.addNode(event.node);
                break;
            default:
                console.warning('Unknown type of modelUpdated event:'
                                + event.type);
                break;
            }
        },
        _getParent: function (node) {
            return node.getParent();
        },
        _getChildTreeNodes: function (node) {
            node = node || this.options.model.getDesignRoot();
            var children =  this._adm2TreeModel(node);
            if ($.isArray(children))
                return children;
            else
                return children[BWidget.getDisplayLabel(node.getType())];
        },

        _adm2TreeModel: function (admNode) {
            var treeNode = {},
                childNodes = [],
                children, i, type, showInOutline, label;

            if (!(admNode instanceof ADMNode)) {
                return treeNode;
            }

            type = admNode.getType();
            showInOutline = BWidget.isPaletteWidget(type) ||
                (type === "Page");
            label = BWidget.getDisplayLabel(type);
            if (showInOutline) {
                treeNode[label] = childNodes;
                treeNode._origin_node = admNode;
            }
            else
                treeNode = childNodes;

            children = admNode.getChildren();
            for (i = 0; i < children.length; i++) {
                var childTreeModel = this._adm2TreeModel(children[i]);
                if ($.isPlainObject(childTreeModel))
                    childNodes.push(childTreeModel);
                else
                    $.merge(childNodes, childTreeModel);
            }
            return treeNode;
        },
        _toTreeModel: function (model) {
            return this._adm2TreeModel(model.getDesignRoot());
        },
        _getSelected: function () {
            var model = this.options.model;
            if (!model)
                return null;
            return model.getSelectedNode() || model.getActivePage();
        },
        _renderPageNode: function (domNode, node) {
            if (node.getType() === "Page") {
                //set page id
                var id = node.getProperty('id'),
                    titleNode = domNode.find("> a > .pageTitle");
                if (titleNode.length === 0)
                    titleNode = $('<span/>').addClass('pageTitle')
                        .appendTo(domNode.find("> a"));
                titleNode.text(' (' + id + ')');
            }
        },
        _render: function (domNode, data) {
            var labelFunc, parentNode = data.getParent(), newTopLevelNode;
            labelFunc = BWidget.getOutlineLabelFunction(parentNode.getType());
            if (labelFunc) {
                var label = labelFunc(parentNode), prev=domNode.prev(),
                    next = domNode.next();

                // Make sure "border" nodes are not put into other blocks
                if (prev.is('li.label') && prev.data('adm-node') !== parentNode)
                    domNode.insertBefore(prev);
                if (next.is('li.label') && next.data('adm-node') === parentNode)
                    domNode.insertAfter(next);
                if (label && this.findChildDomNodes(parentNode).length === 1)
                    $('<li class="label">' + label + '</li>')
                        .insertBefore(domNode).data('adm-node', parentNode);
            }
            this._renderPageNode(domNode, data);
        },
        _nodeSelected: function (treeModelNode, data) {
            this.options.model.setSelected(data.getUid());
        }
    });
})(jQuery);
