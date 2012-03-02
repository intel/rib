/*
 * gui-builder - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
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
        elem[1] =  function (event, ui) {
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
       elem[1] =  function (event, ui) {

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
            /////////////////////////////////////////////////////////////////
            // Start of our changes
            var dragDocOffsetInSortWin = getOffsetInWindow(inst.element[0].ownerDocument.documentElement, getOwnerWindow(this.instance.element[0]));
			this.instance.positionAbs = {top:inst.positionAbs.top + dragDocOffsetInSortWin.top, left: inst.positionAbs.left + dragDocOffsetInSortWin.left};
            // End of our changes
			this.instance.helperProportions = inst.helperProportions;
			this.instance.offset.click = inst.offset.click;
			
			if(this.instance._intersectsWith(this.instance.containerCache)) {
                /////////////////////////////////////////////////////////////////
                // Start of our changes
                event.pageX += dragDocOffsetInSortWin.left;
                event.pageY += dragDocOffsetInSortWin.top;
                // End of our changes

				//If it intersects, we use a little isOver variable and set it once, so our move-in stuff gets fired only once
				if(!this.instance.isOver) {

					this.instance.isOver = 1;
					//Now we fake the start of dragging for the sortable instance,
					//by cloning the list group item, appending it to the sortable and using it as inst.currentItem
					//We can then fire the start event of the sortable with our passed browser event, and our own helper (so it doesn't create a new one)
					this.instance.currentItem = $(self).clone().removeAttr('id').appendTo(this.instance.element).data("sortable-item", true);
					this.instance.options._helper = this.instance.options.helper; //Store helper option to later restore it
					this.instance.options.helper = function() { return ui.helper[0]; };

					event.target = this.instance.currentItem[0];
					this.instance._mouseCapture(event, true);
					this.instance._mouseStart(event, true, true);

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

        /////////////////////////////////////////////////////////////////
        // Start of our changes
        m[i].offset = getOffsetInWindow(m[i].element[0], getOwnerWindow((t.currentItem || t.element)[0]));
        /////////////////////////////////////////////////////////////////
        // End of our changes
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
