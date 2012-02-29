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

function validValue(value, type) {
    var ret = null;
    switch (type) {
        case 'boolean':
            ret = Boolean(value);
            break;
        case 'float':
            ret = parseFloat(value);
            break;
        case 'integer':
            ret = parseInt(value, 10);
            break;
        case 'number':
            ret = Number(value);
            break;
        case 'object':
            ret = Object(value);
            break;
        case 'string':
            ret = String(value);
            break;
        default:
            ret = value;
            break;
    }
    return ret;
};

function copyProperties(dest, src) {
    var text, value;

    text = src.getProperty("text");
    dest.setProperty("text", text);

    value = src.getProperty("value");
    dest.setProperty("value", value);
};

// Property view widget

(function($, undefined) {

    $.widget('gb.propertyView', {

        options: {
            model: null,
        },

        _create: function() {
            var o = this.options,
                e = this.element;

            o.designReset = this._designResetHandler;
            o.selectionChanged = this._selectionChangedHandler;
            o.activePageChanged = this._activePageChangedHandler;
            o.modelUpdated = this._modelUpdatedHandler;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            $('<div/>').addClass(this.widgetName)
                .appendTo(this.element);

            $('<div id="property_content"></div>').appendTo(this.element);

            this.options.primaryTools = this._createPrimaryTools();
            this.options.secondaryTools = this._createSecondaryTools();

            return this;
        },

        _setOption: function(key, value) {
            switch (key) {
                // Should this REALLY be done here, or plugin registration in
                // the "host"... using the functions mapped in widget options?
                case 'model':
                    this._unbindADMEvents();
                    this._bindADMEvents(value);
                    this.refresh(null, this);
                    break;
                default:
                    break;
            }
        },

        destroy: function() {
            // TODO: unbind any ADM event handlers
            $(this.element).find('.'+this.widgetName).remove();
            this.options.primaryTools.remove();
            this.options.secondaryTools.remove();
        },

        refresh: function(event, widget) {
            widget = widget || this;
            if (event) {
                if (!event.node || event.node.isSelectable() ||
                    event.node.instanceOf('Page')) {
                    widget._showProperties(event);
                }
                else if (event.name === "modelUpdated" &&
                         (event.type === "nodeRemoved" ||
                          event.type === "nodeAdded") &&
                         event.node.getType() === "Option") {
                    event.node = event.parent;
                    widget._showProperties(event);
                }
            }
        },

        // Private functions
        _createPrimaryTools: function() {
            return $(null);
        },

        _createSecondaryTools: function() {
            return $(null);
        },

        _bindADMEvents: function(a) {
            var o = this.options,
                d = this.designRoot;

            if (a) {
                o.model = a;

                if (o.designReset) {
                    a.bind("designReset", o.designReset, this);
                }
                if (o.selectionChanged) {
                    a.bind("selectionChanged", o.selectionChanged, this);
                }
                if (o.activePageChanged) {
                    a.bind("activePageChanged", o.activePageChanged, this);
                }

                // Since model changed, need to call our designReset hander
                // to sync up the ADMDesign modelUpdated event handler
                if (o.designReset) {
                    o.designReset({design: a.getDesignRoot()}, this);
                }
            }
        },

        _unbindADMEvents: function() {
            var o = this.options,
                a = this.options.model,
                d = this.designRoot;

            // First unbind our ADMDesign modelUpdated handler, if any...
            if (d && o.modelUpdated) {
                d.designRoot.unbind("modelUpdated", o.modelUpdated, this);
            }

            // Now unbind all ADM model event handlers, if any...
            if (a) {
                if (o.designReset) {
                    a.unbind("designReset", o.designReset, this);
                }
                if (o.selectionChanged) {
                    a.unbind("selectionChanged", o.selectionChanged, this);
                }
                if (o.activePageChanged) {
                    a.unbind("activePageChanged", o.activePageChanged, this);
                }
            }
        },

        _designResetHandler: function(event, widget) {
            var d = event && event.design, o;

            widget = widget || this;
            o = widget.options;
            d = d || o.model.getDesignRoot();

            // Do nothing if the new ADMDesign equals our currently cached one
            if (d === widget.designRoot) {
                return;
            }

            // First, unbind existing modelUpdated hander, if any...
            if (widget.designRoot && o.modelUpdated) {
                widget.designRoot.unbind("modelUpdated", o.modelUpdated,widget);
            }

            // Next, bind to modelUpdated events from new ADMDesign, if any...
            if (d && o.modelUpdated) {
                d.bind("modelUpdated", o.modelUpdated, widget);
            }

            // Then, cache the new ADMDesign reference with this instance
            widget.designRoot = d;

            // Finally, redraw our view since the ADMDesign root has changed
            widget.refresh(event, widget);
        },

        _selectionChangedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event,widget);
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event,widget);
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            widget.refresh(event,widget);
        },

        _showProperties: function(event) {
            var node = event.node,
                showUid = false,
                labelId, labelVal, valueId, valueVal, count,
                widget = this;

            // Clear the properties pane when nothing is selected
            if (node === null || node === undefined) {
                node = ADM.getActivePage();
                if (node === null || node === undefined) {
                    $('#property_content').empty()
                        .append('<label>Nothing Selected</label>');
                    return;
                }
            }

            $('#property_content').empty()
                .append('<table><tr><td colspan="2">' +
                        '<span id="property_title">' +
                        BWidget.getDisplayLabel(node.getType()) +
                        '</span>' +
                        (showUid ? ' (uid=' + node.getUid() + ')' : '') +
                        '</td></tr></table>');

            var props = node.getProperties();
            var options = node.getPropertyOptions();
            for (var p in props) {
                if (node.getType() === "SelectMenu" && p === "options") {
                    continue;
                }
                labelVal = p.replace(/_/g,'-');
                labelId = p+'-label';
                valueId = p+'-value';
                valueVal = props[p];
                if (options[p]) {
                    var code = '<tr><th id="' + labelId + '">' + labelVal +
                               '</th>' + '<td width="100%">' +
                               '<select id="' + valueId + '">';
                    for (var o in options[p]) {
                        if (options[p][o] == props[p]) {
                            code += '<option value="' + options[p][o] +
                                    '" selected=true>' + options[p][o] +
                                    '</option>';
                        } else {
                            code += '<option value="' + options[p][o] + '">' +
                                    options[p][o] + '</option>';
                        }
                    }
                    code += '</select>' + '</td></tr>';
                    $('#property_content').children().last().append(code);
                } else {
                    $('#property_content').children().last()
                        .append('<tr><th id="' + labelId + '">' + labelVal +
                                '</th>' +
                                '<td>' +
                                '<input class="full" id="' + valueId + '" />' +
                                '</td></tr>');
                    $('#'+valueId).val(valueVal);
                }
                $('#' + valueId).change(node, function (event) {
                    var updated, node, element, type, value;
                    updated = event.srcElement.id.replace(/-value/,''),
                    node = event.data;

                    if (node === null || node === undefined) {
                        throw new Error("Missing node, prop change failed!");
                        return;
                    }

                    element = $('#' + event.srcElement.id);
                    type = BWidget.getPropertyType(node.getType(), updated);
                    value = validValue(element.val(), type);
                    ADM.setProperty(node, updated, value);
                });
            }

            if (node.getType() === "SelectMenu") {
                widget.currentNode = node;
                var children = node.getChildren();
                $('#property_content')
                    .append('<table id="sortable">' +
                            '</table>');
                $('#sortable').sortable({
                    items: 'tr:not(.sortable-title)',
                    start: function(event, ui){
                        widget.originalRowIndex = ui.item[0].rowIndex - 1;
                    },
                    stop: function(event, ui){
                        var original = widget.originalRowIndex;
                        widget.originalRowIndex = ui.item[0].rowIndex - 1;
                        var current = widget.originalRowIndex;
                        var node = widget.currentNode;
                        var children = node.getChildren();
                        var tmp = new ADMNode('Option');
                        var i;
                        if (current !== original) {
                            if (current < original) {
                                copyProperties(tmp, children[original]);
                                for (i = original; i > current; i--) {
                                    copyProperties(children[i], children[i-1]);
                                }
                                copyProperties(children[current], tmp);
                            }
                            else {
                                copyProperties(tmp, children[original]);
                                for (i = original + 1; i <= current; i++) {
                                    copyProperties(children[i-1], children[i]);
                                }
                                copyProperties(children[current], tmp);
                            }
                        }
                    },
                });
                $('#property_content').children().last()
                    .append('<tr class="sortable-title"><td>Options: </td>' +
                        '<td>Text</td><td>Value</td></tr>');
                for (var i=0; i<children.length; i++) {
                    var subnode = children[i];
                    var subprops = subnode.getProperties();
                    $('#property_content').children().last()
                        .append('<tr id="' + i + '">' +
                                '<td>' +
                                '<img ' +
                             'src="src/css/images/verticalDragger.png" />' +
                                '</td>' +
                                '<td>' +
                                '<input id="option-text-' + i +
                                '" size="5" />'+
                                '</td>' +
                                '<td>' +
                                '<input id="option-value-' +i+ '" size="5" />' +
                                '</td><td><button id="option-delete-' +
                                i + '">-</button></td></tr>');
                    $('#option-text-'+i).val(subprops["text"]);
                    $('#option-value-'+i).val(subprops["value"]);
                    $('#option-text-'+i).change(subnode, function(event) {
                        var updated = event.srcElement.id,
                            node = event.data,
                            value,
                            element = $('#' + updated);
                        value = validValue(element.val(),
                            BWidget.getPropertyType(node.getType(), "text"));
                        ADM.setProperty(node, "text", value);
                    });
                    $('#option-value-'+i).change(subnode, function(event) {
                        var updated = event.srcElement.id,
                            node = event.data,
                            value,
                            element = $('#' + updated);
                        value = validValue(element.val(),
                            BWidget.getPropertyType(node.getType(), "value"));
                        ADM.setProperty(node, "value", value);
                    });
                    $('#option-delete-'+i).click(subnode, function(event){
                        var node = event.data;
                        ADM.removeChild(node.getUid(), false);
                    });
                }
                $('#property_content').children().last()
                    .append('<button id="option-add">Add</button><br><br>');
                $('#option-add').click(node, function(event){
                    var node = event.data;
                    var child = new ADMNode('Option');
                    ADM.addChild(node, child);
                });
            }

            $('#property_content').children().last()
                .append('<button id="delete">Delete</button>');
            $('#delete').click(function() {
                window.parent.ADM.removeChild(node.getUid());
            });

            $('table','#property_content').attr({ 'cellspacing': '0' });
            $('th:odd, td:odd','#property_content')
                .css({ 'border-top': '1px solid black',
                       'border-bottom': '1px solid black' });
            $('td','#property_content').attr('align','left');
            $('th','#property_content').attr('align','left')
                .addClass('ui-helper-reset ui-state-default');
        },
    });
})(jQuery);
