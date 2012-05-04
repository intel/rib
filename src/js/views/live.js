/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
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

    $.widget('rib.liveView', $.rib.baseView, {

        options: {
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

            // Chain up to base class _create()
            $.rib.baseView.prototype._create.call(this);

            widget._sysDevices = {};
            widget._userDevices = {};

            controlPanel = $('<div/>')
                .addClass('tools')
                .addClass('hbox')
                .addClass('flex0');

            pagePanel = $('<div/>')
                .addClass('panel-section')
                .addClass('vbox')
                .addClass('flex0')
                .css({ "min-width": 300, 
                       "max-width": 300})  // FIXME: do this in CSS
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
                $.rib.fsUtils.read("devices.json", function(result) {
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
                                $.rib.fsUtils.write("devices.json", JSON.stringify(widget._userDevices), function(fileEntry){
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

            //Placeholder to force the deviceWrapper in the center of the stage.
            this.element.append('<div>');

            this.options.iframe = $('<iframe/>')
                .attr({id:'deviceScreen'})
                .addClass('flex1')
                .appendTo(widget._deviceWrapper);

            this.options.contentDocument =
                $(this.options.iframe[0].contentDocument);

            return this;
        },

        _setOption: function(key, value) {
            // Chain up to base class _setOptions()
            // FIXME: In jquery UI 1.9 and above, instead use
            //    this._super('_setOption', key, value)
            $.rib.baseView.prototype._setOption.apply(this, arguments);

            switch (key) {
                case 'model':
                    this.refresh(null, this);
                    break;
                default:
                    break;
            }
        },

        refresh: function(event, widget) {
            var iframe,
                liveDoc;

            widget = widget || this;

            if (!widget.element.data('visible') &&
                (event && !event.name === 'designReset')) {
                return;
            }

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

        _activePageChangedHandler: function(event, widget) {
            var win,
                newPage = event && event.page,
                id = newPage && newPage.getProperty('id');

            widget = widget || this;

            // Only change if new page is valid
            if (!newPage) {
                return;
            }

            widget._setPreviewPage(id);
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
                if (win.$.mobile.activePage &&
                    win.$.mobile.activePage.attr('id') !== pageId) {
                    win.$.mobile.changePage("#" + pageId, {transition: "none"});
                }
                $.rib && $.rib.pmUtils && $.rib.pmUtils.getActive() && $.rib.updateThumbnail();
            }
        },
    });
})(jQuery);
