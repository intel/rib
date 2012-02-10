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

// Layout view widget

(function($, undefined) {

    $.widget('gb.outlineView', {

        options: {
            model: null,
        },

        _create: function() {
            var o = this.options,
                e = this.element, c;

            o.designReset = this._designResetHander;
            o.selectionChanged = this._selectionChangedHander;
            o.activePageChanged = this._activePageChangedHander;
            o.modelChanged = this._modelChangedHander;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            c = $('<div/>').appendTo(this.element);

            // Load ADM into initial outline view
            c.append('<p id="outline_header" class="ui-helper-reset ui-widget ui-widget-header">Outline</p>')
               .addClass('ui-widget-content')
               .append('<div id="outline_content"></div>');

            this._renderOutlineView();

            this.refresh(null, this);

            return this;
        },

        _setOption: function(key, value) {
            switch (key) {
                // Should this REALLY be done here, or plugin registration in
                // the "host"... using the functions mapped in widget options?
                case 'model':
                    this._unbindADMEvents(this.options.model);
                    this._bindADMEvents(value);
                    this.options.model = value;
                    break;
                default:
                    break;
            }
        },

        destroy: function() {
            // TODO: unbind any ADM event handlers
            $(this.element).find('.'+this.widgetName).remove();
        },

        refresh: function(event, widget) {
            widget = widget || this;
        },

        // Private functions
        _bindADMEvents: function(a) {
            var d;
            a = a || ADM;
            d = a && a.getDesignRoot();
            a.bind("designReset", this._designResetHandler, this);
            a.bind("selectionChanged", this._selectionChangedHandler, this);
            a.bind("activePageChanged", this._activePageChangedHandler, this);
            d.bind("modelUpdated", this._modelUpdatedHandler, this);
        },

        _unbindADMEvents: function(a) {
            var d;
            a = a || ADM;
            d = a && a.getDesignRoot();
            a.unbind("designReset", this._designResetHandler, this);
            a.unbind("selectionChanged", this._selectionChangedHandler, this);
            a.unbind("activePageChanged", this._activePageChangedHandler, this);
            d.unbind("modelUpdated", this._modelUpdatedHandler, this);
        },

        _designResetHandler: function(event, widget) {
            widget = widget || this;
            widget._unbindADMEvents(this.options.model);
            widget._bindADMEvents(ADM.getDesignRoot());
            widget._renderOutlineView();
        },

        _selectionChangedHandler: function(event, widget) {
            var node, rootNode, nodeInOutline, currentNode;
            widget = widget || this;
            // Make sure we show the page as selected if no node is selected
            if (event === null || event.node === null) {
                node = ADM.getDesignRoot().findNodeByUid(ADM.getSelected());
                if (node === null || node === undefined) {
                    node = ADM.getActivePage();
                    if (node === null || node === undefined) {
                        return false;
                    }
                }
            } else {
                node = event.node;
            }

            // Deactive state of selected before
            $('#outline-panel', this.element).find('.ui-state-active')
                .removeClass('ui-state-active');
            $('#outline-panel', this.element).find('.ui-selected')
                .removeClass('ui-selected');

            // Find this node in outline pane
            rootNode = $("#pageList", this.element);
            nodeInOutline = $(rootNode).find("#Outline-"+node.getUid()+" > a");
            $(nodeInOutline).addClass('ui-state-active')
                .addClass('ui-selected');

            currentNode = nodeInOutline;
            while (currentNode.length &&
                   currentNode.html() !== rootNode.html())  {
                $(currentNode).show();
                currentNode = currentNode.parent();
            }

            // Make sure selected node is visible on show
            $('#outline-panel', this.element).find('.ui-selected:first').each(function (){
                this.scrollIntoViewIfNeeded();
            });
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;

            if (!event.page || event.page === undefined) {
                return;
            }

            if (event.page.getUid() === ADM.getActivePage()) {
                return;
            }

            widget._renderOutlineView();
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;

            widget._renderOutlineView();
        },

        _renderOutlineView: function() {
            var page, selected,
                $tree = this.element.find("#outline_content");

            function  setSelected(item) {
                var UID = $(item).attr('adm-uid');
                dumplog("Outline.js: setSelected is called. UID is " + UID);

                // find whether selected widget in current active page
                var currentNode = ADM.getDesignRoot().findNodeByUid(UID);
                while (currentNode.getType() !== "Page" && currentNode.getType() !=="Design") {
                    currentNode = currentNode.getParent();
                }
                if (currentNode.getType() !== "Page") {
                    dumplog("error: can't find select node's Page");
                    return;
                }
                if (ADM.getActivePage() !== currentNode) {
                    ADM.setActivePage(currentNode);
                }

                window.ADM.setSelected(UID);
            }

            function render_sub(node, $container) {
                var newItem, children, i, type, UID, isShowInOutline, widgetID,
                    label, id, $subContainer;

                if (!(node instanceof ADMNode)) {
                    return;
                }

                type = node.getType();
                UID = node.getUid();
                isShowInOutline = node.isSelectable();
                widgetID = type + '-' + UID;
                label = BWidget.getDisplayLabel(type);
                $subContainer = $container;

                // check current node whether can ben shown in outline pane
                if (isShowInOutline) {
                    newItem = $('<li><a>' + label + '</a></li>')
                        .attr('id', 'Outline-' + UID)
                        .appendTo($container);

                    if (node.getChildrenCount() > 0) {
                        newItem.addClass('folder')
                            .append('<ul id="' + widgetID + '"></ul>');
                    }

                    if (type === "Page") {
                        //set page id
                        id = node.getProperty('id');
                        newItem.find("a").text(label + ' (id: ' + id + ')');

                        if ((node.getChildrenCount() == 1) &&
                            (node.getChildren()[0].getType() === "Content") &&
                            (node.getChildren()[0].getChildrenCount() === 0)) {
                                 dumplog("only content in page");
                                newItem.toggleClass('folder')
                                       .remove('ul');
                        }
                    }

                    newItem.attr('adm-uid',UID);

                    // add click handler
                    newItem.click(function(e) {
                        $(this).toggleClass("close")
                        .children("ul").toggle();
                    e.stopPropagation();
                    });

                    newItem.find("a").click(function(e) {
                        var that =$(this).parent();
                        setSelected(that);
                        e.stopPropagation();
                        return false;  // Stop event bubbling
                    });

                    if (node.getChildrenCount() > 0) {
                        $subContainer = $container.find("#" + widgetID);
                    }
                }

                if (node.getChildrenCount() > 0) {
                    children = node.getChildren();
                    for (i = 0; i < children.length; i++) {
                        render_sub(children[i], $subContainer);
                    }
                }
                return;
            }

            $tree.empty();
            $('<ul id="pageList"></ul>').appendTo($tree);
            for ( var i = 0; i < ADM.getDesignRoot().getChildrenCount(); i++) {
                page = ADM.getDesignRoot().getChildren()[i];
                render_sub(page, $("#pageList", this.element));
            }

            // Now make sure the selected node is properly identified
            selected = ADM.getDesignRoot().findNodeByUid(ADM.getSelected()) ||
                ADM.getActivePage();
            if (selected) {
                $tree.find("#Outline-"+selected.getUid()+" > a")
                    .addClass('ui-state-active')
                    .addClass('ui-selected');
            }
            return true;
        },
    });
})(jQuery);
