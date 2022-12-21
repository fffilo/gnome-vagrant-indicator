/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * Initialize extension preferences.
 *
 * @return {Void}
 */
var init = () => {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

/**
 * Fill the preferences window (Adw.PreferencesWindow).
 *
 * @param  {ExtensionPrefsDialog} window
 * @return {Void}
 */
var fillPreferencesWindow = (window) => {
    const Widget = Me.imports.libs.prefs.widget;
    new Widget.Widget(window);
}
