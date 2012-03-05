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

// Project view widget

(function($, undefined) {

    $.widget('gb.projectView', {

        options: {
            model: null,
        },

        _create: function() {
            var o = this.options,
                e = this.element,
                widget = this;

            o.designReset = null;
            o.selectionChanged = null;
            o.activePageChanged = null;
            o.modelUpdated = null;

            // FIXME: This should work, but $.extend of options seems to be
            //        creating a copy of the ADM, which will not containt the
            //        same nodes and events as the master
            //o.model = o.model || ADM || undefined;
            if (o.model) {
                this._bindADMEvents(o.model);
            }

            $('<div/>').addClass(this.widgetName)
                .text(this.widgetName)
                .appendTo(this.element);

            // Add a hidden file input element, used to trigger the browsers
            // native file browse/find dialog when user wants to import a new
            // project file into the GUI Builder application
            $('<input type="file"/>')
                .attr({id:'importFile'})
                .addClass('hidden-accessible')
                .change(widget._importChangedCallback)
                .appendTo(this.element[0].ownerDocument.body);

            // Add a project setting dialog element, used to trigger to configure
            // project setting when user want to create or modify project setting
            this.options.projectDialog =  this._createSettingDialog();

            this.options.primaryTools = this._createPrimaryTools();
            this.options.secondaryTools = this._createSecondaryTools();

            this.refresh(null, this);

            return this;
        },

        _importChangedCallback: function (e) {
            var file, reader;
            if (e.currentTarget.files.length === 1) {
                file = e.currentTarget.files[0];
            } else {
                if (e.currentTarget.files.length <= 1) {
                    console.warn("No files specified to import");
                } else {
                    console.warn("Multiple file import not supported");
                }
                return false;
            }
            reader = new FileReader();
            reader.onloadend = function(e) {
                $.gb.JSONToADM(e.target.result);
                // TODO: Need to either add it to activeProject, or create a
                //       new project for it.  Once that is done, we also now
                //       should switch to the layout view, like we do when
                //       creating a new project, or on startup.  For example:
                //
                //$(document.body).tabs('select', 1);
            };
            reader.onError = function () {
                console.error("Read imported file error.");
            };
            reader.readAsText(file); // Read the file as plaintext.
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
            var pidArr, stage, container;
            widget = widget || this;
            container = $('.projectView');
            container.empty();
            //get project counts from PM-API
            pidArr = $.gb.pmUtils.listAllProject();
            if(!pidArr){
                console.error("Error: failed to list all projects.");
            }
            $.each(pidArr, function(index, value){
                // value is an object contains {"pid":XX, "date":XXX}
                widget.createProjectBox(value.pid, container, widget);
            });
        },

        // Private functions
        _createPrimaryTools: function() {
            var tools, widget, projectDialog;
            widget = this;
            projectDialog = this.options.projectDialog;
            tools = $('<div/>').addClass('hbox').hide()
                .append('<button id="newProj"></button>')
                .append('<button id="importProj"></button>');
            tools.children().addClass('buttonStyle ui-state-default')
                .first().click( function(e) {
                    projectDialog.dialog('option', 'title', "New Project")
                        .find(".buttonStyle", this)
                        .val("Next")
                        .one("click", function (e) {
                            try {
                                var options = {};
                                options.name = projectDialog.find("#projectName").val() || "Untitled";
                                //TODO add support for theme
                                /*
                                   options.theme = projectDialog.find("#themePicker").val();
                                   */
                                //call project API to create a new project
                                $.gb.pmUtils.createProject(options, function() {
                                    // show the layout tab
                                    $(document.body).tabs('select', 1);
                                    widget.refresh(widget);
                                });
                            }
                            catch (err) {
                                console.error(err.description);
                            }
                            projectDialog.dialog("close");
                            e.stopPropagation();
                            return false;
                        })
                        .end()
                        .dialog("open");
            });
            return tools;
        },

        _createSecondaryTools: function() {
           var settingButton, projectDialog, widget;
           widget = this;
           settingButton = $('#setProj',document.body);
           projectDialog = this.options.projectDialog;
           settingButton.click(function(e){
                projectDialog.dialog('option', 'title', "Project Setting")
                    .find(".buttonStyle")
                    .val("Done")
                    .one("click", function (e) {
                        try {
                            var opts = {};
                            opts.name = $("#projectName",projectDialog).val()||
                                        "Untitled";
                            //call project API to set current project
                            $.gb.pmUtils.setProject(null, opts);
                            widget.refresh(widget);
                        }
                        catch (err) {
                            console.error(err.description);
                        }
                        projectDialog.dialog("close");
                        e.stopPropagation();
                        return false;
                    })
                    .end()
                    .dialog("open");
                    e.stopPropagation();
                })
            return $('<div/>').addClass('hbox').hide()
                .append('<input type="search" />')
                .children().attr({
                    name: "filter",
                    placeholder: "filter projects"
                });
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
        },

        _activePageChangedHandler: function(event, widget) {
            widget = widget || this;
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
        },

        _createSettingDialog: function() {
            var projectDialog = this.options.projectDialog,
                themeNames = ['Project Defalut(Pink Martini)',
                               'Purple People Eater',
                               'CAstle Greyskull',
                               'Blue Meanies',
                               'Project Defalut(Pink Martini)',
                               'Purple People Eater',
                               'CAstle Greyskull',
                               'Blue Meanies'];

            projectDialog = $('<div/>')
                .addClass('gbDialog')
                .appendTo(this.element[0].ownerDocument.body);
            $('<div/>').addClass('hbox')
                .append('<div/>')
                .children(':first')
                .addClass('flex1 vbox wrap_left')
                .append('<form><legend/><ul>' +
                        '<li class="mt23"><label for="name">Project Name</label>' +
                        '<input type ="text" id="projectName" value=""/></li>' +
                        //TODO add support for theme
                        /*
                        '<li class="mt23"><label for="name">Theme</label>' +
                        '<select id="themePicker" size="4"></select></li>' +
                        '<li class="mt50"><u id="uploadTheme" class="fr mr40">Upload Theme</u></li>' +
                        */
                        '<li class="mt200"><input type="submit" value="Done" class="buttonStyle mr40 fr" />' +
                        '</li></ul></form>')
                .end()
                .append('<div/>')
                .children(':last')
                .addClass('flex1 wrap_right')
                .end()
                .appendTo(projectDialog, this);
            //TODO: add support for theme
            /*
            // Insert the list of themes
            for (var t in themeNames) {
               var id = themeNames[t];
               $('<option id="'+ id +'" value="' + id + '">'+ id + '</option>')
                   .appendTo('#themePicker', projectDialog);
            }
            */

            projectDialog.dialog({
                autoOpen: false,
                modal: true,
                height: 489,
                width: 770,
                resizable: false,
                });
            return projectDialog;
        },

        createProjectBox: function(pid, container, widget) {
            var box, title, content, thumbnail, rightSide, openHandler, cloneHandler, deleteHandler;
            widget = widget || this;
            container = container || $('.projectView');
            openHandler = function () {
                var success = function () {
                    // show the layout tab
                    $(document.body).tabs('select', 1);
                    // Mark the active project box
                    $('#'+$.gb.pmUtils._activeProject, container)
                        .addClass('ui-state-active');
                };
                $('.projectBox.ui-state-active', container)
                    .removeClass('ui-state-active');
                $.gb.pmUtils.openProject(pid, success);
            };
            cloneHandler = function () {
                var success = function (destPid) {
                    widget.refresh();
                };
                $.gb.pmUtils.cloneProject(pid, success);
            };
            deleteHandler = function () {
                var success = function (pid) {
                    widget.refresh();
                };
                $.gb.pmUtils.deleteProject(pid, success);
            };
            // draw project box
            box = $('<div/>').attr('id',pid)
                             .addClass('projectBox')
                             .appendTo(container);
            if ($.gb.pmUtils._activeProject === pid) {
                box.addClass('ui-state-active');
            } else {
                box.removeClass('ui-state-active');
            }
            title = $('<div />').addClass('titleBar')
                        .append('<h1>' + $.gb.pmUtils.getName(pid) + '</h1>')
                        .append($('<div class="openButton"></div>').click(openHandler))
                        .appendTo(box);
            thumbnail= $('<div />').addClass('thumbnail').appendTo(box);
            //TODO: .attr('backgroundImage', pmUtils.getThumbnail(pid))
            $('<div />').addClass("rightSide")
                        .append('<b>LAST OPENED</b><br />')
                        .append('<span>' + ($.gb.pmUtils.getAccessDate(pid)).toString().slice(4, 24) + '</span>')
                        // apend clone button
                        .append($('<div>Clone</div>').addClass("cloneButton").click(cloneHandler))
                        // apend delete button
                        .append($('<div>Delete</div>').addClass("deleteButton").click(deleteHandler))
                        .appendTo(box);
        },
    });
})(jQuery);
