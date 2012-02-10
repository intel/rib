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

// GUI Builder jQuery Plugin
(function($, undefined) {

    $.widget('gb.guibuilder', {

        options: {
            debugMode: false,
            embedded: false,
            locale: 'en_US',
            model: undefined,
        },

        _create: function() {
            var e = this.element,
                o = this.options;

            this.ui = this.ui || {};

            // Must have a valid data model
            // FIXME: This should work, but doesn't due to $.merge(deep copy?)
            //o.model = o.model || ADM || undefined;
            o.model = ADM;
            if (!o.model) {
                console.assert('Missing ADM');
                return undefined;
            }

            // Intial binding to ADM designReset events
            this._designReset();
            o.model.bind('selectionChanged', this._selectionChanged, this);
            o.model.bind('activePageChanged', this._activePageChanged, this);

            // Title the document
            document.title = 'GUI Builder';

            // Make sure the body is empty
            $(document.body).empty();

            this._constructApp($(document.body));

            // Fixes PTSDK-130: Block right-click context menu in code and
            // preview div wrappers
            $('.stage').bind('contextmenu', function(e) {e.preventDefault();});

            // Now invoke any view plugins on appropriate elements
            this._bindViewPlugins();

            this.refresh();
        },

        _setOption: function(key, value) {
            switch (key) {
                case 'debugMode':
                case 'embedded':
                    console.error(key, 'can not be changed!');
                    break;
                case 'locale':
                    console.warn('Changing the locale is not yet supported');
                    break;
                case 'model':
                    console.warn('Changing the model is not yet supported');
                    break;
                default:
                    $.resizable.prototype._setOption.apply( this, key, value );
                    break;
            }
            this.refresh();
        },

        // Public functions
        destroy: function() {
            // FIXME: Probably stuff we should be doing here
        },

        refresh: function() {
            var ns = $[this.namespace];

            this._syncInterfaceCache();

            // Refresh all view plugins
            $.each(ns.views, function (i, val) {
                // $.widget plugins provide thier own selectors, so we
                // use that to call the plugins "refresh" method on all
                // elements it has been instantiated on...
                $(':gb-'+val)[val]('refresh');
            });
        },

        // Private helper functions
        _constructApp: function(container) {
            $('<ul/>').appendTo(container)
                .append('<li><a href="#projectView">Project</a></li>')
                .append('<li><a href="#layoutView">Layout</a></li>')
                .append('<li><a href="#codeView">Code</a></li>')
                .append('<li><a href="#liveView">Preview</a></li>');

            // Add the view plugins
            this.ui.projectView = $('<div/>').appendTo(container)
                .attr('id', 'projectView')
                .addClass('view project flex1 hbox');
            this.ui.projectView.append('<div class="panel left">');
            this.ui.projectView.append('<div class="stage flex1 vbox">');
            this.ui.projectView.find('.panel.left')
                .panel({
                    position: 'left',
                    maxSize: '320',
                    minSize: '160',
                })
                .append('<div class="tagFilterView flex1 vbox"></div>');

            this.ui.layoutView = $('<div/>').appendTo(container)
                .attr('id', 'layoutView')
                .addClass('view layout flex1 hbox');
            this.ui.layoutView.append('<div class="panel left">');
            this.ui.layoutView.append('<div class="stage flex1 vbox">');
            this.ui.layoutView.append('<div class="panel right">');
            this.ui.layoutView.find('.panel.left')
                .panel({
                    position: 'left',
                    maxSize: '320',
                    minSize: '160',
                })
                .append('<div class="outlineView flex1 vbox"></div>')
                .append('<div class="propertyView flex1 vbox"></div>');

            this.ui.layoutView.find('.panel.right')
                .panel({
                    position: 'right',
                    maxSize: '320',
                    minSize: '160',
                })
                .append('<div class="widgetView flex1 vbox"></div>')
                .append('<div class="paletteView flex1 vbox"></div>');

            this.ui.codeView = $('<div/>').appendTo(container)
                .attr('id', 'codeView')
                .addClass('view code flex1 hbox');
            this.ui.codeView.append('<div class="panel left">');
            this.ui.codeView.append('<div class="stage flex1 vbox">');
            this.ui.codeViewLeftPanel = this.ui.codeView.find('.panel.left')
                .panel({
                    position: 'left',
                    maxSize: '320',
                    minSize: '160',
                })
                .append('<div class="outlineView flex1 vbox"></div>')
                .append('<div class="propertyView flex1 vbox"></div>');

            this.ui.liveView = $('<div/>').appendTo(container)
                .attr('id', 'liveView')
                .addClass('view live flex1');
            this.ui.liveView.append('<div class="stage flex1 vbox">');

            $('.outlineView').each( function () {
                $(this).outlineView();
                $(this).outlineView('option', 'model', ADM);
            });

            $('.propertyView').each( function () {
                $(this).propertyView();
                $(this).propertyView('option', 'model', ADM);
            });

            $('.paletteView').each( function () {
                $(this).paletteView();
                $(this).paletteView('option', 'model', ADM);
            });

            // Turn the body into a jQuery-UI "tabs" widget
            // TODO: Get starting tab from session cookie
            container.tabs({
                selected: 0,
                show: $.proxy(this._tabChanged, this),
            });

            // Create the navbar
            this.ui.navbar = $('<div/>').prependTo(container)
                .addClass('navbar hbox');

            // Move the tab buttons into the navbar
            $('.ui-tabs-nav').detach().appendTo(this.ui.navbar)
                .addClass('flex0');

            // Create the Primary toolbar
            this.ui.tools = $('<div/>').appendTo(this.ui.navbar)
                .addClass('tools-primary flex2 hbox');

            // Create the Secondary toolbar
            this.ui.extras = $('<div/>').appendTo(this.ui.navbar)
                .addClass('tools-secondary flex1 hbox');
            $('<div/>').addClass('default-tools hbox').show()
                .append('<a>settings</a>')
                .append('<hr align=vertical>')
                .append('<a>export</a>')
                .appendTo(this.ui.extras);
        },

        _tabChanged: function(event, ui) {
            var el, tools, type = ui.panel.id;
            el = $('#'+type+' .stage');

            // Expose any primary tools for this view
            tools = $(el)[type]('option', 'primaryTools');
            $('.tools-primary').children().hide();
            if ($(tools).length) {
                $(tools).show();
            } else {
                // Show the default primary tools (if any)
                $('.tools-primary .default-tools').show();
            }

            // Expose any secondary tools for this view
            tools = $(el)[type]('option', 'secondaryTools');
            $('.tools-secondary').children().hide();
            if ($(tools).length) {
                $(tools).show();
            } else {
                // Show the default secondary tools (if any)
                $('.tools-secondary .default-tools').show();
            }
            // Ensure height of the view are the same as its parent.
            // Also, allows child elements to expand to fill the div,
            // necessary for proper scrolling overflowing content.
            el.height(el.parent().height());
        },

        _syncViewNames: function() {
            var ns = $[this.namespace];

            // Ensure ns.views array exists first
            ns.views = ns.views || [];

            // Rebuild the list of registered view plugins
            $.each(ns, function(key,val) {
                // Only add plugins who's function name ends with 'View'
                if (!/.*View$/.test(key)) return;
                // Only add plugins not already indexed
                if (ns.views.indexOf(key) !== 0) ns.views.push(key);
            });
        },

        _syncInterfaceCache: function() {
            this.ui = this.ui || {};

            this._syncViewNames();

            this.ui.navbar = $('.navbar').eq(0);
            this.ui.projectView = $('.view.project').eq(0);
            this.ui.layoutView = $('.view.layout').eq(0);
            this.ui.codeView = $('.view.code').eq(0);
            this.ui.liveView = $('.view.live').eq(0);
            this.ui.tools = $('.tools-primary').eq(0);
            this.ui.extras = $('.tools-secondary').eq(0);
        },

        _bindViewPlugins: function() {
            var ns = $[this.namespace];

            this._syncInterfaceCache();

            // Attach all view plugins
            $.each(ns.views, function (idx, val) {
                var selector = '#'+val+' .stage';

                $(selector).each(function(i, el) {
                    var tools;

                    // Create a plugin instance on this node
                    $(el)[val]();

                    // Add the ADM as the plugin's model option...
                    $(el)[val]('option', 'model', ADM);

                    // TODO: Bind plugin ADMEvent handlers here directly
                    //       rather than w/in each plugin, to ensure consitant
                    //       binding/unbinding proceedures
                    // OR  : Do the binding in our own designReset hander (?)

                    // Attach any per-view tools to the navbar
                    tools = $(el)[val]('option', 'primaryTools');
                    $(tools).each(function(j, t) {
                        $(t).appendTo('.tools-primary');
                        if ($(el).parent().hasClass('ui-tabs-hide')) {
                            $(t).hide();
                        } else {
                            $(t).show();
                        }
                    });

                    // Now do the same for any secondary tools
                    tools = $(el)[val]('option', 'secondaryTools');
                    $(tools).each(function(j, t) {
                        $(t).appendTo('.tools-secondary');
                        if ($(el).parent().hasClass('ui-tabs-hide')) {
                            $(t).hide();
                        } else {
                            $('.tools-secondary').children().hide();
                            $(t).show();
                        }
                    });
                });
            });
        },

        _designReset: function(event, widget) {
            if (this.design) {
                this.design.unbind('modelUpdated', this._modelUpdated);
            }
            this.design = event && event.design ||
                          this.options.model.getDesignRoot();
            this.design.bind('modelUpdated', this._modelUpdated, this);
        },

        _activePageChanged: function(event, widget) {
        },

        _selectionChanged: function(event, widget) {
        },

        _modelUpdated: function(event, widget) {
        },
    });
})(jQuery);

$(function() {

    // FIXME: Remove all this fake ADM setup code once the remainder of
    //        the code for guibuilder has been merged with this new plugin
    //        model of coding...
    var design, page, child;
    design = new ADMNode('Design');
    page = new ADMNode('Page');
    design.addChild(page);
    child =  new ADMNode('Button');
    page.addChild(child);
    ADM.setDesignRoot(design);

    // Actually invoke the plugin that sets up our app UI
    $(document).guibuilder({debugMode: true, model: ADM});

    // FIXME: Remove the following, as noted above
    ADM.setSelected(child.getUid());
    ADM.setActivePage(page);

    // XXX: Hackish trick to dynamically add nodes to the DOM for now
    $(document).click( function(event) {
        var node = new ADMNode('Button');
        ADM.getActivePage().addChild(node);
        ADM.setSelected(node.getUid());
    });
});
