/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

/**
 * Init translation for domain
 *
 * proxy for Convenience.initTranslations
 *
 * @param  {String} domain (optional)
 * @return {Void}
 */
const init = Convenience.initTranslations;

/**
 * Translate message
 *
 * note: make sure you call init()
 * on extension initialize
 *
 * @param  {String} message
 * @return {String}
 */
const translate = Gettext.gettext;
