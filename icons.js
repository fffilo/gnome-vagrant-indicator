/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Gio = imports.gi.Gio;
const IconTheme = imports.gi.Gtk.IconTheme;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Icons
var DEFAULT = 'gnome-vagrant-indicator-symbolic';

/**
 * Append assets path to theme
 *
 * @return {Void}
 */
var init = function() {
    IconTheme.get_default().append_search_path(Me.path + '/assets');
}

/**
 * Icons.Icon constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Icon = class Icon extends Gio.FileIcon {

    /**
     * Constructor
     *
     * @return {Void}
     */
    constructor(icon) {
        let path = Me.path + '/assets/' + icon + '.svg';
        let file = Gio.File.new_for_path(path);

        super({ file: file });
    }

    /* --- */

}
