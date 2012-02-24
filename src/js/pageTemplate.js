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
        options :{
            design: null,
            pageTemplate: "Blank Page",
            pageTitle: "Default",
            layout: ['Content']
        },
        /**
         * Creates an new page according to page configure.
         *
         * @param {Object} config The page configure to create new page.
         * @return {ADMNode} The page node, or null if the page type was invalid.
         */
        createNewPage: function(config) {
            var design = config.design || ADM.getDesignRoot(),
                pageTemplate = config.pageTemplate || this.options[pageTemplate],
                pageTitle = config.pageTitle || this.options[pageTitle],
                layout = this.options.layout.concat(config.layout),
                newPage, result;

            if (!design.instanceOf("Design")) {
                console.error("Error: wrong design root passed in");
                return null;
            }

            // create New ADM page node
            newPage = creatPageNode();
            if (!newPage) {
                return null;
            }

            //set page layout
            result = setPageLayout(newPage, layout);
            //TODO: if we have some specfic logic to handle with template,
            //      use below code
            /*
            if (result) {
                switch (pageTemplate) {
                    case "JQuery Mobile Page":
                        // TODO handle specific with JQM
                        break;
                    case "Recent Used Page":
                        // TODO handle specific with Recent Used Page
                        break;
                    default:
                        break;
                }
            }
            */
            return result? newPage: null;

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

            /*
             * Create a page node and set it's id property
             * @return {ADMNode} page node or null if add failed.
             */
            function creatPageNode() {
                var pageNode = addNode(design, 'Page');
                if (!pageNode) {
                    return null;
                }
                // set page title
                pageNode.setProperty("id", pageTitle);
                return pageNode;
            }

            /*
             * create  new page's child according to layout
             * @param {ADMNode} pageNode new page node.
             * @param {Array} layout which contains types of child type
             *                       we want create
             * @return {Boolean} true if nodes have been created successfully,
             *                   otherwise return false
             */
            function setPageLayout(pageNode, layout) {
                var t,that;
                for (t in layout ){
                     that = addNode(pageNode, layout[t]);
                     if (that === null) {
                         return false;
                     }
                }
                return true;
            }
        },

        /*
         * Get active page's layout
         * @return {Array} The array, which contais the page's child node type.
         */
        getActivePageLayout: function() {
            var i, children, types = [], type,
                pageNode = ADM.getActivePage();

            children = pageNode.getChildren();
            for (i in children) {
                type = children[i].getType();
                if (type !== 'Content') {
                    types.push(type);
                }
            }
            return types;
        }
    };

    /*******************  export pageUtils to $.gb **********************/
    $.gb = $.gb || {};
    $.gb.pageUtils = pageUtils;
});
