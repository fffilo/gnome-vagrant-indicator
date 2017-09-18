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
 * Enum.Enum constructor
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
        let args = arguments;
        if (params instanceof Array)
            args = params;

        this._enum = [];

        for (let i in args) {
            let prop = args[i]
                .toString()
                .toUpperCase()
                .replace(/[^A-Za-z0-9]+/g, '_')
                .replace(/^_|_$/g, '');

            this[prop] = Math.pow(2, i);
            this._enum.push(prop);
        }

        this.UNKNOWN = 0;
        this._enum.unshift('UNKNOWN');

        this.ALL = Math.pow(2, this._enum.length - 1) - 1;
        this._enum.push('ALL');
    },

    /**
     * Get minimal value from enumeration
     * (skip unknown)
     *
     * @return {Numeric}
     */
    min: function() {
        return this[this._enum[1]];
    },

    /**
     * Get maximal value from enumeration
     *
     * @return {Numeric}
     */
    max: function() {
        return this[this._enum[this._enum.length - 1]];
    },

    /**
     * Convert enumination to string
     *
     * @param  {Number} val
     * @return {String}
     */
    to_string: function(val) {
        for (let i in this._enum) {
            let key = this._enum[i];

            if (this[key] == val)
                return key;
        }

        return null;
    },

    /**
     * Conver string value to numeric
     * value from enumenation list
     *
     * @param  {String}  str
     * @return {Numeric}
     */
    from_string: function(str) {
        str = str
            .toString()
            .toUpperCase()
            .replace(/[^A-Za-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');

        let prop = Object.keys(this);
        for (let i in prop) {
            let key = prop[i];
            let val = this[key];

            if (!key.startsWith('_') && typeof val === 'number' && str === key)
                return val;
        }

        return this.UNKNOWN;
    },

    /* --- */

});
