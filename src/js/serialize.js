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

/*
 * The serialization.js contains following functions:
 *
 *   writeOut():
 *
 */
/*******************************************************
 * General functions for two directions
 ******************************************************/
var DEBUG = true,
    blockModelUpdated = false,
    blockActivePageChanged = false,
    xmlserializer = new XMLSerializer(),
    formatHTML  = function (rawHTML) {
        return style_html(rawHTML, {
                              'max_char': 80,
                              'unformatted': ['a', 'h1', 'script', 'title']
                          });
    },

    generateHTML = function () {
        var doc = constructNewDocument($.gb.getDefaultHeaders());

        serializeADMSubtreeToDOM(ADM.getDesignRoot(), $(doc).find('body'),
                                 function (admNode, domNode) {
                                    $(domNode).data('uid', admNode.getUid());
                                 });
        return { doc: doc,
                 html: formatHTML(xmlserializer.serializeToString(doc))
        };
    },

    serializeADMNodeToDOM = function (node, domParent) {
        var uid, type, pid, selector,
            parentSelector = 'body',
            parentNode = null,
            template, props, id,
            selMap = {},  // maps selectors to attribute maps
            attrName, attrValue, propDefault,
            widget, regEx, wrapper;

        // Check for valid node
        if (node === null || node === undefined ||
            !(node instanceof ADMNode)) {
            return null;
        }

        template = BWidget.getTemplate(node.getType());

        // 1. Regenerating the entire Design, re-create entire document
        if (node.instanceOf('Design')) {
            return null;
        }

        uid = node.getUid();
        type = node.getType();
        selector = '.adm-node[data-uid=\''+uid+'\']';

        if (!node.instanceOf('Page') && !node.instanceOf('Design')) {
            pid = node.getParent().getUid();
            parentSelector = '.adm-node[data-uid=\''+pid+'\']';
        }

        // Find the parent element in the DOM tree
        if (domParent) {
            parentNode = $(domParent);
        } else {
            parentNode = $(':gb-layoutView')
                .layoutView('option','contentDocument').find(parentSelector);
        }

        // Find the parent element of this node in the DOM tree
        if (parentNode === undefined || parentNode === null ||
            parentNode.length < 1) {
            // No sense adding it to the DOM if we can't find it's parent
            console.info(parentSelector+' not found in Design View');
        }

        // 2. Remove this node in existing document, if it exists
        $(selector,parentNode).remove();

        // Ensure we have at least something to use as HTML for this item
        if (template === undefined || template === '') {
            console.warn('Missing template for ADMNode type: '+type+
                            '.  Trying defaults...');
            template = defaultTemplates[type];
            // If no default exists, we must error out
            if (template === undefined || template === '') {
                console.error('No template exists for ADMNode type: '+type);
                return null;
            }
        }

        // The ADMNode.getProperties() call will trigger a modelUpdated
        // event due to any property being set to autogenerate
        node.suppressEvents(true);
        node.getDesign().suppressEvents(true);

        blockModelUpdated = true;
        props = node.getProperties();
        id = node.getProperty('id');
        blockModelUpdated = false;

        if (typeof template === "function") {
            widget = template(node);
        }
        else {
            if (typeof template === "object") {
                template = template[props["type"]];
            }

            // Apply any special ADMNode properties to the template before we
            // create the DOM Element instance
            for (var p in props) {
                attrValue = node.getProperty(p);

                switch (p) {
                case "type":
                    break;
                default:
                    attrName = BWidget.getPropertyHTMLAttribute(type, p);
                    if (attrName) {
                        propDefault = BWidget.getPropertyDefault(type, p);

                        if (attrValue !== propDefault ||
                            BWidget.getPropertyForceAttribute(type, p)) {
                            selector = BWidget.getPropertyHTMLSelector(type, p);
                            if (!selector) {
                                // by default apply attributes to first element
                                selector = ":first";
                            }

                            if (!selMap[selector]) {
                                // create a new select map entry
                                selMap[selector] = {};
                            }

                            // add attribute mapping to corresponding selector
                            selMap[selector][attrName] = attrValue;
                        }
                    }
                    break;
                }

                if (typeof attrValue === "string" ||
                    typeof attrValue === "number") {
                    // reasonable value to substitute in template
                    regEx = new RegExp('%' + p.toUpperCase() + '%', 'g');
                    if(typeof attrValue === "string") {
                        attrValue = attrValue.replace(/&/g, "&amp;");
                        attrValue = attrValue.replace(/"/g, "&quot;");
                        attrValue = attrValue.replace(/'/g, "&#39;");
                        attrValue = attrValue.replace(/</g, "&lt;");
                        attrValue = attrValue.replace(/>/g, "&gt;");
                    }
                    template = template.replace(regEx, attrValue);
                }
            }

            // Turn the template into an element instance, via jQuery
            widget = $(template);

            // apply the HTML attributes
            wrapper = $("<div>").append(widget);
            for (selector in selMap) {
                wrapper.find(selector)
                    .attr(selMap[selector]);
            }
        }

        $(parentNode).append(widget);

        node.getDesign().suppressEvents(false);
        node.suppressEvents(false);

        return widget;
    },

    serializeADMSubtreeToDOM = function (node, domParent, renderer) {
        var isContainer = false,
            domElement;

        // 1. Only handle ADMNodes
        if (!(node instanceof ADMNode)) {
            return;
        }

        isContainer = (node.getChildrenCount() !== 0);

        // 2. Do something with this node
        domElement = serializeADMNodeToDOM(node, domParent);
        if (renderer && domElement) {
            renderer(node, domElement);
        }

        domElement = domElement || domParent;

        // 3. Recurse over any children
        if (isContainer) {
            var children = node.getChildren();
            for (var i=0; i<children.length; i++) {
                serializeADMSubtreeToDOM(children[i], domElement, renderer);
            }
        }

        // 4. Return (anything?)
        return;
    };
function constructNewDocument(headers) {
    var doc = document.implementation.createHTMLDocument('title'),
        head = $(doc.head),
        tmpHead = '', i;

    if (headers && headers.length > 0) {
        for (i=0; i < headers.length; i++) {
            if (headers[i].match('<script ')) {
                // Need this workaround since appendTo() causes the script
                // to get parsed and then removed from the DOM tree, meaning
                // it will not be in any subsequent Serialization output later
                tmpHead = head[0].innerHTML;
                head[0].innerHTML = tmpHead+headers[i];
            } else {
                $(headers[i]).appendTo(head);
            }
        }
    }

    return doc;
}

function dumplog(loginfo){
    if (DEBUG && (typeof loginfo === "string")){
        console.log(loginfo);
    }
    return;
}


$(function() {
    var fsUtils = $.gb.fsUtils,
        cookieUtils = $.gb.cookieUtils,
        cookieExpires = new Date("January 1, 2022");

    /*******************************************************
     * define handlers
     ******************************************************/
    function triggerImportFileSelection () {
        $('#importFile').click();
    }

    function triggerExportDesign () {
        var cookieValue = cookieUtils.get("exportNotice"),
            $exportNoticeDialog = $("#exportNoticeDialog");

        if(cookieValue === "true" && $exportNoticeDialog.length > 0) {
            // bind exporting design handler to OK button
            $exportNoticeDialog.dialog("option", "buttons", {
                "OK": function () {
                    serializeADMToJSON();
                    $("#exportNoticeDialog").dialog("close");
                }
            });
            // open the dialog
            $exportNoticeDialog.dialog("open");
        } else {
            // if cookieValue is not true, export design directly
            serializeADMToJSON();
        }
    }

    function importFileChangedCallback (e) {
        if (e.currentTarget.files.length === 1) {
            $.gb.fsUtils.cpLocalFile(e.currentTarget.files[0],
                                "design.json",
                                buildDesignFromJson);
            return true;
        } else {
            if (e.currentTarget.files.length <= 1) {
                console.warn("No files specified to import");
            } else {
                console.warn("Multiple file import not supported");
            }
            return false;
        }
    }

    function createExportNoticeDialog () {
        var dialogStr, dialogOpts, $exportNoticeDialog;
        dialogStr = '<div id="exportNoticeDialog">';
        dialogStr += 'Note: Files will be saved in the default download path of the Browser.';
        dialogStr += '<p>To configure the Browser to ask you to where to save files, go to:<br>';
        dialogStr += 'Preferences -> Under the Hood -> Download</p>';
        dialogStr += '<p>Then check the box "Ask where to save each file before downloading"</p>';
        dialogStr += '<p><input type="checkbox">Do not remind me again</p>';
        dialogStr += '</div>';
        dialogOpts = {
            autoOpen: false,
            modal: true,
            width: 600,
            resizable: false,
            height: 400,
            title: "Tizen GUI Builder",
        };
        $(dialogStr).dialog(dialogOpts);
        $exportNoticeDialog = $("#exportNoticeDialog");
        if($exportNoticeDialog.length <= 0) {
            console.error("create saveAlertDialog failed.");
            return false;
        }

        $exportNoticeDialog.find("input:checkbox").click(function () {
            var notice = this.checked ? "false" : "true";
            // set cookie
            if(!cookieUtils.set("exportNotice", notice, cookieExpires)) {
                console.error("Set exportNotice cookie failed.");
            }
        });
        return true;
    }

    /*******************************************************
     * JSON to ADM Direction
     ******************************************************/
    /**
     * Loads a design from a JSON object and replaces the design root. Sets the
     * AMD design root to this design, which sends a designReset event.
     *
     * @param {Object} obj The JSON object to parse
     * @return {Boolean} True if the design is loaded successfully.
     */
    function loadFromJsonObj(obj) {
        function add_child(parent, nodes) {
            if (typeof(nodes) !== "object") {
                return false;
            }

            if (typeof(nodes.length) == "undefined") {
                return false;
            }

            var child, childType, zone,
                properties = {},
                item, val, node, result, i;

            for (i = 0; i < nodes.length; i++) {
                node = nodes[i];
                childType = node.type;
                zone = node.zone;
                properties = node.properties;
                child =  ADM.createNode(childType, true);
                // set properties of child
                for (item in properties) {
                    // parser the properties and set the value to the node
                    val = properties[item];
                    // if we can't get value, we set item's value as default
                    if (val === null){
                        val = child.getPropertyDefault(item);
                    }
                    child.setProperty(item, properties[item]);
                }
                // add child node to current node
                if (!parent.addChildToZone(child, zone)) {
                    dumplog("add child type "+ childType + " failed");
                    return false;
                }

                if (node.children.length !== 0) {
                    result = add_child(child, node.children);
                    if (!result) {
                        return false;
                    }
                }
            }
            return true;
        }

        if (obj === null || obj.type !== "Design") {
            console.log("obj is null or is not a 'Design' Node in loadFromJSONObj");
            return false;
        }

        var result, design = new ADMNode("Design");

        // add children in ADM
        try {
            result = add_child(design, obj.children);
        } catch(e) {
            alert("Invalid design file.");
            return false;
        }

        if (result) {
            result = ADM.setDesignRoot(design);
        } else {
            alert("Error while build design root.");
            return false;
        }
        return result;
    }


    /*
     * This function is loads a JSON template and creates a new ADM tree
     */
    function buildDesignFromJson(fileEntry) {
        // Set a fixed JSON file
        if (fileEntry && fileEntry.isFile) {
            var parsedObject;
            $.gb.fsUtils.read(fileEntry.fullPath, function(result) {
                try {
                    parsedObject = $.parseJSON(result);
                } catch(e) {
                    alert("Invalid design file.");
                    return false;
                }
                return loadFromJsonObj(parsedObject);
            });
        } else {
            console.error("invalid fileEntry to load");
        }
    }

    /*******************************************************
     * ADM to JSON Direction
     ******************************************************/
    function JSObjectFromADMTree(ADMTreeNode) {
        if (ADMTreeNode instanceof ADMNode) {
            // Save staff in ADMNode
            var JSObject = {},
                children, i;
            JSObject.type = ADMTreeNode.getType();
            JSObject.zone = ADMTreeNode.getZone();
            JSObject.properties = ADMTreeNode.getProperties();
            JSObject.children = [];

            // Recurse to fill children array
            children = ADMTreeNode.getChildren();
            if (children.length > 0) {
                for (i = 0; i < children.length; i++) {
                    JSObject.children[i] = JSObjectFromADMTree(children[i]);
                }
            }
            return JSObject;
        } else {
            console.log("warning: children of ADMNode must be ADMNode");
            return null;
        }
    }

    function serializeADMToJSON(ADMTreeNode, outPath) {
        // Set a fixed position to  the output file
        var path = outPath || "design.json",
            root = ADMTreeNode || ADM.getDesignRoot(),
            JSObjectForADM = JSObjectFromADMTree(root),
            text;

        // Following is for the serializing part
        if (typeof JSObjectForADM === "object") {
            text = JSON.stringify(JSObjectForADM);

            $.gb.fsUtils.write(path, text, function(fileEntry) {
                $.gb.fsUtils.exportToTarget(fileEntry.fullPath);
            });
            return true;
        } else {
            console.log("error: invalid serialized Object for ADM tree");
            return false;
        }
    }
    /********************* Functions definition End **************************/

    function fsInitSuccess(fs) {
        // if can't get the cookie(no this record), then add exportNotice cookie
        if (!cookieUtils.get("exportNotice")) {
            if(!cookieUtils.set("exportNotice", "true", cookieExpires)) {
                console.error("Set exportNotice cookie failed.");
            }
        }

        // Export serialization functions into $.gb namespace
        $.gb.ADMToJSON = serializeADMToJSON;
        $.gb.JSONToADM = buildDesignFromJson;

        // create a notice Dialog for user to configure the browser, so that
        // a native dialog can be shown when exporting design or HTML code
        createExportNoticeDialog();

        // bind handlers for import and export buttons
        $(document).delegate('#importProj', "click", triggerImportFileSelection);
        $(document).delegate('#exportProj', "click", triggerExportDesign);

        // Import file selection change handler //
        $('#importFile').change(importFileChangedCallback);
    }

    function fsInitFailed() {
        alert('File system initiation failed."Import" and "Export" feature can not work.');
    }

    function getDefaultHeaders() {
        var i, props, el;

        $.gb.defaultHeaders = $.gb.defaultHeaders || [];

        if ($.gb.defaultHeaders.length > 0)
            return $.gb.defaultHeaders;

        props = ADM.getDesignRoot().getProperty('metas');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            el = '<meta ';
            if (props[i].hasOwnProperty('key')) {
                el = el + props[i].key;
            }
            if (props[i].hasOwnProperty('value')) {
                el = el + '="' + props[i].value + '"';
            }
            if (props[i].hasOwnProperty('content')) {
                el = el + ' content="' + props[i].content + '"';
            }
            el = el + '>';
            $.gb.defaultHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('libs');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            el = '<script ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'src="' + props[i].value + '"';
            }
            el = el + '></script>';
            $.gb.defaultHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('css');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            el = '<link ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'href="' + props[i].value + '"';
            }
            el = el + ' rel="stylesheet">';
            $.gb.defaultHeaders.push(el);
        }
        return $.gb.defaultHeaders;
    }

    function getDesignHeaders() {
        var i, props, el;

        $.gb.designHeaders = $.gb.designHeaders || [];
        if ($.gb.designHeaders.length > 0)
            return $.gb.designHeaders;

        props = ADM.getDesignRoot().getProperty('metas');
        for (i in props) {
            el = '<meta ';
            if (props[i].hasOwnProperty('key')) {
                el = el + props[i].key;
            }
            if (props[i].hasOwnProperty('value')) {
                el = el + '="' + props[i].value + '"';
            }
            if (props[i].hasOwnProperty('content')) {
                el = el + ' content="' + props[i].content + '"';
            }
            el = el + '>';
            $.gb.designHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('libs');
        for (i in props) {
            el = '<script ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'src="' + props[i].value + '"';
            }
            el = el + '></script>';
            $.gb.designHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('css');
        for (i in props) {
            el = '<link ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'href="' + props[i].value + '"';
            }
            el = el + ' rel="stylesheet">';
            $.gb.designHeaders.push(el);
        }
        return $.gb.designHeaders;
    }

    $.gb.getDefaultHeaders = getDefaultHeaders;
    $.gb.getDesignHeaders = getDesignHeaders;

    // init the sandbox file system
    fsUtils.initFS(fsUtils.fsType, fsUtils.fsSize, fsInitSuccess, fsInitFailed);
});
