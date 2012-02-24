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

    $.widget('gb.liveView', {

        options: {
            model: null,
            iframe: null,
            contentDocument: null,
        },

        _create: function() {
            var o = this.options,
                controlPanel,
                pagePanel,
                devicePanel,
                deviceToolbar,
                deviceSelect,
                widget = this;

            o.designReset = this._designResetHandler;
            o.selectionChanged = null;
            o.activePageChanged = this._activePageChangedHandler;
            o.modelUpdated = this._modelUpdatedHandler;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            controlPanel = $('<div/>')
                .addClass('tools')
                .addClass('hbox')
                .addClass('flex0');

            pagePanel = $('<div/>')
                .addClass('panel-section')
                .addClass('vbox')
                .addClass('flex0')
                .css({ "min-width": 300, })  // FIXME: do this in CSS
                .pageView();
            pagePanel.pageView('option', 'model', ADM);

            devicePanel = $('<div/>')
                .addClass('panel-section')
                .addClass('vbox')
                .addClass('flex1');

            $('<div/>')
                .addClass('panel-section-header')
                .append('<div>devices</div>')
                .children().last()
                    .addClass('title')
                    .end()
                .end()
                .appendTo(devicePanel);

            deviceToolbar = $('<div/>')
                .addClass('panel-section-contents')
                .appendTo(devicePanel);

            deviceSelect = $('<select></select>')
                .appendTo(deviceToolbar)
                .change(function () {
                    $("option:selected", this).each(function () {
                        widget._setDevice($(this).data('deviceInfo'));
                    });
            });

            $.getJSON("src/assets/devices.json", function (data) {
                $.each(data, function (key, val) {
                    $('<option/>').append( key )
                        .data('deviceInfo', val.Default)
                        .appendTo(deviceSelect);
                });
                deviceSelect.trigger('change');
            });

            controlPanel.append(pagePanel)
                .append(devicePanel)
                .appendTo(this.element);

            this.options.iframe = $('<iframe/>')
                .attr({id:'deviceScreen'})
                .addClass('flex1')
                .appendTo(this.element);

            this.options.contentDocument =
                $(this.options.iframe[0].contentDocument);

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
            this.options.primaryTools.remove();
            this.options.secondaryTools.remove();
        },

        refresh: function(event, widget) {
            var iframe,
                liveDoc;

            widget = widget || this;
            iframe = widget.options.iframe;
            if (iframe.length) {
                liveDoc = widget.options.contentDocument[0];
                liveDoc.open();
                liveDoc.writeln(generateHTML());
                liveDoc.close();
                iframe.load( function () {
                    var page = widget.options.model.getActivePage() || null;
                    if (page) {
                        widget._setPreviewPage(page.getProperty('id'), widget);
                    }
                });
            }
        },

        // Private functions
        _setDevice: function (info) {

            // TODO: This may be better managed by reading and applying
            //       per-device CSS files from the filesystem at run time.
            //       By finding all *.css files under src/assets/devices, we
            //       could simply change the element "class" or custom
            //       attribute (data-device="<devicename>").  Then these
            //       dimensional properties can be set by the UX team, and
            //       never require changes to devices.json or this code...

            this.options.iframe.css({
                width: info.screen.width,
                minWidth: info.screen.width,
                maxWidth: info.screen.width,
                height: info.screen.height,
                minHeight: info.screen.height,
                maxHeight: info.screen.height,
                paddingTop: info.screen.offset.top,
                paddingRight: info.screen.offset.right,
                paddingBottom: info.screen.offset.bottom,
                paddingLeft: info.screen.offset.left,
                backgroundSize: info.skin.width+' '+info.skin.height,
                backgroundImage: 'url('+info.skin.href+')',
            });
        },

        _createPrimaryTools: function() {
            return $(null);
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

        _activePageChangedHandler: function(event, widget) {
            var id, win,
                newPage = event && event.page, curPage;

            widget = widget || this;

            // Only change if new page is valid
            if (!newPage) {
                return;
            }
            id = newPage.getProperty('id');
            curPage = widget.options.model.getActivePage();

            // Only change if new page not the current page
            if (curPage && curPage.getUid() === id) {
                return;
            }

            win = widget.options.contentDocument[0].defaultView;

            if (win && win.$ && win.$.mobile) {
                win.$.mobile.changePage("#"+id, {transition: "none"});
            }
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh();
        },

        _setPreviewPage: function (pageId, widget) {
            var win;

            widget = widget || this;
            win = widget.options.contentDocument[0].defaultView;

            if (win && win.$ && win.$.mobile) {
                win.$.mobile.changePage("#" + pageId, {transition: "none"});
            }
        },
    });
})(jQuery);
