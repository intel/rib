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

window.BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder;
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
window.storageInfo = window.storageInfo || window.webkitStorageInfo;


/**
 * Global object to access File System utils.
 *
 */
$(function () {
    var fsUtils = {
    defaultTarget: 'export-target',
    fsType: window.PERSISTENT,
    fsSize: 20*1024*1024,
    fs: null,
    deferredOperations: [],
    /**
     * Acceptable uploaded file types
     *
     * Each type object contains:
     *     mime {String} Recommended mimeType of related input element
     *     suffix {Array} Array of acceptable suffix of uploaded file
     */
    fileTypes: {
        js: {
            mime: 'text/javascript',
            suffix: ['js']
        },
        image: {
            mime: 'image/*',
            suffix: ['jpg', 'png', 'svg', 'bmp',
                'gif', 'jpeg', 'jpm', 'jp2', 'jpx',
                'xml', 'cgm', 'ief']
        },
        css: {
            mime: 'text/css',
            suffix: ['css']
        },
        zip: {
            mime: 'application/zip',
            suffix: ['zip']
        },
        any: {
            mime: '*',
            suffix: ['*']
        }
    },

    /**
     * Init the sandbox file system .
     *
     * @param {enum} type The value could be "window.TEMPORARY" or "window.PERSISTENT".
     * @param {number} size The required size for the file system.
     */
    initFS: function (type, size, success, error) {
        var onError = error || fsUtils.onError, successFS;
        if (size <= 0) {
            console.warn("Required size for filesystem should be a positive number.");
            return;
        }
        // Create a sandbox filesystem
        successFS = function (filesystem) {
            fsUtils.fs = filesystem;
            dumplog("A sandbox filesystem: " + fsUtils.fs.name + " was created;");
            dumplog(fsUtils.fs.name + " type: " + type + ", size: " + size );
            // Create a default target window and append it
            // to the document.body
            if (!$('iframe#' + fsUtils.defaultTarget).length) {
                $('<iframe></iframe>')
                    .attr('id', fsUtils.defaultTarget)
                    .css('display', 'none')
                    .appendTo('body');
            }
            if (success) {
                success(filesystem);
            }
            while (fsUtils.deferredOperations.length > 0) {
                var op = fsUtils.deferredOperations.shift();
                op.op.apply(this, op.arg);
            }
        };

        if (!(storageInfo && requestFileSystem)) {
            console.error("Filesystem not available");
            return;
        }
        // Check the quota
        storageInfo.queryUsageAndQuota(type, function (usage, quota) {
            // If the quota can't meet requirement, then request more quota
            if ((type === window.PERSISTENT) && (quota < size)) {
                storageInfo.requestQuota(type, size, function (grantedBytes) {
                    // If the user click the "cancle" button, then create a temporary fs
                    if (grantedBytes <= 0) {
                        type = window.TEMPORARY;
                        grantedBytes = size;
                    }
                    requestFileSystem(type, grantedBytes, successFS, onError);
                }, onError);
                setTimeout(function () {
                    alert('RIB needs persistent storage space to save your ' +
                          'projects. That way, you will find your projects ' +
                          'again when you launch RIB in the future. You can ' +
                          'always remove the data by going to Settings | ' +
                          'Under the Hood | Content Settings | All Cookies ' +
                          'and Site Data.<br>' +
                          '<br>Please click the "OK" button on the ' +
                          'infobar above to grant permission.<br>' +
                          '<br>Otherwise, temporary storage will be used to ' +
                          'save your projects but they may be deleted at any ' +
                          'time by your browser.');
                }, 0);
            } else {
                requestFileSystem(type, size, successFS, onError);
            }
        }, onError)
    },

    /**
     * Error event callback.
     *
     * NOTE: "Using the HTML5 Filesystem API" by Eric Bidelman (O’Reilly).
     *       Copyright 2011 Eric Bidelman, 978-1-449-30945-9
     *
     * @param {FileError} err The error event.
     */
    onError: function (err) {
                 var msg = 'Error: ';
                 switch (err.code) {
                     case FileError.NOT_FOUND_ERR:
                         msg += 'File or directory not found';
                         break;
                     case FileError.SECURITY_ERR:
                         msg += 'Insecure or disallowed operation';
                         break;
                     case FileError.ABORT_ERR:
                         msg += 'Operation aborted';
                         break;
                     case FileError.NOT_READABLE_ERR:
                         msg += 'File or directory not readable';
                         break;
                     case FileError.ENCODING_ERR:
                         msg += 'Invalid encoding';
                         break;
                     case FileError.NO_MODIFICATION_ALLOWED_ERR:
                         msg += 'Cannot modify file or directory';
                         break;
                     case FileError.INVALID_STATE_ERR:
                         msg += 'Invalid state';
                         break;
                     case FileError.SYNTAX_ERR:
                         msg += 'Invalid line-ending specifier';
                         break;
                     case FileError.INVALID_MODIFICATION_ERR:
                         msg += 'Invalid modification';
                         break;
                     case FileError.QUOTA_EXCEEDED_ERR:
                         msg += 'Storage quota exceeded';
                         break;
                     case FileError.TYPE_MISMATCH_ERR:
                         msg += 'Invalid filetype';
                         break;
                     case FileError.PATH_EXISTS_ERR:
                         msg += 'File or directory already exists at specified path';
                         break;
                     default:
                         msg += 'Unknown Error';
                         break;
                 }
                 console.warn(msg);
             },

    /**
     * Transfer string path to URL.
     *
     * @param {string} path The string path needs to be transferred.
     *
     * @return {url} url referring to the path.
     */
    pathToUrl: function (path) {
                   if (typeof path !== "string") {
                       console.error("String type is needed for file which is to be read.");
                       return false;
                   }
                   var url = fsUtils.fs.root.toURL() + path.replace(/^\//, "");
                   return url;
               },

    /**
     * Transfer string path to Entry(FileEntry or DurectirtEntry).
     *
     * @param {string} path The string path needs to be transferred.
     * @param {function(Entry)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     *
     * success callback passed the Entry referring to path.
     * error callback passed the generated error.
     */
    pathToEntry: function (path, success, error) {
                     var url = fsUtils.pathToUrl(path);
                     var onError = error || fsUtils.onError;
                     resolveLocalFileSystemURL(url, function (entry) {
                         success && success(entry);
                     }, onError);
                 },

    /**
     * Get all the Entries in a given path.
     *
     * @param {string} path The given string path.
     * @param {function(Array)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     *
     * success callback passed a Array of Entries included in the path.
     * error callback passed the generated error.
     */
    ls: function (path, success, error) {
            var dstPath = path || "/",
            onError = error || fsUtils.onError;

            fsUtils.fs.root.getDirectory(dstPath, {}, function (dirEntry) {
                var dirReader = dirEntry.createReader();
                dirReader.readEntries(function (entries) {
                    success && success(entries);
                }, onError);
            }, onError);
        },

    /**
     * Create a file from a full path, also creating any non-existent
     * directories in the path. If the file already exists, an error
     * will be generated.
     *
     * @param {string} filePath Full path of the file to be created.
     *                 If the last char of the path is "/", it will
     *                 be an invalid file path, which triggers error.
     * @param {function(FileEntry)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     *
     * success callback passed the FileEntry referring to the new file.
     * error callback passed the generated error.
     */
    touch: function (filePath, success, error) {
               var index, fileName, destFolder, onError, createFile;
               onError = error || fsUtils.onError;
               if (typeof filePath !== "string" || filePath[filePath.length-1] === '/') {
                   console.error('Invalid file path: "' + filePath + '" when touch file.');
                   error && error();
                   return;
               }
               createFile = function (destDir, fileName) {
                   destDir.getFile(fileName, {create: true, exclusive: true}, function (fileEntry) {
                       dumplog(fileEntry.fullPath + " is created.");
                       // pass the fileEntry to the success handler
                       if (success) {
                           success(fileEntry);
                       }
                   }, onError);
               };
               index = filePath.lastIndexOf('/');
               // If there is special parent directory
               if (index > 0) {
                   fileName = filePath.substr(index+1, filePath.length);
                   destFolder = filePath.substr(0, index+1);
                   fsUtils.mkdir(destFolder, function (destDir) {
                       createFile(destDir, fileName);
                   },onError);
               } else {
                   createFile(fsUtils.fs.root, filePath);
               }
           },

    /**
     * Read a file.
     *
     * @param {string} path The given file path needs to be read.
     * @param {function(string)=} opt_successCallback
     * @param {function(FileError)=} opt_errorCallback An optional
     *
     * success callback passed the contents of the file.
     * error callback passed the generated error.
     */
    read: function (path, success, error) {
              var onError = error || fsUtils.onError;

              fsUtils.pathToEntry(path, function (fileEntry) {
                  // Obtain the File object representing the FileEntry.
                  // Use FileReader to read its contents.
                  fileEntry.file(function (file) {
                      var reader = new FileReader();

                      reader.onloadend = function (e) {
                          success(e.target.result);
                      };
                      reader.onError = onError;

                      reader.readAsText(file); // Read the file as plaintext.

                  }, onError);
              }, onError);
          },

    /**
     * Write contents to a file.
     * If the file not exist, a new file will be created.
     * If the file already exist, it will overwrite it.
     *
     * @param {string} path The given file path needs to be writed into.
     * @param {string/File/Blob} contents Data needs to be written into the file.
     * @param {function(string)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     * @param {bool} opt_append Flag for append mode An optinal
     * @param {bool} binary Flag for writing binary contents An optinal
     *
     * success callback passed the FileEntry referring to the file.
     * error callback passed the generated error.
     */
    write: function (path, contents, success, error, opt_append, binary) {

               var onError = error || fsUtils.onError;
               function write(fileEntry) {
                   fileEntry.createWriter(function (fileWriter) {
                       var bb, ab, ia;

                       fileWriter.onwriteend = function (progressEvent) {
                           success && success(fileEntry);
                       };
                       fileWriter.onerror = onError;

                       if (opt_append) {
                           fileWriter.seek(fileWriter.length);
                       }
                       // Note: write() can take a File or Blob object.
                       // Case 1: a File or Blob, write directly, File is also an instanceof Blob
                       if (contents instanceof Blob) {
                             fileWriter.write(contents);
                       // Case 2: string contents, create a blob
                       } else {
                           if (binary) {
                               // write the bytes of the string to an ArrayBuffer
                               ab = new ArrayBuffer(contents.length);
                               ia = new Uint8Array(ab);
                               for (var i = 0; i < contents.length; i++) {
                                   ia[i] = contents.charCodeAt(i);
                               }
                               contents = ia;
                           }
                           try {
                               bb = new Blob([contents]);
                           } catch(e) {
                               if (window.BlobBuilder){
                                   bb = new BlobBuilder(); // Create a new Blob on-the-fly.
                                   bb.append(contents);
                                   bb = bb.getBlob();
                               } else {
                                   console.error("No Blob or BlobBuilder constructor.");
                                   return;
                               }
                           }
                           bb && fileWriter.write(bb);
                       }
                   }, onError);
               }

               fsUtils.pathToEntry(path, function (fileEntry) {
                   if (opt_append) {
                       write(fileEntry);
                   } else {
                       fsUtils.rm(path, function () {
                           fsUtils.touch(path, write, error);
                       }, onError);
                   }
               }, function (e) {
                   if (e.code === FileError.NOT_FOUND_ERR) {
                       fsUtils.touch(path, write, onError);
                   } else {
                       onError(e);
                   }
               });
           },

    /**
     * Copy a file or directory to another one.
     *
     * @param {string} from Srting path for the original full path.
     * @param {string} to The destination full path.
     * @param {function(DirectoryEntry)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     *
     * success callback passed the updated directory.
     * error callback passed the generated error.
     */
    cp: function (from, to, success, error) {
            var onError = error || fsUtils.onError;
            var path = to.replace(/^\//, "").split("/"),
                fileName = path.splice(path.length - 1, 1).toString();

            fsUtils.pathToEntry(from, function (entry) {
                fsUtils.pathToEntry(path.length > 0 ? path.join("/") : "/", function (dest) {
                    entry.copyTo(dest, fileName, function (finalDestination) {
                        if (success) {
                            success(finalDestination);
                        }
                    }, onError);
                });
            });
        },

    /**
     * Moves a file or directory to another one.
     * "from" and "to" should both be files or both be directories.
     *
     * @param {string} original file or directory.
     * @param {string} destination file or directory.
     * @param {function(DirectoryEntry)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     *
     * success callback passed the updated directory.
     * error callback passed the generated error.
     */
    mv: function (from, to, success, error) {
            var onError = error || fsUtils.onError;
            var path = to.replace(/^\//, "").split("/"),
                newName = path.splice(path.length - 1, 1).toString();

            fsUtils.pathToEntry(from, function (entry) {
                fsUtils.pathToEntry(path.length > 0 ? path.join("/") : "/", function (dest) {
                    entry.moveTo(dest, newName, function (finalDestination) {
                        if (success) {
                            success(finalDestination);
                        }
                    }, onError);
                });
            });
        },

    /**
     * Remove a file or directory.
     *
     * @param {string} path String path referring to the file or directory needs to be removed.
     * @param {function(null)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     * @param {Bool} opt_recursive Recursive flag for directory
     *
     * success callback passed null.
     * error callback passed the generated error.
     */
    rm: function (path, success, error, opt_recursive) {
            var onError = error || fsUtils.onError;
            fsUtils.fs.root[opt_recursive ? "getDirectory" : "getFile"](path, {create: false}, function (entry) {
                entry[opt_recursive ? "removeRecursively" : "remove"](function () {
                    dumplog(path + ' is removed.');
                    if (success) {
                        success();
                    }
                }, onError);
            }, onError);
        },

    /**
     * Create directory, making parent directories as needed recursively.
     * If any folder in the path doesn't exist, this function will create
     * parent directory first.
     *
     * @param {string} path Full path of the directory to be created.
     * @param {function(DirectoryEntry)=} opt_successCallback An optional
     * @param {function(FileError)=} opt_errorCallback An optional
     *
     * success callback passed DirectoryEntry referring to the new Dir.
     * error callback passed the generated error.
     */
    mkdir: function (path, success, error) {
               var onError, createDir;
               onError = error || fsUtils.onError;
               createDir = function (parentDir, folders) {
                   // ignore '.'
                   if (folders[0] === '.' || folders[0].length <= 0) {
                       folders = folders.slice(1);
                   }
                   parentDir.getDirectory(folders[0], {create: true}, function (dirEntry) {
                       if (folders.length > 1) {
                           createDir(dirEntry, folders.slice(1));
                       } else {
                           success && success(dirEntry);
                       }
                   }, onError);
               };
               // Create the folders in the root directory
               createDir(fsUtils.fs.root, path.split('/'));
           },

    /**
     * Export file to a blank site: open the URL of the file in a blank site for items in "Export"
     * @param {string} path of the exporting file.
     *
     */
    exportToBlank: function (path) {
                       var url = fsUtils.pathToUrl(path),
                       blocked = false, exportWindow,
                       options = "height=200, width=500, top=10, left=10, resizable=yes";
                       try {
                           exportWindow = window.open(url, "_blank", options);
                           if (!exportWindow) {
                               blocked = true;
                           }
                       } catch(e) {
                           blocked = true;
                       }
                       if (blocked) {
                           alert("Export window was blocked!");
                       }
                   },

    /**
     * Export file to specified target window: open the URL of the file in
     * target window, or new, blank one, if it does not exists
     * @param {string} target window to load the file into.
     * @param {string} path of the exporting file.
     *
     */
    exportToTarget: function (path, target) {
                        var url = fsUtils.pathToUrl(path),
                        blocked = false, exportWindow;

                        // Allow unspecified targets by using our defaultTarget
                        target = target || fsUtils.defaultTarget;

                        try {
                            exportWindow = window.open(url, target);
                            if (!exportWindow) {
                                blocked = true;
                            }
                        } catch(e) {
                            blocked = true;
                        }
                        if (blocked) {
                            alert("Export window was blocked!");
                        }
                    },
    /**
     * Check if the uploaded file is acceptable, currently just check suffix
     *
     * @param {String} type File type to check
     * @param {File} file Uploaded file object which is an instance of 'File'
     *
     * @return {Boolean} Return true if the file is acceptable, otherwise return false
     */
    checkFileType: function (type, file) {
                       var arrString, rule;
                       if (type === 'any') {
                           // if file type is any, we don't check
                           return true;
                       }
                       arrString = fsUtils.fileTypes[type.toLowerCase()].suffix.join('|');
                       rule = new RegExp("\\.(" + arrString + ")$", "i");
                       // TODO: May need to read the "content-type" to check the type
                       return rule.test(file.name);
                   },

    /**
     * Trigger an native dialog to upload file in a container
     *
     * @param {String} type File type to upload
     * @param {Jquery Object} container DOM element where native dialog will be triggered
     * @param {function(File)=} success Success callback with uploaded file as its parameter
     * @param {function()=} error Error callback
     *
     * @return {None}
     */
    upload: function (fileType, container, success, error) {
                var input, mimeType;
                container = container || $('body');
                mimeType = fsUtils.fileTypes[fileType.toLowerCase()].mime;
                input = $('<input type="file" accept="' + mimeType +'"/>')
                        .addClass('hidden-accessible').appendTo(container);
                input.change(function (e) {
                    var file;
                    if (e.currentTarget.files.length === 1) {
                        file = e.currentTarget.files[0];
                        if (fsUtils.checkFileType(fileType, file)) {
                            success && success(file)
                        } else {
                            console.warn("Unexpected uploaded file.");
                            // TODO: confirm with user if still use the file
                            error && error();
                        }
                    } else {
                        if (e.currentTarget.files.length <= 1) {
                            console.warn("No files specified to import");
                        } else {
                            console.warn("Multiple file import not supported");
                        }
                        error && error();
                    }
                    // remove the temp input element
                    input.remove();
                });
                setTimeout(function () {
                    input.removeClass('hidden-accessible').click();
                    input.addClass('hidden-accessible');
                }, 0);
            }
    },

        /**
         * Global object to add and set cookies.
         *
         */
        cookieUtils = {
            /**
             * Get value of the given name cookie record
             *
             * @param {string} name The string name of the cookie record.
             *
             * @return {string} value The value of the cookie record or null if failed.
             */
            get: function (name) {
                    var cookies, record, value = null, i;
                    if (typeof name !== "string") {
                        console.error("Invalid cookie name.");
                        return value;
                    }
                    if (document.cookie && document.cookie !== "") {
                        // split cookie records
                        cookies = document.cookie.split(';');

                        for (i = 0; i < cookies.length; i++) {
                            record = $.trim(cookies[i]);
                            // find the record matchs the name
                            if (record.substring(0, name.length + 1) === (name + '=')) {
                                // get the value
                                value = decodeURIComponent(record.substring(name.length + 1));
                                break;
                            }
                        }
                    } else {
                        dumplog("Warning: don't support cookie or empty cookie.");
                    }
                    return value;
                },

            /**
             * Set a pair of name-value into document.cookie
             *
             * @param {string} name The string name of the cookie record.
             * @param {string} value The string value of the cookie record.
             *
             * @return {bool} set cooke success or not.
             */
            set: function (name, value, expires) {
                     var text;
                     if (typeof name !== "string" || typeof value !== "string") {
                         console.error("Invalid cookie name or value.");
                         return false;
                     }
                     text = encodeURIComponent(name) + "=" + encodeURIComponent(value);
                     if (expires instanceof Date) {
                         text += "; expires=" + expires.toGMTString();
                     }
                     document.cookie = text;
                     if (document.cookie && document.cookie !== "") {
                         return true;
                     } else {
                         console.warn("Failed to set cookie.");
                         return false;
                     }
                 }
        };

    /*******************  export fsUtils and cookieUtils to $.rib **********************/
    $.rib = $.rib || {};
    $.each(["ls", "touch","rm","mkdir", "read", "write"], function (i, opName) {
        var oldOp = fsUtils[opName];
        fsUtils[opName] = function () {
            if (fsUtils.fs === null)
            {
                fsUtils.deferredOperations.push({op: oldOp, arg: arguments});
                return;
            }
            else
                return oldOp.apply(this, arguments);
        };
    });
    $.rib.fsUtils = fsUtils;
    $.rib.cookieUtils = cookieUtils;
});
