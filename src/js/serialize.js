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
    blockActivePageChanged = false,
    xmlserializer = new XMLSerializer(),
    formatHTML  = function (rawHTML) {
        return style_html(rawHTML, {
            'max_char': 80,
            'unformatted': ['a', 'script', 'title']
        });
    },
    dumplog = function (loginfo){
        if (DEBUG && (typeof loginfo === "string")){
            console.log(loginfo);
        }
        return;
    };

$(function () {

    /* Variable definition */
    var headerPropertyMap = {
        css: 'css',
        js: 'libs'
    };

    /**
     * Generate HTML from ADM tree.
     *
     * @param {ADMNode} design ADM design root to be serialized.
     * @param {Boolean} useSandboxUrl Use sandbox url when generating HTML if true, else use
     *                  relative path.
     * @param {function(ADMNode, DOMElement)=} extaHandler Extra handler for each node.
     *
     * @return {Object} return an object contains generated DOM object and related html string
     */
    function generateHTML(design, useSandboxUrl, extraHandler) {
        design = design || ADM.getDesignRoot();
        var doc = constructNewDocument($.rib.getDesignHeaders(design, useSandboxUrl));

        function renderer(admNode, domNode) {
            // clean code
            $(domNode).data('uid', admNode.getUid());
            if (domNode.hasClass("rib-remove")) {
                domNode.replaceWith(domNode.text());
            }
            // call extraHandler if needed
            extraHandler && extraHandler(admNode, domNode);
        };

        serializeADMSubtreeToDOM(design, $(doc).find('body'), useSandboxUrl, renderer);
        return { doc: doc,
                 html: formatHTML(xmlserializer.serializeToString(doc))
        };
    }

    function serializeADMNodeToDOM(node, domParent, useSandboxUrl) {
        var uid, type, pid, selector,
            parentSelector = 'body',
            parentNode = null,
            template, props, id,
            selMap = {},  // maps selectors to attribute maps
            attrObject, mapObject, propValue,
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
            dumplog("Warning" + parentSelector+' not found in Design View');
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

        props = node.getProperties();

        if (typeof template === "function") {
            template =  $('<div/>').append(template(node)).html();
        }

        // Apply any special ADMNode properties to the template before we
        // create the DOM Element instance
        for (var p in props) {
            propValue = node.getProperty(p);

            attrObject = node.getPropertySerializationObject(p);
            if (attrObject) {
                mapObject = selMap[attrObject.selector];
                if (!mapObject) {
                    // create a new selector map entry
                    mapObject = selMap[attrObject.selector] = {};
                }

                if (useSandboxUrl &&
                    node.propertyMatches($.rib.pmUtils.relativeFilter,
                                         p, props[p])) {
                    attrObject.value = BWidget.getPropertySerializableValue(
                        type, p, toSandboxUrl(props[p]));
                }

                // add attribute mapping to corresponding selector
                mapObject[attrObject.attribute] = attrObject.value;
            }

            if (typeof propValue === "string" ||
                typeof propValue === "number") {
                // reasonable value to substitute in template
                regEx = new RegExp('%' + p.toUpperCase() + '%', 'g');
                if(typeof propValue === "string") {
                    propValue = propValue.replace(/&/g, "&amp;");
                    propValue = propValue.replace(/"/g, "&quot;");
                    propValue = propValue.replace(/'/g, "&apos;");
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
            for (var i = 1; i < domNodes.length; i ++)
                $(domNodes[i]).remove();
            $(domNodes[0]).replaceWith(widget);
        }

        return widget;
    }

    function serializeADMSubtreeToDOM(node, domParent, useSandboxUrl, renderer) {
        var isContainer = false,
            domElement;

        // 1. Only handle ADMNodes
        if (!(node instanceof ADMNode)) {
            return;
        }

        isContainer = (node.getChildrenCount() !== 0);

        // 2. Do something with this node
        domElement = serializeADMNodeToDOM(node, domParent, useSandboxUrl);
        if (renderer && domElement) {
            renderer(node, domElement);
        }

        domElement = domElement || domParent;

        // 3. Recurse over any children
        if (isContainer) {
            var children = node.getChildren();
            for (var i=0; i<children.length; i++) {
                serializeADMSubtreeToDOM(children[i], domElement, useSandboxUrl, renderer);
            }
        }

        // 4. Return (anything?)
        return;
    }

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

    /*******************************************************
     * JSON to ADM Direction
     ******************************************************/
    /**
     * Loads a design from a JSON object and replaces the design root. Sets the
     * AMD design root to this design, which sends a designReset event.
     *
     * @param {Object} obj The JSON object to parse
     * @param {function(ADMNode, Object)=} eachHandler Extra handler for each pair of
     *                                                 ADM node and the related object.
     *
     * @return {ADMNode/null} the design build from the text if success, null if failed.
     */
    function JSONToProj(text, eachHandler) {
        var result, design, parsedObject, resultProject = {}, JSObjectToADMNode;

        JSObjectToADMNode = function (admNode, jsObject) {
            var children, child, zone,
                properties, childNode,
                item, val, result, i;

            if ((typeof jsObject !== "object") || !(admNode instanceof ADMNode)) {
                return false;
            }
            try {
                if (jsObject.properties) {
                    properties = jsObject.properties;
                    // Set properties for current ADM node
                    for (item in jsObject.properties) {
                        // Parse properties and set the value to the node
                        val = properties[item];
                        // If we can't get value, we set item's value as default
                        if (val){
                            // NOTE: It's important that we pass "true" for the fourth
                            // parameter here (raw) to disable "property hook"
                            // functions like the grid one that adds or removes child
                            // Block elements based on the property change
                            admNode.setProperty(item, val, null, true);
                        }
                    }
                }
                if (jsObject.children) {
                    // Scan children nodes
                    children = jsObject.children;
                    for (i = 0; i < children.length; i++) {
                        child = children[i];
                        zone = child.zone || "default";
                        childNode = ADM.createNode(child.type, true);

                        // Add child node to current node
                        if (!admNode.addChildToZone(childNode, zone)) {
                            dumplog("add child type "+ child.type + " failed");
                            return false;
                        }
                        result = JSObjectToADMNode(childNode, child);
                        if (!result) {
                            return false;
                        }
                    }
                }
            }catch (e) {
                if (!confirm("Error when " + (i ? " adding new child '" +
                             child.type + "'" : "setting property '" +
                             item + "'") + " - " + e +
                            ".\n\nContinue loading the design?"))
                    return false;
            }
            // Call extra handler for each relative pair
            eachHandler && eachHandler(admNode, jsObject);
            return true;
        };
        /************************ JSObjectToADMNode function end *************************/

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

        // Add children in ADM
        try {
            result = JSObjectToADMNode(design, parsedObject);
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

    /*******************************************************
     * ADM to JSON Direction
     ******************************************************/
    /**
     * Serialize ADMTree to an common javascript Object.
     *
     * @param {ADMNode} ADMTreeNode ADM node to be serialized.
     * @param {function(ADMNode, Object)=} handler Extra handler for each pair of
     *                                             ADM node and the related object.
     * @return {Boolean} return the serialized Object if success, null when fails
     */
    function ADMToJSONObj(ADMTreeNode, handler) {
        ADMTreeNode = ADMTreeNode || ADM.getDesignRoot();
        if (ADMTreeNode instanceof ADMNode) {
            // Save staff in ADMNode
            var JSObject = {},
                children, i, props, zone;
            JSObject.type = ADMTreeNode.getType();
            zone = ADMTreeNode.getZone();
            if (zone !== "default") {
                JSObject.zone = zone;
            }
            props = ADMTreeNode.getExplicitProperties();
            // If there are some explicit properties
            if (typeof props === "object" && Object.keys(props).length > 0) {
                JSObject.properties = props;
            }

            // Recurse to fill children array
            children = ADMTreeNode.getChildren();
            if (children.length > 0) {
                JSObject.children = [];
                for (i = 0; i < children.length; i++) {
                    JSObject.children[i] = ADMToJSONObj(children[i], handler);
                }
            }
            // Run handler to handle every node
            handler && handler(ADMTreeNode, JSObject);
            return JSObject;
        } else {
            console.log("warning: children of ADMNode must be ADMNode");
            return null;
        }
    }

    function getDesignHeaders(design, useSandboxUrl) {
        var i, props, el, designRoot, headers, toCorrectPath;
        designRoot = design || ADM.getDesignRoot();
        headers = [];

        props = designRoot.getProperty('metas');
        toCorrectPath = function (header) {
            var path = header.value;
            // If need to use sandbox url
            if (header.inSandbox) {
                if (useSandboxUrl) {
                    path = toSandboxUrl(path);
                } else {
                    path = path.replace(/^\//, '');
                }
            }
            return path;
        };
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            el = '<meta ';
            if (props[i].hasOwnProperty('key')) {
                el = el + props[i].key;
            }
            if (props[i].hasOwnProperty('value') && props[i].value) {
                // Skip empty or invalid header properties
                if ((typeof props[i].value !== 'string') || (props[i].value.length <= 0)) {
                    continue;
                }
                el = el + '="' + toCorrectPath(props[i]) + '"';
                if (props[i].hasOwnProperty('content')) {
                    el = el + ' content="' + props[i].content + '"';
                }
                el = el + '>';
                headers.push(el);
            }
        }
        props = designRoot.getProperty('libs');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            if (props[i].hasOwnProperty('value') && props[i].value) {
                // Skip empty or invalid header properties
                if ((typeof props[i].value !== 'string') || (props[i].value.length <= 0)) {
                    continue;
                }
                el = '<script ';
                // If need to use sandbox url
                el = el + 'src="' + toCorrectPath(props[i]) + '"';
                el = el + '></script>';
                headers.push(el);
            }
        }
        props = designRoot.getProperty('css');
        for (i in props) {
            // Skip design only header properties
            if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
                continue;
            }
            if (props[i].hasOwnProperty('value') && props[i].value) {
                // Skip empty or invalid header properties
                if ((typeof props[i].value !== 'string') || (props[i].value.length <= 0)) {
                    continue;
                }
                el = '<link ';
                // If need to use sandbox url
                el = el + 'href="' + toCorrectPath(props[i]) + '"';
                el = el + ' rel="stylesheet">';
                headers.push(el);
            }
        }
        return headers;
    }

    // create a notice Dialog for user to configure the browser, so that
    // a native dialog can be shown when exporting design or HTML code
    function createExportDialog() {
        var dialogOpts, exportTypes, exportDialog, cookieExpires,
            exportMenu, cancelDiv, configNotice, checkbox;
        exportTypes = ['zip', 'json', 'wgt'];
        cookieExpires = new Date("January 1, 2042");
        dialogOpts = {
            autoOpen: true,
            modal: true,
            width: 500,
            resizable: false,
            height: 150,
            title: "Export"
        };
        exportDialog = $('<div id="exportDialog" />').addClass("vbox");

        // If user haven't checked "Do not remind again", then show the notice
        if ($.rib.cookieUtils.get("exportNotice") !== "false") {
            // Resize the dialog
            dialogOpts.height *= 2;
            // Add configure notice
            configNotice = $('<div class="flex2" />').appendTo(exportDialog);
            $('<p><b>Note:  </b>File will be saved in the default download path.</p>'
                    + '<div>Please configure the browser to ask for saving location,<br />'
                    + 'for Chrome, go to Settings: <em>chrome://chrome/settings/</em><br />'
                    + 'and check the option to be asked where to save download files.</div>'
                    + '<div><br /><input type="checkbox">&nbsp<a>Do not remind me again<a></div>'
             ).appendTo(configNotice);
            checkbox = configNotice.find('input:checkbox');
            checkbox.change(function () {
                var notice = this.checked ? "false" : "true";
                // set cookie
                if(!$.rib.cookieUtils.set("exportNotice", notice, cookieExpires)) {
                    console.error("Set exportNotice cookie failed.");
                }
            });
            checkbox.next('a').click(function () {
                $(this).prev("input:checkbox").click(); });
        }

        // Add elements about selecting export type
        exportMenu = $('<div align="center" id="export-menu" />');
        cancelDiv = $('<div align="right"/>').append($('<button />').text("Cancel")
            .addClass("buttonStyle")
            .click(function () { exportDialog.dialog('close');}));
        $('<div />').addClass('flex1')
            .append('<div>Export project as:</div>')
            .append(exportMenu)
            .append(cancelDiv)
            .appendTo(exportDialog);
        $.each(exportTypes, function (index, type) {
            $('<button />').attr('id', 'export-' + type)
                .text(type)
                .addClass("buttonStyle")
                .appendTo(exportMenu);
        });

        exportDialog.dialog(dialogOpts);
        return exportDialog;
    }

    function exportFile(fileName, content, binary) {
        $.rib.fsUtils.write('exportFile', content, function (fileEntry){
            var a = document.createElement('a');
            if (a.download !== undefined) {
                a.href = $.rib.fsUtils.pathToUrl(fileEntry.fullPath);
                a.download = fileName;
                a.click();
            } else {
                $.rib.fsUtils.mv(fileEntry.fullPath, fileName, function (newFile){
                    $.rib.fsUtils.exportToTarget(newFile.fullPath);
                });
            }
        }, null, false, binary);
    }

    function getConfigFile(pid, iconPath) {
        var projName, xmlHeader, xmlDoc, widget, childNode;
        projName = $.rib.pmUtils.getProperty(pid, "name") || "Untitled";
        // TODO: Ask user for following config data
        xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
        xmlDoc = $.parseXML('<widget xmlns="http://www.w3.org/ns/widgets" />');
        widget = xmlDoc.getElementsByTagName('widget')[0];
        // add the attr to widget
        widget.setAttribute('xmlns:tizen', 'http://tizen.org/ns/widgets');
        widget.setAttribute('version', '0.1');
        widget.setAttribute('viewmodes', 'fullscreen');
        widget.setAttribute('id', 'http://yourdomain/' + projName);

        // add name to the widget
        childNode = xmlDoc.createElement('name');
        childNode.appendChild(xmlDoc.createTextNode(projName));
        widget.appendChild(childNode);

        // add icon to the widget
        childNode = xmlDoc.createElement('icon');
        childNode.setAttribute('src', iconPath);
        widget.appendChild(childNode);
        return (xmlHeader + xmlserializer.serializeToString(xmlDoc));
    }

    function getNeededFiles() {
        var files = [
            'src/css/images/ajax-loader.png',
            'src/css/images/icons-18-white.png',
            'src/css/images/icons-36-white.png',
            'src/css/images/icons-18-black.png',
            'src/css/images/icons-36-black.png',
            'src/css/images/icon-search-black.png',
        ];

        function getHeaderFiles(type) {
            var headers, files = [];
            headers = ADM.getDesignRoot().getProperty(type);
            for ( var header in headers) {
                // Skip design only header properties
                if (headers[header].hasOwnProperty('designOnly') && headers[header].designOnly) {
                    continue;
                }
                if (!headers[header].value) {
                    continue;
                }
                if (headers[header].inSandbox) {
                    files.push({
                        'src': toSandboxUrl(headers[header].value),
                        'dst': headers[header].value
                    });
                } else {
                    files.push(headers[header].value);
                }
            }
            return files;
        }
        // Add js Files
        $.merge(files, getHeaderFiles("libs"));
        // Add css Files
        $.merge(files, getHeaderFiles("css"));
        return files;
    }

    function createZipAndExport(pid, ribFile, type) {
        var zip, projName, resultHTML, resultConfig, files, i, iconPath;
        zip = new JSZip();
        files = getNeededFiles();
        // Get the project Name
        projName = $.rib.pmUtils.getProperty(pid, "name") || "Untitled";
        // If the type is "wgt" then add config.xml and icon
        if (type === 'wgt') {
            // TODO: get icon from pInfo
            iconPath = 'src/assets/rib-48.png';
            resultConfig = getConfigFile(pid, iconPath);
            resultConfig && zip.add("config.xml", resultConfig);
            files.push(iconPath);
        }
        ribFile && zip.add(projName + ".json", ribFile);
        // Generate html and don't use sandbox url
        resultHTML = generateHTML(null, false, function (admNode, domNode) {
            var matched, p;
            matched = admNode.getMatchingProperties($.rib.pmUtils.relativeFilter);
            // Add uploaded images to the needed list
            for (p in matched) {
                files.push({
                    "src": toSandboxUrl(matched[p]),
                    "dst": matched[p]
                });
            }
        });
        resultHTML && zip.add("index.html", resultHTML.html);
        // projName now is the whole package name
        projName = projName + '.' + type;

        i = 0;
        files.forEach(function (file, index) {
            var req, srcPath, dstPath;
            // We have to do ajax request not using jquery as we can't get "arraybuffer" response from jquery
            var req = window.ActiveXObject ? new window.ActiveXObject( "Microsoft.XMLHTTP" ): new XMLHttpRequest();
            req = window.ActiveXObject ? new window.ActiveXObject( "Microsoft.XMLHTTP" ): new XMLHttpRequest();
            if ((typeof file === "object") && file.dst && file.src) {
                srcPath = file.src;
                dstPath = file.dst;
            } else if (typeof file === "string") {
                srcPath = file;
                dstPath = file;
            } else {
                console.error("Invalid path for exported zipfile.");
                return;
            }
            req.onload = function () {
                var uIntArray = new Uint8Array(this.response);
                var charArray = new Array(uIntArray.length);
                for (var j = 0; j < uIntArray.length; j ++) {
                    charArray[j] = String.fromCharCode(uIntArray[j]);
                }
                zip.add(dstPath, btoa(charArray.join('')), {base64:true});
                if (i === files.length - 1){
                    var content = zip.generate(true);
                    exportFile(projName, content, true);
                }
                i++;
            }
            try {
                req.open("GET", srcPath, true);
                req.responseType = 'arraybuffer';
            } catch (e) {
                alert(e);
            }
            req.send(null);
        });
    }

    function exportPackage(ribFile) {
        var exportDialog, pid;
        pid = pid || $.rib.pmUtils.getActive();

        exportDialog = createExportDialog();
        exportDialog.find("button#export-json").click(function () {
            // Get the project Name
            var projName = $.rib.pmUtils.getProperty(pid, "name") || "Untitled";
            projName = projName + '.json';
            exportFile(projName, ribFile);
            exportDialog.dialog('close');
        });
        exportDialog.find("button#export-wgt").click(function () {
            createZipAndExport(pid, ribFile, 'wgt');
            exportDialog.dialog('close');
        });
        exportDialog.find("button#export-zip").click(function () {
            createZipAndExport(pid, ribFile, 'zip');
            exportDialog.dialog('close');
        });
        return;
    }

    function toSandboxUrl(path, pid) {
        var projectDir, fullPath;
        pid = pid || $.rib.pmUtils.getActive();
        projectDir = $.rib.pmUtils.getProjectDir(pid);
        if (typeof path !== "string") {
            console.error("Invalid path in toSandboxUrl: " + path);
            return null;
        }
        fullPath = path;
        // If the first char is '/', then it will be the absolute path in sandbox
        if (path[0] !== '/' && projectDir) {
            fullPath = projectDir + path;
        }
        return $.rib.fsUtils.pathToUrl(fullPath);
    }

    function indexOfArray(array, value) {
        var i, index = -1;
        if (typeof value !== 'object') {
            return $.inArray(array, value);
        } else {
            for (i = 0; i < array.length; i++) {
                if (JSON.stringify(array[i]) === JSON.stringify(value)) {
                    index = i;
                }
            }
            return index;
        }
    }

    /**
     * Check if the sandbox file is a design header, such as css, js file.
     *
     * @param {String} type Type of the specified header.
     * @param {String} filePath Sandbox path of header file.
     *
     * @return {Boolean} Return true if find the file in header list, else false.
     * Notes: filePath If the file is in project directory, relative path should
     *        be used. A path beginning with '/' will be considered as absolut
     *        path in sandbox.
     */
    function isSandboxHeader(type, filePath) {
        var property, array, design, index;

        if (!(type && filePath && (filePath.length > 0))) {
            dumplog('Error: Invalid parameter(s) in isSandboxHeader.');
            return false;
        }
        property = headerPropertyMap[type];
        if (!property) {
            dumplog('Error: No header:' + type + 'in design.');
            return false;
        }
        design = ADM.getDesignRoot();
        array = $.merge([], design.getProperty(property));
        index = indexOfArray(array, {
                           inSandbox: true,
                           value: filePath
                       });
        if (index > -1) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Add sandbox header file in current design, such as css, js file.
     *
     * @param {String} type Type of the specified header.
     * @param {String} filePath Sandbox path of header file.
     *
     * @return {Boolean} Return true if added the header, else return false.
     *
     * Notes: filePath If the file is in project directory, relative path should
     *        be used. A path beginning with '/' will be considered as absolut
     *        path in sandbox.
     */
    function addSandboxHeader(type, filePath) {
        var property, array, design, index;

        if (!(type && filePath && (filePath.length > 0))) {
            dumplog('Error: Invalid parameter(s) in addSandboxHeader.');
            return false;
        }
        property = headerPropertyMap[type];
        if (!property) {
            dumplog('Error: No header:' + type + 'in design.');
            return false;
        }
        design = ADM.getDesignRoot();
        array = $.merge([], design.getProperty(property));
        index = indexOfArray(array, {
                           inSandbox: true,
                           value: filePath
                       });
        if (index === -1) {
            array.push({
                inSandbox: true,
                value: filePath
            });
            // set the new array back
            design.setProperty(property, array);
        } else {
            dumplog('warning:"' + filePath +'" is already in ' + type + ' list.');
        }
        return true;
    }

    /**
     * Remove sandbox header file in current design, such as css, js file.
     *
     * @param {String} type Type of the specified header.
     * @param {String} filePath Sandbox path of header file.
     *
     * @return {Boolean} Return true if deleted the header, else return false.
     *
     * Notes: filePath If the file is in project directory, relative path should
     *        be used. A path beginning with '/' will be considered as absolut
     *        path in sandbox.
     */
    function removeSandboxHeader(type, filePath) {
        var property, array, design, index;

        if (!(type && filePath && (filePath.length > 0))) {
            dumplog('Error: Invalid parameter(s) in removeSandboxHeader.');
            return false;
        }
        property = headerPropertyMap[type];
        if (!property) {
            dumplog('Error: No header:' + type + 'in design.');
            return false;
        }
        design = ADM.getDesignRoot();
        array = $.merge([], design.getProperty(property));
        index = indexOfArray(array, {
                           inSandbox: true,
                           value: filePath
                       });
        if (index > -1) {
            array.splice(index, 1);
            // set the new array back
            design.setProperty(property, array);
        } else {
            dumplog('warning: not find:"' + filePath +'" in ' + type + ' list.');
        }
        return true;
    }

    /**
     * set theme for given design.
     *
     * @param {ADMNode} design The root design object.
     * @param {String}  newTheme File path of newTheme.
     * @param {Boolean} newInSandbox Use sandbox url or not
     *
     * @return {Boolean} Return true if update theme successfully, else return false.
     */
    function setDesignTheme(design, newTheme, newInSandbox) {
        var property, array, i, index,
            swatches, themePath, themeName,
            newThemeObject = {
                designOnly: false,
                value: newTheme,
                theme: true,
                inSandbox: newInSandbox
            };
        // set theme of ADM node
        var setNodeTheme = function (admNode, swatches) {
            var i, type, children;
            if (admNode instanceof ADMNode) {
                type = admNode.getType();
                // firstly we get theme property of node. If original swatch
                // of theme can be found from current theme, we do nothing.
                // Otherwise, we set property value as default
                if (BWidget.propertyExists(type, 'theme') &&
                    jQuery.inArray(admNode.getProperty('theme'), swatches) < 0) {
                    admNode.setProperty('theme', 'default');
                }
                children = admNode.getChildren();
                if (children.length > 0) {
                    for (i = 0; i < children.length; i++) {
                        setNodeTheme(children[i], swatches);
                    }
                }
            } else {
                console.warn("warning: children of ADMNode must be ADMNode");
            }
        };

        array = $.merge([], design.getProperty('css'));
        // find theme from design property of 'css'
        for (i = 0; i < array.length; i++) {
            if (array[i].hasOwnProperty('theme')) {
                index = i;
                break;
            }
        }
        if (i === array.length) {
            // theme is not found in design
            console.error("no theme found for given design");
            return false;
        }

        // update theme object in array
        array.splice(index, 1, newThemeObject);
        // update theme for all widgets in given design
        design.suppressEvents(true);
        themePath = newTheme.replace(/^\//, "").split("/");
        themeName = themePath.splice(themePath.length - 1, 1).toString();
        themeName = themeName.replace(/(\.min.css|\.css)$/g, "");
        // check whether set "Default" theme
        // TODO: provide a function to getDefaultTheme in case of
        // JQuery Mobile upgrading
        if (newTheme === 'src/css/jquery.mobile.theme-1.1.0.css') {
            swatches = ["default", "a", "b", "c", "d", "e"];
        } else {
            swatches = $.rib.pmUtils.themesList[themeName];
        }
        setNodeTheme(design, swatches);
        design.suppressEvents(false);
        //set the new array back
        design.setProperty('css', array);
        return true;
    }

    /**
     * Add custom file to current active project.
     * It will save the content in project folder. If the parent directy of
     * filePath doesn't exist, it will be created.
     *
     * @param {String} filePath Path to save the file. If the first of the path
     *                 is "/", it will be taken as absolute path, else it will
     *                 be considered as relative to project folder,
     * @param {String} type Type of the custom file.
     * @param {string/File/Blob} contents Content Data of custom file.
     *
     * @return {None}
     */
    function addCustomFile(filePath, type, contents, success, error) {
        var destPath, addToDesign, projectDir;
        projectDir = $.rib.pmUtils.getProjectDir();
        // If it is relative path, then add the project folder path
        if (filePath[0] !== '/' && projectDir) {
            destPath = projectDir + filePath;
        } else {
            destPath = filePath;
        }
        // Write contents to sandbox
        $.rib.fsUtils.write(destPath, contents, function (newFile) {
            addSandboxHeader(type, filePath);
            success && success(newFile);
        }, error);
    }

    /**
     * Save event handler codes to main.js
     *
     * @param {ADMNode} design ADM design root to be serialized.
     *
     * @return {None} as same as addCustomFile.
     */
    function saveEventHandlers(design) {
        var results, id, matchedProps, eventCode, eventName,
            design = design || ADM.getDesignRoot(),
            jsFileName = 'js/main.js', jsType = 'js',
            jsHeader = '$(document).ready(function(e) {\n',
            jsContent = '',
            jsFooter = '});';

        // Regenerate the whole event javascript codes
        // and save to sandbox.
        results = design.findNodesByProperty(
            {'type': 'event', 'value': new RegExp('.+')}
        );
        $.each(results, function(index, result) {
            id = result.node.getProperty('id');
            if (!id)
                return
            matchedProps = result.properties;
            for (eventName in matchedProps) {
                // Append the event code to the whole js code content.
                jsContent += '$("#' + id + '").bind("' + eventName + '", function(e) {'
                    + '\n' + matchedProps[eventName] + '\n'
                    + '});\n\n';
            }
        });
        if (!jsContent) {
            removeSandboxHeader(jsType, jsFileName);
            $.rib.fsUtils.rm(jsFileName);
            return null;
        }
        return addCustomFile(
            jsFileName, jsType, js_beautify(jsHeader + jsContent + jsFooter)
        );
    }

    /***************** export functions out *********************/
    // Export serialization functions into $.rib namespace
    $.rib.generateHTML = generateHTML;
    $.rib.serializeADMSubtreeToDOM = serializeADMSubtreeToDOM;
    $.rib.ADMToJSONObj = ADMToJSONObj;
    $.rib.JSONToProj = JSONToProj;
    $.rib.getDesignHeaders = getDesignHeaders;
    $.rib.exportPackage = exportPackage;
    $.rib.isSandboxHeader = isSandboxHeader;
    $.rib.addSandboxHeader = addSandboxHeader;
    $.rib.removeSandboxHeader = removeSandboxHeader;
    $.rib.addCustomFile = addCustomFile;
    $.rib.saveEventHandlers = saveEventHandlers;
    $.rib.setDesignTheme = setDesignTheme;
    $.rib.toSandboxUrl = toSandboxUrl;
});
