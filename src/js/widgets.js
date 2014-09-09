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
 * BCommonProperties stores property definitions that are used in more than one
 * widget.
 */
var BCommonProperties = {
    checked: {
        type: "string",
        options: [ "not checked", "checked" ],
        defaultValue: "not checked",
        htmlAttribute: "checked"
    },
    disabled: {
        type: "boolean",
        defaultValue: false,
        htmlAttribute: "disabled"
    },
    filter: {
        type: "boolean",
        defaultValue: false,
        htmlAttribute: "data-filter"
    },
    icon: {
        type: "datalist",
        options: [ "none", "alert", "arrow-d", "arrow-l", "arrow-r",
                   "arrow-u", "back", "check", "delete", "forward",
                   "gear", "grid", "home", "info", "minus", "plus",
                   "refresh", "search", "star" ],
        defaultValue: "none",
        htmlAttribute: "data-icon"
    },
    iconpos: {
        displayName: "icon position",
        type: "string",
        options: [ "left", "top", "bottom", "right", "notext" ],
        defaultValue: "left",
        htmlAttribute: "data-iconpos"
    },
    inline: {
        type: "boolean",
        defaultValue: false,
        htmlAttribute: "data-inline"
    },
    mini: {
        type: "boolean",
        defaultValue: false,
        htmlAttribute: "data-mini"
    },
    nativecontrol: {
        displayName: "native control",
        type: "boolean",
        defaultValue: false,
        htmlAttribute: "data-role",
        htmlValueMap: { "true": "none" }
    },
    position: {
        type: "string",
        options: [ "default", "fixed" ],
        defaultValue: "default",
        htmlAttribute: "data-position"
    },
    text: {
        type: "string",
        defaultValue: "Button"
    },
    theme: {
        type: "string",
        options: function() {
            var pmUtils = $.rib.pmUtils, currentTheme, pid, swatches = [];
            pid = pmUtils.getActive();
            if (pid) {
                currentTheme = pmUtils.getProperty(pid, "theme");
                if (currentTheme === 'Default') {
                    swatches = ["default", "a", "b", "c", "d", "e"];
                } else {
                    swatches = pmUtils.themesList[currentTheme];
                }
            }
            return swatches;
        },
        defaultValue: "default",
        htmlAttribute: "data-theme"
    },
    track_theme: {
        displayName: "track theme",
        type: "string",
        options: [ "default", "a", "b", "c", "d", "e" ],
        defaultValue: "default",
        htmlAttribute: "data-track-theme"
    },
    inset: {
        type: "boolean",
        defaultValue: true,
        htmlAttribute: "data-inset",
        // because data-inset="false" is the real default, do this:
        forceAttribute: true
        // FIXME: would be better to distinguish from the default that
        //        occurs if you leave it off, vs. the default we think
        //        the user is most likely to want
    }
};

/**
 * BWidgetRegistry is private data, you should access it through BWidget
 *
 * Top-level object with properties representing all known widgets
 * Each property should be an object with:
 *   1)        parent: string name of inherited parent object
 *   2) showInPalette: boolean for user-exposed widgets (default true)
 *   3)    properties: an object with property name keys and type string values,
 *                     (see details below)
 *   4)      template: a string for code to generate for this widget, or a
 *                     function to be called to generate code
 *   5)         zones: an array of places where the widget can contain children,
 *                     (see details below)
 *   6)       allowIn: a string or array of strings - the widgets that are
 *                     allowed to contain this widget (e.g. a Block should only
 *                     go in a Grid, even though Page Content allows any child)
 *   7)    selectable: boolean, currently poorly named, seemingly means whether
 *                     to show it in the outline view or not (default: true)
 *   8)      moveable: boolean, whether it should be draggable in the design
 *                     canvas (default: true)
 *   9)      redirect: an object containing zone string and type string; if a
 *                     widget is attempted to be added to this widget, instead
 *                     add it to the given zone, inside the widget type
 *                     (first creating that widget if it doesn't exist)
 *  10)  displayLabel: the name to be displayed to the user for this widget, if
 *                     different from the raw name (eventually this should be
 *                     overwritten by localized values)
 *  11)      delegate: [FIXME] something to do with which node in the generated
 *                     template is used for event handling (string or function)
 *  12)        events: [FIXME] something to do with handling events
 *  13)          init: function to be called after a new widget is created with
 *                     default properties, e.g. when dragged onto the canvas
 *                     from the palette (i.e. Grid uses this to generate its
 *                     two default child Blocks)
 *  14)  outlineLabel: optional function(ADMNode) that returns a label to show
 *                     (intended even for widgets w/ showInPalette false)
 *  15)      editable: optional object, containing an optional selector and a
 *                     a required property name (see #3 above).  Existance of
 *                     this object implies the textContent node of the
 *                     resulting DOM element is editable in-line
 *
 * Each zone description in the array should be an object with:
 *   1) name identifying the zone point
 *   2) cardinality, either "1" or "N" representing number of contained items
 *   3) allow: string or array of string names or a function that returns
 *             a string or an array of allowable widgets
 *               (all others will be denied)
 *   4) deny: string or array of string names of disallowed widgets
 *             (all others will be allowed)
 *   Only one of allow or deny should be set, if neither than all are allowed.
 *   5) locator:  a selector used to find the html tag to append child node
 *                 of this zone.
 *   6) itemWrapper: an HTML tag used to wrapp a child node before appending
 *                   to the zone
 *   7) morph: function used to change the child type to another type before
 *             adding it to the zone
 *
 * The "properties" of each widget definition is an object, each property of
 * which names a property of the widget. These are objects with the following
 * fields:
 *   1)            type: one of "boolean", "integer", "string", or "array" for
 *                       now
 *   2)    defaultValue: optional default value for the property, of the type
 *                       specified above
 *   3)   htmlAttribute: optional string with an HTML attribute name that this
 *                       property should be written to or an object that
 *                       contains the name and value mapping of the HTML
 *                       attribute
 *   4)  forceAttribute: if true, always write out the HTML attribute even when
 *                       it is equal to the default value (default: false)
 *   5)    htmlValueMap: optional object mapping property values to the strings
 *                       that should be used for serializing the property into
 *                       an HTML attribute (only makes sense when htmlAttribute
 *                       is set); alternately a function that takes a property
 *                       value and returns the serialization string
 *   6)    htmlSelector: optional selector to find the DOM nodes on which to
 *                       apply the HTML attribute (default: root node returned
 *                       by the template for this widget)
 *   7)    autoGenerate: "string" prefix for automatically assigning unique
 *                       values (only valid for string type)
 *   8)         options: An array of the only valid values for this property,
 *                       to be selected from a dropdown rather than freely
 *                       entered
 *   9) setPropertyHook: optional function to be called when a property is
 *                       about to change, giving the widget an opportunity to
 *                       modify its children (e.g. grid rows or columns change)
 *                       Takes the ADM node, the new property value, and a
 *                       transactionData object. The function returns a
 *                       transactionData object, if necessary, to track what
 *                       additional info would be needed to undo/redo this
 *                       transaction. If later the hook is passed this data
 *                       back, it should make use of it to undo/redo the
 *                       property change appropriately. (E.g. when grid rows
 *                       is lowered, it saves the removed Blocks in an array
 *                       by returning this data, then if called again with
 *                       that same data, it restores them. If rows went from
 *                       5 to 3 originally and you returned data X, you're
 *                       guaranteed that if you see data X again, you will be
 *                       going from 3 to 5 rows, and can make sense of the
 *                       data.)
 *  10)        validIn:  Parent widget in which this property is valid
 *  11)      invalidIn:  Parent widget in which this property is not valid
 *  12)        visible:  optional boolean for the property user-exposed in
 *                       property view (default true)
 *  13)        range:    optional object to define the value range of the
 *                       property. For example { min: 2, max: 5 } means
 *                       The minimum value is 2 and maximum value is 5. If
 *                       min/max is not specified, it means no limit for
 *                       minimum/maximum value respectively.
 * @class
 */
var BWidgetRegistry = {
    /**
     * "Base class" for other widget types, with an "id" string property.
     */
    Base: {
        parent: null,
        applyProperties: function (node, code) {
            var id = node.getProperty("id");
            if (id && node.isPropertyExplicit("id")) {
                code.attr("id", id);
            }
            return code;
        },
        selectable: true,
        moveable: true,
        properties: {
            id: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "id",
                valueValidator: /^[a-zA-Z0-9]*([\w-]*)$/
            },

            /*
             * Event properties
             */

            // Touch events
            tap: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            taphold: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            swipe: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            swipeleft: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            swiperight: {
                type: "event",
                defaultValue: "",
                visible: false,
            },

            // Scroll events
            scrollstart: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            scrollstop: {
                type: "event",
                defaultValue: "",
                visible: false,
            },

            // Virtual mouse events
            vmouseover: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            vmouseout: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            vmousedown: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            vmousemove: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            vmouseup: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            vclick: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            vmousecancel: {
                type: "event",
                defaultValue: "",
                visible: false,
            },

            // Orientation change event
            orientationchange: {
                type: "event",
                defaultValue: "",
                visible: false,
            },

            // Layout events
            updatelayout: {
                type: "event",
                defaultValue: "",
                visible: false,
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
                    { key: 'name',
                      value: 'viewport',
                      content: 'width=device-width, initial-scale=1'
                    },
                    { designOnly: true,
                      key: 'http-equiv',
                      value: 'cache-control',
                      content: 'no-cache'
                    }
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
                      value: 'lib/jquery.mobile-1.1.0.js'
                    },
                ]
            },
            css: {
                type: "array",
                defaultValue: [
                    { designOnly: false,
                      value: 'src/css/jquery.mobile.structure-1.1.0.css'
                    },
                    { designOnly: false,
                      value: 'src/css/jquery.mobile.theme-1.1.0.css',
                      theme: true,
                      inSandbox: false
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
        ]
    },

    /**
    * Support background images using <div>
    */
    Background: {
        parent: "Base",
        properties: {
            background: {
                type: "url-uploadable",
                defaultValue: "",
                htmlAttribute: "style",
                htmlValueMap: function (propValue) {
                    return "background-image: url('" + propValue + "'); " +
                        "background-attachment: fixed; " +
                        "background-repeat: no-repeat; " +
                        "background-size: 100% 100%;";
                }
            }
        }
    },

    /**
     * Represents a page or dialog in the application. Includes "top" zone
     * for an optional header, "content" zone for the Content area, and "bottom"
     * zone for an optional footer.
     */
    Page: {
        parent: "Background",
        allowIn: "Design",
        showInPalette: false,
        selectable: true,
        moveable: false,
        template: function (node) {
            var prop, code, design = node.getDesign();

            // make sure style of the first page can only be page
            if (design.getChildren()[0] === node) {
                code =  $('<div data-role="page"></div>');
            } else {
                code = $('<div data-role="' +
                        (node.getProperty("dialog") ? "dialog" : "page") +
                         '"></div>');
            }

            return code;
        },
        properties: {
            id: {
                type: "string",
                autoGenerate: "page",
                htmlAttribute: "id",
                valueValidator: /^[a-zA-Z]([\w-]*)$/
            },
            theme: BCommonProperties.theme,
            dialog: {
                type: "boolean",
                defaultValue: false,
            },
            title: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "data-title",
            },
            pagebeforeload: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pageload: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pageloadfailed: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pagebeforechange: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pagechange: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pagechangefailed: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pagebeforeshow: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pagebeforehide: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pageshow: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pagebeforecreate: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pagecreate: {
                type: "event",
                defaultValue: "",
                visible: false,
            },
            pageremove: {
                type: "event",
                defaultValue: "",
                visible: false,
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
                allow: [ "Header", "CustomHeader" ]
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
        ]
    },

    /**
     * Represents a header object at the top of a page. Includes a "text"
     * property that represents header text. Includes "left" and "right" zones
     * for optional buttons, and "bottom" zone for an optional navbar.
     */
    Header: {
        parent: "Background",
        allowIn: "Page",
        dragHeader: true,
        paletteImageName: "jqm_header.svg",
        moveable: false,
        editable: {
            selector: "h1",
            propertyName: "text"
        },
        template: '<div data-role="header"><h1>%TEXT%</h1></div>',
        properties: {
            text: {
                type: "string",
                defaultValue: "Header"
            },
            position: BCommonProperties.position,
            theme: BCommonProperties.theme
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
                allow: [ "Navbar", "OptionHeader" ]
            }
        ]
    },

    /**
     * Represents a header object at the top of a page. Includes a "text"
     * property that represents header text. Includes "left" and "right" zones
     * for optional buttons, and "bottom" zone for an optional navbar.
     */
    CustomHeader: {
        parent: "Background",
        allowIn: "Page",
        dragHeader: true,
        paletteImageName: "jqm_customheader.svg",
        displayLabel: "Custom Header",
        moveable: false,
        template: '<div data-role="header"><div></div></div>',
        properties: {
            position: BCommonProperties.position,
            theme: BCommonProperties.theme
        },
        zones: [
            {
                name: "default",
                locator: '> div',
                cardinality: "N"
            }
        ],
        delegate: function (domNode, admNode) {
            $('> div', domNode).addClass('customHeader');
            return domNode;
        },
    },

    /**
     * Represents a footer object at the bottom of a page.
     */
    Footer: {
        parent: "Background",
        allowIn: "Page",
        dragHeader: true,
        paletteImageName: "jqm_footer.svg",
        template: function (node) {
            var prop, code = $('<div data-role="footer"></div>');
            code = BWidgetRegistry.Base.applyProperties(node, code);

            // TODO: Header always writes h1, here it's optional; perhaps
            // both should be doing the same thing?

            // write the text if non-empty
            prop = node.getProperty("text");
            if (prop) {
                code.append('<h1>' + prop + '</h1>');
            }
            return code;
        },

        moveable: false,
        editable: {
            selector: "h1",
            propertyName: "text"
        },
        properties: {
            text: {
                type: "string",
                defaultValue: "Footer"
            },
            position: BCommonProperties.position,
            theme: BCommonProperties.theme
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                // FIXME: deny Slider widgets because they render poorly; this
                // may be a bug in jQuery Mobile 1.0
                deny: [ "Slider", "ButtonSplitList" ]
            }
        ]
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
        ]
    },

    Navbar: {
        parent: "Base",
        template: '<div data-role="navbar"><ul/></div>',
        paletteImageName: "jqm_navbar.svg",
        dragHeader: true,
        allowIn: [ "Header", "Footer" ],
        zones: [
            {
                name: "default",
                locator: 'ul',
                itemWrapper: '<li/>',
                cardinality: "N",
                allow: "Button"
            }
        ],
        properties: {
            iconpos: $.extend({}, BCommonProperties.iconpos, {
                defaultValue: "top"
            })
        },
        init: function (node) {
            // initial state is three buttons
            var i;
            for (i = 0; i < 3; i++) {
                node.addChild(new ADMNode("Button"));
            }
        },
        events: {
            sortchange: function (e, ui) {
                BWidget.getWidgetAttribute("Navbar", "rearrange")($(this),
                    ui.placeholder, ui.placeholder.parent()
                    .closest('.nrc-sortable-container')[0] !== this);
            },
            sortout: function (e, ui) {
                BWidget.getWidgetAttribute("Navbar", "rearrange")
                    ($(this), ui.placeholder, true);
            },
            sortover: function (e, ui) {
                BWidget.getWidgetAttribute("Navbar", "rearrange")
                    ($(this), ui.placeholder);
            }
        },
        rearrange: function (sortable, placeholder, excludePlaceholder) {
            var classes = ['a', 'b', 'c', 'd', 'e', 'solo'],
                gridClasses = 'ui-grid-a ui-grid-b ui-grid-c ' +
                              'ui-grid-d ui-grid-e ui-grid-solo',
                blockClasses = 'ui-block-a ui-block-b ui-block-c ' +
                               'ui-block-d ui-block-e ui-block-solo',
                i = 0, j, pClass, blocks, zone;

            if (sortable.is('.ui-navbar')){
                zone = sortable.find('ul');
                pClass = excludePlaceholder ? blockClasses : 'ui-block-a';
                placeholder.toggleClass(pClass, !excludePlaceholder);
                blocks = zone.children('[class*=ui-block-]:visible');
                blocks.each( function () {
                    if (blocks.length > 5) i = i % 2;
                    $(this).toggleClass(blockClasses, false)
                           .toggleClass('ui-block-'+classes[i++], true);
                });
                j = (blocks.length>5) ? 0 : (i-2 < 0) ? 5 : i-2;
                zone.toggleClass(gridClasses, false)
                    .toggleClass('ui-grid-'+classes[j]);
            }
        }
    },

    /**
     * Represents simple text in the layout, possibly wrapped with a tag like
     * <h1> ... <h6>, <p>, <em>, etc.
     */
    Text: {
        parent: "Base",
        paletteImageName: "jqm_text.svg",
        template: function (node) {
            var type, code;

            type = node.getProperty("type");
            code = $('<' + type + '>');

            // FIXME: including a space here because the beautify script
            // adds whitespace between adjacent inline tags; this forces the
            // layout canvas to match the preview, and we just lose the ability
            // to have adjacent text sections without whitespace
            code.text(node.getProperty("text") + ' ');

            return BWidgetRegistry.Base.applyProperties(node, code);
        },
        properties: {
            text: {
                type: "string",
                defaultValue: "Text"
            },
            type: {
                type: "string",
                options: [ "span", "h1", "h2", "h3", "h4", "h5", "h6",
                           "label", "p", "em", "strong" ],
                defaultValue: "span"
            }
        },
        editable: {
            selector: "",
            propertyName: "text"
        }
    },

    /**
     * Represents a Control Group object. Includes an "data-type" property
     * that should be "vertical" or "horizontal"
     */
    ControlGroup: {
        parent: "Base",
        dragHeader: true,
        template: '<div data-role="controlgroup"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N",
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
        },
        init: function (node) {
            // initial state is three buttons
            var i, childType;
            childType = BWidget.getZone(node.getType(), "default").allow;
            if ($.isArray(childType))
                childType = childType[0];
            for (i = 0; i < 3; i++) {
                node.addChild(new ADMNode(childType));
            }
        }
    },

    /**
     * Represents a group of buttons
     */
    ButtonGroup: {
        parent: "ControlGroup",
        paletteImageName: "jqm_button_group.svg",
        displayLabel: "Button Group",
        properties: {
            orientation: {
                invalidIn: "Footer"
            }
        },
        zones: [
            {
                name: "default",
                allow: "Button"
            }
        ],
        template: function (node) {
            if (node.getParent().instanceOf("Footer"))
                return $('<div data-role="controlgroup" data-type="horizontal"></div>');
            else return $(BWidgetRegistry.ControlGroup.template);
        },
        init: function (node) {
            BWidgetRegistry.ControlGroup.init(node);
        }
    },

    /**
     * Represents a base button widget
     */
    ButtonBase: {
        parent: "Base",
        properties: {
            target: {
                type: "targetlist",
                defaultValue: "",
                // FIXME: "previous page" is a magic string coordinated with
                // property.js, which is bogus
                htmlAttribute: function (value) {
                    return (value === "previous page") ? "data-rel" : "href";
                },
                htmlValueMap: { "previous page": "back" }
            },
            opentargetas : {
                type: "string",
                displayName: "open target as",
                options: ["default", "page", "dialog"],
                defaultValue: "default",
                htmlAttribute: "data-rel",
                prerequisite: function (admNode) {
                    // NOTE: Prerequisites are broken, becuase they need to be
                    //   refreshed dynamically when the controlling property
                    //   changes, but there seems to be no such logic, so
                    //   disabling for now. GRG 2014/09/08
                    //return admNode.getProperty("target") !== "previous page";
                    return true;
                }
            },
            transition: {
                type: "string",
                options: [ "slide", "slideup", "slidedown", "pop", "fade",
                           "flip", "turn", "flow", "slidefade", "none" ],
                defaultValue: "slide",
                htmlAttribute: "data-transition"
            },
        },
        template: '<a data-role="button">%TEXT%</a>'
    },

    /**
     * Represents a button. A "text" string property holds the button text.
     */

    Button: {
        parent: "ButtonBase",
        paletteImageName: "jqm_button.svg",
        editable: {
            selector: "span > .ui-btn-text",
            propertyName: "text"
        },
        properties: {
            text: BCommonProperties.text,
            right: {
                displayName: "align right",
                validIn: "Header",
                type: "boolean",
                defaultValue: false
            },
            icon: BCommonProperties.icon,
            iconpos: $.extend({}, BCommonProperties.iconpos, {
                invalidIn: "Navbar"
            }),
            iconshadow: {
                displayName: "icon shadow",
                type: "boolean",
                defaultValue: true,
                htmlAttribute: "data-iconshadow",
            },
            mini: BCommonProperties.mini,
            active: {
                type: "boolean",
                defaultValue: false
            },
            theme: BCommonProperties.theme,
            inline: $.extend({}, BCommonProperties.inline, {
                invalidIn: "Navbar"
            }),
            corners: {
                type: "boolean",
                defaultValue: true,
                htmlAttribute: "data-corners"
            },
            shadow: {
                type: "boolean",
                defaultValue: true,
                htmlAttribute: "data-shadow"
            }
        },
        template: function (node) {
            var right, active, code = $('<a data-role="button">%TEXT%</a>');

            code.toggleClass("ui-btn-active", node.getProperty("active"));
            if(BWidget.propertyValidIn("Button", "right",
                node.getParent().getType())) {
                code.toggleClass("ui-btn-right", node.getProperty("right"));
            }
            return code;
        }
    },

    /**
     * Represents a image
     */
    Image: {
        parent: "Base",
        paletteImageName: "tizen_image.svg",
        template: '<img/>',
        properties: {
            src: {
                type: "url-uploadable",
                defaultValue: "src/css/images/widgets/tizen_image.svg",
                htmlAttribute: "src",
                forceAttribute: true
            },
            alt: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "alt"
            },
            width: {
                type: "integer",
                defaultValue: "",
                htmlAttribute: "width"
            },
            height: {
                type: "integer",
                defaultValue: "",
                htmlAttribute: "height"
            },
            align: {
                type: "string",
                options: [ "left", "center", "right" ],
                defaultValue: "left",
                htmlAttribute: "style",
                htmlValueMap: {
                    "left": "display: block; margin: auto auto auto 0px",
                    "center": "display: block; margin: 0 auto",
                    "right": "display: block; margin: auto 0px auto auto"
                }
            }
        }
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
        dragHeader: true,
        paletteImageName: "jqm_form.svg",
        template: '<form></form>',
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ],
        properties: {
            action: {
                type: "string",
                defaultValue: "http://",
                htmlAttribute: "action",
                forceAttribute: true
            },
            method: {
                type: "string",
                options: [ "GET", "POST" ],
                defaultValue: "POST",
                htmlAttribute: "method",
                forceAttribute: true
            },
            submit: {
                type: "event",
                defaultValue: "",
                visible: false,
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
        paletteImageName: "jqm_slider.svg",
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
                defaultValue: 50,
                forceAttribute: true,
                htmlAttribute: "value",
                htmlSelector: "input"
            },
            min: {
                type: "integer",
                defaultValue: 0,
                forceAttribute: true,
                htmlAttribute: "min",
                htmlSelector: "input"
            },
            max: {
                type: "integer",
                defaultValue: 100,
                forceAttribute: true,
                htmlAttribute: "max",
                htmlSelector: "input"
            },
            step: {
                type: "integer",
                defaultValue: 1,
                forceAttribute: true,
                htmlAttribute: "step",
                htmlSelector: "input"
            },
            mini: $.extend({}, BCommonProperties.mini, {
                htmlSelector: "input"
            }),
            theme: $.extend({}, BCommonProperties.theme, {
                htmlSelector: "input"
            }),
            track_theme: $.extend({}, BCommonProperties.track_theme, {
                htmlSelector: "input"
            }),
            highlight: {
                type: "boolean",
                defaultValue: false,
                htmlAttribute: "data-highlight",
                htmlSelector: "input"
            },
            disabled: $.extend({}, BCommonProperties.disabled, {
                htmlSelector: "input"
            })
        },
        editable: {
            selector: "label",
            propertyName: "label"
        },
        template: function (node) {
            var label, idstr, prop, input,
                code = $('<div data-role="fieldcontain"></div>');

            // FIXME: this is broken, the id the user specifies should be used,
            // not appended with -range
            prop = node.getProperty("id");
            idstr = prop + "-range";

            label = node.getProperty("label");
            code.append($('<label for="$1">$2</label>'
                          .replace(/\$1/, idstr)
                          .replace(/\$2/, label||"")));

            input = $('<input type="range">');
            input.attr("id", idstr);

            code.append(input);
            return code;
        }
    },

    /**
     * Represents a text entry.
     */
    TextInput: {
        parent: "Base",
        displayLabel: "Text Input",
        paletteImageName: "jqm_text_input.svg",
        editable: {
            selector: "label",
            propertyName: "label"
        },
        properties: {
            id: {
                type: "string",
                htmlSelector: "input",
                htmlAttribute: "id",
                autoGenerate: "text"
            },
            name: {
                type: "string",
                htmlSelector: "input",
                htmlAttribute: "name"
            },
            hint: {
                type: "string",
                defaultValue: "",
                htmlSelector: "input",
                htmlAttribute: "placeholder"
            },
            mini: $.extend({}, BCommonProperties.mini, {
                htmlSelector: "input"
            }),
            theme: $.extend({}, BCommonProperties.theme, {
                htmlSelector: "input"
            }),
            label: {
                type: "string",
                defaultValue: "Label"
            },
            value: {
                // FIXME: Probably value should be removed, setting initial
                //        static text is not a common thing to do
                type: "string",
                defaultValue: "",
                htmlSelector: "input",
                htmlAttribute: "value"
            },
            disabled: $.extend({}, BCommonProperties.disabled, {
                htmlSelector: "input"
            }),
            nativecontrol: $.extend({}, BCommonProperties.nativecontrol, {
                htmlSelector: "input"
            }),
            focus: {
                type: "event",
                defaultValue: "",
                visible: false
            },
            blur: {
                type: "event",
                defaultValue: "",
                visible: false
            }
        },
        template: '<div data-role="fieldcontain"><label for="%ID%">%LABEL%</label><input type="text"/></div>'
    },

    /**
     * Represents a text area entry.
     */
    TextArea: {
        // FIXME: good form is to include a <label> with all form elements
        //        and wrap them in a fieldcontain
        parent: "Base",
        displayLabel: "Text Area",
        paletteImageName: "jqm_text_area.svg",
        editable: {
            selector: "",
            propertyName: "value"
        },
        properties: {
            hint: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "placeholder"
            },
            mini: BCommonProperties.mini,
            theme: BCommonProperties.theme,
            value: {
                // FIXME: Probably value should be removed, setting initial
                //        static text is not a common thing to do
                type: "string",
                defaultValue: ""
            },
            disabled: BCommonProperties.disabled,
            nativecontrol: BCommonProperties.nativecontrol
        },
        template: '<textarea>%VALUE%</textarea>'
    },

    /**
     * Represents a toggle switch.
     */
    ToggleSwitch: {
        parent: "Base",
        displayLabel: "Toggle Switch",
        paletteImageName: "jqm_toggle_switch.svg",
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
            mini: BCommonProperties.mini,
            theme: BCommonProperties.theme,
            track_theme: BCommonProperties.track_theme,
            disabled: BCommonProperties.disabled,
            nativecontrol: BCommonProperties.nativecontrol
        },
        template: '<select data-role="slider"><option value="%VALUE1%">%LABEL1%</option><option value="%VALUE2%">%LABEL2%</option></select>',
        delegate: function (domNode, admNode) {
            if(admNode.getProperty("nativecontrol") === true)
                return $(domNode);
            else
                return $(domNode).next();
        }
    },

    /**
     * Represents a select element.
     */
    SelectMenu: {
        parent: "Base",
        paletteImageName: "jqm_select.svg",
        template: function (node) {
            var prop, code, length, i, child;
            code = $('<select></select>');

            // TODO: should probably expose this as a boolean property
            code.attr('data-native-menu', false);

            if (node.getProperty("multiple")) {
                code.append('<option>' + node.getProperty("label") +
                            '</option>');
            }

            prop = node.getProperty("options");
            length = prop.children.length;
            for (i = 0; i< length; i++) {
                child = prop.children[i];
                $('<option value="' + child.value+ '">' + child.text +
                  '</option>')
                    .appendTo(code);
            }
            return code;
        },
        init: function (node) {
            // initial state is three options
            var i, prop, optionItem;
            prop = node.getProperty("options");
            prop.children = [];
            for (i = 0; i < 3; i++) {
                optionItem = {};
                optionItem.text = "Option" + (i+1);
                optionItem.value = "Value";
                prop.children.push(optionItem);
            }
            node.setProperty("options", prop);
        },
        displayLabel: "Select Menu",
        properties: {
            options: {
                 type: "record-array",
                 sortable: true,
                 recordType: {
                     text: "string",
                     value: "string"
                 },
                 children : [],
                 defaultValue: {
                     type:  "record-array",
                     sortable: true,
                     recordType: {
                         text: "string",
                         value: "string"
                     },
                     children : []
                 }
            },
            multiple: {
                type: "boolean",
                defaultValue: false,
                displayName: "multiple select",
                htmlAttribute: "multiple"
            },
            label: {
                type: "string",
                defaultValue: "Choose option",
                prerequisite: function (admNode) {
                    // NOTE: Prerequisites are broken, becuase they need to be
                    //   refreshed dynamically when the controlling property
                    //   changes, but there seems to be no such logic, so
                    //   disabling for now. GRG 2014/09/08
                    //return admNode.getProperty("multiple") === true;
                    return true;
                }
            },
            mini: BCommonProperties.mini,
            disabled: BCommonProperties.disabled,
            inline: BCommonProperties.inline,
            icon: $.extend({}, BCommonProperties.icon, {
                options: BCommonProperties.icon.options.slice(1),
                defaultValue: "arrow-d"
            }),
            iconpos: $.extend({}, BCommonProperties.iconpos, {
                defaultValue: "right"
            }),
            change: {
                type: "event",
                defaultValue: "",
                visible: false
            }
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Option"
            }
        ],
        delegate: function (domNode, admNode) {
            return $(domNode).parent();
        },
        events: {
            mousedown: function (e) {
                e.preventDefault();
            },
            click: function (e) {
                e.stopPropagation();
                return this.ownerDocument.defaultView.handleSelect(e, $(this).parent().parent()[0]);
            }
        }
    },

    /**
     * Represents an option element.
     */
    Option: {
        parent: "Base",
        allowIn: "SelectMenu",
        showInPalette: false,
        selectable: false,
        moveable: false,
        properties: {
            text: {
                type: "string",
                defaultValue: "Option"
            },
            value: {
                type: "string",
                defaultValue: ""
            }
        },
        template: '<option>%TEXT%</option>'
    },

    /**
     * Represents a Radio Group object.
     */
    RadioGroup: {
        parent: "ControlGroup",
        displayLabel: "Radio Group",
        paletteImageName: "jqm_radio_group.svg",
        properties: {
            // FIXME: Put fieldcontain back in here, but will require
            //        support for selector on HTML attribute for data-type

            // FIXME: Before the legend was not written if with-legend was
            //        "no" -- instead, we could just check for empty legend
            //        in a template function, like I did in Slider in this
            //        commit. But it seems to work fine with a blank
            //        legend, so maybe it makes sense to always write to
            //        guide the user as they edit the HTML.
            legend: {
               type: "string",
               defaultValue: ""
            },
            mini: BCommonProperties.mini
        },
        zones: [
            {
                name: "default",
                allow: "RadioButton"
            }
        ],
        template: '<fieldset data-role="controlgroup"><legend>%LEGEND%</legend></fieldset>',
        init: function (node) {
            // initial state is three radio buttons
            var i, button;
            for (i = 0; i < 3; i++) {
                button = new ADMNode("RadioButton");
                node.addChild(button);
                if (i == 0) {
                    // FIXME: this used to be setting the property to "true",
                    // even though it's a string property, so it was showing up
                    // wrong in the property view. We should do some better
                    // type checking in setProperty so that we're alerted to
                    // such errors in the console (which requires stifling a
                    // a lot of invalid warnings they would now get lost in)
                    button.setProperty("checked", "checked");
                }
            }
        }
    },

    /**
     * Represents an radio button element.
     */
    RadioButton: {
        parent: "Base",
        displayLabel: "Radio Button",
        paletteImageName: "jqm_radio_button.svg",
        allowIn: "RadioGroup",
        editable: {
            selector: "span > .ui-btn-text",
            propertyName: "label"
        },
        properties: {
            // FIXME: All the radio buttons in a group need to have a common
            //        "name" field in order to work correctly
            id: {
                type: "string",
                autoGenerate: "radio"
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
            checked: BCommonProperties.checked,
            theme: BCommonProperties.theme,
            disabled: BCommonProperties.disabled
        },
        delegate: 'parent',
        template: function (node) {
            //var prop, code = $('<div data-role="header"><h1></h1></div>');
            var prop, label, code;

            code = $('<input type="radio"><label/>');

            // always include id property on input
            code.filter('input').attr("id", node.getProperty("id"));

            // generate a "name" property for first child of ControlGroup
            if (!node.getParent().getChildrenCount()) {
                code.filter('input').attr("name", node.getProperty("id"));
            } else {
                code.filter('input').attr("name",
                          node.getParent().getChildren()[0].getProperty("id"));
            }

            // apply props to associated label
            label = code.next();

            // always add "for" attribute to label
            label.attr('for', node.getProperty("id"));

            // always include label property as inner text
            label.text(node.getProperty("label"));

            return code;
        }
    },

    /**
     * Represents a Checkbox Group object.
     */
    CheckboxGroup: {
        parent: "ControlGroup",
        displayLabel: "Checkbox Group",
        paletteImageName: "jqm_checkbox_group.svg",
        properties: {
            // FIXME: Put fieldcontain back in here, but will require
            //        support for selector on HTML attribute for data-type

            // FIXME: Before the legend was not written if with-legend was
            //        "no" -- instead, we could just check for empty legend
            //        in a template function, like I did in Slider in this
            //        commit. But it seems to work fine with a blank
            //        legend, so maybe it makes sense to always write to
            //        guide the user as they edit the HTML.
            legend: {
               type: "string",
               defaultValue: ""
            },
            mini: BCommonProperties.mini
        },
        zones: [
            {
                name: "default",
                allow: "Checkbox"
            }
        ],
        template: '<fieldset data-role="controlgroup"><legend>%LEGEND%</legend></fieldset>',
    },

    /**
     * Represents an checkbox element.
     */
    Checkbox: {
        parent: "Base",
        paletteImageName: "jqm_checkbox.svg",
        editable: {
            selector: "span > .ui-btn-text",
            propertyName: "label"
        },
        properties: {
            id: {
                type: "string",
                autoGenerate: "checkbox",
                htmlAttribute: "id"
            },
            label: {
                type: "string",
                defaultValue: "Checkbox"
            },
            value: {
                type: "string",
                defaultValue: "",
                htmlAttribute: "value"
            },
            checked: BCommonProperties.checked,
            mini: BCommonProperties.mini,
            theme: BCommonProperties.theme,
            disabled: BCommonProperties.disabled
        },
        template: '<input type="checkbox"><label for="%ID%">%LABEL%</label>',
        delegate: 'parent'
    },

    /**
     * Represents a unordered list element.
     */
    SimpleList: {
        parent: "ListBase",
        paletteImageName: "jqm_list.svg",
        properties: {
            filter_theme: $.extend({}, BCommonProperties.theme, {
                displayName: "filter theme",
                htmlAttribute: "data-filter-theme"
            }),
            filter_placeholder: {
                displayName: "filter placeholder",
                type: "string",
                defaultValue: "Filter items...",
                htmlAttribute: "data-filter-placeholder"
            }
        },
    },

    /**
     * Represents a unordered button list element.
     */
    ButtonList: {
        parent: "SimpleList",
        paletteImageName: "jqm_button_list.svg",
    },

    /**
     * Represents a unordered button list element.
     */
    TextList: {
        parent: "SimpleList",
        paletteImageName: "jqm_text_list.svg",
    },

    /**
     * Represents a icon list element.
     */
    IconList: {
        parent: "SimpleList",
        paletteImageName: "jqm_icon_list.svg",
    },

    /**
     * Represents a Thumbnail list element.
     */
    ThumbnailList: {
        parent: "SimpleList",
        paletteImageName: "jqm_thumbnail_list.svg",
    },
    /**
     * Represents a base List widget
     */
    ListBase: {
        parent: "Base",
        dragHeader: true,
        properties: {
            inset: BCommonProperties.inset,
            filter: BCommonProperties.filter,
            theme: BCommonProperties.theme,
            ordered: {
                type: "boolean",
                defaultValue: false,
            },
            divider_theme: $.extend({}, BCommonProperties.theme, {
                displayName: "divider theme",
                htmlAttribute: "data-divider-theme"
            })
        },
        getItemType: function (listType) {
            if (listType !== "OrderedList")
                 return listType + "Item";
            else
                 return "SimpleListItem";
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                morph: function (childType, thisType) {
                    if (childType === "SimpleListItem") {
                        if (thisType === "OrderedList")
                            return "SimpleListItem";
                        else
                            return thisType + "Item";
                    }
                    return childType;
                },
                allow: function (type) {
                   return [ BWidgetRegistry.ListBase.getItemType(type), "ListDivider" ];
                }
            }
        ],
        delegate: function (domNode, admNode) {
            var filterForm, headerLabel, newNode = $('<div>');
            if (!admNode.getProperty('filter'))
                return domNode;
            filterForm = domNode.prev('form');
            domNode.removeClass('ui-drag-header nrc-sortable-container');
            // Move header label attr to container
            newNode.attr('header-label', domNode.attr('header-label'));
            domNode.removeAttr('header-label');
            // Move specific classes to container
            newNode.addClass(
                'ui-drag-header nrc-sortable-container ui-listview-container'
            );
            // Reconstruct the domNode.
            return filterForm.wrap(newNode).parent().append(domNode);
        },
        template: function (node) {
            if (node.getProperty("ordered"))
             return $('<ol data-role="listview">');
            else
             return $('<ul data-role="listview">');
        },
        init: function (node) {
            // initial state is three button ListItem
            var i;
            for (i = 0; i < 3; i++) {
                var listType = node.getType(), itemName = "SimpleListItem";
                if (listType !== "OrderedList")
                     itemName = listType + "Item";
                node.addChild(ADM.createNode(itemName));
            }
        }
    },

    /**
     * Represents a Split list element.
     */
    ThumbnailSplitList: {
        parent: "ButtonSplitList",
        paletteImageName: "jqm_thumbnail_split_list.svg",
    },

    /**
     * Represents a Split list element.
     */
    ButtonSplitList: {
        parent: "ListBase",
        paletteImageName: "jqm_button_split_list.svg",
        properties: {
            theme: {
                type: "string",
                options: [ "default", "a", "b", "c", "d", "e" ],
                defaultValue: "default",
                htmlAttribute: "data-split-theme"
            },
            split_icon: {
                displayName: "split icon",
                type: "string",
                options: [ "none", "alert", "arrow-d", "arrow-l", "arrow-r",
                           "arrow-u", "back", "check", "delete", "forward",
                           "gear", "grid", "home", "info", "minus", "plus",
                           "refresh", "search", "star" ],
                defaultValue: "none",
                htmlAttribute: "data-split-icon"
            }
        },
    },

    /**
     * Represents a Split list element.
     */
    TextSplitList: {
        parent: "ButtonSplitList",
        paletteImageName: "jqm_text_split_list.svg",
    },

    /**
     * Represents a Split list element.
     */
    IconSplitList: {
        parent: "ButtonSplitList",
        paletteImageName: "jqm_icon_split_list.svg",
    },

    /**
     * Represents a base ListItem element.
     */
    ListItemBase: {
        parent: "Base",
        properties: {
            countbubble: {
                type: "string",
                displayName: "count bubble",
                defaultValue: ""
            }
        },
        template: function(node) {
            var prop, countBubble, code = $('<li></li>');
            prop = node.getProperty("countbubble");
            // Add the count bubble if countbubble property is not blank
            if (prop.trim() != '') {
                countBubble = $('<span>')
                    .attr('class', 'ui-li-count')
                    .html(prop);
                code.append(countBubble);
            };
            return code;
        }
    },

    /**
     * Represents a generic list item element.
     */
    SimpleListItem: {
        parent: "ListItemBase",
        displayLabel: "List Item",
        paletteImageName: "jqm_list_item.svg",
        allowIn: [ "ListBase" ],
        editable: {
            selector: "",
            propertyName: "text"
        },
        properties: {
            text: {
                type: "string",
                defaultValue: "List Item",
            },
            theme: BCommonProperties.theme,
            filtertext: {
                displayName: "filter text",
                type: "string",
                defaultValue: "",
                htmlAttribute: "data-filtertext"
            }
        },
        template: function (node) {
            return BWidgetRegistry.ListItemBase.template(node).append(node.getProperty('text'));
        },
    },

    /**
     * Represents a Clickable ListItem element.
     */
    ClickableListItem: {
        parent: [ "ListItemBase", "ButtonBase" ],
        defaultHtmlSelector: "a",
        properties: {
            theme: $.extend(true, {}, BCommonProperties.theme, {
                       htmlSelector: ""
                   })
        },
        template: function (node) {
            var code = BWidgetRegistry.ListItemBase.template(node);
            return code.append($('<a/>').append(code.find('span.ui-li-count')));
        },
    },

    /**
     * Represents a list button item element.
     */
    ButtonListItem: {
        parent: "ClickableListItem",
        allowIn: [ "ButtonList" ],
        editable: {
            selector: ".ui-btn-text > a",
            propertyName: "text"
        },
        properties: {
            text: {
                type: "string",
                defaultValue: "Button List Item",
            }
        },
        template: function (node) {
            return BWidgetRegistry.ClickableListItem.template(node)
                .find('a').append(node.getProperty('text')).end();
        },
    },

    /**
     * Represents a list text item element.
     */
    TextListItem: {
        parent: "ClickableListItem",
        allowIn: [ "TextList" ],
        zones: [
            {
                name: "default",
                cardinality: "N",
                locator: "a",
                allow: [ "Text" ]
            },
        ],
        init: function (node) {
            var widgit;
            widgit = ADM.createNode("Text");
            widgit.setProperty("type", "h3");
            widgit.setProperty("text", "Text List Item");
            node.addChild(widgit);
            widgit = ADM.createNode("Text");
            widgit.setProperty("type", "p");
            widgit.setProperty("text", "Text List Item");
            node.addChild(widgit);
        }
    },

    /**
     * Represents a IconListItem element.
     */
    IconListItem: {
        parent: "ButtonListItem",
        allowIn: [ "IconList" ],
        properties: {
            text: {
                defaultValue: "Icon List Item"
            },
            iconsrc: {
                displayName: "icon source",
                type: "url-uploadable",
                defaultValue: "src/css/images/widgets/tizen_image.svg",
                htmlSelector: "img",
                htmlAttribute: "src",
                forceAttribute: true
            },
        },
        template: function(node) {
            var prop, iconsrc,
                code = BWidgetRegistry.ButtonListItem.template(node);
            prop = node.getProperty("iconsrc");
            // Add the icon if iconsrc property is not blank
            if (prop.trim() != '') {
                iconsrc = $('<img/>')
                        .attr('width','16')
                        .attr('class', 'ui-li-icon');
                code.find('a').append(iconsrc);
            };
            return code;
        }
    },

    /**
     * Represents a ThumbnailListItem element.
     */
    ThumbnailListItem: {
        parent: "ClickableListItem",
        allowIn: [ "ThumbnailList"],
        zones: [
            {
                name: "left",
                cardinality: "1",
                locator: "a",
                allow: [ "Image" ]
            },
            {
                name: "right",
                cardinality: "N",
                locator: "a",
                allow: [ "Text" ]
            }
        ],
        init: function (node) {
            var image = ADM.createNode("Image");
            var text = ADM.createNode("Text");
            text.setProperty("type", "h3");
            text.setProperty("text", "Thumbnail List Item");
            node.addChild(text);
            text = ADM.createNode("Text");
            text.setProperty("type", "p");
            text.setProperty("text", "Thumbnail List Item");
            node.addChild(text);
            node.addChild(image);
        }
    },

    /**
     * Represents a SplitListItem element.
     */
    ThumbnailSplitListItem: {
        parent: "SplitListItemBase",
        allowIn: [ "ThumbnailSplitList" ],
        zones: [
            {
                name: "left",
                cardinality: "1",
                locator: "a",
                allow: [ "Image" ]
            },
            {
                name: "right",
                cardinality: "N",
                locator: "a",
                allow: [ "Text" ]
            }
        ],
        init: function (node) {
            // initial state is three Image and Texts
            var image = ADM.createNode("Image");
            var text = ADM.createNode("Text");
            text.setProperty("type", "h3");
            text.setProperty("text", "Thumbnail List Item");
            node.addChild(text);
            text = ADM.createNode("Text");
            text.setProperty("type", "p");
            text.setProperty("text", "Thumbnail List Item");
            node.addChild(text);
            node.addChild(image);

            node.addChild(ADM.createNode("ListButton"));
        }
    },

    /**
     * Represents a SplitListItem element.
     */
    SplitListItemBase: {
        parent: "ClickableListItem",
        zones: [
            {
                name: "extra",
                cardinality: {min: "1", max: "1"},
                allow: [ "ListButton" ]
            },
        ],
        init: function (node) {
            // initial state is three buttons
            node.addChild(ADM.createNode("ListButton"));
        }
    },

    /**
     * Represents a SplitListItem element.
     */
    ButtonSplitListItem: {
        parent: [ "ButtonListItem", "SplitListItemBase" ],
        allowIn: [ "ButtonSplitList" ],
    },

    /**
     * Represents a SplitListItem element.
     */
    IconSplitListItem: {
        parent: [ "IconListItem", "ButtonSplitListItem" ],
        allowIn: [ "IconSplitList" ],
    },

    /**
     * Represents a SplitListItem element.
     */
    TextSplitListItem: {
        parent: [ "TextListItem", "SplitListItemBase" ],
        allowIn: [ "TextSplitList" ],
        init: function (node) {
            BWidgetRegistry.TextListItem.init(node);
            BWidgetRegistry.SplitListItemBase.init(node);
        }
    },

    /**
     * Represents a list divider element.
     */
    ListDivider: {
        parent: "SimpleListItem",
        displayLabel: "List Divider",
        paletteImageName: "jqm_list_divider.svg",
        allowIn: [ "ListBase" ], 
        properties: {
            text: {
                defaultValue: "List Divider"
            },
        },
        template: '<li data-role="list-divider">%TEXT%</li>'
    },

    /**
     * Represents a button. A "text" string property holds the button text.
     */
    ListButton: {
        parent: "ButtonBase",
        allowIn: [ "SplitListItemBase"],
        properties: {
            icon: $.extend({}, BCommonProperties.icon, {
                options: BCommonProperties.icon.options.slice(1),
                defaultValue: "arrow-r"
            }),
            theme: BCommonProperties.theme,
        },
        template: '<a/>',
    },

    /**
     * Represents a div element.
     */

    Div: {
        parent: "Base",
        dragHeader: true,
        paletteImageName: "jqm_div.svg",
        template: '<div class="div-widget"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ]
    },

    /**
     * Represents a grid element.
     */
    Grid: {
        parent: "Base",
        dragHeader: true,
        paletteImageName: "jqm_grid.svg",
        properties: {
            rows: {
                type: "integer",
                defaultValue: 1,
                range: { min: 1, max:15 },
                setPropertyHook: function (node, value, transactionData) {
                    var rows, columns, i, block, map, children, blocks, count,
                        blockIndex, root;
                    rows = node.getProperty("rows");
                    columns = node.getProperty("columns");
                    root = node.getDesign();
                    root.suppressEvents(true);

                    // add rows if necessary
                    if (rows < value) {
                        if (transactionData) {
                            // use the array of blocks stored in transaction
                            blocks = transactionData;
                        }
                        else {
                            // create a new array of blocks
                            map = [ "a", "b", "c", "d", "e" ];
                            blocks = [];
                            count = rows;
                            while (count < value) {
                                for (i=0; i<columns; i++) {
                                    block = new ADMNode("Block");
                                    block.setProperty("subtype", map[i]);
                                    blocks.push(block);
                                }
                                count++;
                            }
                        }

                        // NOTE: be sure not to modify transactionData, so don't
                        //       modify blocks, which may point to it

                        // add blocks from this array to the new rows
                        blockIndex = 0;
                        while (rows < value) {
                            for (i=0; i<columns; i++) {
                                node.addChild(blocks[blockIndex++]);
                            }
                            rows++;
                        }
                    }

                    // remove rows if necessary
                    if (rows > value) {
                        count = (rows - value) * columns;
                        children = node.getChildren();
                        blocks = children.slice(children.length - count);
                        for (i=0; i<count; i++) {
                            node.removeChild(children.pop());
                        }
                        root.suppressEvents(false);
                        return blocks;
                    }
                    root.suppressEvents(false);
                }
            },
            columns: {
                type: "integer",
                defaultValue: 2,
                range: { min: 2, max: 5},
                setPropertyHook: function (node, value, transactionData) {
                    var rows, columns, i, block, map, children, blocks, count,
                        index, blockIndex, root;
                    rows = node.getProperty("rows");
                    columns = node.getProperty("columns");

                    // we should be able to trust that columns is valid (2-5)
                    if (columns < 2 || columns > 5) {
                        throw new Error("invalid value found for grid columns");
                    }

                    root = node.getDesign();
                    root.suppressEvents(true);

                    // add columns if necessary
                    if (columns < value) {
                        if (transactionData) {
                            // use the array of blocks stored in transaction
                            blocks = transactionData;
                        }
                        else {
                            // create a new array of blocks
                            map = [ "", "", "c", "d", "e" ];
                            blocks = [];
                            count = columns;

                            while (count < value) {
                                for (i=0; i<rows; i++) {
                                    block = new ADMNode("Block");
                                    block.setProperty("subtype", map[count]);
                                    blocks.push(block);
                                }
                                count++;
                            }
                        }

                        // NOTE: be sure not to modify transactionData, so don't
                        //       modify blocks, which may point to it

                        // add blocks from this array to the new columns
                        blockIndex = 0;
                        while (columns < value) {
                            index = columns;
                            for (i=0; i<rows; i++) {
                                block = blocks[blockIndex++];
                                node.insertChildInZone(block, "default", index);
                                index += columns + 1;
                            }
                            columns++;
                        }
                    }

                    // remove columns if necessary
                    if (columns > value) {
                        blocks = [];
                        children = node.getChildren();
                        count = children.length;
                        while (value < columns) {
                            for (i = value; i < count; i += columns) {
                                blocks.push(children[i])
                                node.removeChild(children[i]);
                            }
                            value++;
                        }
                        root.suppressEvents(false);
                        return blocks;
                    }
                    root.suppressEvents(false);
                }
            }
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Block"
            }
        ],
        template: function (node) {
            var prop, classname, code = $('<div>');
            code = BWidgetRegistry.Base.applyProperties(node, code);

            // determine class attribute
            classname = "ui-grid-";
            prop = node.getProperty("columns");
            switch (prop) {
            case 5:  classname += "d"; break;
            case 4:  classname += "c"; break;
            case 3:  classname += "b"; break;
            default: classname += "a"; break;
            }
            code.attr("class", classname);

            return code;
        },
        init: function (node) {
            // initial state is one row with two columns, i.e. two blocks
            var block = new ADMNode("Block");
            node.addChild(block);

            block = new ADMNode("Block");
            block.setProperty("subtype", "b");
            node.addChild(block);
        }
    },

    /**
     * Represents a grid block element.
     */
    Block: {
        parent: "Base",
        showInPalette: false,
        selectable: false,
        outlineLabel: function (node) {
            var columns, row, col, children, map;

            if (node.getChildren().length == 0) {
                return "";
            }

            columns = node.getParent().getProperty("columns");
            row = Math.floor(node.getZoneIndex() / columns);

            map = { a: 1, b: 2, c: 3, d: 4, e: 5 };
            col = map[node.getProperty("subtype")];
            return "Row " + (row + 1) + ", Column " + col;
        },
        allowIn: "Grid",
        properties: {
            subtype: {
                type: "string",
                options: [ "a", "b", "c", "d", "e" ],
                defaultValue: "a"
            }
        },
        template: '<div class="ui-block-%SUBTYPE%"></div>',
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ]
    },

    /**
     * Represents a collapsible element.
     */
    Collapsible: {
        parent: "Base",
        paletteImageName: "jqm_collapsible.svg",
        template: '<div data-role="collapsible"><h1>%HEADING%</h1></div>',
        editable: {
            selector: "span.ui-btn-text",
            propertyName: "heading"
        },
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
                defaultValue: "Collapsible Area"
            },
            collapsed: {
                type: "boolean",
                defaultValue: true,
                htmlAttribute: "data-collapsed",
            },
            iconpos: BCommonProperties.iconpos,
            mini: BCommonProperties.mini,
            theme: BCommonProperties.theme,
            content_theme: $.extend({}, BCommonProperties.theme, {
                displayName: "content theme",
                htmlAttribute: "data-content-theme"
            })
        },
        zones: [
            {
                name: "default",
                cardinality: "N"
            }
        ],
        delegate: function (domNode, admNode) {
            var toggleCollapse = function (e){
                var selected = (e.node === admNode || e.node && admNode.findNodeByUid(e.node.getUid()))? true: false;
                domNode.trigger(selected ? 'expand' : 'collapse');
            },
            e = {};

            e.node = ADM.getDesignRoot().findNodeByUid(ADM.getSelected());
            toggleCollapse(e);
            ADM.bind("selectionChanged", toggleCollapse);
            return domNode;
        }
    },

    /**
     * Represents a set of collapsible elements.
     */
    Accordion: {
        parent: "Base",
        dragHeader: true,
        paletteImageName: "jqm_accordian.svg",
        template: '<div data-role="collapsible-set"></div>',
        properties: {
            mini: BCommonProperties.mini,
            theme: BCommonProperties.theme,
            content_theme: $.extend({}, BCommonProperties.theme, {
                displayName: "content theme",
                htmlAttribute: "data-content-theme"
            }),
            iconpos: BCommonProperties.iconpos
        },
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Collapsible"
            }
        ]
    },

    DateTimePicker: {
        parent: "Base",
        paletteImageName: "tizen_date_picker.svg",
        template: '<input type="date" />',
        delegate: 'next'
    },

    CalendarPicker: {
        parent: "Base",
        paletteImageName: "tizen_calendar_picker.svg",
        template: '<a data-role="calendarpicker" data-icon="grid" data-iconpos="notext" data-inline="true"></a>'
    },

    ColorPicker: {
        parent: "Base",
        paletteImageName: "tizen_color_picker.svg",
        template: '<div data-role="colorpicker" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#ff00ff"
            }
        }
    },

    ColorPickerButton: {
        parent: "Base",
        paletteImageName: "tizen_color_picker_button.svg",
        template: '<div data-role="colorpickerbutton" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039"
            }
        },
        delegate: 'next'
    },

    ColorPalette: {
        parent: "Base",
        paletteImageName: "tizen_color_palette.svg",
        template: '<div data-role="colorpalette" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039"
            },
            show_preview: {
                type: "boolean",
                defaultValue: false,
                htmlAttribute: "data-show-preview"
            }
        }
    },


    ColorTitle: {
        parent: "Base",
        paletteImageName: "tizen_color_title.svg",
        template: '<div data-role="colortitle" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039"
            }
        }
    },

    HsvPicker: {
        parent: "Base",
        paletteImageName: "tizen_hsv_color_picker.svg",
        template: '<div data-role="hsvpicker" />',
        properties: {
            data_color: {
                type: "string",
                defaultValue: "#1a8039"
            }
        }
    },

    ProgressBar: {
        parent: "Base",
        paletteImageName: "tizen_progress_bar.svg",
        template: '<div data-role="processingbar" />'
    },

    Switch: {
        parent: "Base",
        paletteImageName: "tizen_vertical_toggle_switch.svg",
        template: '<div data-role="toggleswitch" />',
        delegate: 'next'
    },

    OptionHeader: {
        parent: "Base",
        paletteImageName: "tizen_option_header.svg",
        template: '<div data-role="optionheader" />',
        zones: [
            {
                name: "default",
                cardinality: "N",
                allow: "Grid"
            }
        ]
    }
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
        var type, newZones, descendantZone, descendantZoneIndex;
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
                $.each(BWidget.getAncestors(type), function (i, parentName) {
                    if (BWidgetRegistry[parentName].zones) {
                        newZones = [];
                        $.each(BWidgetRegistry[parentName].zones, function (i, pZone) {
                            descendantZone = null;
                            if (BWidgetRegistry[type].zones)
                            $.each(BWidgetRegistry[type].zones, function (i, zone) {
                                if (pZone.name === zone.name) {
                                    descendantZone = zone;
                                    descendantZoneIndex = i;
                                    return false;
                                }
                            });
                            if (descendantZone)
                                BWidgetRegistry[type].zones[descendantZoneIndex] = $.extend(true, true, {}, pZone, descendantZone);
                            else
                                newZones.push(pZone);
                        });
                        if(BWidgetRegistry[type].zones)
                            $.merge(BWidgetRegistry[type].zones, newZones);
                    }
                    BWidgetRegistry[type] = $.extend(true, true, {}, BWidgetRegistry[parentName], BWidgetRegistry[type]);
                });
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
     * Tests whether this widget type should be shown in the palette or
     * otherwise exposed to the user (e.g. in the outline view).
     *
     * @param {String} widgetType The type of the widget.
     * @return {Boolean} true if this widget is to be shown in the palette,
     *                   false if not or it is undefined.
     */
    isPaletteWidget: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget === "object" && widget.showInPalette !== false) {
            return true;
        }
        return false;
    },

    /**
     * Tests whether this widget type should be shown with a drag header bar.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Boolean} true if this widget is to be shown in the palette,
     *                   false if not or it is undefined.
     */
    isHeaderVisible: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget === "object" && widget.dragHeader !== true) {
            return false;
        }
        return true;
    },

    /**
     * Gets the palette image name for the given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @return {String} Palette image name.
     */
    getPaletteImageName: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget === "object") {
            return widget.paletteImageName;
        }
        return "missing.svg";
    },

    /**
     * Gets the display label for the given widget type.
     *
     * @param {String} widgetType The type of the widget.
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
     * @param {String} widgetType The type of the widget.
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
     * Gets the initialization function for the given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Function(ADMNode)} The initialization function, or undefined if
     *                             there is none.
     */
    getInitializationFunction: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        return widget.init;
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
        var stack = [], props = {}, length, i, property, widget;
        widget = BWidgetRegistry[widgetType];

        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getPropertyTypes: " +
                            widgetType);
        }

        for (property in widget.properties) {
            if (widget.properties.hasOwnProperty(property)) {
                props[property] = widget.properties[property].type;
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
        var stack = [], options = {}, length, i, property, widget, valueOptions;
        widget = BWidgetRegistry[widgetType];

        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getPropertyOptions: " +
                            widgetType);
        }

        for (property in widget.properties) {
            if (widget.properties.hasOwnProperty(property)) {
                valueOptions = widget.properties[property].options;
                if (typeof valueOptions === "function") {
                    options[property] = valueOptions();
                } else {
                    options[property] = valueOptions;
                }
            }
        }
        return $.extend(true, {}, options);
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
        var stack = [], props = {}, length, i, property, widget;
        widget = BWidgetRegistry[widgetType];

        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getPropertyDefaults: "+
                            widgetType);
        }
        for (property in widget.properties) {
            if (widget.properties.hasOwnProperty(property)) {
                props[property] = widget.properties[property].defaultValue;
            }
        }

        return $.extend(true, {}, props);
    },

    /**
     * @private
     * Not intended as a public API. Only for use within BWidget.
     * Gets the property description schema for a given instance property.
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

        if (widget.properties && widget.properties[property]) {
            return $.extend(true, {}, widget.properties[property]);
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
     * Gets the function that determines whether any prerequisites have been
     * met for this property to be available. If not, the property should be
     * presented to the user in a disabled state.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the property.
     * @return {Function(ADMNode)} A function that takes an ADM node and returns
     *                             true if the property prerequisites are met,
     *                             or false otherwise. Returns undefined if
     *                             there is no such function for this property,
     *                             in which case the property is always enabled.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyPrerequisite: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.prerequisite;
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
     * Gets the display name for a given instance property.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {String} The display name for the given property, or
     *                  the property instance name if this property has
     *                  no the attribute.
     */
    getPropertyDisplayName: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema && schema.displayName) {
            return schema.displayName;
        }
        return property.replace(/_/g,'-');
    },

    /**
     * Gets a value map object or function which maps user visible property
     * values to the actual values that should be serialized to HTML. If it
     * is a map object, values that are not present in the map should be used
     * as is. If it is a function, the function takes the current value and
     * returns the serialization value.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {Various} An object mapping user-presented values to the actual
     *                   values to be used in serialization to HTML. Or, it
     *                   could be a function that takes a user value and returns
     *                   a serialization value. Otherwise, returns undefined and
     *                   the user-presented values should be used as they are.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyValueMap: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.htmlValueMap;
        }
        return schema;
    },

    /**
     * Gets the range for a given property.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {Object} The range of the value of the given property
     */
    getPropertyRange: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            return schema.range;
        }
        return schema;
    },

    /**
     * Applies any value mapping on the given value that would occur during
     * serialization if this value were found in the given widget type and
     * property. Returns the mapped value (always a string) or the supplied
     * value converted to a string if there is no such mapping.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @param {Various} value The unmapped value of the property that needs to
     *                        be mapped to the serialized value.
     * @return {String} The string that would be serialized for this value.
     */
    getPropertySerializableValue: function (widgetType, property, value) {
        var mapped, valueMap;
        valueMap = BWidget.getPropertyValueMap(widgetType, property);
        if (typeof valueMap === "function") {
            mapped = valueMap(value);
        } else if (typeof valueMap === "object") {
            mapped = valueMap[value];
        }

        if (!mapped) {
            mapped = String(value);
        }
        return mapped;
    },

    /**
     * Gets the HTML attribute associated with this property, or a function that
     * will return it for a given property value.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the property.
     * @return {Various} The name of an HTML attribute to set to this property
     *                   value in the template, or a function that takes the
     *                   current property value and returns an HTML attribute,
     *                   or undefined if none.
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
            return schema.htmlSelector !== undefined ? schema.htmlSelector :
                BWidget.getWidgetAttribute(widgetType, "defaultHtmlSelector");
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
     * @param {String} property The name of the property.
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
     * Gets the hook function provided for setting the given property, if it
     * exists. This function should be called just before a property is set, to
     * give the widget a chance to make any modifications to its children.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the property.
     * @return {Function(ADMNode, Any)} Override setter function for this
     *                                  property, or undefined if there
     *                                  is none.
     * @throws {Error} If widgetType is invalid, or property not found.
     */
    getPropertyHookFunction: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema) {
            if (typeof schema.setPropertyHook === "function") {
                return schema.setPropertyHook;
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
     * Determines if the given instance property is valid within the given
     * parent widget.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @param {String} parentType The type of the parent widget.
     * @return {Boolean} True if the property is valid, false otherwise.
     * @throws {Error} If widgetType or parentType is invalid.
     */
    propertyValidIn: function (widgetType, property, parentType) {
        var typeList, widget = BWidgetRegistry[widgetType],
            parent = BWidgetRegistry[parentType],
            schema = BWidget.getPropertySchema(widgetType, property);
        if (typeof parent !== "object") {
            throw new Error("undefined widget type in propertyValidIn: " +
                            parentType);
        }
        if (schema) {
            typeList = schema.validIn;
            if (typeList) {
                return BWidget.isTypeInList(parentType, typeList);
            }
            typeList = schema.invalidIn;
            if (typeList) {
                return !BWidget.isTypeInList(parentType, typeList);
            }
            return true;
        }
        return schema;
    },


    /**
     * Tests whether this property is visible to user, for example, property
     * view can use it to decide if it will show this property.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} property The name of the requested property.
     * @return {Boolean} true if this property is visible to user, or it is
     *                   undefined.
     *                   false if this property is invisible to user.
     */
    propertyVisible: function (widgetType, property) {
        var schema = BWidget.getPropertySchema(widgetType, property);
        if (schema && typeof(schema.visible) == 'boolean') {
            return schema.visible;
        } else {
            return true;
        }
    },

    /**
     * Gets the template for a given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Various} The template string for this widget type, or an
     *                   object (FIXME: explain), or a function(ADMNode) that
     *                   provides a template, or undefined if the template does
     *                   not exist.
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
     * Gets the outline label function for a given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @return {Function} The function(ADMNode) provided for this widget to
     *                    generate a label, or undefined if it does not exist.
     * @throws {Error} If widgetType is invalid.
     */
    getOutlineLabelFunction: function (widgetType) {
        var widget, func;
        widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getOutlineLabelFunction: "
                            + widgetType);
        }

        func = widget.outlineLabel;
        if (typeof func !== "function") {
            return undefined;
        }
        return func;
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

    /**
     * Get the zone information for the given zone in the given widget type.
     *
     * @param {String} widgetType The type of the widget.
     * @param {String} zoneName The name of the zone.
     * @return {Ojbect} Returns the whole object of this zone.
     * @throws {Error} If widgetType is invalid or the zone is not found.
     */
    getZone: function (widgetType, zoneName) {
        var widget, zones, length, i;
        widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("undefined widget type in getZone: " +
                            widgetType);
        }

        zones = widget.zones;
        if (zones && zones.length) {
            length = zones.length;
            for (i = 0; i < length; i++) {
                if (zones[i].name === zoneName) {
                    return zones[i];
                }
            }
        }
        throw new Error("no such zone found in getZone: " +
                        zoneName);
    },

    // helper function
    getAncestors: function (type) {
        var ancestors = [],
            parents = BWidgetRegistry[type].parent;
        if (!parents)
            return [];
        if ( typeof parents === "string")
            parents = [parents];
        ancestors = $.merge(ancestors, parents);
        $.each(parents, function (i, parentName) {
            $.merge(ancestors, BWidget.getAncestors(parentName));
        })
        return ancestors;
    },

    // helper function
    isTypeInList: function (type, list) {
        // requires: list can be an array, a string, or invalid
        //  returns: true, if type is the list string, or type is one of the
        //                 strings in list
        //           false, otherwise, or if list is invalid
        var i, parentType = type,
        isType = function (srcType, targetType) {
            if (srcType === targetType)
                return true;
            return BWidget.getAncestors(srcType).indexOf(targetType) !== -1;
        };
        if (list) {
            if (isType(type, list)) {
                return true;
            } else if (list.length > 0) {
                for (i = list.length - 1; i >= 0; i--) {
                    if (isType(type, list[i]))
                        return true;
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
        var parent, child, typeList;
        parent = BWidgetRegistry[parentType];
        child = BWidgetRegistry[childType];
        if ((typeof parent === "object") && (typeof child === "object")) {
            typeList = child.allowIn;
            if (typeList) {
                return BWidget.isTypeInList(parentType, typeList);
            }
            typeList = child.denyIn;
            if (typeList) {
                return !BWidget.isTypeInList(parentType, typeList);
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
        var parent, child, zones, i, allow, deny, morph;
        parent = BWidgetRegistry[parentType];
        child = BWidgetRegistry[childType];
        if ((typeof parent !== "object") || (typeof child !== "object")) {
            throw new Error("parent or child type invalid in zoneAllowsChild");
        }

        zones = parent.zones;
        if (zones && zones.length > 0) {
            for (i = zones.length - 1; i >= 0; i--) {
                if (zones[i].name === zone) {
                    morph = BWidget.getZone(parentType, zone).morph;
                    if (morph)
                        childType = morph(childType, parentType);
                    allow = zones[i].allow;
                    if (allow) {
                        if (typeof allow === "function")
                            allow = allow(parentType);
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
     * Tests whether this BWidget is allowed to have it's textContent edited.
     *
     * @return {Object} if this BWidget is editable, null if not.
     * @throws {Error} If widgetType is invalid.
     */
    isEditable: function (widgetType) {
        var widget = BWidgetRegistry[widgetType];
        if (typeof widget !== "object") {
            throw new Error("widget type invalid in isEditable");
        }
        return widget.hasOwnProperty("editable") ? widget.editable : null;
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
    },

    /**
     * Tests the value correction.
     *
     * @return {Boolean} True if this value is correct, True by default..
     */
    validValue: function (widgetType, property, value) {
        var validator, schema = BWidget.getPropertySchema(widgetType, property);
        if (!schema && !schema.valueValidator)
            return true;
        validator = schema.valueValidator;
        if (typeof(value) == 'undefined')
            value = this.getProperty(property);
        switch (validator.constructor) {
            case Function:
                return validator(value);
            case RegExp:
                return validator.test(value);
        }
        return true;
    }
};

// initialize the widget registry
BWidget.init();
