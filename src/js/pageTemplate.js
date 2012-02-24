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
 * Global object to access ADM page utils.
 *
 */
$(function() {
    var pageUtils = {
        /**
         * Creates an new page according to page configure.
         *
         * @param {Object} config The page configure to create new page.
         * @return {ADMNode} The page node, or null if the page type was invalid.
         */
        createNewPage: function(config) {
            var design = config.design || ADM.getDesignRoot(),
                pageTemplate = config.pageTemplate || "Blank Page",
                pageTitle = config.pageTemplate || "Default",
                layout = config.layout || {Header: true, Footer: true},
                newPage, child, that, i, types, type;
            if (!design.instanceOf("Design")) {
                console.error("Error: wrong design root passed in");
                return null;
            }

            switch (pageTemplate) {
                case "JQuery Mobile Page":
                    // create New ADM page node
                    newPage = addNode(design, 'Page');
                    if (!newPage) {
                        return null;
                    }
                    // set page title
                    newPage.setProperty("id", pageTitle);
                    //set page layout
                    for (i in layout) {
                        if (layout[p]) {
                            types.push(p);
                        }
                    }
                    types.push('Content');
                    for (i in types) {
                        that = addNode(newPage, types[i]);
                        if (!that) {
                            return null;
                        }
                    }
                    break;
                case "Recent Used Page":
                    if (design.getChildrenCount() !== 1) {
                        console.log("Warning: this isn't the last page");
                        return null;
                    }
                    newPage = addNode(design,'Page');
                    if (!newPage) {
                        return null;
                    }
                    newPage.setProperty("id", pageTitle);
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
                    newPage.setProperty("id", pageTitle);
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
        };
    };

    /*******************  export pageUtils to $.gb **********************/
    $.gb = $.gb || {};
    $.gb.pageUtils = pageUtils;
});
