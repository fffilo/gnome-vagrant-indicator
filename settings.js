/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

/**
 * Get settings for schema
 *
 * proxy for Convenience.getSettings
 *
 * @param  {String} schema (optional)
 * @return {Object}
 */
var settings = Convenience.getSettings;
