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
            node = window.parent.ADM.getDesignRoot().findNodeByUid(pageId),
            currentPage = window.parent.ADM.getActivePage();

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
    $('div:jqmData(role="page")').live('pagebeforecreate', function(e) {
        // Configure "select" handlers on all nodes added from the ADM
        // except for pages and content
        $('.adm-node').click( function (e) {
            if ($(this).data('role') === 'content' ||
                $(this).data('role') === 'page') {
                setSelected(null);
            } else if (!$(this).hasClass('ui-selected')) {
                setSelected(this);
            } else if (e.ctrlKey) {
                setSelected(null);
            }
            e.stopPropagation();
            return false;  // Stop event bubbling
        });

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
                cancel: '> :not(.adm-node)',
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
                    console.log('sortable:stop() on "'+this.id+'"');
                    if (ui.item) {
                        var idx = ui.item.index(),
                            cid = $(ui.item).attr('data-uid'),
                            pid = $(ui.item).parent().attr('data-uid'),
                            msg = 'childMoved:',
                            off = $(ui.item).parent().children().length -
                                  $(ui.item).parent().find('.adm-node').length;

                        // Account for possible non-ADM children in the parent
                        idx = idx-off;
                        console.log(ui.item[0].id+' @ '+idx);

                        // Notify the ADM that element has been moved
                        moveChild(cid, pid, idx);
                        $(ui.item).triggerHandler('click');
                    } else {
                        console.warn('ui.item undefined after sort...');
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

    // Allow for deletion of selected widget
    $(document).keyup(function(e) {
        if (e.which === 46) {
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

    function moveChild(child, parent, index) {
        var adm = window.parent.ADM,
            bw = window.parent.BWidget,
            root, node, zones,
            oldZone, oldIndex, oldParent,
            newZone, newIndex, newParent;

        root = adm.getDesignRoot();
        newParent = root.findNodeByUid(parent);
        zones = bw.getZones(newParent.getType());

        if ((zones.length === 1 && zones[0].cardinality !== '1') ||
            (newParent.getType() === 'Header')) {
            node = root.findNodeByUid(child);
            oldParent = node.getParent();
            oldZone = node.getZone();
            newIndex = index;

            if (oldParent.getUid() === newParent.getUid()) {
                console.log('Moving node '+node.getUid()+
                      ' with in its parent to position '+newIndex);
                top.moveADMNode(node, zones[0], newIndex);
            } else {
                console.log('Moving node '+node.getUid()+
                      ' from old parent('+oldParent.getUid()+
                      ') to new parent('+newParent.getUid()+
                      ') at position '+newIndex);
                top.reparentADMNode(node, newParent, zones[0], newIndex);
            }
        }
    }
});
