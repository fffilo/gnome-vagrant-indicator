/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const Gettext = imports.gettext;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.lib.extension.convenience;

/**
 * Init translation for domain
 * (proxy for Convenience.initTranslations).
 *
 * @param  {String} domain (optional)
 * @return {Void}
 */
var init = Convenience.initTranslations;

/**
 * Translate message
 * (proxy for Gettext.gettext).
 *
 * Note:
 * make sure you call init() on extension initialize.
 *
 * @param  {String} message
 * @return {String}
 */
var translate = Gettext.gettext;
