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

function loadOutline(container) {
    var defaultContainer = '#outline-panel',
        myContainer = container,contents;
    if (!myContainer) {
        myContainer = $(defaultContainer);
    }
    if (!myContainer || !myContainer.get()) {
        return false;
    }

    myContainer.append('<p id="outline_header" class="ui-helper-reset ui-widget ui-widget-header">Outline</p>')
               .addClass('ui-widget-content');
    contents = $('<div id="outline_content"></div>')
        .appendTo(myContainer);

    renderOutlineView();
    // ---------------------------------------------- //
    // Now, bind to the ADM modelUpdate to handle all //
    // additional changes                             //
    // ---------------------------------------------- //
    var $admDesign = ADM.getDesignRoot();
    $admDesign.bind("modelUpdated", admModelUpdatedCallback);
    ADM.bind("designReset", admDesignResetCallback);
    ADM.bind("selectionChanged", admSelectionChangedCallback);
    ADM.bind("activePageChanged",admActivePageChangedCallback);

    //internal event handler
    function admSelectionChangedCallback(event) {
        var node, rootNode, nodeInOutline, currentNode;
        // Make sure we show the page as selected if no node is selected
        if (event === null || event.node === null) {
            node = ADM.getDesignRoot().findNodeByUid(ADM.getSelected());
            if (node === null || node === undefined) {
                node = ADM.getActivePage();
                if (node === null || node === undefined) {
                    return false;
                }
            }
        } else {
            node = event.node;
        }

        //deative state of selected before
        $('#outline-panel').find('.ui-state-active')
            .removeClass('ui-state-active');
        $('#outline-panel').find('.ui-selected')
            .removeClass('ui-selected');

        //find this node in outline pane
        rootNode = $("#pageList");
        nodeInOutline = $(rootNode).find("#Outline-"+node.getUid()+" > a");
        $(nodeInOutline).addClass('ui-state-active')
            .addClass('ui-selected');

        currentNode = nodeInOutline;
        while (currentNode.length && currentNode.html() !== rootNode.html())  {
            $(currentNode).show();
            currentNode = currentNode.parent();
        }
    }

    function admActivePageChangedCallback(event) {
        renderOutlineView();
    }

    function admModelUpdatedCallback(event) {
        renderOutlineView();
    }

    function admDesignResetCallback(event) {
        dumplog("admDesignResetCallback");
        var $admDesign = ADM.getDesignRoot();
        $admDesign.bind("modelUpdated", admModelUpdatedCallback);
        renderOutlineView();
    }

    function renderOutlineView() {
        var page, selected,
            $tree = $("#outline_content");

        function  setSelected(item) {
            var UID = $(item).attr('adm-uid');
            dumplog("Outline.js: setSelected is called. UID is " + UID);

            // find whether selected widget in current active page
            var currentNode = ADM.getDesignRoot().findNodeByUid(UID);
            while (currentNode.getType() !== "Page" && currentNode.getType() !=="Design") {
                currentNode = currentNode.getParent();
            }
            if (currentNode.getType() !== "Page") {
                dumplog("error: can't find select node's Page");
                return;
            }
            if (ADM.getActivePage() !== currentNode) {
                ADM.setActivePage(currentNode);
            }

            window.ADM.setSelected(UID);
        }

        function render_sub(node, $container) {
            var newItem, children, i, type, UID, isShowInOutline, widgetID,
                label, id, $subContainer;

            if (!(node instanceof ADMNode)) {
                return;
            }

            type = node.getType();
            UID = node.getUid();
            isShowInOutline = node.isSelectable();
            widgetID = type + '-' + UID;
            label = BWidget.getDisplayLabel(type);
            $subContainer = $container;

            // check current node whether can ben shown in outline pane
            if (isShowInOutline) {
                newItem = $('<li><a>' + label + '</a></li>')
                    .attr('id', 'Outline-' + UID)
                    .appendTo($container);

                if (node.getChildrenCount() > 0) {
                    newItem.addClass('folder')
                        .append('<ul id="' + widgetID + '"></ul>');
                }

                if (type === "Page") {
                    //set page id
                    id = node.getProperty('id');
                    newItem.find("a").text(label + ' (id: ' + id + ')');

                    if ((node.getChildrenCount() == 1) &&
                        (node.getChildren()[0].getType() === "Content") &&
                        (node.getChildren()[0].getChildrenCount() === 0)) {
                             dumplog("only content in page");
                            newItem.toggleClass('folder')
                                   .remove('ul');
                    }
                }

                newItem.attr('adm-uid',UID);

                // add click handler
                newItem.click(function(e) {
                    $(this).toggleClass("close")
                    .children("ul").toggle();
                e.stopPropagation();
                });

                newItem.find("a").click(function(e) {
                    var that =$(this).parent();
                    setSelected(that);
                    e.stopPropagation();
                    return false;  // Stop event bubbling
                });

                if (node.getChildrenCount() > 0) {
                    $subContainer = $container.find("#" + widgetID);
                }
            }

            if (node.getChildrenCount() > 0) {
                children = node.getChildren();
                for (i = 0; i < children.length; i++) {
                    render_sub(children[i], $subContainer);
                }
            }
            return;
        }

        $tree.empty();
        $('<ul id="pageList"></ul>').appendTo($tree);
        for ( var i = 0; i < ADM.getDesignRoot().getChildrenCount(); i++) {
            page = ADM.getDesignRoot().getChildren()[i];
            render_sub(page, $("#pageList"));
        }

        // Now make sure the selected node is properly identified
        selected = ADM.getDesignRoot().findNodeByUid(ADM.getSelected()) ||
            ADM.getActivePage();
        if (selected) {
            $tree.find("#Outline-"+selected.getUid()+" > a")
                .addClass('ui-state-active')
                .addClass('ui-selected');
        }
        return true;
    }
}
