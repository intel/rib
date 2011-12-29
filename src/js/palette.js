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

/*
 * The palette.json properties are:
 *
 *   id:      String, internal reference this widget set
 *   name:    String, human readable name and/or description
 *   version: String, (XXX: Unused, possible future value?)
 *   widgets: Array of objects, each with the following properties:
 *
 *       name:   String, Human readable widget name (TODO: L10N?)
 *       type:   String, HTMLElement type to use with createElement()
 *       icon:   String, CSS class id for the icon representation
 *       helper: String, HTML to use for creating the drag helper
 *       code:   String, HTML to be created when inserting this widget
 *                       into the DOM
 */

function loadPalette(container, filename) {
    var defaultContainer = '#palette-panel';
    var myContainer = container;

    if (!myContainer) {
	myContainer = $(defaultContainer);
    }

    if (!myContainer || !myContainer.get()) {
	return false;
    }

    return $.getJSON(filename, function(data){
        console.log("Starting palette load...");
	myContainer.append('<p id="palette_header" class="ui-helper-reset ui-widget ui-widget-header">Palette</p>');
	myContainer.append('<ul id="palette_accordion"></ul>');

	var hdr = $('#palette_header');
	var acc = $('#palette_accordion');

	// Make use of the flex box model in CSS3 to allow the tabs
	// to grow/shrink with the window/container
	myContainer.addClass('vbox');
	hdr.addClass('flex0');
	acc.addClass('flex1');

        // FIXME: Eventually, all widgets should come from the BWidget
        //        global structure.  For now, we load them as their own
        //        subcategory in the palette
	$(acc).append('<li><p>Tizen Framework</p><ul id="Tizen-widgets"></ul></li>');
        $.each(BWidget.getPaletteWidgetTypes(), function(n, id) {
	    // Add new <li> element to hold this widget
	    var ul = $('#Tizen-widgets');
	    var li = $('<li id="BWidget-'+id+'"></li>').appendTo($(ul));
	    $(li).button({
		label: BWidget.getDisplayLabel(id),
		icons: {primary: BWidget.getIcon(id)}
	    });
	    $(li).disableSelection();
	    $(li).addClass('nrc-palette-widget');
	    $(li).data("code", BWidget.getTemplate(id));
	    $(li).data("adm-node", {type: id});
	    $(ul).append($(li));
        });

	$(acc).accordion({
	    fillSpace: true,
	});

	// Must explicitly react to window resize events to be
	// able to grow/shrink if we're in a flex box layout
	$(window).resize( function () { $(acc).accordion("resize"); });
    });
}
