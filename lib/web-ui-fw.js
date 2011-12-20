/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Base class for widgets that need the following features:
//
// I. HTML prototype loading
//
// This class provides HTML prototype loading for widgets. That is, the widget implementation specifies its HTML portions
// in one continuous HTML snippet, and it optionally provides an object containing selectors into the various parts of the
// HTML snippet. This widget loads the HTML snippet into a jQuery object, and optionally assigns jQuery objects to each of
// the selectors in the optionally provided object.
//
// To use this functionality you can either derive from this class, or you can call its prototype's gtype method.
//
// 1. Widgets deriving from this class should define _htmlProto as part of their prototype declaration. _htmlProto looks like
// this:
//
// _htmlProto: {
//     source: string|jQuery object (optional) default: string - The name of the widget
//     ui: {
//         uiElement1: "#ui-element-1-selector",
//         uiElement2: "#ui-element-2-selector",
//         ...
//         subElement: {
//             subElement1: "#sub-element-1-selector",
//             subElement2: "#sub-element-2-selector",
//             ...
//         }
//         ...
//     }
// }
//
// If neither 'source' nor 'ui' are defined, you must still include an empty _htmlProto key (_htmlProto: {}) to indicate
// that you wish to make use of this feature. This will cause a prototype HTML file named after your widget to be loaded.
// The loaded prototype will be placed into your widget's prototype's _protoHtml.source key.
//
// If 'source' is defined as a string, it is the name of the widget (including namespace). This is the default. If your
// widget's HTML prototype is loaded via AJAX and the name of the AJAX file is different from the name of your widget
// (that is, it is not "<widgetName>.prototype.html", then you should explicitly define 'source' as:
//
// If you wish to load HTML prototypes via AJAX, modify the getProtoPath() function defined below to reflect the directory
// structure holding your widget HTML prototypes.
//
// source: "alternateWidgetName"
//
// If AJAX loading fails, source is set to a jQuery object containing a div with an error message. You can check whether
// loading failed via the jQuery object's jqmData("todons.widgetex.ajax.fail") data item. If false, then the jQuery object
// is the actual prototype loaded via AJAX or present inline. Otherwise, the jQuery object is the error message div.
//
// If 'source' is defined as a jQuery object, it is considered already loaded.
//
// if 'ui' is defined inside _htmlProto, It is assumed to be an object such that every one of its keys is either a string,
// or another object with the same properties as itself.
//
// When a widget is instantiated, the HTML prototype is loaded if not already present in the prototype. If 'ui' is present
// inside _htmlProto, the prototype is cloned. Then, a new structure is created based on 'ui' with each selector replaced
// by a jQuery object containing the results of performing .find() on the prototype's clone with the filter set to the
// value of the string. In the special case where the selector starts with a '#', the ID is removed from the element after
// it is assigned into the structure being created. This structure is then made accessible from the widget instance via
// the '_ui' key (i.e., this._ui).
//
// 2. Use the loadPrototype method when your widget does not derive from $.todons.widgetex:
// Add _htmlProto to your widget's prototype as described above. Then, in your widget's _create() method, call
// loadPrototype in the following manner:
//
// $.todons.widgetex.loadPrototype.call(this, "namespace.widgetName");
//
// Thereafter, you may use the HTML prototype from your widget's prototype or, if you have specified a 'ui' key in your
// _htmlProto key, you may use this._ui from your widget instance.
//
// II. realize method
//
// When a widget is created, some of its properties cannot be set immediately, because they depend on the widths/heights
// of its constituent elements. They can only be calculated when the page containing the widget is made visible via the
// "pageshow" event, because widths/heights always evaluate to 0 when retrieved from a widget that is not visible. When
// you inherit from widgetex, you can add a "_realize" function to your prototype. This function will be called once right
// after _create() if the element that anchors your widget is on a visible page. Otherwise, it will be called when the
// page to which the widget belongs emits the "pageshow" event.
//
// III. systematic option handling
//
// If a widget has lots of options, the _setOption function can become a long switch for setting each recognized option.
// It is also tempting to allow options to determine the way a widget is created, by basing decisions on various options
// during _create(). Often, the actions based on option values in _create() are the same as those in _setOption. To avoid
// such code duplication, this class calls _setOption once for each option after _create() has completed.
//
// Furthermore, to avoid writing long switches in a widget's _setOption method, this class implements _setOption in such
// a way that, for any given option (e.g. "myOption"), _setOption looks for a method _setMyOption in the widget's
// implementation, and if found, calls the method with the value of the option.
//
// If your widget does not inherit from widgetex, you can still use widgetex' systematic option handling:
// 1. define the _setOption method for your widget as follows:
//      _setOption: $.todons.widgetex.prototype._setOption
// 2. Call this._setOptions(this.options) from your widget's _create() function.
// 3. As with widgetex-derived widgets, implement a corresponding _setMyOptionName function for each option myOptionName
// you wish to handle.
//
// IV. systematic value handling for input elements
//
// If your widget happens to be constructed from an <input> element, you have to handle the "value" attribute specially,
// and you have to emit the "change" signal whenever it changes, in addition to your widget's normal signals and option
// changes. With widgetex, you can assign one of your widget's "data-*" properties to be synchronized to the "value"
// property whenever your widget is constructed onto an <input> element. To do this, define, in your prototype:
//
// _value: {
//      attr: "data-my-attribute",
//      signal: "signal-to-emit"
// }
//
// Then, call this._setValue(newValue) whenever you wish to set the value for your widget. This will set the data-*
// attribute, emit the custom signal (if set) with the new value as its parameter, and, if the widget is based on an
// <input> element, it will also set the "value" attribute and emit the "change" signal.
//
// "attr" is required if you choose to define "_value", and identifies the data-attribute to set in addition to "value",
// if your widget's element is an input.
// "signal" is optional, and will be emitted when setting the data-attribute via this._setValue(newValue).
//
// If your widget does not derive from widgetex, you can still define "_value" as described above and call
// $.todons.widgetex.setValue(widget, newValue).

(function($, undefined) {

// Framework-specific HTML prototype path for AJAX loads
function getProtoPath() {
    var theScriptTag = $("script[data-framework-version][data-framework-root][data-framework-theme]");

    return (theScriptTag.attr("data-framework-root")    + "/" +
            theScriptTag.attr("data-framework-version") + "/themes/" + 
            theScriptTag.attr("data-framework-theme")   + "/proto-html");
}

$.widget("todons.widgetex", $.mobile.widget, {
    _createWidget: function() {
        $.todons.widgetex.loadPrototype.call(this, this.namespace + "." + this.widgetName);
        $.mobile.widget.prototype._createWidget.apply(this, arguments);
    },

    _init: function() {
        var page = this.element.closest(".ui-page"),
            self = this,
            myOptions = {};

        if (page.is(":visible"))
            this._realize();
        else
            page.bind("pageshow", function() { self._realize(); });

        $.extend(myOptions, this.options);

        this.options = {};

        this._setOptions(myOptions);
    },

    _getCreateOptions: function() {
        // if we're dealing with an <input> element, value takes precedence over corresponding data-* attribute, if a
        // mapping has been established via this._value. So, assign the value to the data-* attribute, so that it may
        // then be assigned to this.options in the superclass' _getCreateOptions

        if (this.element.is("input") && this._value !== undefined) {
            var theValue =
                ((this.element.attr("type") === "checkbox" || this.element.attr("type") === "radio")
                    ? this.element.is(":checked")
                    : this.element.is("[value]")
                        ? this.element.attr("value")
                        : undefined);

            if (theValue != undefined)
                this.element.attr(this._value.attr, theValue);
        }

        return $.mobile.widget.prototype._getCreateOptions.apply(this, arguments);
    },

    _setOption: function(key, value) {
        var setter = "_set" + key.replace(/^[a-z]/, function(c) {return c.toUpperCase();});

        if (this[setter] !== undefined)
            this[setter](value);
        else
            $.mobile.widget.prototype._setOption.apply(this, arguments);
    },

    _setValue: function(newValue) {
        $.todons.widgetex.setValue(this, newValue);
    },

    _realize: function() {}
});

$.todons.widgetex.setValue = function(widget, newValue) {
    if (widget._value !== undefined) {
        widget.element.attr(widget._value.attr, newValue);
        if (widget._value.signal !== undefined)
            widget.element.triggerHandler(widget._value.signal, newValue);
        if (widget.element.is("input")) {
            var inputType = widget.element.attr("type");

            // Special handling for checkboxes and radio buttons, where the presence of the "checked" attribute is really
            // the value
            if (inputType === "checkbox" || inputType === "radio") {
                if (newValue)
                    widget.element.attr("checked", true);
                else
                    widget.element.removeAttr("checked");
            }
            else
                widget.element.attr("value", newValue);
            widget.element.trigger("change");
        }
    }
};

$.todons.widgetex.loadPrototype = function(widget, ui) {
    var ar = widget.split(".");

    if (ar.length == 2) {
        var namespace = ar[0],
            widgetName = ar[1];

        var htmlProto = $("<div></div>")
                .text("Failed to load proto for widget " + namespace + "." + widgetName + "!")
                .css({background: "red", color: "blue", border: "1px solid black"})
                .jqmData("todons.widgetex.ajax.fail", true);

        // If htmlProto is defined
        if ($[namespace][widgetName].prototype._htmlProto !== undefined) {
            // If no source is defined, use the widget name
            if ($[namespace][widgetName].prototype._htmlProto.source === undefined)
                $[namespace][widgetName].prototype._htmlProto.source = widgetName;

            // Load the HTML prototype via AJAX if not defined inline
            if (typeof $[namespace][widgetName].prototype._htmlProto.source === "string") {
                // Establish the path for the proto file
                    widget = $[namespace][widgetName].prototype._htmlProto.source,
                    protoPath = getProtoPath();

                // Make the AJAX call
                $.ajax({
                    url: protoPath + "/" + widget + ".prototype.html",
                    async: false,
                    dataType: "html"
                }).success(function(data, textStatus, jqXHR) {
                    htmlProto = $("<div></div>").html(data).jqmData("todons.widgetex.ajax.fail", false);
                });

                // Assign the HTML proto to the widget prototype
                $[namespace][widgetName].prototype._htmlProto.source = htmlProto;
            }
            // Otherwise, use the inline definition
            else {
                // AJAX loading has trivially succeeded, since there was no AJAX loading at all
                $[namespace][widgetName].prototype._htmlProto.source.jqmData("todons.widgetex.ajax.fail", false);
                htmlProto = $[namespace][widgetName].prototype._htmlProto.source;
            }

            // If there's a "ui" portion in the HTML proto, copy it over to this instance, and
            // replace the selectors with the selected elements from a copy of the HTML prototype
            if ($[namespace][widgetName].prototype._htmlProto.ui !== undefined) {
	        // Assign the relevant parts of the proto
                function assignElements(proto, obj) {
                    var ret = {};
                    for (var key in obj)
                        if ((typeof obj[key]) === "string") {
                            ret[key] = proto.find(obj[key]);
                            if (obj[key].match(/^#/))
                                ret[key].removeAttr("id");
                        }
                        else
                        if ((typeof obj[key]) === "object")
                            ret[key] = assignElements(proto, obj[key]);
                    return ret;
                }

                $.extend(this, {
                    _ui: assignElements(htmlProto.clone(), $[namespace][widgetName].prototype._htmlProto.ui)
                });
            }
        }
    }
};

})(jQuery);
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

(function($, undefined) {

$.widget("todons.colorwidget", $.todons.widgetex, {
    options: {
        color: "#ff0972"
    },

    _value: {
        attr: "data-" + ($.mobile.ns || "") + "color",
        signal: "colorchanged"
    },

    _setColor: function(value) {
        if (value.match(/#[0-9A-Fa-f]{6}/) && (this.options.color != value)) {
            this.options.color = value;
            this._setValue(value);
            return true;
        }
        return false;
    }
});

// Crutches for IE: it is incapable of multi-stop gradients, so add multiple divs inside the given div, each with a two-
// point gradient
if ($.mobile.browser.ie)
    $.todons.colorwidget.hueGradient = function(div) {
        var rainbow = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"];
        for (var Nix = 0 ; Nix < 6 ; Nix++) {
            $("<div></div>")
                .css({
                    position: "absolute",
                    width: (100 / 6) + "%",
                    height: "100%",
                    left: (Nix * 100 / 6) + "%",
                    top: "0px",
                    filter: "progid:DXImageTransform.Microsoft.gradient (startColorstr='" + rainbow[Nix] + "', endColorstr='" + rainbow[Nix + 1] + "', GradientType = 1)"
                })
                .appendTo(div);
        }
    };

$.todons.colorwidget.clrlib = {
    nearestInt: function(val) {
        var theFloor = Math.floor(val);

        return (((val - theFloor) > 0.5) ? (theFloor + 1) : theFloor);
    },

    // Converts html color string to rgb array.
    //
    // Input: string clr_str, where
    // clr_str is of the form "#aabbcc"
    //
    // Returns: [ r, g, b ], where
    // r is in [0, 1]
    // g is in [0, 1]
    // b is in [0, 1]
    HTMLToRGB: function(clr_str) {
        clr_str = (('#' == clr_str.charAt(0)) ? clr_str.substring(1) : clr_str);

        return [ parseInt(clr_str.substring(0, 2), 16) / 255.0,
                 parseInt(clr_str.substring(2, 4), 16) / 255.0,
                 parseInt(clr_str.substring(4, 6), 16) / 255.0 ];
    },

    // Converts rgb array to html color string.
    //
    // Input: [ r, g, b ], where
    // r is in [0, 1]
    // g is in [0, 1]
    // b is in [0, 1]
    //
    // Returns: string of the form "#aabbcc"
    RGBToHTML: function(rgb) {
        var ret = "#", val, theFloor;
        for (var Nix in rgb) {
            val = rgb[Nix] * 255;
            theFloor = Math.floor(val);
            val = ((val - theFloor > 0.5) ? (theFloor + 1) : theFloor);
            ret = ret + (((val < 16) ? "0" : "") + (val & 0xff).toString(16));
        }

        return ret;
    },

    // Converts hsl to rgb.
    //
    // From http://130.113.54.154/~monger/hsl-rgb.html
    //
    // Input: [ h, s, l ], where
    // h is in [0, 360]
    // s is in [0,   1]
    // l is in [0,   1]
    //
    // Returns: [ r, g, b ], where
    // r is in [0, 1]
    // g is in [0, 1]
    // b is in [0, 1]
    HSLToRGB: function(hsl) {
        var h = hsl[0] / 360.0, s = hsl[1], l = hsl[2];

        if (0 === s)
            return [ l, l, l ];

        var temp2 = ((l < 0.5)
                ? l * (1.0 + s)
                : l + s - l * s),
            temp1 = 2.0 * l - temp2,
            temp3 = {
                r: h + 1.0 / 3.0,
                g: h,
                b: h - 1.0 / 3.0
            };

        temp3.r = ((temp3.r < 0) ? (temp3.r + 1.0) : ((temp3.r > 1) ? (temp3.r - 1.0) : temp3.r));
        temp3.g = ((temp3.g < 0) ? (temp3.g + 1.0) : ((temp3.g > 1) ? (temp3.g - 1.0) : temp3.g));
        temp3.b = ((temp3.b < 0) ? (temp3.b + 1.0) : ((temp3.b > 1) ? (temp3.b - 1.0) : temp3.b));

        ret = [
            (((6.0 * temp3.r) < 1) ? (temp1 + (temp2 - temp1) * 6.0 * temp3.r) :
            (((2.0 * temp3.r) < 1) ? temp2 :
            (((3.0 * temp3.r) < 2) ? (temp1 + (temp2 - temp1) * ((2.0 / 3.0) - temp3.r) * 6.0) :
             temp1))),
            (((6.0 * temp3.g) < 1) ? (temp1 + (temp2 - temp1) * 6.0 * temp3.g) :
            (((2.0 * temp3.g) < 1) ? temp2 :
            (((3.0 * temp3.g) < 2) ? (temp1 + (temp2 - temp1) * ((2.0 / 3.0) - temp3.g) * 6.0) :
             temp1))),
            (((6.0 * temp3.b) < 1) ? (temp1 + (temp2 - temp1) * 6.0 * temp3.b) :
            (((2.0 * temp3.b) < 1) ? temp2 :
            (((3.0 * temp3.b) < 2) ? (temp1 + (temp2 - temp1) * ((2.0 / 3.0) - temp3.b) * 6.0) :
             temp1)))];

        return ret;
    },

    // Converts hsv to rgb.
    //
    // Input: [ h, s, v ], where
    // h is in [0, 360]
    // s is in [0,   1]
    // v is in [0,   1]
    //
    // Returns: [ r, g, b ], where
    // r is in [0, 1]
    // g is in [0, 1]
    // b is in [0, 1]
    HSVToRGB: function(hsv) {
        return $.todons.colorwidget.clrlib.HSLToRGB($.todons.colorwidget.clrlib.HSVToHSL(hsv));
    },

    // Converts rgb to hsv.
    //
    // from http://coecsl.ece.illinois.edu/ge423/spring05/group8/FinalProject/HSV_writeup.pdf
    //
    // Input: [ r, g, b ], where
    // r is in [0,   1]
    // g is in [0,   1]
    // b is in [0,   1]
    //
    // Returns: [ h, s, v ], where
    // h is in [0, 360]
    // s is in [0,   1]
    // v is in [0,   1]
    RGBToHSV: function(rgb) {
        var min, max, delta, h, s, v, r = rgb[0], g = rgb[1], b = rgb[2];

        min = Math.min(r, Math.min(g, b));
        max = Math.max(r, Math.max(g, b));
        delta = max - min;

        h = 0;
        s = 0;
        v = max;

        if (delta > 0.00001) {
            s = delta / max;

            if (r === max)
                h = (g - b) / delta ;
            else
            if (g === max)
                h = 2 + (b - r) / delta ;
            else
                h = 4 + (r - g) / delta ;

            h *= 60 ;

            if (h < 0)
                h += 360 ;
        }

        return [h, s, v];
    },

    // Converts hsv to hsl.
    //
    // Input: [ h, s, v ], where
    // h is in [0, 360]
    // s is in [0,   1]
    // v is in [0,   1]
    //
    // Returns: [ h, s, l ], where
    // h is in [0, 360]
    // s is in [0,   1]
    // l is in [0,   1]
    HSVToHSL: function(hsv) {
        var max = hsv[2],
            delta = hsv[1] * max,
            min = max - delta,
            sum = max + min,
            half_sum = sum / 2,
            s_divisor = ((half_sum < 0.5) ? sum : (2 - max - min));

        return [ hsv[0], ((0 == s_divisor) ? 0 : (delta / s_divisor)), half_sum ];
    },

    // Converts rgb to hsl
    //
    // Input: [ r, g, b ], where
    // r is in [0,   1]
    // g is in [0,   1]
    // b is in [0,   1]
    //
    // Returns: [ h, s, l ], where
    // h is in [0, 360]
    // s is in [0,   1]
    // l is in [0,   1]
    RGBToHSL: function(rgb) {
        return $.todons.colorwidget.clrlib.HSVToHSL($.todons.colorwidget.clrlib.RGBToHSV(rgb));
    }
};

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION - listview autodividers
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// Applies dividers automatically to a listview, using link text
// (for link lists) or text (for readonly lists) as the basis for the
// divider text.
//
// Apply using autodividers({type: 'X'}) on a <ul> with
// data-role="listview", or with data-autodividers="true", where X
// is the type of divider to create. The default divider type is 'alpha',
// meaning first characters of list item text, upper-cased.
//
// The element used to derive the text for the auto dividers defaults
// to the first link inside the li; failing that, the text directly inside
// the li element is used. This can be overridden with the
// data-autodividers-selector attribute or via options; the selector
// will use each li element as its context.
//
// Any time a new li element is added to the list, or an li element is
// removed, this extension will update the dividers in the listview
// accordingly.
//
// Note that if a listview already has dividers, applying this
// extension will remove all the existing dividers and replace them
// with new, generated ones.
//
// Also note that this extension doesn't sort the list: it only creates
// dividers based on text inside list items. So if your list isn't
// alphabetically-sorted, you may get duplicate dividers.
//
// So, for example, this markup:
//
// <ul id="has-no-dividers" data-role="listview" data-autodividers="alpha">
//		<li>Barry</li>
//		<li>Carrie</li>
//		<li>Betty</li>
//		<li>Harry</li>
//		<li>Carly</li>
//		<li>Hetty</li>
// </ul>
//
// will produce dividers like this:
//
// <ul data-role="listview" data-autodividers="alpha">
//	<li data-role="list-divider">B</li>
//	<li>Barry</li>
//	<li data-role="list-divider">C</li>
//	<li>Carrie</li>
//	<li data-role="list-divider">B</li>
//	<li>Betty</li>
//	<li data-role="list-divider">H</li>
//	<li>Harry</li>
//	<li data-role="list-divider">C</li>
//	<li>Carly</li>
//	<li data-role="list-divider">H</li>
//	<li>Hetty</li>
// </ul>
//
// with each divider occuring twice.
//
// Options:
//
//	selector: The jQuery selector to use to find text for the
//			generated dividers. Default is to use the first 'a'
//			(link) element. If this selector doesn't find any
//			text, the widget automatically falls back to the text
//			inside the li (for read-only lists). Can be set to a custom
//			selector via data-autodividers-selector="..." or the 'selector'
//			option.
//
//	 type: 'alpha' (default) sets the auto divider type to "uppercased
//		 first character of text selected from each item"; "full" sets
//		 it to the unmodified text selected from each item. Set via
//		 the data-autodividers="<type>" attribute on the listview or
//		 the 'type' option.
//
// Events:
//
//	updatelayout: Triggered if the dividers in the list change;
//		this happens if list items are added to the listview,
//		which causes the autodividers to be regenerated.

(function( $, undefined ) {

var autodividers = function(options) {
	var list = $( this );
	options = options || {};

	var listview = list.data( 'listview' );

	var dividerType = options.type || list.jqmData( 'autodividers' ) || 'alpha';

	var textSelector = options.selector || list.jqmData( 'autodividers-selector' ) || 'a';

	var getDividerText = function( elt ) {
		// look for some text in the item
		var text = elt.find( textSelector ).text() || elt.text() || null;

		if ( !text ) {
			return null;
		}

		// create the text for the divider
		if ( dividerType === 'alpha' ) {
			text = text.slice( 0, 1 ).toUpperCase();
		}

		return text;
	};

	var mergeDividers = function() {
		var dividersChanged = false;

		// any dividers which are following siblings of a divider, where
		// there are no dividers with different text inbetween, can be removed
		list.find( 'li.ui-li-divider' ).each(function() {
			var divider = $( this );
			var dividerText = divider.text();
			var selector = '.ui-li-divider:not(:contains(' + dividerText + '))';
			var nextDividers = divider.nextUntil( selector );
			nextDividers = nextDividers.filter( '.ui-li-divider:contains(' + dividerText + ')' );

			if (nextDividers.length > 0) {
				nextDividers.remove();
				dividersChanged = true;
			}
		});

		if (dividersChanged) {
			list.trigger( 'updatelayout' );
		}
	};

	// check that elt is a non-divider li element
	var isNonDividerLi = function( elt ) {
		return elt.is('li') &&
		       elt.jqmData( 'role' ) !== 'list-divider';
	};

	// li element inserted, so check whether it needs a divider
	var liAdded = function( li ) {
		var dividerText = getDividerText( li );

		if ( !dividerText ) {
			listview.refresh();
			return;
		}

		// add expected divider for this li if it doesn't exist
		var existingDividers = li.prevAll( '.ui-li-divider:first:contains(' + dividerText + ')' );

		if ( existingDividers.length === 0 ) {
			var divider = $( '<li>' + dividerText + '</li>' );
			divider.attr( 'data-' + $.mobile.ns + 'role', 'list-divider' );
			li.before( divider );

			listview.refresh();

			mergeDividers();
		}
		else {
			listview.refresh();
		}
	};

	// li element removed, so check whether its divider should go
	var liRemoved = function( li ) {

		var dividerText = getDividerText( li );

		if ( !dividerText ) {
			listview.refresh();
			return;
		}

		// remove divider for this li if there are no other
		// li items for the divider before or after this li item
		var precedingItems = li.prevUntil( '.ui-li-divider:contains(' + dividerText + ')' );
		var nextItems = li.nextUntil( '.ui-li-divider' );

		if ( precedingItems.length === 0 && nextItems.length === 0 ) {
			li.prevAll( '.ui-li-divider:contains(' + dividerText + '):first' ).remove();

			listview.refresh();

			mergeDividers();
		}
		else {
			listview.refresh();
		}
	};

	// set up the dividers on first create
	list.find( 'li' ).each( function() {
		var li = $( this );

		// remove existing dividers
		if ( li.jqmData( 'role' ) === 'list-divider' ) {
			li.remove();
		}
		// make new dividers for list items
		else {
			liAdded( li );
		}
	});

	// bind to DOM events to keep list up to date
	list.bind( 'DOMNodeInserted', function( e ) {
		var elt = $( e.target );

		if ( !isNonDividerLi( elt ) ) {
			return;
		}

		liAdded( elt );
	});

	list.bind( 'DOMNodeRemoved', function( e ) {
		var elt = $( e.target );

		if ( !isNonDividerLi( elt ) ) {
			return;
		}

		liRemoved( elt );
	});
};

$.fn.autodividers = autodividers;

$( ":jqmData(role=listview)" ).live( "listviewcreate", function() {
	var list = $( this );

	if ( list.is( ':jqmData(autodividers)' ) ) {
		list.autodividers();
	}
});

})( jQuery );
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Kalyan Kondapally <kalyan.kondapally@intel.com>
 */

// CalendarPicker can be created using the calendarpicker() method or by adding a
// data-role="calendarpicker" attribute to an element.
// The core logic of the widget has been taken from https://github.com/jtsage/jquery-mobile-datebox
//
// CalendarPicker is hidden by default.It can be displayed by calling open() or setting option "show" to true
// during creation and close() to hide it. It appears as a popup window and disappears when closed.
// CalendarPicker closes automatically when a valid date selection has been made, or when the user clicks
// outside its box.
//
// Options:
//
//     dateFormat: The format of date. The Default value is YYYY-MM-DD.
//
//     calShowDays: Default value is true. Should be set to false if name of the day should not be displayed.
//     calShowOnlyMonth: Default Value is true. Should be set to false if previous or next month dates should be visible
//                        along with the current month.
//     highDays: An array of days to highlight, every week followed by the theme used to hightlight them.
//               Sun = Sunday, Mon = Monday, ... Sat = Saturday (e.g. ["Sun","b", "Sat", "mycustomtheme"])
//     disabledDayColor: Colour used to show disabled dates.
//     calHighToday: Theme used to highlight current day. By default it is set to e.Setting the value to null will disable
//                   highlighting todays date.
//     highDatesTheme: The theme used to highlight dates specified by highDates option.By default it is theme e.
//     calStartDay: Defines the start day of the week. By default it is 1(Monday).
//
//     FOllowing documentation taken from http://dev.jtsage.com/#/jQM-DateBox/demos/calendar/ :
//
//     afterToday: When set, only dates that are after or on "today" are selectable.
//     beforeToday: When set, only dates that are before or on "today" are selectable.
//     notToday: When set, "today" is not selectable.
//     minDays: When set, only dates that are after *number* of days before today may be selected.
//              Note that minDays can be a negative number.
//     maxDays: When set, only dates that are before *number* of days after today may be selected.
//              Note that maxDays can be a negative number.
//     highDates: An array of ISO 8601 Dates to highlight. (e.g. ["2011-01-01", "2011-12-25"]).
//     blackDays: An array of days to disable, every week. 0 = Sunday, 1 = Monday, ... 6 = Saturday (e.g. [2]).
//     blackDates: An array of ISO 8601 Dates to disable. (e.g. ["2011-01-01", "2011-12-25"]).
//     Using a calendar to select a specific day can be accomplished by setting option 'calWeekMode' to 'true'
//     and 'calWeekModeFirstDay' to the day you wish to pick.
//
// Events:
//
//     appear: Fired after calendarpicker becomes visible and appear animation has ended.
//     disappear: Fired after calendarpicker is closed and disappear animation has ended.
//     selectedDate: Fired after user has selected a valid date. The formateddate(which user has selected)
//                   is sent as additional parameter.
//
// Properties:
//
//     open: Shows the CalendarPicker with an animation.
//     close: Hides the CalendarPicker with an animation.
//     visible: Returns true if calendarpicker is visible.
//     Refresh: Recalculates the needed buttons to display dates.It can be useful in cases like orientation change,
//              changing options dynamically etc.
//
// Examples:
//
//     HTML markup for creating CalendarPicker:
//         <div id = "calendarbutton" data-role = "calendarpicker">  </div>
//
//     How to Show CalendarPicker (for example when user presses a button):
//         <div id = "calendarbutton" data-role = "calendarpicker">
//             <a href="#" data-role="button" data-theme = "a" data-inline = true data-corners=false>
//                Launch CalendarPicker</a>
//         </div>
//        $(document).bind("pagecreate", function() {
//            var button = $('#calendarbutton');
//            button.bind('vclick', function (e) {
//	          button.calendarpicker('open'); --> Shows the CalendarPicker.
//                button.unbind('selectedDate').bind('selectedDate',function(e,val) {
//                // val should contain the selected date in specified format.
//                });
//            });
//        });
//
//    How to Show CalendarPicker by default:
//        <div id = "calendarbutton" data-role = "calendarpicker" data-options='{"show": "true"}'>  </div>
//
//    Passing custom options:
//         <div id = "calendarbutton" data-role = "calendarpicker" data-options='{"calShowOnlyMonth": "false"}'>  </div>
//         <div id = "calendarbutton" data-role = "calendarpicker" data-options='{"highDays": ["Mon","e","Wed","a"]}'></div>
//         <div id = "calendarbutton" data-role = "calendarpicker" data-options='{"highDates": ["2011-12-24", "2011-12-25"],
//                                                                                "highDatesTheme":"c"}'>  </div>
//
//    To select by week using Wednesday:
//        <div id = "calendarbutton" data-role = "calendarpicker" data-options='{"calWeekMode": true,
//                                                                               "calWeekModeFirstDay": 3}'>  </div>
//    To change startday of the week to be Sunday:
//        <div id = "calendarbutton" data-role = "calendarpicker" data-options='{"calStartDay": 0}'>  </div>

(function($, undefined ) {
    $.widget( "todons.calendarpicker", $.todons.widgetex, {
        options: {
            // All widget options, including some internal runtime details
            daysOfWeekShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            monthsOfYear: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
                           'October', 'November', 'December'],
            calShowDays: true,
            calShowOnlyMonth: true,
            dateFormat: 'YYYY-MM-DD',
            calWeekMode: false,
            calWeekModeFirstDay: 1,
            calStartDay: 1,
            notToday:false,
            afterToday: false,
            beforeToday: false,
            maxDays: false,
            minDays: false,
            highDays: ["Sun","firstdaybutton", "Sat","lastdaybutton"],
            calHighToday: "e",
            highDates: false,
            highDatesTheme:"e",
            blackDays: false,
            blackDates: false,
            disabledDayColor: '#888',
            show: false
        },

        _zeroPad: function(number) {
            // Pad a number with a zero, to make it 2 digits
            return ( ( number < 10 ) ? "0" : "" ) + String(number);
        },

        _makeOrd: function (num) {
            // Return an ordinal suffix (1st, 2nd, 3rd, etc)
            var ending = num % 10;
            if ( num > 9 && num < 21 ) { return 'th'; }
            if ( ending > 3 ) { return 'th'; }
            return ['th','st','nd','rd'][ending];
        },

        _dstAdjust: function(date) {
            // Make sure not to run into daylight savings time.
            if (!date) { return null; }
            date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0);
            return date;
        },

        _getFirstDay: function(date) {
            // Get the first DAY of the month (0-6)
            return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        },

        _getLastDate: function(date) {
            // Get the last DATE of the month (28,29,30,31)
            return 32 - this._dstAdjust(new Date(date.getFullYear(), date.getMonth(), 32)).getDate();
        },

        _getLastDateBefore: function(date) {
            // Get the last DATE of the PREVIOUS month (28,29,30,31)
            return 32 - this._dstAdjust(new Date(date.getFullYear(), date.getMonth()-1, 32)).getDate();
        },

        _formatter: function(format, date) {
            // Format the output date or time (not duration)
            format = format.replace('SS', this._makeOrd(date.getDate()));
            format = format.replace('YYYY', date.getFullYear());
            format = format.replace('MM',   this._zeroPad(date.getMonth() + 1));
            format = format.replace('mm',   date.getMonth() + 1);
            format = format.replace('DD',   this._zeroPad(date.getDate()));
            format = format.replace('dd',   date.getDate());
            return format;
        },

        _formatDate: function(date) {
            // Shortcut function to return dateFormat date/time format
            return this._formatter(this.options.dateFormat, date);
        },

        _isoDate: function(y,m,d) {
            // Return an ISO 8601 date (yyyy-mm-dd)
            return String(y) + '-' + (( m < 10 ) ? "0" : "") + String(m) + '-' + ((d < 10 ) ? "0" : "") + String(d);
        },

        _checker: function(date) {
            // Return a ISO 8601 BASIC format date (YYYYMMDD) for simple comparisons
            return parseInt(String(date.getFullYear()) + this._zeroPad(date.getMonth()+1) + this._zeroPad(date.getDate()),10);
        },

        _offset: function(mode, amount, update) {
            // Compute a date/time.
            //   update = false to prevent controls refresh
            var self = this,
            o = this.options;

            if ( typeof(update) === "undefined" ) { update = true; }
            switch(mode) {
            case 'y':
                 self.theDate.setYear(self.theDate.getFullYear() + amount);
                break;
            case 'm':
                self.theDate.setMonth(self.theDate.getMonth() + amount);
                break;
            case 'd':
                self.theDate.setDate(self.theDate.getDate() + amount);
                break;
            }
            if ( update === true ) { self._update(); }
        },

        _update: function() {
            // Update the display on date change
            var self = this,
                o = self.options,
                testDate = null,
                i, gridWeek, gridDay, skipThis, thisRow, y, cTheme, inheritDate, thisPRow, tmpVal,
                interval = {'d': 60*60*24, 'h': 60*60, 'i': 60, 's':1},
                calmode = {};

            self._ui.cpMonthGrid.text( o.monthsOfYear[self.theDate.getMonth()] + " " + self.theDate.getFullYear() );
            self._ui.cpweekDayGrid.html('');

            calmode = {'today': -1, 'highlightDay': -1, 'presetDay': -1, 'nexttoday': 1,
                'thisDate': new Date(), 'maxDate': new Date(), 'minDate': new Date(),
                'currentMonth': false, 'weekMode': 0, 'weekDays': null, 'thisTheme': o.pickPageButtoTheme };
            calmode.start = self._getFirstDay(self.theDate);
            calmode.end = self._getLastDate(self.theDate);
            calmode.lastend = self._getLastDateBefore(self.theDate);
            if ( o.calStartDay > 0 ) {
                calmode.start = calmode.start - o.calStartDay;
                if ( calmode.start < 0 ) { calmode.start = calmode.start + 7; }
            }
            calmode.prevtoday = calmode.lastend - (calmode.start - 1);
            calmode.checkDates = ( o.afterToday !== false || o.beforeToday !== false || o.notToday !== false || o.maxDays !== false || o.minDays !== false || o.blackDates !== false || o.blackDays !== false );

            if ( calmode.thisDate.getMonth() === self.theDate.getMonth() && calmode.thisDate.getFullYear() === self.theDate.getFullYear() ) { calmode.currentMonth = true; calmode.highlightDay = calmode.thisDate.getDate(); }

            self.calNoPrev = false; self.calNoNext = false;

            if ( o.afterToday === true &&
                ( calmode.currentMonth === true || ( calmode.thisDate.getMonth() >= self.theDate.getMonth() && self.theDate.getFullYear() === calmode.thisDate.getFullYear() ) ) ) {
                self.calNoPrev = true; }
            if ( o.beforeToday === true &&
                ( calmode.currentMonth === true || ( calmode.thisDate.getMonth() <= self.theDate.getMonth() && self.theDate.getFullYear() === calmode.thisDate.getFullYear() ) ) ) {
                self.calNoNext = true; }

            if ( o.minDays !== false ) {
                calmode.minDate.setDate(calmode.minDate.getDate() - o.minDays);
                if ( self.theDate.getFullYear() === calmode.minDate.getFullYear() && self.theDate.getMonth() <= calmode.minDate.getMonth() ) { self.calNoPrev = true;}
            }
            if ( o.maxDays !== false ) {
                calmode.maxDate.setDate(calmode.maxDate.getDate() + o.maxDays);
                if ( self.theDate.getFullYear() === calmode.maxDate.getFullYear() && self.theDate.getMonth() >= calmode.maxDate.getMonth() ) { self.calNoNext = true;}
            }

            if ( o.calShowDays ) {
                if ( o.daysOfWeekShort.length < 8 ) { o.daysOfWeekShort = o.daysOfWeekShort.concat(o.daysOfWeekShort); }
                calmode.weekDays = $("<div>", {'class':'ui-cp-row'}).appendTo(self._ui.cpweekDayGrid);
                for ( i=0; i<=6;i++ ) {
                    $("<div>"+o.daysOfWeekShort[i+o.calStartDay]+"</div>").addClass('ui-cp-date ui-cp-date-disabled ui-cp-month').appendTo(calmode.weekDays);
                }
            }

            for ( gridWeek=0; gridWeek<=5; gridWeek++ ) {
                if ( gridWeek === 0 || ( gridWeek > 0 && (calmode.today > 0 && calmode.today <= calmode.end) ) ) {
                    thisRow = $("<div>", {'class': 'ui-cp-row'}).appendTo(self._ui.cpweekDayGrid);
                    for ( gridDay=0; gridDay<=6; gridDay++) {
                        if ( gridDay === 0 ) { calmode.weekMode = ( calmode.today < 1 ) ? (calmode.prevtoday - calmode.lastend + o.calWeekModeFirstDay) : (calmode.today + o.calWeekModeFirstDay); }
                        if ( gridDay === calmode.start && gridWeek === 0 ) { calmode.today = 1; }
                        if ( calmode.today > calmode.end ) { calmode.today = -1; }
                        if ( calmode.today < 1 ) {
                            if ( o.calShowOnlyMonth ) {
                                $("<div>", {'class': 'ui-cp-date ui-cp-date-disabled'}).appendTo(thisRow);
                            } else {
                                if (
                                    ( o.blackDays !== false && $.inArray(gridDay, o.blackDays) > -1 ) ||
                                    ( o.blackDates !== false && $.inArray(self._isoDate(self.theDate.getFullYear(), (self.theDate.getMonth()), calmode.prevtoday), o.blackDates) > -1 ) ||
                                    ( o.blackDates !== false && $.inArray(self._isoDate(self.theDate.getFullYear(), (self.theDate.getMonth()+2), calmode.nexttoday), o.blackDates) > -1 ) ) {
                                        skipThis = true;
                                } else { skipThis = false; }

                                if ( gridWeek === 0 ) {
                                    $("<div>"+String(calmode.prevtoday)+"</div>")
                                        .addClass('ui-cp-date ui-cp-date-disabled').appendTo(thisRow)
                                        .attr('data-date', ((o.calWeekMode)?(calmode.weekMode+calmode.lastend):calmode.prevtoday));
                                    calmode.prevtoday++;
                                } else {
                                    $("<div>"+String(calmode.nexttoday)+"</div>")
                                        .addClass('ui-cp-date ui-cp-date-disabled').appendTo(thisRow)
                                        .attr('data-date', ((o.calWeekMode)?calmode.weekMode:calmode.nexttoday));
                                    calmode.nexttoday++;
                                }
                            }
                        } else {
                            skipThis = false;
                            if ( calmode.checkDates ) {
                                if ( o.afterToday && self._checker(calmode.thisDate) > (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
                                    skipThis = true;
                                }
                                if ( !skipThis && o.beforeToday && self._checker(calmode.thisDate) < (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
                                    skipThis = true;
                                }
                                if ( !skipThis && o.notToday && calmode.today === calmode.highlightDay ) {
                                    skipThis = true;
                                }
                                if ( !skipThis && o.maxDays !== false && self._checker(calmode.maxDate) < (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
                                    skipThis = true;
                                }
                                if ( !skipThis && o.minDays !== false && self._checker(calmode.minDate) > (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
                                    skipThis = true;
                                }
                                if ( !skipThis && ( o.blackDays !== false || o.blackDates !== false ) ) { // Blacklists
                                    if (
                                        ( $.inArray(gridDay, o.blackDays) > -1 ) ||
                                        ( $.inArray(self._isoDate(self.theDate.getFullYear(), self.theDate.getMonth()+1, calmode.today), o.blackDates) > -1 ) ) {
                                            skipThis = true;
                                    }
                                }
                            }

                            if ( o.calHighToday !== null && calmode.today === calmode.highlightDay ) {
                                calmode.thisTheme = o.calHighToday;
                            } else if ( $.isArray(o.highDates) && ($.inArray(self._isoDate(self.theDate.getFullYear(), self.theDate.getMonth()+1, calmode.today), o.highDates) > -1 ) ) {
                                calmode.thisTheme = o.highDatesTheme;
                            } else if ( $.isArray(o.highDays) && $.inArray(o.daysOfWeekShort[gridDay+o.calStartDay], o.highDays) > -1 ) {
                                  var index = $.inArray(o.daysOfWeekShort[gridDay+o.calStartDay], o.highDays);
                                  var theme = "calendarbutton";
                                  index = index == o.highDays.length-1 ? -1 :index;
                                  if (index>-1) {
                                      var temp = o.highDays[index+1];
                                      if (isNaN(temp))
                                          theme = temp;
                                  }
                                calmode.thisTheme = o.highDays[index+1];
                            } else {
                                calmode.thisTheme = "calendarbutton";
                            }


                            $("<div>"+String(calmode.today)+"</div>")
                                .addClass('ui-cp-date ui-calendarbtncommon')
                                .attr('data-date', ((o.calWeekMode)?calmode.weekMode:calmode.today))
                                .attr('data-theme', calmode.thisTheme)
                                .appendTo(thisRow)
                                .addClass('ui-btn-up-'+calmode.thisTheme)
                                .unbind().bind((!skipThis)?'vclick':'error', function(e) {
                                        e.preventDefault();
                                        self.theDate.setDate($(this).attr('data-date'));
                                        self.element.trigger('selectedDate',[self._formatDate(self.theDate)]);
                                        self.close();
                                })
                                .css((skipThis)?'color':'nocolor', o.disabledDayColor);

                            calmode.today++;
                        }
                    }
                }
            }
        },

        _create: function() {
            // Create the widget, called automatically by widget system
            var self = this,
                o = $.extend(this.options, this.element.data('options')),
                input = this.element,
                theDate = new Date(); // Internal date object, used for all operations
            $.extend(self, {
                     input:input,
                     theDate: theDate
            });

            $(this.element).buttonMarkup();

            self._buildPage();
        },

        _htmlProto: {
source:

$("<div><div class='ui-cp-container'>" +
  "  <div class='ui-cp-headercontainer'>" +
  "      <div class='ui-cp-previous ui-calendarbtncommon'><a href='#'></a></div>" +
  "      <div class='ui-cp-next ui-calendarbtncommon'><a href='#'></a></div>" +
  "      <div class='ui-cp-month'><h4>Uninitialized</h4></div>" +
  "  </div>" +
  "  <div class='ui-cp-weekday'> </div>" +
  "</div>" +
  "</div>")
,            ui: {
                cpContainer:    ".ui-cp-container",
                cpHeader:       ".ui-cp-headercontainer",
                cpweekDayGrid:  ".ui-cp-weekday",
                cpMonthGrid:    ".ui-cp-month",
                previousButton: ".ui-cp-previous",
                nextButton:     ".ui-cp-next"
            }
        },

        _buildPage: function () {
            // Build the controls
            var self = this,
                o = self.options,
                isopen = false,
                previousButtonMarkup = {inline: true,
                                        corners:true,
                                        icon:'arrow-l',
                                        iconpos:'notext'},
                nextButtonMarkup = {inline: true,
                                    corners:true,
                                    icon:'arrow-r',
                                    iconpos:'notext'};

            this._ui.previousButton.buttonMarkup(previousButtonMarkup);
            this._ui.nextButton.buttonMarkup(nextButtonMarkup);

            this._ui.nextButton.bind('vclick',function(e) {
                e.preventDefault();
                if (!self.calNoNext) {
                    if ( self.theDate.getDate() > 28 ) { self.theDate.setDate(1); }
                    self._offset('m',1);
                }
            });
            this._ui.previousButton.bind('vclick', function(e) {
                e.preventDefault();
                if (!self.calNoPrev) {
                    if ( self.theDate.getDate() > 28 ) { self.theDate.setDate(1); }
                    self._offset('m',-1);
                }
            });

            $.extend(self, {
                isopen:isopen
            });
            this._ui.cpContainer.appendTo(self.element)
                       .popupwindow({transition: "slideup", overlayTheme: "c"})
                       .bind("closed", function(e) {
                          self.isopen = false;
                       });
            if (o.show)
                self.open();
        },

        refresh: function() {
            this._update();
        },

        visible: function() {
            return this.isopen;
        },

        open: function() {
            // Open the picker
            if (this.isopen === true ) { return false; } else { this.isopen = true; } // Ignore if already open
            this._update();
            /*
             * FIXME: Could pass some meaningful coordinates to "open" to make it show up in the right place, rather
             * than the center of the screen. The problem is that no widget from the page is associated with this
             * popup window, so we would have to start with this.element and work our way up the tree until we ran
             * into a widget whose coordinates we could actually pass to "open".
             */
            this._ui.cpContainer.popupwindow("open", 0, window.innerHeight);
        },

        close: function() {
            // Close the picker
            this._ui.cpContainer.popupwindow("close");
        }
    });
    // Autoinit widget.
    $( document ).bind( "pagecreate", function( e ){
        $( ":jqmData(role='calendarpicker')", e.target ).calendarpicker();
    });

})( jQuery );
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 */

// It displays a grid two rows by five columns of colors.
//
// The colors are automatically computed based on the hue
// of the color set by the color attribute (see below).
//
// One of the displayed colors is the color attribute itself
// and the others are multiples of 360/10 away from that color;
// 10 is the total number of colors displayed (2 rows by 5 columns).
//
// To apply, add the attribute data-role="colorpalette" to a <div>
// element inside a page. Alternatively, call colorpalette() on an
// element.
//
// Options:
//
//     color: String; initial color can be specified in html
//            using the data-color="#ff00ff" attribute or
//            when constructed in javascript, eg :
//                $("#mycolorpalette").colorpalette({ color: "#ff00ff" });
//            where the html might be :
//                <div id="mycolorpalette"></div>
//            The color can be changed post-construction like this :
//                $("#mycolorpalette").colorpalette("option", "color", "#ABCDEF");
//            Default: "#1a8039"

(function( $, undefined ) {

$.widget( "todons.colorpalette", $.todons.colorwidget, {
    options: {
        showPreview: false,
        initSelector: ":jqmData(role='colorpalette')"
    },

    _htmlProto: {
source:

$("<div><div id='colorpalette' class='ui-colorpalette jquery-mobile-ui-widget' data-n-choices='10'>" +
  "    <div class='colorpalette-preview-container' id='colorpalette-preview-container'>" +
  "        <div id='colorpalette-preview' class='colorpalette-preview ui-corner-all'></div>" +
  "    </div>" +
  "    <div class='colorpalette-table'>" +
  "        <div class='colorpalette-normal-row'>" +
  "            <div class='colorpalette-choice-container-left'>" +
  "                <div data-colorpalette-choice='0' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='1' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='2' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='3' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='4' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "        </div>" +
  "        <div class='colorpalette-bottom-row'>" +
  "            <div class='colorpalette-choice-container-left'>" +
  "                <div data-colorpalette-choice='5' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='6' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='7' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='8' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "            <div class='colorpalette-choice-container-rest'>" +
  "                <div data-colorpalette-choice='9' class='colorpalette-choice ui-corner-all'></div>" +
  "            </div>" +
  "        </div>" +
  "    </div>" +
  "</div>" +
  "</div>")
,        ui: {
            clrpalette: "#colorpalette",
            preview: "#colorpalette-preview",
            previewContainer: "#colorpalette-preview-container"
        }
    },

    _create: function() {
        var self = this;

        this.element.append(this._ui.clrpalette);

        this._ui.clrpalette.find("[data-colorpalette-choice]").bind("vclick", function(e) {
            var clr = $(e.target).css("background-color"),
                Nix,
                nChoices = self._ui.clrpalette.attr("data-" + ($.mobile.ns || "") + "n-choices"),
                choiceId, rgbMatches;

            rgbMatches = clr.match(/rgb\(([0-9]*), *([0-9]*), *([0-9]*)\)/);

            if (rgbMatches && rgbMatches.length > 3)
                clr = $.todons.colorwidget.clrlib.RGBToHTML([
                    parseInt(rgbMatches[1]) / 255,
                    parseInt(rgbMatches[2]) / 255,
                    parseInt(rgbMatches[3]) / 255]);

            for (Nix = 0 ; Nix < nChoices ; Nix++)
                self._ui.clrpalette.find("[data-colorpalette-choice=" + Nix + "]").removeClass("colorpalette-choice-active");

            $(e.target).addClass("colorpalette-choice-active");
            $.todons.colorwidget.prototype._setColor.call(self, clr);
            self._ui.preview.css("background", clr);
        });
    },

    _setShowPreview: function(show) {
        if (show)
            this._ui.previewContainer.removeAttr("style");
        else
            this._ui.previewContainer.css("display", "none");
        this.element.attr("data-" + ($.mobile.ns || "") + "show-preview", show);
    },

    _setColor: function(clr) {
        if ($.todons.colorwidget.prototype._setColor.call(this, clr)) {
            var Nix,
                activeIdx = -1,
                nChoices = this._ui.clrpalette.attr("data-" + ($.mobile.ns || "") + "n-choices"),
                hsl = $.todons.colorwidget.clrlib.RGBToHSL($.todons.colorwidget.clrlib.HTMLToRGB(clr)),
                origHue = hsl[0],
                offset = hsl[0] / 36,
                theFloor = Math.floor(offset),
                newClr;

            this._ui.preview.css("background", clr);

            offset = (offset - theFloor < 0.5)
                ? (offset - theFloor)
                : (offset - (theFloor + 1));

            offset *= 36;

            for (Nix = 0 ; Nix < nChoices ; Nix++) {
                hsl[0] = Nix * 36 + offset;
                hsl[0] = ((hsl[0] < 0) ? (hsl[0] + 360) : ((hsl[0] > 360) ? (hsl[0] - 360) : hsl[0]));

                if (hsl[0] === origHue)
                    activeIdx = Nix;

                newClr = $.todons.colorwidget.clrlib.RGBToHTML($.todons.colorwidget.clrlib.HSLToRGB(hsl));

                this._ui.clrpalette.find("[data-colorpalette-choice=" + Nix + "]").css("background-color", newClr);
            }

            if (activeIdx != -1) {
                var currentlyActive = parseInt(this._ui.clrpalette.find(".colorpalette-choice-active").attr("data-" + ($.mobile.ns || "") + "colorpalette-choice"));
                if (currentlyActive != activeIdx) {
                    this._ui.clrpalette.find("[data-colorpalette-choice=" + currentlyActive + "]").removeClass("colorpalette-choice-active");
                    this._ui.clrpalette.find("[data-colorpalette-choice=" + activeIdx + "]").addClass("colorpalette-choice-active");
                }
            }
        }
    }
});

$(document).bind("pagecreate create", function(e) {
    $($.todons.colorpalette.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .colorpalette();
});

})( jQuery );
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 */

// Displays a 2D hue/saturation spectrum and a lightness slider.
//
// To apply, add the attribute data-role="colorpicker" to a <div>
// element inside a page. Alternatively, call colorpicker() 
// on an element (see below).
//
// Options:
//     color: String; can be specified in html using the
//            data-color="#ff00ff" attribute or when constructed
//                $("#mycolorpicker").colorpicker({ color: "#ff00ff" });
//            where the html might be :
//                <div id="mycolorpicker"/>

(function( $, undefined ) {

$.widget( "todons.colorpicker", $.todons.colorwidget, {
    options: {
        initSelector: ":jqmData(role='colorpicker')"
    },

    _htmlProto: {
source:

$("<div><div id='colorpicker' class='ui-colorpicker'>" +
  "    <div class='colorpicker-hs-container'>" +
  "        <div id='colorpicker-hs-hue-gradient' class='colorpicker-hs-mask jquery-todons-colorwidget-clrlib-hue-gradient'></div>" +
  "        <div id='colorpicker-hs-sat-gradient' class='colorpicker-hs-mask sat-gradient'></div>" +
  "        <div id='colorpicker-hs-val-mask' class='colorpicker-hs-mask' data-event-source='hs'></div>" +
  "        <div id='colorpicker-hs-selector' class='colorpicker-hs-selector ui-corner-all'></div>" +
  "    </div>" +
  "    <div class='colorpicker-l-container'>" +
  "        <div id='colorpicker-l-gradient' class='colorpicker-l-mask l-gradient' data-event-source='l'></div>" +
  "        <div id='colorpicker-l-selector' class='colorpicker-l-selector ui-corner-all'></div>" +
  "    </div>" +
  "    <div style='clear: both;'></div>" +
  "</div>" +
  "</div>")
,        ui: {
            clrpicker: "#colorpicker",
            hs: {
                hueGradient: "#colorpicker-hs-hue-gradient",
                gradient: "#colorpicker-hs-sat-gradient",
                eventSource: "[data-event-source='hs']",
                valMask:   "#colorpicker-hs-val-mask",
                selector:  "#colorpicker-hs-selector"
            },
            l: {
                gradient: "#colorpicker-l-gradient",
                eventSource: "[data-event-source='l']",
                selector:  "#colorpicker-l-selector"
            }
        }
    },

    _create: function() {
        var self = this;

        // Crutches for IE: it uses the filter css property, and if the background is also set, the transparency goes bye-bye
        if ($.mobile.browser.ie) {
            this._ui.hs.gradient.css("background", "none");
            this._ui.l.gradient.css("background", "none");
            $.todons.colorwidget.hueGradient(this._ui.hs.hueGradient);
        }
        this.element.append(this._ui.clrpicker);

        $.extend( self, {
            dragging: false,
            draggingHS: false,
            selectorDraggingOffset: {
                x : -1,
                y : -1
            },
            dragging_hsl: undefined
        });

        $( document )
            .bind( "vmousemove", function( event ) {
                if ( self.dragging ) {
                    event.stopPropagation();
                    event.preventDefault();
                }
            })
            .bind( "vmouseup", function( event ) {
                if ( self.dragging )
                    self.dragging = false;
            });

        this._bindElements("hs");
        this._bindElements("l");
    },

    _bindElements: function(which) {
        var self = this,
            stopDragging = function(event) {
                self.dragging = false;
                event.stopPropagation();
                event.preventDefault();
            };

        this._ui[which].eventSource
            .bind( "vmousedown mousedown", function (event) { self._handleMouseDown(event, which, false); })
            .bind( "vmousemove"          , function (event) { self._handleMouseMove(event, which, false); })
            .bind( "vmouseup"            , stopDragging);

        this._ui[which].selector
            .bind( "vmousedown mousedown", function (event) { self._handleMouseDown(event, which, true); })
            .bind( "touchmove vmousemove", function (event) { self._handleMouseMove(event, which, true); })
            .bind( "vmouseup"            , stopDragging);
    },

    _handleMouseDown: function(event, containerStr, isSelector) {
        var coords = $.mobile.todons.targetRelativeCoordsFromEvent(event),
            widgetStr = isSelector ? "selector" : "eventSource";
        if ((coords.x >= 0 && coords.x <= this._ui[containerStr][widgetStr].width() &&
             coords.y >= 0 && coords.y <= this._ui[containerStr][widgetStr].height()) || isSelector) {
            this.dragging = true;
            this.draggingHS = ("hs" === containerStr);

            if (isSelector) {
                this.selectorDraggingOffset.x = coords.x;
                this.selectorDraggingOffset.y = coords.y;
            }

            this._handleMouseMove(event, containerStr, isSelector, coords);
        }
    },

    _handleMouseMove: function(event, containerStr, isSelector, coords) {
        if (this.dragging) {
            coords = (coords || $.mobile.todons.targetRelativeCoordsFromEvent(event));

            if (this.draggingHS) {
                var potential_h = isSelector
                      ? this.dragging_hsl[0] / 360 + (coords.x - this.selectorDraggingOffset.x) / this._ui[containerStr].eventSource.width()
                      : coords.x / this._ui[containerStr].eventSource.width(),
                    potential_s = isSelector
                      ? this.dragging_hsl[1]       + (coords.y - this.selectorDraggingOffset.y) / this._ui[containerStr].eventSource.height()
                      : coords.y / this._ui[containerStr].eventSource.height();

                this.dragging_hsl[0] = Math.min(1.0, Math.max(0.0, potential_h)) * 360;
                this.dragging_hsl[1] = Math.min(1.0, Math.max(0.0, potential_s));
            }
            else {
                var potential_l = isSelector
                      ? this.dragging_hsl[2]       + (coords.y - this.selectorDraggingOffset.y) / this._ui[containerStr].eventSource.height()
                      : coords.y / this._ui[containerStr].eventSource.height();

                this.dragging_hsl[2] = Math.min(1.0, Math.max(0.0, potential_l));
            }

            if (!isSelector) {
                this.selectorDraggingOffset.x = Math.ceil(this._ui[containerStr].selector.outerWidth()  / 2.0);
                this.selectorDraggingOffset.y = Math.ceil(this._ui[containerStr].selector.outerHeight() / 2.0);
            }

            this._updateSelectors(this.dragging_hsl);
            event.stopPropagation();
            event.preventDefault();
        }
    },

    _updateSelectors: function(hsl) {
        var clr = $.todons.colorwidget.clrlib.RGBToHTML($.todons.colorwidget.clrlib.HSLToRGB([hsl[0], 1.0 - hsl[1], hsl[2]])),
            gray = $.todons.colorwidget.clrlib.RGBToHTML([hsl[2], hsl[2], hsl[2]]);

        this._ui.hs.valMask.css((hsl[2] < 0.5)
            ? { background : "#000000" , opacity : (1.0 - hsl[2] * 2.0)   }
            : { background : "#ffffff" , opacity : ((hsl[2] - 0.5) * 2.0) });
        this._ui.hs.selector.css({
            left       : (hsl[0] / 360 * this._ui.hs.eventSource.width()),
            top        : (hsl[1] * this._ui.hs.eventSource.height()),
            background : clr
        });
        this._ui.l.selector.css({
            top        : (hsl[2] * this._ui.l.eventSource.height()),
            background : gray
        });
        $.todons.colorwidget.prototype._setColor.call(this, clr);
    },

    _setColor: function(clr) {
        if ($.todons.colorwidget.prototype._setColor.call(this, clr)) {
            this.dragging_hsl = $.todons.colorwidget.clrlib.RGBToHSL($.todons.colorwidget.clrlib.HTMLToRGB(clr));
            this.dragging_hsl[1] = 1.0 - this.dragging_hsl[1];
            this._updateSelectors(this.dragging_hsl);
        }
    }
});

$(document).bind("pagecreate create", function(e) {
    $($.todons.colorpicker.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .colorpicker();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 */

// Displays a button which, when pressed, opens a popupwindow
// containing hsvpicker.
//
// To apply, add the attribute data-role="colorpickerbutton" to a <div>
// element inside a page. Alternatively, call colorpickerbutton() on an
// element.
//
// Options:
//
//     color: String; color displayed on the button and the base color
//            of the hsvpicker (see hsvpicker).
//            initial color can be specified in html using the
//            data-color="#ff00ff" attribute or when constructed in
//            javascript, eg :
//                $("#mycolorpickerbutton").colorpickerbutton({ color: "#ff00ff" });
//            where the html might be :
//                <div id="colorpickerbutton"></div>
//            The color can be changed post-construction like this :
//                $("#mycolorpickerbutton").colorpickerbutton("option", "color", "#ABCDEF");
//            Default: "#1a8039"
//
//     buttonMarkup: String; markup to use for the close button on the popupwindow, eg :
//                   $("#mycolorpickerbutton").colorpickerbutton("option","buttonMarkup",
//                     "<a href='#' data-role='button'>ignored</a>");
//
//     closeText: String; the text to display on the close button on the popupwindow.
//                The text set in the buttonMarkup will be ignored and this used instead.
//
// Events:
//
//     colorchanged: emitted when the color has been changed and the popupwindow is closed.

(function($, undefined) {

$.widget("todons.colorpickerbutton", $.todons.colorwidget, {
    options: {
        buttonMarkup: {
            theme: null,
            inline: true,
            corners: true,
            shadow: true
        },
        hideInput: true,
        closeText: "Close",
        initSelector: "input[type='color'], :jqmData(type='color'), :jqmData(role='colorpickerbutton')"
    },

    _htmlProto: {
source:

$("<div><div id='colorpickerbutton'>" +
  "    <a id='colorpickerbutton-button' href='#' data-role='button' aria-haspopup='true'>" +
  "        <span id='colorpickerbutton-button-contents'>&#x2587;&#x2587;&#x2587;</span>" +
  "    </a>" +
  "    <div id='colorpickerbutton-popup-container' style='display: table;'>" +
  "        <div id='colorpickerbutton-popup-hsvpicker' data-role='hsvpicker'></div>" +
  "        <a id='colorpickerbutton-popup-close-button' href='#' data-role='button'>" +
  "            <span id='colorpickerbutton-popup-close-button-text'></span>" +
  "        </a>" +
  "    </div>" +
  "</div>" +
  "</div>")
,        ui: {
            button:          "#colorpickerbutton-button",
            buttonContents:  "#colorpickerbutton-button-contents",
            popup:           "#colorpickerbutton-popup-container",
            hsvpicker:       "#colorpickerbutton-popup-hsvpicker",
            closeButton:     "#colorpickerbutton-popup-close-button",
            closeButtonText: "#colorpickerbutton-popup-close-button-text"
        }
    },

    _create: function() {
        var self = this;

        this._ui.button.insertAfter(this.element);

        /* Tear apart the proto */
        this._ui.popup.insertBefore(this.element).popupwindow();
        this._ui.hsvpicker.hsvpicker();

        $.todons.popupwindow.bindPopupToButton(this._ui.button, this._ui.popup);

        this._ui.closeButton.bind("vclick", function(event) {
            self._setColor(self._ui.hsvpicker.hsvpicker("option", "color"));
            self.close();
        });

        this.element.bind("change keyup blur", function() {
            self._setColor(self.element.val());
        });
    },

    _setHideInput: function(value) {
        this.element[value ? "addClass" : "removeClass"]("ui-colorpickerbutton-input-hidden");
        this.element[value ? "removeClass" : "addClass"]("ui-colorpickerbutton-input");
        this.element.attr("data-" + ($.mobile.ns || "") + "hide-input", value);
    },

    _setColor: function(clr) {
        if ($.todons.colorwidget.prototype._setColor.call(this, clr)) {
            this._ui.hsvpicker.hsvpicker("option", "color", clr);
            this._ui.buttonContents.css("color", clr);
        }
    },

    _setButtonMarkup: function(value) {
        this._ui.button.buttonMarkup(value);
        this.options.buttonMarkup = value;
        value["inline"] = false;
        this._ui.closeButton.buttonMarkup(value);
    },

    _setCloseText: function(value) {
        this._ui.closeButtonText.text(value);
        this.options.closeText = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "close-text", value);
    },

    open: function() {
        if ( this.options.disabled ) {
            return;
        }

        this._ui.popup.popupwindow("open",
            this._ui.button.offset().left + this._ui.button.outerWidth()  / 2,
            this._ui.button.offset().top  + this._ui.button.outerHeight() / 2);
    },

    _focusButton : function(){
        var self = this;
        setTimeout(function() {
            self._ui.button.focus();
        }, 40);
    },

    close: function() {
        if ( this.options.disabled ) {
            return;
        }

        var self = this;

        self._focusButton();
        self._ui.popup.popupwindow("close");
    }
});

//auto self-init widgets
$(document).bind("pagecreate create", function(e) {
    $($.todons.colorpickerbutton.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .colorpickerbutton();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 */

// Displays the color in text of the form '#RRGGBB' where
// RR, GG, and BB are in hexadecimal.
//
// Apply a colortitle by adding the attribute data-role="colortitle"
// to a <div> element inside a page. Alternatively, call colortitle() 
// on an element (see below).
//
// Options:
//
//     color: String; the initial color can be specified in html using
//            the data-color="#ff00ff" attribute or when constructed
//            in javascipt eg
//                $("#mycolortitle").colortitle({ color: "#ff00ff" });
//            where the html might be :
//                <div id="mycolortitle"></div>
//            The color can be changed post-construction :
//                $("#mycolortitle").colortitle("option", "color", "#ABCDEF");
//            Default: "#1a8039".

(function( $, undefined ) {

$.widget( "todons.colortitle", $.todons.colorwidget, {
    options: {
        initSelector: ":jqmData(role='colortitle')"
    },

    _htmlProto: {
source:

$("<div><div id='colortitle' class='ui-colortitle jquery-mobile-ui-widget'>" +
  "    <h1 id='colortitle-string'></h1>" +
  "</div>" +
  "</div>")
,        ui: {
            clrtitle: "#colortitle",
            header:   "#colortitle-string"
        }
    },

    _create: function() {
        this.element.append(this._ui.clrtitle);
    },

    _setColor: function(clr) {
        if ($.todons.colorwidget.prototype._setColor.call(this, clr))
            this._ui.header.text(clr);
    }
});

$(document).bind("pagecreate create", function(e) {
    $($.todons.colortitle.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .colortitle();
});

})(jQuery);
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Ensure that the given namespace is defined. If not, define it to be an empty object.
// This is kinda like the mkdir -p command.

function ensureNS(ns) {
    var nsAr = ns.split("."),
    nsSoFar = "";

    for (var Nix in nsAr) {
        nsSoFar = nsSoFar + (Nix > 0 ? "." : "") + nsAr[Nix];
        eval (nsSoFar + " = " + nsSoFar + " || {};");
    }
}
/*
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 * Uses the built in easing capabilities added In jQuery 1.1
 * to offer multiple easing options
 *
 * TERMS OF USE - jQuery Easing
 * 
 * Open source under the BSD License. 
 * 
 * Copyright © 2008 George McGinley Smith
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
*/

// t: current time, b: begInnIng value, c: change In value, d: duration
jQuery.easing['jswing'] = jQuery.easing['swing'];

jQuery.extend( jQuery.easing,
{
	def: 'easeOutQuad',
	swing: function (x, t, b, c, d) {
		//alert(jQuery.easing.default);
		return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
	},
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158; 
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return jQuery.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return jQuery.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
});

/*
 *
 * TERMS OF USE - EASING EQUATIONS
 * 
 * Open source under the BSD License. 
 * 
 * Copyright © 2001 Robert Penner
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
 */
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Add markup for labels

(function($, undefined) {

$(document).bind("pagecreate create", function(e) {
    $(":jqmData(role='label')", e.target).not(":jqmData(role='none'), :jqmData(role='nojs')").each(function() {
        $(this).addClass("jquery-mobile-ui-label")
               .html($("<span>", {"class": "jquery-mobile-ui-label-text"}).text($(this).text()));
    });
});

})(jQuery);
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Size pages to the window

(function($, undefined) {

var _fit_page_to_window_selector = ":jqmData(role='page'):jqmData(fit-page-to-window='true'):visible";

$(document).bind("pageshow", function(e) {
    if ($(e.target).is(_fit_page_to_window_selector))
        $.mobile.todons.fillPageWithContentArea($(e.target));
});

$(window).resize(function() {
    if ($(_fit_page_to_window_selector)[0] !== undefined)
        $.mobile.todons.fillPageWithContentArea($(_fit_page_to_window_selector));
});

})(jQuery);
/*
* jQuery Mobile Framework : scrollview plugin
* Copyright (c) 2010 Adobe Systems Incorporated - Kin Blas (jblas@adobe.com)
* Dual licensed under the MIT (MIT-LICENSE.txt) and GPL (GPL-LICENSE.txt) licenses.
* Note: Code is in draft form and is subject to change
*/
(function($,window,document,undefined){

jQuery.widget( "mobile.scrollview", jQuery.mobile.widget, {
	options: {
		fps:               60,    // Frames per second in msecs.
		direction:         null,  // "x", "y", or null for both.

		scrollDuration:    2000,  // Duration of the scrolling animation in msecs.
		overshootDuration: 250,   // Duration of the overshoot animation in msecs.
		snapbackDuration:  500,   // Duration of the snapback animation in msecs.

		moveThreshold:     10,   // User must move this many pixels in any direction to trigger a scroll.
		moveIntervalThreshold:     150,   // Time between mousemoves must not exceed this threshold.

		scrollMethod:      "translate",  // "translate", "position", "scroll"

		startEventName:    "scrollstart",
		updateEventName:   "scrollupdate",
		stopEventName:     "scrollstop",

		eventType:         $.support.touch ? "touch" : "mouse",

		showScrollBars:    true,

		pagingEnabled:     false,
		delayedClickSelector: "a,input,textarea,select,button,.ui-btn",
		delayedClickEnabled: false
	},

	_makePositioned: function($ele)
	{
		if ($ele.css("position") == "static")
			$ele.css("position", "relative");
	},

	_create: function()
	{
		this._$clip = $(this.element).addClass("ui-scrollview-clip");
		var $child = this._$clip.children();
		if ($child.length > 1) {
			$child = this._$clip.wrapInner("<div></div>").children();
		}
		this._$view = $child.addClass("ui-scrollview-view");

		this._$clip.css("overflow", this.options.scrollMethod === "scroll" ? "scroll" : "hidden");
		this._makePositioned(this._$clip);

		this._$view.css("overflow", "hidden");

		// Turn off our faux scrollbars if we are using native scrolling
		// to position the view.

		this.options.showScrollBars = this.options.scrollMethod === "scroll" ? false : this.options.showScrollBars;

		// We really don't need this if we are using a translate transformation
		// for scrolling. We set it just in case the user wants to switch methods
		// on the fly.

		this._makePositioned(this._$view);
		this._$view.css({ left: 0, top: 0 });

		this._sx = 0;
		this._sy = 0;

		var direction = this.options.direction;
		this._hTracker = (direction !== "y")   ? new MomentumTracker(this.options) : null;
		this._vTracker = (direction !== "x") ? new MomentumTracker(this.options) : null;

		this._timerInterval = 1000/this.options.fps;
		this._timerID = 0;

		var self = this;
		this._timerCB = function(){ self._handleMomentumScroll(); };

		this._addBehaviors();
	},

	_startMScroll: function(speedX, speedY)
	{
		this._stopMScroll();
		this._showScrollBars();

		var keepGoing = false;
		var duration = this.options.scrollDuration;

		this._$clip.trigger(this.options.startEventName);

		var ht = this._hTracker;
		if (ht)
		{
			var c = this._$clip.width();
			var v = this._$view.width();
			ht.start(this._sx, speedX, duration, (v > c) ? -(v - c) : 0, 0);
			keepGoing = !ht.done();
		}

		var vt = this._vTracker;
		if (vt)
		{
			var c = this._$clip.height();
			var v = this._$view.height();
			vt.start(this._sy, speedY, duration, (v > c) ? -(v - c) : 0, 0);
			keepGoing = keepGoing || !vt.done();
		}

		if (keepGoing)
			this._timerID = setTimeout(this._timerCB, this._timerInterval);
		else
			this._stopMScroll();
	},

	_stopMScroll: function()
	{
		if (this._timerID)
		{
			this._$clip.trigger(this.options.stopEventName);
			clearTimeout(this._timerID);
		}
		this._timerID = 0;

		if (this._vTracker)
			this._vTracker.reset();

		if (this._hTracker)
			this._hTracker.reset();

		this._hideScrollBars();
	},

	_handleMomentumScroll: function()
	{
		var keepGoing = false;
		var v = this._$view;

		var x = 0, y = 0;

		var vt = this._vTracker;
		if (vt)
		{
			vt.update();
			y = vt.getPosition();
			keepGoing = !vt.done();
		}

		var ht = this._hTracker;
		if (ht)
		{
			ht.update();
			x = ht.getPosition();
			keepGoing = keepGoing || !ht.done();
		}

		this._setScrollPosition(x, y);
		this._$clip.trigger(this.options.updateEventName, [ { x: x, y: y } ]);

		if (keepGoing)
			this._timerID = setTimeout(this._timerCB, this._timerInterval);
		else
			this._stopMScroll();
	},

	_setScrollPosition: function(x, y)
	{
		this._sx = x;
		this._sy = y;

		var $v = this._$view;

		var sm = this.options.scrollMethod;

		switch (sm)
		{
			case "translate":
				setElementTransform($v, x + "px", y + "px");
				break;
			case "position":
				$v.css({left: x + "px", top: y + "px"});
				break;
			case "scroll":
				var c = this._$clip[0];
				c.scrollLeft = -x;
				c.scrollTop = -y;
				break;
		}

		var $vsb = this._$vScrollBar;
		var $hsb = this._$hScrollBar;

		if ($vsb)
		{
			var $sbt = $vsb.find(".ui-scrollbar-thumb");
			if (sm === "translate")
				setElementTransform($sbt, "0px", -y/$v.height() * $sbt.parent().height() + "px");
			else
				$sbt.css("top", -y/$v.height()*100 + "%");
		}

		if ($hsb)
		{
			var $sbt = $hsb.find(".ui-scrollbar-thumb");
			if (sm === "translate")
				setElementTransform($sbt,  -x/$v.width() * $sbt.parent().width() + "px", "0px");
			else
				$sbt.css("left", -x/$v.width()*100 + "%");
		}
	},

	scrollTo: function(x, y, duration)
	{
		this._stopMScroll();
		if (!duration)
			return this._setScrollPosition(x, y);

		x = -x;
		y = -y;

		var self = this;
		var start = getCurrentTime();
		var efunc = $.easing["easeOutQuad"];
		var sx = this._sx;
		var sy = this._sy;
		var dx = x - sx;
		var dy = y - sy;
		var tfunc = function(){
			var elapsed = getCurrentTime() - start;
			if (elapsed >= duration)
			{
				self._timerID = 0;
				self._setScrollPosition(x, y);
			}
			else
			{
				var ec = efunc(elapsed/duration, elapsed, 0, 1, duration);
				self._setScrollPosition(sx + (dx * ec), sy + (dy * ec));
				self._timerID = setTimeout(tfunc, self._timerInterval);
			}
		};

		this._timerID = setTimeout(tfunc, this._timerInterval);
	},

	getScrollPosition: function()
	{
		return { x: -this._sx, y: -this._sy };
	},

	_getScrollHierarchy: function()
	{
		var svh = [];
		this._$clip.parents(".ui-scrollview-clip").each(function(){
			var d = $(this).jqmData("scrollview");
			if (d) svh.unshift(d);
		});
		return svh;
	},

	_getAncestorByDirection: function(dir)
	{
		var svh = this._getScrollHierarchy();
		var n = svh.length;
		while (0 < n--)
		{
			var sv = svh[n];
			var svdir = sv.options.direction;

			if (!svdir || svdir == dir)
				return sv;
		}
		return null;
	},

	_handleDragStart: function(e, ex, ey)
	{
		// Stop any scrolling of elements in our parent hierarcy.
		$.each(this._getScrollHierarchy(),function(i,sv){ sv._stopMScroll(); });
		this._stopMScroll();

		var c = this._$clip;
		var v = this._$view;

		if (this.options.delayedClickEnabled) {
			this._$clickEle = $(e.target).closest(this.options.delayedClickSelector);
		}
		this._lastX = ex;
		this._lastY = ey;
		this._doSnapBackX = false;
		this._doSnapBackY = false;
		this._speedX = 0;
		this._speedY = 0;
		this._directionLock = "";
		this._didDrag = false;

		if (this._hTracker)
		{
			var cw = parseInt(c.css("width"), 10);
			var vw = parseInt(v.css("width"), 10);
			this._maxX = cw - vw;
			if (this._maxX > 0) this._maxX = 0;
			if (this._$hScrollBar)
				this._$hScrollBar.find(".ui-scrollbar-thumb").css("width", (cw >= vw ? "100%" : Math.floor(cw/vw*100)+ "%"));
		}

		if (this._vTracker)
		{
			var ch = parseInt(c.css("height"), 10);
			var vh = parseInt(v.css("height"), 10);
			this._maxY = ch - vh;
			if (this._maxY > 0) this._maxY = 0;
			if (this._$vScrollBar)
				this._$vScrollBar.find(".ui-scrollbar-thumb").css("height", (ch >= vh ? "100%" : Math.floor(ch/vh*100)+ "%"));
		}

		var svdir = this.options.direction;

		this._pageDelta = 0;
		this._pageSize = 0;
		this._pagePos = 0;

		if (this.options.pagingEnabled && (svdir === "x" || svdir === "y"))
		{
			this._pageSize = svdir === "x" ? cw : ch;
			this._pagePos = svdir === "x" ? this._sx : this._sy;
			this._pagePos -= this._pagePos % this._pageSize;
		}
		this._lastMove = 0;
		this._enableTracking();

		// If we're using mouse events, we need to prevent the default
		// behavior to suppress accidental selection of text, etc. We
		// can't do this on touch devices because it will disable the
		// generation of "click" events.
		//
		// XXX: We should test if this has an effect on links! - kin
		// XXX: It does affect links, and other input elements, if they
		//      occur inside a scrollview; so make sure the event
		//      occurred on something other than an input element or a link
		//      before preventing its default
		if (this.options.eventType == "mouse" || this.options.delayedClickEnabled) {
			var isLinkOrInput = $(e.target).is('a, :input');
			var isInsideLinkOrInput = $(e.target).parents('a, :input').length > 0;
			var shouldBlockEvent = !(isLinkOrInput || isInsideLinkOrInput);

			if (shouldBlockEvent) {
				e.preventDefault();
			}
		}
		e.stopPropagation();

	},

	_propagateDragMove: function(sv, e, ex, ey, dir)
	{
		this._hideScrollBars();
		this._disableTracking();
		sv._handleDragStart(e,ex,ey);
		sv._directionLock = dir;
		sv._didDrag = this._didDrag;
	},

	_handleDragMove: function(e, ex, ey)
	{
		this._lastMove = getCurrentTime();

		var v = this._$view;

		var dx = ex - this._lastX;
		var dy = ey - this._lastY;
		var svdir = this.options.direction;

		if (!this._directionLock)
		{
			var x = Math.abs(dx);
			var y = Math.abs(dy);
			var mt = this.options.moveThreshold;

			if (x < mt && y < mt) {
				return false;
			}

			var dir = null;
			var r = 0;
			if (x < y && (x/y) < 0.5) {
				dir = "y";
			}
			else if (x > y && (y/x) < 0.5) {
				dir = "x";
			}

			if (svdir && dir && svdir != dir)
			{
				// This scrollview can't handle the direction the user
				// is attempting to scroll. Find an ancestor scrollview
				// that can handle the request.

				var sv = this._getAncestorByDirection(dir);
				if (sv)
				{
					this._propagateDragMove(sv, e, ex, ey, dir);
					return false;
				}
			}

			this._directionLock = svdir ? svdir : (dir ? dir : "none");
		}

		var newX = this._sx;
		var newY = this._sy;

		if (this._directionLock !== "y" && this._hTracker)
		{
			var x = this._sx;
			this._speedX = dx;
			newX = x + dx;

			// Simulate resistance.

			this._doSnapBackX = false;
			if (newX > 0 || newX < this._maxX)
			{
				if (this._directionLock === "x")
				{
					var sv = this._getAncestorByDirection("x");
					if (sv)
					{
						this._setScrollPosition(newX > 0 ? 0 : this._maxX, newY);
						this._propagateDragMove(sv, e, ex, ey, dir);
						return false;
					}
				}
				newX = x + (dx/2);
				this._doSnapBackX = true;
			}
		}

		if (this._directionLock !== "x" && this._vTracker)
		{
			var y = this._sy;
			this._speedY = dy;
			newY = y + dy;

			// Simulate resistance.

			this._doSnapBackY = false;
			if (newY > 0 || newY < this._maxY)
			{
				if (this._directionLock === "y")
				{
					var sv = this._getAncestorByDirection("y");
					if (sv)
					{
						this._setScrollPosition(newX, newY > 0 ? 0 : this._maxY);
						this._propagateDragMove(sv, e, ex, ey, dir);
						return false;
					}
				}

				newY = y + (dy/2);
				this._doSnapBackY = true;
			}

		}

		if (this.options.pagingEnabled && (svdir === "x" || svdir === "y"))
		{
			if (this._doSnapBackX || this._doSnapBackY)
				this._pageDelta = 0;
			else
			{
				var opos = this._pagePos;
				var cpos = svdir === "x" ? newX : newY;
				var delta = svdir === "x" ? dx : dy;

				this._pageDelta = (opos > cpos && delta < 0) ? this._pageSize : ((opos < cpos && delta > 0) ? -this._pageSize : 0);
			}
		}

		this._didDrag = true;
		this._lastX = ex;
		this._lastY = ey;

		this._setScrollPosition(newX, newY);

		this._showScrollBars();

		// Call preventDefault() to prevent touch devices from
		// scrolling the main window.

		// e.preventDefault();

		return false;
	},

	_handleDragStop: function(e)
	{
		var l = this._lastMove;
		var t = getCurrentTime();
		var doScroll = l && (t - l) <= this.options.moveIntervalThreshold;

		var sx = (this._hTracker && this._speedX && doScroll) ? this._speedX : (this._doSnapBackX ? 1 : 0);
		var sy = (this._vTracker && this._speedY && doScroll) ? this._speedY : (this._doSnapBackY ? 1 : 0);

		var svdir = this.options.direction;
		if (this.options.pagingEnabled && (svdir === "x" || svdir === "y") && !this._doSnapBackX && !this._doSnapBackY)
		{
			var x = this._sx;
			var y = this._sy;
			if (svdir === "x")
				x = -this._pagePos + this._pageDelta;
			else
				y = -this._pagePos + this._pageDelta;

			this.scrollTo(x, y, this.options.snapbackDuration);
		}
		else if (sx || sy)
			this._startMScroll(sx, sy);
		else
			this._hideScrollBars();

		this._disableTracking();

		if (!this._didDrag && this.options.delayedClickEnabled && this._$clickEle.length) {
			this._$clickEle
				.trigger("mousedown")
				//.trigger("focus")
				.trigger("mouseup")
				.trigger("click");
		}

		// If a view scrolled, then we need to absorb
		// the event so that links etc, underneath our
		// cursor/finger don't fire.

		return this._didDrag ? false : undefined;
	},

	_enableTracking: function()
	{
		$(document).bind(this._dragMoveEvt, this._dragMoveCB);
		$(document).bind(this._dragStopEvt, this._dragStopCB);
	},

	_disableTracking: function()
	{
		$(document).unbind(this._dragMoveEvt, this._dragMoveCB);
		$(document).unbind(this._dragStopEvt, this._dragStopCB);
	},

	_showScrollBars: function()
	{
		var vclass = "ui-scrollbar-visible";
		if (this._$vScrollBar) this._$vScrollBar.addClass(vclass);
		if (this._$hScrollBar) this._$hScrollBar.addClass(vclass);
	},

	_hideScrollBars: function()
	{
		var vclass = "ui-scrollbar-visible";
		if (this._$vScrollBar) this._$vScrollBar.removeClass(vclass);
		if (this._$hScrollBar) this._$hScrollBar.removeClass(vclass);
	},

	_addBehaviors: function()
	{
		var self = this;
		if (this.options.eventType === "mouse")
		{
			this._dragStartEvt = "mousedown";
			this._dragStartCB = function(e){ return self._handleDragStart(e, e.clientX, e.clientY); };

			this._dragMoveEvt = "mousemove";
			this._dragMoveCB = function(e){ return self._handleDragMove(e, e.clientX, e.clientY); };

			this._dragStopEvt = "mouseup";
			this._dragStopCB = function(e){ return self._handleDragStop(e); };
		}
		else // "touch"
		{
			this._dragStartEvt = "touchstart";
			this._dragStartCB = function(e)
			{
				var t = e.originalEvent.targetTouches[0];
				return self._handleDragStart(e, t.pageX, t.pageY);
			};

			this._dragMoveEvt = "touchmove";
			this._dragMoveCB = function(e)
			{
				var t = e.originalEvent.targetTouches[0];
				return self._handleDragMove(e, t.pageX, t.pageY);
			};

			this._dragStopEvt = "touchend";
			this._dragStopCB = function(e){ return self._handleDragStop(e); };
		}

		this._$view.bind(this._dragStartEvt, this._dragStartCB);

		if (this.options.showScrollBars)
		{
			var $c = this._$clip;
			var prefix = "<div class=\"ui-scrollbar ui-scrollbar-";
			var suffix = "\"><div class=\"ui-scrollbar-track\"><div class=\"ui-scrollbar-thumb\"></div></div></div>";
			if (this._vTracker)
			{
				$c.append(prefix + "y" + suffix);
				this._$vScrollBar = $c.children(".ui-scrollbar-y");
			}
			if (this._hTracker)
			{
				$c.append(prefix + "x" + suffix);
				this._$hScrollBar = $c.children(".ui-scrollbar-x");
			}
		}
	}
});

function setElementTransform($ele, x, y)
{
	var v = "translate3d(" + x + "," + y + ", 0px)";
	$ele.css({
		"-moz-transform": v,
		"-webkit-transform": v,
		"transform": v
	});
}


function MomentumTracker(options)
{
	this.options = $.extend({}, options);
	this.easing = "easeOutQuad";
	this.reset();
}

var tstates = {
	scrolling: 0,
	overshot:  1,
	snapback:  2,
	done:      3
};

function getCurrentTime() { return (new Date()).getTime(); }

$.extend(MomentumTracker.prototype, {
	start: function(pos, speed, duration, minPos, maxPos)
	{
		this.state = (speed != 0) ? ((pos < minPos || pos > maxPos) ? tstates.snapback : tstates.scrolling) : tstates.done;
		this.pos = pos;
		this.speed = speed;
		this.duration = (this.state == tstates.snapback) ? this.options.snapbackDuration : duration;
		this.minPos = minPos;
		this.maxPos = maxPos;

		this.fromPos = (this.state == tstates.snapback) ? this.pos : 0;
		this.toPos = (this.state == tstates.snapback) ? ((this.pos < this.minPos) ? this.minPos : this.maxPos) : 0;

		this.startTime = getCurrentTime();
	},

	reset: function()
	{
		this.state = tstates.done;
		this.pos = 0;
		this.speed = 0;
		this.minPos = 0;
		this.maxPos = 0;
		this.duration = 0;
	},

	update: function()
	{
		var state = this.state;
		if (state == tstates.done)
			return this.pos;

		var duration = this.duration;
		var elapsed = getCurrentTime() - this.startTime;
		elapsed = elapsed > duration ? duration : elapsed;

		if (state == tstates.scrolling || state == tstates.overshot)
		{
			var dx = this.speed * (1 - $.easing[this.easing](elapsed/duration, elapsed, 0, 1, duration));

			var x = this.pos + dx;

			var didOverShoot = (state == tstates.scrolling) && (x < this.minPos || x > this.maxPos);
			if (didOverShoot)
				x = (x < this.minPos) ? this.minPos : this.maxPos;

			this.pos = x;

			if (state == tstates.overshot)
			{
				if (elapsed >= duration)
				{
					this.state = tstates.snapback;
					this.fromPos = this.pos;
					this.toPos = (x < this.minPos) ? this.minPos : this.maxPos;
					this.duration = this.options.snapbackDuration;
					this.startTime = getCurrentTime();
					elapsed = 0;
				}
			}
			else if (state == tstates.scrolling)
			{
				if (didOverShoot)
				{
					this.state = tstates.overshot;
					this.speed = dx / 2;
					this.duration = this.options.overshootDuration;
					this.startTime = getCurrentTime();
				}
				else if (elapsed >= duration)
					this.state = tstates.done;
			}
		}
		else if (state == tstates.snapback)
		{
			if (elapsed >= duration)
			{
				this.pos = this.toPos;
				this.state = tstates.done;
			}
			else
				this.pos = this.fromPos + ((this.toPos - this.fromPos) * $.easing[this.easing](elapsed/duration, elapsed, 0, 1, duration));
		}

		return this.pos;
	},

	done: function() { return this.state == tstates.done; },
	getPosition: function(){ return this.pos; }
});

jQuery.widget( "mobile.scrolllistview", jQuery.mobile.scrollview, {
	options: {
		direction: "y"
	},

	_create: function() {
		$.mobile.scrollview.prototype._create.call(this);

		// Cache the dividers so we don't have to search for them everytime the
		// view is scrolled.
		//
		// XXX: Note that we need to update this cache if we ever support lists
		//      that can dynamically update their content.

		this._$dividers = this._$view.find(":jqmData(role='list-divider')");
		this._lastDivider = null;
	},

	_setScrollPosition: function(x, y)
	{
		// Let the view scroll like it normally does.

		$.mobile.scrollview.prototype._setScrollPosition.call(this, x, y);

		y = -y;

		// Find the dividers for the list.

		var $divs = this._$dividers;
		var cnt = $divs.length;
		var d = null;
		var dy = 0;
		var nd = null;

		for (var i = 0; i < cnt; i++)
		{
			nd = $divs.get(i);
			var t = nd.offsetTop;
			if (y >= t)
			{
				d = nd;
				dy = t;
			}
			else if (d)
				break;
		}

		// If we found a divider to move position it at the top of the
		// clip view.

		if (d)
		{
			var h = d.offsetHeight;
			var mxy = (d != nd) ? nd.offsetTop : (this._$view.get(0).offsetHeight);
			if (y + h >= mxy)
				y = (mxy - h) - dy;
			else
				y = y - dy;

			// XXX: Need to convert this over to using $().css() and supporting the non-transform case.

			var ld = this._lastDivider;
			if (ld && d != ld) {
				setElementTransform($(ld), 0, 0);
			}
			setElementTransform($(d), 0, y + "px");
			this._lastDivider = d;

		}
	}
});

// auto-init scrollview and scrolllistview widgets
$(document).bind('pagecreate create', function (e) {
    $page = $(e.target);

    $page.find(":jqmData(scroll):not(.ui-scrollview-clip)").each(function () {
        var $this = $(this);

        if ($this.hasClass("ui-scrolllistview")) {
            $this.scrolllistview();
        } else {
            var st = $this.jqmData("scroll") + "";
            var paging = st && st.search(/^[xy]p$/) != -1;
            var dir = st && st.search(/^[xy]/) != -1 ? st.charAt(0) : null;

            var opts = {};
            if (dir)
                opts.direction = dir;
            if (paging)
                opts.pagingEnabled = true;

            var method = $this.jqmData("scroll-method");
            if (method)
                opts.scrollMethod = method;

            $this.scrollview(opts);
        }
    });
});

})(jQuery,window,document); // End Component
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Kalyan Kondapally <kalyan.kondapally@intel.com>
 */

ensureNS("jQuery.mobile.todons");

(function () {

jQuery.extend(jQuery.mobile.todons, {
    Point: function (x, y) {
        var X = isNaN(x) ? 0 : x;
        var Y = isNaN(y) ? 0 : y;

        this.add = function (Point) {
            this.setX(X + Point.x());
            this.setY(Y + Point.y());
            return this;
        }

        this.subtract = function (Point) {
            this.setX(X - Point.x());
            this.setY(Y - Point.y());
            return this;
        }

        this.multiply = function (Point) {
            this.setX(Math.round(X * Point.x()));
            this.setY(Math.round(Y * Point.y()));
            return this;
        }

        this.divide = function (Point) {
            this.setX(Math.round(X / Point.x()));
            this.setY(Math.round(Y / Point.y()));
            return this;
        }

        this.isNull = function () {
            return (X === 0 && Y === 0);
        }

        this.x = function () {
            return X;
        }

        this.setX = function (val) {
            isNaN(val) ? X = 0 : X = val;
        }

        this.y = function () {
            return Y;
        }

        this.setY = function (val) {
            isNaN(val) ? Y = 0 : Y = val;
        }

        this.setNewPoint = function (point) {
            this.setX(point.x());
            this.setY(point.y());
        }

        this.isEqualTo = function (point) {
            return (X === point.x() && Y === point.y());
        }
    },

    Rect: function (left,top,width,height) {
        var Left = left;
        var Top = top;
        var Right = Left+width;
        var Bottom = Top+height;

        this.setRect = function(varL,varR,varT,varB) {
            this.setLeft(varL);
            this.setRight(varR);
            this.setTop(varT);
            this.setBottom(varB);
        }

        this.right = function () {
            return Right;
        }

        this.setRight = function (val) {
            Right = val;
        }

        this.top = function () {
            return Top;
        }

        this.setTop = function (val) {
            Top = val;
        }

        this.bottom = function () {
            return Bottom;
        }

        this.setBottom = function (val) {
            Bottom = val;
        }

        this.left = function () {
            return Left;
        }

        this.setLeft = function (val) {
            Left = val;
        }

        this.moveTop = function(valY) {
            var h = this.height();
            Top = valY;
            Bottom = Top + h;
        }

        this.isNull = function () {
            return Right === Left && Bottom === Top;
        }

        this.isValid = function () {
            return Left <= Right && Top <= Bottom;
        }

        this.isEmpty = function () {
            return Left > Right || Top > Bottom;
        }

        this.contains = function (valX,valY) {
            if (this.containsX(valX) && this.containsY(valY))
                return true;
            return false;
        }

        this.width = function () {
            return Right - Left;
        }

        this.height = function () {
            return Bottom - Top;
        }

        this.containsX = function(val) {
            var l = Left,
            r = Right;
            if (Right<Left) {
                l = Right;
                r = Left;
            }
            if (l > val || r < val)
                return false;
        return true;
        }

        this.containsY = function(val) {
            var t = Top,
            b = Bottom;
            if (Bottom<Top) {
                t = Bottom;
                b = Top;
            }
            if (t > val || b < val)
                return false;
          return true;
        }
    },

    disableSelection: function (element) {
        return $(element).each(function () {
            jQuery(element).css('-webkit-user-select', 'none');
        });
    },

    enableSelection: function (element, value) {
        return $(element).each(function () {
            val = value == "text" ? val = 'text' : val = 'auto';
            jQuery(element).css('-webkit-user-select', val);
        });
    },

    // Set the height of the content area to fill the space between a
    // page's header and footer
    fillPageWithContentArea: function (page) {
        var $page = $(page);
        var $content = $page.children(".ui-content:first");
        var hh = $page.children(".ui-header").outerHeight(); hh = hh ? hh : 0;
        var fh = $page.children(".ui-footer").outerHeight(); fh = fh ? fh : 0;
        var pt = parseFloat($content.css("padding-top"));
        var pb = parseFloat($content.css("padding-bottom"));
        var wh = window.innerHeight;
        var height = wh - (hh + fh) - (pt + pb);
        $content.height(height);
    },

    // Get document-relative mouse coordinates from a given event
    // From: http://www.quirksmode.org/js/events_properties.html#position
    documentRelativeCoordsFromEvent: function(ev) {
        var e = ev ? ev : window.event,
            client = { x: e.clientX, y: e.clientY },
            page   = { x: e.pageX,   y: e.pageY   },
            posx = 0,
            posy = 0;

        // Grab useful coordinates from touch events
        if (e.type.match(/^touch/)) {
            page = {
                x: e.originalEvent.targetTouches[0].pageX,
                y: e.originalEvent.targetTouches[0].pageY
            };
            client = {
                x: e.originalEvent.targetTouches[0].clientX,
                y: e.originalEvent.targetTouches[0].clientY
            };
        }

        if (page.x || page.y) {
            posx = page.x;
            posy = page.y;
        }
        else
        if (client.x || client.y) {
            posx = client.x + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = client.y + document.body.scrollTop  + document.documentElement.scrollTop;
        }

        return { x: posx, y: posy };
    },

    targetRelativeCoordsFromEvent: function(e) {
        var coords = { x: e.offsetX, y: e.offsetY };

        if (coords.x === undefined || isNaN(coords.x) ||
            coords.y === undefined || isNaN(coords.y)) {
            var offset = $(e.target).offset();

            coords = $.mobile.todons.documentRelativeCoordsFromEvent(e);
            coords.x -= offset.left;
            coords.y -= offset.top;
        }

        return coords;
    }
});

})();
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Wrapper round the jLayout functions to enable it to be used
// for creating jQuery Mobile layout extensions.
//
// See the layouthbox and layoutvbox widgets for usage examples.
(function ($, undefined) {

$.widget("todons.jlayoutadaptor", $.mobile.widget, {
    options: {
        hgap: null,
        vgap: null,
        scrollable: true,
        showScrollBars: true,
        direction: null
    },

    _create: function () {
        var self = this,
            options = this.element.data('layout-options'),
            page = $(this.element).closest(':jqmData(role="page")');

        $.extend(this.options, options);

        if (page && !page.is(':visible')) {
            this.element.hide();

            page.bind('pageshow', function () {
                self.refresh();
            });
        }
        else {
            this.refresh();
        }
    },

    refresh: function () {
        var container;
        var config = $.extend(this.options, this.fixed);

        if (config.scrollable) {
            if (!(this.element.children().is('.ui-scrollview-view'))) {
                // create the scrollview
                this.element.scrollview({direction: config.direction,
                                         showScrollBars: config.showScrollBars});
            }
            else if (config.showScrollBars) {
                this.element.find('.ui-scrollbar').show();
            }
            else {
                this.element.find('.ui-scrollbar').hide();
            }

            container = this.element.find('.ui-scrollview-view');
        }
        else {
            container = this.element;
        }

        container.layout(config);

        this.element.show();

        if (config.scrollable) {
            // get the right/bottom edge of the last child after layout
            var lastItem = container.children().last();

            var edge;

            var scrollview = this.element.find('.ui-scrollview-view');

            if (config.direction === 'x') {
                edge = lastItem.position().left +
                       lastItem.outerWidth(true);

                // set the scrollview's view width to the original width
                scrollview.width(edge);

                // set the parent container's height to the height of
                // the scrollview
                this.element.height(scrollview.height());
            }
            else if (config.direction === 'y') {
                edge = lastItem.position().top +
                       lastItem.outerHeight(true);

                // set the scrollview's view height to the original height
                scrollview.height(edge);

                // set the parent container's width to the width of the
                // scrollview
                this.element.width(scrollview.width());
            }
        }
    }
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Salvatore Iovene <salvatore.iovene@intel.com>
 */

// datetimepicker is a widget that lets the user select a date and/or a
// time.
//
// To apply, add the attribute data-datetimepicker="true", or set the
// type="date" to an <input> field in a <form>.
//
// Options (default in parentheses):
// =================================
//  - showDate (true): shows (and allows modification of) the date.
//  - showTime (true): shows (and allows modification of) the time.
//  - header ("Set time"): the header text of the widget.
//  - timeSeparator (":"): the symbol that separates hours and minutes.
//  - months (["Jan".."Dec"]): an array of month names (provide your
//    own if your interface's language is not English.
//  - am ("AM"): the label for the AM text.
//  - pm ("PM"): the lael for the PM text.
//  - twentyfourHours (false): if true, uses the 24h system; if false
//    uses the 12h system.
//  - anumationDuration (500): the time the item selector takes to
//    be animated, in milliseconds.
//  - initSelector (see code): the jQuery selector for the widget.
//
// How to get a return value:
// ==========================
// Bind to the 'date-changed' event, e.g.:
//    $("#myDatetimepicker").bind("date-changed", function(e, date) {
//        alert("New date: " + date.toString());
//    });

(function($, window, undefined) {
    $.widget("todons.datetimepicker", $.todons.widgetex, {
        options: {
            date: null,
            showDate: true,
            showTime: true,
            header: "Set time",
            timeSeparator: ":",
            months: ["Jan", "Feb", "Mar", "Apr", "May",
                     "Jun", "Jul", "Aug", "Sep", "Oct",
                     "Nov", "Dec"],
            am: "AM",
            pm: "PM",
            twentyfourHours: false,
            animationDuration: 500,
            initSelector: "input[type='date'], :jqmData(type='date'), :jqmData(role='datetimepicker')"
        },

        _initDateTime: function() {
            var now = (null === this.options.date)
                    ? new Date()
                    : new Date(Date.parse(this.options.date));

            this.data.year    = now.getFullYear();
            this.data.month   = now.getMonth();
            this.data.day     = now.getDate();
            this.data.hours   = now.getHours();
            this.data.minutes = now.getMinutes();
            this.data.pm      = this.data.hours > 11;

            if (this.data.hours == 0 && this.options.twentyfourHours == false) {
                this.data.hours = 12;
            }
        },

        _initDate: function(ui) {
            if (!this.options.showDate)
                ui.date.main.remove();
            else {
                /* TODO: the order should depend on locale and
                 * configurable in the options. */
                var dataItems = {
                    0: ["year", this.data.year],
                    1: ["month", this.options.months[this.data.month]],
                    2: ["day", this.data.day]
                };

                for (var data in dataItems)
                    ui.date[dataItems[data][0]].text(dataItems[data][1]);
            }
        },

        _initTime: function(ui) {
            /* TODO: the order should depend on locale and
             * configurable in the options. */
            var dataItems = {
                0: ["hours", this._makeTwoDigitValue(this._clampHours(this.data.hours))],
                1: ["separator", this.options.timeSeparator],
                2: ["minutes", this._makeTwoDigitValue(this.data.minutes)]
            };

            for (var data in dataItems)
                ui.time[dataItems[data][0]].text(dataItems[data][1]);
        },

        _initDateTimeDivs: function(ui) {
            if (this.options.showDate && this.options.showTime) {
                ui.main.attr("class", "ui-grid-a");
                if (!this.options.twentyfourHours) {
                    ui.main.attr("class", "ui-grid-b");
                }
            }

            this._initDate(ui);
            this._initTime(ui);
            ui.ampm.text(this._parseAmPmValue(this.data.pm));
        },

        _makeTwoDigitValue: function(val) {
            return ((val < 10 ? "0" : "") + val.toString(10));
        },

        _parseDayHoursMinutes: function(val) {
            return parseInt((val.substring(0, 1) === "0") ? val.substring(1) : val);
        },

        _parseAmPmValue: function(pm) {
            return pm ? this.options.pm : this.options.am;
        },

        _clampHours: function(val) {
            return ((this.options.twentyfourHours) ? val : (((val + 11) % 12) + 1));
        },

        _showDataSelector: function(selector, owner, ui) {
            /* TODO: find out if it'd be better to prepopulate this, or
             * do some caching at least. */
            var obj = this;
            var klass = owner.attr("class");
            var selectorResult = undefined;

            if (klass.search("year") > 0) {
                var values = range(1900, 2100);
                selectorResult = obj._populateSelector(selector, owner,
                    "year", values, parseInt, null, obj.data, "year", ui);
            }
            else
            if (klass.search("month") > 0) {
                selectorResult = obj._populateSelector(selector, owner,
                    "month", obj.options.months,
                    function (month) {
                        var i = 0;
                        for (; obj.options.months[i] != month; i++);
                        return i;
                    },
                    function (index) {
                        return obj.options.months[index];
                    },
                    obj.data, "month", ui);
            }
            else
            if (klass.search("day") > 0) {
                var day = new Date(
                    obj.data.year, obj.data.month + 1, 0).getDate();
                selectorResult = obj._populateSelector(selector, owner,
                    "day", range(1, day), this._parseDayHoursMinutes, null, obj.data,
                    "day", ui);
            }
            else
            if (klass.search("hours") > 0) {
                var values =
                    range(this.options.twentyfourHours ? 0 : 1,
                          this.options.twentyfourHours ? 24 : 12)
                        .map(this._makeTwoDigitValue);
                /* TODO: 12/24 settings should come from the locale */
                selectorResult = obj._populateSelector(selector, owner,
                    "hours", values, this._parseDayHoursMinutes,
                      function(val) { return obj._makeTwoDigitValue(obj._clampHours(val)); },
                    obj.data, "hours", ui);
            }
            else
            if (klass.search("separator") > 0) {
                /* Do nothing. */
            }
            else
            if (klass.search("minutes") > 0) {
                var values = range(0, 59).map(this._makeTwoDigitValue);
                selectorResult = obj._populateSelector(selector, owner,
                    "minutes", values, this._parseDayHoursMinutes, this._makeTwoDigitValue, obj.data,
                    "minutes", ui);
            }
            else
            if (klass.search("ampm") > 0) {
                var values = [this.options.am, this.options.pm];
                selectorResult = obj._populateSelector(selector, owner,
                    "ampm", values,
                    function (val) { return (val !== obj.options.am); },
                    function (index) { return obj.options[index ? "pm" : "am"]; },
                    obj.data, "pm", ui);
            }

            if (selectorResult !== undefined) {
                var totalWidth = 0,
                    widthAtItem = 0,
                    x = 0;

                // slideDown() seems to synchronously make things visible (albeit at height = 0px), so we can actually
                // compute widths/heights below
                selector.slideDown(obj.options.animationDuration);
                obj.state.selectorOut = true;

                // If the @owner has any padding/border/margins, then they are not taken into account. Thus, if you want
                // to space/pad your @owner divs, you should wrap them in other divs which give them
                // padding/borders/margins rather than adding left padding/borders/margins directly. Currently, this
                // happens to work, because the @owner divs have no left border/margin/padding.

                ui.triangle.triangle("option", "offset", owner.offset().left + owner.width() / 2 - ui.triangle.offset().left);

                // Now that all the items have been added to the DOM, let's compute the size of the selector.
                selectorWidth = selector.find(".container").outerWidth();
                selector.find(".item").each(function(idx) {
                    var width = $(this).outerWidth(true);
                    totalWidth += width;
                    if (idx < selectorResult.currentIndex)
                        widthAtItem += width;
                });

                // If the contents doesn't fill the selector, pad it out width empty divs so it's centered
                if (totalWidth < selectorWidth) {
                    var half = (selectorWidth - totalWidth) / 2;

                    selector.find(".item:first").before($("<div/>").css("float", "left").width(half).height(1));
                    selector.find(".item:last" ).after( $("<div/>").css("float", "left").width(half).height(1));
                    totalWidth = selectorWidth;
                }
                // Otherwise, try to center the current item as much as possible
                else {
                    x = (selectorWidth - $(selector.find(".item")[selectorResult.currentIndex]).outerWidth(true)) / 2 - widthAtItem;
                    x = Math.min(0, Math.max(selectorWidth - totalWidth, x));
                }

                selector.find(".view").width(totalWidth);
                selectorResult.scrollable.container.scrollview('scrollTo', x, 0);
            }
        },

        _hideDataSelector: function(selector) {
            var self = this;
            if (this.state.selectorOut) {
                selector.slideUp(this.options.animationDuration,
                    function() {
                      if (self._ui.scrollview !== undefined) {
                          self._ui.scrollview.remove();
                          self._ui.scrollview = undefined;
                      }
                    });
                this.state.selectorOut = false;
            }
        },

        _createScrollableView: function(selectorProto) {
            var container = selectorProto.clone(),
                self = this,
                view = container.find("#datetimepicker-selector-view").removeAttr("id");

            container
                .scrollview({direction: "x"})
                .bind("vclick", function(event) {
                  if (self.panning) {
                      event.preventDefault();
                      event.stopPropagation();
                  }
                })
                .bind("scrollstart", function(event) {
                    self.panning = true;
                })
                .bind("scrollstop", function(event) {
                    self.panning = false;
                });

            return {container: container, view: view};
        },

        _createSelectorItem: function(itemProto, klass) {
            var selector = itemProto.attr("data-" + ($.mobile.ns || "") + "selector");

            itemProto
                .removeAttr("data-" + ($.mobile.ns || "") + "selector")
                .removeAttr("id")
                .addClass(klass);

            return {container: itemProto, link: itemProto.find("a"), selector: selector};
        },

        _updateDate: function(owner, field, value, text) {
            if (field === "month") {
                // From http://www.javascriptkata.com/2007/05/24/how-to-know-if-its-a-leap-year/
                var days = [31,(((new Date(this.data.year,1,29).getDate())===29) ? 29 : 28),31,30,31,30,31,31,30,31,30,31],
                    newDay = Math.min(this.data.day, days[value]);

                if (newDay != this.data.day) {
                    this.data.day = newDay;
                    this._ui.date.day.text(newDay);
                }
            }
            this.data[field] = value;
            owner.text(text);
        },

        _populateSelector: function(selector, owner, klass, values,
                                    parseFromFunc, parseToFunc,
                                    dest, prop, ui) {
            var self = this;
            var obj = this;
            var scrollable = obj._createScrollableView(ui.selectorProto);
            var currentIndex = 0;
            var destValue = ((parseToFunc !== null)
                ? parseToFunc(dest[prop])
                : dest[prop]);

            var i = 0;
            for (; i < values.length; i++) {
                var item = obj._createSelectorItem(ui.itemProto.clone(), klass);
                item.link.bind("vclick", function(e) {
                    if (!self.panning) {
                        self._updateDate(owner, prop, parseFromFunc(this.text), this.text);
                        scrollable.view.find(item.selector).removeClass("current");
                        $(this).toggleClass("current");
                        obj._hideDataSelector(selector);
                        self._setValue(obj.getValue());
                    }
                }).text(values[i]);
                if (values[i] === destValue) {
                    item.link.addClass("current");
                    currentIndex = i;
                }
                scrollable.view.append(item.container);
            }

            if (this._ui.scrollview !== undefined)
                this._ui.scrollview.remove();

            selector.append(scrollable.container);

            this._ui.scrollview = scrollable.container;

            return {scrollable: scrollable, currentIndex: currentIndex};
        },

        _htmlProto: {
source:

$("<div><div id='datetimepicker' class='ui-datetimepicker'>" +
  "    <div class='jquery-mobile-ui-widget datetimepicker-inner-container'>" +
  "        <div id='datetimepicker-header' class='datetimepicker-header'></div>" +
  "        <div id='datetimepicker-main' class='datetimepicker-main'>" +
  "            <div id='datetimepicker-date' class='date ui-grid-b'>" +
  "                <span id='datetimepicker-date-year' class='data year'></span>" +
  "                <span id='datetimepicker-date-month' class='data month'></span>" +
  "                <span id='datetimepicker-date-day' class='data day'></span>" +
  "            </div>" +
  "            <div id='datetimepicker-time' class='time ui-grid-b'>" +
  "                <span id='datetimepicker-time-hours' class='data hours'></span>" +
  "                <span id='datetimepicker-time-separator' class='data separator'></span>" +
  "                <span id='datetimepicker-time-minutes' class='data minutes'></span>" +
  "            </div>" +
  "            <div class='ampm'>" +
  "                <span id='datetimepicker-ampm-span' class='data ampm'></span>" +
  "            </div>" +
  "        </div>" +
  "        <div id='datetimepicker-selector' class='selector'>" +
  "            <div id='datetimepicker-selector-triangle' class='selector-triangle'></div>" +
  "            <div id='datetimepicker-selector-container' class='container container-years' data-scroll='x'>" +
  "                <div id='datetimepicker-selector-view' class='view'>" +
  "                    <div id='datetimepicker-item' class='item' data-selector='.item a'>" +
  "                        <a href='#'></a>" +
  "                    </div>" +
  "                </div>" +
  "            </div>" +
  "        </div>" +
  "    </div>" +
  "</div>" +
  "</div>")
,            ui: {
                container: "#datetimepicker",
                selector: "#datetimepicker-selector",
                triangle: "#datetimepicker-selector-triangle",
                selectorProto: "#datetimepicker-selector-container",
                itemProto: "#datetimepicker-item",
                header: "#datetimepicker-header",
                main: "#datetimepicker-main",
                date: {
                    main: "#datetimepicker-date",
                    year: "#datetimepicker-date-year",
                    month: "#datetimepicker-date-month",
                    day: "#datetimepicker-date-day"
                },
                time: {
                    main: "#datetimepicker-time",
                    hours: "#datetimepicker-time-hours",
                    separator: "#datetimepicker-time-separator",
                    minutes: "#datetimepicker-time-minutes"
                },
                ampm: "#datetimepicker-ampm-span"
            }
        },

        _value: {
            attr: "data-" + ($.mobile.ns || "") + "date",
            signal: "date-changed"
        },

        _create: function() {
            var self = this;
            this._ui.selectorProto.remove();
            this._ui.itemProto.remove();

            $.extend ( this, {
                panning: false,
                data : {
                    parentInput: 0,

                    year: 0,
                    month: 0,
                    day: 0,

                    hours: 0,
                    minutes: 0,
                    pm: false
                },

                state : {
                    selectorOut: false
                }
            });

            var obj = this;
            var input = this.element;

            $(input).css("display", "none");
            $(input).after(this._ui.container);
            this._ui.triangle.triangle({extraClass : "selector-triangle-color"});
            this.data.parentInput = input;

            // We must display either time or date: if the user set both to
            // false, we override that.
            if (!this.options.showDate && !this.options.showTime) {
                this.options.showDate = true;
            }

            this._initDateTime();

            this._ui.header.text(this.options.header);

            this._initDateTimeDivs(this._ui);

            this._ui.container.bind("vclick", function () {
                obj._hideDataSelector(self._ui.selector);
            });

            this._ui.main.find(".data").each(function() {
                $(this).bind("vclick", function(e) {
                    obj._showDataSelector(self._ui.selector, $(this), self._ui);
                    e.stopPropagation();
                });
            });
        },

        getValue: function() {
            var actualHours = this._clampHours(this.data.hours);
            if (actualHours === 12 && !this.data.pm)
                actualHours = 0;
            else
            if (actualHours < 12 && this.data.pm)
                actualHours += 12;
            return new Date(this.data.year,
                            this.data.month,
                            this.data.day,
                            actualHours,
                            this.data.minutes);
        }
    }); /* End of widget */

    $(document).bind("pagecreate create", function(e) {
        $($.todons.datetimepicker.prototype.options.initSelector, e.target)
            .not(":jqmData(role='none'), :jqmData(role='nojs')")
            .datetimepicker();
    });

})(jQuery, this);
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

function range (low, high, step) {
    // Create an array containing the range of integers or characters
    // from low to high (inclusive)  
    // 
    // version: 1107.2516
    // discuss at: http://phpjs.org/functions/range
    // +   original by: Waldo Malqui Silva
    // *     example 1: range ( 0, 12 );
    // *     returns 1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    // *     example 2: range( 0, 100, 10 );
    // *     returns 2: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    // *     example 3: range( 'a', 'i' );
    // *     returns 3: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
    // *     example 4: range( 'c', 'a' );
    // *     returns 4: ['c', 'b', 'a']
    var matrix = [];
    var inival, endval, plus;
    var walker = step || 1;
    var chars = false;
 
    if (!isNaN(low) && !isNaN(high)) {
        inival = low;
        endval = high;
    } else if (isNaN(low) && isNaN(high)) {
        chars = true;
        inival = low.charCodeAt(0);
        endval = high.charCodeAt(0);
    } else {
        inival = (isNaN(low) ? 0 : low);
        endval = (isNaN(high) ? 0 : high);
    }
 
    plus = ((inival > endval) ? false : true);
    if (plus) {
        while (inival <= endval) {
            matrix.push(((chars) ? String.fromCharCode(inival) : inival));
            inival += walker;
        }
    } else {
        while (inival >= endval) {
            matrix.push(((chars) ? String.fromCharCode(inival) : inival));
            inival -= walker;
        }
    }
 
    return matrix;
}

/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Rijubrata Bhaumik <rijubrata.bhaumik@intel.com>
 *          Elliot Smith <elliot.smith@intel.com>
 */

// Displays a day selector element: a control group with 7 check
// boxes which can be toggled on and off.
//
// The widget can be invoked on fieldset element with
// $(element).dayselector() or by creating a fieldset element with
// data-role="dayselector". If you try to apply it to an element
// of type other than fieldset, results will be unpredictable.
//
// The default is to display the controlgroup horizontally; you can
// override this by setting data-type="vertical" on the fieldset,
// or by passing a type option to the constructor. The data-type
// attribute has precedence.
//
// If no ID is supplied for the dayselector, one will be generated
// automatically.
//
// Methods:
//
//     value: Return the day numbers (0=Sunday, ..., 6=Saturday) of
//            the selected checkboxes as an array.
//
//     selectAll: Select all 7 days of the week by automatically "ticking"
//                all of the checkboxes.
//
// Options:
//
//     theme : Override the data-theme of the widget; note that the
//             order of preference is: 1) set from data-theme attribute;
//             2) set from option; 3) set from closest parent data-theme;
//             4) default to 'c'
//
//     type: 'horizontal' (default) or 'vertical'; specifies the type
//           of controlgroup to create around the day check boxes.
//
//     days: array of day names, Sunday first; defaults to English day
//           names; the first letters are used as text for the checkboxes

(function ($, window, undefined) {
    $.widget("todons.dayselector", $.mobile.widget, {
        options: {
            initSelector: 'fieldset:jqmData(role="dayselector")',
            theme: null,
            type: 'horizontal',
            days: ['Sunday',
                   'Monday',
                   'Tuesday',
                   'Wednesday',
                   'Thursday',
                   'Friday',
                   'Saturday']
        },

        defaultTheme: 'c',

        _create: function () {
            this.element.addClass('ui-dayselector');

            this.options.type = this.element.jqmData('type') || this.options.type;

            this.options.theme = this.element.jqmData('theme') ||
                                 this.options.theme ||
                                 this.element.closest(':jqmData(theme)').jqmData('theme')
                                 this.defaultTheme;

            var days = this.options.days;

            this.element.attr('data-' + $.mobile.ns + 'type', this.options.type);

            var parentId = this.element.attr('id') ||
                           'dayselector' + (new Date()).getTime();

            for (var i = 0; i < days.length; i++) {
                var day = days[i];
                var letter = day.slice(0, 1);
                var id = parentId + '_' + i;
                var labelClass = 'ui-dayselector-label-' + i;

                var checkbox = $('<input type="checkbox"/>')
                               .attr('id', id)
                               .attr('value', i);

                var label = $('<label>' + letter + '</label>')
                            .attr('for', id)
                            .addClass(labelClass);

                this.element.append(checkbox);
                this.element.append(label);
            }

            this.checkboxes = this.element.find(':checkbox')
                                          .checkboxradio({theme: this.options.theme});

            this.element.controlgroup({excludeInvisible: false});
        },

        value: function () {
            var values = this.checkboxes.filter(':checked').map(function () {
                return this.value;
            }).get();

            return values;
        },

        selectAll: function () {
            this.checkboxes.attr('checked', 'checked')
                           .checkboxradio('refresh');
        }

    }); /* End of Widget */

    // auto self-init widgets
    $(document).bind("pagebeforecreate", function (e) {
        var elts = $($.todons.dayselector.prototype.options.initSelector, e.target);
        elts.not(":jqmData(role='none'), :jqmData(role='nojs')").dayselector();
    });

})(jQuery, this);
/*
 * jQuery Mobile Widget @VERSION
 *
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Salvatore Iovene <salvatore.iovene@intel.com>
 */

// An Expandable is a list item controller, which makes a list
// item act like the header of a pop-down container.
//
// To apply, add the attribute data-expandable="true" to list item
// (a <li> element inside a list). Alternatively, call
// expandable() on an element.
//
// The next list element with data-role="expandable-content" is hidden,
// and then its visibility is toggled with an animation when the
// previous <li> is clicked.

(function( $, undefined ) {

$.widget( "todons.expandable", $.mobile.widget, {
    options: {
        initSelector: ":jqmData(expandable)",
        contentSelector: ':jqmData(role="expandable-content")'
    },

    _toggleIcon: function(el) {
        if (el.hasClass('ui-icon-arrow-d')) {
            el.removeClass('ui-icon-arrow-d').addClass('ui-icon-arrow-u');
        } else if (el.hasClass('ui-icon-arrow-u')) {
            el.removeClass('ui-icon-arrow-u').addClass('ui-icon-arrow-d');
        }
    },

    _create: function () {
        var el = this.element,
            self = this,
            icon = el.find('span.ui-icon'),
            expandable_content = el.next(self.options.contentSelector);

        icon.removeClass('ui-icon-arrow-r')
            .addClass('ui-icon-arrow-d');
        expandable_content.hide();
        el.bind('vclick', function() {
            expandable_content.toggle('fast', 'swing');
            self._toggleIcon(icon);
        });
    }
});

$(document).bind( "pagecreate create", function (e) {
    $($.todons.expandable.prototype.options.initSelector, e.target)
    .not(":jqmData(role='none'), :jqmData(role='nojs')")
    .expandable();
});

})( jQuery );
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 */

// Displays three sliders that allow the user to select the
// hue, saturation, and value for a color.
//
// To apply, add the attribute data-role="hsvpicker" to a <div>
// element inside a page. Alternatively, call hsvpicker() 
// on an element (see below).
//
// Options:
//
//     color: String; the initial color can be specified in html using the
//            data-color="#ff00ff" attribute or when constructed
//            in javascript, eg
//                $("#myhsvpicker").hsvpicker({ color: "#ff00ff" });
//            where the html might be :
//                <div id="myhsvpicker"></div>
//            The color can be changed post-construction like this :
//                $("#myhsvpicker").hsvpicker("option", "color", "#ABCDEF");
//            Default: "#1a8039"
//
// Events:
//
//     colorchanged: Fired when the color is changed.

(function( $, undefined ) {

$.widget( "todons.hsvpicker", $.todons.colorwidget, {
    options: {
        initSelector: ":jqmData(role='hsvpicker')"
    },

    _htmlProto: {
source:

$("<div><div id='hsvpicker' class='ui-hsvpicker'>" +
  "    <div class='hsvpicker-clrchannel-container jquery-mobile-ui-widget'>" +
  "        <div class='hsvpicker-arrow-btn-container'>" +
  "            <a href='#' class='hsvpicker-arrow-btn' data-target='hue' data-location='left' data-inline='true' data-iconpos='notext' data-icon='arrow-l'></a>" +
  "        </div>" +
  "        <div class='hsvpicker-clrchannel-masks-container'>" +
  "            <div class='hsvpicker-clrchannel-mask hsvpicker-clrchannel-mask-white'></div>" +
  "            <div id='hsvpicker-hue-hue' class='hsvpicker-clrchannel-mask jquery-todons-colorwidget-clrlib-hue-gradient'></div>" +
  "            <div id='hsvpicker-hue-mask-val' class='hsvpicker-clrchannel-mask hsvpicker-clrchannel-mask-black' data-event-source='hue'></div>" +
  "            <div id='hsvpicker-hue-selector' class='hsvpicker-clrchannel-selector ui-corner-all'></div>" +
  "        </div>" +
  "        <div class='hsvpicker-arrow-btn-container'>" +
  "            <a href='#' class='hsvpicker-arrow-btn' data-target='hue' data-location='right' data-inline='true' data-iconpos='notext' data-icon='arrow-r'></a>" +
  "        </div>" +
  "    </div>" +
  "    <div class='hsvpicker-clrchannel-container jquery-mobile-ui-widget'>" +
  "        <div class='hsvpicker-arrow-btn-container'>" +
  "            <a href='#' class='hsvpicker-arrow-btn' data-target='sat' data-location='left' data-inline='true' data-iconpos='notext' data-icon='arrow-l'></a>" +
  "        </div>" +
  "        <div class='hsvpicker-clrchannel-masks-container'>" +
  "            <div id='hsvpicker-sat-hue' class='hsvpicker-clrchannel-mask'></div>" +
  "            <div id='hsvpicker-sat-gradient' class='hsvpicker-clrchannel-mask  sat-gradient'></div>" +
  "            <div id='hsvpicker-sat-mask-val' class='hsvpicker-clrchannel-mask hsvpicker-clrchannel-mask-black' data-event-source='sat'></div>" +
  "            <div id='hsvpicker-sat-selector' class='hsvpicker-clrchannel-selector ui-corner-all'></div>" +
  "        </div>" +
  "        <div class='hsvpicker-arrow-btn-container'>" +
  "            <a href='#' class='hsvpicker-arrow-btn' data-target='sat' data-location='right' data-inline='true' data-iconpos='notext' data-icon='arrow-r'></a>" +
  "        </div>" +
  "    </div>" +
  "    <div class='hsvpicker-clrchannel-container jquery-mobile-ui-widget'>" +
  "        <div class='hsvpicker-arrow-btn-container'>" +
  "            <a href='#' class='hsvpicker-arrow-btn' data-target='val' data-location='left' data-inline='true' data-iconpos='notext' data-icon='arrow-l'></a>" +
  "        </div>" +
  "        <div class='hsvpicker-clrchannel-masks-container'>" +
  "            <div class='hsvpicker-clrchannel-mask hsvpicker-clrchannel-mask-white'></div>" +
  "            <div id='hsvpicker-val-hue' class='hsvpicker-clrchannel-mask'></div>" +
  "            <div id='hsvpicker-val-gradient' class='hsvpicker-clrchannel-mask val-gradient' data-event-source='val'></div>" +
  "            <div id='hsvpicker-val-selector' class='hsvpicker-clrchannel-selector ui-corner-all'></div>" +
  "        </div>" +
  "        <div class='hsvpicker-arrow-btn-container'>" +
  "            <a href='#' class='hsvpicker-arrow-btn' data-target='val' data-location='right' data-inline='true' data-iconpos='notext' data-icon='arrow-r'></a>" +
  "        </div>" +
  "    </div>" +
  "</div>" +
  "</div>")
,        ui: {
            container: "#hsvpicker",
            hue: {
                eventSource: "[data-event-source='hue']",
                selector:    "#hsvpicker-hue-selector",
                hue:         "#hsvpicker-hue-hue",
                valMask:     "#hsvpicker-hue-mask-val"
            },
            sat: {
                gradient:    "#hsvpicker-sat-gradient",
                eventSource: "[data-event-source='sat']",
                selector:    "#hsvpicker-sat-selector",
                hue:         "#hsvpicker-sat-hue",
                valMask:     "#hsvpicker-sat-mask-val"
            },
            val: {
                gradient:    "#hsvpicker-val-gradient",
                eventSource: "[data-event-source='val']",
                selector:    "#hsvpicker-val-selector",
                hue:         "#hsvpicker-val-hue"
            }
        }
    },

    _create: function() {
        var self = this;

        this.element.append(this._ui.container);
        // Crutches for IE: it uses the filter css property, and if the background is also set, the transparency goes bye-bye
        if ($.mobile.browser.ie) {
            this._ui.sat.gradient.css("background", "none");
            this._ui.val.gradient.css("background", "none");
            this._ui.hue.hue.css("background", "none");
            $.todons.colorwidget.hueGradient(this._ui.hue.hue);
        }

        $.extend(this, {
            dragging_hsv: [ 0, 0, 0],
            selectorDraggingOffset: {
                x : -1,
                y : -1
            },
            dragging: -1
        });

        this._ui.container.find(".hsvpicker-arrow-btn")
            .buttonMarkup()
            .bind("vclick", function(e) {
                var chan = $(this).attr("data-" + ($.mobile.ns || "") + "target"),
                    hsvIdx = ("hue" === chan) ? 0 :
                             ("sat" === chan) ? 1 : 2,
                    max = (0 == hsvIdx ? 360 : 1),
                    step = 0.05 * max;

                self.dragging_hsv[hsvIdx] = self.dragging_hsv[hsvIdx] + step * ("left" === $(this).attr("data-" + ($.mobile.ns || "") + "location") ? -1 : 1);
                self.dragging_hsv[hsvIdx] = Math.min(max, Math.max(0.0, self.dragging_hsv[hsvIdx]));
                self._updateSelectors(self.dragging_hsv);
            });

        $( document )
            .bind( "vmousemove", function( event ) {
                if ( self.dragging != -1 ) {
                    event.stopPropagation();
                    event.preventDefault();
                }
            })
            .bind( "vmouseup", function( event ) {
                self.dragging = -1;
            });

        this._bindElements("hue", 0);
        this._bindElements("sat", 1);
        this._bindElements("val", 2);
    },

    _bindElements: function(chan, idx) {
        var self = this;
        this._ui[chan].selector
            .bind("mousedown vmousedown", function(e) { self._handleMouseDown(chan, idx, e, true); })
            .bind("vmousemove touchmove", function(e) { self._handleMouseMove(chan, idx, e, true); })
            .bind("vmouseup",             function(e) { self.dragging = -1; });
        this._ui[chan].eventSource
            .bind("mousedown vmousedown", function(e) { self._handleMouseDown(chan, idx, e, false); })
            .bind("vmousemove touchmove", function(e) { self._handleMouseMove(chan, idx, e, false); })
            .bind("vmouseup",             function(e) { self.dragging = -1; });
    },

    _handleMouseDown: function(chan, idx, e, isSelector) {
        var coords = $.mobile.todons.targetRelativeCoordsFromEvent(e),
            widgetStr = (isSelector ? "selector" : "eventSource");

        if (coords.x >= 0 && coords.x <= this._ui[chan][widgetStr].outerWidth() &&
            coords.y >= 0 && coords.y <= this._ui[chan][widgetStr].outerHeight()) {

            this.dragging = idx;

            if (isSelector) {
                this.selectorDraggingOffset.x = coords.x;
                this.selectorDraggingOffset.y = coords.y;
            }

            this._handleMouseMove(chan, idx, e, isSelector, coords);
        }
    },

    _handleMouseMove: function(chan, idx, e, isSelector, coords) {
        if (this.dragging === idx) {
            coords = (coords || $.mobile.todons.targetRelativeCoordsFromEvent(e));

            var factor = ((0 === idx) ? 360 : 1),
                potential = (isSelector
                  ? ((this.dragging_hsv[idx] / factor) +
                     ((coords.x - this.selectorDraggingOffset.x) / this._ui[chan].eventSource.width()))
                  : (coords.x / this._ui[chan].eventSource.width()));

            this.dragging_hsv[idx] = Math.min(1.0, Math.max(0.0, potential)) * factor;

            if (!isSelector) {
                this.selectorDraggingOffset.x = Math.ceil(this._ui[chan].selector.outerWidth()  / 2.0);
                this.selectorDraggingOffset.y = Math.ceil(this._ui[chan].selector.outerHeight() / 2.0);
            }

            this._updateSelectors(this.dragging_hsv);
            e.stopPropagation();
            e.preventDefault();
        }
    },

    _updateSelectors: function(hsv) {
        var  clr = $.todons.colorwidget.clrlib.RGBToHTML($.todons.colorwidget.clrlib.HSVToRGB(hsv)),
            hclr = $.todons.colorwidget.clrlib.RGBToHTML($.todons.colorwidget.clrlib.HSVToRGB([hsv[0], 1.0, 1.0])),
            vclr = $.todons.colorwidget.clrlib.RGBToHTML($.todons.colorwidget.clrlib.HSVToRGB([hsv[0], hsv[1], 1.0]));

        this._ui.hue.selector.css({ left : this._ui.hue.eventSource.width() * hsv[0] / 360, background : clr });
        if ($.mobile.browser.ie)
            this._ui.hue.hue.find("*").css("opacity", hsv[1]);
        else
            this._ui.hue.hue.css("opacity", hsv[1]);
        this._ui.hue.valMask.css("opacity", 1.0 - hsv[2]);

        this._ui.sat.selector.css({ left : this._ui.sat.eventSource.width() * hsv[1],       background : clr });
        this._ui.sat.hue.css("background", hclr);
        this._ui.sat.valMask.css("opacity", 1.0 - hsv[2]);

        this._ui.val.selector.css({ left : this._ui.val.eventSource.width() * hsv[2],       background : clr });
        this._ui.val.hue.css("background", vclr);

        $.todons.colorwidget.prototype._setColor.call(this, clr);
    },

    _setColor: function(clr) {
        if ($.todons.colorwidget.prototype._setColor.call(this, clr)) {
            this.dragging_hsv = $.todons.colorwidget.clrlib.RGBToHSV($.todons.colorwidget.clrlib.HTMLToRGB(clr));
            this._updateSelectors(this.dragging_hsv);
        }
    }
});

$(document).bind("pagecreate create", function(e) {
    $($.todons.hsvpicker.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .hsvpicker();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// Horizontal/vertical box layout extension.
//
// This will arrange the child elements of a container in a horizontal
// or vertical row. This only makes sense if your container is a div
// and contains children which are also divs; the children should
// also have a height and width set in CSS, otherwise the layout
// manager won't know what to do with them.
//
// Apply it by setting data-layout="hbox" or data-layout="vbox" (vertical
// on a container element or calling $(element).layouthbox() or
// $(element).layoutvbox().
//
// Usually, you would use a div as the container to get the right effect
// (an element with display:block).
//
// Options can be set programmatically:
//
//   $(element).layouthbox('option', 'scrollable', false)
//   $(element).layoutvbox('option', 'scrollable', false)
//
// or via a data-layout-options attribute on the container:
//
//   <div data-layout="hbox" data-layout-options='{"hgap":5}'>
//       <div>child 1</div>
//       <div>child 2</div>
//   </div>
//
//   <div data-layout="vbox" data-layout-options='{"vgap":5}'>
//       <div>child 1</div>
//       <div>child 2</div>
//   </div>
//
// If you change any options after creating the widget, call
// $(element).layout*box('refresh') to have them picked up.
// However, note that it's currently not feasible to turn off scrolling
// once it's on (as calling scrollview('destroy') doesn't remove the
// scrollview custom mouse handlers).
//
// There is one major difference between the horizontal and
// vertical box layouts: if scrollable=false, the horizontal layout
// will clip children which overflow the edge of the parent container;
// by comparison, the vertical container will grow vertically to
// accommodate the height of its children. This mirrors the behaviour
// of jQuery Mobile, where elements only ever expand horizontally
// to fill the width of the window; but will expand vertically forever,
// unless the page height is artificially constrained.
//
// Options:
//
//   {Integer} hgap (default=0)
//   Horizontal gap (in pixels) between the child elements. Only has
//   an effect on hbox.
//
//   {Integer} vgap (default=0)
//   Vertical gap (in pixels) between the child elements. Only has
//   an effect on vbox.
//
//   {Boolean} scrollable (default=true; can only be set at create time)
//   Set to true to enable a scrollview on the
//   container. If false, children will be clipped if
//   they fall outside the edges of the container after
//   layouting.
//
//   {Boolean} showScrollBars (default=true)
//   Set to false to hide scrollbars on the container's scrollview.
//   Has no effect is scrollable=false

(function ($, undefined) {

// hbox
$.widget("todons.layouthbox", $.todons.jlayoutadaptor, {
    fixed: {
        type: 'flexGrid',
        rows: 1,
        direction: 'x',
        initSelector: ':jqmData(layout="hbox")'
    },

    _create: function () {
        if (!this.options.hgap) {
            this.options.hgap = 0;
        }

        $.todons.jlayoutadaptor.prototype._create.apply(this, arguments);
    }
});

$(document).bind("pagecreate", function (e) {
    $($.todons.layouthbox.prototype.fixed.initSelector, e.target)
    .not(":jqmData(role='none'), :jqmData(role='nojs')")
    .layouthbox();
});

// vbox
$.widget("todons.layoutvbox", $.todons.jlayoutadaptor, {
    fixed: {
        type: 'flexGrid',
        columns: 1,
        direction: 'y',
        initSelector: ':jqmData(layout="vbox")'
    },

    _create: function () {
        if (!this.options.vgap) {
            this.options.vgap = 0;
        }

        $.todons.jlayoutadaptor.prototype._create.apply(this, arguments);
    }
});

$(document).bind("pagecreate", function (e) {
    $($.todons.layoutvbox.prototype.fixed.initSelector, e.target)
    .not(":jqmData(role='none'), :jqmData(role='nojs')")
    .layoutvbox();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION - listview controls
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// This extension supplies API to toggle the "mode" in which a list
// is displayed. The modes available is configurable, but defaults
// to ['edit', 'view']. A list can also have a control panel associated
// with it. The visibility of the control panel is governed by the current
// mode (by default, it is visible in 'edit' mode); elements within
// the listview can also be marked up to be visible in one or more of the
// available modes.
//
// One example use case would be a control panel with a "Select all" checkbox
// which, when clicked, selects all of the checkboxes in the associated
// listview items.
//
// The control panel itself should be defined as a form element.
// By default, the control panel will be hidden when the listview is
// initialised, unless you supply mode="edit" as a
// data-listview-controls option (when using the default modes). If you
// want the control panel to be visible in some mode other than
// the default, use a data-listviewcontrols-show-in="<mode>" attribute
// on the control panel element.
//
// Example usage (using the default 'edit' and 'view' modes):
//
// <!-- this is the controls element, displayed in 'edit' mode by default -->
// <form id="listviewcontrols-control-panel">
//   <fieldset data-role="controlgroup">
//     <input type="checkbox" id="listviewcontrols-demo-checkbox-uber" />
//     <label for="listviewcontrols-demo-checkbox-uber">Select all</label>
//   </fieldset>
// </form>
//
// <!-- this is the list associated with the controls -->
// <ul data-role="listview" data-listviewcontrols="#listviewcontrols-control-panel">
//
//   <li>
//
//     <!-- this element is only visible in 'edit' mode -->
//     <fieldset data-role="controlgroup" data-listviewcontrols-show-in="edit">
//       <input type="checkbox" id="listviewcontrols-demo-checkbox-1" />
//       <label for="listviewcontrols-demo-checkbox-1">Greg</label>
//     </fieldset>
//
//     <!-- this element is only visible in 'view' mode -->
//     <span data-listviewcontrols-show-in="view">Greg</span>
//
//   </li>
//
//   ... more li elements marked up the same way ...
//
// </ul>
//
// To associate the listview with the control panel, add
// data-listviewcontrols="..selector.." to a listview, where
// selector selects a single element (the control panel
// you defined). You can then call
// listviewcontrols('option', 'mode', '<mode>') on the
// listview to set the mode.
//
// Inside the listview's items, add controls to each item
// which are only visible when in one of the modes. To do this,
// add form elements (e.g. checkboxes) to the items as you see fit. Then,
// mark each form element with data-listviewcontrols-show-in="<mode>".
// The control's visibility now depends on the mode of the listviewcontrols:
// it is only shown when its <mode> setting matches the current mode
// of the listviewcontrols widget. You are responsible for properly
// styling the form elements inside the listview so the listview looks
// correct when they are hidden or visible.
//
// The control panel (by default, visible when in "show" mode) is flexible
// and can contain any valid form elements (or other jqm components). It's
// up to you to define the behaviour associated with interactions on
// the control panel and/or controls inside list items.
//
// Methods:
//
//   visibleListItems
//     Returns a jQuery object containing all the li elements in the
//     listview which are currently visible and not dividers. (This
//     is just a convenience to make operating on the list as a whole
//     slightly simpler.)
//
// Options (set in options hash passed to constructor, or via the
// option method, or declaratively by attribute described below):
//
//   controlPanelSelector {String}
//     Selector string for selecting the element representing the
//     control panel for the listview. The context for find() is the
//     document (to give the most flexibility), so your selector
//     should be specific. Set declaratively with
//       data-listviewcontrols="...selector...".
//
//   modesAvailable {String[]; default=['edit', 'view']}
//     An array of the modes available for these controls.
//
//   mode {String; default='view'}
//     Current mode for the widget, which governs the visibility
//     of the listview control panel and any elements marked
//     with data-listviewcontrols-show-in="<mode>".
//     Set declaratively with
//       data-listviewcontrols-options='{"mode":"<mode>"}'.
//
//   controlPanelShowIn {String; default=modesAvailable[0]}
//     The mode in which the control panel is visible; defaults to the
//     first element of modesAvailable. Can be set declaratively
//     on the listview controls element with
//       data-listviewcontrols-show-in="<mode>"

(function ($) {

$.widget("todons.listviewcontrols", $.mobile.widget, {
    _defaults: {
        controlPanelSelector: null,
        modesAvailable: ['edit', 'view'],
        mode: 'view',
        controlPanelShowIn: null
    },

    _listviewCssClass: 'ui-listviewcontrols-listview',
    _controlsCssClass: 'ui-listviewcontrols-panel',

    _create: function () {
        var self = this,
            o = this.options,
            optionsValid = true,
            page = this.element.closest('.ui-page'),
            controlPanelSelectorAttr = 'data-' + $.mobile.ns + 'listviewcontrols',
            controlPanelSelector = this.element.attr(controlPanelSelectorAttr),
            dataOptions = this.element.jqmData('listviewcontrols-options'),
            controlPanelShowInAttr;

        o.controlPanelSelector = o.controlPanelSelector || controlPanelSelector;

        // precedence for options: defaults < jqmData attribute < options arg
        o = $.extend({}, this._defaults, dataOptions, o);

        optionsValid = (this._validOption('modesAvailable', o.modesAvailable, o) &&
                        this._validOption('controlPanelSelector', o.controlPanelSelector, o) &&
                        this._validOption('mode', o.mode, o));

        if (!optionsValid) {
            return false;
        }

        // get the controls element
        this.controlPanel = $(document).find(o.controlPanelSelector).first();

        if (this.controlPanel.length === 0) {
            return false;
        }

        // once we have the controls element, we may need to override the
        // mode in which controls are shown
        controlPanelShowInAttr = this.controlPanel.jqmData('listviewcontrols-show-in');
        if (controlPanelShowInAttr) {
            o.controlPanelShowIn = controlPanelShowInAttr;
        }
        else if (!o.controlPanelShowIn) {
            o.controlPanelShowIn = o.modesAvailable[0];
        }

        if (!this._validOption('controlPanelShowIn', o.controlPanelShowIn, o)) {
            return;
        }

        // done setting options
        this.options = o;

        // mark the controls and the list with a class
        this.element.removeClass(this._listviewCssClass).addClass(this._listviewCssClass);
        this.controlPanel.removeClass(this._controlsCssClass).addClass(this._controlsCssClass);

        // show the widget
        if (page && !page.is(':visible')) {
            page.bind('pageshow', function () { self.refresh(); });
        }
        else {
            this.refresh();
        }
    },

    _validOption: function (varName, value, otherOptions) {
        var ok = false;

        if (varName === 'mode') {
            ok = ($.inArray(value, otherOptions.modesAvailable) >= 0);
        }
        else if (varName === 'controlPanelSelector') {
            ok = ($.type(value) === 'string');
        }
        else if (varName === 'modesAvailable') {
            ok = ($.isArray(value) && value.length > 1);

            if (ok) {
                for (var i = 0; i < value.length; i++) {
                    if (value[i] === '' || $.type(value[i]) !== 'string') {
                        ok = false;
                    }
                }
            }
        }
        else if (varName === 'controlPanelShowIn') {
            ok = ($.inArray(value, otherOptions.modesAvailable) >= 0);
        }

        return ok;
    },

    _setOption: function (varName, value) {
        var oldValue = this.options[varName];

        if (oldValue !== value && this._validOption(varName, value, this.options)) {
            this.options[varName] = value;
            this.refresh();
        }
    },

    visibleListItems: function () {
        return this.element.find('li:not(:jqmData(role=list-divider)):visible');
    },

    refresh: function () {
        var self = this,
            triggerUpdateLayout = false,
            isVisible = null,
            showIn,
            modalElements;

        // hide/show the control panel and hide/show controls inside
        // list items based on their "show-in" option
        isVisible = this.controlPanel.is(':visible');

        if (this.options.mode === this.options.controlPanelShowIn) {
            this.controlPanel.show();
        }
        else {
            this.controlPanel.hide();
        }

        if (this.controlPanel.is(':visible') !== isVisible) {
            triggerUpdateLayout = true;
        }

        // we only operate on elements inside list items which aren't dividers
        modalElements = this.element.find('li:not(:jqmData(role=list-divider))')
                                    .find(':jqmData(listviewcontrols-show-in)');

        modalElements.each(function () {
            showIn = $(this).jqmData('listviewcontrols-show-in');

            isVisible = $(this).is(':visible');

            if (showIn === self.options.mode) {
                $(this).show();
            }
            else {
                $(this).hide();
            }

            if ($(this).is(':visible') !== isVisible) {
                triggerUpdateLayout = true;
            }
        });

        if (triggerUpdateLayout) {
            this.element.trigger('updatelayout');
        }
    }
});

$('ul').live('listviewcreate', function () {
	var list = $(this);

	if (list.is(':jqmData(listviewcontrols)')) {
		list.listviewcontrols();
	}
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// optionheader provides a collapsible toolbar for buttons and
// segmented controls directly under the title bar. It
// wraps a jQuery Mobile grid in a collapsible container; clicking
// on the container, or on one of the buttons inside the container,
// will collapse it.
//
// To add an option header to a page, mark up the header with a
// data-role="optionheader" attribute, as shown in this example:
//
// <div data-role="header">
//     <h1>Option header - 3 buttons example</h1>
//     <div data-role="optionheader">
//        <div class="ui-grid-b">
//             <div class="ui-block-a"><a data-role="button">Previous</a></div>
//             <div class="ui-block-b"><a data-role="button">Cancel</a></div>
//             <div class="ui-block-c"><a data-role="button">Next</a></div>
//        </div>
//     </div>
// </div>
//
// The optionheader can also be used inline (e.g. in a content block or
// a widget).
//
// Alternatively, use $('...').optionheader() to apply programmatically.
//
// The grid inside the optionheader should be marked up as for
// a standard jQuery Mobile grid. (The widget has been tested with one
// or two rows of 2-4 columns each.)
//
// Note that if you use this with fixed headers, you may find that
// expanding the option header increases the page size so that scrollbars
// appear (jQuery Mobile's own collapsible content areas cause the
// same issue). You can alleviate this somewhat by calling the show() method
// on the page toolbars each time the size of the header changes.
//
// The widget is configurable via a data-options attribute on the same
// div as the data-role="optionheader" attribute, e.g.
//
// <div data-role="header">
//     <h1>Option header - configured</h1>
//     <div data-role="optionheader" data-options='{"collapsed":true, "duration":1.5}'>
//        <div class="ui-grid-b">
//             <div class="ui-block-a"><a data-role="button">Previous</a></div>
//             <div class="ui-block-b"><a data-role="button">Cancel</a></div>
//             <div class="ui-block-c"><a data-role="button">Next</a></div>
//        </div>
//     </div>
// </div>
//
// Options can also be set with $(...).optionheader('option', 'name', value).
// However, if you do this, you'll need to call $(...).optionheader('refresh')
// afterwards for the new values to take effect (note that optionheader()
// can be applied multiple times to an element without side effects).
//
// See below for the available options.
//
// Theme: by default, gets a 'b' swatch; override with data-theme="X"
// as per usual
//
// Options (can be set with a data-options attribute):
//
//   {Boolean} [showIndicator=true] Set to true (the default) to show
//   the upward-pointing arrow indicator on top of the title bar.
//   {Boolean} [startCollapsed=false] Sets the appearance when the option
//   header is first displayed; defaults to false (i.e. show the header
//   expanded on first draw). NB setting this option later has no
//   effect: use collapse() to collapse a widget which is already
//   drawn.
//   {Boolean} [expandable=true] Sets whether the header will expand
//   in response to clicks; default = true.
//   {Float} [duration=0.25] Duration of the expand/collapse animation.
//
// Methods (see below for docs):
//
//   toggle(options)
//   expand(options)
//   collapse(options)
//
// Events:
//
//   expand: Triggered when the option header is expanded
//   collapse: Triggered when the option header is collapsed
//

(function($, undefined) {

$.widget("todons.optionheader", $.todons.widgetex, {
    options: {
        initSelector: ":jqmData(role='optionheader')",
        showIndicator: true,
        theme: 'b',
        startCollapsed: false,
        expandable: true,
        duration: 0.25
    },

    collapsedHeight: '5px',

    _create: function () {
        var theme,
            self = this,
            parentPage,
            dataOptions = this.element.jqmData('options');

        // parse data-options
        $.extend(this.options, dataOptions);

        this.isCollapsed = false;
        this.expandedHeight = null;

        // parse data-theme and reset options.theme if it's present
        theme = this.element.jqmData('theme') || this.options.theme;
        this.options.theme = theme;

        // set up the click handler; it's done here so it can
        // easily be removed, as there should only be one instance
        // of the handler function for each class instance
        this.clickHandler = function () {
            self.toggle();
        };

        // get the element's dimensions
        // and to set its initial collapse state;
        // either do it now (if the page is visible already)
        // or on pageshow
        page = this.element.closest(':jqmData(role="page")');

        this.refresh();
    },

    _realize: function () {
        if (!this.expandedHeight) {
            this.expandedHeight = this.element.height();
        }

        if (this.options.startCollapsed) {
            this.collapse({duration: 0});
        }
    },

    // Draw the option header, according to current options
    refresh: function () {
        var el = this.element,
            arrow = $('<div class="ui-option-header-triangle-arrow"></div>'),
            optionHeaderClass = 'ui-option-header',
            self = this,
            gridRowSelector = '.ui-grid-a,.ui-grid-b,.ui-grid-c,.ui-grid-d,.ui-grid-e',
            theme = this.options.theme,
            numRows,
            rowsClass,
            themeClass;

        // count ui-grid-* elements to get number of rows
        numRows = el.find(gridRowSelector).length;

        // ...at least one row
        numRows = Math.max(1, numRows);

        // add classes to outer div:
        //   ui-option-header-N-row, where N = options.rows
        //   ui-bar-X, where X = options.theme (defaults to 'c')
        //   ui-option-header
        rowsClass = 'ui-option-header-' + numRows + '-row';
        themeClass = 'ui-body-' + this.options.theme;

        el.removeClass(rowsClass).addClass(rowsClass);
        el.removeClass(themeClass).addClass(themeClass);
        el.removeClass(optionHeaderClass).addClass(optionHeaderClass);

        // remove any arrow currently visible
        el.prev('.ui-option-header-triangle-arrow').remove();

        // if there are elements inside the option header
        // and this.options.showIndicator,
        // insert a triangle arrow as the first element inside the
        // optionheader div to show the header has hidden content
        if (this.options.showIndicator) {
            el.before(arrow);
            arrow.triangle({"color": el.css('background-color'), offset: "50%"});
        }

        // if expandable, bind clicks to the toggle() method
        if (this.options.expandable) {
            el.unbind('vclick', this.clickHandler).bind('vclick', this.clickHandler);
            arrow.unbind('vclick', this.clickHandler).bind('vclick', this.clickHandler);
        }
        else {
            el.unbind('vclick', this.clickHandler);
            arrow.unbind('vclick', this.clickHandler);
        }

        // for each ui-grid-* element, add a class ui-option-header-row-M
        // to it, where M is the xpath position() of the div
        el.find(gridRowSelector).each(function (index) {
            var klass = 'ui-option-header-row-' + (index + 1);
            $(this).removeClass(klass).addClass(klass);
        });

        // redraw the buttons (now that the optionheader has the right
        // swatch)
        el.find('.ui-btn').each(function () {
            $(this).attr('data-' + $.mobile.ns + 'theme', theme);

            // hack the class of the button to remove the old swatch
            var klass = $(this).attr('class');

            klass = klass.replace(/ui-btn-up-\w{1}\s*/, '');
            klass = klass + ' ui-btn-up-' + theme;
            $(this).attr('class', klass);
        });
    },

    _setHeight: function (height, isCollapsed, options) {
        var self = this,
            duration,
            commonCallback,
            callback;

        options = options || {};

        // set default duration if not specified
        duration = options.duration;
        if (typeof duration == 'undefined') {
            duration = this.options.duration;
        }

        // the callback to always call after expanding or collapsing
        commonCallback = function () {
            self.isCollapsed = isCollapsed;

            if (isCollapsed) {
                self.element.trigger('collapse');
            }
            else {
                self.element.trigger('expand');
            }
        };

        // combine commonCallback with any user-specified callback
        if (options.callback) {
            callback = function () {
                options.callback();
                commonCallback();
            };
        }
        else {
            callback = function () {
                commonCallback();
            }
        }

        // apply the animation
        if (duration > 0 && $.support.cssTransitions) {
            // add a handler to invoke a callback when the animation is done
            var elt = this.element.get(0);

            var handler = {
                handleEvent: function (e) {
                    elt.removeEventListener('webkitTransitionEnd', this);
                    self.element.css('-webkit-transition', null);
                    callback();
                }
            };

            elt.addEventListener('webkitTransitionEnd', handler, false);

            // apply the transition
            this.element.css('-webkit-transition',
                             'height ' + duration + 's ease-out');
            this.element.css('height', height);
        }
        // make sure the callback gets called even when there's no
        // animation
        else {
            this.element.css('height', height);
            callback();
        }
    },

    // Toggle the expanded/collapsed state of the widget.
    // {Object} [options] Configuration for the expand/collapse
    // {Integer} [options.duration] Duration of the expand/collapse;
    // defaults to this.options.duration
    // {Function} [options.callback] Function to call after toggle completes
    toggle: function (options) {
        if (this.isCollapsed) {
            this.expand(options);
        }
        else {
            this.collapse(options);
        }
    },

    // Takes the same options as toggle()
    collapse: function (options) {
        if (!this.isCollapsed) {
            this._setHeight(this.collapsedHeight, true, options);
        }
    },

    // Takes the same options as toggle()
    expand: function (options) {
        if (this.isCollapsed) {
            this._setHeight(this.expandedHeight, false, options);
        }
    }
});

// auto self-init widgets
$(document).bind("pagecreate", function (e) {
    $($.todons.optionheader.prototype.options.initSelector, e.target)
    .not(":jqmData(role='none'), :jqmData(role='nojs')")
    .optionheader();
});

})(jQuery);
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// pagelist widget
//
// Given an element, this widget collects all links contained in the descendants of the element and constructs
// a popupwindow widget containing numbered buttons for each encountered link.
//
// You can mark any one element in your document with "data-pagelist='true'" and a pagelist will be created that
// will allow the user to navigate between the pages linked to within the element.
//
// Currently, only one pagelist can exist in a document and, once created, it cannot be modified.

(function($, undefined) {

ensureNS("jQuery.mobile.todons");

$.widget("todons.pagelist", $.todons.widgetex, {
    _htmlProto: {
source:

$("<div><div id='pagelist' class='ui-pagelist' data-role='popupwindow' data-shadow='false' data-overlayTheme=''>" +
  "    <a id='pagelist-button' data-role='button' data-inline='true'></a>" +
  "    <br id='pagelist-rowbreak'></br>" +
  "</div>" +
  "</div>")
,        ui: {
            pageList: "#pagelist",
            button:   "#pagelist-button",
            rowBreak: "#pagelist-rowbreak"
        }
    },
    _create: function() {
        var self = this,
            popPageList = false,
            idx = 0;

        this._ui.button.remove();
        this._ui.rowBreak.remove();
        this._ui.pageList
            .appendTo($("body"))
            .popupwindow()
            .bind("vclick", function(e) {
                $(this).popupwindow("close");
            });

        this.element.find("a[href]").each(function(elemIdx, elem) {
            if (idx > 0 && !(idx % 10))
                self._ui.pageList.append(self._ui.rowBreak.clone());

            self._ui.button
                .clone()
                .attr("href", $(elem).attr("href"))
                .text(++idx)
                .appendTo(self._ui.pageList)
                .buttonMarkup()
                .bind("vclick", function() { self._ui.pageList.popupwindow("close"); })
                .find(".ui-btn-inner")
                .css({padding: 2});
        });

        $(document).bind("keydown", function(e) {
            popPageList = (e.keyCode === $.mobile.keyCode.CONTROL);
        });
        $(document).bind("keyup", function(e) {
            if (e.keyCode === $.mobile.keyCode.CONTROL && popPageList) {
                var maxDim = {cx: 0, cy: 0};
                self._ui.pageList.popupwindow("open", undefined, 0);
                self._ui.pageList.find("a")
                    .each(function() {
                        var btn = $(this),
                            dim = {
                                cx: btn.outerWidth(true),
                                cy: btn.outerHeight(true)
                            };

                        // Make sure things will be even later, because padding cannot have decimals - apparently :-S
                        if (dim.cx % 2) btn.css("padding-left",   parseInt(btn.css("padding-left"))   + 1);
                        if (dim.cy % 2) btn.css("padding-bottom", parseInt(btn.css("padding-bottom")) + 1);

                        maxDim.cx = Math.max(maxDim.cx, dim.cx);
                        maxDim.cy = Math.max(maxDim.cy, dim.cy);
                    })
                    .each(function() {
                        var padding = {
                                h: Math.max(0, (maxDim.cx - $(this).outerWidth(true))  / 2),
                                v: Math.max(0, (maxDim.cy - $(this).outerHeight(true)) / 2)
                            },
                            btn = $(this),
                            inner = btn.find(".ui-btn-inner");

                        inner.css({
                            "padding-left"   : parseInt(inner.css("padding-left"))   + padding.h,
                            "padding-top"    : parseInt(inner.css("padding-top"))    + padding.v,
                            "padding-right"  : parseInt(inner.css("padding-right"))  + padding.h,
                            "padding-bottom" : parseInt(inner.css("padding-bottom")) + padding.v
                        });
                        btn[((btn.attr("href") === "#" + $.mobile.activePage.attr("id")) ? "addClass" : "removeClass")]("ui-btn-active");
                    });
                e.stopPropagation();
                e.preventDefault();
            }
            popPageList = false;
        });
    }
});

// Look for an element marked as a pagelist and assign $.mobile.todons.pagelist with a newly created pagelist.
// If $.mobile.todons.pagelist is already assigned, ignore any new "data-pagelist='true'" designations.
$(document).bind("pagecreate create", function(e) {
    $(":jqmData(pagelist='true')", e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .each(function() {
            if ($.mobile.todons.pagelist === undefined) {
                $.extend($.mobile.todons, {
                    pagelist: $(this).pagelist()
                });
            }
            return false;
        });
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Salvatore Iovene <salvatore.iovene@intel.com>
 */

// Displays a list of contacts fetched from the provided AddressBook.
//
// To apply, add the attribute data-role="personpicker" to a <div>
// element inside a page or a dialog. Alternative, call personpicker()
// on an element, like this:
//
//     $("#my_personpicker").personpicker();
//
// where the HTML might be:
//
//     <div id="my_personpicker"></div>
//
// Theme: by default, gets a 'b' swatch; override with data-theme="X"
// as per usual.
//
// Options:
//     addressBook:
//         AddressBook; the address book used to populate the picker.
//     successCallback:
//         Function; the function to call after the Done button has
//         been clicked, and no errors occurred.
//     errorCallback:
//         Function; the function to call if there was an error while
//         showing the widget.
//     filter:
//         Filter; a filter used when querying the address book.
//     multipleSelection:
//         Boolean; weather the widget allows picking more than one
//         person. Default: true.

(function ($, window, undefined) {
    $.widget("todons.personpicker", $.todons.widgetex, {
        options: {
            addressBook: null,
            successCallback: null,
            errorCallback: null,
            filter: null,
            multipleSelection: true,
            theme: 'b'
        },

        _data: {
            checked: new Array()
        },

        _personArraySuccessCallback: function(persons) {
            var self = this;
            var list = self._ui.ui.list;
            var li = self._ui.row.li;
            var container = self._ui.ui.personpicker.find('.ui-personpicker-container');

            list.find('li').remove();

            persons.forEach(function(p) {
                currentListItem = li.clone();
                currentCheckbox = currentListItem.find('.switch');
                currentName = currentListItem.find('.name');
                currentAvatar = currentListItem.find('.avatar');

                currentName.text(p.id());
                currentAvatar.find("img").attr({src: p.avatar(), alt: p.id()});
                list.append(currentListItem);

                currentCheckbox
                    .toggleswitch({"checked": false, theme: self.options.theme})
                    .data("Person", p)
                    .bind("changed", function(e, checked) {
                        var p = $(this).data("Person");
                        if (checked) {
                            if (!self.options.multipleSelection) {
                                self._data.checked.forEach(function(item) {
                                    item.toggleswitch("option", "checked", false);
                                });
                                self._data.checked.length = 0;
                            }
                            if ($.inArray(p, self._data.checked) == -1) {
                                self._data.checked.push($(this));
                            }
                        } else {
                            self._data.checked = $.grep(
                                self._data.checked, function(value) {
                                    return value != $(this);
                                });
                        }
                    });
            });

            container.scrollview({direction: 'y'});
            self._ui.ui.list.shortcutscroll();
            self._ui.ui.list.autodividers({selector: '.content > h3'});

            // bind to events on the search input so that the listview
            // can be scrolled when the list is filtered
            self._ui.ui.search.bind("keyup change", function () {
              container.scrollview('scrollTo', 0, 0);
            });

            // re-enable search input
            self._ui.ui.search.textinput('enable');
        },

        _htmlProto: {
source:

$("<div><div class='ui-personpicker'>" +
  "    <div class='ui-personpicker-container'>" +
  "        <ul data-role='listview' data-filter='true'>" +
  "        </ul>" +
  "    </div>" +
  "</div>" +
  "<li class='ui-personpicker-row'>" +
  "    <div class='content'>" +
  "        <div class='switch'></div>" +
  "        <h3 class='name'></h3>" +
  "        <div class='avatar'>" +
  "            <img src='' alt='' />" +
  "        </div>" +
  "    </div>" +
  "</li>" +
  "</div>")
,            ui: {
                ui: {
                    personpicker: ".ui-personpicker",
                    list: ".ui-personpicker ul"
                },
                row: {
                    li: "li.ui-personpicker-row",
                    container: "div.ui-personpicker-row-container",
                    checkbox: "div.switch",
                    name: "h3.name",
                    avatar: "div.avatar"
                }
            }
        },

        _create: function () {
            var self = this;

            this.element.append(self._ui.ui.personpicker);
            self._ui.ui.list.listview({theme: self.options.theme});

            self._ui.ui.search = $(this.element).find(':jqmData(type="search")');

            // disable search input until list is populated
            self._ui.ui.search.textinput('disable');

            this.refresh();
        },

        getPersons: function() {
            var persons = new Array();
            this._data.checked.forEach(function(item) {
                persons.push(item.data("Person"));
            });
            return persons;
        },

        refresh: function () {
            var self = this;

            // Load persons.
            if (this.options.addressBook !== null) {
                // Replace this with actuall call when implemented.
                this.options.addressBook.findPersons(
                    function (persons) { self._personArraySuccessCallback(persons); },
                    this.options.errorCallback,
                    this.options.filter,
                    null,
                    null);
            }
        },

        resizeScrollview: function(height) {
            this._ui.ui.personpicker.find('.ui-personpicker-container').height(height);
        }
    }); /* End of widget */

    //auto self-init widgets
    $(document).bind("pagecreate", function (e) {
        $(e.target).find(":jqmData(role='personpicker')").personpicker();
    });
})(jQuery, this);
/*
 * jQuery Mobile Widget @VERSION
 *
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Salvatore Iovene <salvatore.iovene@intel.com>
 */

// Displays a page that contains a PersonPicker, and buttons to
// interact with it.
//
// To apply, add the attribute data-role="personpicker-page" to
// a page.
//
// Theme: by default, gets a 'b' swatch; override with data-theme="X"
// as per usual.
//
// Options:
//     title:
//         DOMString: the title of the page. Default: empty string.
//     addressBook:
//         AddressBook; the address book used to populate the picker.
//     successCallback:
//         Function; the function to call after the Done button has
//         been clicked, and no errors occurred.
//     errorCallback:
//         Function; the function to call if there was an error while
//         showing the widget.
//     filter:
//         Filter; a filter used when querying the address book.
//     multipleSelection:
//         Boolean; weather the widget allows picking more than one
//         person. Default: true.

(function ($, window, undefined) {
    $.widget("todons.personpicker_page", $.mobile.dialog, {
        options: {
            title: "",
            addressBook: null,
            successCallback: null,
            errorCallback: null,
            filter: null,
            multipleSelection: true,
            theme: 'b'
        },

        _htmlProto: {
source:

$("<div><div class='ui-personpicker-page-container'>" +
  "    <div data-role='header'>" +
  "        <h1><!-- Title goes here --></h1>" +
  "        <div class='ui-optionheader-anchor' data-role='optionheader'>" +
  "            <div class='ui-grid-a'>" +
  "                <div class='ui-block-a'><a data-role='button' class='cancel-btn' data-rel='back'>Cancel</a></div>" +
  "                <div class='ui-block-b'><a data-role='button' class='done-btn'>Done</a></div>" +
  "            </div>" +
  "        </div>" +
  "    </div>" +
  "    <div data-role='content' class='ui-personpicker-anchor'></div>" +
  "</div>" +
  "</div>")
,            ui: {
                container: ".ui-personpicker-page-container",
                title: ".ui-personpicker-page-container h1",
                optionheader: ".ui-personpicker-page-container .ui-optionheader-anchor",
                cancel: ".ui-personpicker-page-container .ui-optionheader-anchor .cancel-btn",
                done: ".ui-personpicker-page-container .ui-optionheader-anchor .done-btn",
                personpicker: ".ui-personpicker-page-container > .ui-personpicker-anchor"
            }
        },

        _resizePersonpicker: function() {
            var header = this._ui.container.find(':jqmData(role=header)');

            // get the height of the container
            var containerHeight = this._ui.container.innerHeight();

            // get the height of the header
            var headerHeight = header.outerHeight(true);

            // figure out how big to make the personpicker, so it fills the container
            var personpickerHeight = containerHeight - headerHeight;

            this._ui.personpicker.personpicker("resizeScrollview", personpickerHeight);

            this.element.trigger('updatelayout');
        },

        _create: function () {
            var self = this;

            $.todons.widgetex.loadPrototype.call(this, "todons.personpicker_page");

            // Prepare.
            self._ui.title.text(self.options.title);
            self._ui.cancel.buttonMarkup({shadow: true, inline: true, icon: "delete", theme: self.options.theme});
            self._ui.done
                .buttonMarkup({shadow: true, inline: true, theme: self.options.theme})
                .bind("vclick", function(e) {
                    self.options.successCallback(self._ui.personpicker.personpicker("getPersons"));
                });

            this.element.append(self._ui.container);

            self._ui.optionheader.optionheader({theme: self.options.theme});

            $.mobile.page.prototype._create.call(this);
            $.mobile.dialog.prototype._create.call(this);

            self._ui.personpicker.personpicker({
               addressBook: self.options.addressBook,
               successCallback: self.options.successCallback,
               errorCallback: self.options.errorCallback,
               filter: self.options.filter,
               multipleSelection: self.options.multipleSelection,
               theme: self.options.theme
            });

            // Hack: the JQM Dialog is unconfigurable in its will to
            // place a Close button there.
            self._ui.container.find(":jqmData(role=header) > a:first-child").remove();

            // Resize on window resize.
            $(window).bind('resize', function() {
                self._resizePersonpicker();
            });

            // Resize when optionheader collapses or expands.
            self._ui.optionheader.bind('collapse expand', function() {
                self._resizePersonpicker();
            });

            // Resize when page is ready; always expand the optionheader
            // on pageshow (which triggers a resize anyway)
            if (this.element.closest(".ui-page").is(":visible"))
                self._resizePersonpicker();
            else {
                this.element.closest(".ui-page").bind("pageshow", function() {
                    self._ui.optionheader.optionheader('expand', {duration:0});
                    self._ui.optionheader.optionheader('refresh');
                });
            }
        }
    }); /* End of widget */

    //auto self-init widgets
    $(document).bind("pagecreate", function (e) {
        $(e.target).find(":jqmData(role='personpicker-page')").personpicker_page();
    });
})(jQuery, this);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>,
 *          Elliot Smith <elliot.smith@intel.com>
 */

// Shows other elements inside a popup window.
//
// To apply, add the attribute data-role="popupwindow" to a <div> element inside
// a page. Alternatively, call popupwindow()
// on an element, eg :
//
//     $("#mypopupwindowContent").popupwindow();
// where the html might be :
//     <div id="mypopupwindowContent"></div>
//
// To trigger the popupwindow to appear, it is necessary to make a call to its
// 'open()' method. This is typically done by binding a function to an event
// emitted by an input element, such as a the clicked event emitted by a button
// element. The open() method takes two arguments, specifying the x and y
// screen coordinates of the center of the popup window.

// You can associate a button with a popup window like this:
//      <div id="mypopupContent" style="display: table;" data-role="popupwindow">
//          <table>
//              <tr> <td>Eenie</td>   <td>Meenie</td>  <td>Mynie</td>   <td>Mo</td>  </tr>
//              <tr> <td>Catch-a</td> <td>Tiger</td>   <td>By-the</td>  <td>Toe</td> </tr>
//              <tr> <td>If-he</td>   <td>Hollers</td> <td>Let-him</td> <td>Go</td>  </tr>
//              <tr> <td>Eenie</td>   <td>Meenie</td>  <td>Mynie</td>   <td>Mo</td>  </tr>
//          </table>
//      </div>
// <a href="#myPopupContent" data-rel="popupwindow" data-role="button">Show popup</a>
//
// Options:
//
//     theme: String; the theme for the popupwindow contents
//                   Default: null
//
//     overlayTheme: String; the theme for the popupwindow
//                   Default: null
//
//     shadow: Boolean; display a shadow around the popupwindow
//             Default: true
//
//     corners: Boolean; display a shadow around the popupwindow
//             Default: true
//
//     fade: Boolean; fades the opening and closing of the popupwindow
//
//     transition: String; the transition to use when opening or closing
//                 a popupwindow
//                 Default: $.mobile.defaultDialogTransition
//
// Events:
//     close: Emitted when the popupwindow is closed.

(function( $, undefined ) {

$.widget( "todons.popupwindow", $.todons.widgetex, {
    options: {
        theme: null,
        overlayTheme: null,
        shadow: true,
        corners: true,
        fade: true,
        transition: $.mobile.defaultDialogTransition,
        showArrow: false,
        initSelector: ":jqmData(role='popupwindow')"
    },

    _htmlProto: {
source:

$("<div><div>" +
  "    <div id='popupwindow-screen' class='ui-selectmenu-screen ui-screen-hidden ui-popupwindow-screen'></div>" +
  "    <div id='popupwindow-container' class='ui-popupwindow ui-selectmenu-hidden ui-overlay-shadow ui-corner-all'>" +
  "        <div id='popupwindow-arrow' class='ui-popupwindow-arrow'></div>" +
  "    </div>" +
  "</div>" +
  "</div>")
,        ui: {
            screen:    "#popupwindow-screen",
            container: "#popupwindow-container",
            arrow:     "#popupwindow-arrow"
        }
    },

    _create: function() {
        var self = this,
            thisPage = this.element.closest(".ui-page");

        if (thisPage[0] === undefined)
            thisPage = $("body");

        thisPage.append(this._ui.screen);
        this._ui.container.insertAfter(this._ui.screen);
        this._ui.container.append(this.element);
        this._ui.arrow.remove();

        $.extend( self, {
            _isOpen: false
        });

        // Events on "screen" overlay
        this._ui.screen.bind( "vclick", function( event ) {
            self.close();
        });
    },

    _realSetTheme: function(dst, theme) {
        var classes = (dst.attr("class") || "").split(" "),
            alreadyAdded = true,
            currentTheme = null;

        while (classes.length > 0) {
            currentTheme = classes.pop();
            if (currentTheme.match(/^ui-body-[a-z]$/))
                break;
            else
                currentTheme = null;
        }

        dst.removeClass("ui-body-" + currentTheme);
        if ((theme || "").match(/[a-z]/))
            dst.addClass("ui-body-" + theme);
    },

    _setTheme: function(value) {
        this._realSetTheme(this.element, value);
        this.options.theme = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "theme", value);
    },

    _setOverlayTheme: function(value) {
        this._realSetTheme(this._ui.container, value);
        this.options.overlayTheme = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "overlay-theme", value);
    },

    _setShadow: function(value) {
        this.options.shadow = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "shadow", value);
        this._ui.container[value ? "addClass" : "removeClass"]("ui-overlay-shadow");
    },

    _setCorners: function(value) {
        this.options.corners = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "corners", value);
        this._ui.container[value ? "addClass" : "removeClass"]("ui-corner-all");
    },

    _setFade: function(value) {
        this.options.fade = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "fade", value);
    },

    _setTransition: function(value) {
        this._ui.container
                .removeClass((this.options.transition || ""))
                .addClass(value);
        this.options.transition = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "transition", value);
    },

    _setShowArrow: function(value) {
        this.options.showArrow = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "show-arrow", value);
    },

    _placementCoords: function(x, y) {
        // Try and center the overlay over the given coordinates
        var ret,
            menuHeight = this._ui.container.outerHeight(true),
            menuWidth = this._ui.container.outerWidth(true),
            scrollTop = $( window ).scrollTop(),
            screenHeight = window.innerHeight,
            screenWidth = window.innerWidth,
            halfheight = menuHeight / 2,
            maxwidth = parseFloat( this._ui.container.css( "max-width" ) ),
            calcCoords = function(coords) {
                var roomtop = coords.y - scrollTop,
                roombot = scrollTop + screenHeight - coords.y,
                newtop, newleft;

                if ( roomtop > menuHeight / 2 && roombot > menuHeight / 2 ) {
                    newtop = coords.y - halfheight;
                }
                else {
                    // 30px tolerance off the edges
                    newtop = roomtop > roombot ? scrollTop + screenHeight - menuHeight - 30 : scrollTop + 30;
                }

                // If the menuwidth is smaller than the screen center is
                if ( menuWidth < maxwidth ) {
                    newleft = ( screenWidth - menuWidth ) / 2;
                }
                else {
                    //otherwise insure a >= 30px offset from the left
                    newleft = coords.x - menuWidth / 2;

                    // 30px tolerance off the edges
                    if ( newleft < 30 ) {
                        newleft = 30;
                    }
                    else if ( ( newleft + menuWidth ) > screenWidth ) {
                        newleft = screenWidth - menuWidth - 30;
                    }
                }

                return { x : newleft, y : newtop };
            };

        if (this.options.showArrow) {
            this._ui.arrow.appendTo(this._ui.container);
            var possibleLocations = {}, coords, desired, minDiff, minDiffIdx,
                arrowHeight = this._ui.arrow.height();
            this._ui.arrow.remove();

            /* Check above */
            desired = {x : x, y : y - halfheight - arrowHeight};
            coords = calcCoords(desired);
            possibleLocations.above = {
                coords: coords,
                diff: {
                    x: Math.abs(desired.x - (coords.x + menuWidth / 2)),
                    y: Math.abs(desired.y - (coords.y + halfheight))
                }
            };
            minDiff = possibleLocations.above.diff;
            minDiffIdx = "above";

            /* Check below */
            desired = {x : x, y : y + halfheight + arrowHeight};
            coords = calcCoords(desired);
            possibleLocations.below = {
                coords: coords,
                diff: {
                    x: Math.abs(desired.x - (coords.x + menuWidth / 2)),
                    y: Math.abs(desired.y - (coords.y + halfheight))
                }
            };

            /*
             * Compute minimum deviation from desired distance.
             * Not sure if Euclidean distance is best here, especially since it is expensive to compute.
             */
            for (var Nix in possibleLocations) {
                if (possibleLocations[Nix].diff.x + possibleLocations[Nix].diff.y < minDiff.x + minDiff.y) {
                    minDiff = possibleLocations[Nix].diff;
                    minDiffIdx = Nix;
                }

                if (0 === minDiff.x + minDiff.y)
                    break;
            }

            ret = possibleLocations[minDiffIdx].coords;
            ret.arrowLocation = (("above" === minDiffIdx) ? "bottom" : "top");
        }
        else
            ret = calcCoords({x : x, y : y});

        return ret;
    },

    open: function(x_where, y_where) {
        if (!this._isOpen) {
            var self = this,
                x = (undefined === x_where ? window.innerWidth  / 2 : x_where),
                y = (undefined === y_where ? window.innerHeight / 2 : y_where),
                coords = this._placementCoords(x, y),
                zIndexMax = 0;

            $(document)
                .find("*")
                .each(function() {
                    var el = $(this),
                        zIndex = parseInt(el.css("z-index"));

                    if (!(el.is(self._ui.container) || el.is(self._ui.screen) || isNaN(zIndex)))
                        zIndexMax = Math.max(zIndexMax, zIndex);
                });

            this._ui.screen.css("z-index", zIndexMax + 1);
            this._ui.container.css("z-index", zIndexMax * 10);

            if (this.options.showArrow)
                this._ui.currentArrow = this._ui.arrow
                    .clone()
                    .addClass("ui-popupwindow-arrow-" + coords.arrowLocation)
                    [(("bottom" === coords.arrowLocation) ? "appendTo" : "prependTo")](this._ui.container)
                    .triangle({location: coords.arrowLocation, offset: "50%"});

            this._ui.screen
                .height($(document).height())
                .removeClass("ui-screen-hidden");

            if (this.options.fade)
                this._ui.screen.animate({opacity: 0.5}, "fast");

            var origOverflow = { x: $("body").css("overflow-x"), y: $("body").css("overflow-y") };
            $("body").css({"overflow-x" : "hidden", "overflow-y" : "hidden" });
            this._ui.container
                .removeClass("ui-selectmenu-hidden")
                .css({
                    left: coords.x,
                    top: coords.y
                })
                .addClass("in")
                .animationComplete(function() {
                    self._ui.screen.height($(document).height());
                    $("body").css({"overflow-x" : origOverflow.x, "overflow-y" : origOverflow.y});
                });

            this._isOpen = true;
        }
    },

    close: function() {
        if (this._isOpen) {
            var self = this,
                hideScreen = function() {
                    self._ui.screen.addClass("ui-screen-hidden");
                    self._isOpen = false;
                    self.element.trigger("closed");
                };

            var origOverflow = { x: $("body").css("overflow-x"), y: $("body").css("overflow-y") };
            $("body").css({"overflow-x" : "hidden", "overflow-y" : "hidden" });
            this._ui.container
                .removeClass("in")
                .addClass("reverse out")
                .animationComplete(function() {
                    self._ui.container
                        .removeClass("reverse out")
                        .addClass("ui-selectmenu-hidden")
                        .removeAttr("style");
                    if (self._ui.currentArrow != undefined) {
                        self._ui.currentArrow.remove();
                        self._ui.currentArrow = undefined;
                    }
                    $("body").css({"overflow-x" : origOverflow.x, "overflow-y" : origOverflow.y});
                });

            if (this.options.fade)
                this._ui.screen.animate({opacity: 0.0}, "fast", hideScreen);
            else
                hideScreen();
        }
    }
});

$.todons.popupwindow.bindPopupToButton = function(btn, popup) {
    // If the popup has a theme set, prevent it from being clobbered by the associated button
    if ((popup.popupwindow("option", "overlayTheme") || "").match(/[a-z]/))
        popup.jqmData("overlay-theme-set", true);
    btn
        .attr({
            "aria-haspopup": true,
            "aria-owns": btn.attr("href")
        })
        .removeAttr("href")
        .bind("vclick", function() {
            // When /this/ button causes a popup, align the popup's theme with that of the button, unless the popup has a theme pre-set
            if (!popup.jqmData("overlay-theme-set"))
                popup.popupwindow("option", "overlayTheme", btn.jqmData("theme"));
            popup.popupwindow("open",
                btn.offset().left + btn.outerWidth()  / 2,
                btn.offset().top  + btn.outerHeight() / 2);
        });
};

$(document).bind("pagecreate create", function(e) {
    $($.todons.popupwindow.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .popupwindow();

    $("a[href^='#']:jqmData(rel='popupwindow')", e.target).each(function() {
        $.todons.popupwindow.bindPopupToButton($(this), $($(this).attr("href")));
    });
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// Converts a div into an indeterminate progressbar, displaying
// as an animated "candy stripe" bar.
//
// Apply it by setting data-role="processingbar" on an element
// (the "target" element) or with $(...).processingbar().
//
// The processingbar appends its own DOM elements to the target
// element and fill the horizontal and vertical space occupied by
// the element.
//
// Once you have a processingbar, stop the animation with stop().
// Calling refresh() will start the animation again. destroy() will
// remove the bar's DOM elements (but leave behind the original
// div).
//
// Options:
//
//     animationMsPerPixel: Integer; default = 15; the number of ms of
//                          animation to use per pixel of vertical
//                          height in the animated bar. Increasing this
//                          number will make the animation of the bar
//                          faster.
//
// Events:
//
//     stop: Fired when stop() is called on the processingbar

(function($, undefined) {

$.widget("todons.processingbar", $.mobile.widget, {
    options: {
        initSelector: ":jqmData(role='processingbar')",
        animationMsPerPixel: 15,
        theme: 'b'
    },

    _isRunning: false,

    _create: function () {
        var self = this,
            page = this.element.closest('.ui-page'),
            refreshFunc;

        var theme = this.element.jqmData('theme') || this.options.theme;

        this.html = $('<div class="ui-processingbar-container">' +
                      '<div class="ui-processingbar-clip">' +
                      '<div class="ui-processingbar-bar" />' +
                      '</div>' +
                      '</div>' +
                      '<span class="ui-processingbar-swatch"></span>');

        // clean up any old HTML
        this.element.find('.ui-processingbar-container').remove();

        // add the HTML elements
        this.element.append(this.html);

        this.bar = this.element.find('.ui-processingbar-bar');

        // massive hack to get theme colours (we can't apply a theme
        // class direct to the bar, as we need to create the
        // barbershop pole effect)
        var swatch = this.element.find('.ui-processingbar-swatch');
        swatch.addClass('ui-bar-' + theme);
        var bgcolor = swatch.css('background-color');
        swatch.remove();

        if (bgcolor) {
            var webkitCss = "-webkit-gradient(linear, left top, right bottom, " +
                            "color-stop(0%,  rgba(255,255,255,1.0))," +
                            "color-stop(25%, rgba(255,255,255,1.0))," +
                            "color-stop(25%, processingbarBarBgColor)," +
                            "color-stop(50%, processingbarBarBgColor)," +
                            "color-stop(50%, rgba(255,255,255,1.0))," +
                            "color-stop(75%, rgba(255,255,255,1.0))," +
                            "color-stop(75%, processingbarBarBgColor))";
            webkitCss = webkitCss.replace(/processingbarBarBgColor/g, bgcolor);
            this.bar.css('background-image', webkitCss);

            var step = this.bar.height() / 8;
            var mozCss = "-moz-repeating-linear-gradient(top left -45deg, " +
                         "rgba(255,255,255,1.0)," +
                         "rgba(255,255,255,1.0) " + step + "px," +
                         "processingbarBarBgColor " + step + "px," +
                         "processingbarBarBgColor " + (step * 3) + "px," +
                         "rgba(255,255,255,1.0) " + (step * 3) + "px," +
                         "rgba(255,255,255,1.0) " + (step * 4) + "px)";
            mozCss = mozCss.replace(/processingbarBarBgColor/g, bgcolor);
            this.bar.css('background', mozCss);
        }
        // end massive hack

        refreshFunc = function () {
            self.refresh();
        };

        if (page && !page.is(':visible')) {
            page.unbind('pageshow', refreshFunc)
                .bind('pageshow', refreshFunc);
        }
        else {
            this.refresh();
        }
    },

    // draw the processingbar
    refresh: function () {
        this.stop();

        // animate the bar
        var moveY = this.bar.height() / 2;

        // 15 ms for each pixel of movement
        var animationTime = moveY * this.options.animationMsPerPixel;

        // temp variable so bar can be referred to inside function
        var bar = this.bar;

        // func to animate the bar
        var animateFunc = function () {
            bar.animate({top: '-=' + moveY},
                         animationTime,
                         'linear',
                         function () {
                             bar.css('top', 0);
                         });
        };

        // start animation loop
        this.interval = setInterval(animateFunc, animationTime);

        this._isRunning = true;
    },

    stop: function () {
        if (!this._isRunning) {
            return;
        }

        // stop the loop
        clearInterval(this.interval);

        // remove all pending animations
        this.bar.stop();
        this.bar.clearQueue();

        // trigger event
        this.element.trigger('stop');

        this._isRunning = false;
    },

    isRunning: function () {
      return this._isRunning;
    },

    destroy: function () {
        this.stop();
        this.html.detach();
    }
});

// auto self-init widgets
$(document).bind("pagecreate create", function (e) {
    $($.todons.processingbar.prototype.options.initSelector, e.target)
    .not(":jqmData(role='none'), :jqmData(role='nojs')")
    .processingbar();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// Displays a spinning circle in the DOM element it is applied to
// (the "target").
//
// A processingcircle doesn't have a progress value, as it is used in situations
// where the exact amount of time a process would take is not known.
//
// Apply a processingcircle using the processingcircle() method or by adding a
// data-role="processingcircle" attribute to an element.
//
// The processingcircle uses a div directly after the element. Calling stop()
// on a processingcircle detaches this element from the DOM. Calling
// refresh() on it restarts the animation.
//
// Events:
//
//     stop: Fired when stop() is called on the processingcircle

(function($) {

$.widget("todons.processingcircle", $.mobile.widget, {
    options: {
        initSelector: ":jqmData(role='processingcircle')",
        theme: 'b'
    },

    _isRunning: false,

    _create: function() {
        var page = this.element.closest('.ui-page'),
            self = this,
            theme;

        theme = this.element.jqmData('theme') || this.options.theme;

        this.html = $('<div class="ui-processingcircle-container ui-body-' + theme + '">' +
                      '<div class="ui-processingcircle">' +
                      '<div class="ui-processingcircle-hand ui-bar-' + theme + '" />' +
                      '</div>' +
                      '</div>');

        this.element.find('.ui-processingcircle-container').remove();

        this.element.append(this.html);
        this.circle = this.element.find('.ui-processingcircle');

        if (page && !page.is(':visible')) {
            page.bind('pageshow', function () {
                self.refresh();
            });
        }
        else {
            this.refresh();
        }
    },

    refresh: function () {
        if (!this._isRunning) {
            this.circle.addClass('ui-processingcircle-spin');
            this._isRunning = true;
        }
    },

    stop: function () {
        if (this._isRunning) {
            this.circle.removeClass('ui-processingcircle-spin');
            this.element.trigger('stop');
            this._isRunning = false;
        }
    },

    isRunning: function () {
      return this._isRunning;
    },

    destroy: function () {
        this.stop();
        this.html.detach();
    }
});

// auto self-init widgets
$(document).bind("pagecreate", function (e) {
    $($.todons.processingcircle.prototype.options.initSelector, e.target)
    .not(":jqmData(role='none'), :jqmData(role='nojs')")
    .processingcircle();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Rijubrata Bhaumik <rijubrata.bhaumik@intel.com>
 */

// Displays a progressbar element
//
// A progressbar does have a progress value, and can be found from getValue()
// You can set the value using value()
// The external process is supposed to call the progressbar
// e.g. $('#myprogressbar').progressbar('value', 19)
//
// Options:
//
//     value    : starting value, default is 0
//     max      : maximum value, default is 100
//     theme    : data-theme, default is swatch 'b'
//                

(function ($, window, undefined) {
    $.widget("todons.progressbar", $.mobile.widget, {
        options: {
            value: 0,
            max: 100,
            theme: 'b'
        },

        bar: null,
        // to hold the gray background
        box: null,
        // to hold the moving orange bar
        oldValue: 0,
        currentValue: 0,
        delta: 0,

        value: function (newValue) {
            if (newValue === undefined) {
                return this.currentValue;
            }

            this.currentValue = parseInt(newValue);

            if (this.oldValue !== this.currentValue) {
                this.delta = this.currentValue - this.oldValue;
                this.delta = Math.min(this.delta, 0);
                this.delta = Math.max(this.delta, this.options.max);

                this.oldValue = this.currentValue;
                this._startProgress();
            }
        },

         // function : animates the progressBar  
        _startProgress: function () {
            var percentage = 100 * this.currentValue / this.options.max;
            var width = percentage + '%';
            this.bar.width(width);
        },
        
        _create: function () {
            var startValue, container;
            var html = $('<div class="ui-progressbar">' + '<div class="ui-boxImg " ></div>' + '<div class="ui-barImg " ></div>' + '</div>');

            $(this.element).append(html);
            
            container = $(this.element).find(".ui-progressbar");
            this.box = container.find("div.ui-boxImg");
            this.bar = container.find("div.ui-barImg");
            this._setOption("theme", this.options.theme);
            startValue = this.options.value ? this.options.value : 0;
            this.value(startValue);
        },
        
        _setOption: function(key, value) {
        	if (key == "theme")
        		this._setTheme(value);
        },
        
        _setTheme: function(value) {
        	value = value || 
            		this.element.data('theme') || 
            		this.element.closest(':jqmData(theme)').attr('data-theme') || 
            		'b';
			this.bar.addClass("ui-bar-" + value);
        },
        
        destroy: function() {
        	this.html.detach();
        }      
    }); /* End of widget */

    // auto self-init widgets
    $(document).bind("pagecreate", function (e) {
        $(e.target).find(":jqmData(role='progressbar')").progressbar();
    });

})(jQuery, this);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Rijubrata Bhaumik <rijubrata.bhaumik@intel.com>
 */

// Displays a progressbar element in a dialog
// For details refer to progressbar
// The external process is supposed to call the progressbar_dialog
// e.g. $('#myprogressbar_dialog').progressbar_dialog('value', someValue);
//
// Options:
//
//     value	: starting value, default is 0
//	   max		: maximum value, default is 100

(function ($, window, undefined) {
    $.widget("todons.progressbar_dialog", $.todons.widgetex, {
        options: {
            value: 0,
            max: 100
        },

        _htmlProto: {
source:

$("<div><div class='ui-progressbar-dialog'>" +
  "	<div class='ui-upper-progressbar-container'>" +
  "		<div class='ui-text1'>TextText...</div>" +
  "		<div class='ui-progressbar_dialog' data-role='progressbar'></div>" +
  "		<span class='ui-text2'>Text </span>" +
  "		<span class='ui-text3'>TextTextText</span>	" +
  "	</div>" +
  "	<div class='ui-cancel-container'>" +
  "		<a href='#' class='ui-cancel-button ui-corner-all' data-role='button' data-inline='true' data-rel='back'>" +
  "			Cancel" +
  "		</a>" +
  "	</div>" +
  "</div>" +
  "</div>")
,            ui: {
                dialogContainer:       "div.ui-progressbar-dialog", // Note: dash vs. underscore!
                progressBar_in_dialog: "div.ui-progressbar_dialog"
            }
        },

        _create: function () {
            this._ui.dialogContainer.insertBefore(this.element);
            this._ui.progressBar_in_dialog.progressbar();
        },

        value: function( newValue ) {
            this._ui.progressBar_in_dialog.progressbar('value', newValue);
        },

        getValue: function () {
            return this._ui.progressBar_in_dialog.progressbar('value');
        }

    }); /* End of widget */

    //auto self-init widgets
    $(document).bind("pagecreate", function (e) {
        $(e.target).find(":jqmData(role='progressbar_dialog')").progressbar_dialog();
    });

})(jQuery, this);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// shortcutscroll is a scrollview controller, which binds
// a scrollview to a a list of short cuts; the shortcuts are built
// from the text on dividers in the list. Clicking on a shortcut
// instantaneously jumps the scrollview to the selected list divider;
// mouse movements on the shortcut column move the scrollview to the
// list divider matching the text currently under the touch; a popup
// with the text currently under the touch is also displayed.
//
// To apply, add the attribute data-shortcutscroll="true" to a listview
// (a <ul> or <ol> element inside a page). Alternatively, call
// shortcutscroll() on an element.
//
// The closest element with class ui-scrollview-clip is used as the
// scrollview to be controlled.
//
// If a listview has no dividers or a single divider, the widget won't
// display.

(function( $, undefined ) {

$.widget( "todons.shortcutscroll", $.mobile.widget, {
    options: {
        initSelector: ":jqmData(shortcutscroll)"
    },

    _create: function () {
        var $el = this.element,
            self = this,
            $popup,
            page = $el.closest(':jqmData(role="page")');

        this.scrollview = $el.closest('.ui-scrollview-clip');
        this.shortcutsContainer = $('<div class="ui-shortcutscroll"/>');
        this.shortcutsList = $('<ul></ul>');

        // popup for the hovering character
        this.shortcutsContainer.append($('<div class="ui-shortcutscroll-popup"></div>'));
        $popup = this.shortcutsContainer.find('.ui-shortcutscroll-popup');

        this.shortcutsContainer.append(this.shortcutsList);
        this.scrollview.append(this.shortcutsContainer);

        // find the bottom of the last item in the listview
        this.lastListItem = $el.children().last();

        // remove scrollbars from scrollview
        this.scrollview.find('.ui-scrollbar').hide();

        var jumpToDivider = function(divider) {
            // get the vertical position of the divider (so we can
            // scroll to it)
            var dividerY = $(divider).position().top;

            // find the bottom of the last list item
            var bottomOffset = self.lastListItem.outerHeight(true) +
                               self.lastListItem.position().top;

            var scrollviewHeight = self.scrollview.height();

            // check that after the candidate scroll, the bottom of the
            // last item will still be at the bottom of the scroll view
            // and not some way up the page
            var maxScroll = bottomOffset - scrollviewHeight;
            dividerY = (dividerY > maxScroll ? maxScroll : dividerY);

            // don't apply a negative scroll, as this means the
            // divider should already be visible
            dividerY = Math.max(dividerY, 0);

            // apply the scroll
            self.scrollview.scrollview('scrollTo', 0, -dividerY);

            var dstOffset = self.scrollview.offset();
            $popup.text($(divider).text())
                  .offset({left : dstOffset.left + (self.scrollview.width()  - $popup.width())  / 2,
                           top  : dstOffset.top  + (self.scrollview.height() - $popup.height()) / 2})
                  .show();
        };

        this.shortcutsList
        // bind mouse over so it moves the scroller to the divider
        .bind('touchstart mousedown vmousedown touchmove vmousemove vmouseover', function (e) {
            // Get coords relative to the element
            var coords = $.mobile.todons.targetRelativeCoordsFromEvent(e);
            var shortcutsListOffset = self.shortcutsList.offset();

            // If the element is a list item, get coordinates relative to the shortcuts list
            if (e.target.tagName.toLowerCase() === "li") {
                coords.x += $(e.target).offset().left - shortcutsListOffset.left;
                coords.y += $(e.target).offset().top  - shortcutsListOffset.top;
            }

            // Hit test each list item
            self.shortcutsList.find('li').each(function() {
                var listItem = $(this),
                    l = listItem.offset().left - shortcutsListOffset.left,
                    t = listItem.offset().top  - shortcutsListOffset.top,
                    r = l + Math.abs(listItem.outerWidth(true)),
                    b = t + Math.abs(listItem.outerHeight(true));

                if (coords.x >= l && coords.x <= r && coords.y >= t && coords.y <= b) {
                    jumpToDivider($(listItem.data('divider')));
                    return false;
                }
                return true;
            });

            e.preventDefault();
            e.stopPropagation();
        })
        // bind mouseout of the shortcutscroll container to remove popup
        .bind('touchend mouseup vmouseup vmouseout', function () {
            $popup.hide();
        });

        if (page && !(page.is(':visible'))) {
            page.bind('pageshow', function () { self.refresh(); });
        }
        else {
            this.refresh();
        }

        // refresh the list when dividers are filtered out
        $el.bind('updatelayout', function () {
            self.refresh();
        });
    },

    refresh: function () {
        var self = this,
            shortcutsTop,
            minClipHeight;

        this.shortcutsList.find('li').remove();

        // get all the dividers from the list and turn them into
        // shortcuts
        var dividers = this.element.find('.ui-li-divider');

        // get all the list items
        var listItems = this.element.find('li:not(.ui-li-divider))');

        // only use visible dividers
        dividers = dividers.filter(':visible');
        listItems = listItems.filter(':visible');

        if (dividers.length < 2) {
            this.shortcutsList.hide();
            return;
        }

        this.shortcutsList.show();

        this.lastListItem = listItems.last();

        dividers.each(function (index, divider) {
            self.shortcutsList.append($('<li>' + $(divider).text() + '</li>')
                              .data('divider', divider));
        });

        // position the shortcut flush with the top of the first
        // list divider
        shortcutsTop = dividers.first().position().top;
        this.shortcutsContainer.css('top', shortcutsTop);

        // make the scrollview clip tall enough to show the whole of
        // the shortcutslist
        minClipHeight = shortcutsTop + this.shortcutsContainer.outerHeight() + 'px';
        this.scrollview.css('min-height', minClipHeight);
    }
});

$(document).bind( "pagecreate create", function (e) {
    $($.todons.shortcutscroll.prototype.options.initSelector, e.target)
    .not(":jqmData(role='none'), :jqmData(role='nojs')")
    .shortcutscroll();
});

})( jQuery );
/*
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 *          Salvatore Iovene <salvatore.iovene@intel.com
 */

(function ($, undefined) {

$.widget("mobile.simple", $.mobile.widget, {
    // The `options` are a way to store widget specific settings.
    // Technically, this is nothing more than a dictionary can be accessed
    // globally throughout the widget's scope.
    options: {
        // The `initSelector` is used at the bottom of this file, when we
        // actually bind any HTML element that contains the attribute
        // `data-role="simple"` to this widget.
        initSelector: ":jqmData(role='simple')",

        // We want to let the user specify a theme for this widget. See:
        // http://jquerymobile.com/demos/1.0/docs/api/themes.html
        theme: null,

        // To demostrate some methods implemented when writing a JQM widget,
        // we're adding a number that increases by one regularly. The
        // following setting is the interval of time between updates.
        updateInterval: 1000
    },

    // Let's store here some constants for aid.
    _constants: {
        status_stopped: 0,
        status_running: 1,
        startstop_class: 'startstopbtn'
    },

    // Sometimes there are variables that you will need all over your widget,
    // and for that you can use a `_data` dictionary (although it can be
    // named whatever you want.)
    // It really is nothing but a big global container, but we don't want to
    // pollute `options` with things that are not settings.
    _data: {
        // We store our timer here, because we will need to clear it later.
        timer: 0,

        // We store the status of our timer here (stopped or running).
        status: 0
    },

    // We use this function to change the text on the Start/Stop counter
    // button when the status changes.
    _setButtonText: function(self, text) {
        $span = self.element.find(
            'a.' + self._constants.startstop_class + ' span.ui-btn-text')
        $span.text(text);
    },

    // This will reset the number to its initial value.
    _reset: function(self) {
        // Let's start with 0.
        $number = self.element.find('.number')
        $number.text(0);
    },

    // This is the function that will increase our number.
    _increaseNumber: function(self) {
        $number = self.element.find('.number')

        // Let's get and increse the number.
        value = parseInt($number.text());
        $number.text(value + 1);

        return true;
    },

    // This will start our timer.
    _start: function(self) {
        self._data.timer = setInterval(
            function() {
                return self._increaseNumber(self);
            },
            self.options.updateInterval);
        self._data.status = self._constants.status_running;
        self._setButtonText(self, "Stop counter");
    },

    // This will stop our timer.
    _stop: function(self) {
        clearTimeout(self._data.timer);
        self._data.status = self._constants.status_stopped;
        self._setButtonText(self, "Start counter");
    },

    // The `_create` method is called when the widget is created. This is the
    // place in which the following tasks are usually performed:
    // * Initialization of settings
    // * Creation and initialization of DOM elements
    // * Any other code that should be run at the beginning of the life cycle
    //   of the widget.
    _create: function() {
        // We store `this` in a variable because we will need it later in
        // callbacks functions, when `this` will be something else.
        var self = this,

        // We need the page so that we can bind actions to the page being
        // shown or closed.
        page = self.element.closest('.ui-page');

        // `this.element` is the element to which our `options.initSelector`
        // is applied in the HTML code. Here we're starting to add some more
        // HTML to it.
        self.element.append(
            '<p>This is the Simple Widget. It can be used as a starting ' +
            'point or learning aid for building new JQM widgets.</p>');

        // For the purposes of this widget, we will here add some text that
        // contains a number that we will increase regularly, with a timer.
        // We will use the `updateInterval` setting defined in `options`.
        $number = $('<span class="number">');

        // Here we style our number a little.
        $number.css({
            'text-align' : 'center',
            'font-size'  : '2em',
            'font-weight': 'bold',
            'display'    : 'block',
            'line-height': '2em'
        });

        // Let's also add it to the DOM.
        self.element.append($number);

        // Let's add a button that starts the timer, and theme it correctly.
        $button = $('<a href="#">Start counter</a>');
        $button.buttonMarkup({theme: self.options.theme});
        $button.addClass(self._constants.startstop_class);
        $button.attr('data-' + ($.mobile.ns || "") + 'role', 'button');
        self.element.append($button);

        $button.bind('vclick', function(event) {
            if (self._data.status == 0) {
                // Timer is not running, let's start it.
                self._start(self);
            } else {
                // Timer is running, let's stop it.
                self._stop(self);
            }

            event.stopPropagation(); 
        });

        if (page) {
            // Before the animation for hiding the page starts, let's stop
            // the timeout.
            page.bind('pagebeforehide', function() {
                self._stop(self);
            });

            // After the animation for hiding the page ends, we can reset the
            // number to 0. We didn't do it in `pagebeforehide` because we
            // didn't want the user to see the number change to zero before
            // their eyes.
            page.bind('pagehide', function() {
                self._reset(self);
            });

            // Each time the page is shown, we start over.
            page.bind('pageshow', function() {
                self._reset(self);
            });
        }
    },

    // The `_destroy` method is the place in which you should release and
    // reset the things you've used.
    _destroy: function() {
        // Let's remove the HTML we have created, so everything is created
        // from scratch when we start again.
        this.html.remove();
    },

    _setOption: function(key, value) {
        if (value !== this.options[key]) {
            switch (key) {
            case 'updateInterval':
                this.options.updateInterval = value;
                break;
            }
            this.refresh();
        }
    },

    // This method updates the widget to reflect the changes that have
    // happened outside of our control. In this case, we're going to imagine
    // that a user changed our `updateInterval`. If that happens, we can
    // reset our timer.
    refresh: function() {
        if (this._data.status == this._constants.status_running) {
            this._stop();
            this._start();
        }
    }
});

$(document).bind("pagecreate create", function(e) {
    $($.mobile.simple.prototype.options.initSelector, e.target).simple();
});

})(jQuery);

/* vim:ft=javascript.jquery:ai:et:sw=4:ts=4:
 */
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Max Waterman <max.waterman@intel.com>
 */

// Displays the given image resizing it to fit its container or the browser
// while maintaining the original aspect ratio.
//
// To make a singleimagedisplay element use the singleimagedisplay() method
// on an img element or add data-role='singleimagedisplay' to an img tag.
//
//     <img data-role="singleimagedisplay" data-src="myimage.jpg" />
//
// Note that you should not set the src on the img directly.
//
// To set the source image, use a data-src attribute on the img. This
// enables the widget to handle loading the image and displaying a
// substitute if the image fails to load.
//
// Options:
//
//    source: String; path to the src for the image; initial value can
//                    be set using data-src on the img element.
//    noContent: String; path to an image to show when an error occurs
//                while loading the image.
//
// Either option can be changed at runtime with the
// singleimagedisplay('option', 'name', 'value') method

(function ($, undefined) {
    $.widget("todons.singleimagedisplay", $.mobile.widget, {
        options: {
            initSelector: 'img:jqmData(role=singleimagedisplay)',
            noContent: null,
            source: null
        },

        image: null,
        imageParent: null,
        cover: null,
        usingNoContents: false,

        _setImgSrc: function () {
            if (this.usingNoContents) {
                this._showNoContents();
            } else {
                var self = this;
                // if there is a source image, show it
                this.image.attr('src', this.options.source);
                this.image.error( function() { self._imageErrorHandler() } );
                this.cover.hide();
                this.imageParent.append(this.image);
                this.image.show();
            }
        },

        _imageErrorHandler: function () {
            this.usingNoContents = true;
            this._showNoContents();
        },

        _showNoContents: function () {
            if (!this.options.noContent) {
                this.resize( this.cover );

                this.image.detach();
                this.cover.show();
            }
            else {
                // unbind the error handler, otherwise we could
                // get into an infinite loop if the custom noContent
                // image is missing too
                this.image.unbind('error');

                this.image.attr('src', this.options.noContent);
                this.cover.hide();
                this.imageParent.append(this.image);
                this.resize( this.image );
                this.image.show();
            }
        },

        _create: function() {
            var self = this;

            // make a copy of image element
            this.image = this.element.clone()
                .removeAttr('data-role')
                .removeAttr('id')
                .addClass('ui-singleimagedisplay')
                .css('float','left'); // so the cover overlays the image
            this.imageParent = this.element.parent();

            this.element.css('float','left'); // so the cover overlays the other elements

            this.cover = ($('<div class="ui-singleimagedisplay-nocontent"/>'));
            this.cover.hide(); //this.cover.css('visibility','hidden');
            this.imageParent.append(this.cover);

            this.options.source = this.element.jqmData('src');

            // when the image is loaded, resize it
            this.image.load(function () {
                self.usingNoContents = false;
                self.resize( self.image );
                self.image.show();
            });

            // when the image fails to load, substitute noContent
            this.image.error( function() { self._imageErrorHandler() } );

            // set the src for the image
            this._setImgSrc();

            // resize the image immediately if it is visible
            if (self.image.is(':visible')) {
                self.resize( self.image );
            }

            // when the page is shown, resize the image
            // note that this widget is created on pagecreate
            var page = this.element.closest('.ui-page');
            if (page) {
                page.bind('pageshow', function() {
                    if (self.usingNoContents) {
                        self.resize( self.cover );
                    } else {
                        self.resize( self.image );
                    }
                });
            }

            // when the window is resized, resize the image
            $(window).resize( function() {
                if (self.usingNoContents) {
                    self.resize( self.cover );
                } else {
                    self.resize( self.image );
                }
            });
        },

        resize: function(elementToResize) {
            var finalWidth  = 0;
            var finalHeight = 0;

            var measuringImg = $('<img/>')
                .css( 'width', '0px' )
                .css( 'height', '0px' )
                .css( 'opacity', '0' )
                .css( 'width', 'inherit' )
                .css( 'height', 'inherit' )
                .insertAfter(elementToResize);

            var elementIsImage = elementToResize[0].nodeName==="IMG";
            var realImageWidth  =
                (elementIsImage?
                 elementToResize[0].naturalWidth
                 :elementToResize.width());
            var realImageHeight =
                (elementIsImage?
                 elementToResize[0].naturalHeight
                 :elementToResize.height());
            var realImageArea = realImageWidth*realImageHeight;
            var realImageAspectRatio =
                (realImageArea==0)?1.0:
                (realImageWidth/realImageHeight);

            var windowWidth  = window.innerWidth;
            var windowHeight = window.innerHeight;

            var measuringImageWidth = measuringImg.width();
            var measuringImageHeight = measuringImg.height();

            measuringImg.remove();

            var insideContainer = (measuringImageWidth>0) || (measuringImageHeight>0);

            if (insideContainer) {
                finalWidth = measuringImageWidth;
                finalHeight = measuringImageHeight;
            } else {
                finalWidth = windowWidth;
                finalHeight = windowHeight;
            }

            // restore aspect ratio
            if (finalWidth/finalHeight > realImageAspectRatio) {
                finalWidth = finalHeight*realImageAspectRatio;
            } else {
                finalHeight = finalWidth/realImageAspectRatio;
            }

            // assign the final size
            elementToResize.width( finalWidth );
            elementToResize.height( finalHeight );
        },

        _setOption: function(key, value) {
            if (value == this.options[key]) {
                return;
            }

            switch (key) {
            case "noContent":
                this.options.noContent = value;
                this._setImgSrc();
                break;
            case "source":
                this.options.source = value;
                this.usingNoContents = false;
                this._setImgSrc();
                this.resize( this.image );
                break;
            default:
                break;
            }
        }

    });

    // initialise singleimagedisplays with our own singleimagedisplay
    $(document).bind("pagecreate", function(e) {
        $($.todons.singleimagedisplay.prototype.options.initSelector, e.target)
        .singleimagedisplay();
    });

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Max Waterman <max.waterman@intel.com>
 */

// Todonsslider modifies the JQuery Mobile slider and is created in the same way.
//
// See the JQuery Mobile slider widget for more information :
//     http://jquerymobile.com/demos/1.0a4.1/docs/forms/forms-slider.html
//
// The JQuery Mobile slider option:
//     theme: specify the theme using the 'data-theme' attribute
//
// Options:
//     theme: string; the theme to use if none is specified using the 'data-theme' attribute
//            default: 'c'
//     popupEnabled: boolean; controls whether the popup is displayed or not
//                   specify if the popup is enabled using the 'data-popupEnabled' attribute
//                   set from javascript using .todonsslider('option','popupEnabled',newValue)
//     initDeselector: string; the selector that is used to determine which elements should be
//                     regular jQuery Mobile sliders
//                     default: 'select, .useJqmSlider'
//
// Events:
//     changed: triggers when the value is changed (rather than when the handle is moved)
//
// Examples:
//
//     <a href="#" id="popupEnabler" data-role="button" data-inline="true">Enable popup</a>
//     <a href="#" id="popupDisabler" data-role="button" data-inline="true">Disable popup</a>
//     <div data-role="fieldcontain">
//         <input id="mySlider" data-theme='a' data-popupenabled='false' type="range" name="slider" value="7" min="0" max="9" />
//     </div>
//     <div data-role="fieldcontain">
//         <input id="mySlider2" type="range" name="slider" value="77" min="0" max="777" />
//     </div>
//
//     // disable popup from javascript
//     $('#mySlider').todonsslider('option','popupEnabled',false);
//
//     // from buttons
//     $('#popupEnabler').bind('vclick', function() {
//         $('#mySlider').todonsslider('option','popupEnabled',true);
//     });
//     $('#popupDisabler').bind('vclick', function() {
//         $('#mySlider').todonsslider('option','popupEnabled',false);
//     });
//     <div data-role="fieldcontain">
//         <label for="myJqmSlider">Use jQuery Mobile slider</label>
//         <input id="myJqmSlider" name="myJqmSlider" type="range" value="77" min="0" max="99" class="useJqmSlider"/>
//     </div>

(function ($, window, undefined) {
    $.widget("todons.todonsslider", $.mobile.widget, {
        options: {
            theme: 'c',
            popupEnabled: true,
            initDeselector: 'select, .useJqmSlider'
        },

        popup: null,
        handle: null,
        handleText: null,

        _create: function() {
            this.currentValue = null;
            this.popupVisible = false;

            var self = this,
                inputElement = $(this.element),
                themeClass,
                slider,
                showPopup,
                hidePopup,
                positionPopup,
                updateSlider;

            // apply jqm slider
            inputElement.slider();

            // hide the slider input element proper
            inputElement.hide();

            // theming; override default with the slider's theme if present
            this.options.theme = this.element.data('theme') || this.options.theme;
            themeClass = 'ui-body-' + this.options.theme;
            self.popup = $('<div class="' + themeClass + ' ui-slider-popup ui-shadow"></div>');

            // set the popupEnabled according to the html attribute
            var popupEnabledAttr = inputElement.attr('data-popupenabled');
            if ( popupEnabledAttr !== undefined ) {
                self.options.popupEnabled = popupEnabledAttr==='true';
            }

            // get the actual slider added by jqm
            slider = inputElement.next('.ui-slider');

            // get the handle
            self.handle = slider.find('.ui-slider-handle');

            // remove the rounded corners from the slider and its children
            slider.removeClass('ui-btn-corner-all');
            slider.find('*').removeClass('ui-btn-corner-all');

            // add a popup element (hidden initially)
            slider.before(self.popup);
            self.popup.hide();

            // get the element where value can be displayed
            self.handleText = slider.find('.ui-btn-text');

            // set initial value
            self.updateSlider();

            // bind to changes in the slider's value to update handle text
            this.element.bind('change', function () {
                self.updateSlider();
            });

            // bind clicks on the handle to show the popup
            self.handle.bind('vmousedown', function () {
                self.showPopup();
            });

            // watch events on the document to turn off the slider popup
            slider.add(document).bind('vmouseup', function () {
                self.hidePopup();
            });
        },

        // position the popup centered 5px above the handle
        positionPopup: function () {
            var dstOffset = this.handle.offset();
            this.popup.offset({
                left: dstOffset.left + (this.handle.width() - this.popup.width()) / 2,
                top:  dstOffset.top  - this.popup.outerHeight() - 5});
        },

        // show value on the handle and in popup
        updateSlider: function () {
            this.positionPopup();

            // remove the title attribute from the handle (which is
            // responsible for the annoying tooltip); NB we have
            // to do it here as the jqm slider sets it every time
            // the slider's value changes :(
            this.handle.removeAttr('title');

            var newValue = this.element.val();

            if (newValue !== this.currentValue) {
                this.currentValue = newValue;
                this.handleText.html(newValue);
                this.popup.html(newValue);
                this.element.trigger('update', newValue);
            }
        },

        // show the popup
        showPopup: function () {
            var needToShow = (this.options.popupEnabled && !this.popupVisible);
            if (needToShow) {
                this.handleText.hide();
                this.popup.show();
                this.popupVisible = true;
            }
        },

        // hide the popup
        hidePopup: function () {
            var needToHide = (this.options.popupEnabled && this.popupVisible);
            if (needToHide) {
                this.handleText.show();
                this.popup.hide();
                this.popupVisible = false;
            }
        },

        _setOption: function(key, value) {
            var needToChange = value !== this.options[key];
            switch (key) {
            case 'popupEnabled':
                if (needToChange) {
                    this.options.popupEnabled = value;
                    if (this.options.popupEnabled) {
                        this.updateSlider();
                    } else {
                        this.hidePopup();
                    }
                }
                break;
            }
        }

    });

    // stop jqm from initialising sliders
    $(document).bind("pagebeforecreate", function (e) {
        if ($.data(window, "jqmSliderInitSelector") === undefined ) {
            $.data(window,"jqmSliderInitSelector", $.mobile.slider.prototype.options.initSelector);
            $.mobile.slider.prototype.options.initSelector = null;
        }
    });

    // initialise sliders with our own slider
    $(document).bind("pagecreate", function(e) {
        var jqmSliderInitSelector = $.data(window,"jqmSliderInitSelector");
        $(e.target).find(jqmSliderInitSelector).not($.todons.todonsslider.prototype.options.initDeselector).todonsslider();
        $(e.target).find(jqmSliderInitSelector).filter('select').slider();
    });

})(jQuery, this);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Kalyan Kondapally <kalyan.kondapally@intel.com>,
 *          Elliot Smith <elliot.smith@intel.com>
 */

// Widget which turns a list into a "swipe list":
// i.e. each list item has a sliding "cover" which can be swiped
// to the right (to reveal buttons underneath) or left (to
// cover the buttons again). Clicking on a button under a swipelist
// also moves the cover back to the left.
//
// To create a swipelist, you need markup like this:
//
// <pre>
// &lt;ul data-role="swipelist"&gt;<br/>
//     &lt;li&gt;<br/>
//         &lt;div class="ui-grid-b"&gt;<br/>
//             &lt;div class="ui-block-a"&gt;<br/>
//                 &lt;a href="#" data-role="button" data-theme="a"&gt;Twitter&lt;/a&gt;<br/>
//             &lt;/div&gt;<br/>
//             &lt;div class="ui-block-b"&gt;<br/>
//                 &lt;a href="#" data-role="button" data-theme="b"&gt;FaceBook&lt;/a&gt;<br/>
//             &lt;/div&gt;<br/>
//             &lt;div class="ui-block-c"&gt;<br/>
//                 &lt;a href="#" data-role="button" data-theme="c"&gt;Google+&lt;/a&gt;<br/>
//             &lt;/div&gt;<br/>
//         &lt;/div&gt;<br/>
//         &lt;div data-role="swipelist-item-cover"&gt;Nigel&lt;/div&gt;<br/>
//     &lt;/li&gt;<br/>
//     ...<br/>
// &lt;/ul&gt;
// </pre>
//
// In this case, the cover is over a grid of buttons;
// but it is should also be possible to use other types of markup under the
// list items.
//
// Note the use of a separate div, parented by the li element, marked
// up with data-role="swipelist-item-cover". This div will usually
// contain text. If you want other elements in your swipelist covers,
// you may need to style them yourself. Because the covers aren't
// technically list items, you may need to do some work to make them
// look right.
//
// WARNING: This doesn't work well inside a scrollview widget, as
// the touch events currently interfere with each other badly (e.g.
// a swipe will work but cause a scroll as well).
//
// Theme: default is to use the theme on the target element,
// theme passed in options, parent theme, or 'c' if none of the above.
// If list items are themed individually, the cover will pick up the
// theme of the list item which is its parent.
//
// Events:
//
//   animationComplete: Triggered by a cover when it finishes sliding
//                      (to either the right or left).
(function ($) {

$.widget("todons.swipelist", $.mobile.widget, {
    options: {
        theme: null
    },

    _create: function () {
        // use the theme set on the element, set in options,
        // the parent theme, or 'c' (in that order of preference)
        var theme = this.element.jqmData('theme') ||
                    this.options.theme ||
                    this.element.parent().jqmData('theme') ||
                    'c';

        this.options.theme = theme;

        this.refresh();
    },

    refresh: function () {
        this._cleanupDom();

        var self = this,
            defaultCoverTheme,
            covers;

        defaultCoverTheme = 'ui-body-' + this.options.theme;

        // swipelist is a listview
        if (!this.element.hasClass('ui-listview')) {
            this.element.listview();
        }

        this.element.addClass('ui-swipelist');

        // get the list item covers
        covers = this.element.find(':jqmData(role="swipelist-item-cover")');

        covers.each(function () {
            var cover = $(this);
            var coverTheme = defaultCoverTheme;

            // get the parent li element and add classes
            var item = cover.closest('li');

            // add swipelist CSS classes
            item.addClass('ui-swipelist-item');

            cover.addClass('ui-swipelist-item-cover');

            // set swatch on cover: if the nearest list item has
            // a swatch set on it, that will be used; otherwise, use
            // the swatch set for the swipelist
            var itemHasThemeClass = item.attr('class')
                                        .match(/ui\-body\-[a-z]|ui\-bar\-[a-z]/);

            if (itemHasThemeClass) {
                coverTheme = itemHasThemeClass[0];
            }

            cover.addClass(coverTheme);

            // wrap inner HTML (so it can potentially be styled)
            if (cover.has('.ui-swipelist-item-cover-inner').length === 0) {
                cover.wrapInner($('<span/>').addClass('ui-swipelist-item-cover-inner'));
            }

            // bind to swipe events on the cover and the item
            if (!(cover.data('animateRight') && cover.data('animateLeft'))) {
                cover.data('animateRight', function () {
                    self._animateCover(cover, 100);
                });

                cover.data('animateLeft', function () {
                    self._animateCover(cover, 0);
                });
            }

            // bind to synthetic events
            item.bind('swipeleft', cover.data('animateLeft'));
            cover.bind('swiperight', cover.data('animateRight'));

            // any clicks on buttons inside the item also trigger
            // the cover to slide back to the left
            item.find('.ui-btn').bind('click', cover.data('animateLeft'));
        });
    },

    _cleanupDom: function () {
        var self = this,
            defaultCoverTheme,
            covers;

        defaultCoverTheme = 'ui-body-' + this.options.theme;

        this.element.removeClass('ui-swipelist');

        // get the list item covers
        covers = this.element.find(':jqmData(role="swipelist-item-cover")');

        covers.each(function () {
            var cover = $(this);
            var coverTheme = defaultCoverTheme;
            var text, wrapper;

            // get the parent li element and add classes
            var item = cover.closest('li');

            // remove swipelist CSS classes
            item.removeClass('ui-swipelist-item');
            cover.removeClass('ui-swipelist-item-cover');

            // remove swatch from cover: if the nearest list item has
            // a swatch set on it, that will be used; otherwise, use
            // the swatch set for the swipelist
            var itemClass = item.attr('class');
            var itemHasThemeClass = itemClass &&
                                    itemClass.match(/ui\-body\-[a-z]|ui\-bar\-[a-z]/);

            if (itemHasThemeClass) {
                coverTheme = itemHasThemeClass[0];
            }

            cover.removeClass(coverTheme);

            // remove wrapper HTML
            wrapper = cover.find('.ui-swipelist-item-cover-inner');

            wrapper.children().unwrap();

            text = wrapper.text()

            if (text) {
              cover.append(text);
              wrapper.remove();
            }

            // unbind swipe events
            if (cover.data('animateRight') && cover.data('animateLeft')) {
                cover.unbind('swiperight', cover.data('animateRight'));
                item.unbind('swipeleft', cover.data('animateLeft'));

                // unbind clicks on buttons inside the item
                item.find('.ui-btn').unbind('click', cover.data('animateLeft'));

                cover.data('animateRight', null);
                cover.data('animateLeft', null);
            }
        });
    },

    // NB I tried to use CSS animations for this, but the performance
    // and appearance was terrible on Android 2.2 browser;
    // so I reverted to jQuery animations
    //
    // once the cover animation is done, the cover emits an
    // animationComplete event
    _animateCover: function (cover, leftPercentage) {
        var animationOptions = {
          easing: 'linear',
          duration: 'fast',
          queue: true,
          complete: function () {
              cover.trigger('animationComplete');
          }
        };

        cover.stop();
        cover.clearQueue();
        cover.animate({left: '' + leftPercentage + '%'}, animationOptions);
    },

    destroy: function () {
      this._cleanupDom();
    }

});

$(document).bind("pagecreate", function (e) {
    $(e.target).find(":jqmData(role='swipelist')").swipelist();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 */

// Displays a simple two-state switch.
//
// To apply, add the attribute data-role="switch" to a <div>
// element inside a page. Alternatively, call switch()
// on an element, like this :
//
//     $("#myswitch").toggleswitch();
// where the html might be :
//     <div id="myswitch"></div>
//
// Options:
//     checked: Boolean; the state of the switch
//     Default: true (up)
//
// Events:
//     changed: Emitted when the switch is changed

(function($, undefined) {

$.widget("todons.toggleswitch", $.todons.widgetex, {
    options: {
        checked: true,
        initSelector: ":jqmData(role='toggleswitch')"
    },

    _htmlProto: {
source:

$("<div><div id='toggleswitch' class='ui-toggleswitch'>" +
  "    <div id='toggleswitch-inner-active' class='toggleswitch-inner-active ui-btn ui-btn-corner-all ui-shadow ui-btn-down-c ui-btn-active'>" +
  "        <a href='#' class='toggleswitch-button-inside'></a>" +
  "        <a href='#' class='toggleswitch-button-inside toggleswitch-button-transparent'></a>" +
  "    </div>" +
  "    <div id='toggleswitch-inner-normal' class='ui-btn ui-btn-corner-all ui-shadow ui-btn-down-c'>" +
  "        <a id='toggleswitch-button-t' href='#' class='toggleswitch-button-inside toggleswitch-button-transparent'></a>" +
  "        <a id='toggleswitch-button-f' href='#' class='toggleswitch-button-inside'></a>" +
  "    </div>" +
  "    <a id='toggleswitch-button-outside-ref'  href='#' data-role='button' class='toggleswitch-button-outside toggleswitch-button-transparent'></a>" +
  "    <a id='toggleswitch-button-outside-real' href='#' data-role='button' class='toggleswitch-button-outside toggleswitch-button-transparent'></a>" +
  "</div>" +
  "</div>")
,        ui: {
            outer:            "#toggleswitch",
            normalBackground: "#toggleswitch-inner-normal",
            activeBackground: "#toggleswitch-inner-active",
            tButton:          "#toggleswitch-button-t",
            fButton:          "#toggleswitch-button-f",
            realButton:       "#toggleswitch-button-outside-real",
            refButton:        "#toggleswitch-button-outside-ref"
        }
    },

    _value: {
        attr: "data-" + ($.mobile.ns || "") + "checked",
        signal: "changed"
    },

    _create: function() {
        var self = this;

        this.element.after(this._ui.outer);
        this.element.css("display", "none");
        this._ui.outer.find("a").buttonMarkup({inline: true, corners: true});

        // After adding the button markup, make everything except the real button transparent
        this._ui.normalBackground.find("*").css("opacity", 0.0);
        this._ui.activeBackground.find("*").css("opacity", 0.0);
        this._ui.refButton.css("opacity", 0.0);
        this._ui.refButton.find("*").css("opacity", 0.0);

        $.extend(this, {
            _realized: false
        });

        this._ui.realButton
            .add(this._ui.normalBackground)
            .bind("vclick", function(e) {
                self._setChecked(!(self.options.checked));
                e.stopPropagation();
            });
    },

    _realize: function() {
        var dstOffset = this._ui[(this.options.checked ? "t" : "f") + "Button"].offset()
        this._ui.refButton.offset(dstOffset);
        this._ui.realButton
            .offset(dstOffset)
            .removeClass("toggleswitch-button-transparent");
        this._ui.activeBackground.find("a").addClass("toggleswitch-button-transparent");
        this._ui.normalBackground.find("a").addClass("toggleswitch-button-transparent");
        this._ui.normalBackground.css({"opacity": this.options.checked ? 0.0 : 1.0});
        this._ui.activeBackground.css({"opacity": this.options.checked ? 1.0 : 0.0});

        this._realized = true;
    },

    _setChecked: function(checked) {
        if (this.options.checked != checked) {

            if (this._realized) {
                this._ui.refButton.offset(this._ui[(checked ? "t" : "f") + "Button"].offset());
                this._ui.realButton.animate({"top": this._ui.refButton.position().top});
            }

            this._ui.normalBackground.animate({"opacity": checked ? 0.0 : 1.0});
            this._ui.activeBackground.animate({"opacity": checked ? 1.0 : 0.0});

            this.options.checked = checked;
            this.element.attr("data-" + ($.mobile.ns || "") + "checked", checked);

            this._setValue(checked);
        }
    }
});

$(document).bind("pagecreate create", function(e) {
    $($.todons.toggleswitch.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .toggleswitch();
});

})(jQuery);
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

(function($, undefined) {

$.widget( "todons.triangle", $.todons.widgetex, {
    options: {
        extraClass: "",
        offset: 50,
        color: undefined,
        location: "top",
        initSelector: ":jqmData(role='triangle')"
    },

    _create: function() {
        var triangle = $("<div></div>", {"class" : "ui-triangle"});

        $.extend(this, {
            _realized: false,
            _triangle: triangle
        });

        this.element.css("position", "relative").append(triangle);
    },

    // The widget needs to be realized for this function/
    _setBorders: function() {
        this._triangle.css(
            (this.options.location === "top")
                ? {
                    "border-left-width"   : this.element.height(),
                    "border-top-width"    : 0,
                    "border-right-width"  : this.element.height(),
                    "border-bottom-width" : this.element.height(),
                    "border-left-color"   : "rgba(0, 0, 0, 0)",
                    "border-right-color"  : "rgba(0, 0, 0, 0)"
                } :
            (this.options.location === "bottom")
                ? {
                    "border-left-width"   : this.element.height(),
                    "border-top-width"    : this.element.height(),
                    "border-right-width"  : this.element.height(),
                    "border-bottom-width" : 0,
                    "border-left-color"   : "rgba(0, 0, 0, 0)",
                    "border-right-color"  : "rgba(0, 0, 0, 0)"
                }
                : {});
    },

    _realize: function() {
        this._setBorders();
        this._triangle.css("margin-left", -this.element.height());
        this._setOffset(this.options.offset, true);
        this._realized = true;
    },

    _setOffset: function(value) {
        this._triangle.css("left", value);
        this.options.offset = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "offset", value);
    },

    _setExtraClass: function(value) {
        this._triangle.addClass(value);
        this.options.extraClass = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "extra-class", value);
    },

    _setColor: function(value) {
        this._triangle.css("border-bottom-color", value);
        this.options.color = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "color", value);
    },

    _setLocation: function(value) {
        this.options.location = value;
        if (this._realized)
            this._setBorders();
        this.element.attr("data-" + ($.mobile.ns || "") + "location", value);
    }
});

$(document).bind("pagecreate create", function(e) {
    $($.todons.triangle.prototype.options.initSelector, e.target)
        .not(":jqmData(role='none'), :jqmData(role='nojs')")
        .triangle();
});

})(jQuery);
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 */

// Displays a popup window with a visual volume level indicator
// and a speaker icon.
//
// The volume leven can be adjusted using the 'up', 'down', 'home',
// and 'end' keys. 'home' sets the volume to zero, and 'end' set it
// to maximum.
//
// To apply, add the attribute data-role="volumecontrol" to a <div>
// element inside a page. Alternatively, call volumecontrol()
// on an element (see below).
//
// The following options can be set during construction :
//
//     $("myVolumeControl").volumecontrol({volume:5, basicTone:true, title:"Basic Tone"});
//
// or after using the usual jQuery Mobile method, eg to change the title :
//
//     $("myVolumeControl").volumecontrol("option", "title", "Volume");
//
// Options:
//
//    volume : Integer;the volume level to be displayed
//             (0-15 or 0-7 for basicTone)
//             Default: 0
//
//    basicTone : Boolean; display the "basic tone" volume scale,
//                otherwise display the generic one
//                Default: false
//
//    title : String; the title to display at the top of the popupwindow.
//            Default: 'Volume'
//
// Event:
//     volumechanged: triggered when the user changes the volume.

(function( $, undefined ) {

$.widget( "todons.volumecontrol", $.todons.widgetex, {
    options: {
        volume: 0,
        basicTone: false,
        title: "Volume",
        initSelector: ":jqmData(role='volumecontrol')"
    },

    _htmlProto: {
source:

$("<div><div class='ui-volumecontrol ui-corner-all' id='volumecontrol'>" +
  "    <h1 id='volumecontrol-title'></h1>" +
  "    <div class='ui-volumecontrol-icon'></div>" +
  "    <div id='volumecontrol-indicator' class='ui-volumecontrol-indicator'>" +
  "        <div id='volumecontrol-bar' class='ui-volumecontrol-level'></div>" +
  "    </div>" +
  "</div>" +
  "</div>")
,        ui: {
            container: "#volumecontrol",
            volumeImage: "#volumecontrol-indicator",
            bar: "#volumecontrol-bar"
        }
    },

    _value: {
        attr: "data-" + ($.mobile.ns || "") + "volume",
        signal: "volumechanged"
    },

    _create: function() {
        var self = this,
            yCoord = function(volumeImage, e) {
                var target = $(e.target),
                    coords = $.mobile.todons.targetRelativeCoordsFromEvent(e);

                if (target.hasClass("ui-volumecontrol-level"))
                    coords.y += target.offset().top  - volumeImage.offset().top;

                return coords.y;
            };

          this._ui.bar.remove();
          this._ui.container.insertBefore(this.element)
                            .popupwindow({overlayTheme: "", fade: false, shadow: false});
          this.element.css("display", "none");

          $.extend (self, {
              _isOpen: false,
              _dragging: false,
              _realized: false,
              _volumeElemStack: []
          });

          this._ui.container.bind("closed", function(e) {
              self._isOpen = false;
          });

          this._ui.volumeImage.bind("vmousedown", function(e) {
              self._dragging = true;
              self._setVolume((1.0 - yCoord(self._ui.volumeImage, e) / $(this).outerHeight()) * self._maxVolume());
              event.preventDefault();
          });

          this._ui.volumeImage.bind("vmousemove", function(e) {
              if (self._dragging) {
                  self._setVolume((1.0 - yCoord(self._ui.volumeImage, e) / $(this).outerHeight()) * self._maxVolume());
                  event.preventDefault();
              }
          });

          $( document ).bind( "vmouseup", function( event ) {
              if ( self._dragging )
                  self._dragging = false;
          });

          $(document).bind("keydown", function(e) {
              if (self._isOpen) {
                  var maxVolume = self._maxVolume(),
                      newVolume = -1;

                  switch(event.keyCode) {
                      case $.mobile.keyCode.UP:
                      case $.mobile.keyCode.DOWN:
                      case $.mobile.keyCode.HOME:
                      case $.mobile.keyCode.END:
                          event.preventDefault();
                          break;
                  }

                  switch(event.keyCode) {
                      case $.mobile.keyCode.UP:
                          newVolume = Math.min(self.options.volume + 1, maxVolume);
                          break;

                      case $.mobile.keyCode.DOWN:
                          newVolume = Math.max(self.options.volume - 1, 0);
                          break;

                      case $.mobile.keyCode.HOME:
                          newVolume = 0;
                          break;

                      case $.mobile.keyCode.END:
                          newVolume = maxVolume;
                          break;
                  }

                  if (newVolume != -1)
                      self._setVolume(newVolume);
              }
          });
    },

    _realize: function() {
        if (!this._realized)
            this._setVolume(this.options.volume, true);
        this._realized = true;
    },

    _setBasicTone: function(value) {
        while (this._volumeElemStack.length > 0)
            this._volumeElemStack.pop().remove();
        this.options.basicTone = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "basic-tone", value);
        this._setVolume(this.options.volume);
    },

    _setTitle: function(value) {
        this.options.title = value;
        this.element.attr("data-" + ($.mobile.ns || "") + "title", value);
        this._ui.container.find("#volumecontrol-title").text(value);
    },

    _setVolume: function(vol) {
        var newVolume = Math.max(0, Math.min(vol, this._maxVolume())),
            theFloor = Math.floor(newVolume),
            emitSignal;

        newVolume = theFloor + (((newVolume - theFloor) > 0.5) ? 1 : 0);

        this.options.volume = newVolume;
        this.element.attr("data-" + ($.mobile.ns || "") + "volume", newVolume);
        this._setVolumeIcon();
        this._setValue(newVolume);
    },

    _maxVolume: function() {
        return (this.options.basicTone ? 7 : 15);
    },

    _setVolumeIcon: function() {
        if (this._volumeElemStack.length === 0) {
            var cxStart = 63, /* FIXME: Do we need a parameter for this (i.e., is this themeable) or is it OK hard-coded? */
                cx = this._ui.volumeImage.width(),
                cy = this._ui.volumeImage.height(),
                cxInc = (cx - cxStart) / this._maxVolume(),
                nDivisions = 2 * this._maxVolume() + 1,
                cyElem = cy / nDivisions,
                yStart = cy - 2 * cyElem,
                elem;

            for (var Nix = this._volumeElemStack.length; Nix < this._maxVolume() ; Nix++) {
                elem = this._ui.bar
                    .clone()
                    .css({
                        left: (cx - (cxStart + Nix * cxInc)) / 2,
                        top:  yStart - Nix * 2 * cyElem,
                        width: cxStart + Nix * cxInc,
                        height: cyElem
                    })
                    .appendTo(this._ui.volumeImage);
                this._volumeElemStack.push(elem);
            }
        }
        for (var Nix = 0 ; Nix < this._maxVolume() ; Nix++)
            if (Nix < this.options.volume)
                this._volumeElemStack[Nix].addClass("ui-volumecontrol-level-set");
            else
                this._volumeElemStack[Nix].removeClass("ui-volumecontrol-level-set");
    },

    open: function() {
        if (!this._isOpen) {
            this._ui.container.popupwindow("open",
                window.innerWidth  / 2,
                window.innerHeight / 2);

            this._isOpen = true;
        }
    },

    close: function() {
        if (this._isOpen) {
            this._ui.container.popupwindow("close");
            this._isOpen = false;
        }
    }
});

//auto self-init widgets
$( document ).bind( "pagecreate create", function( e ){
    $( $.todons.volumecontrol.prototype.options.initSelector, e.target )
        .not( ":jqmData(role='none'), :jqmData(role='nojs')" )
        .volumecontrol();
});

})( jQuery );
