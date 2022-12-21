/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * The extension.js is a required file of every extension. It is the core
 * of your extension and contains the function hooks init(), enable() and
 * disable() used by GNOME Shell to load, enable and disable your
 * extension.
 *
 * https://gjs.guide/extensions/overview/anatomy.html#extension-js-required
 */
class Extension {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    constructor() {
        this._indicator = null;
    }

    /**
     * This function is called when your extension is enabled, which could
     * be done in GNOME Extensions, when you log in or when the screen is
     * unlocked.
     *
     * This is when you should setup any UI for your extension, change
     * existing widgets, connect signals or modify GNOME Shell's
     * behaviour.
     *
     * @return {Void}
     */
    enable() {
        if (this._indicator)
            return;

        const Indicator = Me.imports.libs.extension.indicator;
        this._indicator = new Indicator.Base();
    }

    /**
     * This function is called when your extension is uninstalled, disabled in
     * GNOME Extensions, when you log out or when the screen locks.
     *
     * Anything you created, modifed or setup in enable() MUST be undone here.
     * Not doing so is the most common reason extensions are rejected in
     * review!
     *
     * @return {Void}
     */
    disable() {
        if (!this._indicator)
            return;

        this._indicator.destroy();
        this._indicator = null;
    }
}

/**
 * This function is called once when your extension is loaded, not enabled.
 * This is a good time to setup translations or anything else you only do
 * once.
 *
 * You MUST NOT make any changes to GNOME Shell, connect any signals or
 * add any MainLoop sources here.
 *
 * @param  {Object}    meta
 * @return {Extension}
 */
function init(meta) {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);

    return new Extension();
}
