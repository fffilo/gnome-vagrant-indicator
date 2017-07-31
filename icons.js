/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Icon enums
const DEFAULT = 'gnome-vagrant-indicator-symbolic';

/**
 * Ui.Indicator constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const init = function() {
    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(Me.path + '/assets');
}
