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
                defaultValue: "",
                htmlAttribute: "id"
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
                defaultValue: [
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
                    },
                    { designOnly: false,
                      value: 'lib/web-ui-fw-libs.js'
                    },
                    { designOnly: false,
                      value: 'lib/web-ui-fw.js'
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
                    { designOnly: false,
                      value: 'src/css/web-ui-fw-theme.css'
                    },
                    { designOnly: false,
                      value: 'src/css/web-ui-fw-widget.css'
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
            var prop, code = $('<div data-role="page"></div>');
            code.attr("id", node.getProperty("id"));

            // don't write data-theme if it's using the default
            prop = node.getProperty("theme");
            if (prop !== "default") {
                code.attr("data-theme", prop);
            }
            return code;
        },

        showInPalette: false,
        selectable: true,
        moveable: false,
        properties: {
            id: {
                type: "string",
                autoGenerate: "page"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
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
            var prop, code = $('<div data-role="header"><h1></h1></div>');
            code = BWidgetRegistry.Base.applyProperties(node, code);

            // only write data-position if it's being set to fixed
            if (node.getProperty("position") === "fixed") {
                code.attr("data-position", "fixed");
            }

            // don't write data-theme if it's using the default
            prop = node.getProperty("theme");
            if (prop !== "default") {
                code.attr("data-theme", prop);
            }

            // always write the title
            code.find("h1")
                .text(node.getProperty("text"));
            return code;
        },

        moveable: false,
        properties: {
            text: {
                type: "string",
                defaultValue: "Header"
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
                allow: "Navbar, OptionHeader"
            }
        ],
    },

    /**
     * Represents a footer object at the bottom of a page.
     */
    Footer: {
        parent: "Base",
        allowIn: "Page",
        template: function (node) {
            var prop, code = $('<div data-role="footer"></div>');
            code = BWidgetRegistry.Base.applyProperties(node, code);

            // only write data-position if it's being set to fixed
            if (node.getProperty("position") === "fixed") {
                code.attr("data-position", "fixed");
            }

            // don't write data-theme if it's using the default
            prop = node.getProperty("theme");
            if (prop !== "default") {
                code.attr("data-theme", prop);
            }

            // write the text if non-empty
            prop = node.getProperty("text");
            if (prop) {
                code.append('<h1>' + prop + '</h1>');
            }
            return code;
        },

        moveable: false,
        properties: {
            text: {
                type: "string",
                defaultValue: "Footer",
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
                name: "default",
                cardinality: "N",
                // deny Slider widgets because they render poorly; this may be
                // a bug in jQuery Mobile
                deny: "Slider"
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
     * Represents a Control Group object. Includes an "data-type" property
     * that should be "vertical" or "horizontal"
     */
    ButtonGroup: {
        parent: "Base",
        template: '<div data-role="controlgroup"></div>',
        newGroup: true,
        displayLabel: "Button Group",
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Button"
            }
        ],
        properties: {
            // TODO: Look into why, if this property is renamed "type",
            //       the ButtonGroup goes crazy and doesn't work
            orientation: {
                type: "string",
                options: [ "vertical", "horizontal" ],
                defaultValue: "vertical",
                htmlAttribute: "data-type"
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
            target: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "href"
            },
            icon: {
                type: "string",
                options: [ "none", "alert", "arrow-d", "arrow-l", "arrow-r",
                           "arrow-u", "back", "check", "delete", "forward",
                           "gear", "grid", "home", "info", "minus", "plus",
                           "refresh", "search", "star" ],
                defaultValue: "none",
                htmlAttribute: "data-icon"
            },
            iconpos: {
                type: "string",
                options: [ "left", "top", "bottom", "right", "notext" ],
                defaultValue: "left",
                htmlAttribute: "data-iconpos"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            },
            inline: {
                type: "string",
                options: [ "true", "false" ],
                defaultValue: "false",
                htmlAttribute: "data-inline"
            }
        },
        template: '<a data-role="button">%TEXT%</a>'
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
        template: '<form></form>',
        newGroup: true,
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ],
        properties: {
            action: {
                type: "string",
                defaultValue: "#",
                htmlAttribute: "action",
                forceAttribute: true
            },
            method: {
                type: "string",
                options: [ "GET", "POST" ],
                defaultValue: "POST",
                htmlAttribute: "method",
                forceAttribute: true
            }
        }
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
            label: {
                type: "string",
                defaultValue: ""
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
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default"
            },
            track: {
                displayName: "track theme",
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default"
            }
        },
        template: function (node) {
            var label, idstr, prop, input,
                code = $('<div data-role="fieldcontain"></div>');

            prop = node.getProperty("id");
            idstr = prop + "-range";

            label = node.getProperty("label");
            if (label) {
                code.append($('<label for="$1">$2</label>'
                              .replace(/\$1/, idstr)
                              .replace(/\$2/, label)));
            }

            input = $('<input type="range">');
            if (label) {
                input.attr("id", idstr);
            }

            prop = node.getProperty("value");
            input.attr("value", prop);

            prop = node.getProperty("min");
            input.attr("min", prop);

            prop = node.getProperty("max");
            input.attr("max", prop);

            prop = node.getProperty("theme");
            if (prop !== "default") {
                input.attr("data-theme", prop);
            }

            prop = node.getProperty("track");
            if (prop !== "default") {
                input.attr("data-track-theme", prop);
            }

            code.append(input);
            return code;
        }
    },

    /**
     * Represents a text label. A "text" string property holds the text.
     */
    Label: {
        // FIXME: I'm not sure we should really have this. Instead we make
        //        label text a property of other form elements and the
        //        <label> part of their templates.
        parent: "Base",
        properties: {
            text: {
                type: "string",
                defaultValue: "Label"
            }
        },
        template: '<label>%TEXT%</label>',
    },

    /**
     * Represents a text entry.
     */
    TextInput: {
        parent: "Base",
        displayLabel: "Text Input",
        properties: {
            hint: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "placeholder"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            },
            value: {
                // FIXME: Probably value should be removed, setting initial
                //        static text is not a common thing to do
                type: "string",
                defaultValue: "",
                htmlAttribute: "value"
            }
        },
        template: '<input type="text">',
    },

    /**
     * Represents a text area entry.
     */
    TextArea: {
        // FIXME: good form is to include a <label> with all form elements
        //        and wrap them in a fieldcontain
        parent: "Base",
        displayLabel: "Text Area",
        properties: {
            hint: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "placeholder"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            }
        },
        template: '<textarea></textarea>'
    },

    /**
     * Represents a toggle switch.
     */
    ToggleSwitch: {
        parent: "Base",
        displayLabel: "Toggle Switch",
        properties: {
            value1: {
                type: "string",
                defaultValue: "off"
            },
            label1: {
                type: "string",
                defaultValue: "Off"
            },
            value2: {
                type: "string",
                defaultValue: "on"
            },
            label2: {
                type: "string",
                defaultValue: "On"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            }
        },
        template: '<select data-role="slider"><option value="%VALUE1%">%LABEL1%</option><option value="%VALUE2%">%LABEL2%</option></select>',
        // jQM generates an div next to the slider, which is the actually clicked item when users try to click the flip toggle switch.
        delegate:"next",
    },

    /**
     * Represents a select element.
     */
    SelectMenu: {
        parent: "Base",
        template: '<select></select>',
        newGroup: true,
        displayLabel: "Select Menu",
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: [ "Option" ]
            }
        ],
        //jQM generates two levels of divs for a select, the topmost one is what is clicked.
        delegate: "grandparent",
        events: {
           click: function (e) {
               e.stopPropagation();
               if (Math.abs(e.offsetY) > this.offsetHeight)
                  return this.ownerDocument.defaultView.handleSelect(e, this.options[this.selectedIndex]);
           }
        }

    },

    /**
     * Represents an option element.
     */
    Option: {
        parent: "Base",
        properties: {
            text: {
                type: "string",
                defaultValue: "Option"
            },
            value: {
                type: "string",
                defaultValue: ""
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            }
        },
        template: '<option>%TEXT%</option>'
    },

    /**
     * Represents a Control Group object. Includes an "data-type" property
     * that should be "vertical" or "horizontal"
     */
    ControlGroup: {
        parent: "Base",
        newGroup: true,
        displayLabel: "Control Group",
        properties: {
            // FIXME: Put fieldcontain back in here, but will require
            //        support for selector on HTML attribute for data-type

            // FIXME: Before the legend was not written if with-legend was
            //        "no" -- instead, we could just check for empty legend
            //        in a template function, like I did in Slider in this
            //        commit. But it seems to work fine with a blank
            //        legend, so maybe it makes sense to always write to
            //        guide the user as they edit the HTML.
            orientation: {
                type: "string",
                options: [ "vertical", "horizontal" ],
                defaultValue: "vertical",
                htmlAttribute: "data-type"
            },
            legend: {
               type: "string",
               defaultValue: ""
            },
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                // TODO: probably only a single type should be allowed, that
                //       would take more work to enforce
                allow: [ "RadioButton", "Checkbox" ]
            }
        ],
        template: '<fieldset data-role="controlgroup"><legend>%LEGEND%</legend></fieldset>',
    },

    /**
     * Represents an radio button element.
     */
    RadioButton: {
        parent: "Base",
        displayLabel: "Radio Button",
        allowIn: "ControlGroup",
        properties: {
            // FIXME: All the radio buttons in a group need to have a common
            //        "name" field in order to work correctly
            id: {
                type: "string",
                autoGenerate: "radio",
                htmlAttribute: "id"
            },
            label: {
                type: "string",
                defaultValue: "Radio Button"
            },
            value: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "value"
            },
            checked: {
                type: "string",
                options: [ "not checked", "checked" ],
                defaultValue: "not checked",
                htmlAttribute: "checked"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            }
        },
        template: '<input type="radio"><label for="%ID%">%LABEL%</label>',
    },

    /**
     * Represents an checkbox element.
     */
    Checkbox: {
        parent: "Base",
        allowIn: "ControlGroup",
        properties: {
            id: {
                type: "string",
                autoGenerate: "checkbox",
                htmlAttribute: "id"
            },
            label: {
                type: "string",
                defaultValue: "Checkbox",
            },
            value: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "value"
            },
            checked: {
                type: "string",
                options: [ "not checked", "checked" ],
                defaultValue: "not checked",
                htmlAttribute: "checked"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            }
        },
        template: '<input type="checkbox"><label for="%ID%">%LABEL%</label>',
    },

    /**
     * Represents a unordered list element.
     */
    List: {
        parent: "Base",
        newGroup: true,
        properties: {
            inset: {
                type: "string",
                options: [ "true", "false" ],
                defaultValue: "true",
                htmlAttribute: "data-inset",
                // because data-inset="false" is the real default, do this:
                forceAttribute: true
                // FIXME: would be better to distinguish from the default that
                //        occurs if you leave it off, vs. the default we think
                //        the user is most likely to want
            },
            filter: {
                type: "string",
                options: [ "true", "false" ],
                defaultValue: "false",
                htmlAttribute: "data-filter"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            },
            divider: {
                displayName: "divider theme",
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-divider-theme"
            }
        },
        template: '<ul data-role="listview">',
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: [ "ListItem", "ListDivider", "ListButton" ]
            }
        ],
    },

    /**
     * Represents an ordered list element.
     */
    OrderedList: {
        parent: "Base",
        displayLabel: "Ordered List",
        properties: {
            inset: {
                type: "string",
                options: [ "true", "false" ],
                defaultValue: "true",
                htmlAttribute: "data-inset",
                // because data-inset="false" is the real default, do this:
                forceAttribute: true
                // FIXME: would be better to distinguish from the default that
                //        occurs if you leave it off, vs. the default we think
                //        the user is most likely to want
            },
            filter: {
                type: "string",
                options: [ "true", "false" ],
                defaultValue: "false",
                htmlAttribute: "data-filter"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            },
            divider: {
                displayName: "divider theme",
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-divider-theme"
            }
        },
        template: '<ol data-role="listview">',
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: [ "ListItem", "ListDivider", "ListButton" ]
            }
        ],
    },

    /**
     * Represents a list item element.
     */
    ListItem: {
        parent: "Base",
        displayLabel: "List Item",
        allowIn: [ "List", "OrderedList" ],
        properties: {
            text: {
                type: "string",
                defaultValue: "List Item",
            }
        },
        template: '<li>%TEXT%</li>'
    },

    /**
     * Represents a list divider element.
     */
    ListDivider: {
        parent: "Base",
        displayLabel: "List Divider",
        allowIn: [ "List", "OrderedList" ],
        properties: {
            text: {
                type: "string",
                defaultValue: "List Divider"
            }
        },
        template: '<li data-role="list-divider">%TEXT%</li>'
    },

    /**
     * Represents a button. A "text" string property holds the button text.
     */
    ListButton: {
        parent: "Base",
        displayLabel: "List Button",
        allowIn: [ "List", "OrderedList" ],
        properties: {
            text: {
                type: "string",
                defaultValue: "Button"
            },
            target: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "href",
                htmlSelector: "a"
            },
            icon: {
                type: "string",
                options: [ "none", "alert", "arrow-d", "arrow-l", "arrow-r",
                           "arrow-u", "back", "check", "delete", "forward",
                           "gear", "grid", "home", "info", "minus", "plus",
                           "refresh", "search", "star" ],
                defaultValue: "none",
                htmlAttribute: "data-icon"
            },
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-theme"
            }
        },
        template: '<li><a>%TEXT%</a></li>'
    },

    /**
     * Represents a grid element.
     */
    Grid: {
        parent: "Base",
        newGroup: true,
        properties: {
            subtype: {
                type: "string",
                options: [ "a", "b", "c", "d" ],
                defaultValue: "a",
            },
        },
        template: '<div class="ui-grid-%SUBTYPE%"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Block"
            }
        ],
    },

    /**
     * Represents a grid block element.
     */
    Block: {
        parent: "Base",
        allowIn: "Grid",
        properties: {
            subtype: {
                type: "string",
                options: [ "a", "b", "c", "d" ],
                defaultValue: "a",
            },
        },
        template: '<div class="ui-block-%SUBTYPE%"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ],
    },

    /**
     * Represents a collapsible element.
     */
    Collapsible: {
        parent: "Base",
        template: '<div data-role="collapsible" data-collapsed="false"><h1>%HEADING%</h1></div>',
        newGroup: true,
        properties: {
            // NOTE: Removed "size" (h1 - h6) for the same reason we don't
            //       provide that option in header/footer currently. jQM
            //       renders them all the same, the purpose is only for the
            //       developer to distinguish between different levels of
            //       hierarchy for their own purposes. For now, I think it
            //       just makes sense to have them manually change them if
            //       they care, it's rather advanced and not something most
            //       of our users would care about.
            heading: {
                type: "string",
                defaultValue: "Collapsible Area",
            },
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                // FIXME: Ultimately, this should probably be allowed, but
                //        for now, it's way too hard to drop two collapsibles
                //        into a collapsible set without this line, because
                //        when it's prevented the canvas looks up to the
                //        parent and tries to add it.
                deny: "Collapsible"
            }
        ],
    },

    /**
     * Represents a set of collapsible elements.
     */
    Accordion: {
        parent: "Base",
        template: '<div data-role="collapsible-set"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Collapsible"
            }
        ],
    },

    DateTimePicker: {
        parent: "Base",
        template: '<input type="date" />',
        newGroup: true,
        newAccordion: true,
        delegate: 'next'
    },

    CalendarPicker: {
        parent: "Base",
        template: '<a data-role="calendarpicker" data-icon="grid" data-iconpos="notext" data-inline="true"></a>',

    },

    ColorPicker: {
        parent: "Base",
        template: '<div data-role="colorpicker" />',
        newGroup: true,
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#ff00ff",
            },
        }
    },

    ColorPickerButton: {
        parent: "Base",
        template: '<div data-role="colorpickerbutton" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039",
            },
        },
        delegate: 'next'
    },

    ColorPalette: {
        parent: "Base",
        template: '<div data-role="colorpalette" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039",
            },
            show_preview: {
                type: "string",
                options: [ "true", "false" ],
                defaultValue: "false",
                htmlAttribute: "data-show-preview"
            }
        },
    },


    ColorTitle: {
        parent: "Base",
        template: '<div data-role="colortitle" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039",
            },
        },
    },

    HsvPicker: {
        parent: "Base",
        template: '<div data-role="hsvpicker" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039",
            },
        },
    },

    ProgressBar: {
        parent: "Base",
        newGroup: true,
        template: '<div data-role="processingbar" />',
    },

    Switch: {
        parent: "Base",
        template: '<div data-role="toggleswitch" />',
        delegate: 'next'
    },

    OptionHeader: {
        parent: "Base",
        template: '<div data-role="optionheader" />',
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Grid"
            }
        ],
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

                if (BWidgetRegistry[type].displayLabel === undefined) {
                    // TODO: i18n: localize displayLabel based on type
                    BWidgetRegistry[type].displayLabel = type;
                }
                if (type === "DateTimePicker") {
                    BWidgetRegistry[type].displayLabel = "Date Time Picker";
                }
                if (type === "ColorPicker") {
                    BWidgetRegistry[type].displayLabel = "Color Picker";
                }
                if (type === "ColorPickerButton") {
                    BWidgetRegistry[type].displayLabel = "Color Picker Button";
                }
                if (type === "ColorPalette") {
                    BWidgetRegistry[type].displayLabel = "Color Palette";
                }
                if (type === "ColorTitle") {
                    BWidgetRegistry[type].displayLabel = "Color Title";
                }
                if (type === "HsvPicker") {
                    BWidgetRegistry[type].displayLabel = "HSV Picker";
                }
                if (type === "ProgressBar") {
                    BWidgetRegistry[type].displayLabel = "Progress Bar";
                }
                if (type === "CalendarPicker") {
                    BWidgetRegistry[type].displayLabel = "Calendar Picker";
                }
                if (type === "OptionHeader") {
                    BWidgetRegistry[type].displayLabel = "Option Header";
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
                return "";
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
        throw new Error("property not found in getPropertySchema: " + property);
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
     * Gets the HTML attribute associated with this property.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the property.
     * @return {String} The name of an HTML attribute to set to this property
     *                  value in the template, or undefined if no HTML
     *                  attribute should be set.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyHTMLAttribute: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.htmlAttribute;
        }
        return schema;
    },

    /**
     * Gets the HTML selector that will find the DOM node this attribute
     * belongs to.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the property.
     * @return {String} An HTML selector that can be applied to the template
     *                  to find the DOM nodes that this attribute should be
     *                  applied to, or undefined if none.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyHTMLSelector: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.htmlSelector;
        }
        return schema;
    },

    /**
     * Gets whether or not the HTML attribute for this property should be
     * output even if it is the default value.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the property.
     * @return {Boolean} True if the HTML attribute for this property should
     *                   be set even if the proeprty is a default value.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyForceAttribute: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.forceAttribute;
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
    },

    /**
     * Tests whether this BWidget begins a new widget group.
     *
     * @return {Boolean} True if this BWidget is the first in a new group.
     * @throws {Error} If widgetType is invalid.
     */
    startsNewGroup: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("widget type invalid in startsNewGroup");
        }
        return widget.newGroup ? true : false;
    },

    /**
     * Tests whether this BWidget begins a new accordion.
     *
     * @return {Boolean} True if this BWidget is the first in a new group.
     * @throws {Error} If widgetType is invalid.
     */
    startsNewAccordion: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("widget type invalid in startsNewAccordion");
        }
        return widget.newAccordion ? true : false;
    },

    /**
     * Gets the selection delegate for the given widget type.
     *
     * @return The attribute of the widget
     */
    getWidgetAttribute: function (widgetType, attribute) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("widget type invalid in getWidgetAttribute");
        }
        return widget[attribute];
    }

};

// initialize the widget registry
BWidget.init();
