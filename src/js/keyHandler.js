/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
"use strict";

/**
 * Global object for key handler.
 *
 */
$(function() {
    var navUtils = {
        enableKeys: function (element) {
            $(element).keyup(navUtils.shortCut);
            $(element).keydown(navUtils.tabHandler);
        },
        shortCut: function(e) {
            var charItem, shortKeys;
            shortKeys = {
                // "ctrl+z" for "undo"
                'z': 'undo',
                // "ctrl+y" for "redo"
                'y':'redo',
                // "ctrl+x" for "cut"
                'x':'cut',
                // "ctrl+c" for "copy"
                'c':'copy',
                // "ctrl+v" for "past"
                'v':'paste'
            };
            // If there is modal dialog or need to ignore text elements, do nothing.
            if ($('.ui-widget-overlay:visible').length > 0 || navUtils.ignoreText()) {
                return true;
            }
            // for "delete"
            // fn + delete in Mac to delete element
            if (e.which === 46) {
                $('#deleteElement:visible').trigger("click");
                return false;
            }
            if (e.ctrlKey) {
                charItem = String.fromCharCode(e.which).toLowerCase();
                if (shortKeys[charItem]) {
                    $('#btn' + shortKeys[charItem] + ':visible').trigger("click");
                    return false;
                }
            }
            return true;
        },
        // for "tab"
        tabHandler: function (e) {
            if ($('.ui-wiget-overlay:visible').length > 0) {
                return true;
            }
            var navItems = navUtils.enableFocus();
            if (e.which !== 9) {
                return true;
            }
            if (navItems.last().is(":focus")) {
                if (!e.shiftKey) {
                    e.preventDefault();
                    navItems.first().focus();
                    return false;
                }
            } else if (navItems.first().is(":focus")) {
                if (e.shiftKey) {
                    e.preventDefault();
                    navItems.last().focus();
                    return false;
                }
            }
        },
        /**
         * Enable items that wants to be focused by tab key.
         *
         * This is hard-coding, if all the views or elements can mark themself if it want key navigation,
         * such as add a class "navItem" to the elements, case will be better.
         */
        enableFocus: function () {
            var navItems, items, navPanes;
            navPanes = ['.navbar', '.pageView', '.propertyView', ".tools"];
            items = "a, button, input, select, textarea, area";
            navPanes.forEach(function (pane, index) {
                navItems = $(navItems).add($(":visible", pane).find(items));
            });
            navItems = $(navItems).add($(".treeView:visible"));
            navItems = $(navItems).add($(".pageIcon:visible"));
            navItems.attr("tabindex", 1);
            return navItems;
        },
        ignoreText: function () {
            var i = Boolean($('input[type="text"]:focus, textarea:focus',
                             '.property_content').length),
                f = Boolean($('.adm-editing:focus',$(':rib-layoutView')
                             .layoutView('option','contentDocument')).length);
            return i||f;
        }
    };

    /*******************  export pageUtils to $.rib **********************/
    $.rib = $.rib || {};
    $.rib.enableKeys = navUtils.enableKeys;
});
