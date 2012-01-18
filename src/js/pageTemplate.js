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

/**
 * Creates an new page according to page template.
 *
 * @param {ADMNode} design add page node as its child
 * @param {String} pageTemplate The page type currently is JQM or blank page.
 * @return {ADMNode} The page node, or null if the page type was invalid.
 */
function createNewPage(design, pageTemplate) {
    var newPage, child, that, i, types, type;
    if (!design.instanceOf("Design")) {
        console.log("Warning: only design node can add new page");
        return null;
    }

    switch (pageTemplate) {
        case "JQM":
            newPage = addNode(design, 'Page');
            if (!newPage) {
                return null;
            }
            types = ['Header', 'Content', 'Footer'];
            for (i in types) {
                that = addNode(newPage, types[i]);
                if (!that) {
                    return null;
                }
            }
            break;
        case "blank":
            newPage = addNode(design,'Page');
            if (!newPage) {
                return null;
            }
            that = addNode(newPage,'Content');
            break;
        case "last":
            if (design.getChildrenCount() !== 1) {
                console.log("Warning: this isn't the last page");
                return null;
            }
            newPage = addNode(design,'Page');
            if (!newPage) {
                return null;
            }
            //get the last page
            child = design.getChildren()[0];
            for (i in child.getChildren()) {
                 type = child.getChildren()[i].getType();
                 that = addNode(newPage,type);
            }
            break;
        default:
            console.log("Warning: invalid page type while creating new page: " + pageTemplate);
	    //return a blank page as default
	    newPage = addNode(design,'Page');
	    if (!newPage) {
		return null;
	    }
	    that = addNode(newPage,'Content');
	    break;
    }
    return newPage;

    /**
     * Adds given child object to parent
     *
     * @param {ADMNode} parent The parent object to be added.
     * @param {String} child widget type
     * @return {ADMNode} The node, or null if add failed.
     */
    function addNode(parent, type) {
        design.suppressEvents(true);
        var child = ADM.createNode(type);
        if (!child) {
            design.suppressEvents(false);
            return null;
        }
        parent.addChild(child, false);
        design.suppressEvents(false);
        return child;
    }
}
