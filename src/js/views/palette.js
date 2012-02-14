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

// Palette view widget


(function($, undefined) {

    $.widget('gb.paletteView', {

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

            var request = this._loadPaletteAsync();
            $.when(request).done(this._paletteLoadDoneCallback());

            $('<div/>').addClass(this.widgetName)
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
            this.options.primaryTools.remove();
            this.options.secondaryTools.remove();
        },

        refresh: function(event, widget) {
            widget = widget || this;
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
            widget._unbindADMEvents(this.options.model);
            widget._bindADMEvents(ADM.getDesignRoot());
            widget.refresh(event, widget);
        },

        _selectionChangedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event, widget);
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event, widget);
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event, widget);
        },

        _loadPaletteAsync: function() {
            var acc = $('.'+this.widgetName);

            // FIXME: Eventually, all widgets should come from the BWidget
            //        global structure.  For now, we load them as their own
            //        subcategory in the palette
            $(acc).append('<ul id="jqm-widgets"></ul>');
            $(acc).append('<ul id="Tizen-widgets"></ul>');
            var ul = $('#jqm-widgets');
            $.each(BWidget.getPaletteWidgetTypes(), function(n, id) {
                // Add new <li> element to hold this widget
                var li = $('<li id="BWidget-'+id+'"></li>').appendTo($(ul));
                $(li).button({
                    label: BWidget.getDisplayLabel(id),
                    icons: {primary: BWidget.getIcon(id)}
                });
                $(li).disableSelection();
                $(li).addClass('nrc-palette-widget');
                $(li).data("code", BWidget.getTemplate(id));
                $(li).data("adm-node", {type: id});

                // FIXME: This should probably be replaced by a more flexible
                //        concept of widget groups.
                if (BWidget.startsNewGroup(id)) {
                    $(ul).append("<hr>");
                }

                // FIXME: Shouldn't be using a hard coded static string to
                //        select the "next" accordion
                if (BWidget.startsNewAccordion(id)) {
                    ul = $('#Tizen-widgets');
                }

                $(ul).append($(li));
            });
        },

        _paletteLoadDoneCallback: function () {
            // FIXME: Create/use an API to fetch these selector strings...
            var w = $('.'+this.widgetName).find('.nrc-palette-widget');
            $('.'+this.widgetName).disableSelection();

            w.draggable({
                revert: 'invalid',
                zIndex: 1000,
                appendTo: 'body',
                scroll: false,
                iframeFix: true,
                containment: false,
                // FIXME: Create/use an API to fetch these selector strings...
                connectToSortable: '#design-view .nrc-sortable-container',
                helper: 'clone',
                opacity: 0.8,
                start: function(event,ui){
                    if (ui.helper[0].id == "") {
                        ui.helper[0].id = this.id+'-helper';
                    }
                },
            });

            w.disableSelection();
        },

    });
})(jQuery);
