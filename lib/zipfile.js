/* Copyright (c) 2011 Arnaud Renevier, Inc, published under the modified BSD
 * license.
 *
- ZipFile is available under the modified bsd license, and can be used and
  redistributed under the conditions of this license. A copy of modified bsd
  license is included in this file.

- files distributed in external/ directory may be licensed under different
  conditions.


===============================================================================

Software License Agreement (BSD License)

Copyright (c) 2011, Arnaud Renevier
All rights reserved.

Redistribution and use of this software in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Arnaud Renevier nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of Parakey Inc.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var ZipFile = (function () {

    function utf8to16(str) {
        var res = "", idx = 0, len = str.length, code;

        while (idx < len) {
            code = str.charCodeAt(idx);
            if (code < 0x80) { // 1-byte sequence
                idx += 1;
            } else if (code >= 0xc0 && code < 0xe0) { // 2-byte sequence
                code = ((code & 0x1F) << 6) | (str.charCodeAt(idx + 1) & 0x3F);
                idx += 2;
            } else if (code >= 0xe0 && code < 0xef) { // 3-byte sequence
                code = ((code & 0x0F) << 12) | ((str.charCodeAt(idx + 1) & 0x3F) << 6) | ((str.charCodeAt(idx + 2) & 0x3F) << 0);
                idx += 3;
            } else if (code >= 0xf0 && code < 0xf8) { // 4-byte sequence
                throw new Error("cannot parse 4-byte utf-8 sequence"); // TODO
            } else {
                throw new Error("invalid utf8 sequence");
            }
            res += String.fromCharCode(code);
        }
        return res;
    }

    function ZipInfo(filename) {
        this.orig_filename = filename;
        var null_byte = filename.indexOf(String.fromCharCode(0));
        if (null_byte !== -1) {
            filename = filename.slice(0, null_byte);
        }
        this.filename = filename;
    }

    ZipInfo.prototype = {
        orig_filename: "",
        filename: "",
        date_time: new Date(1980, 0, 1),
        compress_type: 0, // zip stored
        comment: "",
        extra: "",
        create_system: 3,
        create_version: 20,
        extract_version: 20,
        reserved: 0,
        flag_bits: 0,
        volume: 0,
        internal_attr: 0,
        external_attr: 0,
        header_offset: null,
        CRC: null,
        compress_size: null,
        file_size: null
    };

    function extractint(str, start, len) {
        var buffer = str.slice(start, start + len),
            res = 0, idx;
        // little endian
        for (idx = buffer.length; idx >= 0; idx--) {
            res <<= 8;
            res += buffer.charCodeAt(idx);
        }
        return res;
    }

    var stringEndArchive = "PK\u0005\u0006";
    var stringCentralDir = "PK\u0001\u0002";
    var stringFileHeader = "PK\u0003\u0004";

    var extract = function (name) {
        var zinfo = this.NameToInfo[name];
        if (!zinfo) {
            throw new Error("file not present in archive");
        }
        var pos = zinfo.header_offset;
        var fheader = this.data.slice(pos, pos + 30);
        pos += 30;

        if (fheader.slice(0, 4) !== stringFileHeader) {
            throw new Error("Bag magic number for file header");
        }
        var size;
        size = extractint(fheader, 26, 2); // File name length
        var fname = this.data.slice(pos, pos + size);
        pos += size;

        size = extractint(fheader, 28, 2); // extra field length
        pos += size; // skip extra field length

        if (fname !== zinfo.orig_filename) {
            throw new Error('File name in directory and header differ');
        }
        var buffer = this.data.slice(pos, pos + zinfo.compress_size);
        if (zinfo.compress_type === 0) {
            return buffer;
        } else if (zinfo.compress_type === 8) {
            var reader = {
                pos: 0,
                readByte: function () {
                    return buffer.charCodeAt(this.pos++);
                }
            };
            var inflator = new Inflator(reader);
            var res = "", code = inflator.readByte();
            while (code >= 0) {
                res += String.fromCharCode(code);
                code = inflator.readByte();
            }
            return res;
        } else {
            throw new Error("unkwnon compress method");
        }
    };

    return function (data) {
        this.filelist = [];
        this.NameToInfo = {};
        this.data = data;
        this.extract = extract;
        this.comment = "";

        var idx;
        var endArchive = data.slice(-22);

        if (endArchive.slice(0, 4) !== stringEndArchive || endArchive.slice(-2) !== "\u0000\u0000") {
            idx = data.lastIndexOf(stringEndArchive, data.length - 22);
            if (idx === -1) {
                throw new Error("could not find end of central directory");
            }
            endArchive = data.slice(idx, idx + 22);
            this.comment = data.slice(idx + 22);
            if (this.comment.length !== extractint(endArchive, 20, 2)) {
                throw new Error("invalid comment");
            }
        }

        var size_cd = extractint(endArchive, 12, 4);
        var offset_cd = extractint(endArchive, 16, 4);
        var centralDir = data.slice(offset_cd, offset_cd + size_cd);

        var pos = 0, buffer, size, filename, x, t, d;
        while (pos < size_cd) {
            buffer = centralDir.slice(pos, pos + 46);
            pos += 46;
            if (buffer.slice(0, 4) !== stringCentralDir) {
                throw new Error("Bad magic number for central directory");
            }

            size = extractint(buffer, 28, 2);
            filename = centralDir.slice(pos, pos + size);
            pos += size;
            x = new ZipInfo(filename);

            size = extractint(buffer, 30, 2);
            x.extra = extractint(centralDir, pos, size);
            pos += size;

            x.header_offset = extractint(buffer, 42, 4);

            size = extractint(buffer, 32, 2);
            x.comment = centralDir.slice(pos, pos + size);
            pos += size;

            x.create_version = extractint(buffer, 4, 1);
            x.create_system = extractint(buffer, 5, 1);
            x.extract_version = extractint(buffer, 6, 1);
            x.reserved = extractint(buffer, 7, 1);
            x.flag_bits = extractint(buffer, 8, 2);
            x.compress_type = extractint(buffer, 10, 2);
            t = extractint(buffer, 12, 2);
            d = extractint(buffer, 14, 2);
            x.CRC = extractint(buffer, 16, 4);
            x.compress_size = extractint(buffer, 20, 4);
            x.file_size = extractint(buffer, 24, 4);

            if (x.extract_version > 20) {
                throw new Error("Cannot decode this version of zip format");
            }
            x.date_time = new Date((d >> 9) + 1980, (d>>5) & 0xF - 1, d & 0x1F, t >> 11, (t >> 5) & 0x3F, (t & 0x1F) * 2);
            if (x.file_size === 0xffffffffffffffff || x.file_size === 0xffffffff ||
                x.compress_size === 0xFFFFFFFF || x.header_offset === 0xffffffff) {
                throw new Error("does not support ZIP64 extension");
            }
            if (x.flag_bits & 0x1) { // encrypted
                throw new Error("does not support encrypted zip files");
            }
            if (x.flag_bits & 0x800) {
                x.filename = utf8to16(x.filename);
            }
            this.filelist.push(x);
            this.NameToInfo[x.filename] = x;
        }
    };

}());
