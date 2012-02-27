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

            o.designReset = null;
            o.selectionChanged = null;
            o.activePageChanged = null;
            o.modelUpdated = null;

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
                    this._unbindADMEvents();
                    this._bindADMEvents(value);
                    this.refresh(null, value);
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
                revert: false,
                appendTo: 'body',
                iframeFix: true,
                containment: false,
                helper: 'clone',
                refreshPositions: true,
                stack: '.layoutView iframe',
                revertDuration: 0,
                start: function(event,ui){
                    if (ui.helper) {
                        if (ui.helper[0].id == "") {
                            ui.helper[0].id = this.id+'-helper';
                        }
                    }
                },
            })
            .disableSelection();
        },

    });
})(jQuery);
