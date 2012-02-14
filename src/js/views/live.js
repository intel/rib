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
                pageView,
                devices,
                deviceToolbar,
                deviceSelect,
                widget = this;

            o.designReset = this._designResetHander;
            o.selectionChanged = null;
            o.activePageChanged = this._activePageChangedHander;
            o.modelChanged = this._modelChangedHander;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            controlPanel = $('<div/>')
                .addClass('hbox')
                .addClass('flex0');

            pageView = $('<div/>')
                .addClass('vbox')
                .addClass('flex0')
                .css({ "min-width": 300, })  // FIXME: do this in CSS
                .pageView();
            pageView.pageView('option', 'model', ADM);

            devices = $('<div/>')
                .addClass('vbox')
                .addClass('flex1')
                .append('<div><span>DEVICES</span></div>');

            deviceToolbar = $('<div/>')
                .css({
                    backgroundColor: "#e4e5df",       // FIXME: do this in CSS
                    borderLeft:"1px solid #8c8d8d",   // FIXME: do this in CSS
                    borderBottom: "1px solid #b9b9b9" // FIXME: do this in CSS
                 })
                .appendTo(devices);

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

            controlPanel.append(pageView)
                .append(devices)
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
                    this._unbindADMEvents(value);
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
            var d = a && a.getDesignRoot();
            a.bind("designReset", this._designResetHandler, this);
            a.bind("activePageChanged", this._activePageChangedHandler, this);
            d.bind("modelUpdated", this._modelUpdatedHandler, this);
        },

        _unbindADMEvents: function(a) {
            var d = a && a.getDesignRoot();
            a.unbind("designReset", this._designResetHandler, this);
            a.unbind("activePageChanged", this._activePageChangedHandler, this);
            d.unbind("modelUpdated", this._modelUpdatedHandler, this);
        },

        _designResetHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh();
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
            widget._setPreviewPage(widget.options.model.getActivePage().
                getProperty('id'), widget);
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
