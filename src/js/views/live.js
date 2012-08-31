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
            maxDeviceSize: 10000,
            minDeviceSize: 240,
        },

        _create: function() {
            var o = this.options,
                controlPanel,
                pagePanel,
                devicePanel,
                deviceToolbar,
                deviceSelect,
                deviceWrapper,
                rotateDeviceButton,
                widget = this,
                screenCoordElement = function (name, min, className) {
                    return $('<input type="number" min="'
                                + widget.options.minDeviceSize + '" max="'
                                + widget.options.maxDeviceSize + '" required/>')
                                .attr("name", name)
                                .addClass(className);
                },
                screenWidthElement = function (className) {
                    return screenCoordElement("screenWidth", className);
                },
                screenHeightElement = function (className) {
                    return screenCoordElement("screenHeight", className);
                },
                createDeviceButton = function (className) {
                    var label = (className === "editDevice"?"Edit":"Add") +  " Device";
                    var deviceButton = $('<a/>')
                        .addClass(className + " separated")
                        .appendTo(deviceToolbar)
                        .click( function () {
                            var buttonSet, deviceForm, options = '';
                            deviceForm= $("<form/>")
                                .addClass("deviceSetting")
                                .append('<label for="name">Device Name</label>')
                                .append('<input required name="name"/>')
                                .append('<label for="type">Device Type</label>')
                                .append('<select required name="type"/>')
                                .append('<br/>')
                                .append('<label for="screenWidth">Screen</label>')
                                .append(screenWidthElement())
                                .append('<span>x</span>')
                                .append(screenHeightElement());
                            for (var type in widget._sysDevices) {
                                options += '<option>' + type + '</option>';
                            }
                            deviceForm.find('select').append($(options));
                            buttonSet = $('<div align="center" id="buttonSet" />').appendTo(deviceForm);
                            if (className === "editDevice") {
                                if (widget._sysDevices[widget._projectDevice.name]) {
                                    alert("Can't edit system device!");
                                    return;
                                }
                                buttonSet.append($('<input type="button" class="buttonStyle" value="Delete"></input>').click(function () {
                                    var type = widget._projectDevice.type;
                                    delete widget._userDevices[widget._projectDevice.name];
                                    widget._findOptionByText(widget._recentDevices, widget._projectDevice.name).remove();
                                    applyDeviceChange(deviceForm, type);
                                }));
                                deviceForm
                                .find('input[name=name]').val(widget._projectDevice.name)
                                .end()
                                .find('select[name=type]').val(widget._projectDevice.type)
                                .end()
                                .find('input[name=screenWidth]').val(widget._projectDevice.screenWidth)
                                .end()
                                .find('input[name=screenHeight]').val(widget._projectDevice.screenHeight)
                                .end();
                            }
                            buttonSet
                                .append('<input type="submit" class="buttonStyle" value="Done"></input>')
                                .append($('<a href="javascript:void(0)">Cancel</a>').click( function() { deviceForm.dialog("close"); }));
                            deviceForm
                                .submit( function () {
                                    var values = {};
                                    try{
                                        $.each($(this).serializeArray(), function(i, field) {
                                                values[field.name] = field.value;
                                        });

                                        if (values.name !== widget._projectDevice.name && className === "editDevice") {
                                            //Name changed when editing device
                                            widget._userDevices[values.name] = widget._userDevices[widget._projectDevice.name];
                                            delete widget._userDevices[widget._projectDevice.name];
                                        } else {
                                            widget._userDevices[values.name] =
                                                widget._cloneDeviceInfo(widget._sysDevices[values.type].Default);
                                        }
                                        widget._modifyScreenSize(widget._userDevices[values.name], values.screenWidth, values.screenHeight);

                                        widget._userDevices[values.name].type = values.type;
                                        applyDeviceChange(deviceForm, values.name);
                                    }catch (e){
                                       alert(e.stack);
                                    }
                                    return false;
                                });
                            deviceForm.dialog({title: label, modal:true, width: 360, resizable:false });
                        });
                    $('<a href="javascript:void(0)">' + label +'</a>').appendTo(deviceToolbar).click(function () {
                        deviceButton.trigger('click');
                    });
                },
                applyDeviceChange = function (deviceForm, deviceName) {
                    widget._refreshDeviceList(deviceName);
                    $.rib.fsUtils.write("devices.json", JSON.stringify(widget._userDevices), function(fileEntry){
                        deviceForm.dialog('close');
                    });
                };

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

            deviceToolbar = $('<form/>')
                .addClass('panel-section-contents')
                .submit(function () {
                    widget._setDevice();
                    return false;
                 })
                .append("<input type='submit' style='display:none' value='sumbit'/>")
                .appendTo(devicePanel);

            widget._recentDevices = $('<select class="deviceSelect"/>')
                .appendTo(deviceToolbar)
                .append('<option value="1">Recently Used</option>')
                .change(function() {
                    $("option:selected", this).each(function () {
                        if ($(this).val() !== "1") {
                            widget._refreshDeviceList($(this).text());
                            widget._recentDevices.children().first().attr('selected', true);
                        }
                    });
                });

            widget._deviceSelect = $('<div/>')
                .addClass("separated deviceSelect")
                .append(
                    $('<a/>')
                        .append($('<span/>').attr('id', 'selectedDevice'))
                        .append($('<div/>').addClass('arrow'))
                )
                .append(
                    $('<ul style = "display:none"></ul>')
                        .attr('id', 'deviceSelectMenu')
                        .delegate('li', 'click', function(event){
                            var catelog = $(this).parent().attr('catelog'),
                                text = this.firstChild.data,
                                deviceName = text === 'Default' ? catelog : text;
                            widget._deviceSelect.trigger('change.device', deviceName);
                            $('#deviceSelectMenu').hide();
                            event.stopPropagation();
                         })
                )
                .mouseleave(function(){
                    $('#deviceSelectMenu').hide();
                })
                .mouseenter(function(){
                    $('#deviceSelectMenu').show();
                })
                .bind('change.device', function(event, deviceName){
                        $('#selectedDevice').text(deviceName);
                        var device = $(this).data(deviceName);
                        if(!device) return;
                        var screen = device.screen,
                            width = screen.width,
                            height = screen.height,
                            type = device.type;

                        widget._screenHeight.val(height);
                        widget._screenWidth.val(width);
                        widget._projectDevice.screenHeight = height;
                        widget._projectDevice.screenWidth = width;
                        widget._projectDevice.rotating = false;
                        widget._projectDevice.name = deviceName;
                        widget._projectDevice.type = type;
                        widget._setDevice();
                        if (widget._recentDevices) {
                            var recentDevices = {},
                                recentOptions = widget._recentDevices.find("option"),
                                recentOption = widget._findOptionByText(widget._recentDevices, deviceName);
                            if (recentOption.length == 0)
                                recentOption = $('<option/>').text(deviceName);
                            recentOption.insertAfter(recentOptions.first());
                            if (recentOptions.length > 6)
                                recentOptions.last().remove();
                            recentDevices.devices = [];
                            recentOptions.not(":first").each(function() {
                                recentDevices.devices.push(deviceName);
                            });
                            $.rib.fsUtils.write("recent_devices.json", JSON.stringify(recentDevices));
                        }
                    }
                )
                .appendTo(deviceToolbar);

            $.rib.fsUtils.read("recent_devices.json", function(result) {
                try {
                    var recentDevices = $.parseJSON(result);
                    if (recentDevices)
                        recentDevices = recentDevices.devices;
                    for (var i in recentDevices)
                        $('<option/>').text(recentDevices[i]).appendTo(widget._recentDevices);

                } catch(e) {
                    alert(e.stack);
                    return false;
                }
            });
            $.getJSON("src/assets/devices.json", function (data) {
                widget._sysDevices = data;
                widget._refreshDeviceList(widget._projectDevice.name);
                $.rib.fsUtils.read("devices.json", function(result) {
                    try {
                        widget._userDevices = $.parseJSON(result);
                        widget._refreshDeviceList(widget._projectDevice.name);
                    } catch(e) {
                        alert(e.stack);
                        return false;
                    }
                });
            });

            createDeviceButton('editDevice');
            createDeviceButton('addDevice');
            rotateDeviceButton = $('<a/>')
                .addClass("rotateDevice separated")
                .appendTo(deviceToolbar)
                .click( function () {
                    if (widget._screenWidth.val() < widget.options.minDeviceSize ||
                        widget._screenHeight.val() < widget.options.minDeviceSize) {
                       alert("Device size should not be less than "
                           + widget.options.minDeviceSize);
                       return;
                    }
                    else if (widget._screenWidth.val() > widget.options.maxDeviceSize ||
                             widget._screenHeight.val() > widget.options.maxDeviceSize) {
                       alert("Device size should not be greater than "
                           + widget.options.maxDeviceSize);
                       return;
                    }
                    widget._projectDevice.rotating = !widget._projectDevice.rotating;
                    widget._projectDevice.screenWidth = widget._screenHeight.val();
                    widget._projectDevice.screenHeight = widget._screenWidth.val();
                    widget._screenWidth.val(widget._projectDevice.screenWidth);
                    widget._screenHeight.val(widget._projectDevice.screenHeight);
                    widget._setDevice();
                });
            $('<a href="javascript:void(0)">Rotate</a>').appendTo(deviceToolbar).click(function () {
                rotateDeviceButton.trigger('click');
            });

            $('<label for="screenWidth">Screen:</label>')
                .addClass("separated")
                .appendTo(deviceToolbar);
            widget._screenWidth =
                screenWidthElement("screenCoordinate")
                .change( function () {
                    widget._projectDevice.screenWidth = $(this).val();
                    // Without setTimeout, error message will not show when
                    // validation fails
                    setTimeout(function () {
                            // We have to click the submit button to trigger
                            // error message when validation fails
                            deviceToolbar.find('input[type=submit]').click();
                        },
                        0
                    );
                })
                .appendTo(deviceToolbar);
            $('<label for="screenHeight"> x </label>').appendTo(deviceToolbar);
            widget._screenHeight =
                screenHeightElement("screenCoordinate")
                .change( function () {
                    widget._projectDevice.screenHeight = $(this).val();
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

            /*
             * TODO: With this line, thumbnail will not show up until
             * the live view be visible for at least one time.
             * So, comment this line out, we need to generate thumbnail when
             * RIB starts. But, this influence performance. Better method may
             * need to be used later.
             */
             // if (!widget.element.data('visible')) return;

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
                        })
                        .find('div:jqmData(role="page")')
                        .bind('pageshow', function(e) {
                            var pageId = this.id;
                            $.each(ADM.getDesignRoot().getChildren(), function (i, child) {
                                if (child.getProperty('id') == pageId) {
                                    ADM.setActivePage(child);
                                    return false;
                                }
                            });
                        });
                    $('body', liveDoc).css({
                        // prevent I bar cursor over UI text
                        "cursor": "default",
                        // prevent user drags from selecting UI text
                        "-webkit-user-select": "none"
                    });
                    $.rib.pmUtils.updateThumbnail(liveDoc);
                });
                liveDoc = widget.options.contentDocument[0];
                liveDoc.open();
                liveDoc.writeln($.rib.generateHTML(ADM.getDesignRoot(), true).html);
                liveDoc.close();
            }
        },


        // Private functions
        _findOptionByText: function (select, text) {
            return select.find('option')
                .filter( function(){ return this.text === text; });
        },
        _selectDevice: function (deviceName){
            this._deviceSelect.find('span').text(deviceName);
        },
        _refreshDeviceList: function (selectedDevice) {
            var deviceSelect = this._deviceSelect, widget = this,
            deviceSelectMenu = deviceSelect.find('#deviceSelectMenu');
            deviceSelectMenu.empty();
            $.each(this._sysDevices, function (key, val) {
                deviceSelect.data(key, val.Default);
                $('<li/>').append( key )
                    .attr('id', key)
                    .append(
                        $('<b></b>').addClass('fr')
                    )
                    .append(
                        $('<ul/>')
                            .attr('catelog', key)
                            .append('<li>Default</li>')
                    )
                    .appendTo(deviceSelectMenu);
            });

            $.each(this._userDevices, function (name, info) {
                var type = info.type;
                deviceSelect.data(name, info);
                $('<li/>').append( name )
                    .appendTo(deviceSelect.find('#'+type).children('ul'));
            });

            deviceSelect.trigger('change.device', selectedDevice);

        },
        _getSelectedDeviceInfo: function () {
            var selectedDevice = $('#selectedDevice');
            return this._deviceSelect.data(selectedDevice.text());
        },

        _cloneDeviceInfo: function (device) {
            var device = device || this._getSelectedDeviceInfo();
            return $.extend(true, {}, device);
        },

        _modifyScreenSize: function (deviceInfo, screenWidth, screenHeight) {
            var scaleW =  screenWidth/deviceInfo.screen.width,
            scaleH =  screenHeight/deviceInfo.screen.height;
            deviceInfo.screen.width *= scaleW;
            deviceInfo.screen.width = Math.round(deviceInfo.screen.width);
            deviceInfo.screen.offset.left *= scaleW;
            deviceInfo.screen.offset.right *= scaleW;
            deviceInfo.screen.height *= scaleH;
            deviceInfo.screen.height = Math.round(deviceInfo.screen.height);
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
                deviceInfo = this._cloneDeviceInfo(),
                activeProject = $.rib.pmUtils.getActive();
            // set device info for the current active project
            activeProject && $.rib.pmUtils.setProperty(activeProject, "device", this._projectDevice);
            if (this._projectDevice.rotating) {
                $.extend(true, deviceInfo, {
                    screen: {
                        width: deviceInfo.screen.height,
                        height: deviceInfo.screen.width,
                        offset: {
                            top: deviceInfo.screen.offset.right,
                            left: deviceInfo.screen.offset.top,
                            bottom: deviceInfo.screen.offset.left,
                            right: deviceInfo.screen.offset.bottom
                        }
                    }
                });
            }

            //If modified manully by user, scale screen offsets and recaculate skin size
            this._modifyScreenSize(deviceInfo, this._projectDevice.screenWidth,
                    this._projectDevice.screenHeight);

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
                left: deviceInfo.screen.offset.left + 'px'
            });

            this._deviceWrapper.css({
                width: deviceInfo.skin.width + 'px',
                minWidth: deviceInfo.skin.width + 'px',
                maxWidth: deviceInfo.skin.width + 'px',
                height: deviceInfo.skin.height + 'px',
                minHeight: deviceInfo.skin.height + 'px',
                maxHeight: deviceInfo.skin.height + 'px'
            });
            deviceSkin = this._deviceWrapper.find('img').attr('src', deviceInfo.skin.href);
            if (this._projectDevice.rotating)
                deviceSkin.css({
                    height: deviceInfo.skin.width + 'px',
                    width: deviceInfo.skin.height + 'px',
                    '-webkit-transform': 'rotate(-90deg)',
                    '-webkit-transform-origin': deviceInfo.skin.height/2 + 'px ' + deviceInfo.skin.height/2 + 'px'
                });
            else
                deviceSkin.css({
                    height: deviceInfo.skin.height + 'px',
                    width: deviceInfo.skin.width + 'px',
                    '-webkit-transform': 'rotate(0deg)'
                });

        },

        _createPrimaryTools: function() {
            return $(null);
        },

        _createSecondaryTools: function() {
            return $(null);
        },

        _designResetHandler: function(event, widget) {
            var activeProject, selectedDeviceInfo;

            widget = widget || this;
            $.rib.baseView.prototype._designResetHandler.call(this, event, widget);
            if (!widget._projectDevice)
                widget._projectDevice = $.rib.pmUtils.getPropertyDefault("device");
            activeProject = $.rib.pmUtils.getActive();
            if (activeProject) {
                widget._projectDevice =
                    $.rib.pmUtils.getProperty(activeProject, "device");
            }
            widget._refreshDeviceList(widget._projectDevice.name);
            selectedDeviceInfo = widget._getSelectedDeviceInfo();
            if (selectedDeviceInfo) {
                if (!widget._projectDevice.screenWidth)
                    widget._projectDevice.screenWidth =
                        selectedDeviceInfo.screen.widget;
                if (!widget._projectDevice.screenHeight)
                    widget._projectDevice.screenHeight =
                        selectedDeviceInfo.screen.height;
                if (!widget._projectDevice.type)
                    widget._projectDevice.type = selectedDeviceInfo.type;
                widget._screenHeight.val(widget._projectDevice.screenHeight);
                widget._screenWidth.val(widget._projectDevice.screenWidth);
                widget._setDevice();
            }
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
        }
    });
})(jQuery);
