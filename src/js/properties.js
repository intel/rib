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

function propertyValueChanged(event) {
    var updated = event.srcElement.id.replace(/-value/,''),
        node = event.data,
        value = null;

    if (node === null || node === undefined) {
        console.error('Missing node data, property change failed!');
        return;
    }

    switch (BWidget.getPropertyType(node.getType(), updated)) {
        case 'boolean':
            value = Boolean($('#' + event.srcElement.id).val());
            break;
        case 'float':
            value = parseFloat($('#' + event.srcElement.id).val());
            break;
        case 'integer':
            value = parseInt($('#' + event.srcElement.id).val(), 10);
            break;
        case 'number':
            value = Number($('#' + event.srcElement.id).val());
            break;
        case 'object':
            value = Object($('#' + event.srcElement.id).val());
            break;
        case 'string':
            value = String($('#' + event.srcElement.id).val());
            break;
        default:
            break;
    }
    console.log(updated + " changed to " + value);
    node.setProperty(updated, value);
}

function showProperties(event) {
        var node = event.node,
            showUid = true,
            labelId, labelVal, valueId, valueVal;

        // Clear the properties pane when nothing is selected
        if (node === null || node === undefined) {
            node = ADM.getActivePage();
            if (node === null || node === undefined) {
                $('#property_content').empty()
                    .append('<label>Nothing Selected</label>');
                return;
            }
        }

        console.log("User selected ADMNode_" + node._uid);
        labelId = 'type-label';
        labelVal = 'Type';
        valueId = 'type-value';
        valueVal = node.getType();

        $('#property_content').empty()
            .append('<table></table>').children().last()
                .append('<tr><th id="' + labelId+ '">' + labelVal + '</th>' +
                      '<td width="100%">' +
                      '<label id="' + valueId + '"><b>' + valueVal + '</b>' +
                      (showUid?' (uid=' + node.getUid() + ')':'') + '</label>' +
                      '</td></tr>');

        var props = node.getProperties();
        var options = node.getPropertyOptions();
        for (var p in props) {
            labelId = p+'-label';
            labelVal = p.replace(/_/g,'-');
            valueId = p+'-value';
            valueVal = props[p];
            if(options[p]) {
                var code = '<tr><th id="' + labelId + '">' + labelVal + '</th>' +
                         '<td width="100%">' +
                         '<select id="' + valueId + '">';
                for (var o in options[p]) {
                    if(options[p][o] == props[p]) {
                        code += '<option value="' + options[p][o] + '" selected=true>' + options[p][o] + '</option>';
                    }
                    else {
                        code += '<option value="' + options[p][o] + '">' + options[p][o] + '</option>';
                    }
                }
                code += '</select>' + '</td></tr>';
                    $('#property_content').children().last()
                        .append(code);
            }
            else {
                $('#property_content').children().last()
                    .append('<tr><th id="' + labelId + '">' + labelVal + '</th>' +
                          '<td width="100%">' +
                          '<input id="' + valueId + '" value="'+valueVal + '" />' +
                          '</td></tr>');
            }

/*
            $('#select').change( function(event) {
                alert("change");
            });
            $('#select').select( function(event) {
                alert("select");
            });
*/

            $('#' + valueId).change( node, propertyValueChanged );
        }

        $('table','#property_content').attr({ 'cellspacing': '0' });
        $('th:odd, td:odd','#property_content')
            .css({ 'border-top': '1px solid black',
                   'border-bottom': '1px solid black' });
        $('td','#property_content').attr('align','left');
        $('th','#property_content').attr('align','left')
            .addClass('ui-helper-reset ui-state-default');

/*
 * The above should produce something like the following so that it will
 * render as a jQ-UI "tab" object
 *

  <p id="property_header" class="ui-helper-reset ui-widget ui-widget-header">Properties</p>
  <div id="property_tabs">
    <ul>
      <li><a href="#prop_tab_inherited">Inherited</a></li>
      <li><a href="#prop_tab_custom">Custom</a></li>
    </ul>
    <div id="prop_tab_inherited" class="prop-tab">
      <p>Inherited properties go here</p>
    </div>
    <div id="prop_tab_custom" class="prop-tab">
      <p>Custom properties go here</p>
    </div>
  </div>

*/
}

function loadProperties(container) {
    var defaultContainer = '#properties-panel',
        myContainer = container,
        contents;

    if (!myContainer) {
        myContainer = $(defaultContainer);
    }

    if (!myContainer || !myContainer.get()) {
        return false;
    }

    myContainer.append('<br><p id="property_header">Properties</p>')
        .children().last()
            .addClass("ui-helper-reset ui-widget ui-widget-header")
            .end()
        .end()
        .addClass('ui-widget-content');

    contents = $('<div id="property_content"></div>')
        .addClass('ui-widget')
        .appendTo(myContainer)
        .append('<label>Nothing Selected</label>');

    ADM.bind("selectionChanged", showProperties);
    ADM.bind("activePageChanged", showProperties);
}
