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

// Project view widget

(function($, undefined) {

    $.widget('rib.projectView', $.rib.baseView, {

        options: {
            projectDialog: null
        },

        _create: function() {
            var o = this.options,
                e = this.element,
                widget = this;

            // Chain up to base class _create()
            $.rib.baseView.prototype._create.call(this);

            $('<div/>').addClass(this.widgetName)
                .appendTo(this.element);

            // Add a hidden file input element, used to trigger the browsers
            // native file browse/find dialog when user wants to import a new
            // project file into the RIB application
            $('<input type="file"/>')
                .attr({id:'importFile'})
                .addClass('hidden-accessible')
                .change(widget._importChangedCallback)
                .appendTo(this.element[0].ownerDocument.body);

            // Add a project setting dialog element, used to configure
            // project setting at creation, or to modify them later.
            this.options.projectDialog =  this._createSettingDialog();

            return this;
        },

        _importChangedCallback: function (e) {
            var file;
            if (e.currentTarget.files.length === 1) {
                file = e.currentTarget.files[0];
                $.rib.pmUtils.importProject(file, function () {
                    // show the layout tab
                    $(document.body).tabs('select', 1);
                });
            } else {
                if (e.currentTarget.files.length <= 1) {
                    console.warn("No files specified to import");
                } else {
                    console.warn("Multiple file import not supported");
                }
            }
            // Clear the value
            $(e.currentTarget).val('');
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
            var pidArr, stage, container;
            widget = widget || this;
            container = $('.projectView').last();
            container.empty();
            //get project counts from PM-API
            pidArr = $.rib.pmUtils.listAllProject();
            if(!pidArr){
                console.error("Error: failed to list all projects.");
            }
            $.each(pidArr, function(index, value){
                // value is an object contains {"pid":XX, "date":XXX}
                widget.createProjectBox(value.pid, container, widget);
            });
            // Mark the active project box
            $('#'+$.rib.pmUtils.getActive(), container)
                .addClass('ui-state-active');
            if (event && event.name === "designReset") {
                // Scan the resource refernce count
                $.rib.pmUtils.scanADMNodeResource(event.design, true);
            }
        },

        // Private functions
        _dialogOpenHandler: function (e, ui) {
            try {
                var name = "Untitled", isCreate, dialog, id, t,
                pmUtils = $.rib.pmUtils, currentTheme = "Default",
                pid, themeNames;
                dialog = this.options && this.options.projectDialog;
                dialog = dialog || $(this).dialog('option', 'projectDialog');
                isCreate = dialog.data('new-project-dialog');
                if (!isCreate) {
                    pid = pmUtils.getActive();
                    if (pid) {
                        name = pmUtils.getProperty(pid, "name");
                        currentTheme = pmUtils.getProperty(pid, "theme");
                    }
                }
                //clear all items in list of themes
                $('#themePicker', dialog).empty();
                // Insert the list of themes
                themeNames = pmUtils.getAllThemes();
                for (t in themeNames) {
                    id = themeNames[t];
                    $('<option id="'+ id +'" value="' + id + '">'+ id + '</option>')
                        .appendTo('#themePicker', dialog);
                }
                //make sure current theme of project is selected
                $('#themePicker', dialog).val(currentTheme);
                $("#projectName", dialog).val((isCreate)?'':name);
                $(".ui-button-text", dialog).text((isCreate)?'Next':'Done');
            } catch (err) {
                console.error(err.message);
                return false;
            }
        },

        _dialogCloseHandler: function (e, ui) {
            try {
                var opts = {}, isCreate, dialog;
                dialog = this.options && this.options.projectDialog;
                dialog = dialog || $(this).dialog('option', 'projectDialog');
                isCreate = dialog.data('new-project-dialog');
                opts.name = $("#projectName", dialog).val()|| "Untitled";
                opts.theme = $("#themePicker", dialog).val() || "Default";

                if (isCreate) {
                    //call project API to create a new project
                    $.rib.pmUtils.createProject(opts, function() {
                        // show the layout tab
                        $(document.body).tabs('select', 1);
                    });
                } else {
                    //call project API to update current project
                    $.rib.pmUtils.setProperties($.rib.pmUtils.getActive(), opts);
                    $(':rib-projectView').projectView('refresh');
                }
                // Blank out the title
                dialog && $('#projectName', dialog).val('');
                dialog && dialog.dialog("close");
                return true;
            }
            catch (err) {
                console.error(err.message);
                return false;
            }
        },

        _createPrimaryTools: function() {
            var tools;
            tools = $('<div/>').addClass('hbox').hide()
                .append('<button id="newProj"></button>')
                .append('<button id="importProj"></button>');
            tools.children().addClass('buttonStyle ui-state-default')
                .first().click(this, function(e) {
                    var d = e.data.options.projectDialog;
                    d.dialog('option', 'title', 'New Project')
                        .data('new-project-dialog',true)
                        .dialog("open");
            });
            return tools;
        },

        _createSecondaryTools: function() {
            $('#setProj',document.body).click(this, function(e){
                var d = e.data.options.projectDialog;
                d.dialog('option', 'title', 'Project Settings')
                    .data('new-project-dialog',false)
                    .dialog("open");
                e.stopPropagation();
            })
            return [];
        },

        _modelUpdatedHandler: function(event, widget) {
            widget = widget || this;
            var node;
            // if the designDirty is false, then set it
            if (!($.rib.pmUtils.designDirty)) {
                $.rib.pmUtils.designDirty = true;
            }
            node = event.node;
            switch (event.type) {
                case 'nodeAdded':
                    $.rib.pmUtils.scanADMNodeResource(node, true);
                    break;
                case 'nodeRemoved':
                    $.rib.pmUtils.scanADMNodeResource(node, false);
                    break;
                case 'propertyChanged':
                    if (event.newValue && node.propertyMatches($.rib.pmUtils.relativeFilter, event.property, event.newValue)) {
                        $.rib.pmUtils.addRefCount(event.newValue);
                    }
                    if (event.oldValue && node.propertyMatches($.rib.pmUtils.relativeFilter, event.property, event.oldValue)) {
                        $.rib.pmUtils.reduceRefCount(event.oldValue);
                    }
                    break;
                default:
                    break;
            }

        },

        _createSettingDialog: function() {
            var projectDialog = this.options.projectDialog,
                themeNames, pmUtils = $.rib.pmUtils;

            projectDialog = $('<div/>')
                .addClass('ribDialog')
                .appendTo(this.element[0].ownerDocument.body);
            $('<div/>').addClass('hbox')
                .append('<div/>')
                .children(':first')
                .addClass('flex1 vbox wrap_left')
                .append('<form><legend/><ul>' +
                    '<li><label for="name">Project Name</label>' +
                    '<input type ="text" id="projectName" value=""/></li>' +
                    '<li class="dialog-rows-distance"><label for="name">Theme</label>' +
                    '<select id="themePicker" size="4"></select></li>' +
                    '<li><u id="uploadTheme">' +
                    'Upload Theme</u></li>' +
                    '</ul></form><div class="div-bottom"></div>')
                .end()
                .append('<div/>')
                .children(':last')
                .addClass('flex1 wrap_right')
                .end()
                .appendTo(projectDialog, this);

            $(document).delegate('#uploadTheme', "click", function () {
                $.rib.fsUtils.upload('any', projectDialog, function(file) {
		            var handler = function () {
                        var themeName, themeList = [];

                        // get current themes from select element
                        projectDialog.find('#themePicker option').each(function () {
                            themeList.push($(this).val());
                        });
                        for (themeName in pmUtils.themesList) {
                            // if imported theme file isn't in theme select list, add it
                            // to the list else do nothing
                            if (jQuery.inArray(themeName, themeList) === -1) {
                                $('<option id="'+ themeName +'" value="' +
                                    themeName + '">'+ themeName + '</option>')
                                    .appendTo('#themePicker', projectDialog);
                            }
                        }
                    };

                    pmUtils.uploadTheme(file, handler);
                });
            });
            projectDialog.dialog({
                autoOpen: false,
                modal: true,
                height: 489,
                width: 770,
                resizable: false,
                title: "New Project",
                buttons: { 'Next': this._dialogCloseHandler },
                open: this._dialogOpenHandler
                });

            // Call our close handler onSubmit, not default action
            projectDialog.find('form').submit(this, function(e) {
                e.stopImmediatePropagation();
                e.preventDefault();
                if (e && e.data && e.data._dialogCloseHandler) {
                    return e.data._dialogCloseHandler(e);
                }
                return false;
            });

            // Reparent the jquery-ui dialog button pane into our div so we
            // can acheive the desired layout (See pg 6 of the UI spec).
            $('.ui-dialog-buttonpane',$(projectDialog).dialog('widget'))
                .detach()
                .appendTo(projectDialog.find('.div-bottom'));
            $('.ui-button-text', projectDialog.dialog('widget'))
                .addClass('buttonStyle');
            return projectDialog;
        },

        createProjectBox: function(pid, container, widget) {
            var box, title, content, thumbnail, tnWrapper, rightSide,
                svgContainer, foreignHTML;
            widget = widget || this;
            container = container || $('.projectView').last();
            // draw project box
            box = $('<div/>').attr('id',pid)
                             .addClass('projectBox vbox')
                             .appendTo(container);
            title = $('<div />').addClass('titleBar flex0')
                        .append('<span>' + $.rib.pmUtils.getProperty(pid, "name") + '</span>')
                        .append('<div class="openButton"></div>')
                        .appendTo(box);
            content = $('<div />').addClass('content flex1 hbox')
                      .appendTo(box);
            tnWrapper = $('<div />').addClass('thumbnail-wrapper flex0')
                        .appendTo(content);
            foreignHTML = $.rib.pmUtils.getProperty(pid, "thumbnail");
            if (foreignHTML) {
                // get a new SVG
                thumbnail = widget._newSVG();
                svgContainer = $('#svg-container', thumbnail);
                svgContainer.append(foreignHTML);
                tnWrapper.append(thumbnail);
                widget._scaleSVG(tnWrapper);
            } else {
                tnWrapper.append('<img class="thumbnail" src="src/css/images/emptyProjectThumbnail.png" />');
            }
            $('<div />').addClass("rightSide flex1")
                        .append('<b>LAST OPENED</b><br />')
                        .append('<span>' + ($.rib.pmUtils.getProperty(pid, "accessDate")).toString().slice(4, 24) + '</span>')
                        .append($('<div>Clone</div>').addClass("clone button"))
                        .append($('<div>Delete</div>').addClass("delete button"))
                        .appendTo(content);
            widget._buttonEvents(box, pid, widget);
        },
        // create a thumbnail SVG
        _newSVG: function() {
            var thumbnail, str, device, cssHeaders,
                design, cssFiles = [], cssStr = '';
                design = ADM.getDesignRoot();
            cssHeaders = design.getProperty('css');
            $.each(cssHeaders, function (index, cssHeader){
                if (cssHeader.designOnly) return;
                if (cssHeader && cssHeader.value) {
                    var thumbCss = $.rib.pmUtils.toThumbCssPath(cssHeader);
                    cssFiles.push($.rib.toSandboxUrl(thumbCss));
                }
            });
            $.each(cssFiles, function (index, cssFile){
                cssStr += '@import url("' + cssFile + '");\n';
            });
            thumbnail = $('<svg class="thumbnail" xmlns="http://www.w3.org/2000/svg">\n' +
                       '<style type="text/css" >\n' +
                       '<![CDATA[\n' + cssStr + ']]>\n' +
                       '</style>\n' +
                       '<foreignObject id="svg-container" width="100%" height="100%">\n' +
                       '</foreignObject>\n' +
                       '</svg>');
            // get the default size of device
            device = $.rib.pmUtils.getPropertyDefault("device");
            thumbnail.width(device.screenWidth);
            thumbnail.height(device.screenHeight);
            return thumbnail;
        },
        _scaleSVG: function(tnWrapper) {
            var thumbnail, sX;
            thumbnail = tnWrapper.find('svg.thumbnail');
            if (thumbnail.length !== 1) {
                console.error("Requrie only one svg in thumbnail wrapper.");
                return false;
            }
            sX = (tnWrapper.width() - 2)/thumbnail.width();
            thumbnail.css({'-webkit-transform':'scale('+sX+','+sX+')',
                           '-webkit-transform-origin':'2 2'});
        },
        _buttonEvents: function(box, pid, widget) {
            var renameHandler, openHandler, cloneHandler, deleteHandler;
            renameHandler = function(e) {
                var spanElement = $(this),
                    renameProject = function(e, inputElement, spanElement) {
                        var projectName = inputElement.val();
                        if (projectName.trim() == '')
                            projectName = 'Untitled'
                        $.rib.pmUtils.setProperty(pid, "name", projectName);
                        spanElement.html(projectName);
                        spanElement.show();
                        inputElement.remove();
                    };

                spanElement.hide();
                $('<input>')
                    .attr('type', 'text')
                    .val(spanElement.html())
                    .appendTo(spanElement.parent())
                    .keydown(function(e) {
                        if (e.keyCode == '13') {
                            renameProject(e, $(this), spanElement);
                        }
                    })
                    .blur(function(e) {
                        renameProject(e, $(this), spanElement);
                    })
                    .select()
                    .focus();
            };
            openHandler = function () {
                var success = function () {
                    // show the layout tab
                    $(document.body).tabs('select', 1);
                };
                $.rib.pmUtils.openProject(pid, success);
            };
            cloneHandler = function () {
                var success = function (destPid) {
                    widget.refresh();
                };
                $.rib.pmUtils.cloneProject(pid, success);
            };
            deleteHandler = function () {
                var msg, success = function (pid) {
                    widget.refresh();
                    // If the deleted project it the active project
                    // or there is no project then find the last opened project
                    // and open it, create a new project in no project case
                    if (!$.rib.pmUtils.getActive()) {
                        $(document.body).one("tabsselect", function (e, tab) {
                            if (tab.index !== 0) {
                                $.rib.pmUtils.showLastOpened();
                            }
                        });
                    }
                };

                // TODO: i18n
                msg = "Are you sure you want to delete the '%1' project?";
                msg = msg.replace("%1", $.rib.pmUtils.getProperty(pid, "name"));
                $.rib.confirm(msg, function() {
                    $.rib.pmUtils.deleteProject(pid, success);
                });
            };
            box.find('.titleBar > span').dblclick(renameHandler);
            box.find('.openButton').click(openHandler);
            box.find('.clone.button').click(cloneHandler);
            box.find('.delete.button').click(deleteHandler);
        },
    });
})(jQuery);
