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

$.rib = $.rib || {};
$.rib.msgbox = function () {
    var dlg = $("<div/>").append('<p class="title">'
            + arguments[0] + '</p>'),
        buttons = arguments[1], buttonSet;
    var i = 0;
    if (buttons) {
        buttonSet = $('<div id="buttonSet"/>').appendTo(dlg);
        $.each(buttons, function (name, value) {
                buttonSet.append($('<button class="buttonStyle"/>')
                    .text(name)
                    .bind('click', value)
                    .bind('click', function () {dlg.dialog('close')}));
        });
    }
    dlg.dialog({
        title: "Rapid Interface Builder",
        modal: true,
        minWidth: 300
    });
};

window.alert = function (msg) {
    $.rib.msgbox(msg, {"OK": null});
}

$.rib.confirm = function (message, okCallback, cancelCallback) {
    $.rib.msgbox(message, {'Cancel': cancelCallback, 'OK': okCallback});
}
