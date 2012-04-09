/*
 * gui-builder - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
"use strict";
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

            this.element
                .addClass(this.widgetName)
                .append('<div/>')
                .children(':last')
                .addClass('property_content');

            this.options.primaryTools = this._createPrimaryTools();
            this.options.secondaryTools = this._createSecondaryTools();
            $(window).resize(this, function(event) {
                var el = event.data.element;
                if (el.parent().height() == 0)
                    return;

                var newHeight = Math.round((el.parent().height()
                                - el.parent().find('.pageView').height()
                                - el.parent().find('.property_title')
                                      .height()
                                - 20) // height of ui-state-default + borders
                                * 0.4);
                el.height(newHeight);
            });

            this.refresh(null, this);

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
                if (event.node && !(event.name === "modelUpdated" &&
                    event.type === "nodeRemoved")) {
                    widget._showProperties(event);
                } else {
                    event.node = ADM.getActivePage();
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
            //in case current focus input item change event not triggered
            //we trigger it firstly
            $("input:focus").trigger('change');
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
                labelId, labelVal, valueId, valueVal, count,
                widget = this, type,  i, child, index, propType,
                p, props, options, code, o, propertyItems, label, value,
                title = this.element.parent().find('.property_title'),
                content = this.element.find('.property_content');

            // Clear the properties pane when nothing is selected
            if (node === null || node === undefined) {
                node = ADM.getActivePage();
                if (node === null || node === undefined) {
                    $('#property_content').empty()
                        .append('<label>Nothing Selected</label>');
                    return;
                }
            }

            type = node.getType();
            title.empty()
                .append('<span>')
                .children(':first')
                    .addClass('title')
                    .text(BWidget.getDisplayLabel(type)+' Properties');
            content.empty()
                .append('<div class="propertyItems"></div>');
            propertyItems = content.find('div')
                .addClass("propertyItems");
            props = node.getProperties();
            options = node.getPropertyOptions();
            // iterate property of node
            for (p in props) {
                labelVal = p.replace(/_/g,'-');
                labelVal = labelVal.charAt(0).toUpperCase()+labelVal.substring(1);
                if (labelVal === "Id") {
                    labelVal = labelVal.toUpperCase(); 
                }
                valueId = p+'-value';
                valueVal = props[p];
                propType = BWidget.getPropertyType(type, p);
                code = $('<div/>')
                    .appendTo(propertyItems);
                label = $('<label/>').appendTo(code)
                    .attr('for', valueId)
                    .text(labelVal)
                    .addClass('title');
                value = $('<div/>').appendTo(code);
                // display property of widget
                switch (propType) {
                    case "boolean":
                        $('<input type="checkbox"/>')
                            .attr('id', valueId)
                            .appendTo(value);

                        // initial value of checkbox
                        if (node.getProperty (p) === true) {
                            $("#" + valueId).attr("checked", true);
                        }
                        break;
                    case "record-array":
                        $('<table/>')
                            .attr('id', 'selectOption')
                            .attr('cellspacing', '5')
                            .appendTo(value);
                        var selectOption = value.find('#selectOption');
                        $('<tr/>')
                            .append('<td width="5%"></td>')
                            .append('<td width="45%"> Text </td>')
                                .children().eq(1)
                                .addClass('title')
                                .end().end()
                            .append('<td width="45%"> Value </td>')
                                .children().eq(2)
                                .addClass('title')
                                .end().end()
                            .append('<td width="5%"></td>')
                            .appendTo(selectOption);
                        for (i = 0; i< props[p].children.length; i ++){
                            child = props[p].children[i];
                            $('<tr/>').data('index', i)
                                .addClass("options")
                                .append('<td/>')
                                    .children().eq(0)
                                    .append('<img/>')
                                    .children(':first')
                                    .attr('src', "src/css/images/propertiesDragIconSmall.png")
                                    .end()
                                    .end().end()
                                .append('<td/>')
                                    .children().eq(1)
                                    .append('<input type="text"/>')
                                        .children().eq(0)
                                        .val(child.text)
                                        .addClass('title optionInput')
                                        .change(node, function (event) {
                                            index = $(this).parent().parent().data('index');
                                            props[p].children[index].text = $(this).val();
                                            node.fireEvent("modelUpdated",
                                                {type: "propertyChanged",
                                                 node: node,
                                                 property: p});
                                        })
                                        .end().end()
                                    .end().end()
                                .append('<td/>')
                                    .children().eq(2)
                                    .append('<input type="text"/>')
                                        .children().eq(0)
                                        .val(child.value)
                                        .addClass('title optionInput')
                                        .change(node, function (event) {
                                            index = $(this).parent().parent().data('index');
                                            props[p].children[index].value = $(this).val();
                                            node.fireEvent("modelUpdated",
                                                {type: "propertyChanged",
                                                 node: node,
                                                 property: p});
                                        })
                                        .end().end()
                                    .end().end()
                                .append('<td/>')
                                    .children().eq(3)
                                    .append('<img/>')
                                        .children(':first')
                                        .attr('src', "src/css/images/deleteButton_up.png")
                                        // add delete option handler
                                        .click(function(e) {
                                            try {
                                                index = $(this).parent().parent().data('index');
                                                props[p].children.splice(index, 1);
                                                node.fireEvent("modelUpdated",
                                                    {type: "propertyChanged",
                                                        node: node,
                                                    property: p});
                                            }
                                            catch (err) {
                                                console.error(err.message);
                                            }
                                            e.stopPropagation();
                                            return false;
                                        })
                                        .end()
                                    .end().end()
                               .appendTo(selectOption);
                        }

                        // add add items handler
                        $('<label for=items><u>+ add item</u></label>')
                            .children(':first')
                            .addClass('rightLabel title')
                            .attr('id', 'addOptionItem')
                            .end()
                            .appendTo(value);
                        value.find('#addOptionItem')
                            .click(function(e) {
                                try {
                                    var optionItem = {};
                                    optionItem.text = "Option";
                                    optionItem.value = "Value";
                                    props[p].children.push(optionItem);
                                    node.fireEvent("modelUpdated",
                                                  {type: "propertyChanged",
                                                   node: node,
                                                   property: p});
                                }
                                catch (err) {
                                    console.error(err.message);
                                }
                                e.stopPropagation();
                                return false;
                            });

                        // make option sortable
                        value.find('#selectOption tbody').sortable({
                            axis: 'y',
                            items: '.options',
                            containment: value.find('#selectOption tbody'),
                            start: function(event, ui) {
                                widget.origRowIndex = ui.item.index() - 1;
                            },
                            stop: function(event, ui) {
                                var optionItem, curIndex = ui.item.index() - 1,
                                    origIndex = widget.origRowIndex;
                                    optionItem = props[p].children.splice(origIndex,1)[0];

                                props[p].children.splice(curIndex, 0, optionItem);
                                node.fireEvent("modelUpdated",
                                              {type: "propertyChanged",
                                               node: node,
                                               property: p});
                            },
                        });
                        break;
                    default:
                        // handle property has options
                        if (options[p]) {
                            $('<select size="1">')
                                .attr('id', valueId)
                                .addClass('title')
                                .appendTo(value);
                            //add options to select list
                            for (o in options[p]) {
                                //TODO make it simple
                                $('<option value="' + options[p][o] +
                                  '">' +options[p][o] + '</option>')
                                    .appendTo(value.find("#" + valueId));
                                value.find('#'+ valueId).val(valueVal);
                            }
                        } else {
                            $('<input type ="text" value="">')
                                .attr('id', valueId)
                                .addClass('title labelInput')
                                .appendTo(value);
                            //set default value
                            value.find('#' + valueId).val(valueVal);
                        }
                        break;
                }

                content.find('#' + valueId)
                    .change(node, function (event) {
                        var updated, node, element, type, value;
                        updated = event.target.id.replace(/-value/,''),
                        node = event.data;

                        if (node === null || node === undefined) {
                            throw new Error("Missing node, prop change failed!");
                            return;
                        }
                        value = validValue($(this),
                            BWidget.getPropertyType(node.getType(), updated));
                        ADM.setProperty(node, updated, value);
                        event.stopPropagation();
                        return false;
                    });
            }

            // add delete element button
            $('<div><button> Delete Element </button></div>')
                .addClass('property_footer')
                .children('button')
                .addClass('buttonStyle')
                .attr('id', "deleteElement")
                .end()
                .appendTo(content);
            content.find('#deleteElement')
                .one('click', function (e) {
                    try {
                        if (type === "Page") {
                            $.gb.pageUtils.deletePage(node.getUid(), false);
                        } else {
                            ADM.removeChild(node.getUid(), false);
                        }
                    }
                    catch (err) {
                        console.error(err.message);
                    }
                    e.stopPropagation();
                    return false;
                });

            function validValue(element, type) {
                var ret = null, value = element.val();
                switch (type) {
                    case 'boolean':
                        ret = element.is(':checked');;
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
        },
    });
})(jQuery);
