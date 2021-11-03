/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const {GObject, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

/**
 * Default icon.
 *
 * @type {String}
 */
var DEFAULT = 'gnome-vagrant-indicator-symbolic';

/**
 * Get icon path (directory name). If filename argument is
 * provided it will be appended to path. Note that there
 * is no file exists check here.
 *
 * @param  {Mixed}  filename (optional)
 * @return {String}
 */
var path = (filename=null) => {
    let dirname =  `${Me.path}/assets`,
        suffix = filename ? `/${filename}` : '';

    return dirname + suffix;
};

/**
 * Icons.Icon extends Gio.FileIcon.
 */
var Icon = GObject.registerClass(class Icon extends Gio.FileIcon {
    /**
     * Constructor.
     *
     * @param  {Mixed} icon
     * @return {Void}
     */
    _init(icon=null) {
        let iconName = icon || DEFAULT,
            iconPath = path(`${iconName}.svg`),
            file = Gio.File.new_for_path(iconPath);

        return super._init({ file: file });
    }

    /* --- */
});
