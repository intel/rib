/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
/*jslint nomen: true, plusplus: true */
/*global ADM, ADMNode, BWidget */
"use strict";

var SHOW_IDS = false;
var SHOW_ZONES = false;
var SHOW_PROPERTIES = false;
var SHOW_SELECTABLES = false;
var SHOW_MOVEABLES = false;
var SHOW_CONTAINERS = false;

function toggleShowIDs() {
    SHOW_IDS = !SHOW_IDS;
    var btn = document.getElementById("btn_ids");
    btn.innerHTML = SHOW_IDS ? "Hide IDs" : "Show IDs";
    renderDesignTree();
}

function toggleShowZones() {
    SHOW_ZONES = !SHOW_ZONES;
    var btn = document.getElementById("btn_zones");
    btn.innerHTML = SHOW_ZONES ? "Hide Zones" : "Show Zones";
    renderDesignTree();
}

function toggleShowProperties() {
    SHOW_PROPERTIES = !SHOW_PROPERTIES;
    var btn = document.getElementById("btn_props");
    btn.innerHTML = SHOW_PROPERTIES ? "Hide Properties" : "Show Properties";
    renderDesignTree();
}

function toggleShowSelectables() {
    SHOW_SELECTABLES = !SHOW_SELECTABLES;
    var btn = document.getElementById("btn_selectables");
    btn.innerHTML = SHOW_SELECTABLES ? "Hide Selectables" : "Show Selectables";
    renderDesignTree();
}

function toggleShowMoveables() {
    SHOW_MOVEABLES = !SHOW_MOVEABLES;
    var btn = document.getElementById("btn_moveables");
    btn.innerHTML = SHOW_MOVEABLES ? "Hide Moveables" : "Show Moveables";
    renderDesignTree();
}

function toggleShowContainers() {
    SHOW_CONTAINERS = !SHOW_CONTAINERS;
    var btn = document.getElementById("btn_containers");
    btn.innerHTML = SHOW_CONTAINERS ? "Hide Containers" : "Show Containers";
    renderDesignTree();
}

var design = ADM.getDesignRoot();
var lastPage = null;
var lastObject = design;
var currentObject = null;
var activePage = null;

ADM.bind("activePageChanged", function (event) {
    activePage = event.page;
    renderDesignTree();
});

ADM.bind("selectionChanged", function (event) {
    currentObject = event.node;
    renderDesignTree();
});

design.bind("modelUpdated", function (event) {
    renderDesignTree();
});

function renderDesignTree(node) {
    var tree = document.getElementById("tree");
    tree.innerHTML = render_sub(design, "", "");
}

function render_sub(node, spaces, html) {
    var childspaces = spaces + "  ", props, p, value, quote, children, i;

    if (!(node instanceof ADMNode)) {
        return;
    }

    if (node === currentObject) {
        html += '<span style="color: blue">';
    }

    if (node.getChildrenCount() > 0) {
        html += spaces + "+ " + node.getType();
    } else {
        html += spaces + "- " + node.getType();
    }

    if (SHOW_IDS) {
        html += " (" + node.getUid() + ")";
    }
    if (SHOW_ZONES) {
        html += " [" + node.getZone() + "]";
    }
    if (SHOW_PROPERTIES) {
        html += " { ";
        props = node.getProperties();
        for (p in props) {
            if (props.hasOwnProperty(p)) {
                value = node.getProperty(p);
                quote = (typeof value === "string") ? '"' : '';
                html += p + "=" + quote + value + quote + " ";
            }
        }
        html += "}";
    }
    if (SHOW_SELECTABLES && node.isSelectable()) {
        html += " (s)";
    }
    if (SHOW_MOVEABLES && node.isMoveable()) {
        html += " (m)";
    }
    if (SHOW_CONTAINERS && node.isContainer()) {
        html += " (c)";
    }

    if (node === activePage) {
        html += '  <-- ACTIVE PAGE';
    }
    if (node.isSelected()) {
        html += '  <-- SELECTED';
    }
    if (node === currentObject) {
        html += '</span>';
    }
    html += "\n";

    if (node instanceof ADMNode) {
        children = node.getChildren();
        for (i = 0; i < children.length; i++) {
            html = render_sub(children[i], childspaces, html);
        }
    }

    return html;
}

function addPage() {
    lastPage = new ADMNode("Page");
    lastObject = lastPage;
    design.addChild(lastPage);
    ADM.setActivePage(lastPage);
    currentObject = lastPage;
    renderDesignTree();
}

function addNode(type) {
    if (currentObject) {
        lastObject = new ADMNode(type);
        currentObject.addChild(lastObject);
    }
}

function removeFromZone(zone, index) {
    if (currentObject) {
        currentObject.removeChildFromZone(zone, index);
    }
}

function setPageLanding() {
    if (lastPage) {
        console.log("Old page ID: " + lastPage.getProperty("id"));
        lastPage.setProperty("id", "landing");
        console.log("New page ID: " + lastPage.getProperty("id"));
    }
}

function setPageDialog() {
    if (lastPage) {
        console.log("Old page ID: " + lastPage.getProperty("id"));
        lastPage.setProperty("id", "dialog");
        console.log("New page ID: " + lastPage.getProperty("id"));
    }
}

function getTemplate() {
    if (lastObject) {
        console.log("Last object's template: " + lastObject.getTemplate());
    }
}

function testADM() {
    var design, design2, id, child;
    console.log("Design before: " + ADM._design);  // accessing internals
    design = ADM.getDesignRoot();
    console.log("Design after: " + ADM._design);  // accessing internals
    design.foo = 42;
    design2 = ADM.getDesignRoot();
    console.log("Design later: " + ADM._design);  // accessing internals
    if (design2.foo === 42) {
        console.log("[PASS] Second design matches first");
    } else {
        console.log("[FAIL] First and second designs returned differ");
    }

    id = design.getUid();
    child = ADM.addChild(id, "Page");
    id = child.getUid();
    child = ADM.addChild(id, "Header");
    child = ADM.addChild(id, "Footer");
    child = ADM.addChild(id, "Content");
    id = child.getUid();
    child = ADM.addChild(id, "Button");

    if (BWidget.typeExists("Page")) {
        console.log("[PASS] Page type exists");
    } else {
        console.log("[FAIL] Page type doesn't exist");
    }
    if (BWidget.typeExists("Cucumber")) {
        console.log("[FAIL] Cucumber type supposelyexists");
    } else {
        console.log("[PASS] Cucumber type doesn't exist");
    }
}

function updateHandler(event, data) {
    console.log("Received design event #" + event.id +
                " (" + event.name + ")");
    console.log("  event: " + objprops(event));
    console.log("  data: " + data);
}

var bindCount = 0;

function bindUpdateHandler() {
    bindCount++;
    design.bind("modelUpdated", updateHandler, bindCount);
    console.log("Bound event handler");
}

function unbindUpdateHandler() {
    var count = design.unbind("modelUpdated", updateHandler);
    console.log("Unbound " + count + " event handler(s)");
}

function findById() {
    var input, node;
    input = document.getElementById('findid'), node;
    node = design.findNodeByUid(input.value);
    currentObject = node;
    renderDesignTree();
    document.getElementById('props').innerHTML = "";
}

function selectById() {
    var input, node;
    input = document.getElementById('findid');
    if (!ADM.setSelected(input.value)) {
        node = design.findNodeByUid(input.value);
        if (node) {
            alert(node.getType() + " type not selectable");
        }
    } else {
        document.getElementById('props').innerHTML = "";
    }
}

function moveNode() {
    var from, to, zone, index, node, newParent;
    from = parseInt(document.getElementById('movefrom').value);
    to = parseInt(document.getElementById('moveto').value);
    zone = document.getElementById('movezone').value;
    index = parseInt(document.getElementById('moveindex').value);

    node = design.findNodeByUid(from);
    newParent = design.findNodeByUid(to);
    if (!node || !newParent) {
        alert("invalid node or parent id");
        return;
    }

    if (index === "") {
        index = undefined;
    }
    node.moveNode(newParent, zone, index);
}

function setActivePage() {
    var input = document.getElementById('findid');
    ADM.setActivePage(design.findNodeByUid(input.value));
}

function removeById() {
    var input = document.getElementById('findid');
    ADM.removeChild(input.value);
}

function insertButtonBefore() {
    var input = document.getElementById('findid');
    ADM.insertChildBefore(input.value, "Button");
}

function insertButtonAfter() {
    var input = document.getElementById('findid');
    ADM.insertChildAfter(input.value, "Button");
}

function unparseProperties(obj) {
    var html = "", i;
    for (i in obj) {
        // FIXME: not sure if we really want only "own" properties here
        if (obj.hasOwnProperty(i)) {
            html += i + " -> ";
            if (typeof obj[i] === "string") {
                html += '"';
            }
            html += obj[i];
            if (typeof obj[i] === "string") {
                html += '"';
            }
            html += " (" + BWidget.getPropertyType(currentObject.getType(), i)
                + ")\n";
        }
    }
    return html;
}

function getProperties() {
    var props, html;
    if (currentObject) {
        props = currentObject.getProperties();
        html = "Properties on object #" + currentObject.getUid() + ":\n";
        html += unparseProperties(props);
        document.getElementById('props').innerHTML = html;
    }
}

function getDefaultProperties() {
    var props, html;
    if (currentObject) {
        props = BWidget.getPropertyDefaults(currentObject.getType());
        html = "Default properties on object #" + currentObject.getUid() +
            ":\n";
        html += unparseProperties(props);
        document.getElementById('props').innerHTML = html;
    }
}

function getProperty() {
    var key, html, val;
    if (currentObject) {
        key = document.getElementById('propkey').value;
        html = "Property '" + key + "' on object #" +
            currentObject.getUid() + ":\n";

        html += "Value: ";
        val = currentObject.getProperty(key);
        if (typeof val === "string") {
            html += '"';
        }
        html += val;
        if (typeof val === "string") {
            html += '"';
        }
        html += "\n";

        html += "Default Value: ";
        val = currentObject.getPropertyDefault(key);
        if (typeof val === "string") {
            html += '"';
        }
        html += val;
        if (typeof val === "string") {
            html += '"';
        }
        html += "\n";

        html += "Is Explicit: ";
        html += currentObject.isPropertyExplicit(key) ? "true" : "false";
        document.getElementById('props').innerHTML = html;
    }
}

function setProperty() {
    var key, val;
    if (currentObject) {
        key = document.getElementById('propkey').value;
        val = document.getElementById('propval').value;
        currentObject.setProperty(key, val);
    }
}
