/*
 * gui-builder - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
"use strict";

// Layout view widget

(function($, undefined) {

    $.widget('gb.outlineView', $.gb.treeView, {

        _create: function() {
            var o = this.options,
                e = this.element;

            o.designReset = this._designResetHandler;
            o.selectionChanged = this._selectionChangedHandler;
            o.modelUpdated = this._modelUpdatedHandler;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

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


            this.refresh(null, this);
            this.enableKeyNavigation();

            return this;
        },

        _setOption: function(key, value) {
            switch (key) {
                // Should this REALLY be done here, or plugin registration in
                // the "host"... using the functions mapped in widget options?
                case 'model':
                    this._unbindADMEvents();
                    this._bindADMEvents(value);
                    break;
                default:
                    break;
            }
        },

        // Private functions
        _bindADMEvents: function(a) {
            var o = this.options,
                d = this.designRoot;

            if (a) {
                o.model = a;

                if (o.designReset) {
                    a.bind("designReset", o.designReset, this);
                }
                if (o.selectionChanged) {
                    a.bind("selectionChanged", o.selectionChanged, this);
                }

            }
        },

        _unbindADMEvents: function(a) {
            var o = this.options,
                a = this.options.model,
                d = this.designRoot;

            // First unbind our ADMDesign modelUpdated handler, if any...
            if (d && o.modelUpdated) {
                d.designRoot.unbind("modelUpdated", o.modelUpdated, this);
            }

            // Now unbind all ADM model event handlers, if any...
            if (a) {
                if (o.designReset) {
                    a.unbind("designReset", o.designReset, this);
                }
                if (o.selectionChanged) {
                    a.unbind("selectionChanged", o.selectionChanged, this);
                }
            }
        },

        _designResetHandler: function(event, widget) {
            var d = event && event.design, o;

            widget = widget || this;
            o = widget.options;
            d = d || o.model.getDesignRoot();

            // Do nothing if the new ADMDesign equals our currently cached one
            if (d === widget.designRoot) {
                return;
            }

            // First, unbind existing modelUpdated hander, if any...
            if (widget.designRoot && o.modelUpdated) {
                widget.designRoot.unbind("modelUpdated", o.modelUpdated,widget);
            }

            // Next, bind to modelUpdated events from new ADMDesign, if any...
            if (d && o.modelUpdated) {
                d.bind("modelUpdated", o.modelUpdated, widget);
            }

            // Then, cache the new ADMDesign reference with this instance
            widget.designRoot = d;

            // Finally, redraw our view since the ADMDesign root has changed
            widget.refresh(event, widget);
        },

        _selectionChangedHandler: function(event, widget) {
            var node, rootNode, nodeInOutline, currentNode;

            widget = widget || this;

            if (!widget.options.model) {
                return;
            }

            // Make sure we show the page as selected if no node is selected
            if (event === null || event.node === null) {
                node = widget.options.model.getDesignRoot()
                             .findNodeByUid(widget.options.model.getSelected());
                if (node === null || node === undefined) {
                    node = widget.options.model.getActivePage();
                    if (node === null || node === undefined) {
                        return false;
                    }
                }
            } else {
                node = event.node;
            }

            // When a page is selected, we will close all other page subtrees
            // and ensure the selected pages' subtree is opened
            if (node.getType() === 'Page') {
                // node is <a> element, need the "folder" <span> before it
                var fldr = widget.findDomNode(node).prev('.folder').eq(0);
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


        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            switch (event.type) {
                case "nodeAdded":
                    widget.addNode(event.node);
                break;
                default:
                    widget.refresh();
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
            return model.getSelectedNode() || model.getActivePage();
        },
        _render: function (domNode, data) {
            var labelFunc, parentNode = data.getParent();
            labelFunc = BWidget.getOutlineLabelFunction(parentNode.getType());
            if (labelFunc) {
                var label = labelFunc(parentNode);
                if (label) {
                    domNode.before($('<li class="label">' +
                                        label + '</li>'));
                }
            }
            if (data.getType() === "Page") {
                //set page id
                var id = data.getProperty('id');
                domNode.find("a")
                    .append('<span/>')
                    .children(':last')
                    .addClass('pageTitle')
                    .text(' (' + id + ')');
            }
        },
        _nodeSelected: function (treeModelNode, data) {
            this.options.model.setSelected(data.getUid());
        }
    });
})(jQuery);
