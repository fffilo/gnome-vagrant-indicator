/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

/**
 * Get settings for schema
 * (proxy for Convenience.getSettings).
 *
 * @param  {String} schema (optional)
 * @return {Object}
 */
var settings = Convenience.getSettings;
