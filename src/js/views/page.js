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

// Page view widget

(function($, undefined) {

    $.widget('rib.pageView', {

        options: {
            model: null,
        },

        _create: function() {
            var o = this.options,
                e = this.element,
                self = this;

            o.designReset = this._designResetHandler;
            o.selectionChanged = null;
            o.activePageChanged = this._activePageChangedHandler;
            o.modelUpdated = this._modelUpdatedHandler;;

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
                .append('<div/>')
                .children(':first')
                    .addClass('panel-section-header')
                    .append('<span class="title">Pages</span>')
                    .append('<span class= "tool"></span>')
                    .children(':last')
                        .append('<a id="addPage">Add Page</a>')
                        .append('<span class="divider">&nbsp;</span>')
                        .append('<a id="copyPage">Duplicate Page</a>')
                    .end()
                .end()
                .children().last()
                    .attr({id: 'pages-wrap'})
                    .addClass('panel-section-contents')
                    .append('<div/>')
                    .children().first()
                        .addClass('page-arrow left')
                        .click( function(e) {
                            self._scrollPage(false);
                            e.stopPropagation();
                            return false;
                         })
                    .end().end()
                    .append('<div/>')
                    .append('<div/>')
                    .children().eq(2)
                        .addClass('page-arrow right')
                        .click( function(e) {
                            self._scrollPage(true);
                            e.stopPropagation();
                            return false;
                         })
                    .end().end()
                .end();
            this.element.find('#pages-wrap')
                .children().eq(1)
                    .attr({id:'box'})
                    .addClass('pages-box')
                    .append('<div/>')
                    .children().first()
                        .addClass('allwidth')
                        .append('<div/>')
                        .children().first()
                            .attr({id:'pages'})
                        .end().end()
                    .end().end()
                .end().end();
            this.element.find('#copyPage').click(this, this._copyPageHandler);
            this.element.find('#addPage').click(this, this._addPageHandler);
            this.options.primaryTools = this._createPrimaryTools();
            this.options.secondaryTools = this._createSecondaryTools();
            this.options.newPageDialog = $('#pageDialog');
            if (!this.options.newPageDialog.length) {
                this.options.newPageDialog = this._initNewPageDialog();
            }

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
        /*
         * scroll page view
         * direction: boolean. if true, scroll right; false, scroll left.
         */
        _scrollPage: function(left, index) {
            var box = this.element.find('#box'),
                length = this.element.find('.pageIcon').outerWidth(true),
                scroller = this.element.find('#pages'),
                pageCount = scroller.children().length,
                visibleCount = (box.innerWidth() / length).toFixed(), pos,
                scrollLeft = box.scrollLeft();

            if (index === undefined && typeof(left) !== 'boolean') {
                index = parseInt(left,10);
                left = undefined;
            }

            if (index >= 0 && index < scroller.children().length ) {
                if (index*length+length >= scrollLeft + box.innerWidth()) {
                    box.animate({
                        scrollLeft: scrollLeft + index * length + length -
                                    box.innerWidth()});
                } else if (index*length < scrollLeft) {
                    box.animate({scrollLeft: index*length});
                }
                return;
            }

            if(left){
                if (scrollLeft < (pageCount-visibleCount)*length){
                    box.animate({scrollLeft: scrollLeft + length});
                }
            } else {
                if(scrollLeft !== 0){
                    box.animate({scrollLeft: scrollLeft - length});
                }
            }
        },
        refresh: function(event, widget) {
            var pageWidgets,
                model = this.options.model,
                pages = $('#pages', this.element);

            if (model) {
                pageWidgets = model.getDesignRoot().getChildren();
                pages.empty();

                for ( var i = 0; i < pageWidgets.length; i ++) {
                    $('<div>'+(i+1)+'</div>')
                        .addClass('pageIcon')
                        .toggleClass('ui-selected',
                            pageWidgets[i] === model.getActivePage())
                        .data('page', pageWidgets[i])
                        .click(function (e) {
                            model.setActivePage($(this).data('page'));
                        })
                        .hover(function (e) {
                            $(this).children(':first').show();
                        }, function (e) {
                            $(this).children(':first').hide();
                        })
                        .appendTo(pages);
                }
            }
            if (!event || !event.name ||
                event.name !== 'activePageChanged'|| !event.page) {
                return;
            } else {
                ($('.pageIcon')[event.page.getZoneIndex()]).scrollIntoView();
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

        _activePageChangedHandler: function(event, widget) {
            var newIndex = event&&event.page && event.page.getZoneIndex(),
                oldIndex = event&&event.oldPage && event.oldPage.getZoneIndex();

            widget = widget || this;

            // FIXME: This should just toggle 'ui-selected' class, not
            //        cause a complete re-creation of the page list
            //widget.refresh(event,widget);
            widget.element.find('.ui-selected').removeClass('ui-selected');
            widget.element.find('#pages').children().eq(newIndex)
                .addClass('ui-selected');
            widget._scrollPage(newIndex);
        },

        _modelUpdatedHandler: function(event, widget) {
            if (event.node && event.node.getType()==='Page' &&
               (event.type === "nodeRemoved" ||
                event.type === "nodeAdded")) {
                widget.refresh(event, widget);
            } else {
                return;
            }
       },

        _addPageHandler: function(event) {
            var widget = event && event.data,
                newPage;

            if (!widget && !widget.options && !widgets.options.model) {
                return;
            }
            $('#pageDialog').dialog('open');
            event.stopImmediatePropagation();
            return false;
        },

        _copyPageHandler: function(event) {
            var widget = event && event.data, newPage, curPage, adm;

            if (!widget || !widget.options || !widget.options.model) {
                return;
            }
            adm = widget.options.model;

            curPage = adm.getActivePage();
            newPage = adm.copySubtree(curPage);

            if (adm.addChild(adm.getDesignRoot(), newPage)) {
                adm.setActivePage(newPage);
            }

            event.stopImmediatePropagation();
            return false;
        },

        _dialogOpenHandler: function (e, ui) {
            try {
                var dialog = $('#pageDialog') || $(this).dialog('option', 'newPageDialog');
                dialog.find('#pagePicker').get(0).selectedIndex = 0;
                dialog.find('#header_layout').attr("checked", true);
                dialog.find('#footer_layout').attr("checked", true);
            }
            catch (err) {
                console.error(err.message);
                return false;
            }
        },

        _dialogCloseHandler: function (e, ui) {
            try {
                var options = {}, layout = [], newPage,
                    dialog = $('#pageDialog');

                options.pageTemplate = dialog.find("#pagePicker").val();
                //get checkbox value
                if (dialog.find('#header_layout').is(":checked")) {
                    layout.push('Header');
                }
                if (dialog.find('#footer_layout').is(":checked")) {
                    layout.push('Footer');
                }
                options.layout = layout;
                newPage = $.rib.pageUtils.createNewPage(options);
                ADM.setActivePage(newPage);
                dialog.dialog("close");
                return true;
            }
            catch (err) {
                console.error(err.message);
                $("#pageDialog").dialog("close");
                return false;
            }
        },

        _initNewPageDialog: function() {
            var self = this,
                model = self.model,
                newPageDialog, t, id,
                ptNames = ['JQuery Mobile Page',
                           'Recently Used Page',
                           'Blank Page'],
                pageUtils = $.rib.pageUtils;
            newPageDialog = $('<div/>')
                .attr('id', 'pageDialog')
                .addClass('ribDialog')
                .appendTo(this.element[0].ownerDocument.body);
            $('<div/>').addClass('hbox')
                .append('<div/>')
                .children(':first')
                .addClass('flex1 vbox wrap_left')
                .append('<form><ul><li/>' +
                        '<li class="mt23"><label for="Template">page Template</label>' +
                        '<select id="pagePicker" size="1"></select></li>' +
                        '<li class="m150 mt30"><label for="Layout">Layout</label>' +
                        '<fieldset><ul>' +
                        /*
                        '<li>' +
                        '<input class="fieldInput" type="radio" name="Layout"/>' +
                        '<label class="fieldLabel" for="layout">Normal Page</label></li>' +
                        '<li>' +
                        '<input class="fieldInput" type="radio" name="Layout"/>' +
                        '<label class="fieldLabel" for="layout">Dialog</label></li>' +
                        */
                        '<li>' +
                        '<input id="header_layout" class="fieldInput" type="checkbox" name="Header"/>' +
                        '<label class="fieldLabel" for="layout">Header</label></li>' +
                        '<li>' +
                        '<input id="footer_layout" class="fieldInput" type="checkbox" name="Footer"/>' +
                        '<label class="fieldLabel" for="layout">Footer</label></li>' +
                        '</ul></fieldset></li>' +
                        '</ul></form><div class="div-bottom"/>')
                .end()
                .append('<div/>')
                .children(':last')
                .addClass('flex1 wrap_right')
                .end()
                .appendTo(newPageDialog, self);
            // Insert the list of page templates
            for (t in ptNames) {
                id = ptNames[t];
                $('<option id="'+ id +'" value="' + id + '">'+ id + '</option>')
                    .appendTo('#pagePicker', self);
            }

             //once user change the page Template, change the layout value
             $('#pagePicker',newPageDialog).change( function(e) {
                 var types, i;
                 switch (e.currentTarget.value) {
                     case ptNames[0]:
                         newPageDialog.find('#header_layout').attr("checked", true);
                         newPageDialog.find('#footer_layout').attr("checked", true);
                         break;
                     case ptNames[1]:
                         types = pageUtils.getActivePageLayout();
                         if ($.inArray('Header', types) !== -1) {
                              newPageDialog.find('#header_layout').attr("checked", true);
                         } else {
                             newPageDialog.find('#header_layout').attr("checked", false);
                         }
                         if ($.inArray('Footer', types) !== -1) {
                             newPageDialog.find('#footer_layout').attr("checked", true);
                         } else {
                             newPageDialog.find('#footer_layout').attr("checked", false);
                         }
                         break;
                    default:
                         newPageDialog.find('#header_layout').attr("checked", false);
                         newPageDialog.find('#footer_layout').attr("checked", false);
                         break;
                 }
             });
             // Call our close handler onSubmit, not default action
             newPageDialog.find('form').submit(this, function(e) {
                 e.stopImmediatePropagation();
                 e.preventDefault();
                 if (e && e.data && e.data._dialogCloseHandler) {
                     return e.data._dialogCloseHandler(e);
                 }
                 return false;
             });
             newPageDialog.dialog({
                 autoOpen: false,
                 modal: true,
                 height: 454,
                 width: 770,
                 resizable: false,
                 title: 'New Page',
                 open: self._dialogOpenHandler,
                 buttons: { 'Add Page': this._dialogCloseHandler,
                            'Cancel': function() {
                                $( this ).dialog( "close" );
                            }
                          }
             });
             // Reparent the jquery-ui dialog button pane into our div so we
             // can acheive the desired layout (See pg 6 of the UI spec).
             $('.ui-dialog-buttonpane',newPageDialog.dialog('widget'))
                 .detach()
                 .appendTo(newPageDialog.find('.div-bottom'));
             $('.ui-button-text', newPageDialog.dialog('widget')).first()
                 .addClass('buttonStyle');
             $('button', newPageDialog.dialog('widget')).last()
                 .removeClass('ui-button ui-corner-all')
                 .addClass('linkStyle');

             return newPageDialog;
         },
    });
})(jQuery);
