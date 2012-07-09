/*
 * Rapid Interface Builder (RIB) - A simple WYSIWYG HTML5 app creator
 * Copyright (c) 2011, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

"use strict";

/**
 * Serialize form data to JSON object.
 *
 * Usage:
 * $('form').serializeJSON();
 * >> {'a': 'a', 'b': 'b'}
 *
 */

$.fn.serializeJSON = function()
{
    var out = {};
    var arr = this.serializeArray();
    $.each(arr, function() {
        if (out[this.name] !== undefined) {
            if (!out[this.name].push) {
                out[this.name] = [out[this.name]];
            }
            out[this.name].push(this.value || '');
        } else {
            out[this.name] = this.value || '';
        }
    });
    return out;
};
