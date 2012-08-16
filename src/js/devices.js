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

function loadDevices(container) {
    var defaultContainer = '#devices-sub-menu';

    function onSuccess(data) {
        var $devicesMenu = container.next(),
            first = true;
        $.each(data, function (key, val) {
            var li, a, bullet = "&nbsp;";
            if (first) {
                // set initial default
                $("#preview-frame").attr(val);
                bullet = "&bull;";
                first = false;
            }
            li = $('<li>');
            a = $('<a id="'+ key + '">' +
                  '<span class="space">' + bullet + '</span>' +
                  key + ' (' +
                  val.width + 'x' + val.height + ')</a>');
            li.append(a);
            $devicesMenu.append(li);
            a.data("device-data", val);
            a.click( function () {
                var data = $(this).data("device-data");
                var $previewFrame = $("#preview-frame");
                $previewFrame.attr(data);
                $(this).closest("ul")
                    .find("span.space")
                    .html("&nbsp;");
                $(this).find("span.space")
                    .html("&bull;");
            });
        });
    };

    container = $(container || defaultContainer)

    if (container.length === 0) {
        return false;
    }

    console.log("Starting devices load...");

    $.ajax({
        type: 'GET',
        url: "src/assets/devices.json",
        dataType: 'json',
        success: onSuccess,
        data: {},
        async: false
    });
}
