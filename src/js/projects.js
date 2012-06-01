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
        pidPrefix: "p",
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
        }
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
            $.each(entries, function(index, e) {
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
    }

    /***************** APIs to manipulate projects *************************/
    /* Get the acitve project.
     *
     * @return {String} The pid of current acitve project, or null if none.
     */
    pmUtils.getActive = function () {
        return pmUtils._activeProject;
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
            return null;
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
        var i, pInfo, temp;
        // get the original object of pInfo
        pid && (pInfo = pmUtils._projectsInfo[pid]);
        if (!(pid && pInfo) || typeof properties !== "object") {
            console.error("Invalid project or properties in setProperties");
            return false;
        }
        for ( i in properties) {
            if (pmUtils.propertySchema.hasOwnProperty(i)) {
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
                layout: ['Header', 'Footer'],
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

                if (design && (design instanceof ADMNode)) {
                    ADM.setDesignRoot(design);
                } else {
                    ADM.setDesignRoot(buildDesign());
                }
                pmUtils.designDirty = true;
                pmUtils.syncProject(newPid, ADM.getDesignRoot(), success, error);
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
        var designPath, successHandler;

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

        successHandler = function (result) {
            var design, project;
            project = $.rib.JSONToProj(result);
            design = project.design;
            if (design && (design instanceof ADMNode)) {
                // set current pid as active pid
                pmUtils._activeProject = pid;
                // update access time
                pmUtils.setProperty(pid, "accessDate", new Date());
                // set the new design as design root
                ADM.setDesignRoot(design);
                success && success();
            } else {
                error && error();
            }
        };
        // save current design
        pmUtils.syncCurrentProject(function() {
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
            obj.pInfo = pInfo;
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

    // TODO: manipulatation about the thumbnail of the project

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

        reader.onloadend = function(e) {
            var properties, design, resultProject;
            resultProject = $.rib.zipToProj(e.target.result);
            if (!resultProject) {
                alert("Invalid imported project.");
                return;
            }
            // Get properties from imported file
            properties = resultProject.pInfo || {"name":"Imported Project"};
            design = resultProject.design;

            if (design && (design instanceof ADMNode)) {
                $.rib.pmUtils.createProject(properties, success, error, design);
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
        var syncDesign, syncInfo, saveWrite;
        pid = pid || pmUtils._acitveProject;
        design = design || ADM.getDesignRoot();
        if (!(pmUtils.designDirty || pmUtils.pInfoDirty)) {
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
            if (!pmUtils.pInfoDirty) {
                success && success();
                return;
            }
            pInfo = pmUtils._projectsInfo[pid];
            metadataPath = pmUtils.getMetadataPath(pid);
            successHandler = function () {
                // clean pInfo dirty flag
                pmUtils.pInfoDirty = false;
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
        if (pmUtils.designDirty) {
            // sync pInfo in the success handler of syncDesign
            syncDesign(pid, design, function () {
                // clean design dirty flag
                pmUtils.designDirty = false;
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

    /************ export pmUtils to $.rib **************/
    $.rib.pmUtils = pmUtils;
});
