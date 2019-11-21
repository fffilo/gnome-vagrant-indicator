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
 * Enum.Exception constructor
 *
 * @param  {Object}
 * @return {Object}
 */
var Exception = new Lang.Class({

    Name: 'Enum.Exception',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function(message, title) {
        this._message = message;
        this._title = title;
    },

    /**
     * Property message getter
     *
     * @return {String}
     */
    get message() {
        return this._message;
    },

    /**
     * Property title getter
     *
     * @return {String}
     */
    get title() {
        return this._title;
    },

    /**
     * Exception as string
     *
     * @return {String}
     */
    toString: function() {
        return ''
            + (this.title || '')
            + (this.title && this.message ? ': ' : '')
            + (this.message || '');
    },

    /* --- */

});

/**
 * Enum.Member constructor
 *
 * @param  {Object}
 * @return {Object}
 */
var Member = new Lang.Class({

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
            throw new Exception('Argument key must be of type String', 'Enum.Member');
        if (typeof value !== 'number')
            throw new Exceprion('Argument value must be of type Number', 'Enum.Member');

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
var Enum = new Lang.Class({

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
            props = toObject(params);
        else if (ptype === 'object' && params.constructor === Member)
            props[params.key] = params.value;
        else if (ptype === 'object' && params.constructor === Array) {
            for (let i in params) {
                props[params[i]] = Math.pow(2, i);
            }
        }
        else
            throw new Exception('Constructor argument must be of type Object, Array, Enum.Enum or Enum.Member', 'Enum.Enum');

        for (let i in props) {
            if (props.hasOwnProperty(i))
                addMember(this, i, props[i]);
        }
    },

    /* --- */

});

/**
 * Check if item is instance of Enum
 *
 * @param  {Mixed}   item
 * @return {Boolean}
 */
var isEnum = function(item) {
    return item instanceof Enum;
}

/**
 * Check if item is instance of Member
 *
 * @param  {Mixed}   item
 * @return {Boolean}
 */
var isMember = function(item) {
    return item instanceof Member;
}

/**
 * Add member to enumeration.
 *
 *
 * Info: instead of self/member you can pass
 * self/key/value arguments for same functionality.
 *
 * @param  {Object}  self   Enum
 * @param  {Mixed}   key    Member or member key (string)
 * @param  {Number}  value  (optional) member value (ignored if key is member)
 * @return {Boolean}        success (always true)
 */
var addMember = function(self, key, value) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.addMember');

    let member = key;
    if (typeof member === 'string')
        member = new Member(key, typeof value === 'undefined' ? sum(self) + 1 : value);

    if (!isMember(member))
        throw new Exception('You must pass Enum.Member as second argument', 'Enum.addMember');
    if (member.value in self._members)
        throw new Exception('Member with value ' + member.value + ' already part of enumeration', 'Enum.addMember');
    if (getIndex(self, member.key) !== -1)
        throw new Exception('Member with key ' + member.key + ' already part of enumeration', 'Enum.addMember');
    if (Object.getOwnPropertyNames(self).indexOf(member.key) !== -1 || Object.getOwnPropertyNames(self.__proto__).indexOf(member.key) !== -1)
        throw new Exception('Can\'t use reserved word ' + member.key + ' as member key', 'Enum.addMember');

    self._members.push(member);

    Object.defineProperty(self, member.key, {
        configurable: true,
        writable: false,
        value: member.value,
    });

    self._members.sort(function(a, b) {
        if (a.value < b.value)
            return -1;
        else if (a.value > b.value)
            return 1;
        else
            return 0;
    });

    return true;
}

/**
 * Remove member from enumeration
 *
 * @param  {Object}  self   Enum
 * @param  {Mixed}   member Member, member key (string) or member value (number)
 * @return {Boolean}        success
 */
var removeMember = function(self, member) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.removeMember');

    let index = getIndex(self, member);
    if (index === -1)
        return false;

    delete self[self._members[index].key];
    self._members.splice(index, 1);

    return true;
}

/**
 * Get enumeration member(s) key(s)
 *
 * @param  {Object} self   Enum
 * @param  {Mixed}  member (optional) Member or member value (number)
 * @return {Mixed}         member key string, null on fail or array of keys if member is not defined
 */
var getKey = function(self, member) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.getKey');

    if (typeof member === 'undefined') {
        return self._members.map(function(e) {
            return e.key;
        });
    }
    else if (isMember(member)) {
        let filter = self._members.filter(function(e) {
            return e === member;
        });

        if (!filter.length)
            throw new Exception('Argument member is not member of Enum.Enum', 'Enum.getKey');

        return getKey(self, filter[0].value);
    }
    else if (typeof member === 'number') {
        let filter = self._members.filter(function(e) {
            return e.value === member;
        });

        return filter && filter.length ? filter[0].key : null;
    }

    throw new Exception('Argument member must be of type Enum.Member or Number', 'Enum.getKey');
}

/**
 * Get enumeration member(s) value(s)
 *
 * @param  {Object} self   Enum
 * @param  {Mixed}  member (optional) Member or member key (string)
 * @return {Mixed}         member value number, null on fail or array of values if member is not defined
 */
var getValue = function(self, member) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.getValue');

    if (typeof member === 'undefined') {
        return self._members.map(function(e) {
            return e.value;
        });
    }
    else if (isMember(member)) {
        let filter = self._members.filter(function(e) {
            return e === member;
        });

        if (!filter.length)
            throw new Exception('Argument member is not member of Enum.Enum', 'Enum.getValue');

        return getValue(self, filter[0].key);
    }
    else if (typeof member === 'string') {
        let filter = self._members.filter(function(e) {
            return e.key === member;
        });

        return filter && filter.length ? filter[0].value : null;
    }

    throw new Exception('Argument member must be of type Enum.Member or String', 'Enum.getValue');
}

/**
 * Get enumeration member(s) index
 *
 * @param  {Object} self   Enum
 * @param  {Mixed}  member Member, member key (string) or member value (number)
 * @return {Number}        member index
 */
var getIndex = function(self, member) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.getIndex');

    let result = -1;

    if (isMember(member))
        result = self._members.indexOf(member);
    else if (typeof member === 'string') {
        for (let i in self._members) {
            if (self._members[i].key === member) {
                result = i;
                break;
            }
        }
    }
    else if (typeof member === 'number') {
        for (let i in self._members) {
            if (self._members[i].value === member) {
                result = i;
                break;
            }
        }
    }
    else
        throw new Exception('Argument member must be of type Enum.Member, String or Number', 'Enum.getIndex');

    if (isMember(member) && result === -1)
        throw new Exception('Argument member is not member of Enum.Enum', 'Enum.getIndex');

    return result * 1;
}

/**
 * Convert enumeration members to object
 *
 * @param  {Object} self Enum
 * @return {Object}      members value/key object
 */
var toObject = function(self) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.toObject');

    let result = {};
    forEach(self, function(key, value) {
        result[key] = value;
    });

    return result;
}

/**
 * Get enumeration minimal value
 *
 * @param  {Object} self Enum
 * @return {Mixed}       member min value (number) or null on no members
 */
var min = function(self) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.min');

    return self._members.length ? self._members[0].value : null;
}

/**
 * Get enumeration maximal value
 *
 * @param  {Object} self Enum
 * @return {Mixed}       member max value (number) or null on no members
 */
var max = function(self) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.max');

    return self._members.length ? self._members[self._members.length - 1].value : null;
}

/**
 * Get enumeration sum of values
 *
 * @param  {Object} self Enum
 * @return {Mixed}       sum of member values (number) or null on no members
 */
var sum = function(self) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.sum');

    if (!self._members.length)
        return null;

    let result = 0;
    forEach(self, function(key, value) {
        result += value;
    });

    return result;
}

/**
 * Enumeration members iterator.
 * Callback method is called with member as
 * this argument and with member's key and
 * value as parameters. If callback result
 * is boolean true, loop will break.
 *
 * @param  {Object}   self     Enum
 * @param  {Function} callback method
 * @return {Void}
 */
var forEach = function(self, callback) {
    if (!isEnum(self))
        throw new Exception('Argument self must be of type Enum.Enum', 'Enum.forEach');
    if (typeof callback !== 'function')
        throw new Exception('Argument callback must be of type Function', 'Enum.forEach');

    for (let i in self._members) {
        if (callback.call(this, self._members[i].key, self._members[i].value))
            break;
    }
}
