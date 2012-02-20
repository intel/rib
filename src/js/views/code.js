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

    $.widget('gb.codeView', {

        options: {
            model: null,
        },

        _create: function() {
            var o = this.options,
                e = this.element;

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

            $('<div/>').addClass(this.widgetName)
                .text(this.widgetName)
                .appendTo(this.element);

            this.options.primaryTools = this._createPrimaryTools();
            this.options.secondaryTools = this._createSecondaryTools();

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
            this.options.tools.remove();
        },

        resize: function(event, widget) {
            widget = widget || this;
            $(widget._editor.getScrollerElement())
                .css('height', widget.element.height());
            widget._editor.refresh();
            widget._selectCode(widget._htmlDoc.doc,
                    widget.options.model.getSelected()?
                    widget.options.model.getSelected():
                    widget.options.model.getActivePage().getUid());
        },

        refresh: function(event, widget) {
            var self = this, textCode;

            widget = widget || this;
            self._htmlDoc = generateHTML();
            textCode = $(self.element).find('#text-code');

            if (textCode.length === 0) {
                self.element.find('*').remove();
                textCode = $('<textarea></textarea>')
                    .attr({'id': 'text-code',
                           'readonly': 'readonly'})
                    .css({ 'overflow': 'auto',
                           'resize':  'none',
                           'min-height': '100%',
                           'width': '100%',
                           'border': 0,
                           'margin': 0,
                           'padding': 0 });
                self.element.append(textCode);
                self.element.css('overflow','visible');
                widget._editor = CodeMirror.fromTextArea(textCode[0],
                        {mode: "text/gbsrc", tabMode: "indent", readOnly: true});
                $(window).resize(function() {
                    widget.resize();
                });
            }

            widget._editor.setValue(self._htmlDoc.html);
        },

        // Private functions
        _createPrimaryTools: function() {
            var tools =$('<div/>'), button,
                commands = ['undo', 'redo', 'cut', 'copy', 'paste'];

            tools.addClass('hbox').hide();
            $.each(commands, function(i, t) {
                button =$('<button/>').addClass("buttonStyle ui-state-default")
                .attr('id', 'btn' + t)
                .appendTo(tools);
            });
            return tools;
        },

        _createSecondaryTools: function() {
            return $(null);
        },

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

        _unbindADMEvents: function() {
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
            widget = widget || this;
            widget._selectCode(widget._htmlDoc.doc, event.uid);
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh();
            if (widget._editor)
                widget._editor.setValue(widget._htmlDoc.html);
            widget._selectCode(widget._htmlDoc.doc, event.page.getUid());
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh();
        },

        _selectCode: function (resultDoc, selectedUid) {
            var widget = this;
            $(resultDoc).find(':data(uid)').each(function () {
                if ($(this).data('uid') === selectedUid) {
                    var findNodesByHTML = function (node, html) {
                        var nodes = [];
                        if (node.outerHTML === html) {
                            nodes.push(node);
                        }
                        else $.each($(node).children(), function () {
                            $.merge(nodes, findNodesByHTML(this, html));
                        });
                        return nodes;
                     },
                        selectedHTML =
                            formatHTML(xmlserializer.serializeToString(this)),
                        similarNodes =
                            findNodesByHTML(this.ownerDocument.documentElement,
                                    this.outerHTML),
                        index = $.inArray(this, similarNodes),
                        //Sometimes, jQM use multiple nodes to define a widget,
                        //so we have to search for the combined html
                        nextNode = $(this),
                        regNode, matched, matchedIndex = 0;
                     while ((nextNode = nextNode.next())[0]){
                        if (nextNode.data('uid') === selectedUid)
                            selectedHTML += ("\n" +
                                    formatHTML(xmlserializer
                                        .serializeToString(nextNode[0])));
                     }
                     regNode =
                         new RegExp(selectedHTML.split(/ *\n */).join("\\s*"),'mg');

                     while (matched = regNode.exec(widget._htmlDoc.html)){
                         if (matchedIndex ++ === index ) {
                             var textCode = widget._editor.getScrollerElement();
                             widget._editor.setSelection
                                 (widget._editor.posFromIndex(matched.index),
                                  widget._editor.posFromIndex(regNode.lastIndex));
                             textCode.scrollTop =
                                 textCode.scrollHeight/widget._htmlDoc.html.length
                                 * matched.index - textCode.clientHeight/2;
                             break;
                         }
                     }
                     return false;
               }
            });
        },
    });
})(jQuery);
