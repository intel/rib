/*
 * gui-builder - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
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
                pagePanel,
                devicePanel,
                deviceToolbar,
                deviceSelect,
                addDeviceButton,
                deviceWrapper,
                rotateDeviceButton,
                widget = this;

            widget._sysDevices = {};
            widget._userDevices = {};

            o.designReset = this._designResetHandler;
            o.selectionChanged = null;
            o.activePageChanged = this._activePageChangedHandler;
            o.modelUpdated = this._modelUpdatedHandler;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            controlPanel = $('<div/>')
                .addClass('tools')
                .addClass('hbox')
                .addClass('flex0');

            pagePanel = $('<div/>')
                .addClass('panel-section')
                .addClass('vbox')
                .addClass('flex0')
                .css({ "min-width": 300, })  // FIXME: do this in CSS
                .pageView();
            pagePanel.pageView('option', 'model', ADM);

            devicePanel = $('<div/>')
                .addClass('panel-section')
                .addClass('vbox')
                .addClass('flex1');

            $('<div/>')
                .addClass('panel-section-header')
                .append('<div>devices</div>')
                .children().last()
                    .addClass('title')
                    .end()
                .end()
                .appendTo(devicePanel);

            deviceToolbar = $('<div/>')
                .addClass('panel-section-contents')
                .appendTo(devicePanel);

            widget._deviceSelect = $('<select></select>')
                .addClass("separated")
                .appendTo(deviceToolbar)
                .change(function () {
                    $("option:selected", this).each(function () {
                        widget._screenHeight.val($(this).data('deviceInfo').screen.height);
                        widget._screenWidth.val($(this).data('deviceInfo').screen.width);
                        widget._rotating = false;
                        widget._setDevice();
                    });
            });

            $.getJSON("src/assets/devices.json", function (data) {
                widget._sysDevices = data;
                widget._refreshDeviceList(widget._deviceSelect);
                $.gb.fsUtils.read("devices.json", function(result) {
                    try {
                        widget._userDevices = $.parseJSON(result);
                        widget._refreshDeviceList(widget._deviceSelect);
                    } catch(e) {
                        alert(e);
                        return false;
                    }
                });
            });
            addDeviceButton = $('<a/>')
                .addClass("addDevice separated")
                .appendTo(deviceToolbar)
                .click( function () {
                    $("<form/>")
                        .addClass("deviceSetting")
                        .append('<label for="name">Device Name</label>')
                        .append('<input required name="name"/>')
                        .append('<label for="screenWidth">Screen</label>')
                        .append('<input name="screenWidth" type="number" max="10000"  style="width:4em" required size="4"/>').append('x')
                        .append('<input name="screenHeight" type="number" max="10000" style="width:4em" required size="4"/>')
                        .append('<br/>')
                        .append('<input type="submit" class="submit" value="Done"></input>')
                        .append($('<a href="javascript:void(0)">Cancel</a>').click( function() { $(this).parent().dialog("close"); }))
                        .submit( function () {
                            var values = {},
                                form = this;
                            try{
                                $.each($(this).serializeArray(), function(i, field) {
                                        values[field.name] = field.value;
                                });
                                widget._userDevices[values.name] = widget._cloneSelectedDeviceInfo();
                                widget._modifyScreenSize(widget._userDevices[values.name], values.screenWidth, values.screenHeight);
                                widget._refreshDeviceList(widget._deviceSelect);
                                $.gb.fsUtils.write("devices.json", JSON.stringify(widget._userDevices), function(fileEntry){
                                    alert("New device " + values.name + " sucessfully created!");
                                    $(form).dialog('close');
                                });
                            }catch (e){
                               alert(e);
                            }
                            return false;
                        })
                        .dialog({title:"Add Device", modal:true, width: 400, height: 285, resizable:false });
                });
            $('<a href="javascript:void(0)">Add Device</a>').appendTo(deviceToolbar).click(function () {
                addDeviceButton.trigger('click');
            });

            rotateDeviceButton = $('<a/>')
                .addClass("rotateDevice separated")
                .appendTo(deviceToolbar)
                .click( function () {
                    var screenWidth = widget._screenWidth.val();
                    widget._rotating = !widget._rotating;
                    widget._screenWidth.val(widget._screenHeight.val());
                    widget._screenHeight.val(screenWidth);
                    widget._setDevice();
                });
            $('<a href="javascript:void(0)">Rotate</a>').appendTo(deviceToolbar).click(function () {
                rotateDeviceButton.trigger('click');
            });

            $('<label for="screenWidth">Screen:</label>')
                .addClass("separated")
                .appendTo(deviceToolbar);
            widget._screenWidth =
                $('<input name="screenWidth" type="number" min="0" class="screenCoordinate"/>')
                .change( function () {
                    widget._setDevice();
                })
                .appendTo(deviceToolbar);
            $('<label for="screenHeight"> x </label>').appendTo(deviceToolbar);
            widget._screenHeight =
                $('<input name="screenHeight" type="number" min="0" class="screenCoordinate"/>')
                .change( function () {
                    widget._screenWidth.trigger('change');
                })
                .appendTo(deviceToolbar);


            controlPanel.append(pagePanel)
                .append(devicePanel)
                .appendTo(this.element);

            widget._deviceWrapper = $('<div>').appendTo(this.element)
                .append('<img/>');
            this.options.iframe = $('<iframe/>')
                .attr({id:'deviceScreen'})
                .addClass('flex1')
                .appendTo(widget._deviceWrapper);

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
                    this._unbindADMEvents();
                    this._bindADMEvents(value);
                    this.refresh(null, this);
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

            if (!widget.element.data('visible')) return;

            iframe = widget.options.iframe;
            if (iframe.length) {
                // Bind load event first to make sure it will be fired when
                // liveDoc is successfully written.
                iframe.one('load', function () {
                    var page = widget.options.model.getActivePage() || null;
                    if (page) {
                        widget._setPreviewPage(page.getProperty('id'), widget);
                    }

                    // We have to use the "$" in iframe or when you switching
                    // between live view and layout view several times, the
                    // contextMenu will reappear.
                    getOwnerWindow(liveDoc.documentElement).$(liveDoc)
                        .bind('contextmenu', function(e) {
                            e.preventDefault();
                        });
                    $('body', liveDoc).css({
                        // prevent I bar cursor over UI text
                        "cursor": "default",
                        // prevent user drags from selecting UI text
                        "-webkit-user-select": "none"
                    });
                });
                liveDoc = widget.options.contentDocument[0];
                liveDoc.open();
                liveDoc.writeln(generateHTML().html);
                liveDoc.close();
            }
        },

        // Private functions
        _refreshDeviceList: function (deviceSelect) {
            deviceSelect.empty();
            $.each(this._sysDevices, function (key, val) {
                $('<option/>').append( key )
                    .data('deviceInfo', val.Default)
                    .appendTo(deviceSelect);
            });
            $.each(this._userDevices, function (name, info) {
                    $('<option/>').append( name )
                        .data('deviceInfo', info)
                        .appendTo(deviceSelect);
            });
            deviceSelect.trigger('change');
        },

        _cloneSelectedDeviceInfo: function (deviceInfo, screenWidth, screenHeight) {
            return $.extend(true, {}, this._deviceSelect.find("option:selected").data('deviceInfo'));
        },

        _modifyScreenSize: function (deviceInfo, screenWidth, screenHeight) {
            var scaleW =  screenWidth/deviceInfo.screen.width,
            scaleH =  screenHeight/deviceInfo.screen.height;
            deviceInfo.screen.width *= scaleW;
            deviceInfo.screen.offset.left *= scaleW;
            deviceInfo.screen.offset.right *= scaleW;
            deviceInfo.screen.height *= scaleH;
            deviceInfo.screen.offset.top *= scaleH;
            deviceInfo.screen.offset.bottom *= scaleH;

            deviceInfo.skin.width = deviceInfo.screen.width + deviceInfo.screen.offset.left
                + deviceInfo.screen.offset.right ;
            deviceInfo.skin.height = deviceInfo.screen.height + deviceInfo.screen.offset.top
                + deviceInfo.screen.offset.bottom ;
        },

        _setDevice: function () {
            var deviceSkin, scaleW, scaleH,
            //First, we clone a device info and change screen property if rotated
                deviceInfo = this._cloneSelectedDeviceInfo();
            if (this._rotating) {
                $.extend(true, deviceInfo, {
                    screen: {
                        width: deviceInfo.screen.height,
                        height: deviceInfo.screen.width,
                        offset: {
                            top: deviceInfo.screen.offset.right,
                            left: deviceInfo.screen.offset.top,
                            bottom: deviceInfo.screen.offset.left,
                            right: deviceInfo.screen.offset.bottom,
                        }
                    },
                });
            }

            //If modified manully by user, scale screen offsets and recaculate skin size
            this._modifyScreenSize(deviceInfo, this._screenWidth.val(), this._screenHeight.val());

            // TODO: This may be better managed by reading and applying
            //       per-device CSS files from the filesystem at run time.
            //       By finding all *.css files under src/assets/devices, we
            //       could simply change the element "class" or custom
            //       attribute (data-device="<devicename>").  Then these
            //       dimensional properties can be set by the UX team, and
            //       never require changes to devices.json or this code...

            this.options.iframe.css({
                width: deviceInfo.screen.width + 'px',
                minWidth: deviceInfo.screen.width + 'px',
                maxWidth: deviceInfo.screen.width + 'px',
                height: deviceInfo.screen.height + 'px',
                minHeight: deviceInfo.screen.height + 'px',
                maxHeight: deviceInfo.screen.height + 'px',
                position: 'absolute',
                top: deviceInfo.screen.offset.top + 'px',
                left: deviceInfo.screen.offset.left + 'px',
            });

            this._deviceWrapper.css({
                width: deviceInfo.skin.width + 'px',
                minWidth: deviceInfo.skin.width + 'px',
                maxWidth: deviceInfo.skin.width + 'px',
                height: deviceInfo.skin.height + 'px',
                minHeight: deviceInfo.skin.height + 'px',
                maxHeight: deviceInfo.skin.height + 'px',
            });
            deviceSkin = this._deviceWrapper.find('img').attr('src', deviceInfo.skin.href);
            if (this._rotating)
                deviceSkin.css({
                    height: deviceInfo.skin.width + 'px',
                    width: deviceInfo.skin.height + 'px',
                    '-webkit-transform': 'rotate(-90deg)',
                    '-webkit-transform-origin': deviceInfo.skin.height/2 + 'px ' + deviceInfo.skin.height/2 + 'px',
                });
            else
                deviceSkin.css({
                    height: deviceInfo.skin.height + 'px',
                    width: deviceInfo.skin.width + 'px',
                    '-webkit-transform': 'rotate(0deg)',
                });
        },

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

        _activePageChangedHandler: function(event, widget) {
            var win,
                newPage = event && event.page,
                id = newPage && newPage.getProperty('id');

            widget = widget || this;

            // Only change if new page is valid
            if (!newPage) {
                return;
            }

            win = widget.options.contentDocument[0].defaultView;

            if (win && win.$ && win.$.mobile) {
                if (win.$.mobile.activePage &&
                    win.$.mobile.activePage.attr('id') !== id) {
                    win.$.mobile.changePage("#"+id, {transition: "none"});
                }
            }
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
