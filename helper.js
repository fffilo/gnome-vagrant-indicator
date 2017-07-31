/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);

/**
 * Log message
 *
 * @param  {String} message
 * @return {Void}
 */
const log = function(message) {
    let args = [ Me.metadata.name ];
    args.push.apply(args, arguments);

    global.log.apply(global, args);
}

/**
 * Log error
 *
 * @param  {String} message
 * @return {Void}
 */
const logError = function(message) {
    let args = [ Me.metadata.name ];
    args.push.apply(args, arguments);

    global.logError.apply(global, args);
}

/**
 * Translate message
 *
 * note: make sure you call
 * Convenience.initTranslations()
 * on init()
 *
 * @param  {String} message
 * @return {String}
 */
let translate = function(message) {
    return Gettext.gettext(message);
}
