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

(function( $ ){
    var originDataMethod = $.data;
    $.data = function (elem, name, data, pvt) {
        if ( (name === "sortable") && !data)
            return getOwnerWindow(elem).$.data(elem, name, data, pvt);
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
