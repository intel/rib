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


/**
 * Base class for objects that support sending events.
 *
 * @class
 */
$.rib = $.rib || {};
$.rib._lastEventId = 0;
$.rib.eventQueue = [];
$.rib.eventQueue.processEvents = function () {
    var queuedEvent = this.shift();
    if (queuedEvent) {
        queuedEvent.handler(queuedEvent.event, queuedEvent.data);
    }
};
function RIBEventSource() {
    this._events = {};
    this._suppressEvents = 0;
}

/**
 * Adds named event to list of known event types for this object,
 * initialized with no event listeners.
 *
 * @param {String} name The name of the event.
 */
RIBEventSource.prototype.addEventType = function (name) {
    this._events[name] = [];
};

/**
 * Binds the given handler function to be called whenever the named event
 * occurs on this object.
 *
 * @param {String} name The name of the event.
 * @param {Function} handler Handler function to be called on this event.
 *                           The function should expect event and data
 *                           arguments.
 * @param {Any} data Any data or object to be passed to the handler.
 * @see eventSource.unbind
 */
RIBEventSource.prototype.bind = function (name, handler, data) {
    if (typeof name !== "string") {
        console.error("Error: called bind with a non-string event name");
        return;
    }
    var eventType = this._events[name];
    if (eventType === undefined) {
        console.error("Error: bind did not find event type " + name);
        return;
    }
    eventType.push({ handler: handler, data: data });
};

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
 * @see RIBEventSource.bind
 */
RIBEventSource.prototype.unbind = function (name, handler, data) {
    var removed = 0, listeners, i;
    if (typeof name !== "string") {
        console.error("Error: called unbind with a non-string event name");
        return removed;
    }
    listeners = this._events[name];
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
};

/**
 * Clears named event from the event queue.
 *
 * @param {String} name The name of the event.
 * @see RIBEventSource.bind
 * @see RIBEventSource.unbind
 */
RIBEventSource.prototype.clearEvent = function (name) {
    var i = 0;
    while (i < $.rib.eventQueue.length) {
        if ($.rib.eventQueue[i].event.name === name) {
            $.rib.eventQueue.splice(i, 1);
        } else {
            i++;
        }
    }
};

/**
 * Fires named event from this object, with extra properties set in data.
 *
 * @param {String} name The name of the event.
 * @param {Object} data Object with properties to include in the event.
 * @see RIBEventSource.bind
 * @see RIBEventSource.unbind
 */
RIBEventSource.prototype.fireEvent = function (name, data) {
    var listeners, event, i, length;
    if (this._suppressEvents > 0) {
        return;
    }

    listeners = this._events[name];
    if (listeners === undefined) {
        console.error("Error: fireEvent did not find event type " + name);
        return;
    }

    event = {
        id: ++$.rib._lastEventId,
        name: name
    };
    for (i in data) {
        if (data.hasOwnProperty(i)) {
            event[i] = data[i];
        }
    }

    length = listeners.length;
    for (i = 0; i < length; i++) {
        $.rib.eventQueue.push({
            handler: listeners[i].handler,
            event: event,
            data: listeners[i].data
        });
        setTimeout("$.rib.eventQueue.processEvents()", 0);
    }
};

/**
 * Suppresses events from this event source. Each call with a true argument
 * must be matched with a call with a false argument before events will
 * be sent again.
 *
 * @param {Boolean} flag True to suppress events, false to stop suppressing
 *                       events.
 */
RIBEventSource.prototype.suppressEvents = function (flag) {
    if (flag) {
        this._suppressEvents++;
    } else {
        if (this._suppressEvents > 0) {
            this._suppressEvents--;
        }
    }
};
// import events utils to $.rib
(function () {
    var i, eventSource = new RIBEventSource();
    for (i in eventSource) {
        $.rib[i] = eventSource[i];
    }
}());
/*
 * Event sent by the when the usage status of images changes.
 *
 * @name pmUtils#imagesUpdated
 * @event
 * @param {Object} event Object including standard "id" and "name"
 *                       properties, as well as a
 *                         "usageStatus" is an object contains
 *                                       current usage status of
 *                                       all existing images
 * @param {Any} data The data you supplied to the bind() call.
 * @see RIBEventSource.bind
 * @see RIBEventSource.unbind
 */
$.rib.addEventType("imagesUpdated");
