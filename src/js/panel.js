(function($, undefined) {

    // My custom panel widget
    //
    // TODO:
    //    1. Add "close/open" feature that hides all but the handle on closing
    //       and restores to last position/size upon opening

    $.widget('ui.panel', $.ui.resizable, {
        options: {
            position: 'left',    // Determines anchoring edge
            layout: 'vertical',  // Determines contents layout
            maxSize: 0,         // If set, constrains growth
            minSize: 0,         // If set, constrains shrink
        },

        // constructor
        _create: function() {
            var self = this,
                e = self.element,
                o = self.options,
                p = o.position;

            self.posMap = {
                'left':   'e',
                'right':  'w',
                'top':    's',
                'bottom': 'n',
            };

            e.addClass('ui-panel vbox')
             .css({ 'position': 'relative',
                    'overflow': 'hidden' });
            e.children().addClass('ui-panel-contents');

            // Make additional elements used to decorate and manipulate
            // the panel with
            self.grip = $('<div></div>')
                .addClass('ui-panel-handle ui-panel-grip ui-icon')
                .css('position', 'absolute');

            // Set resizable handle based on position option
            self._setResizeOptions(p);

            // Chaining up to our super class 'ui.resizable'
            $.ui.resizable.prototype._create.call(self);

            // Add our class to the handle for CSS sizing control
            e.find('.ui-resizable-handle')
                .addClass('ui-panel-handle')
                .css({ 'position': 'absolute',
                       'display': 'block',
                       'overflow': 'hidden',
                       'font-size': '0px',
                       'text-indent': '-99999px',
                     });

            // Add our "grip" to the resizable handle
            self.grip.insertBefore(e.find('.ui-resizable-handle'));

            var h = e.find('.ui-resizable-handle.ui-panel-handle');
            if (/left|right/.test(p)) {
                e.css({'top': '0px',
                       'margin': '0px',
                       'padding': '0px'})
                 .css(''+p+'', '0px');
                h.css({'cursor': ''+self.posMap[p]+'-resize',
                       'top': '0px',
                       'height': '100%',
                       'width': '7px'});
                if (p=== 'left') {
                    e.css('padding-right', '2mm');
                    h.css('right', '0px');
                } else {
                    e.css('padding-left', '2mm');
                    h.css('left', '0px');
                }
            } else {
                e.css({'left': '0px',
                       'margin': '0px',
                       'padding': '0px'})
                 .css(''+p+'', '0px');
                h.css({'cursor': ''+self.posMap[p]+'-resize',
                       'left': '0px',
                       'width': '100%',
                       'height': '7px'});
                if (p === 'top') {
                    e.css('padding-bottom', '2mm');
                    h.css('bottom', '0px');
                } else {
                    e.css('padding-top', '2mm');
                    h.css('top', '0px');
                }
            }

            $(document).resize( function() { this.refresh(); });
        },

        // refresh any time options change (and on create)
        refresh: function() {
            var self = this;
            $.ui.resizable.prototype._destroy.call(self);
            $.ui.resizable.prototype._create.call(self);
            self.element.resizable('option', self.options);
        },

        // unbind from events and remove any modifications
        _destroy: function() {
            var self = this;

            // Chaining up to our super class 'ui.resizable'
            $.ui.resizable.prototype.destroy.call(self);

            self.element.find('.ui-panel-contents')
                .removeClass('ui-panel-contents');

            self.grip.remove();
        },

        // called for each option being changed, calls _refresh
        _setOption: function(k,v) {
            var self = this;

            switch (k) {
                case 'position':
                case 'maxSize':
                case 'minSize':
                    self._setResizeOptions();
                    break;
                case 'layout':
                    console.warn('Layout option not yet implemented');
                    break;
                default:
                    $.resizable.prototype._setOption.apply( self, k, v );
                    break;
            }

            self._refresh();
        },

        // called with a list of options to change, calls _setOption
        _setOptions: function() {
            var self = this;
            $.Widget.prototype._setOption.apply( self, arguments );
            self._refresh();
        },

        _setResizeOptions: function(pos) {
            var self = this,
                pos = pos||self.options.position,
                dir = self.posMap[pos];

            if (/left|right/.test(pos)) {
                self.grip.removeClass('ui-icon-grip-solid-vertical');
                self.grip.addClass('ui-icon-grip-solid-vertical');
                self.grip.css({ 'background-position': '-37px -224px',
                                'width': '7px',
                                'height': '16px',
                                'top': '50%'})
                    .css((pos === 'left')?'right':'left', '0px');
                self.options.maxWidth = self.options.maxSize;
                self.options.minWidth = self.options.minSize;
                self.options.maxHeight = null;
                self.options.minHeight = 10;

                if (/right/.test(pos)) {
                    self.options.resize = function(event, ui) {
                        ui.position.left = ui.originalPosition.left;
                    };
                }
            } else {
                self.grip.removeClass('ui-icon-grip-solid-horizontal');
                self.grip.addClass('ui-icon-grip-solid-horizontal');
                self.grip.css({ 'background-position': '-48px -229px',
                                'width': '16px',
                                'height': '7px',
                                'left': '50%'})
                    .css((pos === 'top')?'bottom':'top', '0px');
                self.options.maxWidth = null;
                self.options.minWidth = 10;
                self.options.maxHeight = self.options.maxSize;
                self.options.minHeight = self.options.minSize;
            }

            self.options.handles = dir;
        }
    });
})(jQuery);
