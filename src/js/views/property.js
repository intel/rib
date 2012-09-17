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
// Property view widget

(function($, undefined) {

    $.widget('rib.propertyView', $.rib.baseView, {

        _create: function() {
            var o = this.options,
                e = this.element;

            // Chain up to base class _create()
            $.rib.baseView.prototype._create.call(this);

            this.element
                .append('<div/>')
                .children(':last')
                .addClass('property_content');

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
            e.delegate('*', 'focus click', function(e){
                window.focusElement = this;
                e.stopPropagation();
            });

            $.rib.bind("imagesUpdated", this._imagesUpdatedHandler, this);
            return this;
        },

        _setOption: function(key, value) {
            // Chain up to base class _setOptions()
            // FIXME: In jquery UI 1.9 and above, instead use
            //    this._super('_setOption', key, value)
            $.rib.baseView.prototype._setOption.apply(this, arguments);

            switch (key) {
                case 'model':
                    this.refresh(null, this);
                    break;
                default:
                    break;
            }
        },

        refresh: function(event, widget) {
            widget = widget || this;
            widget._showProperties(ADM.getSelectedNode());
        },

        // Private functions
        _createPrimaryTools: function() {
            return $(null);
        },

        _createSecondaryTools: function() {
            return $(null);
        },

        _selectionChangedHandler: function(event, widget) {
            widget = widget || this;
            //in case current focus input item change event not triggered
            //we trigger it firstly
            $("input:focus").trigger('change');
            widget.refresh(event,widget);
        },

        _setProperty: function(property, propType, value) {
            var element = this.element.find("#" + property + '-value');
            switch (propType) {
                case "boolean":
                    element.attr('checked', value);
                    break;
                default:
                    element.val(value);
            }
        },

        _redrawProperty: function(property, newElment) {
            var element = this.element.find("#" + property + '-value');
            element.replaceWith(newElment);
        },

        _modelUpdatedHandler: function(event, widget) {
            var affectedWidget, id, value, propType;
            widget = widget || this;
            if (event && event.type === "propertyChanged") {
                if (event.node.getType() !== 'Design') {
                    id = event.property + '-value';
                    affectedWidget = widget.element.find('#' + id);
                    propType = BWidget.getPropertyType(event.node.getType(), event.property);

                    // Get value to for commparation
                    switch (propType) {
                        case "boolean":
                            value = affectedWidget.attr('checked')?true:false;
                            break;
                        case "record-array":
                            value = event.oldValue; // FIXME: oldValue can't passed here.
                            break;
                        default:
                            value = affectedWidget.val();
                            break;
                    }

                    // Compare the newValue is equal with value, then return directly.
                    if (event.newValue == value)
                        return;

                    // Update ADM and apply effects.
                    switch (propType) {
                        case "boolean":
                            if (affectedWidget) {
                                affectedWidget[0].scrollIntoViewIfNeeded();
                                affectedWidget.effect('pulsate', { times:3 }, 200);
                            }
                            widget._setProperty(event.property, propType, event.newValue);
                            break;
                        case "record-array":
                            value = event.oldValue;
                            // TODO: Do something with affectedWidget
                            // affectedWidget = event.element;
                            widget._redrawProperty(
                                event.property,
                                widget._generateRecordArrayTable(widget, event.node, event.property)
                            );
                            break;
                        default:
                            if (affectedWidget[0]) {
                                affectedWidget[0].scrollIntoViewIfNeeded();
                                affectedWidget.effect('highlight', {}, 1000);
                            }
                            widget._setProperty(event.property, propType, event.newValue);
                            break;
                    }
                    return;
                } else if (event.property !== 'css') {
                    return;
                }
                widget.refresh(event, widget);
            }
            // TODO: do we really need to be refreshing here in the event of
            // nodeAdded, nodeRemoved, etc.? Seems like we should test for
            // whether the current node is affected, or rather just let that
            // happen when selection changes
        },

        _imagesUpdatedHandler: function(event, widget) {
            widget = widget || this;
            var optionsList, options;
            if (widget.options.imagesDatalist) {
                options = event.usageStatus || $.rib.pmUtils.resourceRef;
                optionsList = widget.options.imagesDatalist.find('ul');
                updateOptions(optionsList, Object.keys(options));
            }
            return;
        },

        _generateSelectMenuOption: function(node, property, child, index, props) {
            var changeCallback = function(event) {
                var newValue, self = $(this);
                props[property].children[index][event.data.key] = self.val();
                newValue = props[property];
                node.fireEvent("modelUpdated", {
                    type: "propertyChanged",
                    node: node,
                    property: property,
                    element: self,
                    newValue: newValue,
                    index: index
                });
            };

            if (!props)
                props = node.getProperties();
            return $('<tr/>').data('index', index)
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
                        .change({key: 'text'}, changeCallback)
                        .end().end()
                    .end().end()
                .append('<td/>')
                    .children().eq(2)
                    .append('<input type="text"/>')
                        .children().eq(0)
                        .val(child.value)
                        .addClass('title optionInput')
                        .change({key: 'value'}, changeCallback)
                        .end().end()
                    .end().end()
                .append('<td/>')
                    .children().eq(3)
                    .append('<div class="delete button">Delete</div>')
                        .children(':first')
                        // add delete option handler
                        .click(function(e) {
                            try {
                                var newValue, self = $(this);
                                // Generate ADM properties
                                index = self.parent().parent().data('index');
                                props[property].children.splice(index, 1);
                                // Instead by draw, so comment following lines.
                                /*
                                // Remove the row element after clicked delete button
                                self.parent().parent().remove();
                                */
                                newValue = props[property];
                                // Trigger the modelUpdated event.
                                node.fireEvent("modelUpdated", {
                                    type: "propertyChanged",
                                    node: node,
                                    property: property,
                                    element: self,
                                    newValue: newValue,
                                    index: index
                                });
                            }
                            catch (err) {
                                console.error(err.message);
                            }
                            e.stopPropagation();
                            return false;
                        })
                        .end()
                    .end().end();
        },

        _generateRecordArrayTable: function(widget, node, property, props) {
            var child, table = $('<table/>')
                .attr('id', property + '-value')
                .addClass('selectTable')
                .attr('cellspacing', '5');

            if (!props)
                props = node.getProperties();

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
                .appendTo(table);
            for (var i = 0; i< props[property].children.length; i++){
                child = props[property].children[i];
                table.append(
                    this._generateSelectMenuOption(node, property, child, i, props)
                );
            }

            // add add items handler
            $('<tr><td colspan="3">+ add item</td></tr>')
                .children(':first')
                .addClass('rightLabel title')
                .attr('id', 'addOptionItem')
                .end()
                .click(function(e) {
                    var newValue, self = $(this);
                    try {
                        var rowElement, index = props[property].children.length,
                            optionItem = {
                                'text': 'Option',
                                'value': 'Value'
                            };
                        props[property].children.push(optionItem);
                        // Instead by draw, so comment following lines.
                        /*
                        rowElement = widget._generateSelectMenuOption(
                            node, property, optionItem, index, props
                        );
                        */
                        table.append(rowElement);
                        $(this).insertAfter(rowElement);
                        newValue = props[property];
                        node.fireEvent("modelUpdated", {
                             type: "propertyChanged",
                             node: node,
                             property: property,
                             element: self,
                             newValue: newValue,
                             index: index
                         });
                    } catch (err) {
                        console.error(err.message);
                    }
                    e.stopPropagation();
                    return false;
                })
                .appendTo(table);

            // make option sortable
            table.sortable({
                axis: 'y',
                handle: 'img',
                items: '.options',
                containment: table.find('tbody'),
                start: function(event, ui) {
                    widget.origRowIndex = ui.item.index() - 1;
                },
                stop: function(event, ui) {
                    var optionItem, curIndex = ui.item.index() - 1,
                        origIndex = widget.origRowIndex;
                        optionItem = props[property].children.splice(origIndex,1)[0];

                    props[property].children.splice(curIndex, 0, optionItem);
                    node.fireEvent("modelUpdated", {
                        type: "propertyChanged",
                        node: node,
                        property: property,
                        element: table,
                        newValue: props[property],
                        index: ui.item.index()
                    });
                }
            });

            return table;
        },

        _showProperties: function(node) {
            var labelId, labelVal, valueId, valueVal, count,
                widget = this, type,  i, child, index, propType,
                p, props, options, code, o, propertyItems, label, value,
                design = ADM.getDesignRoot(),
                title = this.element.parent().find('.property_title'),
                content = this.element.find('.property_content'),
                continueToDelete, buttonsContainer, container, prerequisite,
                range, min, max, input;

            // Clear the properties pane when nothing is selected
            if (node === null || node === undefined) {
                content.empty()
                    .append('<label>Nothing Selected</label>');
                return;
            }

            type = node.getType();
            title.empty()
                .append('<span>')
                .children(':first')
                    .addClass('title')
                    .text(BWidget.getDisplayLabel(type)+' Properties');
            content.empty();

            // get rid of old datalist element
            this.options.imagesDatalist = null;
            propertyItems = $('<div/>').addClass("propertyItems")
                                    .appendTo(content);
            props = node.getProperties();
            options = node.getPropertyOptions();
            // iterate property of node
            for (p in props) {
                if (!BWidget.propertyVisible(node.getType(), p)) {
                    continue;
                }
                labelVal = node.getPropertyDisplayName(p);
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
                prerequisite = BWidget.getPropertyPrerequisite(type, p);
                // display property of widget
                switch (propType) {
                    case "boolean":
                        // Forbid changing the style of the first page to
                        // "Dialog", we don't want to user adjust style of the
                        // first page
                        if (type === 'Page' &&
                            // FIXME: the knowledge of when to hide or show a
                            // property should come from the widget registry,
                            // not be hard-coded here
                            node.getDesign().getChildren()[0] === node &&
                            p === 'dialog') {
                            code.empty();
                        } else {
                            $('<input type="checkbox"/>')
                                .attr('id', valueId)
                                .appendTo(value);
                        }

                        // FIXME: Boolean values should be actual booleans, not
                        // "true" and "false" strings; but because of bugs we
                        // had previously, data files were written out with the
                        // wrong values, so the following test helps them keep
                        // working correctly. Someday, we should remove it.

                        // initial value of checkbox
                        if ((node.getProperty (p) === true) ||
                            (node.getProperty (p) === "true")) {
                            value.find("#" + valueId).attr("checked", "checked");
                        }
                        break;
                    case "url-uploadable":
                        var array, datalist, uploadClick;
                        uploadClick = function (e) {
                            var optionsWrapper, textInput, saveDir;
                            optionsWrapper = $(this).parents('.datalist:first');
                            optionsWrapper.hide();
                            textInput = optionsWrapper.prev('input');

                            saveDir = $.rib.pmUtils.ProjectDir + "/" + $.rib.pmUtils.getActive() + "/images/";
                            $.rib.fsUtils.upload("image", null, function(file) {
                                // Write uploaded file to sandbox
                                $.rib.fsUtils.write(saveDir + file.name, file, function (newFile) {
                                    textInput.val("images/" + newFile.name).change();
                                });
                            });
                        };
                        // merge all image files
                        array = [{
                            value: "upload",
                            clickCallback: uploadClick,
                            cssClass: 'upload-button',
                            stable: true
                        }].concat(Object.keys($.rib.pmUtils.resourceRef));
                        datalist = createDatalist(array);
                        if (!datalist) break;
                        datalist.addClass('title').appendTo(value);
                        datalist.find('input[type="text"]')
                            .attr('id', valueId)
                            .addClass('title labelInput')
                            .val(valueVal);
                        // save the datalist for update
                        this.options.imagesDatalist = $(this.options.imagesDatalist).add(datalist);
                        break;

                    case "record-array":
                        value.append(this._generateRecordArrayTable(widget, node, p, props));
                        break;
                    case "targetlist":
                        container = node.getParent();
                        options[p] = ['previous page'];
                        while (container !== null &&
                                container.getType() !== "Page") {
                            container = container.getParent();
                        }
                        var o, pages = ADM.getDesignRoot().getChildren();
                        for (o = 0; o < pages.length; o++) {
                            if (pages[o] === container) {
                                continue;
                            }
                            options[p].push('#' + pages[o].getProperty('id'));
                        }
                        // Don't break to reuse logic of datalist

                    case "datalist":
                        var datalist = createDatalist(options[p]);
                        if (!datalist) break;
                        datalist.addClass('title').appendTo(value);
                        datalist.find('input[type="text"]')
                                .attr('id', valueId)
                                .addClass('title labelInput')
                                .val(valueVal);
                        break;
                    default:
                        range = BWidget.getPropertyRange(type, p);
                        if (range) {
                            min = range.min;
                            max = range.max;
                            input = $('<input type="number"/>')
                                .addClass('title labelInput')
                                .attr({
                                    id: valueId
                                })
                                .change(node, function(event) {
                                    if( typeof this.max !== "undefined" &&
                                        parseInt(this.value) > parseInt(this.max) ||
                                        typeof this.min !== "undefined" &&
                                        parseInt(this.value) < parseInt(this.min)) {
                                            $(this).effect("highlight",
                                                {color: "red"}, 1000);
                                            event.stopImmediatePropagation();
                                            this.value = event.data.getProperty(this.id.slice(0, this.id.indexOf('-')));
                                    }
                                })
                                .appendTo(value);
                            if (typeof min !== "undefined")
                                input.attr("min", min);
                            if (typeof max !== "undefined")
                                input.attr("max", max);
                            //set default value
                            value.find('#' + valueId).val(valueVal);
                        } else if (options[p]) {
                        // handle property has options
                            $('<select size="1">').attr('id', valueId)
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
                                .keyup({ property: p }, function(e) {
                                    var self = $(this);
                                    // Strip ctrl/alt/shift/command key.
                                    if (e.keyCode >= 16 && e.keyCode <= 18 && e.keyCode != 91)
                                        return false;
                                    self.toggleClass(
                                        'redBackground',
                                        !BWidget.validValue(
                                            node.getType(),
                                            e.data.property,
                                            self.val()
                                        )
                                    )
                                })
                                .appendTo(value);
                            //set default value
                            value.find('#' + valueId).val(valueVal);
                        }
                        break;
                }

                content.find('#' + valueId)
                    .change(node, function (event) {
                        var updated, node, element, type, value, ret, selected;
                        updated = event.target.id.replace(/-value/,'');
                        node = event.data;
                        // FIXME: The "change" event will refresh property view
                        // so "click" event of datalist is not triggered.
                        // We have to look up the ":hover" class here to decide
                        // which item is clicked
                        selected = $(this).parent().find('.datalist ul li:hover');
                        if (selected.length > 0) {
                            selected.click();
                            return;
                        }

                        if (node === null || node === undefined) {
                            throw new Error("Missing node, prop change failed!");
                        }
                        value = validValue(
                            node, $(this),
                            BWidget.getPropertyType(node.getType(), updated)
                        );
                        ret = ADM.setProperty(node, updated, value);
                        type = node.getType();
                        if (ret.result === false) {
                            $(this).removeClass('redBackground');
                            $(this).effect("highlight", {color: "red"}, 1000).val(node.getProperty(updated));
                        } else if (type === "Button" &&
                            value === "previous page") {
                            ADM.setProperty(node, "opentargetas", "default");
                        }
                        event.stopPropagation();
                        return false;
                    });

                if (prerequisite && !prerequisite(node)) {
                    // disable the input field and its label
                    value.find('#'+valueId)
                        .attr('disabled', 'disabled')
                        .closest("div")
                        .parent()
                        .find("label")
                        .addClass("disabled");
                }
            }

            // add buttons container
            buttonsContainer = $('<div>')
                .addClass('property_footer')
                .appendTo(content)
                .end();

            // Add event handler button
            $('<button>Event Handlers...</button>')
                .addClass('buttonStyle')
                .attr('id', "eventHandlerElement")
                .appendTo(buttonsContainer)
                .bind('click', function(e) {
                    var generateEventSelectElement, generateEventHandlersList,
                        removeEventHandler, eventLinkClicked;
                    var formContainer, leftPanel, leftPanelContainer,
                        rightPanel, eventElement, eventSelectElement,
                        eventEditorContainer, eventEditor, formElement,
                        jsCode, eventHandlersList, id,
                        uniqueIdName = 'id';

                    // If node have no ID property, then return directly.
                    if(typeof(BWidget.propertyExists(node.getType(), uniqueIdName)) == 'undefined') {
                        alert('Event handler must be using with the element have ID property.');
                        return false;
                    };

                    /*
                     * Call back functions.
                     */

                    // Remove event handler
                    removeEventHandler = function(e) {
                        e.preventDefault();
                        var eventName = $(this).parent().attr('rel');
                        $.rib.confirm(
                            'Are you sure you want to delete the '
                                + eventName
                                + ' event handler?',
                            function() {
                                node.setProperty(eventName, '');
                                if (eventElement.val() == eventName) {
                                    eventEditor.setValue('');
                                    formElement.trigger('submit');
                                } else {
                                    formElement.trigger('refresh');
                                }
                            }
                        );
                    }

                    // Event link clicked callback
                    eventLinkClicked = function(e) {
                        e.preventDefault();
                        var eventName = $(this).parent().attr('rel');
                        eventSelectElement.val(eventName);
                        formElement.trigger('submit');
                    }

                    /*
                     * Elements generation functions.
                     */

                    // Generate the event property select options.
                    generateEventSelectElement = function(selectElement, matchedProps) {
                        var selected, newSelectElement, result, matchedProps,
                        optionElement, eventName, optionsGroup;

                        // Store the old selected event.
                        selected = selectElement.val();

                        // Clean up the origin options.
                        selectElement.find('option').remove();

                        // Search event properties
                        if (!matchedProps)
                            matchedProps = node.getMatchingProperties(
                                {'type': 'event'}
                            );

                        // Added a initial blank option;
                        $('<option value="">[Select an event handler]</option>')
                            .addClass('cm-inactive')
                            .appendTo(selectElement);

                        // TODO: Classify the events and use optgroup to
                        //        genereate it.
                        /*
                        optionsGroup = $(
                            '<optgroup label="[Select an event handler]"></optgroup>'
                        )
                            .appendTo(selectElement);
                        */

                        // Generate event select options.
                        for (eventName in matchedProps) {
                            optionElement = $('<option>')
                                .attr('value', eventName)
                                .html(node.getPropertyDisplayName(eventName))
                                .appendTo(selectElement);

                            // If the event is selcted, then check it to be
                            // selected again.
                            if (eventName == selected)
                                optionElement.attr('selected', 'selected');

                            // If the event have codes, then highlight it.
                            if (typeof(matchedProps[eventName]) != 'string')
                                continue;
                            if (matchedProps[eventName].trim() == '')
                                continue;
                            optionElement.addClass('cm-active');
                            optionElement.html(optionElement.html() + ' *');
                        }
                    }

                    // Generate the event event handler that had codes list area.
                    generateEventHandlersList = function(selectElement, matchedProps) {
                        var selected, ulElement, liElement, aElement,
                            removeElement, result, matchedProps, eventName;

                        // Store the old selected event.
                        selected = selectElement.val();

                        // Search event properties
                        if (!matchedProps)
                            matchedProps = node.getMatchingProperties(
                                {'type': 'event'}
                            );

                        // Generate event handlers list.
                        eventHandlersList = $('<fieldset>')
                            .append($('<legend>Event handlers</legend>'))

                        ulElement = $('<ul>').appendTo(eventHandlersList);
                        removeElement = $('<div class="delete button">Delete</div>')
                            .click(removeEventHandler);

                        for (eventName in matchedProps) {
                            if (typeof(matchedProps[eventName]) != 'string')
                                continue;
                            if (matchedProps[eventName].trim() == '')
                                continue;
                            aElement = $('<a>')
                                .addClass('link')
                                .html(eventName)
                                .click(eventLinkClicked);
                            liElement = $('<li>')
                                .attr('rel', eventName)
                                // FIXME: Strange behavior here
                                //        removeElement only appended to
                                //        last liElement
                                // .append(removeElement);
                                .append(aElement)
                                .appendTo(ulElement);
                        }
                        ulElement.find('li').append(removeElement);
                        return eventHandlersList;
                    }

                    /*
                     * Construct the page layout
                     */

                    // Page layout initial
                    formContainer = $('<div class="hbox" />');
                    leftPanel = $('<div class="flex1 vbox wrap_left" />')
                        .appendTo(formContainer)
                    rightPanel =$('<div class="flex1 wrap_right" />')
                        .appendTo(formContainer)

                    /*** Left panel contents ***/

                    $('<div class="title"><label>Event</label></div>')
                        .appendTo(leftPanel);

                    leftPanelContainer = $('<div>')
                        .addClass('container propertyItems')
                        .appendTo(leftPanel);

                    // Construct event options elements
                    eventSelectElement = $('<select>')
                        .attr({'name': 'selectedEvent'})
                        .addClass('center')
                        .change(function(e) {
                            formElement.trigger('submit');
                        })
                        .select()
                        .appendTo(leftPanelContainer);

                    // Add a hidden input to store current event name
                    eventElement = $(
                        '<input name="currentEvent" type="hidden" value="" />'
                    ).appendTo(leftPanelContainer);

                    // Initial the event handlers list
                    eventHandlersList = $('<fieldset>')
                        .append($('<legend>Event handlers</legend>'))
                        .appendTo(leftPanelContainer);

                    // Create the DONE button
                    $('<button>Done</button>')
                        .addClass('buttonStyle doneButton')
                        .click( function (e) {
                            formElement.dialog('close');
                        })
                        .button()
                        .appendTo(leftPanelContainer);

                    /*** Right panel contents ***/

                    $('<div class="title"><label>Javascript Code</label></div>')
                        .appendTo(rightPanel);

                    // Construct code editor element
                    eventEditorContainer = $('<div/>')
                        .addClass('container')
                        .appendTo(rightPanel);
                    eventEditor = CodeMirror(
                        eventEditorContainer[0],
                        {
                            mode: "javascript",
                            readOnly: 'nocursor',
                        }
                    );
                    eventEditorContainer.show();

                    /*** Dialog contents ***/
                    id = node.getProperty('id');
                    formElement = $('<form>')
                        .attr('id', 'eventHandlerDialog')
                        .append(formContainer)
                        .dialog({
                            title: "Event Handlers - "
                                + BWidget.getDisplayLabel(type)
                                + (id ? ' (' + id + ')' : '' ),
                            modal: true,
                            width: 980,
                            height: 600,
                            resizable: false
                         })
                        .bind('refresh', function(e, matchedProps) {
                            if (!matchedProps)
                                matchedProps = node.getMatchingProperties(
                                    {'type': 'event'}
                                );

                            // Regenerate event select options.
                            generateEventSelectElement(
                                eventSelectElement, matchedProps
                            );

                            // Regenerate the event handlers list.
                            eventHandlersList.replaceWith(
                                generateEventHandlersList(
                                    eventSelectElement,matchedProps
                                )
                            );
                        })
                        .bind('dialogclose', function(e) {
                            $(this).trigger('submit');
                        })
                        .bind('submit', function(e) {
                            e.preventDefault();

                            // Serialize the form data to JSON.
                            var formData = $(this).serializeJSON();
                            formData['jsCode'] = eventEditor.getValue();

                            // If ID is blank, generate a unique one.
                            if(node.getProperty(uniqueIdName) == '') {
                                node.generateUniqueProperty(
                                    uniqueIdName, true
                                );
                            }

                            // Save editor content to ADM property.
                            if (formData.currentEvent) {
                                node.setProperty(
                                    formData.currentEvent,
                                    formData.jsCode
                                );
                                // Refresh event handlers list.
                                $(this).trigger('refresh');
                            }

                            // Load the jsCode
                            //
                            // Checking the event select element changed
                            //
                            // If old event is not equal to current event in
                            // select, it's meaning the select changed not
                            // the window close, so we need to load the JS
                            // code from new selected property and change the
                            // editor content.
                            if (formData.currentEvent != formData.selectedEvent) {
                                if (formData.selectedEvent) {
                                    // Load the event property content and set
                                    // the editor content.
                                    jsCode = node.getProperty(
                                        formData.selectedEvent
                                    );
                                    if (typeof(jsCode) != 'string')
                                        jsCode = '';
                                    eventEditor.setOption('readOnly', false);
                                    eventEditor.setValue(jsCode);

                                    // Hightlight current event in event
                                    // handlers
                                    eventHandlersList
                                        .find('li.ui-selected')
                                        .removeClass('ui-selected');
                                    eventHandlersList
                                        .find('li[rel="' + formData.selectedEvent + '"]')
                                        .addClass('ui-selected');
                                } else {
                                    // Check the selection of event, if
                                    // selected blank will clean up the editor
                                    // content and set editor to be read only.
                                    eventEditor.setValue('');
                                    eventEditor.setOption(
                                        'readOnly', 'nocursor'
                                    );
                                }

                                // Set currentEvent element to selctedEvent.
                                eventElement.val(formData.selectedEvent);
                            };
                        });

                        // Initial event handlers list.
                        formElement.trigger('refresh');
                });

            // add delete element button
            $('<button>Delete Element</button>')
                .addClass('buttonStyle')
                .attr('id', "deleteElement")
                .appendTo(buttonsContainer)
                .bind('click', function (e) {
                    var msg, node;
                    node = ADM.getSelectedNode();
                    if (!node) {
                        return false;
                    }
                    if (type === "Page") {
                        // TODO: i18n
                        msg = "Are you sure you want to delete the page '%1'?";
                        msg = msg.replace("%1", node.getProperty("id"));
                        $.rib.confirm(msg, function () {
                            $.rib.pageUtils.deletePage(node.getUid());
                        });
                    } else {
                        ADM.removeChild(node.getUid(), false);
                    }
                    e.stopPropagation();
                    return false;
                });

            function validValue(node, element, type) {
                var oldValue, cfm, ret = null, value = element.val();
                // When widget that have event handlers, after user make the ID
                // property be blank, then popup a confirm dialog.
                if (element.attr('id') === 'id-value' && element.val() === "" && node.hasEventHandlers()) {
                    oldValue = node.getProperty('id');
                    cfm = confirm(
                        "All event handlers of this widget will stop working"
                        + "and can't be exported if the ID property is empty."
                        + "Are you sure you want to set the ID property to "
                        + "empty?"
                    );
                    if (!cfm) {
                        // Restore to old value.
                        return oldValue;
                    };
                }

                // Parsing the property value with property type
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
        }
    });

     /**
     * Update options list according an array.
     * @param {JQObject} optionsList Container options will be appended to
     * @param {String} options Options array, item in the array can be string
     *     or object, which contains:
     *     {
     *         value: must have
     *         clickCallback: optional, the default handler is to
     *             fill the text input with this option's value.
     *         cssClass: special css class need to be added to list item
     *         stable: if the item is stable and fixed in the list, it means
     *                 the item will always show in the list
     *     }
     * @return {JQuery Object} return root object of datalist if success, false null.
     *
     */
    function updateOptions (optionsList, optionArray) {
        var i, value, option, handler,
            defaultHandler, cssClass, stable;

        // its value will fill the input
        defaultHandler = function(e) {
            var optionsWrapper = $(this).parents('.datalist:first');
            optionsWrapper.hide();
            optionsWrapper.prev('input')
                .val($(this).text())
                .change();
        };
        // remove items which is not stable
        optionsList.find(':not(.stable)').remove();
        // fill the optionsList
        for (i in optionArray) {
            option = optionArray[i];
            value = handler = null;
            cssClass = '';
            if (option instanceof Object) {
                value = option.value;
                handler = option.clickCallback;
                cssClass = option.cssClass;
                if (option.stable) {
                    cssClass += ' stable';
                }
            } else if (typeof option === 'string') {
                value = option;
            }
            if (!value) continue;
            if (typeof handler !== 'function') {
                handler = defaultHandler;
            }
            $('<li>' + value + '</li>')
                .click(handler)
                .addClass(cssClass)
                .appendTo(optionsList);
        }
        return;
    }

    /**
     * Create a datalist from an options array.
     * @param {String} options Options array, item in the array can be string
     *     or object, which contains:
     *     {
     *         value: must have
     *         clickCallback: optional, the default handler is to
     *             fill the text input with this option's value.
     *         cssClass: special css class need to be added to list item
     *         stable: if the item is stable and fixed in the list, it means
     *                 the item will always show in the list
     *     }
     * @return {JQuery Object} return root object of datalist if success, false null.
     *
     */
    function createDatalist(options) {
        var datalist, input, optionsList;
        if (!(options instanceof Array)) {
            console.error('Creating datalist error.');
            return null;
        }
        // create base structure
        datalist =  $('<div/>');
        input = $('<input type="text" value=""/>').appendTo(datalist);
        optionsList = $('<ul/>');
        $('<div style="display:none"/>')
            .addClass('datalist')
            .append(optionsList)
            .appendTo(datalist);

        // close the options list when the whole datalist blur
        input.blur(function (e){
            var dropDown, selected;
            dropDown = $(this).nextAll('.datalist:first');
            selected = optionsList.find('li:hover');
            if (!selected.length) {
                dropDown.hide();
                $(this).removeClass('datalist-input');
            }
            return;
        });

        // bind event handler, to show the options
        input.focus(function (e){
            var dropDown = $(this).nextAll('.datalist:first');
            dropDown.find('*').andSelf().show();
            $(this).addClass('datalist-input');
        });
        // bind keyup event handler to filter matched options
        input.keyup(function (e){
            var inputedText = this.value,
                dropDown = $(this).nextAll('.datalist:first');
            options = dropDown.find('li');
            dropDown.find('*').andSelf().show();
            $.each(options, function(i, item){
                if ($(item).hasClass('stable')) return;
                if($(item).text().indexOf(inputedText) < 0) {
                    $(item).hide();
                }
                return;
            });
        });
        // fill the list initially
        updateOptions(optionsList, options);
        return datalist;
    }

})(jQuery);
