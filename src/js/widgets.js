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

/**
 * BWidgetRegistry is private data, you should access it through BWidget
 *
 * Top-level object with properties representing all known widgets
 * Each property should be an object with:
 *   i) parent, string name of inherited parent object
 *   ii) showInPalette, boolean for user-exposed widgets (default true)
 *   iii) properties, an object with property name keys and type string values
 *   iv) template, a string for code to generate for this widget
 *   v) zones, an array of places where the widget can contain children
 *   vi) admConstructor: function that creates corresponding ADM widget
 * Each zone description in the array should be an object with:
 *   i) name identifying the zone point
 *   ii) cardinality, either "1" or "N" representing number of contained items
 *   iii) allow: string or array of string names of allowable widgets
 *               (all others will be denied)
 *   iv) deny: string or array of string names of disallowed widgets
 *             (all others will be allowed)
 *   Only one of allow or deny should be set, if neither than all are allowed.
 *
 * @class
 */
var BWidgetRegistry = {
    /**
     * "Base class" for other widget types, with an "id" string property.
     */
    Base: {
        parent: null,
        allowIn: [],
        applyProperties: function (node, code) {
            var id = node.getProperty("id");
            if (id && node.isPropertyExplicit("id")) {
                code.attr("id", id);
            }
            return code;
        },
        showInPalette: false,
        selectable: false,
        moveable: false,
        properties: {
            id: {
                type: "string",
                defaultValue: ""
            }
        }
    },

    /**
     * The root object for a user's application design.
     */
    Design: {
        parent: "Base",
        allowIn: [],
        showInPalette: false,
        selectable: false,
        moveable: false,
        properties: {
            metas: {
                type: "array",
                defaultValue:[
                    { key:'name',
                      value: 'viewport',
                      content: 'width=device-width, initial-scale=1'
                    },
                    { designOnly: true,
                      key:'http-equiv',
                      value: 'cache-control',
                      content: 'no-cache'
                    },
                ]
            },
            libs: {
                type: "array",
                defaultValue: [
                    { designOnly: false,
                      value: 'lib/jquery-1.6.4.js'
                    },
                    { designOnly: true,
                      value: 'lib/jquery-ui-1.8.16.custom.js'
                    },
                    { designOnly: true,
                      value: 'src/js/template.js'
                    },
                    { designOnly: false,
                      value: 'lib/jquery.mobile-1.0.js'
                    }
                ]
            },
            css: {
                type: "array",
                defaultValue: [
                    { designOnly: false,
                      value: 'src/css/jquery.mobile.structure-1.0.css'
                    },
                    { designOnly: false,
                      value: 'src/css/jquery.mobile-1.0.css'
                    },
                    { designOnly: true,
                      value: 'src/css/template.css'
                    }
                ]
            }
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Page"
            }
        ],
    },

    /**
     * Represents a page or dialog in the application. Includes "top" zone
     * for an optional header, "content" zone for the Content area, and "bottom"
     * zone for an optional footer.
     */
    Page: {
        parent: "Base",
        allowIn: "Design",
        template: function (node) {
            var code = $('<div data-role="page"></div>');
            code.attr("id", node.getProperty("id"));
            if (node.isPropertyExplicit("theme")) {
                code.attr("data-theme", node.getProperty("theme"));
            }
            return code;
        },

        showInPalette: false,
        selectable: false,
        moveable: false,
        properties: {
            id: {
                type: "string",
                autoGenerate: "page"
            },
            theme: {
                type: "string",
                options: [ "a", "b", "c", "d", "e" ],
                defaultValue: "c",
            }
        },
        redirect: {
            zone: "content",
            type: "Content"
        },
        zones: [
            {
                name: "top",
                cardinality: "1",
                allow: "Header"
            },
            {
                name: "content",
                cardinality: "1",
                allow: "Content"
            },
            {
                name: "bottom",
                cardinality: "1",
                allow: "Footer"
            }
        ],
    },

    /**
     * Represents a header object at the top of a page. Includes a "text"
     * property that represents header text. Includes "left" and "right" zones
     * for optional buttons, and "bottom" zone for an optional navbar.
     */
    Header: {
        parent: "Base",
        allowIn: "Page",
        template: function (node) {
            var code = $('<div data-role="header"><h1></h1></div>');
            code = BWidgetRegistry.Base.applyProperties(node, code);
            if (node.getProperty("position") === "fixed") {
                code.attr("data-position", "fixed");
            }
            if (node.getProperty("theme") !== "default") {
                code.attr("data-theme", node.getProperty("theme"));
            }
            code.find("h1")
                .text(node.getProperty("text"));
            return code;
        },

        moveable: false,
        properties: {
            text: {
                type: "string",
                defaultValue: "Title"
            },
            position: {
                type: "string",
                options: [ "default", "fixed" ],
                defaultValue: "default",
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
            }
        },
        zones: [
            {
                name: "left",
                cardinality: "1",
                allow: "Button"
            },
            {
                name: "right",
                cardinality: "1",
                allow: "Button"
            },
            {
                name: "bottom",
                cardinality: "1",
                allow: "Navbar"
            }
        ],
    },

    /**
     * Represents a footer object at the bottom of a page.
     */
    Footer: {
        parent: "Base",
        allowIn: "Page",
        template: '<div data-role="footer"></div>',
        moveable: false,
        properties: {
            text: {
                type: "string",
                defaultValue: "Footer",
            },
	    data_position: {
                type: "string",
                options: [ "default", "fixed" ],
                defaultValue: "default",
            }
        },
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ],
    },

    /**
     * Represents the main content area of a page (between the header and
     * footer, if present).
     */
    Content: {
        parent: "Base",
        allowIn: "Page",
        showInPalette: false,
        selectable: false,
        moveable: false,
        template: '<div data-role="content"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ],
    },

    /**
     * Represents an HTML form object. Includes an "action" property with the
     * submission URL and a "method" string property that should be "get" or
     * "post".
     */
    Form: {
        // FIXME: I'm not positive that forms should be widgets. We could
        //        alternately make forms a separate concept, the user can pick
        //        a form for each widget to be associated with in properties,
        //        for example. Need to look at this.
        parent: "Base",
        template: '<form action="" method=""></form>',
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ],
        properties: {
            action: {
                type: "string",
                defaultValue: "#"
            },
            method: {
                type: "string",
                options: [ "GET", "POST" ],
                defaultValue: "POST"
            }
        }
    },

    /**
     * Represents a Control Group object. Includes an "data-type" property
     * that should be "vertical" or "horizontal"
     */
    ButtonGroup: {
        parent: "Base",
        template: '<div data-role="controlgroup"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Button"
            }
        ],
        properties: {
            data_type: {
                type: "string",
                options: ["vertical", "horizontal" ],
                defaultValue: "vertical"
            }
        }
    },

    /**
     * Represents a button. A "text" string property holds the button text.
     */
    Button: {
        parent: "Base",
        properties: {
            text: {
                type: "string",
                defaultValue: "Button"
            },
        },
        template: '<a data-role="button">%TEXT%</a>',
    },

    /**
     * Represents a text entry.
     */
    TextInput: {
        parent: "Base",
        properties: {
            value: {
                type: "string",
                defaultValue: ""
            },
            placeholder: {
                type: "string",
                defaultValue: "Placeholder text"
            }
        },
        template: '<input type="text" value="%VALUE%"  />',
    },

    /**
     * Represents a slider widget for selecting from a range of numbers.
     * Includes "min" and "max" number properties that define the range, and
     * a "value" property that defines the default.
     */
    Slider: {
        parent: "Base",
        properties: {
            // TODO: What's this for? wouldn't text be in an associated label?
            //       Document above.
            id: {
                type: "string",
                autoGenerate: "slider"
            },
            text: {
                type: "string",
                defaultValue: "Slider"
            },
            value: {
                type: "integer",
                defaultValue: 50
            },
            min: {
                type: "integer",
                defaultValue: 0
            },
            max: {
                type: "integer",
                defaultValue: 100
            }
        },
        template: '<div data-role="fieldcontain"> <label for="%ID%-range">%TEXT%</label> <input type="range" name="%ID%-range" id="%ID%-range" value="%VALUE%" min="%MIN%" max="%MAX%" /> </div>',
    },

    /**
     * Represents a text label. A "text" string property holds the text.
     */
    Label: {
        // FIXME: I'm not sure we should really have this. Instead we make label
        //        text a property of other form elements and the <label> part of
        //        their templates.
        parent: "Base",
        properties: {
            text: {
                type: "string",
                defaultValue: "Label"
            }
        },
        template: '<label>%TEXT%</label>',
    },

};

/**
 * API to access aspects of the static widget definitions
 *
 * @class
 */
var BWidget = {
    init: function () {
        // effects: add the type and displayLabel properties to widget
        //          registry objects
        var type;
        for (type in BWidgetRegistry) {
            if (BWidgetRegistry.hasOwnProperty(type)) {
                BWidgetRegistry[type].type = type;

                // TODO: i18n: localize displayLabel based on type
                BWidgetRegistry[type].displayLabel = type;

                if (type === "ButtonGroup") {
                    BWidgetRegistry[type].displayLabel = "Button Group";
                }

                if (type === "TextInput") {
                    BWidgetRegistry[type].displayLabel = "Text Input";
                }
            }
        }
    },

    /**
     * Checks to see whether the given widget type exists.
     *
     * @return {Boolean} True if the widget type exists.
     */
    typeExists: function (widgetType) {
        if (typeof BWidgetRegistry[widgetType] === "object") {
            return true;
        }
        return false;
    },

    /**
     * Gets an array of the widget type strings for widgets defined in the
     * registry that should be shown in the palette.
     *
     * @return {Array[String]} Array of widget type strings.
     */
    getPaletteWidgetTypes: function () {
        var types = [], type;
        for (type in BWidgetRegistry) {
            if (BWidgetRegistry.hasOwnProperty(type)) {
                if (BWidgetRegistry[type].showInPalette !== false) {
                    types.push(type);
                }
            }
        }
        return types;
    },

    /**
     * Gets an array of the widget objects for widgets defined in the registry
     * that should be shown in the palette.
     *
     * @return {Array[String]} Array of widget type strings.
     * @deprecated This function changed, now use getPaletteWidgetTypes; if
     *             you think you actually need this one, tell Geoff why.
     */
    getPaletteWidgets: function () {
        var widgets = [], type;
        for (type in BWidgetRegistry) {
            if (BWidgetRegistry.hasOwnProperty(type)) {
                if (BWidgetRegistry[type].showInPalette !== false) {
                    widgets.push(BWidgetRegistry[type]);
                }
            }
        }
        return widgets;
    },

    /**
     * Gets the display label for the given widget type.
     *
     * @return {String} Display label.
     */
    getDisplayLabel: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget === "object") {
            return widget.displayLabel;
        }
        return "";
    },

    /**
     * Gets the icon id for the given widget type.
     *
     * @return {String} Icon id.
     */
    getIcon: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        // TODO: remove the hard-coded icon defaults here and replace with
        //       real icons based on UX input/assets
        if (typeof widget === "object") {
            if (widget.icon === undefined) {
                return "ui-icon-pencil";
            } else {
                return widget.icon;
            }
        }
        return "ui-icon-alert";
    },

    /**
     * Gets the available instance property types for a given widget type.
     * Follows parent chain to find inherited property types.
     * Note: Type strings still in definition, currently also using "integer"
     *
     * @param {String} widgetType The type of the widget.
     * @return {Object} Object with all of the widget's available properties,
     *                  whose values are Javascript type strings ("number",
     *                  "string", "boolean", "object", ...).
     * @throws {Error} If widgetType is invalid.
     */
    getPropertyTypes: function (widgetType) {
        var stack = [], props = {}, length, i, property, widget, currentWidget;
        widget = currentWidget = BWidgetRegistry[widgetType];

        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getPropertyTypes: " +
                            widgetType);
        }

        // build hierarchical stack so child properties will override parents
        while (currentWidget) {
            stack.unshift(currentWidget.properties);
            currentWidget = BWidgetRegistry[currentWidget.parent];
        }

        length = stack.length;
        for (i = 0; i < length; i++) {
            for (property in stack[i]) {
                if (stack[i].hasOwnProperty(property)) {
                    props[property] = stack[i][property].type;
                }
            }
        }
        return props;
    },

    /**
     * Gets the available instance property options for a given widget type.
     * Follows parent chain to find inherited properties.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Object} Object with all of the widget's available property
     *                  options, or undefined if the widget type is not
     *                  or no options defined.
     * @throws {Error} If widgetType is invalid.
     */
    getPropertyOptions: function (widgetType) {
        var stack = [], options = {}, length, i, property, widget, currentWidget;
        widget = currentWidget = BWidgetRegistry[widgetType];

        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getPropertyOptions: " +
                            widgetType);
        }

        // build hierarchical stack so child properties will override parents
        // although, really there should be no such conflicts
        while (currentWidget) {
            stack.unshift(currentWidget.properties);
            currentWidget = BWidgetRegistry[currentWidget.parent];
        }

        length = stack.length;
        for (i = 0; i < length; i++) {
            for (property in stack[i]) {
                if (stack[i].hasOwnProperty(property)) {
                    options[property] = stack[i][property].options;
                }
            }
        }
        return options;
    },

    /**
     * Gets the available instance property defaults for a given widget type.
     * Follows parent chain to find inherited properties.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Object} Object with all of the widget's available properties,
     *                  whose values are the default values.
     * @throws {Error} If widgetType is invalid.
     */
    getPropertyDefaults: function (widgetType) {
        var stack = [], props = {}, length, i, property, widget, currentWidget;
        widget = currentWidget = BWidgetRegistry[widgetType];

        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getPropertyDefaults: "+
                            widgetType);
        }

        // build hierarchical stack so child properties will override parents
        //   although, really there should be no such conflicts
        while (currentWidget) {
            stack.unshift(currentWidget.properties);
            currentWidget = BWidgetRegistry[currentWidget.parent];
        }

        length = stack.length;
        for (i = 0; i < length; i++) {
            for (property in stack[i]) {
                if (stack[i].hasOwnProperty(property)) {
                    props[property] = stack[i][property].defaultValue;
                }
            }
        }
        return props;
    },

    /**
     * Gets the property description schema a given instance property.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {Object} An object with a "type" string and "defaultValue" or
     *                  "autoGenerate" string.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertySchema: function (widgetType, property) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getPropertySchema: " +
                            widgetType);
        }

        // build hierarchical stack so child properties will override parents
        while (widget) {
            if (widget.properties && widget.properties[property]) {
                return widget.properties[property];
            }
            widgetType = widget.parent;
            widget = BWidgetRegistry[widgetType];
        }

        // no such property found in hierarchy
        throw new Error("property not found in getPropertyScheme: " + property);
    },

    /**
     * Gets the Javascript type string for a given instance property.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {String} The Javascript type string for the given property
     *                  ("number", "string", "boolean", "object", ...).
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyType: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.type;
        }
        return schema;
    },

    /**
     * Gets the default value for a given instance property.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {AnyType} The default value for the given property, or
     *                   undefined if this property has no default (in which
     *                   case there should be an autoGenerate prefix set).
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyDefault: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.defaultValue;
        }
        return schema;
    },

     /**
     * Gets the auto-generate prefix for a given instance property. For now,
     * this only makes sense for string properties. The auto-generate string is
     * a prefix to which will be appended a unique serial number across this
     * widget type in the design.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {Boolean} Auto-generation string prefix, or undefined if there
     *                   is none or it is invalid.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyAutoGenerate: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            if (typeof schema.autoGenerate === "string") {
                return schema.autoGenerate;
            } else {
                return undefined;
            }
        }
        return schema;
    },

    /**
     * Determines if the given instance property exists for the given widget
     * type.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {Boolean} True if the property exists, false otherwise.
     * @throws {Error} If widgetType is invalid.
     */
    propertyExists: function (widgetType, property) {
        var widget = BWidgetRegistry[widgetType], propertyType;
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in propertyExists: " +
                            widgetType);
        }

        try {
            propertyType = BWidget.getPropertyType(widgetType, property);
        }
        catch(e) {
            // catch exception if property doesn't exist
            return false;
        }
        return true;
    },

    /**
     * Gets the template for a given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @return {String} The template string for this widget type, or empty
     *                  string if the template is not a string or does not
     *                  exist.
     * @throws {Error} If widgetType is invalid.
     */
    getTemplate: function (widgetType) {
        var widget, template;
        widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getTemplate: " +
                            widgetType);
        }

        template = widget.template;
        if (typeof template !== "string" && typeof template !== "object" &&
            typeof template !== "function") {
            return "";
        }
        return template;
    },

    /**
     * Get redirect object for this type.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Object} The redirect object containing 'zone' and 'type' fields,
     *                  or undefined if none.
     * @throws {Error} If widgetType is invalid.
     */
    getRedirect: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getRedirect: " +
                            widgetType);
        }
        return widget.redirect;
    },

    /**
     * Get the zones available for a given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Array[String]} An array of the names of the available zones,
     *                         in the defined precedence order.
     * @throws {Error} If widgetType is invalid.
     */
    getZones: function (widgetType) {
        var zoneNames = [], widget, zones, length, i;
        widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getZones: " + widgetType);
        }

        zones = widget.zones;
        if (zones) {
            length = zones.length;
            for (i = 0; i < length; i++) {
                zoneNames.push(zones[i].name);
            }
        }
        return zoneNames;
    },

    /**
     * Get the cardinality for the given zone in the given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} zoneName The name of the zone.
     * @return {String} Returns the cardinality string: "1", "2", ... or "N".
     * @throws {Error} If widgetType is invalid or the zone is not found.
     */
    getZoneCardinality: function (widgetType, zoneName) {
        var widget, zones, length, i;
        widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getRedirect: " +
                            widgetType);
        }

        zones = widget.zones;
        if (zones && zones.length) {
            length = zones.length;
            for (i = 0; i < length; i++) {
                if (zones[i].name === zoneName) {
                    return zones[i].cardinality;
                }
            }
        }
        throw new Error("no such zone found in getZoneCardinality: " +
                        zoneName);
    },

    // helper function
    isTypeInList: function (type, list) {
        // requires: list can be an array, a string, or invalid
        //  returns: true, if type is the list string, or type is one of the
        //                 strings in list
        //           false, otherwise, or if list is invalid
        var i;
        if (list) {
            if (type === list) {
                return true;
            } else if (list.length > 0) {
                for (i = list.length - 1; i >= 0; i--) {
                    if (type === list[i]) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    /**
     * Checks whether a child type allows itself to be placed in a given parent.
     * Note: The parent may or may not allow the child.
     *
     * @param {String} parentType The type of the parent widget.
     * @param {String} childType The type of the child widget.
     * @return {Boolean} True if the relationship is allowed, false otherwise.
     * @throws {Error} If parentType or childType is invalid.
     */
    childAllowsParent: function (parentType, childType) {
        var parent, child, allowIn, denyIn;
        parent = BWidgetRegistry[parentType];
        child = BWidgetRegistry[childType];
        if ((typeof parent === "object") && (typeof child === "object")) {
            allowIn = child.allowIn;
            if (allowIn) {
                return BWidget.isTypeInList(parentType, allowIn);
            }
            denyIn = child.denyIn;
            if (denyIn) {
                return !BWidget.isTypeInList(parentType, denyIn);
            }
            return true;
        }
        throw new Error("invalid parent or child widget type in " +
                        "childAllowsParent");
    },

    /**
     * Checks whether a child type is allowed in a given parent zone.
     * Note: The parent may or may not allow the child.
     * Note: If the cardinality is "1" and there is already a child in the
     *       zone, it is "allowed" but still won't work.
     *
     * @param {String} parentType The type of the parent widget.
     * @param {String} zone The name of the parent zone.
     * @param {String} childType The type of the child widget.
     * @return {Boolean} True if the child type is allowed, false otherwise.
     * @throws {Error} If parentType or childType is invalid, or the zone is not
     *                 found.
     */
    zoneAllowsChild: function (parentType, zone, childType) {
        var parent, child, zones, i, allow, deny;
        parent = BWidgetRegistry[parentType];
        child = BWidgetRegistry[childType];
        if ((typeof parent !== "object") || (typeof child !== "object")) {
            throw new Error("parent or child type invalid in zoneAllowsChild");
        }

        zones = parent.zones;
        if (zones && zones.length > 0) {
            for (i = zones.length - 1; i >= 0; i--) {
                if (zones[i].name === zone) {
                    allow = zones[i].allow;
                    if (allow) {
                        return BWidget.isTypeInList(childType, allow);
                    }
                    deny = zones[i].deny;
                    if (deny) {
                        return !BWidget.isTypeInList(childType, deny);
                    }
                    return true;
                }
            }
        }
        throw new Error("no such zone found in zoneAllowsChild: " + zone);
    },

    /**
     * Checks whether a child type is allowed in some zone for the given
     * parent.
     * Note: The child may or may not allow the parent.
     *
     * @param {String} parentType The type of the parent widget.
     * @param {String} childType The type of the child widget.
     * @return {Boolean} True if the child type is allowed, false otherwise.
     * @throws {Error} If parentType or childType is invalid.
     */
    parentAllowsChild: function (parentType, childType) {
        var parent, zones, i;
        parent = BWidgetRegistry[parentType];
        if (typeof parent !== "object") {
            throw new Error("parent type invalid in parentAllowsChild");
        }

        zones = parent.zones;
        if (zones && zones.length > 0) {
            for (i = zones.length - 1; i >= 0; i--) {
                if (BWidget.zoneAllowsChild(parentType, zones[i].name,
                                            childType)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Finds zone names in the given parent type that will allow the given
     * child type.
     *
     * @param {String} parentType The type of the parent widget.
     * @param {String} childType The type of the child widget.
     * @return {Array[String]} Array of zone names that allow this child, in
     *                         precedence order, or an empty array if none.
     * @throws {Error} If parentType or childType is invalid.
     */
    zonesForChild: function (parentType, childType) {
        var array = [], parent, zones, i;
        if (!BWidget.childAllowsParent(parentType, childType)) {
            return [];
        }

        // parent must be valid of we would have failed previous call
        parent = BWidgetRegistry[parentType];
        zones = parent.zones;
        if (zones && zones.length > 0) {
            for (i = zones.length - 1; i >= 0; i--) {
                if (BWidget.zoneAllowsChild(parentType, zones[i].name,
                                            childType)) {
                    array.splice(0, 0, zones[i].name);
                }
            }
        }
        return array;
    },

    /**
     * Tests whether this BWidget is allowed to be selected.
     *
     * @return {Boolean} True if this BWidget is selectable.
     * @throws {Error} If widgetType is invalid.
     */
    isSelectable: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("widget type invalid in isSelectable");
        }
        return widget.hasOwnProperty("selectable") ? widget.selectable : true;
    },

    /**
     * Tests whether this BWidget is allowed to be selected.
     *
     * @return {Boolean} True if this BWidget is selectable.
     * @throws {Error} If widgetType is invalid.
     */
    isMoveable: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("widget type invalid in isMoveable");
        }
        return widget.hasOwnProperty("moveable") ? widget.moveable : true;
    }
};

// initialize the widget registry
BWidget.init();
