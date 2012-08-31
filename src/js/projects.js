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

/**
 * Global object to access project management.
 *
 */
$(function () {
    var fsUtils = $.rib.fsUtils,
    pmUtils = {
        _projectsInfo: {},
        _lastPid: 0,
        _activeProject: null,
        designDirty:false,
        pInfoDirty:false,
        allTags: [],
        ProjectDir: "/projects",
        thumbDir: "/thumb-css/",
        thumbPrefix: 'svg.thumbnail',
        pidPrefix: "p",
        // Filter to find sandbox resources
        relativeFilter:{
            type: "url-uploadable",
            value: /^(?!((https?|ftp):|src)\/+).+/i
        },
        // Object to save refernce count for sandbox resource
        resourceRef: {},
        propertySchema: {
            name: {
                type: "string",
                defaultValue: "Untitled"
            },
            accessDate: {
                type: "number",
                defaultValue:""
            },
            device: {
                type: "object",
                defaultValue: {
                    name: "Phones",
                    screenWidth: 320,
                    screenHeight: 480
                }
            },
            thumbnail: {
                type: "string",
                defaultValue: ""
            },
            theme: {
                type: "string",
                defaultValue: "Default"
            },
        },
        themesList: {},
        allThemes: []

    };

    /* Asynchronous. init pmUtils.
     * ls the root/projects dir to get all metadata about projects,
     * if the dir does not exist, create it.
     * @param {function()=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     *
     * @return {None}.
     */
    pmUtils.init = function (success, error) {
        var successReadData, errorCreateDir, onEnd,
            dirCount = 0,
            brokenList = [],
            fineList = [];

        onEnd = function () {
            var allHandled;
            allHandled = brokenList.length + fineList.length;
            if (allHandled === dirCount) {
                $.rib.pmUtils.showLastOpened(success, error);
            }
        };
        // success handler for reading projects directory
        successReadData = function (entries) {
            dirCount = entries.length;
            // return if there is no project
            if (dirCount === 0) {
                onEnd();
                return;
            }
            // get Max Pid from entries
            $.each(entries, function (i, e) {
                var num, pid;
                pid = e.name;
                // init _lastPid
                num = pid.substr(pmUtils.pidPrefix.length);
                num = parseInt(num);
                if (pmUtils._lastPid < num) {
                    pmUtils._lastPid = num;
                }
            });
            // fill all projects info into pmUtils._projectsInfo
            $.each(entries, function (index, e) {
                fsUtils.read(e.fullPath + "/pInfo.json", function (text) {
                    var dataObject = $.parseJSON(text);
                    // use the name of project folder as key, it's also PID
                    pmUtils._projectsInfo[e.name] = dataObject;
                    fineList.push(e.name);
                    onEnd();
                }, function () {
                    brokenList.push(e.name);
                    onEnd();
                    console.error("Can't get design file for project:",e.name);
                    // Remove the broken project directory
                    // TODO: may try to restore the project in the future
                    if (e.isDirectory) {
                        e.removeRecursively(function () {
                            console.warn("Broken project removed:",e.name);
                        });
                    }
                });
            });
            return;
        };
        errorCreateDir = function (e) {
            if (e.code === FileError.NOT_FOUND_ERR) {
                // Create a Untitled project and open it in onEnd function
                fsUtils.mkdir(pmUtils.ProjectDir, onEnd, error);
            } else {
                console.error(e.code);
                error && error();
            }
        };
        fsUtils.ls(pmUtils.ProjectDir, successReadData, errorCreateDir);
        // check default thumbnail css files
        checkDefaultThumbCss();
        //fill themes info into pmUtils.themesList
        var themePath = $.rib.fsUtils.fs.root.toURL() + 'themes.json';
        $.ajax({
            type: 'GET',
            url: themePath,
            dataType: 'json',
            success: function (data) {
                $.extend(true, pmUtils.themesList, data);
            },
            async: false
        });
        var listThemeFiles = function (entries) {
            // make allThemes array empty
            pmUtils.allThemes.length = 0;
            $.each(entries, function (index, e) {
                pmUtils.allThemes.push(e.name);
            });
        };
        $.rib.fsUtils.ls('/themes/', listThemeFiles, null);
    }

    /***************** APIs to manipulate projects *************************/
    /* Get the active project.
     *
     * @return {String} The pid of current active project, or null if none.
     */
    pmUtils.getActive = function () {
        return pmUtils._activeProject;
    };

    /* Get project folder path in sandbox, if pid is not specified, then
     * return the project directory of active project.
     *
     * @param {String} pid Project id.
     * @return {String/Null} The project folder path.
     */
    pmUtils.getProjectDir = function (pid) {
        pid = pid || pmUtils._activeProject;
        if (!pid) {
            return null;
        } else {
            return pmUtils.ProjectDir + "/" + pid + "/";
        }
    };

    /**
     * Get properties of a specified project.
     *
     * @param {String} pid Project id.
     * @return {Object} Object which contains all project properties,
     *                  or null if failed.
     */
    pmUtils.getProperties = function (pid) {
        var pInfo;
        pid && (pInfo = pmUtils._projectsInfo[pid]);
        if (!(pid && pInfo)) {
            console.error("Invalid pid in getProperties, pid:" + pid);
            return null;
        }
        return $.extend(true, {}, pInfo);
    };

    /**
     * Get the schema of a specified property.
     *
     * @param {String} property Name of specified property.
     * @return {Object} Object of property schema, or null if failed.
     */
    pmUtils.getPropertySchema = function (property) {
        var schema = pmUtils.propertySchema[property];
        if (typeof schema != "object") {
            throw new Error("Undefined schema for property:" + property);
        } else {
            return $.extend(true, {}, schema);
        }
    };

    /**
     * Get the default value of a specified property item.
     *
     * @param {String} property Name of specified property.
     * @return {Various} Default value of the property or null if failed.
     */
    pmUtils.getPropertyDefault = function (property) {
        var schema = pmUtils.getPropertySchema(property);
        if (schema) {
            if (property === 'accessDate') {
                // return the current time
                return (new Date());
            }
            return schema.defaultValue;
        }
        return schema;
    }

    /**
     * Get the value of a specified property.
     *
     * @param {String} pid Project id.
     * @param {String} property Name of specified property.
     * @return {Various} Value of the property or null if failed.
     */
    pmUtils.getProperty = function (pid, property) {
        var schema, pInfo, value;
        // get an copy of pInfo
        pInfo = pmUtils.getProperties(pid);
        if (pInfo.hasOwnProperty(property)) {
            value = pInfo[property];
        } else {
            value = pmUtils.getPropertyDefault(property);
        }
        if (property === 'accessDate') {
            return (new Date(value));
        }
        return value;
    };

    /**
     * Set value of a specified property.
     *
     * @param {String} pid Project id.
     * @param {String} property Name of specified property.
     * @param {Various} value New value for the property.
     *
     * @return {Bool} True if success, false if failed.
     */
    pmUtils.setProperty = function (pid, property, value) {
        var schema, pInfo, temp;
        // get the original object of pInfo
        pid && (pInfo = pmUtils._projectsInfo[pid]);
        if (!(pid && pInfo)) {
            console.error("Invalid pid in setProperty, pid:" + pid);
            return null;
        }
        schema = pmUtils.getPropertySchema(property);
        if (property === 'accessDate') {
            value = (new Date(value)).getTime();
        }
        if (!(pInfo && schema.type)) {
            console.error("Error: Invalid pid: " + pid +
                    " or property: " + property + " in pmUtils.setProperty");
            return false;
        }
        if (typeof value !== schema.type) {
            console.error("Error: attempted to set property " + property +
                    " (" + schema.type + ") with wrong type (" +
                    typeof value + ")");
            return false;
        }
        if (pInfo[property] !== value) {
            // just copy and over write the value
            temp = new Object();
            temp[property] = value;
            $.extend(true, pInfo, temp);
            pmUtils.pInfoDirty = true;
        }
        return true;
    };

    /**
     * Set properties for a specified project:
     * Just extends pInfo object using property object containing settings to be changed,
     * pInfo will not completely replaced by the new object.
     * Items in the new object will be merged with the original pInfo,
     * and the property items in the new object can has no schema in propertySchema,
     * for example:
     *              { "template": XXX, "theme":XXXX }
     *
     * @param {String} pid Project id.
     * @param {Object} properties Property object containing settings to be changed.
     * @return {Bool} True if success, false if failed.
     */
    pmUtils.setProperties = function (pid, properties) {
        var i, pInfo, temp, newThemeName, oldThemeName, props, p,
            defaultTheme = 'src/css/jquery.mobile.theme-1.1.0.css',
            design = ADM.getDesignRoot();
        var getThemeFile = function (themeName) {
            var theme;
            if (jQuery.inArray(themeName + ".min.css",
                        $.rib.pmUtils.allThemes) !== -1) {
                theme = '/themes/' + themeName + ".min.css";
            } else {
                theme = '/themes/' + themeName + ".css";
            }
            return theme;
        };
        // get the original object of pInfo
        pid && (pInfo = pmUtils._projectsInfo[pid]);
        if (!(pid && pInfo) || typeof properties !== "object") {
            console.error("Invalid project or properties in setProperties");
            return false;
        }
        for ( i in properties) {
            if (pmUtils.propertySchema.hasOwnProperty(i)) {
                if (i === 'theme' &&
                    pmUtils.getProperty(pid, 'theme') !== properties[i]) {
                    newThemeName = properties[i];
                    oldThemeName = pmUtils.getProperty(pid, 'theme');
                    //update css property in header
                    if (newThemeName === "Default") {
                        $.rib.setDesignTheme(design, defaultTheme, false);
                    } else {
                        newThemeName = getThemeFile(newThemeName);
                        $.rib.setDesignTheme(design, newThemeName, true);
                    }
                }
                // if the item has schema then check the type
                pmUtils.setProperty(pid, i, properties[i]);
            } else {
                // extend the item having no schema directly
                temp = new Object();
                temp[i] = properties[i];
                $.extend(true, pInfo, temp);
                pmUtils.pInfoDirty || (pmUtils.pInfoDirty = true);
            }
        }
        return true;
    };

    /* Asynchronous. find the last opened project and show it, if there is no
     * project in sandbox, then create an "Untitled" project.
     *
     * @param {function()=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     * @return {None}.
     *
     */
    pmUtils.showLastOpened = function (success, error) {
        var pid, pInfos, lastOpened;
        lastOpened = null;
        pInfos = $.rib.pmUtils._projectsInfo;
        // Go through pInfos to get the last opened
        for (pid in pInfos) {
            if (pInfos.hasOwnProperty(pid)) {
                if (!lastOpened || pInfos[pid].accessDate > pInfos[lastOpened].accessDate) {
                    lastOpened = pid;
                }
            }
        }
        if (lastOpened) {
            $.rib.pmUtils.openProject(lastOpened, success, error);
        } else {
            // No project, create a default "Untitled" project
            $.rib.pmUtils.createProject({"name": "Untitled"}, function () {
                success && success();
            });
        }
    };

    /* Asynchronous. save current project to sandbox.
     *
     * @param {function()=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     * @return {None}.
     *
     */
    pmUtils.syncCurrentProject = function (success, error) {
        var currentPid, currentDesign;
        currentPid = pmUtils._activeProject;
        currentDesign = ADM.getDesignRoot();
        // serialize old design to json
        if (currentPid) {
            pmUtils.syncProject(currentPid, currentDesign, success, error);
        } else {
            success && success();
        }
    };

    /**
     * Asynchronous. create a new project and open it:
     * Get an valid pid, and use the pid to create a folder for the project
     * Build a new Design and set it as ADM root design
     * Serialize the old design and and new design to sandbox
     * content in pInfo:
     *     name: project name
     *     accessDate: date of last access in milliseconds
     *     theme: the theme name of the project
     *     version: version of the project
     *     tags: an array of string tags
     *
     * @param {Object}[required] properties Property object containing initial settings
     *     used to create a project, such as: { "name": XXX, "theme":XXXX }
     * @param {function()=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     * @param {ADMNode}[optional] design An ADM design used to create a project.
     *
     * success callback passed the pid of the new created project.
     * error callback passed the generated file error.
     *
     * @return {None}.
     */
    pmUtils.createProject = function (properties, success, error, design) {
        var newPid, successHandler, buildDesign, errorHandler;
        newPid = pmUtils.getValidPid();
        buildDesign = function () {
            var newDesign, newPage, config;
            // build a new design
            newDesign = new ADMNode("Design");
            config = {
                pageTemplate: 'JQuery Mobile Page',
                pageTitle: 'Home',
                layout: ['Header', 'Footer']
            };
            config.design = newDesign;
            // TODO: Will we need to show a default page here?
            newPage = $.rib.pageUtils.createNewPage(config);
            if (!newPage) {
                console.log("Warning: create new page failed");
            }
            return newDesign;
        };
        successHandler = function (dirEntry) {
            pmUtils.syncCurrentProject(function () {
                // if the design has no page when setDesignRoot, a empty page will be added in
                pmUtils._activeProject = newPid;
                pmUtils._projectsInfo[newPid] = {};
                pmUtils.setProperties(newPid, properties);
                pmUtils.setProperty(newPid, "accessDate", new Date());
                // init resource usage status
                $.rib.pmUtils.resourceRef = {};

                if (design && (design instanceof ADMNode)) {
                    ADM.setDesignRoot(design);
                } else {
                    ADM.setDesignRoot(buildDesign());
                }
                pmUtils.designDirty = true;
                success && success(newPid);
                pmUtils.syncProject(newPid, ADM.getDesignRoot());
            });
        };
        errorHandler = function (e) {
            if (e.code === FileError.QUOTA_EXCEEDED_ERR) {
                // TODO: request more Quota?
            } else {
                console.error(e.code);
            }
            error && error(e);
        };

        // pid ([Number]) for project will be the folder name of the project
        fsUtils.mkdir((pmUtils.ProjectDir + "/" + newPid), successHandler, errorHandler);
    };

    /**
     * Get the path of design file of the project
     *
     * @param {String} pid Project id.
     * @return {String} Path to the design file("design.json" in project directory contains
     *                  serialized ADM tree) in the project sandbox.
     */
    pmUtils.getDesignPath = function (pid) {
        var designPath = pmUtils.ProjectDir + "/" + pid + "/" + "design.json";
        return designPath;
    };

    /**
     * Get the path of file saving project info
     *
     * @param {String} pid Project id.
     * @return {String} Path to the metadata file("pInfo.json" in project directory)
     *                  in the project sandbox.
     */
    pmUtils.getMetadataPath = function (pid) {
        var metadataPath = pmUtils.ProjectDir + "/" + pid + "/" + "pInfo.json";
        return metadataPath;
    };

    /**
     * Asynchronous. Clone an existing project, just clone, but not open
     *
     * @param {String} srcPid Project id of the source project.
     * @param {function(String)=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     *
     * success callback passed pid of the newly cloned project.
     * error callback passed the generated file error.
     *
     * @return {None}.
     */
    pmUtils.cloneProject = function (srcPid, success, error) {
        var basePath = pmUtils.ProjectDir + "/",
            destPid = pmUtils.getValidPid();

        fsUtils.cp(basePath + srcPid, basePath + destPid, function (copy) {
            pmUtils._projectsInfo[destPid] = {};
            // copy the source project infomation
            pmUtils.setProperties(destPid, pmUtils._projectsInfo[srcPid]);

            // update access date for the new project
            pmUtils.setProperty(destPid, "accessDate", new Date());

            // just sync project info only
            pmUtils.syncProject(destPid, null, success, error);
        }, error);
    };

    /**
     * Get a valid project id.
     *
     * @return {String} A valid id for project.
     */
    pmUtils.getValidPid = function () {
        var num;
        num = ++pmUtils._lastPid;
        return pmUtils.pidPrefix + num;
    };

    /**
     * Asynchronous. Open an existing project.
     *
     * @param {String} pid Project id
     * @param {function(String)=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     *
     * success callback passed nothing.
     * error callback passed the generated file error.
     *
     * @return {None}.
     */
    pmUtils.openProject = function (pid, success, error) {
        var designPath, successHandler, imagePath;

        if (!pmUtils._projectsInfo[pid]) {
            console.error("Error: Invalid pid for project when opening project");
            return;
        }
        // if the required project is already be opened, just update access date
        if (pmUtils._activeProject === pid) {
            success && success();
            return;
        }
        designPath = pmUtils.getDesignPath(pid);
        imagePath = pmUtils.getProjectDir(pid) + 'images/';

        successHandler = function (result) {
            var design, project;
            project = $.rib.JSONToProj(result);
            design = project.design;
            if (design && (design instanceof ADMNode)) {
                // set current pid as active pid
                pmUtils._activeProject = pid;
                // update access time
                pmUtils.setProperty(pid, "accessDate", new Date());
                // init pmUtils.resourceRef, reset usage status of resources
                $.rib.pmUtils.resourceRef = {};
                $.rib.fsUtils.ls(imagePath, function (entries) {
                    $.each(entries, function (i, e) {
                        $.rib.pmUtils.resourceRef['images/'+e.name] = 0;
                    });
                }, function (e) {
                    dumplog('There is no image in this project.');
                });
                // set the new design as design root
                ADM.setDesignRoot(design);
                success && success();
            } else {
                error && error();
            }
        };
        // save current design
        pmUtils.syncCurrentProject(function () {
            // read the design file and build ADM design according it
            $.rib.fsUtils.read(designPath, successHandler);
        });
        return;
    };

    /**
     * Asynchronous. delete an existing project
     *
     * @param {String} pid Project id
     * @param {function(String)=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     *
     * success callback passed pid of the deleted project.
     * error callback passed the generated file error.
     *
     * @return {None}.
     */
    pmUtils.deleteProject = function (pid, success, error) {
        var ProjectPath = pmUtils.ProjectDir + "/" + pid,
            successHandler = function () {
                // rm data in _projectsInfo
                delete pmUtils._projectsInfo[pid];
                if (pmUtils._activeProject === pid) {
                    pmUtils._activeProject = null;
                }
                success && success(pid);
            };
        // delete the project folder
        fsUtils.rm(ProjectPath, successHandler, error, true)
    };

    /**
     * Add a new tag to project (Invalid)
     *
     * @param {String} pid Project id
     * @return {Bool} True if success, false when fails
    pmUtils.addTag = function (pid, tag) {
        // if tag in alltags()
        //    if tag in currntprojectTags
        //        return noupdate
        //    else addTaginproject
        //         return selfrefresh
        // else
        //     update allTags[]
        //     update curTags[]
        //     return wholereshsh
        var pInfo = pmUtils._projectsInfo[pid],
            index = $.inArray(tag, pInfo.tags);
        if (index === -1) {
            pInfo.tags.push(tag);
            pmUtils.pInfoDirty = true;
            return true;
        } else {
            console.log("Waring: " + tag + "already on the project!");
            return false;
        }
    };
     */

    /**
     * Delete a tag of the project {Invalid}
     *
     * @param {String} pid Project id
     * @return {Bool} True if success, false when fails
    pmUtils.deleteTag = function (pid, tag) {
        var pInfo = pmUtils._projectsInfo[pid],
            index = $.inArray(tag, pInfo.tags);
        if (index !== -1) {
            pInfo.tags.splice(index, 1);
            pmUtils.pInfoDirty = true;
            return true;
        } else {
            console.log("Waring: project has no tag: " + tag);
            return false;
        }
    };
     */

    /**
     * Export the zip file of the project.
     *
     * @return {Bool} True if success, false when fails.
     */
    pmUtils.exportProject = function () {
        var pid, pInfo, design, obj, resultProject;
        pid = pmUtils.getActive();
        pInfo = pmUtils._projectsInfo[pid];
        if (!pInfo) {
            console.error("Error: Invalid pid for project");
        }
        design = ADM.getDesignRoot();
        obj = $.rib.ADMToJSONObj(design);
        // Following is for the serializing part
        if (typeof obj === "object") {
            // Delete the thumbnail when exporting, so that the package
            // can be eliminated, and thumbnail will be generated next
            // time the project imported
            obj.pInfo = $.extend(true, {}, pInfo);
            delete obj.pInfo.thumbnail;

            resultProject = JSON.stringify(obj);
            try {
                $.rib.exportPackage(resultProject);
            } catch (e) {
                console.error("Export to package failed");
                return false;
            }
        } else {
            console.error("Invalid serialized Object for ADM tree");
            return false;
        }
        return true;
    };

    // Update thumbnail of the project
    pmUtils.updateThumbnail = function (liveDoc) {
        var d, s, pid;
        pid = $.rib.pmUtils.getActive();
        if (!pid) {
            dumplog("Warning: No active project to update thumbnail.");
            return false;
        }
        d = $(liveDoc.documentElement).clone();

        $('body',d).children(':not(.ui-page-active)').remove();
        $('head',d).remove();
        s = d[0].outerHTML;
        s = s.replace(/<(html|body)/ig,'<div');
        s = s.replace(/(html|body)>/ig,'div>');

        // update the thumbnail in project box
        if (d.length && s && s.length) {
            // save it to the project
            $.rib.pmUtils.setProperty(pid, "thumbnail", s);
        }
    };

    function checkDefaultThumbCss() {
        var cssFiles, cssHeaders, design, i, h;
        design = ADM.getDesignRoot();
        cssHeaders = design.getPropertyDefault('css');
        for (i = 0; i < cssHeaders.length; i++) {
            h = cssHeaders[i];
            // Skip design only header properties
            if (h.designOnly) {
                continue;
            }
            checkThumbCss(h.value);
        }
        return;
    }

    function checkThumbCss(fileName) {
        var thumbPath = $.rib.pmUtils.toThumbCssPath(fileName);
        $.rib.fsUtils.pathToEntry(thumbPath, null, function (e) {
            if (e.code === FileError.NOT_FOUND_ERR) {
                // generate a new thumb css
                $.ajax({
                    type: 'GET',
                    url: fileName,
                    dataType: 'text',
                    success: function (data) {
                        var content = $.rib.pmUtils.toLimitedCss(data);
                        if (content) {
                            $.rib.fsUtils.write(thumbPath, content);
                        }
                    },
                    async: false
                });
            } else {
                $.rib.fsUtils.onError(e);
            }
        });
    }

    pmUtils.toLimitedCss = function (content, preSelector) {
        var commentsRule, blocks, result, ignoreArray;
        preSelector = preSelector || $.rib.pmUtils.thumbPrefix;
        if ((typeof content !== "string")
                || (typeof preSelector !== "string")) {
            console.warn("Wrong parameter type when getting limited css.");
            return null;
        }
        result = '';
        ignoreArray = ['from', 'to'];
        commentsRule = /\/\*(\r|\n|.)*?\*\//g;
        // 1. delete the comments
        content = content.replace(commentsRule,"");
        // 2. find blocks
        blocks = content.split('}');
        // 3. separate selector and rule set
        $.each(blocks, function (i, block) {
            var selector, index, ruleSet, ss, i, sArray;
            index = block.indexOf('{');
            if (index < 0) return;
            selector = $.trim(block.substr(0, index));
            ruleSet = $.trim(block.substr(index+1, block.length));
            if (ruleSet.length < 1 || selector.length < 1) {
                return;
            }
            sArray = [];
            ss = selector.split(',');
            for (i = 0; i < ss.length; i++) {
                var s = $.trim(ss[i]);
                // ignore empty selector
                if (s.length < 1) continue;
                // parse the rule block for @XX selectors
                if (s[0] === '@') {
                    ruleSet = $.rib.pmUtils.toLimitedCss(ruleSet, preSelector);
                }
                if (ignoreArray.indexOf(s) === -1) {
                    s = preSelector + ' ' + s;
                }
                sArray.push(s);
            }
            if (sArray.length > 0) {
                result += sArray.join(',') + "{" + ruleSet + "}";
            }
        });
        return result;
    };

    pmUtils.toThumbCssPath = function (cssHeader) {
        var filePath, index, fileName, thumbDir;
        if (cssHeader instanceof Object) {
            filePath = cssHeader.value;
        } else {
            filePath = cssHeader;
        }
        if (typeof filePath !== "string") {
            console.warn("Wrong parameter type when get thumb css Path.");
            return null;
        }
        index = filePath.lastIndexOf('/');
        fileName = filePath.substr(index+1, filePath.length);
        return pmUtils.thumbDir + fileName;
    };

     /**
     * Asynchronous. import a project and open it.
     *
     * @param {fileEntry} file File entry of the imported file.
     * @param {function(Array)=} success Success callback.
     * @param {function(FileError)=} error Error callback.
     *
     * success callback passed the pid of the imported project.
     * error callback passed the generated file error.
     *
     * @return {None}.
     */
    pmUtils.importProject = function (file, success, error) {
        var reader = new FileReader();

        reader.onloadend = function (e) {
            var properties, design, designData, designRule,
                copyRule, copyFiles, data, zip, successHandler,
                resultProject;
            // Get result data from reader
            data = e.target.result;
            designRule = /\.(json|rib)$/i;
            copyRule = /^images\//i;
            copyFiles = [];
            try {
                zip = new ZipFile(data);
            } catch (e) {
                console.warn("Failed to parse imported file as zip.");
            }
            if (zip && zip.filelist) {
                zip.filelist.forEach(function (zipInfo, idx, array){
                    if (designRule.test(zipInfo.filename)) {
                        designData = zip.extract(zipInfo.filename);
                    }
                    if (copyRule.test(zipInfo.filename)) {
                        copyFiles.push(zipInfo.filename);
                    }
                });
            } else {
                // Try to parse imported data as json
                console.warn("Try to parse imported file as JSON.");
                designData = data;
            }

            resultProject = $.rib.JSONToProj(designData);
            if (!resultProject) {
                alert("Invalid imported project.");
                return;
            }
            // Get properties from imported file
            properties = resultProject.pInfo || {"name":"Imported Project"};
            design = resultProject.design;
            successHandler = function (pid) {
                var copyHandler, count, projectFolder;
                projectFolder = $.rib.pmUtils.ProjectDir + "/" + pid + "/";
                if (copyFiles.length <= 0) {
                    success && success();
                    return;
                }
                count = 0;
                copyHandler = function (dirEntry) {
                    if (!dirEntry.isDirectory) {
                        console.error(dirEntry.fullPath + " is not a directory to save files in sandbox.");
                        return;
                    }
                    // Copy needed files to sandbox
                    $.each(copyFiles, function (i, fileName) {
                        $.rib.fsUtils.write(projectFolder + fileName, zip.extract(fileName), function (newFile) {
                            count++;
                            if (count === copyFiles.length) {
                                success && success();
                            }
                        }, function (e) {
                            count++;
                            console.error("Error when copy " + projectFolder + fileName + " to sandbox.");
                            $.rib.fsUtils.onError(e);
                        }, false, true);
                    });
                }
                // Create "images/" sub-directory and copy the images in
                $.rib.fsUtils.mkdir(projectFolder + "images", copyHandler, function (e) {
                    console.error("Failed to create sub-folder images/ in " + projectFolder);
                });
            };

            if (design && (design instanceof ADMNode)) {
                $.rib.pmUtils.createProject(properties, successHandler, error, design);
            } else {
                console.error("Imported project failed");
                error && error();
            }
        };
        reader.onError = function () {
            console.error("Read imported file error.");
        };
        reader.readAsBinaryString(file);
    };

    /**
     * Asynchronous. Sync all the project data into sandbox file system
     *
     * @param {String} pid Project id.
     * @param {ADMNode} design ADM design node to be saved.
     * @param {function()=} success Success callback.
     * @param {function(Error/null)=} error Error callback.
     *
     * success callback passed nothing.
     * error callback passed the generated file error.
     *
     * @return {None}.
     */
    pmUtils.syncProject = function (pid, design, success, error) {
        var syncDesign, syncInfo, saveWrite,
            forceDirty, designDirty, pInfoDirty;
        // If we need to write to inactive project, then the dirty
        // flag should be truly forcible.
        if (pid && (pid !== pmUtils._activeProject)) {
            forceDirty = true;
        }
        pid = pid || pmUtils._activeProject;
        design = design || ADM.getDesignRoot();

        designDirty = forceDirty || pmUtils.designDirty;
        pInfoDirty = forceDirty || pmUtils.pInfoDirty;

        if (!(designDirty || pInfoDirty)) {
            success && success();
            return;
        }
        saveWrite = function (path, data, success, error) {
            var swap, successHandler;
            if (!data || !path) {
                console.warn("No data or path to save write");
                return;
            }
            swap = path + ".swap";
            successHandler = function (fileEntry) {
                fileEntry.getParent(function (dirEntry) {
                    var newName = fileEntry.name;
                    newName = newName.slice(0, (newName.length - 5))
                    fileEntry.moveTo(dirEntry, newName, success, error)
                });
            };
            $.rib.fsUtils.write(swap, data, successHandler, error);
        };
        // define callbacks
        syncDesign = function (pid, design, successHandler, error) {
            var designPath, data, obj;
            designPath = pmUtils.getDesignPath(pid);
            obj = $.rib.ADMToJSONObj(design);
            if (typeof obj === "object") {
                data = JSON.stringify(obj);
                saveWrite(designPath, data, successHandler, error);
            } else {
                console.error("sync failed: invalid serialized Object for ADM tree");
            }
            return;
        };
        syncInfo = function (pid, success, error) {
            var pInfo, metadataPath, successHandler, data;
            if (!pInfoDirty) {
                success && success();
                return;
            }
            pInfo = pmUtils._projectsInfo[pid];
            metadataPath = pmUtils.getMetadataPath(pid);
            successHandler = function () {
                // Clean pInfo dirty flag, if the project is active
                (!forceDirty) && (pmUtils.pInfoDirty = false);
                success && success();
            };
            try {
                data = JSON.stringify(pInfo);
            } catch (e) {
                console.error("Failed to stringify pInfo, " + e);
                error && error(e);
                return;
            }
            saveWrite(metadataPath, data, successHandler, error);
        };
        if (designDirty) {
            // sync pInfo in the success handler of syncDesign
            syncDesign(pid, design, function () {
                // clean design dirty flag, if the project is active
                (!forceDirty) && (pmUtils.designDirty = false);
                syncInfo(pid, success, error);
            }, error);
        } else {
            syncInfo(pid, success, error);
        }
    };

    /**
     * Get project by tag
     *
     * @param {String} tag Tag used to find matching projects
     * @return {Array} An array of Object. Each object contains:
     *                 {
     *                     "pid":XXX,
     *                     "date": XXXX
     *                 }
     */
    pmUtils.getProjectByTag = function (tag) {
        var arr = $.map(pmUtils._projectsInfo, function (value, index) {
            if ($.inArray(tag.toString(), value.tags) !== -1) {
                return {"pid": index, "date": value.accessDate};
            }
        });
        pmUtils.sortByAccessDate(arr);
    };

    /**
     * List all pid by access date
     *
     * @return {Array} An array of objects, ordered by access date.
     *                 Each object contains:
     *                 {
     *                     "pid": XXX,
     *                     "date": XXX
     *                 }
     */
    pmUtils.listAllProject = function () {
        var arr = $.map(pmUtils._projectsInfo, function (value, index) {
            return {"pid": index, "date": value.accessDate};
        });
        pmUtils.sortByAccessDate(arr);
        return arr;
    };

    /**
     * Sort the input array by "date" in descending order, the newer, the toper.
     *
     * @param {Array} An array of objects. Each object contains:
     *                                    {
     *                                        "pid": XXX,
     *                                        "date": XXX
     *                                    }
     * @return {Array} Array of objects with all elements are sorted by access date.
     */
    pmUtils.sortByAccessDate = function (arr) {
        var orderFunc = function (a, b) {
            return (b.date - a.date);
        };
        return arr.sort(orderFunc);
    };

    /**
     * Add reference count for a resource in current active project
     *
     * @param {String} refPath The resource's path relative to project folder.
     * @return {None}
     */
    pmUtils.addRefCount = function (refPath) {
        if (!pmUtils.resourceRef[refPath]) {
            pmUtils.resourceRef[refPath] = 1;
        } else {
            pmUtils.resourceRef[refPath]++;
        }
        $.rib.fireEvent('imagesUpdated', {usageStatus: pmUtils.resourceRef});
        return;
    };

    /**
     * Reduce reference count for a resource in current active project
     *
     * @param {String} refPath The resource's path relative to project folder.
     * @return {None}
     */
    pmUtils.reduceRefCount = function (refPath) {
        var projectDir = pmUtils.ProjectDir + "/" + pmUtils.getActive() + "/";
        if (pmUtils.resourceRef.hasOwnProperty(refPath)) {
            pmUtils.resourceRef[refPath]--;
            // Delete the resource if the reference count is 0
            // TODO: will list all the uploaded resource and show the reference
            // count of them. It will depend on the user if delete or not.
            if (pmUtils.resourceRef[refPath] <= 0) {
                delete pmUtils.resourceRef[refPath];
                $.rib.fsUtils.pathToEntry(projectDir + refPath, function (entry) {
                    $.rib.confirm('Unused resource: "' + entry.name +
                        '". \nWould you like to delete it from the project?', function () {
                            $.rib.fsUtils.rm(entry.fullPath);
                            $.rib.fireEvent('imagesUpdated', {usageStatus: pmUtils.resourceRef});
                        }, function () {
                            pmUtils.resourceRef[refPath] = 0;
                            $.rib.fireEvent('imagesUpdated', {usageStatus: pmUtils.resourceRef});
                        });
                });
            }
        } else {
            console.warn('No reference count for ' + refPath + 'in reduceRefCount');
        }
        return;
    };

    /**
     * Scan the sandbox resources used by ADM node, and update the
     * reference count accordingly. If the ADM node is a design, reference
     * count object will be reset to empty first and then create reference
     * count for all used resource, otherwise, the reference count will go
     * up or down according to "upFlag"
     *
     * @param {ADMNode} node ADM node to scan.
     * @param {Boolean} upFlag Flag stands for add(true) or delete(false)
     *                         reference count for resources used in the node.
     * @return {Boolean} Return true if succeed, false if failed.
     */
    pmUtils.scanADMNodeResource = function (node, upFlag) {
        var matched, i, p, value;
        // Only handle ADMNodes
        node = node || ADM.getDesignRoot();
        if (!(node instanceof ADMNode)) {
            return false;
        }
        // Find all used sandbox resource nodes and the matched properties
        matched = node.findNodesByProperty($.rib.pmUtils.relativeFilter);
        for (i = 0; i < matched.length; i++) {
            if (!matched[i].properties) {
                continue;
            }
            for (p in matched[i].properties) {
                value = matched[i].properties[p]
                upFlag ? $.rib.pmUtils.addRefCount(value) : $.rib.pmUtils.reduceRefCount(value);
            }
        }
        return true;
    };

    /**
     * Get status about used resources in current active project.
     *
     * @param {String} ref The resource's path relative to project folder.
     * @return {Object/None} Return an deep copy of reference count object
     *                       if succeed, null if failed.
     */
    pmUtils.usedResources = function () {
        return $.extend(true, {}, pmUtils.resourceRef);
    };

    /**
     * upload a new theme to projects
     *
     * @param {String} theme file
     * @param {Function} callback when upload file successfully
     */
    pmUtils.uploadTheme = function (themeFile, handler) {
        var type, reader;
        // get file type. Currently we get file type
        // just accordint to suffix of file name
        var getFileType = function (fileName) {
            var type,re = /(?:.*)+\.(zip|css)$/i;
            type = re.exec(fileName);
            if (type) {
                return type[1].toLowerCase();
            } else {
                return "unsupported";
            }
        };

        type = getFileType(themeFile.name);
        switch (type) {
            case 'css':
                singleCssHandler(themeFile.name, themeFile, handler);
                break;
            case 'zip':
                reader = new FileReader();
                reader.onloadend = function (e) {
                    var zip, data, cssRule, cssData, copyFiles = [];
                    // get result data from reader
                    data = e.target.result;
                    cssRule = /(\.min\.css)$/i;
                    try {
                        zip = new ZipFile(data);
                    } catch (e) {
                        console.warn("Failed to parse imported file as zip.");
                    }
                    if (zip && zip.filelist) {
                        zip.filelist.forEach(function (zipInfo, idx, array) {
                            if (cssRule.test(zipInfo.filename)) {
                                cssData = zip.extract(zipInfo.filename);
                                // write themeFile to sandbox
                                singleCssHandler(zipInfo.filename.replace(/^themes\//i,""),
                                    cssData, handler);
                            }
                        });
                    }
                };
                reader.onError = function () {
                    console.error("Read imported file error.");
                };
                reader.readAsBinaryString(themeFile);
                break;
            case 'default':
                console.warn("unsupported file type, please upload css or zip file");
                break;
        }
    };

    /**
     * get all themes in projects
     *
     * @return {array} return array of theme names
     */
    pmUtils.getAllThemes = function () {
        var themes = ['Default'];
        for ( var p in pmUtils.themesList ) {
            themes.push(p);
        }
        return themes;
    };

    /**
     * import single css file to project
     *
     * @param {String} themeName imported name of theme file
     * @param {String} content content of theme
     * @param {Function} handler callback after handling theme
     */
    function singleCssHandler (themeName, content, handler) {
        var parseSwatches = function (buffer) {
            var swatches = [], swatch, arr =[], i,
                re = /\.ui-bar-[a-z]/g;
            arr = buffer.match(re);
            for (i = 0; i < arr.length; i++) {
                swatch = arr[i].replace(/\.ui-bar-/g, "");
                // if swatch is not found in swatcher list, add it into swatches
                if (swatch && jQuery.inArray(swatch, swatches) === -1) {
                    swatches.push(swatch);
                }
            }
            return swatches;
        };
        // write theme to sandbox
        var writeThemeFile = function (themeName, content, handler) {
            if (content instanceof Blob) {
                var reader = new FileReader();

                reader.onloadend = function (e) {
                    pareseCssBuffer(e.target.result);
                }
                reader.onError = function () {
                    console.error("Read imported file error.");
                };
                reader.readAsBinaryString(content);
            } else {
                pareseCssBuffer(content);
            }
            function pareseCssBuffer(buffer) {
                var theme, swatches = [], thumbPath, content;
                if (typeof buffer !== "string") {
                    console.error('Wrong parameter type in pareseCssBuffer.');
                    return;
                }
                try {
                    // split suffix of '.css' and '.min.css'
                    theme = themeName.replace(/(\.min.css|\.css)$/g, "");
                    swatches = parseSwatches(buffer);
                    if (swatches.length) {
                        $.rib.fsUtils.write('/themes/' + themeName, buffer, function (fileEntry) {
                            //update allThemes
                            $.rib.pmUtils.allThemes.push(themeName);
                            pmUtils.themesList[theme] = swatches;
                            // add default swatch into theme
                            pmUtils.themesList[theme].unshift('default');
                            // update themes.json in sandbox
                            $.rib.fsUtils.write('/themes.json',
                                JSON.stringify(pmUtils.themesList));

                            // generate a related thumb css file
                            thumbPath = $.rib.pmUtils.toThumbCssPath(fileEntry.name);
                            content = $.rib.pmUtils.toLimitedCss(buffer);
                            if (content) {
                                $.rib.fsUtils.write(thumbPath, content);
                            }
                            handler();
                        });
                    }
                } catch(e) {
                    console.log("Error writing theme file:", e.stack);
                }
                return;
            }
        };

        // firstly we check whether name of imported theme file
        // exists in the projects
        // If exists, a confirm dialog pup up for user to select
        //    if user select "yes", orignal theme file will be deleted
        //    else do nothing, return directly
        // else upload new theme files
        var msg, minifiedRule = /(\.min\.css)$/i,
            theme = themeName.replace(/(\.css|\.min.css)$/g, "");
        if ($.rib.pmUtils.themesList.hasOwnProperty(theme) ||
                theme === "Default") {
            if (theme === "Default") {
                msg = "The name Default is reserved for the jQuery Mobile " +
                    " default theme (jquery.mobile.theme-1.1.0.css). Please " +
                    " rename imported theme.";
                $.rib.msgbox(msg, {"OK": null});
                return;
            } else {
                msg = "The theme " + theme + " already exists. Would you " +
                    "like to replace it?";
                $.rib.confirm(msg,
                        // if user select "OK" button, replace old one with new theme
                        function () {
                            var anotherThemeFile, callback;
                            // if theme of current design changes, we should inform design to update
                            var callback = function () {
                                var currentDesignTheme, array, design = ADM.getDesignRoot(),
                                    i, themePath, path;
                                array = $.merge([], design.getProperty('css'));
                                // find theme from design property of 'css'
                                for (i = 0; i < array.length; i++) {
                                    if (array[i].hasOwnProperty('theme')) {
                                        currentDesignTheme = array[i].value;
                                        break;
                                    }
                                }
                                themePath = currentDesignTheme.replace(/^\//, "").split("/");
                                path = themePath.splice(themePath.length - 1, 1).toString();
                                path = path.replace(/(\.min.css|\.css)$/g, "");
                                if (path === themeName.replace(/(\.min.css|\.css)$/g, "")) {
                                    $.rib.setDesignTheme(design, '/themes/' + themeName, true);
                                    handler();
                                } else {
                                    handler();
                                }
                            };
                            if (minifiedRule.test(themeName)) {
                                anotherThemeFile = themeName.replace(/\.min\.css$/g, "\.css");
                            } else {
                                anotherThemeFile = themeName.replace(/\.css$/g, ".min.css");
                            }
                            if (jQuery.inArray(anotherThemeFile, pmUtils.allThemes) !== -1) {
                                $.rib.fsUtils.rm('/themes/' + anotherThemeFile,
                                    function () {
                                        var idx, allThemes = $.rib.pmUtils.allThemes;
                                        idx = allThemes.indexOf(anotherThemeFile);
                                        if(idx!=-1) {
                                            allThemes.splice(idx, 1);
                                        }
                                        writeThemeFile(themeName, content, callback);
                                    });
                            } else {
                                writeThemeFile(themeName, content, callback);
                            }
                        });
            }
        } else {
            writeThemeFile(themeName, content, handler);
        }
    }

    /************ export pmUtils to $.rib **************/
    $.rib.pmUtils = pmUtils;
});
