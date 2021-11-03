/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const System = imports.system;
const GLib = imports.gi.GLib;

// Global properties.
const UUID = 'gnome-vagrant-indicator@gnome-shell-exstensions.fffilo.github.com';
const VAGRANT_HOME = GLib.getenv('VAGRANT_HOME') || GLib.getenv('HOME') + '/.vagrant.d';
const VAGRANT_INDEX = VAGRANT_HOME + '/data/machine-index/index';
const CONFIG_PATH = GLib.get_user_config_dir() + '/' + UUID + '/config.json';
const PROPERTIES = [
    'order',
    'label',
    'notifications',
    'machineFullPath',
    'postTerminalAction',
    'displaySystemTerminal',
    'displaySystemFileManager',
    'displaySystemVagrantfile',
    'displayVagrantUp',
    'displayVagrantUpProvision',
    'displayVagrantUpSsh',
    'displayVagrantUpRdp',
    'displayVagrantProvision',
    'displayVagrantSsh',
    'displayVagrantRdp',
    'displayVagrantResume',
    'displayVagrantSuspend',
    'displayVagrantHalt',
    'displayVagrantDestroy',
];

/**
 * Read file.
 *
 * @param  {String} path
 * @return {String}
 */
let read = function(path) {
    try {
        let [ok, content] = GLib.file_get_contents(path);
        if (!ok || !content)
            throw '';
        else if (content instanceof Uint8Array)
            content = String.fromCharCode.apply(null, content);

        let data = JSON.parse(content);
        if (typeof data !== 'object')
            throw 'Not an object';

        return data;
    }
    catch(e) {
        // pass
    }

    return null;
}

// Parse vagrant index file.
let parse = read(VAGRANT_INDEX);
if (!parse || typeof parse !== 'object') {
    print('Error: unable to parse vagrant index file.');
    System.exit(1);
}

// Get current config.
let config = read(CONFIG_PATH);

// Build json object.
let json = {};
Object.keys(parse.machines || []).forEach(function(machine) {
    json[machine] = {};

    PROPERTIES.forEach(function(property) {
        let value = null;
        if (config && (machine in config) && (property in config[machine]))
            value = config[machine][property];

        json[machine][property] = value;
    });
});

// Present json to user.
let output = JSON.stringify(json, null, 4);
print(output);
