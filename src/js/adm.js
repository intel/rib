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

var ADMEvent = {
    _lastEventId: 0
};

/**
 * Base class for objects that support sending ADM events.
 *
 * @class
 */
var ADMEventSource = {
    _admEvents: {},
    _suppressEvents: 0,

    /**
     * Adds named event to list of known event types for this object,
     * initialized with no event listeners.
     *
     * @param {String} name The name of the event.
     */
    addEventType: function (name) {
        this._admEvents[name] = [];
    },

    /**
     * Binds the given handler function to be called whenever the named event
     * occurs on this object.
     *
     * @param {String} name The name of the event.
     * @param {Function} handler Handler function to be called on this event.
     *                           The function should expect event and data
     *                           arguments.
     * @param {Any} data Any data or object to be passed to the handler.
     * @see ADMEventSource.unbind
     */
    bind: function (name, handler, data) {
        if (typeof name !== "string") {
            console.error("Error: called bind with a non-string event name");
            return;
        }
        var eventType = this._admEvents[name];
        if (eventType === undefined) {
            console.error("Error: bind did not find event type " + name);
            return;
        }
        eventType.push({ handler: handler, data: data });
    },

    /**
     * Removes binding to handler function. If handler is undefined, removes
     * all handlers for the named event. If handler is defined but data is
     * undefined, removes any bindings to that handler regardless of data. If
     * data is also specified, removes only the bindings with that data.
     *
     * @param {String} name The name of the event.
     * @param {Function} handler Handler function previously passed to bind().
     * @param {Any} data Any data or object previously passed to the handler.
     * @return {Number} The number of event handlers that were removed.
     * @see ADMEventSource.bind
     */
    unbind: function (name, handler, data) {
        var removed = 0, listeners, i;
        if (typeof name !== "string") {
            console.error("Error: called unbind with a non-string event name");
            return removed;
        }
        listeners = this._admEvents[name];
        if (listeners) {
            for (i = listeners.length - 1; i >= 0; i--) {
                if (handler === undefined ||
                    (listeners[i].handler === handler &&
                     (data === undefined) || (listeners[i].data === data))) {
                    listeners.splice(i, 1);
                    removed++;
                }
            }
        }
        return removed;
    },

    /**
     * Fires named event from this object, with extra properties set in data.
     *
     * @param {String} name The name of the event.
     * @param {Object} data Object with properties to include in the event.
     * @see ADMEventSource.bind
     * @see ADMEventSource.unbind
     */
    fireEvent: function (name, data) {
        var listeners, event, i, length;
        if (this._suppressEvents > 0) {
            return;
        }

        listeners = this._admEvents[name];
        if (listeners === undefined) {
            console.error("Error: fireEvent did not find event type " + name);
            return;
        }

        event = {
            id: ++ADMEvent._lastEventId,
            name: name
        };
        for (i in data) {
            if (data.hasOwnProperty(i)) {
                event[i] = data[i];
            }
        }

        length = listeners.length;
        for (i = 0; i < length; i++) {
            listeners[i].handler(event, listeners[i].data);
        }
    },

    /**
     * Suppresses events from this event source. Each call with a true argument
     * must be matched with a call with a false argument before events will
     * be sent again.
     *
     * @param {Boolean} flag True to suppress events, false to stop suppressing
     *                       events.
     */
    suppressEvents: function (flag) {
        if (flag) {
            this._suppressEvents++;
        } else {
            if (this._suppressEvents > 0) {
                this._suppressEvents--;
            }
        }
    }
};

/**
 * Global object to access the ADM.
 *
 * @class
 * @extends ADMEventSource
 */
var ADM = {
    _design: null,
    _activePage: null,
    _selection: null,
    _undoStack: [],
    _redoStack: [],
    _clipboard: null,
    _transaction: null,

    init: function () {
        // copy event functions from ADMEventSource
        var i;
        for (i in ADMEventSource) {
            /*jslint forin: true */
            this[i] = ADMEventSource[i];
        }
    }
};
ADM.init();

/**
 * Event sent by the ADM object when the design it is managing is
 * replaced, such as after loading a design from a file.
 *
 * @name ADM#designReset
 * @event
 * @param {Object} event Object including standard "id" and "name"
 *                       properties, as well as a
 *                         "design" property set to the new design
 *                                  ADMNode, or null.
 * @param {Any} data The data you supplied to the bind() call.
 * @see ADMEventSource.bind
 * @see ADMEventSource.unbind
 */
ADM.addEventType("designReset");

/**
 * Event sent by the ADM object when the active page changes. When the
 * design is reset, the active page is set to null automatically.
 *
 * @name ADM#activePageChanged
 * @event
 * @param {Object} event Object including standard "id" and "name"
 *                       properties, as well as a
 *                         "page"    property set to the new page ADMNode,
 *                                   or null, and a
 *                         "oldPage" property set to the old page.
 * @param {Any} data The data you supplied to the bind() call.
 * @see ADMEventSource.bind
 * @see ADMEventSource.unbind
 */
ADM.addEventType("activePageChanged");

/**
 * Event sent by the ADM object when the selected widget changes. When
 * the active page changes, the selected widget is set to null
 * automatically.
 *
 * @name ADM#selectionChanged
 * @event
 * @param {Object} event Object including standard "id" and "name"
 *                       properties, as well as a
 *                         "node" property set to the new selected
 *                                ADMNode, or null if none, and a
 *                         "uid"  property set to the UID of that node,
 *                                or null.
 * @param {Any} data The data you supplied to the bind() call.
 * @see ADMEventSource.bind
 * @see ADMEventSource.unbind
 */
ADM.addEventType("selectionChanged");

/**
 * Gets the singleton design root.
 *
 * @return {ADMDesign} The root design object.
 */
ADM.getDesignRoot = function () {
    if (!ADM._design) {
        ADM.setDesignRoot(new ADMNode("Design"));
    }
    return ADM._design;
};

/**
 * Sets the singleton design root. Sends a "designReset" event if
 * design changed.
 *
 * @param {ADMDesign} design The root design object.
 * @return {Boolean} True if the design root was actually changed.
 */
ADM.setDesignRoot = function (design) {
    var children, page;
    if (!(design instanceof ADMNode) || design.getType() !== "Design") {
        console.warn("Warning: tried to set invalid design root");
        return false;
    }

    if (ADM._design !== design) {
        ADM._design = design;
        ADM.setActivePage(null);  // this will also setSelected(null)

        // ensure a design always has a page
        children = ADM._design.getChildren();
        if (children.length === 0) {
            page = new ADMNode("Page");
            ADM._design.addChild(page);
        } else {
            page = children[0];
        }

        ADM._undoStack = [];
        ADM._redoStack = [];

        ADM.fireEvent("designReset", { design: design });
        ADM.setActivePage(page);
        return true;
    }
    return false;
};

/**
 * Gets the active page in the design.
 *
 * @return {ADMPage} The active page, or null if none.
 */
ADM.getActivePage = function () {
    return ADM._activePage;
};

/**
 * Sets the active page in the design. Sends an "activePageChanged" event
 * if the page changed.
 *
 * @param {ADMPage} page The active page, or null if none.
 * @return {Boolean} True if the active page was set successfully.
 */
ADM.setActivePage = function (page) {
    var oldPage;
    if (page !== null && (!(page instanceof ADMNode) ||
                          page.getType() !== "Page")) {
        console.warn("Warning: tried to set an invalid active page");
        return false;
    }

    if (ADM._activePage !== page) {
        oldPage = ADM._activePage;
        ADM._activePage = page;
        ADM.setSelected(page);
        ADM.fireEvent("activePageChanged", { page: page, oldPage: oldPage });
        return true;
    }
    return false;
};

/**
 * Not intended as a public API.
 * Returns an ADMNode given various different inputs. Useful for handling a
 * function argument and allowing it to be either a UID or an actual node.
 * Note: If a UID is given, it will only be found if it is in the current ADM
 * design root's tree, whereas if a node is given, it will be returned,
 * regardless of whether it is even parented.
 *
 * @private
 * @param {Various} nodeRef The UID of a widget (as a number or string), or the
 *                          node itself.
 * @return {ADMNode} The referenced node, or null if given null, or undefined
 *                   if either node not found or invalid input given.
 */
ADM.toNode = function (nodeRef) {
    var node = nodeRef;

    if (node === null) {
        return null;
    }

    if (typeof nodeRef === "number" || typeof nodeRef === "string") {
        node = ADM.getDesignRoot().findNodeByUid(Number(nodeRef));
    }

    if (node instanceof ADMNode) {
        return node;
    }

    return undefined;
}

/**
 * Gets the primary selected widget UID.
 *
 * @return {Number} The UID of the selected widget, or null if none.
 */
ADM.getSelected = function () {
    return ADM._selection ? ADM._selection.getUid() : null;
};

/**
 * Gets the primary selected widget node.
 *
 * @return {ADMNode} The selected widget node, or null if none.
 */
ADM.getSelectedNode = function () {
    return ADM._selection;
};

/**
 * Sets the primary selected widget. Sends a "selectionChanged" event if the
 * selection actually changes.
 *
 * @param {Various} nodeRef The UID of the selected widget (as a number or
 *                          string), or the actual ADMNode, or null if no
 *                          selection.
 * @return {Boolean} True if the selection was set successfully.
 * @throws {Error} If node is invalid.
 */
ADM.setSelected = function (nodeRef) {
    var uid = null, node = ADM.toNode(nodeRef), page = node;
    if (node === undefined) {
        console.warn("Warning: new selected widget not found");
        return false;
    }

    if (node) {
        if (node.getDesign() !== ADM.getDesignRoot()) {
            console.warn("Warning: selected node not found in design");
            return false;
        }
        if (!node.isSelectable()) {
            return false;
        }

        uid = node.getUid();
    }

    while (page && page.getType() !== "Page")
        page = page.getParent();
    if (page)
        ADM.setActivePage(page);

    if (ADM._selection !== node) {
        ADM._selection = node;
        ADM.fireEvent("selectionChanged", { node: node, uid: uid });
        return true;
    }
    return false;
};

/**
 * Initiates an atomic transaction from the user's point of view, that may
 * involve more than one change to the the ADM. The initial usage is when the
 * user deletes the last page and we automatically replace it with a new one.
 * Using startTransaction and endTransaction, the remove and add can be treated
 * atomically, so if undo/redo occurs on this operation they will be rolled
 * back or performed again together.
 *
 * @return {None}
 */
ADM.startTransaction = function () {
    if (!this._transaction) {
        this._transaction = { count: 1 };
        this.transaction({
            type: "begin"
        });
    } else {
        this._transaction.count++;
    }
}

/**
 * Completes an atomic transaction from the user's point of view, that may
 * have involved more than one change to the the ADM. If the user then clicks
 * Undo, the entire transaction will be rolled back in response.
 *
 * @return {None}
 */
ADM.endTransaction = function () {
    if (!this.transaction) {
        throw new Error("No transaction found in endTransaction");
    }

    this._transaction.count--;
    if (this._transaction.count === 0) {
        this._transaction = null;
        this.transaction({
            type: "end"
        });
    }
}

/**
 * Add a child of the given type to parent.
 * Using this high-level API records the action as user-visible and part of the
 * undo/redo stacks.
 *
 * @param {Various} parentRef The UID of the parent widget (as a number or
 *                            string), or the actual ADMNode.
 * @param {ADMNode/String} childRef Either an ADMNode or a string type of a node
 *                                  to create.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {ADMNode} The child object, on success; null, on failure.
 */
ADM.addChild = function (parentRef, childRef, dryrun) {
    var parent, child;

    parent = ADM.toNode(parentRef);
    if (!parent) {
        console.warn("Warning: invalid parent while adding child: ", parentRef);
        return null;
    }

    if (typeof childRef === "string") {
        child = ADM.createNode(childRef);
    }
    else {
        child = childRef;
    }

    if (!child) {
        console.warn("Warning: invalid widget while adding child: ", childRef);
        return null;
    }

    if (parent.addChild(child, dryrun)) {
        if (dryrun) {
            return true;
        }
        // use getParent below in case the child was redirected to another
        // node (as in the case of Page/Content)
        ADM.transaction({
            type: "add",
            parent: child.getParent(),
            child: child
        });
        return child;
    }

    console.warn("Warning: failed to add child: ", childRef, parent, child);
    return null;
};

/**
 * Find out whether a child of the given type can be added to parent
 *
 * @param {Various} parentRef The UID of the parent widget (as a number or
 *                            string), or the actual ADMNode.
 * @param {ADMNode/String} childRef Either an ADMNode or a string type of a node
 *                                  to create.
 * @return {Boolean} True if adding the child would succeed, false otherwise.
 */
ADM.canAddChild = function (parentRef, childRef) {
    if (ADM.addChild(parentRef, childRef, true)) {
        return true;
    }
    return false;
}

/**
 * Add a child of the given type to given parent, or nearest ancestor that will
 * accept it.
 * Using this high-level API records the action as user-visible and part of the
 * undo/redo stacks.
 *
 * @param {Various} parentRef The UID of the parent widget (as a number or
 *                            string), or the actual ADMNode.
 * @param {ADMNode/String} childRef Either an ADMNode or a string type of a node
 *                                  to create.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {ADMNode} The child object, on success; null, on failure.
 */
ADM.addChildRecursive = function (parentRef, childRef, dryrun) {
    var parent, child;

    parent = ADM.toNode(parentRef);
    if (!parent) {
        console.warn("Warning: invalid parent while adding child: ", parentRef);
        return null;
    }

    if (typeof childRef === "string") {
        child = ADM.createNode(childRef);
    }
    else {
        child = childRef;
    }

    if (!child) {
        console.warn("Warning: invalid widget while adding child: ", childRef);
        return null;
    }

    while (parent) {
        if (parent.addChild(child, dryrun)) {
            if (dryrun) {
                return true;
            }
            // use getParent below in case the child was redirected to another
            // node (as in the case of Page/Content)
            ADM.transaction({
                type: "add",
                parent: child.getParent(),
                child: child
            });
            return child;
        }
        parent = parent.getParent();
    }

    console.warn("Warning: failed to add child recursively: ", childRef);
    return null;
};

/**
 * Not intended as a public API.
 * @private
 */
ADM.insertChildRelative = function (siblingRef, childRef, offset, dryrun) {
    var sibling, child;

    sibling = ADM.toNode(siblingRef);
    if (!sibling) {
        console.warn("Warning: invalid sibling while inserting child: ",
                     siblingRef);
        return null;
    }

    if (typeof childRef === "string") {
        child = ADM.createNode(childRef);
    }
    else {
        child = childRef;
    }

    if (!child) {
        console.warn("Warning: invalid widget while inserting child: ",
                     childRef);
    }

    if (sibling.insertChildRelative(child, offset, dryrun)) {
        if (dryrun) {
            return true;
        }
        ADM.transaction({
            type: "insertRelative",
            sibling: sibling,
            child: child,
            offset: offset
        });
        return child;
    }

    console.warn("Warning: failed to insert child: ", childRef);
    return null;
};

/**
 * Inserts child (or new widget of type child) immediately before the sibling
 * widget, if found.
 * Using this high-level API records the action as user-visible and part of the
 * undo/redo stacks.
 *
 * @param {Various} siblingRef The UID of the sibling widget (as a number or
 *                             string), or the actual ADMNode.
 * @param {ADMNode/String} childRef Either an ADMNode or a string type of a node
 *                                  to create.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {ADMNode} The new child, or null on failure.
 */
ADM.insertChildBefore = function (siblingRef, childRef, dryrun) {
    return ADM.insertChildRelative(siblingRef, childRef, 0, dryrun);
};

/**
 * Inserts child (or new widget of type child) immediately after the sibling
 * widget, if found.
 * Using this high-level API records the action as user-visible and part of the
 * undo/redo stacks.
 *
 * @param {Various} siblingRef The UID of the sibling widget (as a number or
 *                             string), or the actual ADMNode.
 * @param {ADMNode/String} childRef Either an ADMNode or a string type of a node
 *                                  to create.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {ADMNode} The new child, or null on failure.
 */
ADM.insertChildAfter = function (siblingRef, childRef, dryrun) {
    return ADM.insertChildRelative(siblingRef, childRef, 1, dryrun);
};

/**
 * Ensures that the given page is not active by making another page active, if
 * necessary. If this is the only page, however, it cannot be inactive, and
 * the function returns false. If pageRef doesn't refer to a valid node, or the
 * node is not a page, or the page is inactive or made inactive, returns true.
 *
 * @param {ADMNode/String} pageRef Either an ADMNode or a string type of a node.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {Boolean} False if the given page could not be made inactive, true if
 *                   it already was, or was made inactive, or was invalid.
 */
ADM.ensurePageInactive = function (pageRef, dryrun) {
    var design, pages, pageIndex, p, page = ADM.toNode(pageRef);
    if (!page || page.getType() != "Page") {
        return true;
    }

    if (ADM.getActivePage() !== page) {
        // this page is already inactive
        return true;
    }

    // make another page active
    design = ADM.getDesignRoot();
    pages = design.getChildren();
    for (pageIndex in pages) {
        p = pages[pageIndex];
        if (p !== page) {
            if (!dryrun) {
                ADM.setActivePage(p);
            }
            return true;
        }
    }

    console.warn("Warning: no other page found to make active");
    ADM.setActivePage(null);
    return false;
}

/**
 * Removes the given child from the design.
 * Using this high-level API records the action as user-visible and part of the
 * undo/redo stacks.
 *
 * @param {Various} child The UID of the widget (as a number or string), or the
 *                        actual ADMNode.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {ADMNode} The removed child, or null it or its parent is not found.
 */
ADM.removeChild = function (childRef, dryrun) {
    var design, child, parent, pageIndex, page, pages, rval, zone, zoneIndex;
    design = ADM.getDesignRoot();

    child = ADM.toNode(childRef);
    if (!child) {
        console.warn("Warning: invalid widget while removing child: ",
                     childRef);
        return null;
    }

    parent = child.getParent();
    if (!parent) {
        console.warn("Warning: invalid parent while removing child: ",
                     childRef);
        return null;
    }

    if (!ADM.ensurePageInactive(child)) {
        console.warn("Warning: attempted to remove the only page: ", child);
    }

    zone = child.getZone();
    zoneIndex = child.getZoneIndex();
    rval = parent.removeChild(child, dryrun);
    if (rval) {
        if (dryrun) {
            return true;
        }
        ADM.transaction({
            type: "remove",
            parent: parent,
            child: child,
            zone: zone,
            zoneIndex: zoneIndex
        });
    }

    if (!rval) {
        console.warn("Warning: unable to remove child: ", childRef);
    }
    return rval;
};

/**
 * Moves a node from its current parent to a new parent within the same design.
 * Using this high-level API records the action as user-visible and part of the
 * undo/redo stacks.
 *
 * @param {Various} nodeRef The UID of the node to be moved (as a number or
 *                          string), or the actual ADMNode.
 * @param {Various} newParentRef The UID of the new parent widget (as a number
 *                               or string), or the actual ADMNode.
 * @param {String} zoneName The new zone for this child in the parent.
 * @param {Number} zoneIndex [Optional] The index at which to insert the child,
 *                           or if undefined, the default (end) location will
 *                           be used.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {Boolean} True if the child was moved successfully, false otherwise,
 *                   or undefined on invalid input. (FIXME - incomplete)
 */
ADM.moveNode = function (nodeRef, newParentRef, zoneName, zoneIndex, dryrun) {
    var node, newParent, oldParent, oldZone, oldZoneIndex, rval;

    node = ADM.toNode(nodeRef);
    if (!node) {
        console.warn("Warning: invalid widget while moving node: ", nodeRef);
        return null;
    }

    newParent = ADM.toNode(newParentRef);
    if (!newParent) {
        console.warn("Warning: invalid parent while moving node: ",
                     newParentRef);
        return null;
    }

    oldParent = node.getParent();
    oldZone = node.getZone();
    oldZoneIndex = node.getZoneIndex();
    rval = node.moveNode(newParent, zoneName, zoneIndex, dryrun);
    if (rval) {
        if (dryrun) {
            return true;
        }
        ADM.transaction({
            type: "move",
            node: node,
            oldParent: oldParent,
            newParent: newParent,
            oldZone: oldZone,
            newZone: zoneName,
            oldZoneIndex: oldZoneIndex,
            newZoneIndex: zoneIndex
        });
    }
    return rval;
}

/**
 * Sets the named property on the node to the given value.
 * Using this high-level API records the action as user-visible and part of the
 * undo/redo stacks.
 *
 * @param {Various} nodeRef The UID of the node to be moved (as a number or
 *                          string), or the actual ADMNode.
 * @param {String} property The name of the property to be set.
 * @param {Any} value The value to set for the property.
 * @return {Boolean} True if the property was set, false if it was the wrong
 *                   type, or undefined if the property is invalid for this
 *                   object. (FIXME - incomplete)
 */
ADM.setProperty = function (nodeRef, property, value) {
    var node, rval, oldValue;

    node = ADM.toNode(nodeRef);
    if (!node) {
        console.warn("Warning: invalid widget while setting property: ",
                     nodeRef);
        return null;
    }

    oldValue = node.getProperty(property);
    rval = node.setProperty(property, value);
    if (rval.result) {
        ADM.transaction({
            type: "propertyChange",
            node: node,
            property: property,
            oldValue: oldValue,
            value: value,
            data: rval.transactionData
        });
    }
    return rval;
}

/**
 * Saves the given transaction object at the top of the undo stack, and clears
 * the redo stack. Such a transaction should be saved every time the content
 * of the design tree changes. The transactions should be atomic user-level
 * transactions, so reverting one returns the tree to a user-presentable state.
 * If you create a new transaction object, give it a type property with a
 * unique string, and then handle the objects in the undo() and redo()
 * functions below.
 *
 * @param {Object} obj The transaction object with all the information needed
 *                     to either revert or replay this transaction.
 */
ADM.transaction = function (obj) {
    var maxUndoStack = 128;
    if (ADM._undoStack.push(obj) > maxUndoStack) {
        ADM._undoStack.shift();
    }
    ADM._redoStack = [];
}

/**
 * Revert the last transaction recorded in the undo stack, if any. The
 * transaction is then added to the redo stack.
 */
ADM.undo = function () {
    var obj, undo = function (obj) {
        if (obj.type === "add") {
            ADM.ensurePageInactive(obj.child);
            obj.parent.removeChild(obj.child);
        }
        else if (obj.type === "remove") {
            obj.parent.insertChildInZone(obj.child, obj.zone, obj.zoneIndex);
        }
        else if (obj.type === "move") {
            obj.node.moveNode(obj.oldParent, obj.oldZone, obj.oldZoneIndex);
        }
        else if (obj.type === "insertRelative") {
            obj.sibling.getParent().removeChild(obj.child);
        }
        else if (obj.type === "propertyChange") {
            // TODO: this could require deeper copy of complex properties
            obj.node.setProperty(obj.property, obj.oldValue, obj.data);
        }
        else {
            console.warn("Warning: Unexpected UNDO transaction");
            return;
        }
    };

    if (obj = ADM._undoStack.pop()) {
        ADM._redoStack.push(obj);
        if (obj.type === "end") {
            while (obj = ADM._undoStack.pop()) {
                ADM._redoStack.push(obj);
                if (obj.type === "begin") {
                    break;
                }
                undo(obj);
            }
        }
        else {
            undo(obj);
        }
    }
};

/**
 * Replay the last transaction recorded in the redo stack, if any. The
 * transaction is then added to the undo stack.
 */
ADM.redo = function () {
    var obj, that = this, redo = function (obj) {
        if (obj.type === "add") {
            obj.parent.addChild(obj.child);
            if (obj.child.getType() == 'Page') {
                that.setActivePage(obj.child);
            }
        }
        else if (obj.type === "remove") {
            ADM.ensurePageInactive(obj.child);
            obj.parent.removeChild(obj.child);
        }
        else if (obj.type === "move") {
            obj.node.moveNode(obj.newParent, obj.newZone, obj.newZoneIndex);
        }
        else if (obj.type === "insertRelative") {
            obj.sibling.insertChildRelative(obj.child, obj.offset);
        }
        else if (obj.type === "propertyChange") {
            // TODO: this could require deeper copy of complex properties
            obj.node.setProperty(obj.property, obj.value, obj.data);
        }
        else {
            console.warn("Warning: Unexpected REDO transaction");
            return;
        }
    };

    if (obj = ADM._redoStack.pop()) {
        ADM._undoStack.push(obj);
        if (obj.type === "begin") {
            while (obj = ADM._redoStack.pop()) {
                ADM._undoStack.push(obj);
                if (obj.type === "end") {
                    break;
                }
                redo(obj);
            }
        }
        else {
            redo(obj);
        }
    }
};

/**
 * Cut the currently selected node from the tree and put it on the clipboard.
 * Note: overwrites the current clipboard on success.
 *
 * @return {Boolean} True if there is a selected node and it was successfully
 *                   removed and stored; false, otherwise.
 */
ADM.cut = function () {
    var node;
    if (!ADM._selection) {
        console.warn("Warning: nothing selected to cut");
        return false;
    }

    // remove the node and put it on the clipboard
    node = ADM.removeChild(ADM._selection);
    if (node) {
        ADM._clipboard = node;
        return true;
    }
    return false;
}

/**
 * Copy the currently selected node and put it on the clipboard.
 * Note: overwrites the current clipboard on success.
 *
 * @return {Boolean} True if there was a selected node to copy.
 */
ADM.copy = function () {
    var node;
    if (!ADM._selection) {
        console.warn("Warning: nothing selected to copy");
        return false;
    }

    // really just point to this node and we'll copy it later if needed, in
    // the paste operation
    ADM._clipboard = ADM._selection;
}

/**
 * Not intended as a public API.
 * Performs a "deep copy" of the node and its descendants, for purposes of
 * copy/paste. Autogenerated values will be newly generated, but otherwise the
 * returned tree should be an identical copy.
 *
 * @private
 * @param {ADMNode} node The root of the subtree to copy.
 * @return {ADMNode} The new copy of the subtree, or null if invalid.
 */
ADM.copySubtree = function (node) {
    var newNode, prop, props, i, child, children, type, zoneName, zoneIndex;

    if (!(node instanceof ADMNode)) {
        console.warn("Warning: invalid argument to copySubtree: ", node);
        return null;
    }

    type = node.getType();
    newNode = ADM.createNode(type, true);
    props = node.getProperties();
    for (prop in props) {
        if (node.isPropertyExplicit(prop) &&
            !BWidget.getPropertyAutoGenerate(type, prop)) {
            // FIXME: probably do a jquery deep copy here of props[prop]
            newNode.setProperty(prop, props[prop], undefined, true);
        }
    }

    children = node.getChildren();
    for (i in children) {
        child = children[i];
        zoneName = child.getZone();
        zoneIndex = child.getZoneIndex();
        newNode.insertChildInZone(ADM.copySubtree(child), zoneName,
                                  zoneIndex);
    }

    return newNode;
}

/**
 * If something is on the clipboard, attempts to add it as a child of the
 * currently selected node, or if no node is selected, to the active page.
 *
 * @return {Boolean} True if successful.
 */
ADM.paste = function () {
    var node, parent, target;
    target = ADM._selection ? ADM._selection : ADM._activePage;
    if (!ADM._clipboard || !target) {
        return;
    }

    parent = ADM._clipboard.getParent();
    if (!parent) {
        // if the node is unparented, we can just reuse this original copy
        node = ADM._clipboard;
    }
    else {
        // otherwise we need to do a deep copy
        node = ADM.copySubtree(ADM._clipboard);
    }

    ADM.addChildRecursive(target, node);
    ADM.setSelected(node);
}

/**
 * Creates an ADM node with the given widget type. The skipInit parameter
 * skips any initalization function for the widget, for instance if reading
 * the design from a file, where the properties will be specifically set.
 *
 * @param {String} widgetType The widget type from the widget registry.
 * @param {Boolean} skipInit [Optional] True if widget creation should skip
 *                           initialization.
 * @return {ADMNode} The node, or null if the widget type was invalid.
 */
ADM.createNode = function (widgetType, skipInit) {
    var func, node = new ADMNode(widgetType);
    if (node.isValid()) {
        func = BWidget.getInitializationFunction(widgetType);
        if (func && !skipInit)
            func(node);
        return node;
    }
    return null;
};

/**
 * Creates an ADMNode instance, the object the ADM tree consists of.
 *
 * @class
 * @extends ADMEventSource
 * @constructor
 * @this {ADMNode}
 * @param {String} widgetType The name of the widget type being created.
 */
function ADMNode(widgetType) {
    var currentType = widgetType, widget, zones, length, i, func;

    this._valid = false;
    this._inheritance = [];

    while (currentType) {
        widget = BWidgetRegistry[currentType];
        if (typeof widget === "object") {
            this._inheritance.push(currentType);
            currentType = widget.parent;
        } else {
            console.error("Error: invalid type hierarchy creating ADM node");
            return;
        }
    }

    this._uid = ++ADMNode.prototype._lastUid;

    this._root = null;
    this._parent = null;
    this._zone = null;
    this._properties = {};

    this._zones = {};
    zones = BWidget.getZones(widgetType);
    length = zones.length;
    for (i = 0; i < length; i++) {
        this._zones[zones[i]] = [];
    }

    this._valid = true;

    if (this.instanceOf("Design")) {
        this._root = this;

        /**
         * Sent by an ADMNode of type "Design" whenever anything changes in its
         * tree of nodes; for example, when a child is added or removed, or a
         * property changes.
         *
         * @name ADMNode#modelUpdated
         * @event
         * @param {Object} event Object including standard "id" and "name"
         *                       properties, as well as a
         *                         "node" property set to the root of the
         *                                affected subtree (for example, the
         *                                parent node when a child is added or
         *                                removed, or the node on which a
         *                                property changes).
         * @param {Any} data The data you supplied to the bind() call.
         * @see ADMEventSource.bind
         * @see ADMEventSource.unbind
         */
        this.addEventType("modelUpdated");
    }
}

ADMNode.prototype = ADMEventSource;

// private static members
ADMNode.prototype._lastUid = 0;

// Public API

/**
 * Tests whether this node is valid.
 *
 * @return {Boolean} True if the node is valid.
 */
ADMNode.prototype.isValid = function () {
    return this._valid;
};

/**
 * Gets the type string.
 * 
 * @return {String} The leaf type string for this object.
 */
ADMNode.prototype.getType = function () {
    return this._inheritance[0];
};

/**
 * Gets the full type string.
 *
 * @return {String} The full type of this object with inheritance trail.
 */
ADMNode.prototype.getFullType = function () {
    return this._inheritance.join(":");
};

/**
 * Checks whether this node is or inherits from the given type.
 *
 * @param {String} Widget type.
 * @param {Boolean} True if the node is or inherits from the given type.
 */
ADMNode.prototype.instanceOf = function (widgetType) {
    var length, i;
    length = this._inheritance.length;
    for (i = 0; i < length; i++) {
        if (this._inheritance[i] === widgetType) {
            return true;
        }
    }
    return false;
};

/**
 * Gets the object's unique ID. This ID is valid for the run-time session,
 * but not persisted.
 *
 * @return {Number} The unique ADM ID of this object instance.
 */
ADMNode.prototype.getUid = function () {
    return this._uid;
};

/**
 * Gets the parent object of this object in the design tree, if any.
 *
 * @return {ADMNode} The parent object, or null if unparented.
 */
ADMNode.prototype.getParent = function () {
    return this._parent;
};

/**
 * Gets the zone in the parent object that this object belongs to, if any.
 *
 * @return {String} The zone name, or null if none.
 */
ADMNode.prototype.getZone = function () {
    return this._zone;
};

/**
 * Gets the zone index at which this node is contained in its parent zone.
 *
 * @return {Number} The zone index, or -1 on error.
 */
ADMNode.prototype.getZoneIndex = function () {
    var zone, length, i;
    if (!this._parent) {
        console.error("Error: invalid parent while getting zone index");
        return -1;
    }

    zone = this._parent._zones[this._zone];
    if (!zone || !zone.length) {
        console.error("Error: zone not found while getting zone index: " +
                    this._zone);
        return -1;
    }

    length = zone.length;
    for (i = 0; i < length; i++) {
        if (zone[i] === this) {
            return i;
        }
    }
};

/**
 * Returns whether this node is selected.
 *
 * @return {Boolean} True if this node is selected.
 */
ADMNode.prototype.isSelected = function () {
    return this._uid === ADM.getSelected();
};

/**
 * Tests whether this node is allowed to be selected.
 *
 * @return {Boolean} True if the node is allowed to be selected.
 */
ADMNode.prototype.isSelectable = function () {
    return BWidget.isSelectable(this.getType());
};

/**
 * Tests whether this node is allowed to be repositioned.
 *
 * @return {Boolean} True if the node is allowed to be repositioned.
 */
ADMNode.prototype.isMoveable = function () {
    return BWidget.isMoveable(this.getType());
};

/**
 * Tests whether this node is a container object.  An object is
 * considered to be a container if it has one (1) zone and that
 * zone's cardinality is "N".
 *
 * @return {Boolean} True if the node is a container object.
 */
ADMNode.prototype.isContainer = function () {
    var zones = BWidget.getZones(this.getType());
    return (zones.length === 1 &&
            BWidget.getZoneCardinality(this.getType(),zones[0]) === "N");
};

/**
 * Tests whether this node show have the drag header visible.
 *
 * @return {Boolean} True if the node shown have a drag header added.
 */
ADMNode.prototype.isHeaderVisible = function () {
    return this.isContainer && BWidget.isHeaderVisible(this.getType());
};

/**
 * Finds the object in the subtree rooted at this object (inclusive), by UID.
 *
 * @param {Number} uid The unique ID of the object to be found.
 * @return {ADMNode} The ADM object with the given UID, or null if not found.
 */
ADMNode.prototype.findNodeByUid = function (uid) {
    var children, i, rval;
    /*jslint eqeq: true */
    if (this._uid == uid) {
        return this;
    }

    // TODO: we could hash this in an object for faster lookup
    children = this.getChildren();
    for (i = children.length - 1; i >= 0; i--) {
        rval = children[i].findNodeByUid(uid);
        if (rval) {
            return rval;
        }
    }
    return null;
};

/**
 * Gets the ADMDesign object at the root of this object's tree.
 *
 * @return {ADMDesign} The ADMDesign root object, or null if this object is
 *                     unparented or the root is not an ADMDesign.
 */
ADMNode.prototype.getDesign = function () {
    return this._root;
};

/**
 * Fires named event from the ADMDesign at the root of the tree, if found.
 *
 * @param {String} name The name of the event.
 * @param {Object} data Object with properties to include in the event.
 */
ADMNode.prototype.fireModelEvent = function (name, data) {
    var design = this.getDesign();
    if (!design) {
        console.warn("Warning: no root design found to fire model event");
        return;
    }
    design.fireEvent(name, data);
};

/**
 * Gets the children of this object in the design tree.
 *
 * @return {Array} Array of the the children of this object.
 */
ADMNode.prototype.getChildren = function () {
    var children = [], zones, length, i;
    zones = BWidget.getZones(this.getType());
    length = zones.length;
    for (i = 0; i < length; i++) {
        children = children.concat(this._zones[zones[i]]);
    }
    return children;
};

/**
 * Gets the count of children of this object in the design tree.
 *
 * @return {Number} Total count of this object's children.
 */
ADMNode.prototype.getChildrenCount = function () {
    var count = 0, zones, length, i;
    zones = BWidget.getZones(this.getType());
    length = zones.length;
    for (i = 0; i < length; i++) {
        count += this._zones[zones[i]].length;
    }
    return count;
};

/**
 * Tests whether this node has user-visible descendants that will be displayed
 * in the outline view.
 *
 * @return {Boolean} True if there is at least one visible descendant.
 */
ADMNode.prototype.hasUserVisibleDescendants = function () {
    var func, i, length, child, childType, children = this.getChildren();
    length = children.length;
    for (i = 0; i < length; i++) {
        child = children[i];
        childType = child.getType();
        if (BWidget.isPaletteWidget(childType)) {
            return true;
        }
    }

    for (i = 0; i < length; i++) {
        if (children[i].hasUserVisibleDescendants()) {
            return true;
        }
    }
    return false;
};

/**
 * Adds given child object to this object, generally at the end of the first
 * zone that accepts the child.
 *
 * @param {ADMNode} child The child object to be added.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {Boolean} True if the child was added successfully, false otherwise.
 */
ADMNode.prototype.addChild = function (child, dryrun) {
    var myType, childType, zones, redirect, widgets, wrapper, length, i;
    myType = this.getType();
    childType = child.getType();

    zones = BWidget.zonesForChild(myType, childType);
    if (zones.length === 0) {
        redirect = BWidget.getRedirect(myType);
        if (redirect) {
            widgets = this._zones[redirect.zone];
            if (widgets && widgets.length > 0) {
                if (widgets[0].addChild(child, dryrun)) {
                    return true;
                }
            } else {
                wrapper = ADM.createNode(redirect.type);
                if (wrapper.addChild(child, dryrun)) {
                    if (!this.addChildToZone(wrapper, redirect.zone, undefined,
                                             dryrun)) {
                        console.error("Unable to create redirect wrapper for " +
                                    myType);
                        return false;
                    } else {
                        return true;
                    }
                }
            }
        }

        console.warn("Warning: no zones found for child type");
        return false;
    }

    length = zones.length;
    for (i = 0; i < length; i++) {
        if (this.addChildToZone(child, zones[i], undefined, dryrun)) {
            return true;
        }
    }

    return false;
};

/**
 * Adds given child object to the given zone in this object.
 *
 * @param {ADMNode} child The child object to be added.
 * @param {String} zoneName The name of the zone in which to add the child.
 * @param {Number} zoneIndex [Optional] The index at which to insert the child,
 *                           or if undefined, the default (end) location will
 *                           be used.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {Boolean} True if the child was added successfully, false otherwise.
 */
ADMNode.prototype.addChildToZone = function (child, zoneName, zoneIndex,
                                             dryrun) {
    // requires: assumes cardinality is "N", or a numeric string
    var add = false, myType, childType, zone, cardinality, limit;
    myType = this.getType();
    childType = child.getType();
    zone = this._zones[zoneName];

    if (!BWidget.zoneAllowsChild(myType, zoneName, childType)) {
        console.warn("Warning: zone " + zoneName +
                     " doesn't allow child type " + childType);
        return false;
    }

    if (!BWidget.childAllowsParent(myType, childType)) {
        console.warn("Warning: child type " + childType + " doesn't allow " +
                     "parent type " + myType);
        return false;
    }

    cardinality = BWidget.getZoneCardinality(myType, zoneName);
    if (!cardinality) {
        console.warn("Warning: no cardinality found for zone " + zoneName);
        return false;
    }

    if (cardinality !== "N") {
        limit = parseInt(cardinality, 10);
        if (zone.length >= limit) {
            // this zone is already full
            console.warn("Warning: zone already full: " + zoneName);
            return false;
        }
    }

    if (zoneIndex === undefined) {
        zoneIndex = zone.length;
    }
    return this.insertChildInZone(child, zoneName, zoneIndex, dryrun);
};

/**
 * Inserts a new child node as a sibling relative to this existing node. They
 * will have the same parent and be in the same zone, if the insertion is
 * allowed.
 * 
 * @param {ADMNode} child The child node to insert.
 * @param {Number} offset The offset from this item to insert the child at:
 *                        0 is immediately before, 1 is immediately after,
 *                        lower numbers are at earlier positions and higher
 *                        numbers at higher positions.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {Boolean} True if the child was successfully inserted.
 */
ADMNode.prototype.insertChildRelative = function (child, offset, dryrun) {
    var zone, i, index;
    if (!this._parent) {
        console.warn("Warning: cannot insert child relative to orphan sibling");
        return false;
    }

    zone = this._parent._zones[this._zone];
    if (!zone || !zone.length) {
        console.warn("Warning: zone not found in parent");
        return false;
    }

    for (i = zone.length - 1; i >= 0; i--) {
        if (zone[i] === this) {
            index = i + offset;

            // limit index to valid range
            if (index < 0) {
                index = 0;
            } else if (index >= zone.length) {
                index = zone.length;
            }

            return this._parent.addChildToZone(child, this._zone, index,
                                               dryrun);
        }
    }

    console.warn("Warning: sibling not found in expected zone");
    return false;
};

/**
 * Inserts child in the given zone at the given index. Note: Does not check
 * cardinality, this should have been validated already.
 *
 * @param {ADMNode} child The child object to be added.
 * @param {String} zoneName The name of the zone in which to insert the child.
 * @param {Number} index The index in the zone at which to insert the child.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {Boolean} True if the child was added successfully, false otherwise.
 */
ADMNode.prototype.insertChildInZone = function (child, zoneName, index,
                                                dryrun) {
    function setRootRecursive(node, root) {
        var children, i;
        node._root = root;
        children = node.getChildren();
        for (i = children.length - 1; i >= 0; i--) {
            setRootRecursive(children[i], root);
        }
    }

    var zone = this._zones[zoneName];
    if (!zone) {
        console.error("Error: zone not found in insertChildInZone: " +
                      zoneName);
        return false;
    }
    if (index < 0 || index > zone.length) {
        console.error("Error: invalid child insertion index");
        return false;
    }
    if (child instanceof ADMNode) {
        if (!dryrun) {
            zone.splice(index, 0, child);

            setRootRecursive(child, this._root);

            child._parent = this;
            child._zone = zoneName;
            this.fireModelEvent("modelUpdated",
                                { type: "nodeAdded", node: child, parent: this,
                                  index: index, zone: zoneName });
        }
        return true;
    } else {
        console.warn("Warning: children of ADMNode must be ADMNode");
        return false;
    }
};

/**
 * Moves a node from its current parent to a new parent within the same design.
 *
 * @param {ADMNode} newParent The new parent for this node.
 * @param {String} zoneName The new zone for this child in the parent.
 * @param {Number} zoneIndex [Optional] The index at which to insert the child,
 *                           or if undefined, the default (end) location will
 *                           be used.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {Boolean} True if the child was moved successfully, false otherwise,
 *                   or undefined on invalid input.
 */
ADMNode.prototype.moveNode = function (newParent, zoneName, zoneIndex, dryrun) {
    var oldParent, oldDesign, newDesign, oldZone, oldIndex, removed, rval, root;
    rval = false;
    if (!newParent) {
        console.error("Error: invalid argument to moveChild");
        return undefined;
    }

    if (this._root !== newParent._root) {
        console.error("Error: attempted to move node between designs");
        return undefined;
    }

    oldParent = this._parent;
    if (!oldParent) {
        console.error("Error: parent invalid in moveNode");
        return undefined;
    }

    // TODO: could optimize case where parent/zone don't change

    root = this._root;
    root.suppressEvents(true);

    oldZone = this._zone;
    oldIndex = this.getZoneIndex();
    removed = oldParent.removeChild(this, dryrun);

    if (removed) {
        if (removed != this) {
            console.error("Error: removed node didn't match in moveNode");
        } else {
            // try to add child to new parent and zone
            rval = newParent.addChildToZone(this, zoneName, zoneIndex, dryrun);
            if (!rval) {
                // try to replace node in original position
                oldParent.addChildToZone(this, oldZone, oldIndex, dryrun);
            }
        }
    }

    root.suppressEvents(false);

    if (rval && !dryrun) {
        this.fireModelEvent("modelUpdated",
                            { type: "nodeMoved", node: this,
                              oldParent: oldParent, newParent: newParent,
                              oldIndex: oldIndex, newIndex: zoneIndex,
                              oldZone: oldZone, newZone: zoneName });
    }

    return rval;
};

/**
 * Removes the given child from this node.
 *
 * @param {ADMNode} child The child node to be removed.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {ADMNode} The removed child, or null if unsuccessful.
 */
ADMNode.prototype.removeChild = function (child, dryrun) {
    var index;
    if (child._parent !== this) {
        console.error("Error: child reports another parent while removing");
        return null;
    }

    index = child.getZoneIndex();
    if (index == -1) {
        console.error("Error: child not found in this parent while removing");
        return null;
    }

    return this.removeChildFromZone(child._zone, index, dryrun);
};

/**
 * Removes child at given index from this zone's list of children.
 *
 * @param {String} zoneName The name of the zone.
 * @param {Number} index The 0-based zone index of the child to be removed.
 * @param {Boolean} dryrun [Optional] True if the call should be a dry run.
 * @return {ADMNode} The removed child, or null if not found.
 */
ADMNode.prototype.removeChildFromZone = function (zoneName, index, dryrun) {
    var zone, removed, child;
    zone = this._zones[zoneName];
    if (!zone) {
        console.error("Error: no such zone found while removing child: " +
                      zoneName);
    }

    if (dryrun) {
        removed = [zone[index]];
    } else {
        removed = zone.splice(index, 1);
    }

    if (removed.length === 0) {
        console.warn("Warning: failed to remove child at index " + index);
        return null;
    }

    child = removed[0];
    if (!dryrun) {
        child._parent = null;
        child._root = null;

        if (child.isSelected()) {
            ADM.setSelected(null);
        }

        this.fireModelEvent("modelUpdated",
                            { type: "nodeRemoved", node: child, parent: this,
                              index: index, zone: zoneName });
    }
    return child;
};

/**
 * Call the given function on each node of the tree rooted at this node.
 *
 * @param {Function(ADMNode)} The function to call, which takes an ADMNode.
 */
ADMNode.prototype.foreach = function (func) {
    var i, length, children = this.getChildren();
    func(this);
    if (children) {
        length = children.length;
        for (i = 0; i < length; i++) {
            children[i].foreach(func);
        }
    }
};

/**
 * Not intended as a public API.
 * Auto-generate this property if it is so configured in the widget registry.
 * Takes the autoGenerate prefix and appends the integer one higher than any
 * already-defined properties on widgets of the same type in this tree.
 * 
 * @private
 * @param {String} The name of the property.
 * @return {String} The generated property value.
 */
ADMNode.prototype.generateUniqueProperty = function (property) {
    var generate, design, myType, length, i, genLength, max, num, existing = [];
    myType = this.getType();
    generate = BWidget.getPropertyAutoGenerate(myType, property);
    if (!generate) {
        return undefined;
    }

    // find existing nodes with this property set
    design = this.getDesign();
    design.foreach(function (node) {
        if (node.getType() === myType) {
            if (node.isPropertyExplicit(property)) {
                existing.push(node.getProperty(property));
            }
        }
    });

    // find the maximum suffix number set
    length = existing.length;
    genLength = generate.length;
    max = 0;
    for (i = 0; i < length; i++) {
        if (existing[i].substring(0, genLength) === generate) {
            num = parseInt(existing[i].substring(genLength), 10);
            if (!isNaN(num) && num > max) {
                max = num;
            }
        }
    }

    // generate using the next higher suffix
    generate = generate + (max + 1);

    // Since there should be no one who knows the previous value of this
    // property (as it didn't exist), we don't have to fire a propertyChanged
    // event at this time.
    this.getDesign().suppressEvents(true);
    this.setProperty(property, generate);
    this.getDesign().suppressEvents(false);
    return generate;
};

/**
 * Gets the properties defined for this object. If a property is not explicitly
 * set, it will be included with its default value.
 *
 * @return {Object} Object containing all the defined properties and values.
 */
ADMNode.prototype.getProperties = function () {
    var props = {}, defaults, i;
    defaults = BWidget.getPropertyDefaults(this.getType());
    for (i in defaults) {
        if (defaults.hasOwnProperty(i)) {
            props[i] = this._properties[i];
            if (props[i] === undefined) {
                props[i] = this.generateUniqueProperty(i);
                if (props[i] === undefined) {
                    props[i] = defaults[i];
                }
            }
        }
    }
    return props;
};

/**
 * Gets the named property for this object. If the property is not explicitly
 * set, returns the default value for property.
 *
 * @param {String} The name of the requested property.
 * @return {Any} The value of the property, or null if it is not set, or
 *               undefined if the property is invalid for this object. The type
 *               returned depends on the property.
 */
ADMNode.prototype.getProperty = function (property) {
    var value = this._properties[property], generate;
    if (value === undefined) {
        value = this.generateUniqueProperty(property);
        if (value === undefined) {
            return BWidget.getPropertyDefault(this.getType(), property);
        }
    }
    return value;
};

/**
 * Gets the options for the named property for this widget type.
 *
 * @param {String} The name of the requested property.
 * @return {Any} The options of the property, or undefined if the property is
 *               invalid for this object. The type returned depends on the
 *               property.
 */
ADMNode.prototype.getPropertyOptions = function (property) {
    return BWidget.getPropertyOptions(this.getType(), property);
};

/**
 * Gets the default value for the named property for this widget type.
 *
 * @param {String} The name of the requested property.
 * @return {Any} The default value of the property, or undefined if the
 *               property is invalid for this object. The type returned depends
 *               on the property.
 */
ADMNode.prototype.getPropertyDefault = function (property) {
    return BWidget.getPropertyDefault(this.getType(), property);
};

/**
 * Returns whether the property is explicitly set or not. Properties that are
 * explicitly set should be serialized to disk.
 *
 * @param {String} The name of the property.
 * @return {Boolean} True if the property is explicitly set, false if the
 *                   property value comes from the widget's default, or
 *                   undefined if the property is invalid for this object.
 */
ADMNode.prototype.isPropertyExplicit = function (property) {
    var value = this._properties[property];
    if (value === undefined) {
        return false;
    }
    return true;
};

/**
 * Sets the named property to the given value. Fires a propertyChanged event
 * if the value changed.
 *
 * @param {String} property The name of the property to be set.
 * @param {Any} value The value to set for the property.
 * @param {Any} data [Optional] Only used when this setProperty call is in
 *                   response to an undo/redo operation, and the given data was
 *                   provided by an earlier call to the property hook function
 *                   for this widget.
 * @param {Boolean} raw [Optional] True if the property should be set without
 *                      calling any property hook in the widget (appropriate
 *                      when copying objects or serializing from JSON).
 *                      Defaults to false.
 * @return {Object} Object with result property true if the property was set,
 *                  false if it was the wrong type, or undefined if the
 *                  property is invalid for this object. If true, then the
 *                  object may also contain a transactionData property with
 *                  relevant info for performing an undo of this operation.
 */
ADMNode.prototype.setProperty = function (property, value, data, raw) {
    var orig, func, changed, type, rval = { };
    type = BWidget.getPropertyType(this.getType(), property);
    if (!type) {
        console.error("Error: attempted to set non-existent property: " +
                    property);
        return undefined;
    }
    rval.result = false;

    if (typeof value !== type) {
        var numberTypes = {float:0,integer:0,number:0};
        if ((type in numberTypes) && isNaN(value)) {
            console.error("Error: attempted to set property " + property +
                          " (" + type + ") with wrong type (" + typeof value +
                          ")");
            return rval;
        }
    }

    // HTML id naming rules:
    // Must begin with a letter A-Z or a-z
    // Can be followed by: letters (A-Za-z), digits (0-9), hyphens ("-"), and underscores ("_")
    // In HTML, all values are case-insensitive
    if (property == "id") {
        var pattern = /^[a-zA-Z]([\w-]*)$/;
        if (value && !pattern.test(value)) {
            console.error("Error: attempted to set invalid id");
            return rval;
        }
    }

    if (this._properties[property] !== value) {
        if (!raw) {
            func = BWidget.getPropertyHookFunction(this.getType(), property);
            if (func)
                rval.transactionData = func(this, value, data);
        }
        orig = this._properties[property];
        this._properties[property] = value;
        this.fireModelEvent("modelUpdated",
                            { type: "propertyChanged", node: this,
                              property: property, oldValue: orig,
                              newValue: value });
        rval.result = true;
    }
    return rval;
};
