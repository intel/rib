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

// Layout view widget

(function($, undefined) {

    $.widget('rib.codeView', $.rib.baseView, {

        _setOption: function(key, value) {
            // Chain up to base class _setOptions()
            // FIXME: In jquery UI 1.9 and above, instead use
            //    this._super('_setOption', key, value)
            $.rib.baseView.prototype._setOption.apply(this, arguments);

            switch (key) {
                case 'model':
                    this.refresh(null, this);
                    break;
                default:
                    break;
            }
        },

        resize: function(event, widget) {
            var selected, activePage;
            widget = widget || this;

            if (!widget.element.data('visible')) return;

            $(widget._editor.getScrollerElement())
                .css('height', widget.element.height());
            widget._editor.refresh();

            selected = widget.options.model.getSelected();
            if (!selected) {
                activePage = widget.options.model.getActivePage();
                if (activePage) {
                    selected = activePage.getUid();
                }
            }
            if (selected)
                widget._selectCode(widget._htmlDoc.doc, selected);
        },

        refresh: function(event, widget) {
            var self = this, textCode;

            widget = widget || this;

            if (!widget.element.data('visible')) return;

            self._htmlDoc = $.rib.generateHTML();
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
                        {mode: "text/ribsrc", tabMode: "indent", readOnly: 'nocursor'});
                $(window).resize(function() {
                    widget.resize();
                });
            }

            widget._editor.setValue(self._htmlDoc.html);
        },

        // Private functions
        _createPrimaryTools: function() {
            return $(null);
        },

        _createSecondaryTools: function() {
            return $(null);
        },

        _selectionChangedHandler: function(event, widget) {
            widget = widget || this;

            if (!widget.element.data('visible')) return;

            widget._selectCode(widget._htmlDoc.doc, event.uid);
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
            if (!event.page || event.page === undefined ||
                !widget.options.model) {
                return;
            }

            if (!widget.element.data('visible')) return;

            widget.refresh();
            if (widget._editor)
                widget._editor.setValue(widget._htmlDoc.html);
            widget._selectCode(widget._htmlDoc.doc, event.page.getUid());
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;

            if (!widget.element.data('visible')) return;

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
        }
    });
})(jQuery);
