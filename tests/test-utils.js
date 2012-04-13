/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011-2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
function objdump(o, string) {
    var i;
    console.log("Object " + string + ":");
    for (i in o) {
        /*jslint forin: true */
        if (o.hasOwnProperty(i)) {
            console.log(i + " => " + o[i]);
        } else {
            console.log(i + " => " + o[i]);
        }
    }
}

function objprops(o) {
    var str = "{ ", first = true, i;
    for (i in o) {
        // FIXME: not sure if we only want "own" properties here
        if (o.hasOwnProperty(i)) {
            if (!first) {
                str += ", ";
            } else {
                first = false;
            }
            str += i;
        }
    }
    str += " }";
    return str;
}
