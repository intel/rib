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

/**
 * Global object to access project management.
 *
 */
$(function () {
    var fsUtils = $.gb.fsUtils,
    pmUtils = {
        _projectsInfo: {},
        _lastPid: 0,
        _activeProject: null,
        designDirty:false,
        pInfoDirty:false,
        allTags: [],
        ProjectDir: "/projects",
        pidPrefix: "p",
    };

    /* Asynchronous. init pmUtils.
     * ls the root/projects dir to get all metadata about projects,
     * if the dir is not exist, create it
     * @param {function()=} success callback. An optional
     * @param {function(FileError)=} error callback. An optional
     *
     *
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
                $.gb.pmUtils.showLastOpened(success, error);
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
                fsUtils.read(e.fullPath + "/project.json", function (text) {
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
     * @return the pid of current acitve project
     */
    pmUtils.getActive = function () {
        return pmUtils._activeProject;
    };

    /* Asynchronous. find the last opened project and show it, if there is no
     * project in sandbox, then create an "Untitled" project.
     * @param {function()=} success callback. An optional
     * @param {function(FileError)=} error callback. An optional
     *
     */
    pmUtils.showLastOpened = function (success, error) {
        var pid, pInfos, lastOpened;
        lastOpened = null;
        pInfos = $.gb.pmUtils._projectsInfo;
        // Go through pInfos to get the last opened
        for (pid in pInfos) {
            if (pInfos.hasOwnProperty(pid)) {
                if (!lastOpened || pInfos[pid].accessDate > pInfos[lastOpened].accessDate) {
                    lastOpened = pid;
                }
            }
        }
        if (lastOpened) {
            $.gb.pmUtils.openProject(lastOpened, success, error);
        } else {
            // No project, create a default "Untitled" project
            $.gb.pmUtils.createProject({"name": "Untitled"}, function () {
                success && success();
            });
        }
    };

    /* Asynchronous. save current project to sandbox.
     * @param {function()=} success callback. An optional
     * @param {function(FileError)=} error callback. An optional
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
     * @param {Object} setting options to create a project, currently, like:
     *                 { "name": XXX, "theme":XXXX }
     * @param {function(Array)=} success callback. An optional
     * @param {function(FileError)=} error callback. An optional
     * @param {ADMNode} the ADM design used to create a project. An optional
     *
     * success callback passed the pid of the new created project.
     * error callback passed the generated file error.
     *
     * @return
     */
    pmUtils.createProject = function (options, success, error, design) {
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
            newPage = $.gb.pageUtils.createNewPage(config);
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
                pmUtils.setProject(newPid, options);
                pmUtils.setAccessDate(newPid, new Date());

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
     * @param {String} project id
     * @return {String} path of design file
     */
    pmUtils.getDesignPath = function (pid) {
        var designPath = pmUtils.ProjectDir + "/" + pid + "/" + "design.json";
        return designPath;
    };

    /**
     * Get the path of file saving project info
     *
     * @param {String} project id
     * @return {String} path of metadata file of the project
     */
    pmUtils.getMetadataPath = function (pid) {
        var metadataPath = pmUtils.ProjectDir + "/" + pid + "/" + "project.json";
        return metadataPath;
    };

    /**
     * Set options and preferences of the project
     *
     * @param {String} project id
     * @param {Object} setting options, currently, like:
     *                 { "name": XXX, "theme":XXXX }
     * @return
     */
    pmUtils.setProject = function (pid, options) {
        var i, pInfo;
        pid = pid || $.gb.pmUtils._activeProject;
        pInfo = pmUtils._projectsInfo[pid];
        if (!(pid && pInfo)) {
            console.error("Invalid project to set");
        }
        // save setting info into design
        for (i in options) {
            if (options.hasOwnProperty(i)) {
                pInfo[i] = options[i];
            }
        }
        pmUtils._projectsInfo[pid] = pInfo;
        pmUtils.pInfoDirty = true;
        return true;
    };

    /**
     * Asynchronous. Clone an existing project, just clone, but not open
     *
     * @param {String} project id of the source project
     * @param {function(String)=} success callback. An optional
     * @param {function(FileError)=} error callback. An optional
     *
     * success callback passed pid of the newly cloned project.
     * error callback passed the generated file error.
     *
     * @return
     */
    pmUtils.cloneProject = function (srcPid, success, error) {
        var basePath = pmUtils.ProjectDir + "/",
            destPid = pmUtils.getValidPid();

        fsUtils.cp(basePath + srcPid, basePath + destPid, function (copy) {
            pmUtils._projectsInfo[destPid] = {};
            // copy the source project infomation
            pmUtils.setProject(destPid, pmUtils._projectsInfo[srcPid]);

            // update access date for the new project
            pmUtils.setAccessDate(destPid, new Date());

            // just sync project info only
            pmUtils.syncProject(destPid, null, success, error);
        }, error);
    };

    /**
     * Get a valid project id
     *
     * @return {String} project id
     */
    pmUtils.getValidPid = function () {
        var num;
        num = ++pmUtils._lastPid;
        return pmUtils.pidPrefix + num;
    };

    /**
     * Asynchronous. Open an existing project
     *
     * @param {String} project id
     * @param {function()=} success callback. An optional
     * @param {function(Error/null)=} error callback. An optional
     *
     * success callback passed nothing.
     * error callback passed the generated file error.
     *
     * @return
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
            project = $.gb.JSONToProj(result);
            design = project.design;
            if (design && (design instanceof ADMNode)) {
                // set current pid as active pid
                pmUtils._activeProject = pid;
                // update access time
                pmUtils.setAccessDate(pid, new Date());
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
            $.gb.fsUtils.read(designPath, successHandler);
        });
        return;
    };

    /**
     * Asynchronous. delete an existing project
     *
     * @param {String} project id
     * @param {function(String)=} success callback. An optional
     * @param {function(FileError)=} error callback. An optional
     *
     * success callback passed pid of the deleted project.
     * error callback passed the generated file error.
     *
     * @return
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
     * Get access Date of a project
     *
     * @param {String} project id
     * @return {Date/null} return access date of the project or null if fails
     */
    pmUtils.getAccessDate = function (pid) {
        var pInfo = pmUtils._projectsInfo[pid];
        if (!pInfo) {
            console.error("Error: Invalid pid for project");
            return null;
        }
        return (new Date(pInfo.accessDate));
    };

    /**
     * delete an existing project
     *
     * @param {String} project id
     * @return {Bool} return true if success, false when fails
     */
    pmUtils.setAccessDate = function (pid, date) {
        var pInfo = pmUtils._projectsInfo[pid];
        if (!pInfo) {
            console.error("Error: Invalid pid for project");
            return false;
        }
        pInfo.accessDate = (new Date(date)).getTime();
        pmUtils.pInfoDirty = true;
        return true;
    };

    /**
     * Get project Name
     *
     * @param {String} project id
     * @return {String/null} return project name or null if fails
     */
    pmUtils.getName = function (pid) {
        var pInfo = pmUtils._projectsInfo[pid];
        if (!pInfo) {
            console.error("Error: Invalid pid for project");
            return null;
        }
        return pmUtils._projectsInfo[pid].name;
    };

    /**
     * Set project Name
     *
     * @param {String} project id
     * @param {String} the given name
     * @return {Bool} return true if success, false when fails
     */
    pmUtils.setName = function (pid, name) {
        var pInfo = pmUtils._projectsInfo[pid];
        if (!pInfo) {
            console.error("Error: Invalid pid for project");
            return false;
        }
        pInfo.name = name.toString();
        pmUtils.pInfoDirty = true;
        return true;
    };

    /**
     * Get project tags
     *
     * @param {String} project id
     * @return {String/null} return project name or null if fails
     */
    pmUtils.getTags = function (pid) {
        var pInfo = pmUtils._projectsInfo[pid];
        if (!pInfo) {
            console.error("Error: Invalid pid for project");
            return null;
        }
        return pInfo.tags;
    };

    /**
     * Add a new tag to project
     *
     * @param {String} project id
     * @return {Bool} return true if success, false when fails
     */
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

    /**
     * Delete a tag of the project
     *
     * @param {String} project id
     * @return {Bool} return true if success, false when fails
     */
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

    /**
     * Export the zip file of the project
     *
     * @param {String} project id
     * @return {Bool} return true if success, false when fails
     */
    pmUtils.exportProject = function (pid) {};
    // TODO: manipulatation about the thumbnail of the project

     /**
     * Asynchronous. import a project and open it:
     * @param {fileEntry} the fine entry of the imported file
     * @param {function(Array)=} success callback. An optional
     * @param {function(FileError)=} error callback. An optional
     *
     * success callback passed the pid of the imported project.
     * error callback passed the generated file error.
     *
     * @return
     */
    pmUtils.importProject = function (file, success, error) {
        var reader = new FileReader();

        reader.onloadend = function(e) {
            var options, design, resultProject;
            resultProject = $.gb.zipToProj(e.target.result);
            if (!resultProject) {
                alert("Invalid imported project.");
                return;
            }
            // Get options from imported file
            options = resultProject.pInfo || {"name":"Imported Project"};
            design = resultProject.design;

            if (design && (design instanceof ADMNode)) {
                $.gb.pmUtils.createProject(options, success, error, design);
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
     * @param {String} project id
     * @param {ADMNode} ADM design node
     * @param {function()=} success callback. An optional
     * @param {function(Error/null)=} error callback. An optional
     *
     * success callback passed nothing.
     * error callback passed the generated file error.
     *
     * @return
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
            $.gb.fsUtils.write(swap, data, successHandler, error);
        };
        // define callbacks
        syncDesign = function (pid, design, successHandler, error) {
            var designPath, data, obj;
            designPath = pmUtils.getDesignPath(pid);
            obj = $.gb.ADMToJSONObj(design);
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
     * @param {String} the given tag
     * @return {Array} an array of Object{"pid":XXX, "date": XXXX}
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
     * @return {Array} return an array of object which contains { "pid": XXX, "date": XXX } sorted by access date
     */
    pmUtils.listAllProject = function () {
        var arr = $.map(pmUtils._projectsInfo, function (value, index) {
            return {"pid": index, "date": value.accessDate};
        });
        pmUtils.sortByAccessDate(arr);
        return arr;
    };

    /**
     * Sort the input array by "date"
     *
     * @param {String} project id
     * @return {String/null} return project name or null if fails
     */
    pmUtils.sortByAccessDate = function (arr) {
        var orderFunc = function (a, b) {
            return (b.date - a.date);
        };
        return arr.sort(orderFunc);
    };

    /************ export pmUtils to $.gb **************/
    $.gb.pmUtils = pmUtils;
});
