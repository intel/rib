/*
 * gui-builder - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
/**
 * ADM helper to operate ADM tree
 *
 * @class
 */
var $designContentDocument,
$designView,
$admDesign;


var ADMUtils = {
    /**
     * Global initiate
     */
    init: function() {
	$designView = $('#design-view');
        $designContentDocument = $($designView[0].contentDocument);
        if ($admDesign === undefined)
            $admDesign = ADM.getDesignRoot();
    },

    /**
     * Serialize ADM to DOM: copied from Shane's implementation
     */
    serializeADMNodeToDOM: function(node, parentSelector) {
	var parentNode = $designContentDocument.find(parentSelector),
	template = node.getTemplate(),
	uid = node.getUid(),
	type = node.getType(),
	widget;

	// Find the parent element of this node in the DOM tree
	if (parentNode === undefined || parentNode === null ||
            !parentNode || parentNode.length < 1) {
            // No sense adding it to the DOM if we can't find it's parent
            console.error(parentSelector+' not found in Design View');
            return false;
	}
        /*
	// Ensure we have at least something to use as HTML for this item
	if (template === undefined || template === '') {
        console.warn('Missing template for ADMNode type: '+type+
	'.  Trying defaults...');
        // Why need this if only support widgets in registry?
        // template = defaultTemplates[type];
        // If no default exists, we must error out
        if (template === undefined || template === '') {
	console.error('No template exists for ADMNode type: '+type);
	return false;
        }
	}
        */

	// Replace all "id" placeholders with this instance id
	// TODO: Ensure all widgets have an "id" placeholder in their templates
	template = template.replace(/%UID%/g,'ADMNode_'+uid);
	template += '\n';

        console.log( uid + ' : ' + type + ' : ' + template);
	// Turn the template into an element instance, via jquery
	widget = $(template);

	// Make sure this element has an id (in the event none was
	// set via the template id regex above
	if (widget[0].id === undefined || widget[0].id === '')
            widget[0].id = 'ADMNode_'+uid;

	// Add a special (temporary) class used by the JQM engine to
	// easily identify the "new" element(s) added to the DOM
	//$(widget).addClass('nrc-dropped-widget');
	//$(widget).addClass('adm-node');

	// TODO: Should we really try to do the "right thing" here, or do we
	//       need to push this back to the widget definition as the ONLY
	//       place this containership behavior can be defined?
        /*
	  if ((node.getChildrenCount() !== 0) &&
          !($(widget).hasClass('nrc-sortable-container')))
          $(widget).addClass('nrc-sortable-container');
        */

	// Now we actually add the new element to it's parent
	// TODO: Be smarter about insert vs. append...

	$(parentNode).append($(widget));

	return true;
    },

    serializeADMSubtreeToDOM: function(node, spaces) {
	var isContainer, indent = ' '+(spaces?spaces:'');

	// 1. Only handle ADMNodes
	if (!(node instanceof ADMNode))
            return;

	// 2. Do something with this node
	isContainer = (node.getChildrenCount() !== 0);

	// Since we're regenerating this DOM subtree, delete this node
	// (and it's subtree)
	if (node.instanceOf('Design')) {
            // Special Case... Only remove "pages" not other divs
            $designContentDocument.find('body > div.ui-page').remove();
	} else {
            var uid = node.getUid(),
            type = node.getType(),
            pid, pNode, pSelector;

            console.log('node type: ' + type + '\n');

            if (node.instanceOf('Page'))
		pSelector = 'body';
            else
		pSelector = '#ADMNode_'+node.getParent().getUid();

            // Only proceed if the parent element of this node is in the DOM
            pNode = $designContentDocument.find(pSelector);
            if (pNode && pNode.length >= 1) {
		// Remove any previous DOM element instance of this node
		$('#ADMNode_'+uid).remove();  // ATM, we don't care if it fails

		if (ADMUtils.serializeADMNodeToDOM(node, pSelector, indent))
                    console.log(indent+(isContainer?'+':' ')+type+' ('+uid+')');
		else
                    console.warn(indent+' DOM add Failed: '+type+' ('+uid+')');
            } else {
		console.error(indent+' DOM parent not found: '+pSelector);
		return;
            }
	}

	// 3. Recurse over any children
	if (isContainer) {
            var children = node.getChildren();
            for (var i=0; i<children.length; i++) {
		ADMUtils.serializeADMSubtreeToDOM(children[i], indent);
            }
	}

	// 4. Return (anything?)
	return;
    },

    serializeADMDesignToDOM: function() {
	if ($admDesign === undefined)
            $admDesign = ADM.getDesignRoot();

	ADMUtils.serializeADMSubtreeToDOM($admDesign);
    }
};

// initialize helper
ADMUtils.init();
