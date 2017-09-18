/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*
  Copyright (c) 2017, Franjo Filo <fffilo666@gmail.com>

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

// strict mode
'use strict';

// import modules
const Lang = imports.lang;

/**
 * Enum.Member constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Member = new Lang.Class({

    Name: 'Enum.Member',

    /**
     * Constructor
     *
     * @param  {String} key
     * @param  {Number} value
     * @return {Void}
     */
    _init: function(key, value) {
        if (typeof key !== 'string')
            throw 'Enum.Member: key must be string';
        if (!key.match(/^[A-Za-z]/))
            throw 'Enum.Member: key must start with a letter';
        if (typeof value !== 'number')
            throw 'Enum.Member: value must be number';

        this._key = key;
        this._value = value;
    },

    /**
     * Property key getter
     *
     * @return {String}
     */
    get key() {
        return this._key;
    },

    /**
     * Property value getter
     *
     * @return {Number}
     */
    get value() {
        return this._value;
    },

    /* --- */

});

/**
 * Enum.Enum constructor
 *
 * Constructor argument params must be of type
 * Object, Enum, Member, Array or String.
 *
 * For param type Object members are defined
 * for each key by it's value
 *     gjs> let a = new Enum({ 'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4 });
 *     gjs> a.ONE;
 *     1
 *     gjs> a.TWO;
 *     2
 *     gjs> a.THREE;
 *     3
 *     gjs> a.FOUR;
 *     4
 *
 * For param type Enum members are defined
 * as members in param (cloned object)
 *     gjs> let b = new Enum(a);
 *     gjs> b.ONE;
 *     1
 *     gjs> b.TWO;
 *     2
 *     gjs> b.THREE;
 *     3
 *     gjs> b.FOUR;
 *     4
 *
 * For param type Member only one member is defined
 * as members in param
 *     gjs> let c = new Enum(b._members[1]);
 *     gjs> c.TWO;
 *     2
 *
 * For param type Array type members are defined
 * for each item with value of Math.pow(2, index)
 *     gjs> let d = new Enum([ 'ONE', 'TWO', 'THREE', 'FOUR' ]);
 *     gjs> d.ONE;
 *     1
 *     gjs> d.TWO;
 *     2
 *     gjs> d.THREE;
 *     4
 *     gjs> d.FOUR;
 *     8
 *
 * For param type String only one member is defined
 * with value 1
 *     gjs> let e = new Enum('ONE');
 *     gjs> e.ONE;
 *     1
 *
 * @param  {Object}
 * @return {Object}
 */
const Enum = new Lang.Class({

    Name: 'Enum.Enum',

    /**
     * Constructor
     *
     * @param  {Mixed} params
     * @return {Void}
     */
    _init: function(params) {
        this._members = [];

        let ptype = typeof params;
        let props = {};

        if (ptype === 'string')
            props[params] = 1;
        else if (ptype === 'object' && params.constructor === Object)
            props = params;
        else if (ptype === 'object' && params.constructor === Enum)
            props = params._to_object();
        else if (ptype === 'object' && params.constructor === Member)
            props[params.key] = params.value;
        else if (ptype === 'object' && params.constructor === Array) {
            for (let i in params) {
                props[params[i]] = Math.pow(2, i);
            }
        }
        else
            throw 'Enum.Enum: constructor argument must be of type Object, Array or String';

        for (let i in props) {
            if (props.hasOwnProperty(i))
                this._define(i, props[i]);
        }
    },

    /**
     * Remove key from members list
     *
     * @param  {String} key
     * @return {Void}
     */
    _undefine: function(key) {
        let index = this._index(key);
        if (index === null)
            return;

        this._members.splice(index, 1);
        delete this[key];
    },

    /**
     * Define member
     *
     * @param  {String} key
     * @param  {Number} value
     * @return {Void}
     */
    _define: function(key, value) {
        this._undefine(key);

        let member = new Member(key, value);
        this._members.push(member);

        Object.defineProperty(this, member.key, {
            configurable: true,
            writable: false,
            value: member.value,
        });

        this._members.sort(function(a, b) {
            if (a.value < b.value)
                return -1;
            else if (a.value > b.value)
                return 1;
            else
                return 0;
        });
    },

    /**
     * Get minimal value of enumeration
     *
     * @return {Mixed} enumeration value or null on fail
     */
    _min: function() {
        return this._members.length ? this._members[0].value : null;
    },

    /**
     * Get maximal value of enumeration
     *
     * @return {Mixed} enumeration value or null on fail
     */
    _max: function() {
        return this._members.length ? this._members[this._members.length - 1].value : null;
    },

    /**
     * Get sum of enumeration values
     *
     * @return {Mixed} enumeration values sum or null on fail
     */
    _sum: function() {
        if (!this._members.length)
            return null;

        let result = 0;
        for (let i in this._members) {
            result += this._members[i].value;
        }

        return result;
    },

    /**
     * Get member index
     *
     * @param  {String} key
     * @return {Mixed}      member index or null on fail
     */
    _index: function(key) {
        for (let i in this._members) {
            if (this._members[i].key === key)
                return i;
        }

        return null
    },

    /**
     * Members iterator
     *
     * @param  {Function} callback method with key/value arguments
     * @return {Void}
     */
    _each: function(callback) {
        if (!this._members.length)
            return null;

        return this._members.forEach(function(member, index) {
            callback.call(this, member.key, member.value);
        });
    },

    /**
     * Convert members to object
     *
     * @return {Mixed} members object or null on fail
     */
    _to_object: function() {
        if (!this._members.length)
            return null;

        let result = {};
        for (let i in this._members) {
            result[this._members[i].key] = this._members[i].value;
        }

        return result;
    },

    /**
     * Convert member value to key
     *
     * @param  {Number} value
     * @return {Mixed}        get member key by value or null on fail
     */
    _to_string: function(value) {
        for (let i in this._members) {
            if (this._members[i].value === value)
                return this._members[i].key;
        }

        return null
    },

    /**
     * Convert member key to value
     *
     * @param  {String} key
     * @return {Mixed}      get member value by key or null on fail
     */
    _from_string: function(key) {
        let index = this._index(key);
        if (index === null)
            return null;

        return this._members[index].value;
    },

    /* --- */

});
