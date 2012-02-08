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

        refresh: function(event, widget) {
            var self = this, textCode;

            widget = widget || this;
            self.resultHTML = generateHTML();
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
                $(window).resize(function() {
                    self.element.height($(self.element.parent()).height());
                });
            }

            textCode.val(self.resultHTML);
        },

        // Private functions
        _createPrimaryTools: function() {
            return $('<div/>').addClass('hbox').hide()
                .append('<button class="ui-state-default">undo</button>')
                .append('<button class="ui-state-default">redo</button>')
                .append('<button class="ui-state-default">cut</button>')
                .append('<button class="ui-state-default">copy</button>')
                .append('<button class="ui-state-default">paste</button>');
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
            widget.refresh();
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh();
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh();
        },
    });
})(jQuery);
