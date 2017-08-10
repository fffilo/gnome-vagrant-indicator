/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const IconTheme = imports.gi.Gtk.IconTheme;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Icons
const DEFAULT = 'gnome-vagrant-indicator-symbolic';

/**
 * Append assets path to theme
 *
 * @return {Void}
 */
const init = function() {
    IconTheme.get_default().append_search_path(Me.path + '/assets');
}
