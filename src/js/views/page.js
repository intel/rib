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

// Page view widget

(function($, undefined) {

    $.widget('gb.pageView', {

        options: {
            model: null,
        },

        _create: function() {
            var o = this.options,
                e = this.element;

            o.designReset = null;
            o.selectionChanged = null;
            o.activePageChanged = this._activePageChangedHander;
            o.modelChanged = null;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            this.element
                .append('<div><span>PAGES</span></div>')
                .append('<div/>')
                .children(':last')
                    .attr({id: 'pages'});

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
            var pageWidgets,
                model = this.options.model,
                pages = $('#pages', this.element);

            if (model) {
                pageWidgets = model.getDesignRoot().getChildren();
                pages.empty();

                for ( var i = 0; i < pageWidgets.length; i ++) {
                    $('<div>'+(i+1)+'</div>')
                        .addClass('pageIcon')
                        .toggleClass('pageActive',
                            pageWidgets[i] === model.getActivePage())
                        .data('page', pageWidgets[i])
                        .click(function (e) {
                            model.setActivePage($(this).data('page'));
                        })
                        .appendTo(pages);
                }
            }
        },

        // Private functions
        _createPrimaryTools: function() {
            return $(null);
        },

        _createSecondaryTools: function() {
            return $(null);
        },

        _bindADMEvents: function(a) {
            a.bind("activePageChanged", this._activePageChangedHandler, this);
            // FIXME: Should also bind to modelUpdated, which is what fires
            //        when a page is added or removed
        },

        _unbindADMEvents: function(a) {
            a.unbind("activePageChanged", this._activePageChangedHandler, this);
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;

            // FIXME: This should just toggle 'pageActive' class, not
            //        cause a complete re-creation of the page list
            widget.refresh();
        },

    });
})(jQuery);
