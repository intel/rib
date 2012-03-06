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
                e = this.element;

            e.addClass('gbTreeView');
            o.designReset = this._designResetHandler;
            o.selectionChanged = this._selectionChangedHandler;
            o.activePageChanged = this._activePageChangedHandler;
            o.modelUpdated = this._modelUpdatedHandler;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            $('<div/>')
                .addClass('ui-widget-content')
                .addClass('outline_content')
                .appendTo(this.element);


            this.refresh(null, this);

            return this;
        },

        _setOption: function(key, value) {
            switch (key) {
                // Should this REALLY be done here, or plugin registration in
                // the "host"... using the functions mapped in widget options?
                case 'model':
                    this._unbindADMEvents();
                    this._bindADMEvents(value);
                    this.refresh(null, this);
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
            widget._renderOutlineView();
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
                if (o.activePageChanged) {
                    a.bind("activePageChanged", o.activePageChanged, this);
                }

                // Since model changed, need to call our designReset hander
                // to sync up the ADMDesign modelUpdated event handler
                if (o.designReset) {
                    o.designReset({design: a.getDesignRoot()}, this);
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
                if (o.activePageChanged) {
                    a.unbind("activePageChanged", o.activePageChanged, this);
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

            // Deactive state of selected before
            widget.element.find($('.outline_content'))
                .find('.ui-state-active')
                .removeClass('ui-state-active')
                .end()
                .find('.ui-selected')
                .removeClass('ui-selected');

            // Find this node in outline pane
            rootNode = widget.element.find(".pageList");
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
            widget.element.find($('.outline_content'))
                .find('.ui-selected:first', this)
                .each(function (){
                    this.scrollIntoViewIfNeeded();
                });
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;

            if (!event.page || event.page === undefined ||
                !widget.options.model) {
                return;
            }

            if (event.page.getUid() === widget.options.model.getActivePage()) {
                return;
            }

            widget.refresh(event, widget);
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event, widget);
        },

        _renderOutlineView: function() {
            var page, selected,
                self = this,
                model = self.options.model, root,
                $tree = self.element.find('.outline_content');

            if (!model) {
                return false;
            } else {
                root = model.getDesignRoot();
            }

            $tree.empty();
            $('<ul/>')
                .addClass('pageList')
                .appendTo($tree);
            for (var i = 0; i < root.getChildrenCount(); i++) {
                page = root.getChildren()[i];
                render_sub(page, self.element.find('.pageList'));
            }

            // Now make sure the selected node is properly identified
            selected = root.findNodeByUid(model.getSelected()) ||
                       model.getActivePage();
            if (selected) {
                $tree.find("#Outline-"+selected.getUid()+" > a")
                    .addClass('ui-state-active')
                    .addClass('ui-selected');
            }
            return true;

            function  setSelected(item) {
                var UID = $(item).attr('adm-uid');

                // find whether selected widget in current active page
                var currentNode = root.findNodeByUid(UID);
                while (currentNode.getType() !== "Page" &&
                       currentNode.getType() !=="Design") {
                    currentNode = currentNode.getParent();
                }
                if (currentNode.getType() !== "Page") {
                    return;
                }
                if (model.getActivePage() !== currentNode) {
                    model.setActivePage(currentNode);
                }

                model.setSelected(UID);
            }

            function render_sub(node, $container) {
                var newItem, children, i, type, UID, showInOutline, widgetID,
                    label, id, $subContainer, labelFunc;

                if (!(node instanceof ADMNode)) {
                    return;
                }

                type = node.getType();
                UID = node.getUid();
                showInOutline = BWidget.isPaletteWidget(type) ||
                    (type === "Page");
                widgetID = type + '-' + UID;
                $subContainer = $container;

                labelFunc = BWidget.getOutlineLabelFunction(type);
                if (labelFunc) {
                    label = labelFunc(node);
                    if (label) {
                        $container.append($('<li class="label">' +
                                            labelFunc(node) + '</li>'));
                    }
                }

                label = BWidget.getDisplayLabel(type);

                // check whether current node should be shown in outline pane
                if (showInOutline) {
                    newItem = $('<li><span/><a><span/></a></li>')
                       .find('span:last')
                       .addClass('widgetType')
                       .text(label)
                       .end()
                       .attr('id', 'Outline-' + UID)
                       .appendTo($container);

                    if (node.hasUserVisibleDescendants()) {
                        newItem.find('span:first')
                               .addClass('folder')
                               .end()
                               .append('<ul/>')
                               .find('ul')
                               .attr('id', widgetID)
                               .addClass('widgetGroup');
                        $subContainer = $container.find("#" + widgetID);
                    } else {
                        newItem.find('span:first')
                               .addClass('singleItem')
                               .html("&#x2022;");
                    }

                    if (type === "Page") {
                        //set page id
                        id = node.getProperty('id');
                        newItem.find("a")
                            .append('<span/>')
                            .children(':last')
                            .addClass('pageTitle')
                            .text(' (' + id + ')');
                    }

                    newItem.attr('adm-uid', UID);

                    // add click handler
                    newItem.find('span:first')
                        .click(function(e) {
                            $(this).toggleClass("close")
                                .parent()
                                .children("ul").toggle();
                            e.stopPropagation();
                    });

                    newItem.find("a").click(function(e) {
                        var that =$(this).parent();
                        setSelected(that);
                        e.stopPropagation();
                        return false;  // Stop event bubbling
                    });
                }

                if (node.getChildrenCount() > 0) {
                    children = node.getChildren();
                    for (i = 0; i < children.length; i++) {
                        render_sub(children[i], $subContainer);
                    }
                }
                return;
            }
        },
    });
})(jQuery);
