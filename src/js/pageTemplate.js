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

/**
 * Global object to access ADM page utils.
 *
 */
$(function() {
    var pageUtils = {
        options :{
            design: null,
            pageTemplate: "Blank Page",
            layout: ['Content'],
            isDialog: false
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
                layout = this.options.layout.concat(config.layout),
                isDialog = config.isDialog || this.options.isDialog,
                newPage, result;

            if (!design.instanceOf("Design")) {
                console.error("Error: wrong design root passed in");
                return null;
            }

            ADM.startTransaction();
            // create New ADM page node
            newPage = new ADMNode("Page");
            if (!newPage) {
                return null;
            }
            ADM.addChild(design, newPage);

            // set dialog property of page
            result = ADM.setProperty(newPage, 'dialog', isDialog);
            if (!result.result) {
                return null;
            }

            // create initial page layout
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
            ADM.endTransaction();
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
             * create  new page's child according to layout
             * @param {ADMNode} pageNode new page node.
             * @param {Array} layout which contains types of child type
             *                       we want create
             * @return {Boolean} true if nodes have been created successfully,
             *                   otherwise return false
             */
            function setPageLayout(pageNode, layout) {
                var t, that;
                for (t in layout ){
                    design.suppressEvents(true);
                    that = addNode(pageNode, layout[t]);
                    design.suppressEvents(false);
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
        },

        /*
         * Delete page
         * @param {Interger} pageUid UID of delete Page
         * return {Boolean} true if nodes have been delete successfully,
         *                  otherwise return false
         */
        deletePage: function(pageUid) {
            try {
                //if current page is the last page, we will create a new page which
                //has the same template as current one
                var newPage, options = {}, admDesign = ADM.getDesignRoot();

                if (admDesign.getChildren().length === 1) {
                    options.layout = this.getActivePageLayout();
                }

                // delete current page node from design
                ADM.startTransaction();
                ADM.removeChild(pageUid);
                if (admDesign.getChildren().length === 0) {
                    newPage = this.createNewPage(options);
                    if (!newPage) {
                        console.error("error: create new page failed");
                        return false;
                    }
                    ADM.setActivePage(newPage);
                }
                ADM.endTransaction();
                return true;
            }
            catch (err) {
                console.error(err.message);
                return false;
            }
        }
    };

    /*******************  export pageUtils to $.rib **********************/
    $.rib = $.rib || {};
    $.rib.pageUtils = pageUtils;
});
