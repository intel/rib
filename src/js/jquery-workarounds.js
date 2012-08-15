/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Portions of this file are copied from original jQuery UI sources also
 * included in this project (see lib/jquery-ui-1.8.16.custom.js) and the
 * unmodified lines from those files retain their original copyright:
 *
 *   "Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 *    Dual licensed under the MIT or GPL Version 2 licenses.
 *    http://jquery.org/license"
 */

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
                return offset;
            }
        }
    }
};


/*
 * FIXME: This is a workaround for a flaw in jQuery-ui connectToSortable plugin
 *        for draggable widget not dealing with iframes
 *
 * We override the connectToSortable drag function so that it calculates offset
 * correctly even if the draggable and sortable are in diffrent frames.
 *
 * Copied from jquery-ui version 1.8.16, ui/jquery.ui.draggable.js
 */
$.map($.ui['draggable'].prototype.plugins['start'], function (elem, index) {
    if (elem[0] === 'connectToSortable') {
        elem[1] = function (event, ui) {
            var inst = $(this).data("draggable"), o = inst.options,
                uiSortable = $.extend({}, ui, { item: inst.element });
            inst.sortables = [];
            if (o.filter && typeof o.filter === "function") {
                o.connectToSortable = o.filter.call(inst.element[0]) || [];
            }
            if (!o.connectToSortable || o.connectToSortable.length <= 0) {
                return;
            }
            $(o.connectToSortable).each(function() {
                var sortable = $.data(this, 'sortable');
                if (sortable && !sortable.options.disabled) {
                    inst.sortables.push({ instance: sortable,
                                          shouldRevert: sortable.options.revert
                                        });
                    // Call the sortable's refreshPositions at drag start to
                    // refresh the containerCache since the sortable container
                    // cache is used in drag and needs to be up to date (this
                    // will ensure it's initialised as well as being kept in
                    // step with any changes that might have happened on the
                    // page).
                    sortable.refreshPositions();
                    sortable._trigger("activate", event, uiSortable);
                }
            });
        }
    }
    return elem;
});
$.map($.ui['draggable'].prototype.plugins['drag'], function (elem, index) {
    if (elem[0] === 'connectToSortable') {
        elem[1] = function (event, ui) {

            var inst = $(this).data("draggable"), self = this;

            var checkPos = function(o) {
                var dyClick = this.offset.click.top, dxClick = this.offset.click.left;
                var helperTop = this.positionAbs.top, helperLeft = this.positionAbs.left;
                var itemHeight = o.height, itemWidth = o.width;
                var itemTop = o.top, itemLeft = o.left;

                return $.ui.isOver(helperTop + dyClick, helperLeft + dxClick, itemTop, itemLeft, itemHeight, itemWidth);
            };

            $.each(inst.sortables, function(i) {

                //Copy over some variables to allow calling the sortable's native _intersectsWith

                ////////////////////////////////////////////////////////////////
                // Start of RIB changes
                var dragDocOffsetInSortWin = getOffsetInWindow(inst.element[0].ownerDocument.documentElement, getOwnerWindow(this.instance.element[0])),
                    thisSortable = this,
                    isInnerMostSortable = false;
                this.instance.positionAbs = {top:inst.positionAbs.top + dragDocOffsetInSortWin.top, left: inst.positionAbs.left + dragDocOffsetInSortWin.left};
                event.pageX += dragDocOffsetInSortWin.left;
                event.pageY += dragDocOffsetInSortWin.top;
                // End of RIB changes
                ////////////////////////////////////////////////////////////////

                this.instance.helperProportions = inst.helperProportions;
                this.instance.offset.click = inst.offset.click;

                if(this.instance._intersectsWith(this.instance.containerCache)) {
                    ////////////////////////////////////////////////////////////
                    // Start of RIB changes
                    //To avoid creating multiple placeholders, we only fake the
                    //innermost sortable
                    isInnerMostSortable = true;
                    $.each(inst.sortables, function () {
                        var dragDocOffsetInSortWin = getOffsetInWindow(inst.element[0].ownerDocument.documentElement, getOwnerWindow(this.instance.element[0]));
                        this.instance.positionAbs = {top:inst.positionAbs.top + dragDocOffsetInSortWin.top, left: inst.positionAbs.left + dragDocOffsetInSortWin.left};

                        this.instance.helperProportions = inst.helperProportions;
                        this.instance.offset.click = inst.offset.click;
                        if  (this != thisSortable
                             && this.instance._intersectsWith(this.instance.containerCache)
                             && $.ui.contains(thisSortable.instance.element[0], this.instance.element[0]))
                            isInnerMostSortable = false;
                        return isInnerMostSortable;
                    });
                }

                if(isInnerMostSortable) {
                    // End of RIB changes
                    ////////////////////////////////////////////////////////////

                    //If it intersects, we use a little isOver variable and set it once, so our move-in stuff gets fired only once
                    if(!this.instance.isOver) {

                        this.instance.isOver = 1;
                        //Now we fake the start of dragging for the sortable instance,
                        //by cloning the list group item, appending it to the sortable and using it as inst.currentItem
                        //We can then fire the start event of the sortable with our passed browser event, and our own helper (so it doesn't create a new one)

                        ////////////////////////////////////////////////////////
                        // Start of RIB changes
                        var currentItem = this.instance.currentItem = $(self).clone().removeAttr('id').appendTo(this.instance.element).data('sortable-item', true);
                        $.each(self.data(), function (n, v) {
                            if (n !== $.expando)
                                currentItem.data(n, v);
                        });
                        // End of RIB changes
                        ////////////////////////////////////////////////////////

                        this.instance.options._helper = this.instance.options.helper; //Store helper option to later restore it
                        this.instance.options.helper = function() { return ui.helper[0]; };

                        event.target = this.instance.currentItem[0];
                        this.instance._mouseCapture(event, true);
                        this.instance._mouseStart(event, true, true);

                        ////////////////////////////////////////////////////////
                        // Start of RIB changes
                        // To trigger the over and change event properly, we
                        // should set the current container to null
                        this.instance.currentContainer = null;
                        // End of RIB changes
                        ////////////////////////////////////////////////////////

                        //Because the browser event is way off the new appended portlet, we modify a couple of variables to reflect the changes
                        this.instance.offset.click.top = inst.offset.click.top;
                        this.instance.offset.click.left = inst.offset.click.left;
                        this.instance.offset.parent.left -= inst.offset.parent.left - this.instance.offset.parent.left;
                        this.instance.offset.parent.top -= inst.offset.parent.top - this.instance.offset.parent.top;

                        inst._trigger("toSortable", event);
                        inst.dropped = this.instance.element; //draggable revert needs that
                        //hack so receive/update callbacks work (mostly)
                        inst.currentItem = inst.element;
                        this.instance.fromOutside = inst;

                    }

                    //Provided we did all the previous steps, we can fire the drag event of the sortable on every draggable drag, when it intersects with the sortable
                    if(this.instance.currentItem) this.instance._mouseDrag(event);

                } else {

                    //If it doesn't intersect with the sortable, and it intersected before,
                    //we fake the drag stop of the sortable, but make sure it doesn't remove the helper by using cancelHelperRemoval
                    if(this.instance.isOver) {

                        this.instance.isOver = 0;
                        this.instance.cancelHelperRemoval = true;

                        //Prevent reverting on this forced stop
                        this.instance.options.revert = false;

                        // The out event needs to be triggered independently
                        this.instance._trigger('out', event, this.instance._uiHash(this.instance));

                        this.instance._mouseStop(event, true);
                        this.instance.options.helper = this.instance.options._helper;

                        //Now we remove our currentItem, the list group clone again, and the placeholder, and animate the helper back to it's original size
                        this.instance.currentItem.remove();
                        if(this.instance.placeholder) this.instance.placeholder.remove();

                        inst._trigger("fromSortable", event);
                        inst.dropped = false; //draggable revert needs that
                    }

                };

                ////////////////////////////////////////////////////////////////
                // Start of RIB changes
                //We should restore our changes to event
                event.pageX -= dragDocOffsetInSortWin.left;
                event.pageY -= dragDocOffsetInSortWin.top;
                // End of RIB changes
                ////////////////////////////////////////////////////////////////
            });

        }
    }
    return elem;
});



(function( $ ){
    var originDataMethod = $.data;
    $.data = function (elem, name, data, pvt) {
        if ( (name === "sortable") && !data && getOwnerWindow(elem) !== window)
            return getOwnerWindow(elem).jQuery.data(elem, name, data, pvt);
        else
            return originDataMethod(elem, name, data, pvt);
    };
})( jQuery );

// Copied from blog post on 2012-01-11 by Anatoly Mironov,
// http://sharepointkunskap.wordpress.com/2012/01/11/get-url-parameters-with-javascript/
if (!window.location.getParameter ) {
    window.location.getParameter = function(key) {
        function parseParams() {
            var params = {},
                e,
                a = /\+/g,  // Regex for replacing addition symbol with a space
                r = /([^&=]+)=?([^&]*)/g,
                d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
                q = window.location.search.substring(1);

            while (e = r.exec(q))
                params[d(e[1])] = d(e[2]);

            return params;
        }

        if (!this.queryStringParams)
            this.queryStringParams = parseParams();

        return this.queryStringParams[key];
    };
}

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

        ////////////////////////////////////////////////////////////////////////
        // Start of RIB changes
        m[i].offset = getOffsetInWindow(m[i].element[0], getOwnerWindow((t.currentItem || t.element)[0]));
        // End of RIB changes
        ////////////////////////////////////////////////////////////////////////
    }
};


$.widget("ui.droppable", $.extend({}, $.ui.droppable.prototype, {
    _drop: function(event,custom) {

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
                ////////////////////////////////////////////////////////////////
                // Start of RIB changes
                // This is the original line
                // && $.ui.intersect(draggable, $.extend(inst, { offset: inst.element.offset() }), inst.options.tolerance)
                // This is our line
                    && $.ui.intersect(draggable, inst, inst.options.tolerance)
                // End of RIB changes
                ////////////////////////////////////////////////////////////////
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
/*
 * FIXME: This is an enhencement for the sortable plugin in jQuery-ui to better
 *        support nested sortables
 *
 * We override the _contactContainers function so that it uses the item with
 * lowest distance bettween the mouse pointer and each of its borders to rearrange,
 * the direction of which is determined by the mouse postion relative to the
 * item, with the exception when the mouse pointer intersects with the item
 * or distance is zero, in which case mouse moving direction is used.
 * Also we use this algorithm to rearrange even when currentContainer is not
 * changed to override the defective rearranging in _mouseDrag
 *
 * Copied from jquery-ui version 1.8.16, ui/jquery.ui.draggable.js
 */
$.widget("ui.sortable", $.extend({}, $.ui.sortable.prototype, {
    _contactContainers: function(event) {

        // get innermost container that intersects with item
        var innermostContainer = null, innermostIndex = null, direction, intersection;


        for (var i = this.containers.length - 1; i >= 0; i--){


            // never consider a container that's located within the item itself
            if($.ui.contains(this.currentItem[0], this.containers[i].element[0]))
                continue;


            if(intersection = this._intersectsWithPointer(this.containers[i].containerCache)) {
                direction = intersection == 1 ? "down" : "up";

                // if we've already found a container and it's more "inner" than this, then continue
                if(innermostContainer && $.ui.contains(this.containers[i].element[0], innermostContainer.element[0]))
                    continue;

                innermostContainer = this.containers[i];
                innermostIndex = i;
            } else {
                // container doesn't intersect. trigger "out" event if necessary
                if(this.containers[i].containerCache.over) {
                    this.containers[i]._trigger("out", event, this._uiHash(this));
                    this.containers[i].containerCache.over = 0;
                }
            }

        }

        // if no intersecting containers found, return
        if(!innermostContainer) return;

        // move the item into the container if it's not there already
        if(this.containers.length === 1) {
            this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
            this.containers[innermostIndex].containerCache.over = 1;
        } else {

            //When entering a new container, we will find the item with the least distance and append our item near it
            var dist = 10000; var itemWithLeastDistance = null;
            var posProperty = this.containers[innermostIndex].floating ? 'left' : 'top';
            var sizeProperty = this.containers[innermostIndex].floating ? 'width' : 'height';
            var base = this.positionAbs[posProperty] + this.offset.click[posProperty];
            for (var j = this.items.length - 1; j >= 0; j--) {
                if(!$.ui.contains(this.containers[innermostIndex].element[0], this.items[j].item[0])) continue;
                var cur = this.items[j][posProperty];
                if(Math.abs(cur - base) > Math.abs(cur + this.items[j][sizeProperty] - base))
                    cur += this.items[j][sizeProperty];

                if(Math.abs(cur - base) < dist) {
                    dist = Math.abs(cur - base); itemWithLeastDistance = this.items[j];
                    if(!this._intersectsWithPointer(itemWithLeastDistance) && base != cur)
                    {
                        this.direction =  base > cur ? "up": "down";
                    }
                    else
                        this.direction = direction;
                }
            }

            if(!itemWithLeastDistance && !this.options.dropOnEmpty) //Check if dropOnEmpty is enabled
                return;

            this.currentContainer = this.containers[innermostIndex];
            itemWithLeastDistance ? this._rearrange(event, itemWithLeastDistance, null, true) : this._rearrange(event, null, this.containers[innermostIndex].element, true);
            this._trigger("change", event, this._uiHash());
            this.containers[innermostIndex]._trigger("change", event, this._uiHash(this));

            //Update the placeholder
            this.options.placeholder.update(this.currentContainer, this.placeholder);

            this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
            this.containers[innermostIndex].containerCache.over = 1;
        }


    },
}));

/*
 * This is an enhencement for jquery.extend, which tries to extend
 * an array field just like an object while deep extending and in some
 * case produces unexpected reuslt. For example, [0, 1, 2] extends by
 * [3] results in [3, 1, 2] instead of [3].
 * See http://bugs.jquery.com/ticket/9477 for more details about this
 * issue.
 *
 * We override jquery.extend function so that a flag can be specified
 * to indicate whether arrays should be replaced or not.
 *
 * Copied from jquery version 1.6.4, jquery-1.6.4.js
 */
jQuery.extend = jQuery.fn.extend = function() {
    var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        replaceArray = false,
        deep = false;

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;

        ////////////////////////////////////////////////////////////////////////
        // Start of RIB changes
        // arguments[1] may be "false" when replaceArray is specified,
        // we shouldn't assign {} to target in this case
        // target = arguments[1] || {};
        target = arguments[1];
        // End of RIB changes
        ////////////////////////////////////////////////////////////////////////

        // skip the boolean and the target
        i = 2;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Start of RIB changes
    // Introduce a new argument to specifiy if we need to replace
    // an array when encountered.
    if ( typeof target === "boolean" ) {
        replaceArray = target;
        target = arguments[2] || {};
        // skip the boolean and the target
        i = 3;
    }
    target = target || {};
    // End of RIB changes
    ////////////////////////////////////////////////////////////////////////////

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
        target = {};
    }

    // extend jQuery itself if only one argument is passed
    if ( length === i ) {
        target = this;
        --i;
    }

    for ( ; i < length; i++ ) {
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];

                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
                    if ( copyIsArray ) {
                        copyIsArray = false;

                        ////////////////////////////////////////////////////////
                        // Start of RIB changes
                        // If replaceArray is true, we use an empty array as
                        // clone so the whole array will be replaced by copy
                        // Following is the original line:
                        // clone = src && jQuery.isArray(src) ? src : [];
                        clone = src && jQuery.isArray(src) && !replaceArray ? src : [];
                        // End of RIB changes
                        ////////////////////////////////////////////////////////

                    } else {
                        clone = src && jQuery.isPlainObject(src) ? src : {};
                    }

                    // Never move original objects, clone them
                    ////////////////////////////////////////////////////////////
                    // Start of RIB changes
                    target[ name ] = jQuery.extend( deep, replaceArray, clone, copy );
                    // End of RIB changes
                    ////////////////////////////////////////////////////////////

                    // Don't bring in undefined values
                } else if ( copy !== undefined ) {
                    target[ name ] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};
