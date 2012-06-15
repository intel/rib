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
            'unformatted': ['a', 'script', 'title']
        });
    },

    generateHTML = function () {
        var doc = constructNewDocument($.rib.getDefaultHeaders());

        function renderClean(admNode, domNode) {
            $(domNode).data('uid', admNode.getUid());
            if (domNode.hasClass("rib-remove")) {
                domNode.replaceWith(domNode.text());
            }
        };

        serializeADMSubtreeToDOM(ADM.getDesignRoot(), $(doc).find('body'),
                                 renderClean);
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
            attrName, attrValue, propValue, propDefault,
            widget, regEx, wrapper, domNodes;

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
        selector = '.adm-node[data-uid=\'' + uid + '\']';
        selector += ',.orig-adm-node[data-uid=\'' + uid + '\']';

        if (!node.instanceOf('Page') && !node.instanceOf('Design')) {
            pid = node.getParent().getUid();
            parentSelector = '.adm-node[data-uid="' + pid +
                '"]:not(.delegation),.orig-adm-node[data-uid=\'' + pid + '\']';
        }

        // Find the parent element in the DOM tree
        if (domParent) {
            parentNode = $(domParent);
        } else {
            parentNode = $(':rib-layoutView')
                .layoutView('option','contentDocument').find(parentSelector)
                .last();
        }

        // Find the parent element of this node in the DOM tree
        if (parentNode === undefined || parentNode === null ||
            parentNode.length < 1) {
            // No sense adding it to the DOM if we can't find it's parent
            console.info(parentSelector+' not found in Design View');
        }

        domNodes = $(selector, parentNode);
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
                propValue = node.getProperty(p);

                switch (p) {
                case "type":
                    break;
                default:
                    attrName = BWidget.getPropertyHTMLAttribute(type, p);
                    if (typeof attrName  === "object") {
                        var attrMap = attrName;
                        attrName = attrMap.name;
                        attrValue = attrMap.value[propValue];
                    }
                    if (attrName) {
                        propDefault = BWidget.getPropertyDefault(type, p);

                        if (propValue !== propDefault ||
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

                if (typeof propValue === "string" ||
                    typeof propValue === "number") {
                    // reasonable value to substitute in template
                    regEx = new RegExp('%' + p.toUpperCase() + '%', 'g');
                    if(typeof propValue === "string") {
                        propValue = propValue.replace(/&/g, "&amp;");
                        propValue = propValue.replace(/"/g, "&quot;");
                        propValue = propValue.replace(/'/g, "&#39;");
                        propValue = propValue.replace(/</g, "&lt;");
                        propValue = propValue.replace(/>/g, "&gt;");
                        // Append UID to assist with debugging
                        if ($.rib.debug('showuid') && p === 'text') {
                            propValue += ' '+uid;
                        }
                    }
                    template = template.replace(regEx, propValue);
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

        if (domNodes.length === 0) {
            var zone = BWidget.getZone(node.getParent().getType(), node.getZone());
            if (zone.itemWrapper)
                widget = $(zone.itemWrapper).append(widget);
            if (zone.locator)
                $(parentNode).find(zone.locator).append(widget);
            else
                $(parentNode).append(widget);
        }
        else {
            //The template of some widgets may have multiple root tags
            //and there are also possible delegated nodes, we will remove all
            //the extra nodes before replacing the last one.
            //It's also possible that jQM generates nodes which are not
            //delegating, we should also have a mechanism to handle this case,
            //but till now we don't have such case, so we can defer this case
            //to be handled in the delegate function of the corresponding widget
            //e.g. To add a special class to these tags so that they can be selected
            //to remove here.
            for (var i = 1; i < domNodes.lenght; i ++)
                $(domNodes[i]).remove();
            $(domNodes[0]).replaceWith(widget);
        }


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

    /*******************************************************
     * JSON to ADM Direction
     ******************************************************/
    /**
     * Loads a design from a JSON object and replaces the design root. Sets the
     * AMD design root to this design, which sends a designReset event.
     *
     * @param {Object} obj The JSON object to parse
     * @return {ADMNode/null} the design build from the text if success, null if failed.
     */
    function JSONToProj(text) {
        var result, design, parsedObject, resultProject = {};

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
                try {
                    child =  ADM.createNode(childType, true);

                    // add child node to current node
                    if (!parent.addChildToZone(child, zone)) {
                        dumplog("add child type "+ childType + " failed");
                        return false;
                    }

                    // set properties of child
                    for (item in properties) {
                        // parser the properties and set the value to the node
                        val = properties[item];
                        // if we can't get value, we set item's value as default
                        if (!val){
                            val = child.getPropertyDefault(item);
                        }

                        // NOTE: It's important that we pass "true" for the fourth
                        // parameter here (raw) to disable "property hook"
                        // functions like the grid one that adds or removes child
                        // Block elements based on the property change
                        child.setProperty(item, properties[item], null, true);
                    }
                }catch (e) {
                    if (!confirm("Error creating " + childType +
                                (item ? " when setting property '" +
                                item + "'" : "") + " - " + e +
                                ".\n\nContinue loading the design?"))
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

        try {
            parsedObject = $.parseJSON(text);
        } catch(e) {
            parsedObject = null;
            alert("Invalid design file.");
        }
        if (parsedObject === null || parsedObject.type !== "Design") {
            console.log("obj is null or is not a 'Design' Node");
            return null;
        }

        design = new ADMNode("Design");
        design.suppressEvents(true);

        // add children in ADM
        try {
            result = add_child(design, parsedObject.children);
        } catch(e) {
            result = null;
            alert("Invalid design file.");
        }

        design.suppressEvents(false);

        if (result) {
            resultProject.design = design;
            resultProject.pInfo = parsedObject.pInfo;
            return resultProject;
        } else {
            console.error("Error while building design root from JSON");
            return null;
        }
    }

    /*
     * This function is to find valid design.json in imported file and build ADMTree according it
     */
    function zipToProj(data) {
        var zip, designData;
        try {
            zip = new ZipFile(data);
            zip.filelist.forEach(function(zipInfo, idx, array) {
                // if find a file name contians "json" then get its data
                if (zipInfo.filename.indexOf("json") !== -1) {
                    designData = zip.extract(zipInfo.filename);
                }
            });
        } catch (e) {
            designData = data;
        }
        return JSONToProj(designData);
    }

    /*******************************************************
     * ADM to JSON Direction
     ******************************************************/
    function ADMToJSONObj(ADMTreeNode) {
        ADMTreeNode = ADMTreeNode || ADM.getDesignRoot();
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
                    JSObject.children[i] = ADMToJSONObj(children[i]);
                }
            }
            return JSObject;
        } else {
            console.log("warning: children of ADMNode must be ADMNode");
            return null;
        }
    }

    function getDefaultHeaders() {
        var i, props, el;

        $.rib.defaultHeaders = $.rib.defaultHeaders || [];

        if ($.rib.defaultHeaders.length > 0)
            return $.rib.defaultHeaders;

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
            $.rib.defaultHeaders.push(el);
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
            $.rib.defaultHeaders.push(el);
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
            $.rib.defaultHeaders.push(el);
        }
        return $.rib.defaultHeaders;
    }

    function getDesignHeaders() {
        var i, props, el;

        $.rib.designHeaders = $.rib.designHeaders || [];
        if ($.rib.designHeaders.length > 0)
            return $.rib.designHeaders;

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
            $.rib.designHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('libs');
        for (i in props) {
            el = '<script ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'src="' + props[i].value + '"';
            }
            el = el + '></script>';
            $.rib.designHeaders.push(el);
        }
        props = ADM.getDesignRoot().getProperty('css');
        for (i in props) {
            el = '<link ';
            if (props[i].hasOwnProperty('value')) {
                el = el + 'href="' + props[i].value + '"';
            }
            el = el + ' rel="stylesheet">';
            $.rib.designHeaders.push(el);
        }
        return $.rib.designHeaders;
    }

   function  exportFile (fileName, content, binary) {
        var cookieValue = $.rib.cookieUtils.get("exportNotice"),
            $exportNoticeDialog = createExportNoticeDialog(),
            saveAndExportFile = function () {
                $.rib.fsUtils.write(fileName, content, function(fileEntry){
                    $.rib.fsUtils.exportToTarget(fileEntry.fullPath);
                }, null, false, binary);
            };

        if(cookieValue === "true" && $exportNoticeDialog.length > 0) {
            // bind exporting HTML code handler to OK button
            $exportNoticeDialog.dialog("option", "buttons", {
                "OK": function () {
                    saveAndExportFile();
                    $("#exportNoticeDialog").dialog("close");
                }
            });
            // open the dialog
            $exportNoticeDialog.dialog("open");
        } else {
            // if cookieValue is not true, export HTML code directly
            saveAndExportFile();
        }
    }

    // create a notice Dialog for user to configure the browser, so that
    // a native dialog can be shown when exporting design or HTML code
    function  createExportNoticeDialog () {
        var dialogStr, dialogOpts, $exportNoticeDialog, cookieExpires;
        cookieExpires = new Date("January 1, 2042");
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
            width: 500,
            resizable: false,
            height: 400,
            title: "RIB",
        };
        $(dialogStr).dialog(dialogOpts);
        $exportNoticeDialog = $("#exportNoticeDialog");
        if($exportNoticeDialog.length <= 0) {
            console.error("create saveAlertDialog failed.");
            return null;
        }
        $exportNoticeDialog.find("input:checkbox").click(function () {
            var notice = this.checked ? "false" : "true";
            // set cookie
            if(!$.rib.cookieUtils.set("exportNotice", notice, cookieExpires)) {
                console.error("Set exportNotice cookie failed.");
            }
        });
        return $exportNoticeDialog;
    }

    function exportPackage (resultProject) {
        var zip, resultHTML, files, i;
        zip = new JSZip();
        resultHTML = generateHTML();
        resultHTML && zip.add("index.html", resultHTML.html);
        resultProject && zip.add("project.json", resultProject);
        files = [
            'src/css/images/ajax-loader.png',
            'src/css/images/icons-18-white.png',
            'src/css/images/icons-36-white.png',
            'src/css/images/icons-18-black.png',
            'src/css/images/icons-36-black.png',
            'src/css/images/icon-search-black.png',
            'src/css/images/web-ui-fw_noContent.png',
            'src/css/images/web-ui-fw_volume_icon.png'
        ];
        function getDefaultHeaderFiles (type) {
            var headers, files = [];
            headers = ADM.getDesignRoot().getProperty(type);
            for ( var header in headers) {
                // Skip design only header properties
                if (headers[header].hasOwnProperty('designOnly') && headers[header].designOnly) {
                    continue;
                }
                files.push(headers[header].value);
            }
            return files;
        }
        $.merge(files, $.merge(getDefaultHeaderFiles("libs"), getDefaultHeaderFiles("css")));

        i = 0;
        function getFile () {
            if (i < files.length)
            {
                // We have to do ajax request not using jquery as we can't get "arraybuffer" response from jquery
                var req = window.ActiveXObject ? new window.ActiveXObject( "Microsoft.XMLHTTP" ): new XMLHttpRequest();
                req.onload = function() {
                    var uIntArray = new Uint8Array(this.response);
                    var charArray = new Array(uIntArray.length);
                    for (var j = 0; j < uIntArray.length; j ++)
                        charArray[j] = String.fromCharCode(uIntArray[j]);
                    zip.add(files[i],btoa(charArray.join('')), {base64:true});
                    if (i === files.length - 1){
                        var content = zip.generate(true);
                        exportFile("design.zip", content, true);
                    }
                    i++;
                    getFile();
                }
                try
                {
                    req.open("GET", files[i], true);
                    req.responseType = 'arraybuffer';
                } catch (e) {
                    alert(e);
                }
                req.send(null);
            }
        }
        getFile();
    }

    /***************** export functions out *********************/
    // Export serialization functions into $.rib namespace
    $.rib.ADMToJSONObj = ADMToJSONObj;
    $.rib.JSONToProj = JSONToProj;
    $.rib.zipToProj = zipToProj;

    $.rib.getDefaultHeaders = getDefaultHeaders;
    $.rib.getDesignHeaders = getDesignHeaders;

    $.rib.exportPackage = exportPackage;
});
