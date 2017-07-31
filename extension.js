/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Main = imports.ui.main;
const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Ui = Me.imports.ui;

/**
 * Global indicator object
 *
 * @type {Object}
 */
let indicator = null;

/**
 * Extension initialization
 *
 * @param  {Object} extensionMeta
 * @return {Void}
 */
function init(extensionMeta) {
    Convenience.initTranslations();

    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionMeta.path + '/icons');
}

/**
 * Extension enable
 *
 * @return {Void}
 */
function enable() {
    if (indicator)
        return;

    indicator = new Ui.Indicator();
    Main.panel.addToStatusArea(Me.metadata.uuid, indicator);
}

/**
 * Extension disable
 *
 * @return {Void}
 */
function disable() {
    if (!indicator)
        return;

    indicator.destroy();
    indicator = null;
}
