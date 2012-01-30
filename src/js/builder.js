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
    blockActivePageChanged = false;

var SHOW_IDS = true,
    logHist = [];

var xmlserializer = new XMLSerializer();

/*
 * FIXME: This is a desparate workaround for a flaw in jQuery-ui drag
 *        and drop manager ($.ui.ddmanager) not dealing with iframes
 *
 * We override the jQuery-ui prepareOffsets() function to account for
 * elements within iframes, caluculating their toplevel page relative
 * positions
 *
 * Copied from jquery-ui version 1.8.16, ui/jquery.ui.droppable.js
 */
jQuery.ui.ddmanager.prepareOffsets = function (t, event) {

    var m = $.ui.ddmanager.droppables[t.options.scope] || [];
    var type = event ? event.type : null; // workaround for #2317
    var list = (t.currentItem || t.element).find(":data(droppable)").andSelf();

    droppablesLoop: for (var i = 0; i < m.length; i++) {

        if(m[i].options.disabled || (t && !m[i].accept.call(m[i].element[0],(t.currentItem || t.element)))) continue;   //No disabled and non-accepted
        for (var j=0; j < list.length; j++) { if(list[j] == m[i].element[0]) { m[i].proportions.height = 0; continue droppablesLoop; } }; //Filter out elements in the current dragged item
        m[i].visible = m[i].element.css("display") != "none"; if(!m[i].visible) continue;                                                                       //If the element is not visible, continue

        if(type == "mousedown") m[i]._activate.call(m[i], event); //Activate the droppable if used directly from draggables

        m[i].offset = m[i].element.offset();
        m[i].proportions = { width: m[i].element[0].offsetWidth, height: m[i].element[0].offsetHeight };

        /////////////////////////////////////////////////////////////////
        // Start of our changes
        var getOwnerWindow = function (node) {
            return node.ownerDocument.defaultView || node.parentWindow;
        };
        var getOffsetInWindow = function (node, win) {
            var myWin = getOwnerWindow(node),
                offset = $(node).offset(),
                winOffSet, frameOffset, parentOffset, parentFrames = [];
            if ( myWin === win)
                return offset;
            else if (myWin === top) {
                // win is a child of myWin(top), so we caculate the offset
                // of win in related to myWin and substract it.
                winOffSet = getOffsetInWindow(win.document.documentElement,
                                              myWin);
                offset.left -= winOffSet.left;
                offset.top -= winOffSet.top;
                return offset;
            }
            else {
                // find myWin in its parent as an frame element and get the
                // offset
                parentFrames = $('iframe, frame', myWin.parent.document);
                for ( var frame in parentFrames) {
                    if (parentFrames[frame].contentWindow === myWin) {
                        offset = $(node).offset(),
                        frameOffset = $(parentFrames[frame]).offset(),
                        parentOffset = getOffsetInWindow(
                                       myWin.parent.document.documentElement,
                                       win);

                        offset.left += frameOffset.left + parentOffset.left;
                        offset.top += frameOffset.top + parentOffset.top;
                        offset.left -= myWin.scrollX;
                        offset.top -= myWin.scrollY;
                        return offset;
                    }
                }
            }
        };
        m[i].offset = getOffsetInWindow(m[i].element[0], getOwnerWindow((t.currentItem || t.element)[0]));
        /////////////////////////////////////////////////////////////////
        // End of our changes
    }
};
$.widget("ui.droppable", $.extend({}, $.ui.droppable.prototype, {
    _drop: function(event,custom) {
        console.log("entering extended drop");

		var draggable = custom || $.ui.ddmanager.current;
		if (!draggable || (draggable.currentItem || draggable.element)[0] == this.element[0]) return false; // Bail if draggable and droppable are same element

		var childrenIntersection = false;
		this.element.find(":data(droppable)").not(".ui-draggable-dragging").each(function() {
			var inst = $.data(this, 'droppable');
			if(
				inst.options.greedy
				&& !inst.options.disabled
				&& inst.options.scope == draggable.options.scope
				&& inst.accept.call(inst.element[0], (draggable.currentItem || draggable.element))
                /////////////////////////////////////////////////////////////////
                // Start of our changes
                // This is the original line
				// && $.ui.intersect(draggable, $.extend(inst, { offset: inst.element.offset() }), inst.options.tolerance)
                // This is our line
                && $.ui.intersect(draggable, inst, inst.options.tolerance)
                /////////////////////////////////////////////////////////////////
                // End of our changes
			) { childrenIntersection = true; return false; }
		});
		if(childrenIntersection) return false;

		if(this.accept.call(this.element[0],(draggable.currentItem || draggable.element))) {
			if(this.options.activeClass) this.element.removeClass(this.options.activeClass);
			if(this.options.hoverClass) this.element.removeClass(this.options.hoverClass);
			this._trigger('drop', event, this.ui(draggable));
			return this.element;
		}

		return false;

	}
}));

function logit(msg) {
    var entry = $.now()+": "+msg;
    var i = logHist.push(entry);
    if (typeof console !== "undefined") { console.log(logHist[i-1]); }
}

var $defaultHeaders = [];
function getDefaultHeaders() {
    var i, props, el;
    if ($defaultHeaders.length > 0)
        return $defaultHeaders;

    props = ADM.getDesignRoot().getProperty('metas');
    for (i in props) {
        // Skip design only header properties
        if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
            continue;
        }
        el = '<meta ';
        if (props[i].hasOwnProperty('key')) {
            el = el + props[i].key;
        }
        if (props[i].hasOwnProperty('value')) {
            el = el + '="' + props[i].value + '"';
        }
        if (props[i].hasOwnProperty('content')) {
            el = el + ' content="' + props[i].content + '"';
        }
        el = el + '>';
        $defaultHeaders.push(el);
    }
    props = ADM.getDesignRoot().getProperty('libs');
    for (i in props) {
        // Skip design only header properties
        if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
            continue;
        }
        el = '<script ';
        if (props[i].hasOwnProperty('value')) {
            el = el + 'src="' + props[i].value + '"';
        }
        el = el + '></script>';
        $defaultHeaders.push(el);
    }
    props = ADM.getDesignRoot().getProperty('css');
    for (i in props) {
        // Skip design only header properties
        if (props[i].hasOwnProperty('designOnly') && props[i].designOnly) {
            continue;
        }
        el = '<link ';
        if (props[i].hasOwnProperty('value')) {
            el = el + 'href="' + props[i].value + '"';
        }
        el = el + ' rel="stylesheet">';
        $defaultHeaders.push(el);
    }
    return $defaultHeaders;
}

var $designHeaders = [];
function getDesignHeaders() {
    var i, props, el;
    if ($designHeaders.length > 0)
        return $designHeaders;

    props = ADM.getDesignRoot().getProperty('metas');
    for (i in props) {
        el = '<meta ';
        if (props[i].hasOwnProperty('key')) {
            el = el + props[i].key;
        }
        if (props[i].hasOwnProperty('value')) {
            el = el + '="' + props[i].value + '"';
        }
        if (props[i].hasOwnProperty('content')) {
            el = el + ' content="' + props[i].content + '"';
        }
        el = el + '>';
        $designHeaders.push(el);
    }
    props = ADM.getDesignRoot().getProperty('libs');
    for (i in props) {
        el = '<script ';
        if (props[i].hasOwnProperty('value')) {
            el = el + 'src="' + props[i].value + '"';
        }
        el = el + '></script>';
        $designHeaders.push(el);
    }
    props = ADM.getDesignRoot().getProperty('css');
    for (i in props) {
        el = '<link ';
        if (props[i].hasOwnProperty('value')) {
            el = el + 'href="' + props[i].value + '"';
        }
        el = el + ' rel="stylesheet">';
        $designHeaders.push(el);
    }
    return $designHeaders;
}

// Construct a new HTML document from scratch with provided headers
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

$(function() {
    var $designContentDocument,        // iframe contentDocument ref
        $toolbarPanel,
        $mainMenu,
        $controlsPanel,
        $palettePanel,
        $propertiesPanel,
        $outlinePanel,
        $controlsHandle,
        $controlsGrip,
        $statusPanel,
        $statusMessage,
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
        resultHTML,
        previewWindow = $('#preview-frame')[0].contentWindow,

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
            $outlinePanel = $('#outline-panel');
            $controlsHandle = $('#controls-handle');
            $controlsGrip = $('#handle-grip');
            $statusPanel = $('#status-panel');
            $statusMessage = $('#status-message');
            $contentsPanel = $('#contents-panel');
            $designView = $('#design-view');
            $logView = $('#logView');

            // ------------------------------------------- //
            // Populate palette panel of the builder UI    //
            // and invoke a callback when async JSON call  //
            // has completed                               //
            // ------------------------------------------- //
            request = loadPalette($palettePanel);
            $.when(request).done(paletteLoadDoneCallback);

            // -------------------------------------------- //
            // Populate property panel of the builder UI    //
            // -------------------------------------------- //
            loadProperties($propertiesPanel);

            // Make sure to keep the property panel height sized
            // appropriately and updated after every window resize
            fixPropertyPanelSize();

            $.ajax({
                type: 'GET',
                url: "src/assets/devices.json",
                dataType: 'json',
                success: function(data) {
                    var $devicesMenu = $("#devices-sub-menu").next(),
                        first = true;
                    $.each(data, function (key, val) {
                        var li, a, bullet = "&nbsp;";
                        if (first) {
                            // set initial default
                            $("#preview-frame").attr(val);
                            bullet = "&#x2022;";
                            first = false;
                        }
                        li = $('<li>');
                        a = $('<a id="'+ key + '">' + 
                              '<span class="space">' + bullet + '</span>' +
                              key + ' (' +
                              val.width + 'x' + val.height + ')</a>');
                        li.append(a);
                        $devicesMenu.append(li);
                        a.data("device-data", val);
                        a.click( function () {
                            var data = $(this).data("device-data");
                            var $previewFrame = $("#preview-frame");
                            $previewFrame.attr(data);
                            $(this).closest("ul")
                                .find("span.space")
                                .html("&nbsp;");
                            $(this).find("span.space")
                                .html("&#x2022;");

                        });
                    });
                },
                data: {},
                async: false
            });
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
            $toolbarPanel.find('.menu-separator')
                .addClass('ui-helper-reset ui-widget ui-state-hover');

            // ----------------------------- //
            // Menu item click handler setup //
            // ----------------------------- //
            $toolbarPanel.find('#designView').click(showDesignView);
            $toolbarPanel.find('#codeView').click(showCodeView);
            $toolbarPanel.find('#preView').click(showPreView);
            $toolbarPanel.find('#outlineView').click(toggleOutlineView);
            $toolbarPanel.find('#showADMTree').click(showADMTree);
            $toolbarPanel.find('#reloadDesign').click(triggerDesignViewRefresh);
            $toolbarPanel.find('#exportHTML').click(triggerExportHTML);
            $toolbarPanel.find('#exportPackage').mousedown(triggerExportPackage);
            $toolbarPanel.find('#newpage').click(addNewPage);
            $toolbarPanel.find('#removepage').click(deleteCurrentPage);

            // ----------------------------- //
            // Menu item hover handler setup //
            // ----------------------------- //
            var menuIndications = {
                'file-sub-menu'  : 'File menu',
                'loadDesign'     : 'Import a design from a JSON file',
                'exportToLocal'  : 'Export the design',
                'exportDesign'   : 'Export the current design as a JSON file',
                'exportHTML'     : 'Export the current design as an HTML file',
                'view-sub-menu'  : 'View menu',
                'designView'     : 'Switch to design view',
                'codeView'       : 'Switch to code view',
                'preView'        : 'Switch to preview',
                'showADMTree'    : 'Show ADM tree for debugging',
                'reloadDesign'   : 'Reload the design',
                'theme'          : 'Choose a theme for the GUI Builder application',
                'newpage'        : 'Add a new page to the design',
                'removepage'     : 'Remove the current page from the design',
            };
            $mainMenu.find("li a").hover(function(){
                var menuID = $(this).attr("id");
                var menuIndication =  menuIndications[menuID];
                $statusMessage.html(menuIndication);
                if (!$(this).closest("ul").hasClass("hmenu")) {
                    $(this).addClass("ui-state-hover");
                }
            }, function(){
                $statusMessage.html("");
                $(this).removeClass("ui-state-hover");
                $(this).removeClass("ui-state-active");
            });

            $mainMenu.find("li li a").mousedown(function(){
                $(this).addClass("ui-state-active");
            });
            $mainMenu.find("li li a").mouseup(function(){
                $(this).removeClass("ui-state-active");
            });

            // ----------------------- //
            // Initialize Page Content //
            // ----------------------- //
            initPageZone();

            // --------------------- //
            // Initialize Breadcrumb //
            // --------------------- //
            initBreadcrumb();

            // ----------------------- //
            // Theme picker menu setup //
            // ----------------------- //
            defaultTheme = 'dark-hive';
            currentTheme = null;
            themeUriTemplate = "http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/themes/%NAME%/jquery-ui.css";
            setBuilderTheme(defaultTheme);
            initThemePicker();

            // ------------------------------------------- //
            // Style the status bar with jquery-ui theming //
            // TODO: Move this into it's own function,     //
            //       such as "loadStatusbar()"             //
            // ------------------------------------------- //
            $statusPanel.addClass('ui-widget-header');

            // ---------------------------------------------- //
            // Create view tabs in worspace of the builder UI //
            // ---------------------------------------------- //
            $('#tabs').tabs();
            // Need to hide preview tab so it will not affect the
            // redendering of design view
            $('#tabs-3').hide();

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

            // Fixes PTSDK-130: Block right-click context menu in code and
            // preview div wrappers
            $("#preview-frame-wrapper, #code-area")
                .bind('contextmenu', function(e) { e.preventDefault(); });

            // ------------------------------------------- //
            // Style and activate the control or outline   //
            // panel handle for hiding/showing the palette,//
            // propert and outline panels                  //
            // ------------------------------------------- //
            var handler = $controlsHandle.add('#outline-handle')
                          .addClass('ui-helper-reset ui-widget ui-widget-header ui-corner-right');
            gripPos = $controlsHandle.height()*0.5 - $controlsGrip.height()*0.5;
            $controlsGrip.add('#outline-grip')
                         .addClass('ui-icon ui-icon-grip-solid-vertical')
                         .css({
                             'position' : 'relative',
                             'top' : gripPos,
                             'left' : '-4px',
                         });
            handler.click( toggleControls );

            $(document).delegate('#pages-menu li a[id|="showpage"]', "click",
                                 function () {
                                     var uid, root, node;
                                     uid = $(this).attr("adm-uid");
                                     if (uid) {
                                         root = ADM.getDesignRoot();
                                         node = root.findNodeByUid(uid);
                                         ADM.setActivePage(node);
                                     }
                                 });

            // Ensure DesignView is show initially
            showDesignView();
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
    exportFile = function (fileName, content, binary) {
        var cookieValue = cookieUtils.get("exportNotice"),
            $exportNoticeDialog = $("#exportNoticeDialog"),
            saveAndExportFile = function () {
                fsUtils.write(fileName, content, function(fileEntry){
                    fsUtils.exportToTarget(fileEntry.fullPath);
                }, _onError, false, binary);
            };

        if(cookieValue === "true" && $exportNoticeDialog.length > 0) {
            // bind exporting HTML code handler to OK button
            $exportNoticeDialog.dialog("option", "buttons", {
                "OK": function () {
                    saveAndExportFile();
                    $("#exportNoticeDialog").dialog("close");
                }
            });
            // open the dialog
            $exportNoticeDialog.dialog("open");
        } else {
            // if cookieValue is not true, export HTML code directly
            saveAndExportFile();
        }
    },

    triggerExportHTML = function () {
        exportFile("index.html.download", resultHTML);
    },

    triggerExportPackage = function () {
        var zip = new JSZip();
        zip.add("index.html", resultHTML);
        var files = [
            'src/css/images/ajax-loader.png',
            'src/css/images/icons-18-white.png',
            'src/css/images/icons-36-white.png',
            'src/css/images/icons-18-black.png',
            'src/css/images/icons-36-black.png',
            'src/css/images/icon-search-black.png',
            'src/css/images/web-ui-fw_noContent.png',
            'src/css/images/web-ui-fw_volume_icon.png'
        ];
        var getDefaultHeaderFiles = function (type) {
            var files = [];
            var headers = ADM.getDesignRoot().getProperty(type);
            for ( var header in headers) {
                // Skip design only header properties
                if (headers[header].hasOwnProperty('designOnly') && headers[header].designOnly) {
                    continue;
                }
                files.push(headers[header].value);
            }
            return files;
        };
        $.merge(files, $.merge(getDefaultHeaderFiles("libs"), getDefaultHeaderFiles("css")));

        var i = 0;
        var getFile = function () {
            if (i < files.length)
            {
                // We have to do ajax request not using jquery as we can't get "arraybuffer" response from jquery
                var req = window.ActiveXObject ? new window.ActiveXObject( "Microsoft.XMLHTTP" ): new XMLHttpRequest();
                req.onload = function() {
                    var uIntArray = new Uint8Array(this.response);
                    var charArray = new Array(uIntArray.length);
                    for (var j = 0; j < uIntArray.length; j ++)
                        charArray[j] = String.fromCharCode(uIntArray[j]);
                    zip.add(files[i],btoa(charArray.join('')), {base64:true});
                    if (i === files.length - 1){
                        var content = zip.generate(true);
                        exportFile("design.zip", content, true);
                    }
                    i++;
                    getFile();
                }
                try
                {
                    req.open("GET", files[i], true);
                    req.responseType = 'arraybuffer';
                } catch (e) {
                    alert(e);
                }
                req.send(null);
            }
        }
        getFile();
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
                                  .not('[data-role=\'page\']')
                                  .addClass('ui-selected');

            // Make sure selected node is visible on show
            $designContentDocument.find('.ui-selected:first').each(function (){
                this.scrollIntoViewIfNeeded();
            });
        }
    },

    setPreviewPage = function (pageId) {
        var $previewFrame = $("#preview-frame"),
            changePreviewPage = function (pageId) {
                if (previewWindow.$ && previewWindow.$.mobile)
                    previewWindow.$.mobile.changePage("#" + pageId, {transition: "none"});
            };

        if ($previewFrame.is(":visible")) {
            $previewFrame.hide();
            changePreviewPage(pageId);
            $previewFrame.show();
        }
        else {
            changePreviewPage(pageId);
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
        refreshCodeViewPreview();


        // Refresh the page picker when pages change to update it's id
        if (e.node && (e.node.getType() === 'Page' || e.node.getType() === 'Design')) {
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
        refreshCodeViewPreview();

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
        setPreviewPage(pageId);
        if (!e.oldPage) {
            updatePageZone();
        } else {
            updateActivePage();
        }
        blockActivePageChanged = false;
    },

    // -------------------------------------- //
    // Misc functions                         //
    // -------------------------------------- //
    toggleControls = function () {
        var id = $(this).attr("id");
        switch (id) {
        case "controls-handle":
            if ($controlsPanel.is(':visible')) {
                $controlsPanel.hide();
            } else {
                $controlsPanel.show();
            }
            break;
        case "outline-handle":
            toggleOutlineView();
            break;
        default:
            logit("unexpected element clicked");
        }
    },

    toggleControlsEnabled = function () {
        var designIsVisible = $('#design-view').is(':visible');

        // Enable/Disable all palette items "draggable" feature
        $('.nrc-palette-widget').draggable('option', 'disabled',
                                           !designIsVisible);
    },

    fixPropertyPanelSize = function () {
       // Nasty hack to ensure the Property Panel maintains a 40% sizing
       $propertiesPanel.height(($controlsPanel.height()*0.4));
    },

    fixOutlinePanelSize = function () {
       // Nasty hack to ensure the Outline Panel maintains 100% height
       $('#outline-panel').height(($controlsPanel.height()));
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
        // use a JQM template at startup
        createNewPage($admDesign,"JQM");

        getDefaultHeaders();
        getDesignHeaders();

        doc = $designContentDocument[0];
        doc.open();
        contents = serializeFramework($admDesign);
        doc.writeln(contents);
        doc.close();

        ADM.setDesignRoot($admDesign);
    },

    designViewNodeRenderer = function (admNode, domNode) {
        if (!domNode) {
            return;
        }

        // Attach the ADM UID to the element as an attribute so the DOM-id can
        // change w/out affecting our ability to index back into the ADM tree
        // XXX: Tried using .data(), but default jQuery can't select on this
        //      as it's not stored in the element, but rather in $.cache...
        //      There exist plugins that add the ability to do this, but they
        //      add more code to load and performance impacts on selections
        $(domNode).attr('data-uid',admNode.getUid());

        // Add a special (temporary) class used by the JQM engine to
        // easily identify the "new" element(s) added to the DOM
        $(domNode).addClass('nrc-dropped-widget');

        // NOTE: if we bring back non-link buttons, we may need this trick
        // Most buttons can't be dragged properly, so we put them behind
        // the associated span, which can be dragged properly
        // if (!isLinkButton(admNode))
        //     $(domNode).css("z-index", "-1");

        $(domNode).addClass('adm-node');

        // If this node is "selected", make sure it's class reflects this
        if (admNode.isSelected()) {
            $(domNode).addClass('ui-selected');
        }

        // If this node is a "container", make sure it's class reflects this
        if (admNode.isContainer() || admNode.getType() === 'Header') {
            $(domNode).addClass('nrc-sortable-container');
            if (admNode.getChildrenCount() === 0) {
                $(domNode).addClass('nrc-empty');
            } else {
                $(domNode).removeClass('nrc-empty');
            }
        }
    },

    serializeADMDesignToDOM = function () {
        if ($admDesign === undefined) {
            $admDesign = ADM.getDesignRoot();
        }

        // Special Case... Only remove "pages" not other divs
        $designContentDocument.find('body > div[data-role="page"]').remove();
        serializeADMSubtreeToDOM($admDesign, null, designViewNodeRenderer);
    },

    serializeADMNodeToDOM = function (node, domParent) {
        var uid, type, pid, selector,
            parentSelector = 'body',
            parentNode = null,
            template, props, id,
            selMap = {},  // maps selectors to attribute maps
            attrName, attrValue, propDefault,
            widget, regEx, wrapper;

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
        selector = '.adm-node[data-uid=\''+uid+'\']';

        if (!node.instanceOf('Page') && !node.instanceOf('Design')) {
            pid = node.getParent().getUid();
            parentSelector = '.adm-node[data-uid=\''+pid+'\']';
        }

        // Find the parent element in the DOM tree
        if (domParent) {
            parentNode = $(domParent);
        } else {
            parentNode = $designContentDocument.find(parentSelector);
        }

        // Find the parent element of this node in the DOM tree
        if (parentNode === undefined || parentNode === null ||
            parentNode.length < 1) {
            // No sense adding it to the DOM if we can't find it's parent
            console.info(parentSelector+' not found in Design View');
        }

        // 2. Remove this node in existing document, if it exists
        $(selector,parentNode).remove();

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

        // The ADMNode.getProperties() call will trigger a modelUpdated
        // event due to any property being set to autogenerate
        node.suppressEvents(true);
        node.getDesign().suppressEvents(true);

        blockModelUpdated = true;
        props = node.getProperties();
        id = node.getProperty('id');
        blockModelUpdated = false;

        if (typeof template === "function") {
            widget = template(node);
        }
        else {
            if (typeof template === "object") {
                template = template[props["type"]];
            }

            // Apply any special ADMNode properties to the template before we
            // create the DOM Element instance
            for (var p in props) {
                attrValue = node.getProperty(p);

                switch (p) {
                case "type":
                    break;
                default:
                    attrName = BWidget.getPropertyHTMLAttribute(type, p);
                    if (attrName) {
                        propDefault = BWidget.getPropertyDefault(type, p);

                        if (attrValue !== propDefault ||
                            BWidget.getPropertyForceAttribute(type, p)) {
                            selector = BWidget.getPropertyHTMLSelector(type, p);
                            if (!selector) {
                                // by default apply attributes to first element
                                selector = ":first";
                            }

                            if (!selMap[selector]) {
                                // create a new select map entry
                                selMap[selector] = {};
                            }

                            // add attribute mapping to corresponding selector
                            selMap[selector][attrName] = attrValue;
                        }
                    }
                    break;
                }

                if (typeof attrValue === "string" ||
                    typeof attrValue === "number") {
                    // reasonable value to substitute in template
                    regEx = new RegExp('%' + p.toUpperCase() + '%', 'g');
                    if(typeof attrValue === "string") {
                        attrValue = attrValue.replace(/&/g, "&amp;");
                        attrValue = attrValue.replace(/"/g, "&quot;");
                        attrValue = attrValue.replace(/'/g, "&#39;");
                        attrValue = attrValue.replace(/</g, "&lt;");
                        attrValue = attrValue.replace(/>/g, "&gt;");
                    }
                    template = template.replace(regEx, attrValue);
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
        }

        $(parentNode).append(widget);

        node.getDesign().suppressEvents(false);
        node.suppressEvents(false);

        return widget;
    },

    serializeADMSubtreeToDOM = function (node, domParent, renderer) {
        var isContainer = false,
            domElement;

        // 1. Only handle ADMNodes
        if (!(node instanceof ADMNode)) {
            return;
        }

        isContainer = (node.getChildrenCount() !== 0);

        // 2. Do something with this node
        domElement = serializeADMNodeToDOM(node, domParent);
        if (renderer !== null && domElement !== null) {
            renderer(node, domElement);
        }

        domElement = domElement || domParent;

        // 3. Recurse over any children
        if (isContainer) {
            var children = node.getChildren();
            for (var i=0; i<children.length; i++) {
                serializeADMSubtreeToDOM(children[i], domElement, renderer);
            }
        }

        // 4. Return (anything?)
        return;
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
    refreshCodeViewPreview = function () {
        var doc = previewWindow.document;
        resultHTML = generateHTML();
        $('#text-code').val(resultHTML);
        doc.open();
        doc.writeln(resultHTML);
        doc.close();
        $("#preview-frame").load( function () {
            if (ADM.getActivePage())
                setPreviewPage(ADM.getActivePage().getProperty('id'));
        });
        // Fixes PTSDK-130: Block right-click context menu in preview iframe
        $(doc).bind('contextmenu', function(e) { e.preventDefault(); });
    },

    isInDesignView = function (el) {
        var left = $designView.offset().left,
            right = left + $designView.width(),
            elCenter = $(el).offset().left + $(el).width()/2;
        return (elCenter >= left && elCenter <= right);
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
                        node = null;
                    // Prevent drops outside the Design View
                    if (!isInDesignView(ui.helper)) {
                        $(ui.draggable).draggable("option", { revert: true });
                        return false;
                    } else {
                        node = addChildRecursive(pid, t);
                        if (!node) {
                            $(ui.draggable).draggable("option",{revert:true});
                        } else {
                            $(ui.draggable).draggable("option",{revert:false});
                            ADM.setSelected(node.getUid());
                        }
                    }
                }
            });
    },

    serializeFramework = function () {
        var start = '<!DOCTYPE html>\n <html><head><title>Page Title</title>\n',
            end = "</head>\n<body>\n</body>\n</html>", ret;

        if ($designHeaders && $designHeaders.length > 0) {
            ret = start + $designHeaders.join('\n') + end;
        } else {
            ret = start + end;
        }

        return ret;
    },

    generateHTML = function () {
        var doc = constructNewDocument($defaultHeaders);

        serializeADMSubtreeToDOM(ADM.getDesignRoot(),
                                 $(doc).find('body'),
                                 null); // No renderer used here
        return style_html(xmlserializer.serializeToString(doc),
                          {
                              'max_char': 80, 
                              'unformatted': ['a', 'h1', 'script', 'title']
                          });
    },

    // ------------------------------------------------ //
    // Make the contents of the design view "malleable" //
    // ------------------------------------------------ //
    templateLoadDoneCallback = function () {
        // Initial "kick" to dump the ADM to the DOM
        serializeADMDesignToDOM();
        triggerDesignViewReload();
        refreshDropTargets();
        refreshCodeViewPreview();

        //-------------------------------------------- //
        // Populate outline panel of the builder UI    //
        // -------------------------------------------- //
        loadOutline($outlinePanel);

        // Make sure to keep the outline panel height sized
        // appropriately and updated after every window resize
        fixOutlinePanelSize();
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

    showDesignView = function () {
        $('#design-view').show(0, toggleControlsEnabled);
        $('#code-area').hide();
        $('#preview-frame-wrapper').hide();
        $("#designView").find("span").html("&#x2022;");
        $("#codeView").find("span").html("&nbsp;");
        $("#preView").find("span").html("&nbsp;");
        $("#devices-sub-menu").hide();

        // Make sure selected node is visible on show
        $designContentDocument.find('.ui-selected:first').each(function () {
            this.scrollIntoViewIfNeeded();
        })
    },

    showCodeView = function () {
        $('#code-area').height($('#content-panel').height());
        $('#design-view').hide(0, toggleControlsEnabled);
        $('#code-area').show();
        $('#preview-frame-wrapper').hide();
        $("#designView").find("span").html("&nbsp;");
        $("#codeView").find("span").html("&#x2022;");
        $("#preView").find("span").html("&nbsp;");
        $("#devices-sub-menu").hide();
    },

    showPreView = function () {
        $('#preview-frame-wrapper').height($('#content-panel').height());
        $('#design-view').hide(0, toggleControlsEnabled);
        $('#code-area').hide();
        $('#preview-frame-wrapper').show();
        $("#designView").find("span").html("&nbsp;");
        $("#codeView").find("span").html("&nbsp;");
        $("#preView").find("span").html("&#x2022;");
        $("#devices-sub-menu").show();
    },

    toggleOutlineView = function() {
        var item = $("#outlineView").find("span");
        if ($outlinePanel.filter(":visible").length) {
            item.html("&nbsp;");
        } else {
            item.html("&#x2713;");
        }
        $outlinePanel.toggle();
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

    addNewPage = function () {
        // Open page picker dialog to select a page template
        initPageTemplatePicker($admDesign);
        updatePageZone();
    },

    deleteCurrentPage = function () {
        var currentPage = ADM.getActivePage();
        if (currentPage !== null && (!(currentPage instanceof ADMNode) ||
                                    currentPage.getType() !== "Page")) {
            logit("Warning: tried to remove an invalid  page");
            return false;
        }
        //if current page is the last page, we will create a new page which
        //has the same template as current one
        if ($admDesign.getChildren().length === 1) {
            var newPage = createNewPage($admDesign, "last");
            if (!newPage) {
                logit("Warning: create new page failed");
                return false;
            }
        }

        //delete Current Page node from design
        ADM.removeChild(currentPage.getUid());
        //active the first page from left pages
        ADM.setActivePage($admDesign.getChildren()[0]);
        updatePageZone();
        return true;
    },

    initPageZone = function () {
        var contents = $('<div id="page_content"></div>')
                       .addClass('ui-widget')
                       .appendTo('#toolbar-panel');
    },

    updateActivePage = function() {
        var id, list, activePage = ADM.getActivePage();
        id = activePage.getProperty('id');
        list = $("#pages-menu");
        list.find('a[id="showpage-' + id + '"] span').
            html("&#x2022;");
        list.find('a[id!="showpage-' + id + '"] span').
            html("&nbsp;");
    },

    updatePageZone = function () {
        var divider, list, source, pageItem, html, activePage, id, pages, p;
        divider = $("#page-divider");
        list = $("#pages-menu");
        source = $("#pages-menu :first").clone(true, true);
        source.find("a").removeClass("ui-state-hover");

        // clear current page list
        divider.prevAll().remove();

        pages = ADM.getDesignRoot().getChildren();

        for (p in pages) {
            id = pages[p].getProperty('id');
            pageItem = source.clone(true, true);
            pageItem.find("a")
                .attr("id", "showpage-" + id)
                .attr("adm-uid", pages[p].getUid())
                .find("label")
                .text("Show Page: " + id);
            pageItem.insertBefore(divider);
        }

        updateActivePage();
    },

    initBreadcrumb = function () {
        $('<div id="breadcrumb"></div>')
            .addClass('ui-widget')
            .appendTo('#toolbar-panel');
        ADM.bind("selectionChanged", updateBreadcrumb);
        ADM.bind("activePageChanged", updateBreadcrumb);
        updateBreadcrumb(null);
    },

    lastSelected = null,
    updateBreadcrumb = function (e) {
        var crumbs = [], ancestors = [],
            current = null,
            target = null,
            pageSelected = false;

        if (e === null || e.node === null) {
            current = ADM.getDesignRoot().findNodeByUid(ADM.getSelected());
            if (current === null || current === undefined) {
                current = ADM.getActivePage();
                if (current === null || current === undefined) {
                    return; // Nothing to show!
                }
            }
        } else {
            current = e.node || e.page;
            if (current === null || current === undefined) {
                return; // Nothing to show!
            }
        }
        target = current;

        if (current.instanceOf('Page', false)) {
            pageSelected = true;
        }

        while (current !== null && current !== undefined) {
            if (current.isSelectable() ||
                current.instanceOf('Page', false)) {
                crumbs.push(current);
            }
            current = current.getParent();
        }

        crumbs = crumbs.reverse();

        if (target.getChildrenCount() > 0) {
            // If lastSelected is a child of the new target
            // use it's ancestry branch as the breadcrumb path
            // FIXME: Convert to "ADMNode.isAncestorOf(UID)" for efficiency
            if (lastSelected && target.findNodeByUid(lastSelected.getUid())) {
                current = lastSelected;
                // Iterate over the ancestors of lastSelected, adding
                // them to the path, until we reach the selection target
                while (current !== target) {
                    if (current.isSelectable()) {
                        ancestors.push(current);
                    }
                    current = current.getParent();
                }
                crumbs = crumbs.concat(ancestors.reverse());
                // Iterate over the descendants of lastSelected, adding
                // them to the path, until we reach a "leaf" node
                current = lastSelected.getChildren()[0];
                while (current !== null && current !== undefined) {
                    if (current.isSelectable()) {
                        crumbs.push(current);
                    }
                    current = current.getChildren()[0];
                }
            } else {
                current = target.getChildren()[0];
                // Special case, when deciding which child tree to show,
                // prefer non-empty Content nodes and subtrees
                if (target.instanceOf('Page', false)) {
                    target.foreach( function (node) {
                        if (node.instanceOf('Content', false) &&
                            node.getChildrenCount() > 0) {
                            current = node;
                        }
                    });
                }
                while (current !== null && current !== undefined) {
                    if (current.isSelectable()) {
                        crumbs.push(current);
                    }
                    current = current.getChildren()[0];
                }
            }
        }

        $('#breadcrumb').empty();
        crumbs.forEach( function (entry, index, array) {
            var button = $('<button></button>'),
                state = 'ui-state-default',
                chain = null;

            if (entry.isSelected() ||
                (entry.instanceOf('Page', false) && pageSelected)) {
                state = 'ui-state-active';
                lastSelected = entry;
            }

            button.text(entry.getType())
                  .data('adm-node', entry)
                  .removeClass('button')
                  .addClass('ui-widget-header ' + state)
                  .appendTo('#breadcrumb')
                  .click( function () {
                      var node = $(this).data('adm-node');
                      console.log(node.getType()+' clicked');
                      if (node && node.isSelected()) {
                          return; // Already selected, nothing to do
                      }
                      while (node && !ADM.setSelected(node.getUid())) {
                          node = node.getParent();
                      }
                      if (node === null) {
                          ADM.setSelected(null);
                      }
                  });

            if (index !== array.length-1) {
                if (!chain) {
                    chain = $('<div></div>');
                    chain.addClass('breadcrumb-separator')
                         .addClass('ui-icon ui-icon-arrow-1-e')
                         .appendTo('#breadcrumb');
                } else {
                    chain.clone().appendTo('#breadcrumb');
                }
            }
        });
    },

    initPageTemplatePicker = function(design) {
        if (!design.instanceOf("Design")) {
            console.log("Warning: only design node can add new page");
            return null;
        }

        var pageTemplateDialog, newPage,
            ptNames = ['JQM',
            'blank'];

        $("#page-dialog").remove();
        pageTemplateDialog= $('<div id="page-dialog">' +
                              '<p>please select page Template you want to create:' +
                              '</p></div>');
        // Create the selection form
        pageTemplateDialog.append('<form><fieldset>' +
                                  '<label for="picker">Page Template</label>' +
                                  '<select name="ptpicker" id="ptpicker"></select>' +
                                  '</fieldset></form>')
                          .appendTo('body');

        // Insert the list of templates
        for (var t in ptNames) {
            var id = ptNames[t];
            $('<option id="'+ id +'" value="' + id + '">'+ id + '</option>')
                .appendTo('#ptpicker',pageTemplateDialog);
        }

        // Now turn this into a jq-ui dialog
        pageTemplateDialog.dialog({
            autoOpen: false,
            modal: true,
            title: 'Page Template Picker',
            buttons: {
                "OK": function() {
                    //get selected value
                    var pageType=$("#ptpicker").find("option:selected").text();
                    newPage = createNewPage(design, pageType);
                    if (!newPage) {
                        console.log("Warning: create new page failed");
                    }
                    ADM.setActivePage(newPage);
                    $(this).dialog("close");
                },
                Cancel: function() {
                    $(this).dialog("close");
                }
            }
        });
        pageTemplateDialog.dialog("open");
    },

    initThemePicker = function () {
        var themeDialog = $('<div id="theme-dialog"></div>'),
            themeNames = ['blitzer',
                          'cupertino',
                          'dark-hive',
                          'dot-luv',
                          'flick',
                          'humanity',
                          'le-frog',
                          'mint-choc',
                          'overcast',
                          'pepper-grinder',
                          'redmond',
                          'smoothness',
                          'start',
                          'sunny',
                          'swanky-purse',
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
    // Force window to "resize" to ensure the property and palette panes
    // get correctly positioned and sized after layout completes
    $(window).resize( function() {
        fixPropertyPanelSize();
        fixOutlinePanelSize();
    });
    $(window).trigger('resize');
});
