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
}

function admSelectionChangedCallback(event) {
    var node = event.node;
    if (node === null) {
        return false;
    }

    dumplog(node.getUid() + " is selected");
    //deative state of selected before
    $('#outline-panel').find('.ui-state-active')
                       .removeClass('ui-state-active');
    $('#outline-panel').find('.ui-selected')
                       .removeClass('ui-selected');

    //find this node in outline pane
    var rootNode = $("#pageList");
    var nodeInOutline = $(rootNode).find("#Outline-"+node.getUid());
    $(nodeInOutline).addClass('ui-state-active')
        .addClass('ui-selected');

    var currentNode = nodeInOutline;
    while (currentNode && currentNode.html() !== rootNode.html())  {
        $(currentNode).show();
        currentNode = currentNode.parent();
    }
}

function admActivePageChangedCallback(event) {
    dumplog("in outline.js: activePageChangedCallback");
    var activePage = event.page;
    renderOutlineView();
}

function admModelUpdatedCallback(event) {
    dumplog("admModelUpdatedCallback");
    renderOutlineView();
}

function admDesignResetCallback(event) {
    dumplog("admDesignResetCallback");
    renderOutlineView();
}

function renderOutlineView() {
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
        var folderId, newItem, children, i;
        if (!(node instanceof ADMNode)) {
            return;
        }
        var type = node.getType();
        var UID = node.getUid();
        var isShowInOutline = node.isSelectable();
        var widgetID = type + '-' + UID;
        var label = BWidget.getDisplayLabel(type);
        // check current node whether can ben shown in outline pane
        if (isShowInOutline) {
            if (node.getChildrenCount() > 0) {
                newItem = $('<li class="folder open" id="Outline-' + UID + '"><a>'
                        + label + '</a><ul id="'
                        + widgetID + '"></ul></li>');

            } else {
                newItem = $('<li class="file" id="Outline-' + UID + '"><a>' + label + '</a></li>');
            }

            $container.append($(newItem));
            if (type === "Page")
            {
                //set page id
                var id_value = node.getProperty("id");
                $(newItem).find("a").html($(newItem).find("a").html() + ' (id: ' + id_value + ')');

                if ((node.getChildrenCount() == 1) && (node.getChildren()[0].getType() === "Content")
                    && (node.getChildren()[0].getChildrenCount() === 0)) {
                    dumplog("only content in page");
                    $(newItem).replaceWith('<li class="file" id="Outline-' + UID + '"><a>' + label + ' (id: ' + id_value + ')</a></li>');
                }
            }

            $(newItem).attr('adm-uid',UID);
            // add click handler
            $(newItem).click(function(e) {
                $(this).toggleClass("close")
                .toggleClass("open");
            $(this).children("ul").toggle();
            e.stopPropagation();
            });

            $(newItem).find("a").click(function(e) {
                var that =$(this).parent();
                setSelected(that);
                e.stopPropagation();
                return false;  // Stop event bubbling
            });

            if (node.getChildrenCount() > 0) {
                var $subContainer = $container.find("#" + widgetID);
                children = node.getChildren();
                for (i = 0; i < children.length; i++) {
                    render_sub(children[i], $subContainer);
                }
            }
        } else {
            if (node.getChildrenCount() > 0) {
                children = node.getChildren();
                for (i = 0; i < children.length; i++) {
                    render_sub(children[i], $container);
                }
            }
        }
        return;
    }

    var page, i;
    var $tree = $("#outline_content");

    $tree.empty();
    $('<ul id="pageList"></ul>').appendTo($tree);
    for ( var i = 0; i < ADM.getDesignRoot().getChildrenCount(); i++) {
        page = ADM.getDesignRoot().getChildren()[i];
        render_sub(page, $("#pageList"));
    }
    return true;
}
