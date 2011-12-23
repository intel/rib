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
var DEBUG = true;

function dumplog(loginfo){
    if (DEBUG && (typeof loginfo === "string")){
        console.log(loginfo);
    }
    return;
}


$(function() {
    var $toolbarPanel = $('#toolbar-panel');

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
            fsUtils.cpLocalFile(e.currentTarget.files[0],
                                fsDefaults.files.ADMDesign,
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
        dialogStr += '<label>Notice:<br />Files will be saved in the default download path of Browser.<br />';
        dialogStr += '<br />Configure to ask download path every time:';
        dialogStr += '<br />Preferences -> Under the Hood -> Download<br />';
        dialogStr += '<br />Then check the checkbox "Ask where to save each file before downloading"</label><br />';
        dialogStr += '<br /><br /><input type="checkbox" />Do not remind me any more.<br />';
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
            if(!cookieUtils.set("exportNotice", notice)) {
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
                child =  ADM.createNode(childType);
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
        result = add_child(design, obj.children);

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
            fsUtils.read(fileEntry.fullPath, function(result) {
                try {
                    parsedObject = $.parseJSON(result);
                    return loadFromJsonObj(parsedObject);
                } catch(e) {
                    alert("Invalid design file.");
                    return false;
                }
            }, _onError);
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
        var path = outPath || fsDefaults.files.ADMDesign,
            root = ADMTreeNode || ADM.getDesignRoot(),
            JSObjectForADM = JSObjectFromADMTree(root),
            text;

        // Following is for the serializing part
        if (typeof JSObjectForADM === "object") {
            text = JSON.stringify(JSObjectForADM);

            fsUtils.write(path, text, function(fileEntry) {
                fsUtils.exportToBlank(fileEntry.fullPath, "Design");
            }, _onError);
            return true;
        } else {
            console.log("error: invalid serialized Object for ADM tree");
            return false;
        }
    }
    /********************* Functions definition End **************************/

    // init the sandbox file system
    fsUtils.initFS(fsDefaults.type, fsDefaults.size);

    // if can't get the cookie(no this record), then add exportNotice cookie
    if (!cookieUtils.get("exportNotice")) {
        if(!cookieUtils.set("exportNotice", "true")) {
            console.error("Set exportNotice cookie failed.");
        }
    }

    // create a notice Dialog for user to configure the browser,
    // so that a native dialog can be shown when exporting design or HTML code
    createExportNoticeDialog();

    // bind handlers for sub-menu
    $toolbarPanel.find('#loadDesign').click(triggerImportFileSelection);
    $toolbarPanel.find('#exportDesign').click(triggerExportDesign);

    // Import file selection change handler //
    $('#importFile').change(importFileChangedCallback);

});
