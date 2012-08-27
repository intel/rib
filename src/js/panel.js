/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

(function($, undefined) {

    // Custom panel widget
    $.widget('ui.panel', $.ui.resizable, {
        options: {
            position: 'left',    // Determines anchoring edge
            layout: 'vertical',  // Determines contents layout
            maxSize: 0,         // If set, constrains growth
            minSize: 0          // If set, constrains shrink
        },

        // constructor
        _create: function() {
            var self = this;

            self.posMap = {
                'left':   'e',
                'right':  'w',
                'top':    's',
                'bottom': 'n'
            };

            self.element.addClass('ui-panel vbox')
                .css({'position': 'relative',
                      'overflow': 'hidden',
                      'top': '0px',
                      'margin': '0px',
                      'padding': '0px'});

            self.element.children().addClass('ui-panel-contents');

            // Create additional elements to decorate and control the panel
            self.bg = $('<div></div>')
                .addClass('ui-state-default ui-panel-bg')
                .css({'position': 'absolute',
                      'top': 'auto',
                      'left': '1px',
                      'right': '1px',
                      'bottom': '1px',
                      'width': 'auto',
                      'height': '16px'});

            self.closeToggle = $('<div></div>')
                .addClass('ui-panel-close ui-resizable-handle ui-icon')
                .css({'position': 'absolute',
                      'z-index': 'auto',
                      'cursor': 'pointer',
                      'top': 'auto',
                      'bottom': '1px',
                      'height': '16px',
                      'width': '16px'});

            self.openHandle = $('<div></div>').hide()
                .addClass('ui-panel-open-bg')
                .css({'position': 'absolute',
                      'z-index': 'auto',
                      'cursor': 'pointer',
                      'top': '1px',
                      'bottom': '1px',
                      'height': 'auto',
                      'width': '16px',
                      'background': '-webkit-linear-gradient(0, #fff, #eee)'});

            self.openToggle = $('<div></div>')
                .addClass('ui-panel-open ui-resizable-handle ui-icon')
                .css({'position': 'absolute',
                      'z-index': 'auto',
                      'cursor': 'pointer',
                      'top': '50%',
                      'bottom': '50%',
                      'height': '16px',
                      'width': '16px'})
                .appendTo(self.openHandle);

            // Convert 'position' into corresponding 'handles' option
            self.options.handles = self.posMap[self.options.position];

            // Convert '*Size' into corresponding *'Width' option
            self.options.maxWidth = self.options.maxSize;
            self.options.minWidth = self.options.minSize;
            self.options.maxHeight = null;
            self.options.minHeight = 10;

            // Chaining up to our super class 'ui.resizable'
            $.ui.resizable.prototype._create.call(self);

            // Cache and add our class to the handle for resize control
            self.grip = self.element.find('.ui-resizable-handle')
                .addClass('ui-panel-grip ui-icon ui-icon-grip-solid-vertical')
                .css({'position': 'absolute',
                      'z-index': 'auto',
                      'top': 'auto',
                      'bottom': '1px',
                      'height': '16px',
                      'width': '16px'});

            // Insert our additional elements
            self.bg.insertBefore(self.grip);
            self.closeToggle.insertBefore(self.grip);
            self.openHandle.insertBefore(self.grip);

            // Bind click handlers to open/close the panel
            self.closeToggle.add(self.openHandle)
                .click({ widget: self }, self._togglePanel);

            self.refresh();

            $(window).resize(this, function(event) {
                var el = event.data.element;
                if (el.parent().height() === 0)
                    return;
                // Force resize of the stage when containing window resizes
                el.height(el.parent().height());
             });
            // Be sure to refresh sized if the document resizes
            if ($(document).hasOwnProperty('resize')) {
                $(document).resize( function() { this.refresh(); });
            }
        },

        // refresh any time options change (and on create)
        refresh: function() {
            var self = this;

            // Adjust controls based on position option
            // NOTE: can only be called AFTER we call the resizable widgets
            //       _create() function and have cached self.grip
            self._adjustPositions();

            self.element.resizable('option', self.options);
        },

        // unbind from events and remove any modifications
        destroy: function() {
            var self = this;

            // Chaining up to our super class 'ui.resizable'
            $.ui.resizable.prototype.destroy.call(self);

            // Remove our class(es) added to this element
            self.element.find('.ui-panel-contents')
                .removeClass('ui-panel-contents');

            // Remove elements this widget added to the DOM
            self.bg.remove();
            self.closeToggle.remove();
            self.openHandle.remove();
        },

        // called for each option being changed, calls refresh
        _setOption: function(k,v) {
            var self = this;

            switch (k) {
                case 'position':
                    self.options.handles = self.posMap[self.options.position];
                    break;
                case 'maxSize':
                    self.options.maxWidth = self.options.maxSize;
                    self.options.maxHeight = null;
                    break;
                case 'minSize':
                    self.options.minWidth = self.options.minSize;
                    self.options.minHeight = 10;
                    break;
                case 'layout':
                    console.warn('Layout option not yet implemented');
                    break;
                default:
                    $.ui.resizable.prototype._setOption.call( self, k, v );
                    break;
            }

            self.refresh();
        },

        // called with a list of options to change, calls _setOption
        _setOptions: function() {
            var self = this;
            $.Widget.prototype._setOptions.call( self, arguments );
        },

        _adjustPositions: function() {
            var self = this,
                pos = self.options.position,
                dir = self.posMap[pos];

            self.element.css(''+pos+'', '0px');
            self.grip
                .css('cursor', ''+dir+'-resize')
                .css((pos === 'left')?'right':'left', '1px');
            self.closeToggle
                .css(''+pos+'', '1px');
            self.openHandle
                .css((pos === 'left')?'right':'left', '1px');
            self.openToggle
                .css((pos === 'left')?'right':'left', '1px');

            if (/left/.test(pos)) {
                self.closeToggle
                    .addClass('ui-resizable-sw ui-icon-triangle-1-w')
                self.openToggle
                    .addClass('ui-resizable-e ui-icon-triangle-1-e')
            } else {
                self.closeToggle
                    .addClass('ui-resizable-se ui-icon-triangle-1-e')
                self.openToggle
                    .addClass('ui-resizable-w ui-icon-triangle-1-w')
                self.options.resize = function(event, ui) {
                    ui.position.left = ui.originalPosition.left;
                };
            }
        },

        _togglePanel: function(event) {
            var self = event.data.widget,
                currentWidth = self.element.width()
                lastWidth = self.element.data('last-width');

            // Open panel
            if (currentWidth < self.options.minSize) {
                self.element.animate({width: lastWidth}, function() {
                    self.closeToggle
                        .add(self.bg)
                        .add(self.grip)
                        .fadeToggle();
                });
                self.openHandle
                    .fadeToggle('fast');
                self.grip.nextAll().show();
            }

            // Close panel
            else {
                self.element.data('last-width', currentWidth);
                self.element.animate({width: '16px'}, function() {
                    self.openHandle
                        .fadeToggle('fast');
                    self.grip.nextAll().hide();
                });
                self.closeToggle
                    .add(self.bg)
                    .add(self.grip)
                    .fadeToggle();
            }
        }
    });
})(jQuery);
