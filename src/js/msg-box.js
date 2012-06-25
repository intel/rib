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
$.rib.msgbox = function (){
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
    dlg.dialog({modal:true});
};

window.alert =  function (msg) {
    $.rib.msgbox(msg, {"OK": null});
}

var old_confirm = window.confirm;
window.confirm = function () {
    if (arguments.length > 1) {
       $.rib.msgbox(arguments[0], {'Cancel': arguments[2], 'OK': arguments[1]});
    }
    else
        return old_confirm(arguments[0]);
}

