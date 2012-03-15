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

// Fixes PTSDK-130: Block right-click context menu in design-view iframe
if (!top.$.gb.debug())
    $(document).bind('contextmenu', function(e) { e.preventDefault(); });

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

    // Attempt to add child, walking up the tree until it
    // works or we reach the top
    var addChildRecursive = function (parentId, type, dryrun) {
        var adm = window.top.ADM, node;

        if (parentId && type) {
            node = adm.addChild(parentId, type, dryrun);
            if (!node) {
                var parent = adm.getDesignRoot().findNodeByUid(parentId),
                    gParent = parent.getParent();
                if (gParent) {
                    return addChildRecursive(gParent.getUid(), type, dryrun);
                } else {
                    return node;
                }
            }
        }
        return node;
    };

    var dndfilter = function (el) {
        var o = top.$.gb && top.$.gb.layoutView &&
                top.$(':gb-layoutView').layoutView('option'),
            f = (o)?o.contentDocument:$(document),
            a = (o)?o.model:window.top.ADM,
            t, s = {}, id;

        // Must have a model (ADM) in order to filter
        if (!a) {
            console.warning('Filter failure: No model.');
            return s;
        }

        // Must have an active page in order to filter
        if (!a.getActivePage()) {
            console.warning('Filter failure: No active page.');
            return s;
        }

        id = a.getActivePage().getProperty('id');

        // Determine the widget Type being dragged
        t = el.data('adm-node') && el.data('adm-node').type;
        t = t || a.getDesignRoot().findNodeByUid(el.attr('data-uid')).getType();

        if (!t) {
            console.warning('Filter failure: No widget type.');
            return s;
        }

        // Find all sortables (and page) on the active page
        f = f.find('#'+id);
        s = f.find('.nrc-sortable-container').andSelf();

        // Filter out those that will not accept this widget
        return s.filter( function(index) {
            var uid = $(this).attr('data-uid');
            return uid && a.canAddChild(uid, t);
        });
    };

    var unmaskNodes = function () {
        // Reset masked states on all nodes on the active page
        $.mobile.activePage.find('.ui-masked, .ui-unmasked').andSelf()
            .removeClass('ui-masked ui-unmasked');
    };

    var applyMasking = function (els) {

        if (els.length <= 0) return;

        // First mark all nodes as blocked
        $(document)
            .find('.adm-node,.orig-adm-node')
            .andSelf()
            .addClass('ui-masked');

        // Then unmark all valid targets
        els.removeClass('ui-masked').addClass('ui-unmasked');

        // Also unmark adm-node descendants of valid targets
        // that are not also children of a masked container
        // - Solves styling issues with nested containers
        $('.ui-unmasked',document).each(function() {
            var that = this, nodes;
            $('.adm-node, .orig-adm-node',this)
                .not('.nrc-sortable-container')
                .each(function() {
                    var rents = $(this).parentsUntil(that,
                          '.nrc-sortable-container.ui-masked');
                    if (!rents.length) {
                        $(this).removeClass('ui-masked')
                               .addClass('ui-unmasked');
                    }
                });
        });
    };

    window.top.$.gb = window.top.$.gb || {};
    window.top.$.gb.dndfilter = dndfilter;

    window.handleSelect = handleSelect;
    window.ADM = window.parent.ADM;
    $('div:jqmData(role="page")').live('pageinit', function(e) {
        var targets,
            debug = (window.top.$.gb && window.top.$.gb.debug()),

            debugOffsets = (debug && window.top.$.gb.debug('offsets')),

            trackOffsets = function (msg, ui, data) {
                var o = ui && ui.offset,
                    p = ui && ui.position,
                    d = data && data.offset,
                    c = d && d.click;

                if (!debugOffsets) return;

                msg = msg || 'offsets:';

                if (o) { msg += '\t| ' + o.left+','+o.top; }
                    else { msg += '\t|       ' }
                if (p) { msg += '\t|' + p.left+','+p.top; }
                    else { msg += '\t|       ' }
                if (d) { msg += '\t|' + d.left+','+d.top; }
                    else { msg += '\t|       ' }
                if (c) { msg += '\t|' + c.left+','+c.top; }
                    else { msg += '\t|       ' }

                console.log(msg);
            };


        // Unbind *many* event handlers generated by jQM:
        // - Most we don't need or want to be active in design view
        // - Some we do (collapsible "expand" and "collapse" for example
        $.fn.subtree = function (s) {
            s = s || '*';
            if ($(this).is(s)) {
                return $(this).find(s).andSelf();
            } else {
                return $(this).find(s);
            }
        };
        $(e.target).subtree().add(document)
            .unbind('click vmousedown vmousecancel vmouseup vmouseover focus'
                  + ' vmouseout blur mousedown touchmove');

        $(e.target).subtree('.adm-node:not(.delegation),.orig-adm-node').each(
        function (index, node) {
            var admNode, widgetType, delegate, events,
                delegateNode,
                adm = window.parent.ADM,
                bw = window.parent.BWidget;

            delegateNode = $(node);
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
                } else if (widgetType === 'Block') {
                    delegateNode = $('data-uid='+admNode.getParent().getUid());
                }

                // Move the adm-node class to the delegateNode and assign
                // data-uid to it so that in sortable.stop we can always get
                // it from ui.item.
                if (node !== delegateNode[0]) {
                    $(node).addClass('orig-adm-node');
                    $(node).removeClass('adm-node');
                    delegateNode.addClass('adm-node');
                    if (widgetType !== 'Block') {
                        delegateNode.addClass('delegation');
                        delegateNode.attr('data-uid', $(node).attr('data-uid'));
                    }
                }

                // Configure "select" handler
                delegateNode.click( function(e) {
                    return handleSelect(e, this);
                });

                if (events) {
                    $(node).bind(events);
                }
            }
        });

        // Configure "sortable" behaviors
        targets = $(e.target).subtree('.nrc-sortable-container,body .ui-page');

        debug && console.log("Found ["+targets.length+"] sortable targets: ");

        targets
            .sortable({
                distance: 5,
                forceHelperSize: true,
                forcePlaceholderSize: true,
                placeholder: 'ui-sortable-placeholder',
                tolerance: 'pointer',
                appendTo: 'body',
                connectWith:
                    '.ui-page > .adm-node.ui-sortable:not(.ui-masked),' +
                    '.ui-page > .orig-adm-node.ui-sortable:not(.ui-masked)',
                cancel: '> :not(.adm-node,.orig-adm-node)',
                items: '> *.adm-node:not(.ui-header,.ui-content,.ui-footer),' +
                    '> *.orig-adm-node:not(.ui-header,.ui-content,.ui-footer)',
                start: function(event, ui){
                    trackOffsets('start:   ',ui,$(this).data('sortable'));

                    // Only filter and mask if the item is not a draggable,
                    // which happens when coming from the palette.
                    if (ui.item && ui.item.data('draggable')) {
                        return;
                    }

                    $('.ui-sortable.ui-state-active')
                        .removeClass('ui-state-active');
                    $(this).addClass('ui-state-active');

                    applyMasking($('.ui-sortable-connected'));
                },
                over: function(event, ui){
                    $('.ui-sortable.ui-state-active')
                        .removeClass('ui-state-active');
                    $(this).addClass('ui-state-active');
                    trackOffsets('over:    ',ui,$(this).data('sortable'));

                    if (ui && ui.placeholder) {
                        var s = ui.placeholder.siblings('.adm-node:visible,' +
                                                      '.orig-adm-node:visible'),
                            p = ui.placeholder.parent();
                        if (p.hasClass('ui-content')) {
                            ui.placeholder.css('width', p.width());
                        } else if (p.hasClass('ui-header')) {
                            if (s.length && s.eq(0).width()) {
                                ui.placeholder.css('width', s.eq(0).width());
                                ui.placeholder.css('display',
                                                   s.eq(0).css('display'));
                            } else {
                                ui.placeholder.css('width', '128px');
                            }
                        } else if (s.length && s.eq(0).width()) {
                            ui.placeholder.css('width', s.eq(0).width());
                            ui.placeholder.css('display',
                                               s.eq(0).css('display'));
                        } else {
                            ui.placeholder.css('width', p.width());
                        }
                    }
                },
                out: function(event, ui){
                    $(this).removeClass('ui-state-active');
                    trackOffsets('out:     ',ui,$(this).data('sortable'));
                },
                stop: function(event, ui){
                    trackOffsets('stop:    ',ui,$(this).data('sortable'));
                    var type, isDrop,
                        pid = $(this).attr('data-uid'),
                        node = null,
                        adm = window.parent.ADM,
                        bw = window.parent.BWidget,
                        root = adm.getDesignRoot(),
                        node, zones, newParent, newZone,
                        rdx, idx, cid, pid, sid,
                        sibling, children, parent,
                        role;

                    role = $(this).attr('data-role') || '';

                    // Reset masked states on all nodes on the active page
                    unmaskNodes();

                    function childIntersects(that) {
                        var intersects = false,
                            s = $(that).find(':data(sortable)')
                                       .not('.ui-sortable-helper');
                        s.each( function(i) {
                            var inst = $.data(this, 'sortable');
                            // Find contained sortables with isOver set
                            if (inst.isOver) {
                                intersects = true;
                                return false;
                            }
                        });
                        return intersects;
                    };

                    $(this).removeClass('ui-state-active');

                    if (!ui.item) return;

                    isDrop = ui.item.hasClass('nrc-palette-widget');

                    // Fix PTSDK-501: Only drop on active page
                    if (role && role === 'page' && adm.getActivePage()) {
                        if (adm.getActivePage().getUid() !== Number(pid)) {
                            if (isDrop) {
                                $(ui.item).draggable('cancel');
                            } else {
                                $(this).sortable('cancel');
                            }
                            ui.item.remove();
                            return false;
                        }
                    }

                    // Let child containers get the drop if they intersect
                    if (childIntersects(this)) {
                        if (isDrop) {
                            $(ui.item).draggable('cancel');
                        } else {
                            $(this).sortable('cancel');
                        }
                        ui.item.remove();
                        return false;
                    }

                    // Drop from palette: add a node
                    if (isDrop) {
                        if (ui.item.data('adm-node')) {
                            type = ui.item.data('adm-node').type;
                        }

                        if (!type) {
                            console.warn('Drop failed: Missing node type');
                            ui.item.remove();
                            return false;
                        }

                        children = $(this).children('.adm-node')
                                          .add(ui.item);
                        idx = children.index(ui.item);

                        // Append first(only)/last child to this container
                        if (idx >= children.length-1 || role === 'page') {
                            if (adm.addChild(pid, type, true)) {
                                node = adm.addChild(pid, type);
                                debug && console.log('Appended node',role);
                                if (node) adm.setSelected(node.getUid());
                            } else {
                                console.warn('Append child failed:',role);
                            }
                        } else if (idx > 0) {
                            // Insert nth child into this container
                            sibling = $(ui.item, this).prev('.adm-node');
                            sid = sibling.attr('data-uid');
                            if (adm.insertChildAfter(sid, type, true)) {
                                node = adm.insertChildAfter(sid, type);
                                debug && console.log('Inserted nth node',role);
                                if (node) adm.setSelected(node.getUid());
                            } else {
                                console.warn('Insert nth child failed:',role);
                            }
                        } else {
                            // Add 1st child into an empty container
                            if (children.length-1 <= 0) {
                                if (adm.addChild(pid, type, true)) {
                                    node = adm.addChild(pid, type);
                                    debug && console.log('Added 1st node',role);
                                    if (node) adm.setSelected(node.getUid());
                                } else {
                                    console.warn('Add 1st child failed:',role);
                                }
                            } else {
                                // Insert 1st child into non-empty container
                                sibling = $(this).children('.adm-node:first');
                                sid = sibling.attr('data-uid');
                                if (adm.insertChildBefore(sid, type, true)) {
                                    node = adm.insertChildBefore(sid, type);
                                    debug && console.log('Inserted 1st node',
                                                         role);
                                    if (node) adm.setSelected(node.getUid());
                                } else {
                                    console.warn('Insert 1st child failed:',
                                                 role);
                                }
                            }
                        }
                        ui.item.remove();
                        return;

                    // Sorted from layoutView: move a node
                    } else {
                        idx = ui.item.parent().children('.adm-node')
                                              .index(ui.item);
                        cid = ui.item.attr('data-uid');
                        pid = ui.item.parent().attr('data-uid');
                        node = root.findNodeByUid(cid);
                        newParent = root.findNodeByUid(pid);
                        zones = bw.getZones(newParent.getType());

                        // Notify the ADM that element has been moved
                        if ((zones && zones.length===1 &&
                                      zones[0].cardinality!=='1')) {
                            if (!node ||
                                !adm.moveNode(node, newParent, zones[0],
                                              idx)) {
                                console.warn('Move node failed');
                                ui.item.remove();
                                return false;
                            } else {
                                debug && console.log('Moved node');
                                if (node) adm.setSelected(node.getUid());
                            }
                        } else if (node && newParent &&
                                   newParent.getType() === 'Header') {
                            for (var z=0; z < zones.length; z++) {
                                if (adm.moveNode(node, newParent, zones[z],
                                    0, true)) {
                                    newZone = zones[z];
                                    break;
                                }
                            }
                            if (newZone) {
                                adm.moveNode(node, newParent, newZone, 0);
                                debug && console.log('Moved node');
                                if (node) adm.setSelected(node.getUid());
                            } else {
                                console.warn('Move node failed');
                                ui.item.remove();
                                return false;
                            }
                        } else {
                            console.warn('Move node failed: invalid zone');
                            ui.item.remove();
                            return false;
                        }
                    }
                }
            })
            .bind('mousedown.composer', function(event) {
                var n = event && event.target &&
                        $(event.target).closest('.adm-node,.orig-adm-node'),
                    d = n.length && dndfilter(n);
                if (event && event.button !== 0) return false;

                $('.ui-sortable-connected')
                    .removeClass('ui-sortable-connected');
                d.addClass('ui-sortable-connected');
                $(this).sortable('option','connectWith',
                    '.ui-sortable-connected')
                $(this).sortable('refresh')

                return true;
            })
            .disableSelection();

        // Fixup "Collapsible" to make the content div be marked as empty,
        // not it's toplevel element
        $(e.target).subtree('.ui-collapsible.empty').each (function () {
            $(this).removeClass('empty')
                   .find('.ui-collapsible-content')
                       .addClass('empty');
        });

        var inputs = targets.find('input');
        $(inputs).disableSelection();
    });

    $('div:jqmData(role="page")').live('pageshow', function(e) {
        // Make sure selected node is visible on pageinit
        $('.ui-selected:first').each(function () {
            $.mobile.silentScroll($(this).offset().top);
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
        switch (e.data) {
            case 'reload':
                reloadPage();
                break;
            case 'refresh':
                refreshPage();
                break;
            default:
                console.warn('Unknown request: '+e.data);
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
