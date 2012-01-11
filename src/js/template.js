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

// In order to get the very first instance of page change events,
// the bind must occur in the jQM mobileinit event handler
$(document).bind('mobileinit', function() {
    $.mobile.defaultPageTransition = 'none';
    $.mobile.loadingMessage = false;

    // Make sure to sync up the ADM anytime the page changes in jQM
    $('div').live('pageshow', function(e) {
        var pageId = $(this).data('uid'),
            node = (window.parent !== window)?window.parent.ADM.getDesignRoot().findNodeByUid(pageId):null,
            currentPage = (window.parent !== window)?window.parent.ADM.getActivePage():null;

        // No change so do nothing
        if (currentPage && currentPage.getUid() === pageId) {
            return;
        }

        if (node) {
            window.parent.ADM.setActivePage(node);
        }
    });
});

$(function() {
    var handleSelect = function (e, ui){
        if ($(ui).data('role') === 'content' ||
            $(ui).data('role') === 'page') {
            setSelected(null);
        } else if (!$(ui).hasClass('ui-selected')) {
            setSelected(ui);
        } else if (e.ctrlKey) {
            setSelected(null);
        }
        e.stopPropagation();
        return false;  // Stop event bubbling
    }
    window.handleSelect = handleSelect;
    $('div:jqmData(role="page")').live('pagebeforecreate', function(e) {

        // Configure "sortable" behaviors
        var targets = $('.nrc-sortable-container');
        console.log("Found ["+targets.length+"] sortable targets: ");

        targets
            .sortable({
                distance: 5,
                iframeFix: true,
                greedy: true,
                forceHelperSize: true,
                forcePlaceholderSize: true,
                placeholder: 'nrc-dragging',
                appendTo: 'body',
                connectWith: '.nrc-sortable-container',
                cancel: '> :not(.adm-node),select',
                items: '> *.adm-node',
                // TODO: add connectWith option to allow movement into
                //       other sortables
                start: function(event, ui){
                    var stylesToCopy = [
                            'width', 'height',
                            'padding-top', 'padding-left',
                            'padding-right', 'padding-bottom',
                            'margin-top', 'margin-left',
                            'margin-right', 'margin-bottom',
                            'border-top-left-radius',
                            'border-top-right-radius',
                            'border-bottom-left-radius',
                            'border-bottom-right-radius'],
                        attrMap = {};
                    console.log('sortable:start() on "'+this.id+'"');
                    if (ui.placeholder) {
                        // Try our best to make the placeholder occupy the
                        // same space as the Element that it represents
                        if (ui.item) {
                            $.each(stylesToCopy, function (key, val) {
                                attrMap[val] = ui.item.css(val);
                            });
                            $(ui.placeholder).css(attrMap);
                        }
                    }
                },
                stop: function(event, ui){
                    var adm = window.parent.ADM,
                        bw = window.parent.BWidget,
                        root = adm.getDesignRoot(),
                        node, zones, newParent,
                        idx, cid, pid;
                    console.log('sortable:stop() on "'+this.id+'"');
                    if (ui.item) {
                        idx = $(ui.item).parent().children('.adm-node')
                                                 .index(ui.item),
                        cid = $(ui.item).attr('data-uid'),
                        pid = $(ui.item).parent().attr('data-uid');
                        node = root.findNodeByUid(cid);
                        newParent = root.findNodeByUid(pid);
                        zones = bw.getZones(newParent.getType());

                        console.log(ui.item[0].id+' @ '+idx);

                        // Notify the ADM that element has been moved
                        if ((zones.length===1 && zones[0].cardinality!=='1') ||
                            (newParent.getType() === 'Header')) {
                            if (!node.moveNode(newParent, zones[0], idx)) {
                                $(this).sortable('cancel');
                            } else {
                                $(ui.item).triggerHandler('click');
                            }
                        } else {
                                $(this).sortable('cancel');
                        }
                    } else {
                        console.warn('ui.item undefined after sort...');
                        $(this).sortable('cancel');
                    }
                },
            })
            .disableSelection();

        var inputs = targets.find('input');
        $(inputs).disableSelection();

        // Populate empty nodes with a "hint" to drop things there
        $('.nrc-empty').each( function() {
            if ($('.nrc-hint-text', this).length === 0) {
                $(this).append('<p class="nrc-hint-text">Drop target...</p>');
            }
        });
    });
    $('div:jqmData(role="page")').live('pageinit', function(e) {
        $('.adm-node').each ( function (index, node) {
            var admNode, widgetType, delegate, events,
                delegateNode = $(node),
                adm = window.parent.ADM,
                bw = window.parent.BWidget;

            if (adm && bw) {
                admNode = adm.getDesignRoot()
                             .findNodeByUid($(node).attr('data-uid')),
                widgetType = admNode.getType(),
                delegate = bw.getWidgetAttribute(widgetType, 'delegate'),
                events = bw.getWidgetAttribute(widgetType, 'events');

                if (delegate) {
                   if (typeof delegate === "function") {
                      delegateNode = delegate($(node), admNode);
                   } else {
                       switch (delegate){
                           case "next":
                               delegateNode =  $(node).next();
                               break;
                           case "grandparent":
                               delegateNode =  $(node).parent().parent();
                               break;
                           case "parent":
                               delegateNode =  $(node).parent();
                               break;
                           default:
                               delegateNode = $(node);
                       }
                   }
               }

               // Move the adm-node class to the delegateNode and assign
               // data-uid to it so that in sortable.stop we can always get
               // it from ui.item.
               $(node).removeClass('adm-node');
               delegateNode.addClass('adm-node');
               delegateNode.attr('data-uid', $(node).attr('data-uid'));

               // Configure "select" handler
               delegateNode.click( function(e) {
                   return handleSelect(e, this);
               });

               if (events) {
                   $(node).bind(events);
               }
            }
        });
    });


    // Allow for deletion of selected widget
    $(document).keyup(function(e) {
        if (e.which === 46) {
            $('.ui-selected').each( function () {
                var id = $(this).attr('data-uid');
                window.parent.ADM.removeChild(id);
            });
        }
    });
    // Watch our parent document also
    $(top.document).keyup(function(e) {
        if (e.which === 46 && !$(this.activeElement).is('input')) {
            $('.ui-selected').each( function () {
                var id = $(this).attr('data-uid');
                window.parent.ADM.removeChild(id);
            });
        }
    });


    function messageHandler(e) {
        console.log('iframe received message "'+e.data+'"');

        switch (e.data) {
            case 'reload':
                reloadPage();
                break;
            case 'refresh':
                refreshPage();
                break;
            default:
                console.log('Unknown request: '+e.data);
                break;
        }
    }

    window.addEventListener('message', messageHandler, false);

    function reloadPage() {
        $('.nrc-dropped-widget').each( function () {
            // Hide the hint text
            $(this).parent().children('.nrc-hint-text').remove();

            // Remove this class to prevent "create"ing more than once
            $(this).removeClass('nrc-dropped-widget');

            // TODO: Add better and more complete handling of this
            // Disable Text widgets so they are selectable but not editable
            if (this.nodeName == "INPUT" && this.type == "text") {
                this.readOnly=true;
            }
        });
        var aPage = top.ADM.getActivePage();
        if (aPage) {
            $.mobile.changePage($('#' + aPage.getProperty('id')));
        } else {
            $.mobile.initializePage();
        }
    }

    function refreshPage() {
        $('.nrc-dropped-widget').each( function () {
            // Hide the hint text
            $(this).parent().children('.nrc-hint-text').fadeOut();

            // Force jQM to call the init on the dropped widget
            // letting it determined styling, not us!
            $(this).closest('.ui-page').page();

            // Remove this class to prevent "create"ing more than once
            $(this).removeClass('nrc-dropped-widget');

            // TODO: Add better and more complete handling of this
            // Disable Text widgets so they are selectable but not editable
            if (this.nodeName == "INPUT" && this.type == "text") {
                this.readOnly=true;
            }
        });
    }

    function setSelected(item) {
        var selectedItems = $('.ui-selected'),
            adm = window.parent.ADM;
        /*
           In the context of this "onclick()" handler, the following
           rules are being applied:

           IF any items are selected THEN
               DESELECT all of them
           SELECT the clicked item

           TODO: Figure out how we want to UNSELECT all without making
                 any selection, or by making "click" toggle the items
                 selection state
         */

        if (selectedItems.length) {
            // Mark all selectees as unselect{ed,ing}
            $(selectedItems).removeClass('ui-selected')
                            .removeClass('ui-selecting')
                            .removeClass('ui-unselecting');
        }

        // Mark this selectee element as being selecting
        $(item).removeClass('ui-unselecting')
               .removeClass('ui-selecting')
               .addClass('ui-selected');

        adm.setSelected((item?$(item).attr('data-uid'):item));
    }
});
