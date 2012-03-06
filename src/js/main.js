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

            $.gb = $.gb || {};
            $.gb.debug = (this.options.debugMode) ? this._debugEnabled :
                function(){return false;};

            this._parseOptions();

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
            if (!$.gb.debug())
                $('.stage').bind('contextmenu', function(e) {
                    e.preventDefault();
                });

            // Now invoke any view plugins on appropriate elements
            this._bindViewPlugins();

            this.refresh();

            if ($.gb.debug('mousetrack')) {
                this._createMouseTracker($(document.body));
            }
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
        _parseOptions: function() {
            var validHTML = /^[a-zA-z0-9]([_-]*)$/,
                validOptions = [
                    // Flags or key/value pairs for various debug options
                    'debug',
                ];
            // If option(s) are passed on URL, parse into a set of options
            // objects in the '$.gb' namespace.  Parsing rules as follows:
            //
            // For Example, given the following URL,
            //     http://hostname.org/?debug=foo=2,bar&whiz&bang=baz
            //
            // We would get the following object:
            //
            //     $.gb.options: {
            //         debug: {
            //             foo: '2',
            //             bar: true
            //         },
            //         whiz: true,
            //         bang: 'baz'
            //     }
            //
            if (document.location.search.length) {
                $.gb.options = $.gb.options || {};
                // Iterate over array of options, for example, with the exmaple
                // above, we would get the following array:
                //
                //     ["debug=foo=2,bar", "whiz", "bang=baz"]
                //
                $.each(document.location.search.replace(/^\?/,'').split('&'),
                    function(index,value){
                        var argIdx = value.indexOf('='),
                            name, args, opts;

                        name = (argIdx !== -1)?value.slice(0,argIdx):value;

                        // Only permit explicit options...
                        if ($.inArray(name, validOptions) === -1) {
                            // TODO: Should it (can it?) be explicitly removed?
                            console.error('Ignoring option "' + name +
                                          '": unrecognized option name');
                            return;
                        }

                        // getParameter returns everything following the first
                        // '=' of each option substring in the URL
                        args = document.location.getParameter(name);

                        // If this option has sub args, parse them
                        if (args.length && /=/.test(args)) {
                            $.each(args.split(','), function(idx,val){
                                var subOpts = val.split('=');
                                opts = opts || {};
                                if (subOpts.length > 1) {
                                    if (validHTML.test(subOpts[1])) {
                                        opts[subOpts[0]] = subOpts[1];
                                    } else {
                                        console.error('Ignoring option "' +
                                            subOpts[0] +
                                            '": value failed sanity check');
                                    }
                                } else {
                                    opts[subOpts[0]] = true;
                                }
                            });
                        // If this option a value, use it
                        } else if (args.length) {
                            opts = args;
                        }
                        // Assign this option its value, or make it true
                        $.gb.options[name] = opts || true;
                    }
                );
            }
        },

        _createMouseTracker: function(container) {
            var coord, offset = {};
            if (!$.gb.debug('mousetrack'))
                return;

            coord = $('<div/>')
                .attr({id:'coord'})
                .appendTo(container)
                .append('<div class="gb-drag-handle"/>')
                .draggable({
                    handle: '.gb-drag-handle',
                    scroll: false,
                    stack: 'body',
                });

            $('<div/>').appendTo(coord)
                .append('<label>Window: </label>')
                .append('<span id="windowCoords"/>');
            $(window).bind('mousemove', function (e) {
                $('#windowCoords').text('x='+e.pageX+', y='+e.pageY);
            });
            coord.height($('#windowCoords').parent().outerHeight() +
                         $('.gb-drag-handle').outerHeight());

            if ($(':gb-layoutView').length) {
                $('<div/>').appendTo(coord).hide(0)
                    .append('<label>Layout: </label>')
                    .append('<span id="layoutCoords"/>');
                $(':gb-layoutView').layoutView('option','contentDocument')
                    .bind('mousemove', function (e) {
                        $('#layoutCoords').text('x='+e.pageX+', y='+e.pageY);
                    })
                    .bind('mouseenter', function (e) {
                        $('#layoutCoords').parent().show();
                        coord.height(coord.height() +
                                      $('#layoutCoords').parent().height());
                    })
                    .bind('mouseleave', function (e) {
                        $('#layoutCoords').parent().hide();
                        coord.height(coord.height() -
                                      $('#layoutCoords').parent().height());
                    });
            }

            if ($(':gb-liveView').length) {
                $('<div/>').appendTo(coord).hide(0)
                    .append('<label>Live: </label>')
                    .append('<span id="liveCoords"/>');
                $(':gb-liveView').liveView('option','contentDocument')
                    .bind('mousemove', function (e) {
                        $('#liveCoords').text('x='+e.pageX+', y='+e.pageY);
                    })
                    .bind('mouseenter', function (e) {
                        $('#liveCoords').parent().show();
                        coord.height(coord.height() +
                                      $('#liveCoords').parent().height());
                    })
                    .bind('mouseleave', function (e) {
                        $('#liveCoords').parent().hide();
                        coord.height(coord.height() -
                                      $('#liveCoords').parent().height());
                    });
            }
        },

        _constructApp: function(container) {
            var widget = this;
            $('<ul/>').appendTo(container)
                .append('<li><a href="#projectView">Project</a></li>')
                .append('<li><a href="#layoutView">Layout</a></li>')
                .append('<li><a href="#codeView">Code</a></li>')
                .append('<li><a href="#liveView">Preview</a></li>');

            // Add the view plugins
            this.ui.projectView = $('<div/>').appendTo(container)
                .attr('id', 'projectView')
                .addClass('view project flex1 hbox');
            this.ui.projectView.append('<div class="stage flex1 vbox">');

            this.ui.layoutView = $('<div/>').appendTo(container)
                .attr('id', 'layoutView')
                .addClass('view layout flex1 hbox');
            this.ui.layoutView.append('<div class="panel left">');
            this.ui.layoutView.append('<div class="stage flex1 vbox">');
            this.ui.layoutView.append('<div class="panel right">');
            this.ui.layoutView.find('.panel.left')
                .panel({
                    position: 'left',
                    maxSize: '480',
                    minSize: '160',
                })
                .append('<div class="pageView flex0 vbox"></div>')
                .append('<div class="outlineView flex1 vbox"></div>')
                .append('<div class="propertyView flex0 vbox"></div>');

            this.ui.layoutView.find('.panel.right')
                .panel({
                    position: 'right',
                    maxSize: '480',
                    minSize: '160',
                })
                .append('<div class="widgetView flex1 vbox"></div>')
                .append('<div class="paletteView flex0 vbox"></div>');

            this.ui.codeView = $('<div/>').appendTo(container)
                .attr('id', 'codeView')
                .addClass('view code flex1 hbox');
            this.ui.codeView.append('<div class="panel left">');
            this.ui.codeView.append('<div class="stage flex1 vbox">');
            this.ui.codeViewLeftPanel = this.ui.codeView.find('.panel.left')
                .panel({
                    position: 'left',
                    maxSize: '480',
                    minSize: '160',
                })
                .append('<div class="pageView flex0 vbox"></div>')
                .append('<div class="outlineView flex1 vbox"></div>')
                .append('<div class="propertyView flex1 vbox"></div>');

            this.ui.liveView = $('<div/>').appendTo(container)
                .attr('id', 'liveView')
                .addClass('view live flex1');
            this.ui.liveView.append('<div class="stage flex1 vbox">');

            $('.pageView').each( function () {
                $(this).pageView();
                $(this).pageView('option', 'model', ADM);
            });

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
                widget._bindResizeEvent(this, 'paletteView');
            });

            $('.widgetView').each( function () {
                $(this).widgetView();
                $(this).widgetView('option', 'model', ADM);
                widget._bindResizeEvent(this, 'widgetView');
            });

            // Turn the body into a jQuery-UI "tabs" widget
            // TODO: Get starting tab from session cookie
            container.tabs({
                selected: 1,
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
                .append('<a id="setProj">settings</a>')
                .append('<hr align=vertical>')
                .append('<a id="exportProj">export</a>')
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
            $(window).trigger('resize');
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
                if (ns.views.indexOf(key) < 0) ns.views.push(key);
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
            var ns = $[this.namespace],
                widget = this;

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

                    //Bind resize event for each view
                    widget._bindResizeEvent($(el), val);

                    // TODO: Bind plugin ADMEvent handlers here directly
                    //       rather than w/in each plugin, to ensure consitant
                    //       binding/unbinding proceedures
                    // OR  : Do the binding in our own designReset handler (?)

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

        _resizeView:  function(el, viewName) {
            // Ensure height of the view are the same as its parent.
            // Also, allows child elements to expand to fill the div,
            // necessary for proper scrolling overflowing content.
            el.height(el.parent().height());
            //Some view (such as code view) may need to do more job
            //when window resizing
            $(el)[viewName]('resize');
        },
        _bindResizeEvent: function(el, viewName) {
            var widget = this;
            $(window).resize( function () {
                widget._resizeView($(el), viewName);
            });
        },
        _debugEnabled: function(flag) {
            if (!$.gb || !$.gb.options || !$.gb.options.debug) {
                return false;
            }
            flag = flag && flag.toString();
            if ($.gb.options.debug && !flag) {
                return true;
            } else {
                if ($.gb.options.debug[flag]) {
                    return $.gb.options.debug[flag];
                } else {
                    return ($.gb.options.debug === flag);
                }
            }
        }
    });
})(jQuery);

$(function() {

    // FIXME: Remove all this fake ADM setup code once the remainder of
    //        the code for guibuilder has been merged with this new plugin
    //        model of coding...
    var fsUtils;
    /***************** handler functions ************************/

    function fsInitSuccess(fs) {
        var cookieUtils = $.gb.cookieUtils,
            cookieExpires = new Date("January 1, 2042");
        // if can't get the cookie(no this record), then add exportNotice cookie
        if (!cookieUtils.get("exportNotice")) {
            if(!cookieUtils.set("exportNotice", "true", cookieExpires)) {
                console.error("Set exportNotice cookie failed.");
            }
        }
        // bind handlers for import and export buttons
        $(document).delegate('#importProj', "click", function () { $("#importFile").click(); });
        $(document).delegate('#exportProj', "click", $.gb.exportPackage);

        // init pmUtils
        $.gb.pmUtils.init();
        $(document).ready( function () { $(window).trigger('resize'); });
    }

    function fsInitFailed() {
        alert('File system initiation failed."Import" and "Export" feature can not work.');
    }
    /***************** handler functions end ************************/

    // init the sandbox file system
    fsUtils = $.gb.fsUtils;
    fsUtils.initFS(fsUtils.fsType, fsUtils.fsSize, fsInitSuccess, fsInitFailed);

    // Actually invoke the plugin that sets up our app UI
    $(document).guibuilder({debugMode: true, model: ADM});
});
