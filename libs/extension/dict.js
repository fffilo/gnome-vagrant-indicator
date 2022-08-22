/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*
 Copyright (c) 2019, Franjo Filo <fffilo666@gmail.com>

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
   * Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in the
     documentation and/or other materials provided with the distribution.
   * Neither the name of the GNOME nor the
     names of its contributors may be used to endorse or promote products
     derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Strict mode.
'use strict';

/**
 * Get real element type.
 *
 * We're using toString.call() to get real type of variable. In mozilla
 * documentation stands that "null and undefined will be replaced with the
 * global object, and primitive values will be boxed", so let's eliminate null
 * and undefined before we call toString method...
 *
 * @param  {Mixed}  src
 * @return {String}
 */
var getType = (src) => {
    if (src === null)
        return 'Null'
    else if (src === undefined)
        return 'Undefined';

    let str = Object.prototype.toString.call(src),
        re = /\[(\w+)\s(\w+)\]/,
        match = str.match(re);
    if (match)
        return match[2];

    // Typeof fallback.
    let result = typeof src;
    result = result.charAt(0).toUpperCase() + result.slice(1);

    return result;
};

/**
 * Is empty object.
 *
 * @param  {Mixed}   src
 * @return {Boolean}
 */
var isEmptyObject = (src) => {
    for (let i in src) {
        return false;
    }

    return true;
};

/**
 * Is plain object.
 *
 * @param  {Mixed}   src
 * @return {Boolean}
 */
var isPlainObject = (src) => {
    return src && '__proto__' in src && src.__proto__ === Object.prototype;
};

/**
 * Is element array object.
 *
 * @param  {Mixed}   src
 * @return {Boolean}
 */
var isArray = (src) => {
    return Array.isArray(src);
};

/**
 * Is element array-like object.
 *
 * @param  {Mixed}   src
 * @return {Boolean}
 */
var isArrayLike = (src) => {
    let len = typeof src === 'object' && 'length' in src ? src.length : false;

    return false
        || src instanceof Array
        || len === 0
        || typeof len === 'number' && len > 0 && --len in src;
};

/**
 * Json decode
 * (proxy for JSON.parse).
 *
 * @param  {String} src
 * @return {Mixed}
 */
var jsonDecode = (src) => {
    return JSON.parse(src);
};

/**
 * Json encode
 * (proxy for JSON.stringify).
 *
 * @param  {Mixed}   src
 * @param  {Boolean} pretty (optional)
 * @return {String}
 */
var jsonEncode = (src, pretty) => {
    return JSON.stringify(src, null, pretty ? 4 : null);
};

/**
 * Clone object.
 *
 * @param  {Mixed} src
 * @return {Mixed}
 */
var clone = (src) => {
    let type = getType(src);
    if (type === 'Object')
        return Object.assing({}, src);
    else if (type === 'Array')
        return src.slice();
    else if (['String', 'Number', 'Boolean', 'Null'].indexOf(type) !== -1)
        return src;

    throw 'Can not clone object (only Object/Array/String/Number/Boolean/Null types supported)';
};

/**
 * Deep clone object.
 *
 * @param  {Mixed} src
 * @return {Mixed}
 */
var deepClone = (src) => {
    let type = getType(src),
        result;

    if (type === 'Object') {
        result = {};
        for (let i in src) {
            if (!src.hasOwnProperty(i))
                continue;

            result[i] = deepClone(src[i]);
        }
    }
    else if (type === 'Array') {
        result = [];
        for (let i = 0; i < src.length; i++) {
            result.push(deepClone(src[i]));
        }
    }
    else if (['String', 'Number', 'Boolean', 'Null'].indexOf(type) !== -1)
        result = src;
    else
        throw 'Can not deep clone object (only Object/Array/String/Number/Boolean/Null types supported)';

    return result;
};

/**
 * Compare objects by it values.
 *
 * @param  {Mixed}   src
 * @param  {Mixed}   dst
 * @return {Boolean}
 */
var isEqual = (src, dst) => {
    let type = getType(src);
    if (type !== getType(dst))
        return false;

    if (type === 'Object') {
        let keys = Object.keys(src);
        if (!isEqual(keys.sort(), Object.keys(dst).sort()))
            return false;

        for (let i = 0; i < keys.length; i++) {
            if (!isEqual(src[keys[i]], dst[keys[i]]))
                return false;
        }
    }
    else if (type === 'Array') {
        if (src.length !== dst.length)
            return false;

        for (let i = 0; i < src.length; i++) {
            if (!isEqual(src[i], dst[i]))
                return false;
        }
    }
    else if (['String', 'Number', 'Boolean', 'Null'].indexOf(type) !== -1) {
        if (src !== dst)
            return false;
    }
    else
        throw 'Can not compare objects (only Object/Array/String/Number/Boolean/Null types supported)';

    return true;
};
