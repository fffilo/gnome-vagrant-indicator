/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

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

});
