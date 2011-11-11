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
// ----------------------------- //
// Global Event handling control //
// ----------------------------- //
var blockModelUpdated = false,
    blockChildAdded = false,
    blockChildRemoved = false,
    blockActivePageChanged = false;

var SHOW_IDS = true,
    logHist = [];

function logit(msg) {
    var entry = $.now()+": "+msg;
    var i = logHist.push(entry);
    if (typeof console !== "undefined") { console.log(logHist[i-1]); }
}

function reparentADMNode(node, parent, zone, index) {
    var child = null,
        curParent = node.getParent(),
        curZone = node.getZone();

    // FIXME: need to return something so that drag can be
    //        reverted in the design view
    if (!parent || !curParent) {
        return;
    }

    // Preventing event handling during removal
    blockModelUpdated = true;

    // 1. Remove child
    child = curParent.removeChild(node);

    // FIXME: need to return something so that drag can be
    //        reverted in the design view
    if (!child) {
        return;
    }

    // Re-enable event handling
    blockModelUpdated = false;

    // 2. Insert child at new position
    if (!parent.addChildToZone(child, zone, index)) {
        // FIXME: No method exists to get an nodes zone index
        //        so until there is, we simply append it
        curParent.addChildToZone(child, curZone);
    }
}

function moveADMNode(node, zone, index) {
    // FIXME: Should we do anthing different if the
    //        parents are the same?
    reparentADMNode(node, node.getParent(), zone, index);
}

$(function() {
    var $designContentDocument,        // iframe contentDocument ref
        $toolbarPanel,
        $mainMenu,
        $controlsPanel,
        $palettePanel,
        $propertiesPanel,
        $controlsHandle,
        $controlsGrip,
        $statusPanel,
        $contentsPanel,
        $designView,
        $logView,
        $admDesign,
        gripPos,
        request,
        defaultTemplates,
        defaultTheme,
        currentTheme,
        themeUriTemplate,

        init = function () {

            // -------------------------- //
            // Fallback element templates //
            // -------------------------- //
            defaultTemplates = {
                'Page'    : '<div data-role="page" id="%UID%"></div>',
                'Header'  : '<div data-role="header" id="%UID%"><h1>Header %UID%</h1></div>',
                'Footer'  : '<div data-role="footer" id="%UID%"><h1>Footer %UID%</h1></div>',
                'Content' : '<div data-role="content" id="%UID%"><p class="nrc-hint-text">Content area %UID%, drop stuff here.</p></div>',
                'Button'  : '<a data-role="button" id="%UID%">Button %UID%</a>',
                'Base'    : '<span id="%UID%">Unknown Widget (%UID%)</span>',
                };

            // --------------------------------------------- //
            // Cache jQ references to commonly used elements //
            // --------------------------------------------- //
            $toolbarPanel = $('#toolbar-panel');
            $mainMenu = $('#main-menu');
            $controlsPanel = $('#controls-panel');
            $palettePanel = $('#palette-panel');
            $propertiesPanel = $('#properties-panel');
            $controlsHandle = $('#controls-handle');
            $controlsGrip = $('#handle-grip');
            $statusPanel = $('#status-panel');
            $contentsPanel = $('#contents-panel');
            $designView = $('#design-view');
            $logView = $('#logView');

            // ------------------------------------------- //
            // Populate palette panel of the builder UI    //
            // and invoke a callback when async JSON call  //
            // has completed                               //
            // ------------------------------------------- //
            request = loadPalette($palettePanel, 'src/assets/palette.json');
            $.when(request).done(paletteLoadDoneCallback);

            // -------------------------------------------- //
            // Populate property panel of the builder UI    //
            // -------------------------------------------- //
            loadProperties($propertiesPanel);

            // Make sure to keep the property panel height sized
            // appropriately and updated after every window resize
            fixPropertyPanelSize();
            $(window).resize( function() { fixPropertyPanelSize(); });

            // -------------------------------------------- //
            // Turn UL "#main-menu" into a LAME menu object //
            // -------------------------------------------- //
            $mainMenu.lame({
                speed: 0,       // 'slow', 'normal', 'fast', or ms ['normal']
                save: false,    // save menu states (if action!='hover') [false]
                action: 'hover',// 'click' or 'hover' ['click']
                effect: 'slide',// 'slide' or 'fade' ['slide']
                close: true     // Close menu when mouse leaves parent [false]
            });

            // ---------------------------------------- //
            // Style the toolbar with jquery-ui theming //
            // TODO: Move this into it's own function,  //
            //       such as "loadToolbar()"            //
            // ---------------------------------------- //
            $toolbarPanel.addClass('ui-widget-header');
            $toolbarPanel.find('.hmenu')
                .addClass('ui-helper-reset ui-widget ui-widget-header ui-state-default');
            $toolbarPanel.find('.hmenu li a')
                .addClass('ui-accordion-header ui-helper-reset ui-widget-header');
            $toolbarPanel.find('.sub-menu')
                .addClass('ui-accordion-content ui-helper-reset ui-widget-content ui-state-default');
            $toolbarPanel.find('.sub-menu li a')
                .addClass('ui-helper-reset ui-widget ui-state-default');

            // ----------------------------- //
            // Menu item click handler setup //
            // ----------------------------- //
            $toolbarPanel.find('#showADMTree').click(showADMTree);
            $toolbarPanel.find('#reloadDesign').click(triggerDesignViewRefresh);
            $toolbarPanel.find('#loadDesign').click(triggerImportFileSelection);
            $toolbarPanel.find('#exportDesign').mousedown(triggerSerialize);
            $toolbarPanel.find('#newpage').click(addNewPage);
            $toolbarPanel.find('#removepage').click(deleteCurrentPage);

            // ----------------------- //
            // Initialize Page Content //
            // ----------------------- //
            initPageZone();

            // ----------------------- //
            // Theme picker menu setup //
            // ----------------------- //
            defaultTheme = 'dark-hive';
            currentTheme = null;
            themeUriTemplate = "http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/themes/%NAME%/jquery-ui.css";
            setBuilderTheme(defaultTheme);
            initThemePicker();

            // ------------------------------------ //
            // Import file selection change handler //
            // ------------------------------------ //
            $('#importFile').change(importFileChangedCallback);

            // ------------------------------------------- //
            // Style the status bar with jquery-ui theming //
            // TODO: Move this into it's own function,     //
            //       such as "loadStatusbar()"             //
            // ------------------------------------------- //
            $statusPanel.addClass('ui-widget-header');

            // -------------------------------------------- //
            // Populate design view panel of the builder UI //
            // using one of our pre-defined templates       //
            // -------------------------------------------- //
            loadTemplate($designView);
            $designView.load(templateLoadDoneCallback);
            // TODO: eventually, the above will be async (JSON, XML, ?)
            //       and we will need to follow a similar pattern for loading
            //       as we do for the palette, doing post load setup in the
            //       "done" callback
            //request = loadTemplate($designView);
            //$.when(request).done(templateLoadDoneCallback);

            // ---------------------------------------------- //
            // Now, bind to the ADM modelUpdate to handle all //
            // additional changes                             //
            // ---------------------------------------------- //
            $admDesign = ADM.getDesignRoot();
            $admDesign.bind("modelUpdated", admModelUpdatedCallback);
            ADM.bind("designReset", admDesignResetCallback);
            ADM.bind("selectionChanged", admSelectionChangedCallback);
            ADM.bind("activePageChanged",admActivePageChangedCallback);

            // ---------------------------------------------------- //
            // Also listen to 'message' events from the design view //
            // for selection and sorting changes                    //
            // ---------------------------------------------------- //
            window.addEventListener('message', designViewMessageHandler, false);

            // ------------------------------------------- //
            // Style and activate the control panel handle //
            // for hiding/showing the palette and property //
            // panels                                      //
            // ------------------------------------------- //
            $controlsHandle
                .addClass('ui-helper-reset ui-widget ui-widget-header ui-corner-right');
            gripPos = $controlsHandle.height()*0.5 - $controlsGrip.height()*0.5;
            $controlsGrip
                .addClass('ui-icon ui-icon-grip-solid-vertical')
                .css({
                    'position' : 'relative',
                    'top' : gripPos,
                    'left' : '-4px',
                });
            $controlsHandle.click( toggleControls );
        },

/*
   TODO:
   As I look through the evolution of this code, I see
   that we may want to make the "controler" code an
   object with properties for loading the various UI
   sections, such as:

   main {
       palettePanelLoader:  function () {...},
       propertyPanelLoader: function () {...},
       toolbarLoader:       function () {...},
       statusbarLoader:     function () {...},
       designViewLoader:    function () {...},
       .
       .
       .
   };

   Not sure if this makes sense or is just over kill
   but trying to avoid ending up with one long "main"
   function that becomes unwieldy and prone to
   instability due to changes and variable context
   issues.
*/

////////////////////////////////////////////////////
// FUNCTIONS FOLLOW
////////////////////////////////////////////////////
    triggerImportFileSelection = function () {
        $('#importFile').click();
    },

    triggerSerialize = function () {
        serializeADMToJSON();
    },

    importFileChangedCallback = function (e) {
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
    },

    triggerDesignViewReload = function () {
        $('#design-view')[0].contentWindow.postMessage('reload', '*');
    },

    triggerDesignViewRefresh = function () {
        $('#design-view')[0].contentWindow.postMessage('refresh', '*');
    },

    admSelectionChangedCallback = function (e) {
        logit("ADM selectionChanged. New selected node is "+e.uid);

        // Unselect anything currently selected
        $designContentDocument.find('.ui-selected')
                              .removeClass('ui-selected');

        // Set selected item only if there is one
        if (e.uid !== null || e.node !== null) {
            $designContentDocument.find('.adm-node[data-uid=\''+e.uid+'\']')
                                  .addClass('ui-selected');
        }
    },

    admModelUpdatedCallback = function (e) {
        if (blockModelUpdated) {
            // Ignore this event instance
            return;
        }

        logit("ADM modelUpdated on "+e.node.getType()+
              "("+e.node.getUid()+")");
// FIXME: This is not working as expected, since jQM sees the parents of
//        this node in the DOM as already decorated, and thus it doesn't
//        perform *any* decoration or structural changes to the subtree.
//        Need to find the right way to trigger this in jQM for subtrees
//        if (e.node) {
//            serializeADMSubtreeToDOM(e.node);
//            triggerDesignViewReload();
//            refreshDropTargets();
//        }
        serializeADMDesignToDOM();
        triggerDesignViewReload();
        refreshDropTargets();

        // Refresh the page picker when pages change to update it's id
        if (e.node && e.node.getType() === 'Page') {
            updatePageZone();
        }
    },

    admDesignResetCallback = function (e) {
        logit("ADM designReset. New ADMDesign is "+e.design.getUid());
        $admDesign = ADM.getDesignRoot();
        $admDesign.bind("modelUpdated", admModelUpdatedCallback);
        serializeADMDesignToDOM();
        triggerDesignViewReload();
        refreshDropTargets();

        // Sync ADM's active page to what is shown in design view
        var page = null;
        page = $designContentDocument.find('.adm-node[data-role="page"]');
        if (page.length) {
            ADM.setActivePage($admDesign.findNodeByUid($(page[0]).data('uid')));
        }
    },

    admActivePageChangedCallback = function (e) {
        if (blockActivePageChanged) {
            return;
        }

        if (!e.page || e.page === undefined) {
            return;
        }

        if (e.page.getUid() === ADM.getActivePage()) {
            return;
        }

        blockActivePageChanged = true;
        logit("ADM activePageChanged. New Page node is "+e.page.getUid());
        // inform template to change active page
        var pageId = e.page.getProperty('id');
        $('#design-view')[0].contentWindow.$.mobile.changePage('#'+pageId);
        updatePageZone();
        blockActivePageChanged = false;
    },

    // -------------------------------------- //
    // Misc functions                         //
    // -------------------------------------- //
    toggleControls = function () {
        if ($controlsPanel.is(':visible')) {
            $controlsPanel.hide('slide', 50);
        } else {
            $controlsPanel.show('slide', 50);
        }
    },

    fixPropertyPanelSize = function () {
       // Nasty hack to ensure the Property Panel maintains a 40% sizing
       $propertiesPanel.height(($controlsPanel.height()*0.4));
    },

    loadTemplate = function (view) {
        var page, doc, contents;

        if (typeof(view) === "undefined") {
            console.error('Template load Failed: undefined iframe');
            return;
        }

        // ------------------------------------------------ //
        // Initialize the global design contentDocument ref //
        // ------------------------------------------------ //
        $designContentDocument = $(view[0].contentDocument);

        $admDesign = new ADMNode('Design');

        // ----------------------------------------------------- //
        // FIXME: This is just an in-line placeholder template   //
        //        Need to convert to loading a user selected one //
        //        that is pulled from JSON (or XML or ???)       //
        // ----------------------------------------------------- //
        page = new ADMNode('Page');
        if ($admDesign.addChild(page)) {
            var that;
            that = new ADMNode('Header');
            page.addChild(that);
            that = new ADMNode('Content');
            page.addChild(that);
            that = new ADMNode('Footer');
            page.addChild(that);
        } else {
            console.warn('Design has no page!');
        }

        doc = $designContentDocument[0];
        doc.open();
        contents = serializeFramework();
        doc.writeln(contents);
        doc.close();

        ADM.setDesignRoot($admDesign);
    },

    serializeADMNodeToDOM = function (node, parentSelector) {
        var parentNode = $designContentDocument.find(parentSelector),
            template = node.getTemplate(),
            uid = node.getUid(),
            type = node.getType(),
            props, id,
            updateId = false,
            attrMap = {},
            widget;

        // Find the parent element of this node in the DOM tree
        if (parentNode === undefined || parentNode === null ||
            !parentNode || parentNode.length < 1) {
            // No sense adding it to the DOM if we can't find it's parent
            console.error(parentSelector+' not found in Design View');
            return false;
        }

        // Ensure we have at least something to use as HTML for this item
        if (template === undefined || template === '') {
            console.warn('Missing template for ADMNode type: '+type+
                            '.  Trying defaults...');
            template = defaultTemplates[type];
            // If no default exists, we must error out
            if (template === undefined || template === '') {
                console.error('No template exists for ADMNode type: '+type);
                return false;
            }
        }

        // The ADMNode.getProperties() call will trigger a modelUpdated
        // event due to any property being set to autogenerate
        blockModelUpdated = true;
        props = node.getProperties();
        id = node.getProperty('id');
        blockModelUpdated = false;
        // Apply any special ADMNode properties to the template before we
        // create the DOM Element instance
        for (var p in props) {
            switch (p) {
                case "text":
                case "min":
                case "max":
                case "value":
                    template = template.replace('%' + p.toUpperCase() + '%',
                                                props[p]);
                    break;
                case "id":
                    if (id === '' || id === undefined || id === null) {
                        updateId = true;
                        id = type+'-'+uid;
                    }
                    template = template.replace(/%ID%/g, id);
                    attrMap[p] = id;
                    break;
                default:
                    // JSON prop names can't have '-' in them, but the DOM
                    // attribute name does, so we replace '_' with '-'
                    var attrName = p.replace(/_/g, '-'),
                        attrValue = node.getProperty(p);
                    attrMap[attrName] = attrValue;
                    break;
            }
        }

        // Turn the template into an element instance, via jquery
        widget = $(template);

        // Apply any unhandled properties on the ADMNode to the DOM Element
        // as Element attributes
        $(widget).attr(attrMap);

        // Attach the ADM UID to the element as an attribute so the DOM-id can
        // change w/out affecting our ability to index back into the ADM tree
        // XXX: Tried using .data(), but default jQuery can't select on this
        //      as it's not stored in the element, but rather in $.cache...
        //      There exist plugins that add the ability to do this, but they
        //      add more code to load and performance impacts on selections
        $(widget).attr('data-uid',uid);

        // Add a special (temporary) class used by the JQM engine to
        // easily identify the "new" element(s) added to the DOM
        $(widget).addClass('nrc-dropped-widget');
        $(widget).addClass('adm-node');

        // If this node is "selected", make sure it's class reflects this
        if (node.isSelected()) {
            $(widget).addClass('ui-selected');
        }

        // If this node is a "container", make sure it's class reflects this
        if (node.isContainer() || node.getType() === 'Header') {
            $(widget).addClass('nrc-sortable-container');
            if (node.getChildrenCount() === 0) {
                $(widget).addClass('nrc-empty');
            } else {
                $(widget).removeClass('nrc-empty');
            }
        }

        // Now we actually add the new element to it's parent
        // TODO: Be smarter about insert vs. append...
        $(parentNode).append($(widget));

        if (updateId) {
            blockModelUpdated = true;
            node.setProperty('id', id);
            blockModelUpdated = false;
        }

        return true;
    },

    serializeADMSubtreeToDOM = function (node, spaces) {
        var isContainer, indent = ' '+(spaces?spaces:'');

        // 1. Only handle ADMNodes
        if (!(node instanceof ADMNode)) {
            return;
        }

        // 2. Do something with this node
        isContainer = (node.getChildrenCount() !== 0);

        // Since we're regenerating this DOM subtree, delete this node
        // (and it's subtree)
        if (node.instanceOf('Design')) {
            // Special Case... Only remove "pages" not other divs
            $designContentDocument.find('body > div[data-role="page"]').remove();
        } else {
            var uid = node.getUid(),
                type = node.getType(),
                pid, pNode, pSelector;

            if (node.instanceOf('Page')) {
                pSelector = 'body';
            } else {
                pid = node.getParent().getUid();
                pSelector = '.adm-node[data-uid=\''+pid+'\']';
            }

            // Only proceed if the parent element of this node is in the DOM
            pNode = $designContentDocument.find(pSelector);
            if (pNode && pNode.length >= 1) {
                // Remove any previous DOM element instance of this node
                if ($('.adm-node[data-uid=\''+uid+'\']',pNode).remove()) {
                    // ATM, we don't care if it fails
                    console.warn('Failed to remove: ".adm-node[data-uid=\'' +
                                  uid+'\']" from "'+pSelector+'"');
                }
                node.suppressEvents(true);
                node.getDesign().suppressEvents(true);
                if (serializeADMNodeToDOM(node, pSelector, indent)) {
                    console.log(indent+(isContainer?'+':' ')+type+' ('+uid+')'+
                                        (node.isSelected()?' <--':''));
                } else {
                    console.warn(indent+' DOM add Failed: '+type+' ('+uid+')'+
                                        (node.isSelected()?' <--':''));
                }
                node.getDesign().suppressEvents(false);
                node.suppressEvents(false);
            } else {
                console.error(indent+' DOM parent not found: '+pSelector);
                return;
            }

        }

        // 3. Recurse over any children
        if (isContainer) {
            var children = node.getChildren();
            for (var i=0; i<children.length; i++) {
                serializeADMSubtreeToDOM(children[i], indent);
            }
        }

        // 4. Return (anything?)
        return;
    },

    serializeADMDesignToDOM = function () {
        if ($admDesign === undefined) {
            $admDesign = ADM.getDesignRoot();
        }

        serializeADMSubtreeToDOM($admDesign);
    },

    // Attempt to add child, walking up the tree until it works or
    // we reach the top
    addChildRecursive = function (parentId, type) {
        var node = null;

        if (parentId && type) {
            node = ADM.addChild(parentId, type);
            if (!node) {
                var parent = ADM.getDesignRoot().findNodeByUid(parentId),
                    gParent = parent.getParent();
                if (gParent) {
                    return addChildRecursive(gParent.getUid(), type);
                } else {
                    return node;
                }
            }
        }
        return node;
    },

    refreshDropTargets = function () {
        var targets = $designContentDocument.find('.nrc-sortable-container')
                                            .add('.adm-node[data-role="page"]',
                                                 $designContentDocument);
        logit("Found ["+targets.length+"] drop targets in template: ");

        targets
            .droppable({
                activeClass: 'ui-state-active',
                hoverClass: 'ui-state-hover',
                tolerance: 'touch',
                greedy: true,
                accept: '.nrc-palette-widget',
                drop: function(event, ui){
                    var t = $(ui.draggable).data("adm-node").type,
                        pid = $(this).attr('data-uid'),
                        node = addChildRecursive(pid, t);
                    logit('dropped a "'+t+'" onto ('+this.id+')');
                    if (!node) {
                        logit('Error: "'+t+'" could not be added to "'+this.id);
                        $(ui.draggable).draggable("option", { revert: true });
                    } else {
                        logit('Added new "'+t+'" to "'+this.id);
                        $(ui.draggable).draggable("option", { revert: false });
                        ADM.setSelected(node.getUid());
                    }
                }
            });
    },

    serializeFramework = function () {
        var start = '<!DOCTYPE html>\n <html><head><title>Page Title</title>\n',
            i,
            head = "",
            links = "",
            scripts = "",
            styles = "",
            end = "",
            metas = [
                { key:'name',
                  value: 'viewport',
                  content: 'width=device-width, initial-scale=1'
                },
                { key:'http-equiv',
                  value: 'cache-control',
                  content: 'no-cache'
                },
            ],
            libs = [
                'lib/jquery-1.6.2.js',
                'lib/jquery-ui-1.8.16.custom.js',
                'src/js/template.js',
                'lib/jquery.mobile-1.0b3.js',
            ],
            css = [
                'src/css/jquery.mobile-1.0b3.css',
                'src/css/template.css',
            ];

        for (i in metas) {
            head += '<meta '+metas[i].name+'="'+metas[i].value+'" content="'+metas[i].content+'"> \n';
        }

        for (i in css) {
            links += '<link rel="stylesheet" href="'+css[i]+'" /> \n';
        }

        for (i in libs) {
            scripts += '<script type="text/javascript" src="'+libs[i]+'"></script> \n';
        }

        styles = '<style type="text/css"> \n';
        styles += '</style> \n';
        end = '</head>\n<body>\n';
//        end += '<div data-role="page" id="ADMPage7"><div data-role="content" id="main"><p class="nrc-hint-text">Add content here...</p></div></div>\n';
        end += '</body>\n</html>';
        return start+head+links+scripts+styles+end;
    },

    // ------------------------------------------------ //
    // Make the contents of the design view "malleable" //
    // ------------------------------------------------ //
    templateLoadDoneCallback = function () {
        // Initial "kick" to dump the ADM to the DOM
        serializeADMDesignToDOM();
        triggerDesignViewReload();
        refreshDropTargets();
    },

    paletteLoadDoneCallback = function () {
        var w = $palettePanel.find('.nrc-palette-widget');
        logit("Fount ["+w.length+"] widgets in the palette");

        $palettePanel.disableSelection();

        w.draggable({
            revert: 'invalid',
            zIndex: 1000,
            appendTo: 'body',
            scroll: false,
            iframeFix: true,
            containment: false,
            connectToSortable: '#design-view .nrc-sortable-container',
            helper: 'clone',
            opacity: 0.8,
            start: function(event,ui){
                logit(this.id+".start()");
                if (ui.helper[0].id == "") {
                    ui.helper[0].id = this.id+'-helper';
                }
                logit("   helper: "+ui.helper[0].id);
            },
            stop: function(event,ui){logit(this.id+".stop()");}
        });

        w.disableSelection();
    },

    designViewMessageHandler = function (e) {
        var message;

        if ((e.origin !== document.location.origin) &&
            (e.source.window.name !== 'design-view')) {
            console.warn('Message received from untrusted source:\n'+
                         'origin: '+e.origin+
                         'window: '+e.source.window.name);
            return;
        }

        if (typeof(e.data) === 'object') {
            message = e.data.message;
        } else {
            message = e.data.split(':')[0];
        }

        if (message === undefined || message === '') {
            console.warn('Received undefined message, ignoring');
            return;
        }

        logit('Message "'+message+'" received from '+e.source.window.name);
    },

    // -------------------------------- //
    // Debugging and logging functions  //
    // -------------------------------- //
    dumpLog = function () {
        if ($logView) { $logView.text(logHist.join('\n')); }
    },

    showADMTree = function () {
        //var tree = dumpSubtree($admDesign, "", "");
        var tree = dumpSubtree(ADM.getDesignRoot(), "", "");
        alert(tree?tree:"No ADM tree found");
    },

    dumpSubtree = function (node, spaces, tree) {
        var childspaces = spaces + "  ";

        if (!(node instanceof ADMNode)) {
            return;
        }

        if (node.found) {
            tree += '<span style="color: blue">';
        }

        if (node.getChildrenCount() > 0) {
            tree += spaces + "+ " + node.getType();
            if (SHOW_IDS) {
                tree += " (" + node.getUid() + ")";
            }
        } else {
            tree += spaces + "- " + node.getType();
            if (SHOW_IDS) {
                tree += " (" + node.getUid() + ")";
            }
        }

        if (node.isSelected()) {
            tree += " <--";
        }

        if (node.found) {
            tree += '  <-- FOUND</span>';
        }
        tree += "\n";

        if (node instanceof ADMNode) {
            var children = node.getChildren();
            for (var i = 0; i < children.length; i++) {
                tree = dumpSubtree(children[i], childspaces, tree);
            }
        }

        return tree;
    },

    getAllPagesInADM = function () {
        var children = ADM.getDesignRoot().getChildren(),
            pageList = [];

        for (var i = 0; i < children.length; i++) {
            var id = children[i].getProperty('id');
            pageList.push(id);
        }
        logit("ADM contains pages: "+ pageList.join(','));
        return pageList;
    },

    addNewPage = function () {
        var page = ADM.createNode('Page'),
            content = ADM.createNode('Content');
        if (!page) {
            logit("Warning: could not create ADM Page object");
            return;
        }
        page.addChild(content);
        $admDesign.suppressEvents(true);
        $admDesign.addChild(page);
        $admDesign.suppressEvents(false);
        ADM.setActivePage(page);
    },

    deleteCurrentPage = function () {
        var currentPage = ADM.getActivePage();
        if (currentPage !== null && (!(currentPage instanceof ADMNode) ||
                                    currentPage.getType() !== "Page")) {
            logit("Warning: tried to remove an invalid  page");
            return false;
        }
        //delete Current Page node from ADM
        ADM.removeChild(currentPage.getUid());
        //active the first page from left pages
        if ($admDesign.getChildren().length > 0) {
            ADM.setActivePage($admDesign.getChildren()[0]);
        } else {
            logit("there is no page left");
        }
        updatePageZone();
        return true;
    },

    initPageZone = function () {
        var contents = $('<div id="page_content"></div>')
                       .addClass('ui-widget')
                       .appendTo('#toolbar-panel');
    },

    updatePageZone = function () {
        $('#page_content').empty();
        var selector = $('<label for="picker">Pages</label>' +
                         '<select name="page-selector" id="page-selector"></select>')
                .appendTo('#page_content');

        // Insert the list of pages
        var pageList = getAllPagesInADM();
        if (!pageList.length) {
            logit("there is no pages");
            return;
        }

        for (var p in pageList) {
            var id = pageList[p];
            $('<option id="' + id + '" value="' + id + '">' + id + '</option>')
                .appendTo('#page-selector');
        }

        var activePage = ADM.getActivePage();
        logit("current active page id is "+ activePage.getUid());
        //Make sure current selection matches current page
        if (activePage) {
            $('#page-selector #'+activePage.getProperty("id"))[0].selected=true;
        }

        //bind change event to select widget
        $('#page-selector').change( function() {
            var selectItem = $(this).children('option:selected').val();
            var findPage = false;
            var pageNode, i;
            var children = [];
            children = ADM.getDesignRoot().getChildren();

            for (i = 0; i < children.length; i++) {
                var id = children[i].getProperty("id");
                if (id === selectItem) {
                    findPage = true;
                    pageNode = children[i];
                }
            }
            if (!findPage) {
                logit("error: can't find select page!");
                return;
            }
            ADM.setActivePage(pageNode);
        });
    },

    initThemePicker = function () {
        var themeDialog = $('<div id="theme-dialog"></div>'),
            themeNames = ['blitzer',
                          'cupertino',
                          'dark-hive',
                          'dot-luv',
                          'eggplant',
                          'excite-bike',
                          'flick',
                          'hot-sneaks',
                          'humanity',
                          'le-frog',
                          'mint-choc',
                          'overcast',
                          'pepper-grinder',
                          'redmond',
                          'smoothness',
                          'south-street',
                          'start',
                          'sunny',
                          'swanky-purse',
                          'trontastic',
                          'ui-darkness',
                          'ui-lightness',
                          'vader'];

        // Create the selection form
        $(themeDialog).append('<form><fieldset>' +
                              '<label for="picker">Themes</label>' +
                              '<select name="picker" id="picker"></select>' +
                              '</fieldset></form>')
                      .appendTo('body');

        // Insert the list of themes
        for (var t in themeNames) {
            var id = themeNames[t];
            $('<option id="'+ id +'" value="' + id + '">'+ id + '</option>')
                .appendTo('#picker',themeDialog);
        }

        // Call the theme setter when the select theme changes
        $('#picker',themeDialog).change( function(e) {
            setBuilderTheme(e.currentTarget.value);
        });

        // Now turn this into a jq-ui dialog
        $('#theme-dialog').dialog({
            autoOpen: false,
            title: 'Theme Picker',
            open: function() {
                    // Make sure current selection matches current theme
                    $('#picker #'+currentTheme,this)[0].selected=true;
                },
        });

        // Bind the click event on the menu to show the dialog
        $('#theme')
            .click( function(e) {
                $('#theme-dialog').dialog("open");
            });
    },

    setBuilderTheme = function (newTheme) {
        var uri, theme, el;

        if (!newTheme) {
            newTheme = defaultTheme;
        }

        // Never been set before, so just add it now
        if (!currentTheme) {
            theme = $('LINK[href*="' + newTheme + '"]');

            currentTheme = newTheme;

            // No <link> exists for this theme yet
            if ($(theme).length === 0) {
                uri = themeUriTemplate.replace(/%NAME%/,newTheme);
                el = '<link rel="stylesheet" type="text/css"' +
                               'href="' + uri + '" />';
                $(el).appendTo('HEAD');
                console.log('Current theme set to "' + currentTheme + '"');
            }
            return;

        // Same theme, do nothing
        } else if (newTheme === currentTheme) {
            return;

        } else {
            uri = themeUriTemplate.replace(/%NAME%/,newTheme);
            theme = $('LINK[href*="'+currentTheme+'"]');

            if ($(theme).length === 0) {
                el = '<link rel="stylesheet" type="text/css"' +
                               'href="' + uri + '" />';
                $(el).appendTo('HEAD');
                console.log('New theme: ' + currentTheme);
            } else {
                if ($(theme).attr('href', uri) !== undefined) {
                    currentTheme = newTheme;
                    console.log('New theme: ' + currentTheme);
                } else {
                    console.warn('Theme not set');
                }
            }
        }
    };

    init();
});
