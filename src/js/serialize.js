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


// init the sandbox file system
fsUtils.initFS(fsDefaults.type, fsDefaults.size);

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
        if (typeof(nodes) !== "object"){
           return false;
        }

        if (typeof(nodes.length) == "undefined") {
            return false;
        }

        var child, childType, zone;
        var properties = {};
        var item, val;
        var node, result;

        for (var i = 0; i < nodes.length; i++){
            node=nodes[i];
            childType = node.type;
            zone = node.zone;
            properties=node.properties;
            child =  ADM.createNode(childType);
            //set properties of child
            for ( item in properties)
            {
                //parser the properties and set the value to the node
                val=properties[item];
                //if we can't get value, we set item's value as default
                if (val === null){
                    val = child.getPropertyDefault(item);
                }
               child.setProperty(item, properties[item]);
            }
            // add child node to current node
            if (!parent.addChildToZone(child, zone)){
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

    if ( obj === null || obj.type !== "Design")
    {
        console.log("obj is null or is not a 'Design' Node in loadFromJSONObj");
        return false;
    }

    var design = new ADMNode("Design");

    // add children in ADM
    add_child(design, obj.children);

    //Fixed me: every view should travle adm tree and bind listenner to the event.
    //not only the adm object but also every admnode
    ADM.setDesignRoot(design);
    return true;
}


/*
 * This function is loads a JSON template and creates a new ADM tree
*/
function buildDesignFromJson(fileEntry) {
    // Set a fixed JSON file
    // TODO: This will be changed to let the user to seclect the path

    fileEntry.file(function(file) {
        var reader = new FileReader();

        reader.onloadend = function(e) {
            var parsedObject = $.parseJSON(e.target.result);
            loadFromJsonObj(parsedObject);
        };
        reader.onError = _onError;

        reader.readAsText(file); // Read the file as plaintext.

    }, _onError);
}

/*******************************************************
 * ADM to JSON Direction
 ******************************************************/
function JSObjectFromADMTree(ADMTreeNode){
    if (ADMTreeNode instanceof ADMNode){
        // Save staff in ADMNode
        var JSObject = {};
        JSObject.type = ADMTreeNode.getType();
        JSObject.zone = ADMTreeNode.getZone();
        JSObject.properties = ADMTreeNode.getProperties();
        JSObject.children = [];

        // Recurse to fill children array
        var children = ADMTreeNode.getChildren();
        if (children.length > 0){
            for (var i = 0; i < children.length; i++) {
                JSObject.children[i] = JSObjectFromADMTree(children[i]);
            }
        }
        return JSObject;
    }
    else {
        console.log("warning: children of ADMNode must be ADMNode");
        return null;
    }
}

function exportFile(fileUrl, listName){
    var listId = "export" + listName;
    if($('#' + listId).length === 0){
        var listString = "<li><a href=" + fileUrl + " id=" + listId + ">" + listName + "target='_blank'</a></li>";
        $(listString).appendTo("ul#exportFiles");
    }else{
        $('#' + listId)[0].href = fileUrl;
        $('#' + listId)[0].target = "_blank";
        console.log("ID: " + listId + " is already exist." );
    }
    return true;
}

function serializeADMToJSON(ADMTreeNode, outPath){
    // Set a fixed position to  the output file
    var path = outPath || fsDefaults.files.ADMDesign;
    var root = ADMTreeNode || ADM.getDesignRoot();

    // Following is for the serializing part
    var JSObjectForADM = JSObjectFromADMTree(root);
    if (typeof JSObjectForADM === "object"){
        var text = JSON.stringify(JSObjectForADM);

        fsUtils.write(path, text, function(fileEntry){
            exportFile(fileEntry.toURL(), "Design");
        }, _onError);
        return true;
    }
    else{
        console.log("error: invalid serialized Object for ADM tree");
        return false;
    }
}
