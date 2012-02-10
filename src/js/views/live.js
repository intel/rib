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
        },

        _create: function() {
            var o = this.options,
                e = this.element;

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
            this.options.tools.remove();
        },

        _setPreviewPage: function (pageId, widget) {
            widget = widget || this;
            var deviceScreen = $('#deviceScreen', widget.element),
                previewWindow = deviceScreen[0].contentWindow;
            if (previewWindow.$ && previewWindow.$.mobile)
                previewWindow.$.mobile.changePage("#" + pageId, {transition: "none"});
        },

        refresh: function(event, widget) {
            var stage = $('#liveView > .stage'),
                deviceScreen = $('#deviceScreen'),
                deviceImage = $('<img src= "src/css/images/phone.png"/>'),
                deviceWrapper,
                imageWidth = 421,
                imageHeight = 572,
                liveDoc;

            widget = widget || this;
            if (deviceScreen.length === 0)
            {
                stage.find('*').remove();
                deviceScreen = $('<iframe id="deviceScreen"/>')
                    .css({
                        position: 'absolute',
                        left: 50,
                        top: 43,
                        width:320,
                        height:480
                    });
                deviceWrapper = $('<div id="deviceWrapper" align="center"/>')
                    .append(deviceImage)
                    .append(deviceScreen)
                    .appendTo(stage)
                    .css({
                        width: imageWidth,
                        height: imageHeight,
                        padding:0,
                        overflow:'hidden',
                        position: 'absolute',
                        left: ($(document).width() - imageWidth)/2,
                        top: ($(document).height() - imageHeight)/2
                    });
            }
            liveDoc = deviceScreen.contents()[0];
            liveDoc.open();
            liveDoc.writeln(generateHTML());
            liveDoc.close();
            deviceScreen.load( function () {
                if (widget.options.model.getActivePage())
                    widget._setPreviewPage(widget.options.model.getActivePage().
                        getProperty('id'), widget);
            });
        },

        // Private functions
        _createPrimaryTools: function() {
            return $(null);
        },

        _createSecondaryTools: function() {
            return $(null);
        },

        _bindADMEvents: function(a) {
            var d = a && a.getDesignRoot();
            a.bind("designReset", this._designResetHandler, this);
            a.bind("selectionChanged", this._selectionChangedHandler, this);
            a.bind("activePageChanged", this._activePageChangedHandler, this);
            d.bind("modelUpdated", this._modelUpdatedHandler, this);
        },

        _unbindADMEvents: function(a) {
            var d = a && a.getDesignRoot();
            a.unbind("designReset", this._designResetHandler, this);
            a.unbind("selectionChanged", this._selectionChangedHandler, this);
            a.unbind("activePageChanged", this._activePageChangedHandler, this);
            d.unbind("modelUpdated", this._modelUpdatedHandler, this);
        },

        _designResetHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh();
        },

        _selectionChangedHandler: function(event, widget) {
            widget = widget || this;
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
    });
})(jQuery);
