/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
/*global BWidget, BWidgetRegistry */
"use strict";

var SHOW_IDS = true;

//
// Debug Code
//

function loadWidgets() {
    var html = "", widgets;
    html += "<p>Select a parent widget:<br>\n";
    html += generateWidgetButtons("selectParent");

    html += "</p>\n<p>Select a child widget:<br>\n";
    html += generateWidgetButtons("selectChild");
    html += "</p>\n";

    widgets = document.getElementById("widgets");
    widgets.innerHTML = html;
}

function findWidgets(div, label, funcName) {
    var widgets, widget;
    widgets = document.getElementById(div);
    widgets.innerHTML = "<hr>Select a " + label + " widget: ";
    for (widget in BWidgetRegistry) {
        if (BWidgetRegistry.hasOwnProperty(widget)) {
            widgets.innerHTML += "<button onclick=\"" + funcName + "('" +
                widget + "')\">" + widget + "</button>\n";
        }
    }
}

function generateWidgetButtons(funcName) {
    var html = "", widget;
    for (widget in BWidgetRegistry) {
        if (BWidgetRegistry.hasOwnProperty(widget)) {
            html += "<button onclick=\"" + funcName + "('" + widget +
                "')\">" + widget + "</button>\n";
        }
    }
    return html;
}

var parentWidget = "";
var childWidget = "";

function selectParent(type) {
    var html = "", names, parentDiv;
    parentWidget = type;

    html += "Parent widget: <b>" + parentWidget + "</b> (zones: ";

    names = BWidget.getZones(parentWidget);
    if (names.length > 0) {
        html += names.join(", ");
    } else {
        html += "NONE";
    }
    html += ")<br>\n";

    parentDiv = document.getElementById("parentDiv");
    parentDiv.innerHTML = html;

    if (childWidget !== "") {
        updateResults();
    }
}

function selectChild(type) {
    var html = "", childDiv;
    childWidget = type;

    html += "Child widget: <b>" + childWidget + "</b><br>\n";

    childDiv = document.getElementById("childDiv");
    childDiv.innerHTML = html;

    if (parentWidget !== "") {
        updateResults();
    }
}

function updateResults() {
    var html = "", results, result;

    results = document.getElementById("results");

    html += "<hr>Child allows parent: " +
        BWidget.childAllowsParent(parentWidget, childWidget) + "<br>\n";
    results.innerHTML = html;
    html += "Parent allows child: " +
        BWidget.parentAllowsChild(parentWidget, childWidget) + "<br>\n";
    results.innerHTML = html;
    html += "Zones for child: ";
    results.innerHTML = html;
    result = BWidget.zonesForChild(parentWidget, childWidget);
    if (result.length > 0) {
        html += result;
    } else {
        html += "NONE";
    }

    results.innerHTML = html;
}
