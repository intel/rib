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

(function ($, undefined) {

    $.widget('rib.layoutView', $.rib.baseView, {

        options: {
            iframe: null,
            contentDocument: null,
            customHeaders: {
                'meta': [
                    '<meta http-equiv="cache-control" content="no-cache">'
                ],
                'script': [
                    '<script src="lib/jquery-ui-1.8.16.custom.js"></script>',
                    '<script src="src/js/jquery-workarounds.js"></script>',
                    '<script src="src/js/composer.js"></script>'
                ],
                'link': [
                    '<link href="src/css/composer.css" rel="stylesheet">'
                ]
            }
        },

        _create: function () {
            var o = this.options,
                e = this.element;

            // Chain up to base class _create()
            $.rib.baseView.prototype._create.call(this);

            this.options.iframe = this.element.find('iframe');
            if (!this.options.iframe.length) {
                this.options.iframe = $('<iframe/>');
            }

            this.options.iframe.addClass(this.widgetName)
                .addClass('flex1')
                .appendTo(this.element);

            this.options.contentDocument =
                $(this.options.iframe[0].contentDocument);

            $(window).resize(this, function (event) {
                var el = event.data.element,
                    doc = event.data.options.contentDocument,
                    iframe = event.data.options.iframe;

                // Nothing to resize if iframe contents has not been loaded
                if (!event || !event.data || !event.data.loaded) return;

                // Force resize of the stage when containing window resizes
                el.height(el.parent().height());
                el.find('div').height(el.parent().height());
                // Force resize of the iframe when containing window resizes
                iframe.height(doc.height());
                iframe.css('min-height',
                            el.height() - 2
                            - parseFloat(iframe.css('margin-top'))
                            - parseFloat(iframe.css('margin-bottom'))
                            - parseFloat(iframe.css('padding-bottom'))
                            - parseFloat(iframe.css('padding-bottom')));
            });

            return this;
        },

        _setOption: function (key, value) {
            // Chain up to base class _setOptions()
            // FIXME: In jquery UI 1.9 and above, instead use
            //    this._super('_setOption', key, value)
            $.rib.baseView.prototype._setOption.apply(this, arguments);

            switch (key) {
                // Should this REALLY be done here, or plugin registration in
                // the "host"... using the functions mapped in widget options?
                case 'model':
                    this.options.iframe.load(this, this._iframeLoaded);
                    this._createDocument();
                    break;
                default:
                    break;
            }
        },

        refresh: function (event, widget) {
            var name, visible;
            widget = widget || event && event.data || this;
            name = (event)?(event.name)?event.name:event.type:'';
            visible = widget.element.data('visible');

            if (!widget.loaded) {
                return;
            }
            if (event && (name === "designReset" || (name === 'modelUpdated'
                && event.node && event.node.getType() === 'Design'))) {
                widget._createDocument();
            }

            if (event && (name !== 'designReset') && !visible) {
                return;
            }

            if ((!event) || (name === 'load' ||
                             name === 'designReset' ||
                             name === 'modelUpdated')) {
                widget._serializeADMDesignToDOM();
/* FIXME: Calling serializeADMSubtreeToDom is not actually forcing the
          the DOM to update, but it should work...

                switch (event.type) {
                    case 'nodeAdded':
                    case 'nodeRemoved':
                        serializeADMSubtreeToDOM(event.parent, null,
                                                 widget._renderer);
                        break;
                    case 'nodeMoved':
                        serializeADMSubtreeToDOM(event.oldParent, null,
                                                 widget._renderer);
                        serializeADMSubtreeToDOM(event.newParent, null,
                                                 widget._renderer);
                        break;
                    case 'propertyChanged':
                        serializeADMSubtreeToDOM(event.node, null,
                                                 widget._renderer);
                        break;
                    default:
                        console.warn(widget.widgetName,
                                     ':: Unexpected modelUpdate type:',
                                     event.type);
                        return;
                        break;
                }
*/
            } else {
                console.warn(widget.widgetName,':: Unexpected event:',name);
                return;
            }

            if (widget.options.contentDocument.length) {
                widget.options.contentDocument[0].defaultView
                    .postMessage('reload', '*');
            } else {
                console.error(widget.widgetName, ':: Missing contentDocument');
            }
        },

        // Private functions
        _iframeLoaded: function (event) {
            event.data.loaded = true;
            event.data.refresh(null, event.data);
            event.data.options.contentDocument[0].contentEditable = false;
        },

        _createPrimaryTools: function () {
            var doc, html, classes, selector,
                commands = ['undo', 'redo', 'cut', 'copy', 'paste'];

            classes = "buttonStyle primary-tools ui-state-default";
            html = $('<div/>').addClass('hbox').hide();
            $.each(commands, function (index, command) {
                $('<button/>').addClass(classes)
                    .attr('id', 'btn' + command)
                    .appendTo(html);
            });

            doc = $((this.element)[0].ownerDocument);
            selector = "button.primary-tools"
            doc.delegate(selector, "click", jQuery.proxy(function (event) {
                var model = this.options.model;
                if (model) {
                    switch (event.currentTarget.id) {
                    case "btnundo":  model.undo();  break;
                    case "btnredo":  model.redo();  break;
                    case "btncut":   model.cut();   break;
                    case "btncopy":  model.copy();  break;
                    case "btnpaste": model.paste(); break;
                    default:
                        console.warn("Unhandled click on primary tool");
                        break;
                    }
                }
                else {
                    console.warn("No model while attempting undo");
                }
            }, this));

            return html;
        },

        _createSecondaryTools: function () {
            return $(null);
        },

        _selectionChangedHandler: function (event, widget) {
            var uid;
            widget = widget || this;

            // Always un-style currently selected nodes
            widget.options.contentDocument.find('.ui-selected')
                .removeClass('ui-selected');

            // Only apply selection style changes on valid nodes
            if (!event || (!event.uid && !event.node)) {
                return;
            }

            // Normally, ADM node id is provided in event.uid
            uid = event && event.uid;
            // Fallback is to try event.node.getUid()
            uid = uid || (event.node)?event.node.getUid():null;

            if (uid) {
                widget.options.contentDocument
                    .find('.adm-node[data-uid=\''+uid+'\']')
                    .not('[data-role=\'page\']')
                    .addClass('ui-selected').first().each(function () {
                        // Scroll selected node into view
                        setTimeout($.proxy(function () {
                            this.scrollIntoViewIfNeeded()
                        }, this), 100);
                    });
            }
        },

        _activePageChangedHandler: function (event, widget) {
            var win,
                newPage = event && event.page,
                id = newPage && newPage.getProperty('id');

            widget = widget || this;

            // Only change if new page is valid
            if (!newPage) {
                return;
            }

            win = widget.options.contentDocument[0].defaultView;

            if (win && win.$ && win.$.mobile) {
                if (win.$.mobile.activePage &&
                    win.$.mobile.activePage.attr('id') !== id) {
                    win.$.mobile.changePage("#"+id, {transition: "none"});
                }
            }
        },

        _modelUpdatedHandler: function (event, widget) {
            var win, aPage, pageNode,
                oldScrollTop = (widget.options.contentDocument.scrollTop());

            widget = widget || this;

            widget.refresh(event, widget);

            win = widget.options.contentDocument[0].defaultView;
            if (win && win.$ && win.$.mobile) {
                aPage = widget.options.model.getActivePage();
                if (aPage) {
                    pageNode = win.$('#' + aPage.getProperty('id'));
                    if (pageNode.length) {
                        win.$.mobile.changePage(pageNode);
                    } else {
                        // TODO: this is okay when last page is deleted, so
                        //       maybe this warning can be removed
                        console.warn("No such page found: ",
                                     aPage.getProperty('id'));
                    }
                } else {
                    win.$.mobile.initializePage();
                }
            } else {
                console.error(widget.widgetName, ':: Missing contentDocument');
            }
            widget.options.contentDocument.scrollTop(oldScrollTop);
            // Make sure Make sure selected node is visible
            widget.options.contentDocument.find('.ui-selected').first().each(function () {
                this.scrollIntoViewIfNeeded()
            });
        },

        _createDocument: function () {
            var contents, doc;

            if (!this.designRoot) return;

            doc = this.options.contentDocument[0];
            doc.open();
            contents = this._serializeFramework(this.designRoot);
            doc.writeln(contents);
            doc.close();
            $.rib.enableKeys($(doc.documentElement));
        },

        _serializeFramework: function () {
            var start, end, ret, headers;

            headers = this._getCustomHeaders();

            start = '<!DOCTYPE html>\n <html><head><title>Page Title</title>\n';
            end = "</head>\n<body>\n</body>\n</html>";

            if (headers && headers.length > 0) {
                ret = start + headers.join('\n') + end;
            } else {
                ret = start + end;
            }

            return ret;
        },

        // Great assumptions are being made here that the incoming default
        // headers are already "sorted" and in the order in which they should
        // be inserted into the <head/> node of the document being created...
        _getCustomHeaders: function () {
            var dh = $.rib.getDesignHeaders(null, true),   // default headers
                ch = this.options.customHeaders, // our custom headers
                m, s;

            $.each(dh, function (idx) {
                if (/<meta/.test(this)) {
                    m = idx+1; // Insert our Meta after LAST one
                    return;
                }
                if (/<script.*jquery-[0-9]*\.[0-9]*\.[0-9]*\.js/.test(this)) {
                    s = s || idx+1; // Insert our Script after FIRST one
                    return;
                }
                // No need to handle "<link/>" entries, as we just append
                // our <link> at the end of all the headers
            });

            return [].concat(dh.slice(0,m), ch.meta,
                             dh.slice(m,s), ch.script,
                             dh.slice(s),   ch.link);
        },

        _serializeADMDesignToDOM: function () {
            this.options.contentDocument.find('body >  div[data-role="page"]')
                .remove();
            $.rib.serializeADMSubtreeToDOM(this.designRoot, null, true, this._renderer);
        },

        _renderer: function (admNode, domNode) {
            if (!domNode) {
                return;
            }

            // Attach the ADM UID to the element as an attribute so the DOM-id
            // can change w/out affecting our ability to index back into the
            // ADM tree
            // XXX: Tried using .data(), but default jQuery can't select on this
            //      as it's not stored in the element, but rather in $.cache...
            //      There exist plugins that add the ability to do this, but
            //      they add more code to load and performance impacts on
            //      selections
            $(domNode).attr('data-uid',admNode.getUid());

            // Add a special (temporary) class used by the JQM engine to
            // easily identify the "new" element(s) added to the DOM
            $(domNode).addClass('nrc-dropped-widget');

            // NOTE: if we bring back non-link buttons, we may need this trick
            // Most buttons can't be dragged properly, so we put them behind
            // the associated span, which can be dragged properly
            // if (!isLinkButton(admNode))
            //     $(domNode).css("z-index", "-1");

            $(domNode).addClass('adm-node');

            // If this node is "selected", make sure it's class reflects this
            if (admNode.isSelected() && !admNode.instanceOf('Page')) {
                $(domNode).addClass('ui-selected');
            }

            // If this node is a "container", make sure it's class reflects this
            if (admNode.isContainer()) {
                $(domNode).addClass('nrc-sortable-container');
                if (admNode.getChildrenCount() === 0) {
                    $(domNode).addClass('empty');
                } else {
                    $(domNode).removeClass('empty')
                }
                // If this node should have a drag header, make sure it's class
                // reflects this
                if (admNode.isHeaderVisible()) {
                    $(domNode).addClass('ui-drag-header');
                    $(domNode).attr('header-label',
                                    BWidget.getDisplayLabel(admNode.getType()));
                }
            }

            // If this node is "editable", make sure it's class reflects this
            if (admNode.isEditable()) {
                $(domNode).addClass('adm-editable');
            }

            // If this node is a "dialog", make it display as "page" in layout view
            if (admNode.getType() === "Page" && admNode.getProperty("dialog") === true) {
                // FIXME: This is one of many examples of places where
                // hard-coded logic about a specific widget should be pulled out
                // into something in the widget registry description that we can
                // discover generically here.
                $(domNode).attr('data-role', 'page');
            }

            // FIXME: This is a bit of a hack; we're removing the disabled
            // attribute from widgets because when they're disabled, they
            // lose mouse clicks and can't be selected. This code is assuming
            // the top level dom node in the object is the one with the disabled
            // attribute, which is not true for Slider, so I've removed the
            // attribute from the children, too. But this should really be done
            // accurately and intentionally by a selector for where the
            // attribute should be applied.
            // The best solution would be to display the widgets as disabled,
            // but be able to still capture clicks on them somehow, and remove
            // these lines.
            $(domNode).removeAttr('disabled');
            $(domNode).children().removeAttr('disabled');
        }
    });
})(jQuery);
