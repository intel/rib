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

// Fixes PTSDK-130: Block right-click context menu in design-view iframe
if (!top.$.rib.debug())
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

        // Stop "Processingbar", which "turns on" at every pageshow event
        if ($('.adm-node[data-role=processingbar]',this).length &&
            $('.adm-node[data-role=processingbar]',this).data().processingbar) {
            $('.adm-node[data-role=processingbar]',this).processingbar('stop');
        }

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
    var isText = function (element) {
        return element && element.type in {text:0, textarea:0};
    };

    var enableEditing = function (element) {
        isText(element) && $(element).removeAttr('readonly');
        element.contentEditable = true;
        $(element).toggleClass('adm-editing');
        $(element).focus();
    };

    var disableEditing = function (element) {
        isText(element) && $(element).attr('readonly', true);
        $(element).removeAttr('contentEditable');
        $(element).toggleClass('adm-editing');
        window.getSelection().removeAllRanges();
        $(element).add(window).unbind('.editing');
    };

    var getTextNodeContents = function (element) {
        if (isText(element)) {
            // Text[area] nodes store string in value, not textContent
            return element.value;
        } else {
            // Only return text of TEXT_NODE elements, not other
            // potential child nodes
            return $(element).contents().filter( function() {
                return (this.nodeType === 3);
            }).text();
        }
    };

    var setTextNodeContents = function (element, string) {
        var children;
        if (isText(element)) {
            // Text[area] nodes need to set value, not textContent
            element.value = string;
        } else {
            // Need to make sure we don't overwrite child nodes, so
            // first, detach them...
            children = $(element).children().detach();
            // next, set the text node string...
            element.textContent = string;
            // finally, re-attach (append) the children...
            $(element).append(children);
        }
    };

    var finishEditing = function (ev) {
        var editable = ev && ev.data && ev.data.isEditable(),
            exitKeys = {9:'TAB',13:'ENTER',27:'ESC'},
            prop, text, elem;

        if (ev && ev.currentTarget === window && ev.type === 'mousedown') {
            elem = $('.adm-editing[contenteditable]', ev.view.document)[0];
        } else {
            elem = ev.target;
        }

        if (!editable || (elem.contentEditable !== 'true') ||
            (ev.type === 'keydown' && !(ev.which in exitKeys))) {
            return true;
        }

        text = getTextNodeContents(elem);
        prop = editable.propertyName;

        // Save and exit edit mode
        if (ev.which === 13 || ev.which === 9 ||
            ev.type === 'focusout' || ev.type === 'mousedown') {
            // Only update if values differ
            if (ev.data.getProperty(prop) !== text) {
                // Attempt to set the ADM property
                if (!ADM.setProperty(ev.data, prop, text).result) {
                    // Revert if setProperty fails
                    setTextNodeContents(elem, ev.data.getProperty(prop));
                }
            }

            // Special case for TAB key
            if (ev.which === 9 && ev.type === 'keydown') {
                ev.view.top.focus();
                ev.stopImmediatePropagation();
                ev.stopPropagation();
                ev.preventDefault();
            }

        // Revert and exit edit mode
        } else if (ev.which === 27 && ev.type === 'keydown') {
            setTextNodeContents(elem, ev.data.getProperty(prop));

        // Do nothing for other keys
        } else {
            return true;
        }

        // Turn off editing...
        disableEditing(elem);
    };

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
        var o = top.$.rib && top.$.rib.layoutView &&
                top.$(':rib-layoutView').layoutView('option'),
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
            return this !== el[0] && !el.find(this)[0]
                   && uid && a.canAddChild(uid, t);
        });
    };

    var unmaskNodes = function () {
        // Reset masked states on all nodes on the active page
        $.mobile.activePage.find('.ui-masked, .ui-unmasked').andSelf()
            .removeClass('ui-masked ui-unmasked');
    };

    var applyMasking = function (els, helper) {

        if (els.length <= 0) return;

        // First mark all nodes as blocked
        $(document)
            .find('.adm-node,.orig-adm-node')
            .andSelf()
            .addClass('ui-masked');

        // Then unmark all valid targets, and any passed helper
        els.add(helper).removeClass('ui-masked').addClass('ui-unmasked');

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

    var adjustMargins = function (p) {
        if (!p.is('.ui-sortable-placeholder')) {
            return;
        }

        if (p.parent().is('.ui-content')) {
            var s = p.siblings(':visible').andSelf();
            // Placeholder is last visible sibling
            if (s.index(p) === s.length-1) {
                p.css({ 'margin-top': '-6px',
                        'margin-bottom': '5px' });
            // Placeholder is first visible sibling
            } else if (s.index(p) === 0) {
                p.css({ 'margin-top': '5px',
                        'margin-bottom': '-6px' });
            } else {
                p.css({ 'margin-top': '-6px',
                        'margin-bottom': '-5px' });
            }
        } else {
            p.css({ 'margin-top': '',
                    'margin-bottom': '' });
        }
    };

    window.top.$.rib = window.top.$.rib || {};
    window.top.$.rib.dndfilter = dndfilter;

    window.handleSelect = handleSelect;
    window.ADM = window.parent.ADM;
    $('div:jqmData(role="page")').live('pageshow', function(e) {
        setTimeout(function(){
            var focusElement = parent.focusElement;
            if (focusElement) {
                focusElement.focus();
            }
        })
    });
    $('div:jqmData(role="page")').live('pageinit', function(e) {
        var targets,
            debug = (window.top.$.rib && window.top.$.rib.debug()),

            debugOffsets = (debug && window.top.$.rib.debug('offsets')),

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
            .unbind('click vmousedown vmousecancel vmouseup vmouseover focus focusin'
                  + ' vmouseout blur mousedown touchmove');

        $(e.target).subtree('.adm-node:not(.delegation),.orig-adm-node').each(
        function (index, node) {
            var admNode, widgetType, delegate, events,
                editable,
                delegateNode,
                adm = window.parent.ADM,
                bw = window.parent.BWidget;

            delegateNode = $(node);
            if (adm && bw) {
                admNode = adm.getDesignRoot()
                    .findNodeByUid($(node).attr('data-uid')),
                editable = admNode && admNode.isEditable(),
                widgetType = admNode && admNode.getType(),
                delegate = widgetType &&
                           bw.getWidgetAttribute(widgetType, 'delegate'),
                events = widgetType &&
                         bw.getWidgetAttribute(widgetType, 'events');

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
                    delegateNode = $('[data-uid='+admNode.getParent().getUid() + ']');
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
                    if (admNode.isSelected() && !admNode.instanceOf('Page')) {
                        $(node).removeClass('ui-selected')
                            .removeClass('ui-selecting')
                            .removeClass('ui-unselecting');

                        $(delegateNode).removeClass('ui-unselecting')
                            .removeClass('ui-selecting')
                            .addClass('ui-selected');
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

        // For nodes marked as "editable", attach double-click and blur handlers
        $(e.target).subtree('.adm-editable').each( function (index, node) {
            var admNode, editable, theNode = node,
                adm = window.parent.ADM,
                bw = window.parent.BWidget;

            if (adm && bw) {
                admNode = adm.getDesignRoot()
                    .findNodeByUid($(node).attr('data-uid')),
                editable = admNode && admNode.isEditable();

                if (editable && typeof(editable) === 'object') {
                    if (editable.selector &&
                        $(editable.selector,node).length) {
                        theNode = $(editable.selector,node)[0];
                    }
                    // LABELs don't cause blur when we focuse them, and they
                    // never match the ':focus' pseudo selector, so we must
                    // wrap their textContents in a span so we can get the
                    // desired focus and tabindex behaviors
                    if (theNode.nodeName === "LABEL") {
                        theNode = $(theNode).wrapInner('<span>').find('span');
                    }
                    $(theNode).addClass('adm-text-content');
                    // Set the tabindex explicitly, and ordered...
                    $(theNode).attr('tabindex','-1');

                    // Bind double-click handler
                    $(node).dblclick(function(e) {
                        var rng= document.createRange && document.createRange(),
                            sel= window.getSelection && window.getSelection(),
                            content, children;

                        if (!admNode.isSelected()) return true;

                        content = $(e.currentTarget)
                                      .subtree('.adm-text-content')[0];

                        // enable editing...
                        enableEditing(content);

                        // pre-select the text contents/value
                        if (content.select) {   // Text input/area
                            content.select();
                        } else if (rng && sel) { // Everything else
                            // Temp. detach children, leaving only TEXT_NODEs.
                            // We need to do this for elements that have no
                            // text themseleves, but do have children that do,
                            // we don't want the descendant TEXT_NODE contents
                            children = $(content).children().detach();
                            rng.selectNodeContents(content);
                            sel.removeAllRanges();
                            sel.addRange(rng);
                            // Re-attach children, if there were any
                            children.length && $(content).append(children);
                        }

                        // Bind to keydown to capture esc, tab and enter keys
                        $(content).bind('keydown.editing focusout.editing',
                                         admNode, finishEditing);

                        // Bind to mousedown on window to handle "focus" changes
                        $(e.view).bind('mousedown.editing',
                                       admNode, finishEditing);

                        e.preventDefault();
                        return true;
                    });
                }
            }
        });

        // Configure "sortable" behaviors
        targets = $(e.target).subtree('.nrc-sortable-container');

        debug && console.log("Found ["+targets.length+"] sortable targets: ");

        targets
            .sortable({
                distance: 5,
                forceHelperSize: true,
                forcePlaceholderSize: true,
                placeholder: 'ui-sortable-placeholder',
                appendTo: 'body',
                helper: 'clone',
                tolerance: "pointer",
                connectWith:
                    '.ui-page .adm-node.ui-sortable:not(.ui-masked),' +
                    '.ui-page .orig-adm-node.ui-sortable:not(.ui-masked)',
                cancel: '> :not(.adm-node,.orig-adm-node)',
                items: '> *.adm-node:not(.ui-header,.ui-content,.ui-footer),' +
                    '> .ui-controlgroup-controls > .adm-node,' +
                    // Collapsible's items are under .ui-collapsible-content
                    '> .ui-collapsible-content > .adm-node,' +
                    '> ul[class*=ui-grid-] > li.adm-node,' +
                    '> div.customHeader > .adm-node,' +
                    '> div > div > a > .adm-node,' +
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

                    //jQuery UI should have done this after hiding current item
                    //and creating placeholder.
                    $(this).sortable('refresh');
                    $.each($(this).data('sortable').containers, function () {
                        this.options.connectWith = '.ui-sortable-connected';
                        this._refreshItems();
                    });
                    $(this).data('sortable')._refreshItems();



                    applyMasking($('.ui-sortable-connected'), ui.helper);
                    adjustMargins(ui.placeholder);
                },
                change: function(event, ui){
                    trackOffsets('change:  ',ui,$(this).data('sortable'));

                    adjustMargins(ui.placeholder);
                },
                sort: function(event, ui){
                    // Workaround a jQuery UI bug which doesn't take scrollTop
                    // into accounting when checking if mouse is near top or
                    // bottom of the sortable
                    var s = $(this).data('sortable'), sP = s.scrollParent;
                    if(sP[0] != document && sP[0].tagName != 'HTML') {
                        s.overflowOffset.top = sP.offset().top+sP[0].scrollTop;
                        // Hackish solution to cheat jquery UI so that
                        // horizontal scroll will never happen. Note that we
                        // can't use axis:'x' to solve the problem, as it
                        // tolltaly forbid horizontal moving, which will cause
                        // some problems, e.g, moving widgets to right blocks
                        // of Grid will be impossible
                        s.overflowOffset.left = sP.offsetWidth/2
                            - s.options.scrollSensitivity;
                    }

                    targets.removeClass('ui-state-active');
                    // The highlighted container should always be where the
                    // placeholder is located
                    ui.placeholder.closest('.nrc-sortable-container')
                        .addClass('ui-state-active');
                },
                over: function(event, ui){
                    trackOffsets('over:    ',ui,$(this).data('sortable'));

                    if ($(this).is('.nrc-sortable-container.ui-collapsible'))
                        $(this).trigger('expand');
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
                    trackOffsets('out:     ',ui,$(this).data('sortable'));
                },
                stop: function(event, ui){
                    trackOffsets('stop:    ',ui,$(this).data('sortable'));
                    var isDrop,
                        pid = $(this).attr('data-uid'),
                        adm = window.parent.ADM,
                        root = adm.getDesignRoot(),
                        nodeRef, newParent, newNode,
                        cid, pid,
                        sibling, children, parent,
                        role, prevItem = ui.item, nextItem = ui.item;

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
                    if (isDrop) {
                        if (ui.item.data('adm-node')) {
                            nodeRef = ui.item.data('adm-node').type;
                        }

                        if (!nodeRef) {
                            console.warn('Drop failed: Missing node type');
                            ui.item.remove();
                            return false;
                        }
                    }
                    else {
                        cid = ui.item.attr('data-uid');
                        // closest() will select current element if it matches
                        // the selector, so we start with its parent.
                        nodeRef = cid && root.findNodeByUid(cid);
                        if (event && event.ctrlKey) {
                            nodeRef = adm.copySubtree(nodeRef);
                        }
                    }

                    while (prevItem[0] || nextItem[0]) {
                        prevItem = prevItem.prev('.adm-node');
                        if (prevItem[0] && (newNode = adm.insertChildAfter
                                (prevItem.attr('data-uid'), nodeRef)))
                            break;
                        nextItem = nextItem.next('.adm-node');
                        if (nextItem[0] && (newNode = adm.insertChildBefore
                                (nextItem.attr('data-uid'), nodeRef)))
                            break;
                    }
                    if (!prevItem[0] && !nextItem[0]) {
                        pid = ui.item.parent()
                                     .closest('.adm-node.ui-sortable,'+
                                              '.orig-adm-node.ui-sortable')
                                     .attr('data-uid');
                        newParent = pid && root.findNodeByUid(pid);
                        if (!(newNode = adm.addChild(newParent, nodeRef))) {
                            if (isDrop) {
                                ui.item.remove();
                                return true;
                            }
                            return false;
                        }
                    }
                    if (newNode)
                        adm.setSelected(newNode);
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
        setTimeout(function(){
            var focusElement = parent.window.focusElement;
            if (focusElement) {
                parent.window.$(focusElement).focus();
            }
        });
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
        var aPage, pageNode;
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
        aPage = top.ADM.getActivePage();
        if (aPage) {
            pageNode = $('#' + aPage.getProperty('id'));
            if (pageNode.length) {
                $.mobile.changePage(pageNode);
            } else {
                // TODO: this is okay when last page is deleted, so
                //       maybe this warning can be removed
                console.warn("No such page found: ",
                             aPage.getProperty('id'));
            }
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

        // Force focus
        window.getSelection().removeAllRanges();
        var foo = $('.adm-text-content', item)[0] || window.top;
        var bar = $(':focus')[0] || document.activeElement;
        $(foo).focus();
        $(bar).blur();

        if (item) {
            adm.setSelected($(item).attr('data-uid'));
        } else {
            adm.setSelected(adm.getActivePage());
        }
    }
});
