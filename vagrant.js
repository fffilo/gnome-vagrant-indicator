/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Signals = imports.signals;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Enum = Me.imports.enum;
const Translation = Me.imports.translation;
const _ = Translation.translate;

// global properties
const HOME = GLib.getenv('VAGRANT_HOME') || GLib.getenv('HOME') + '/.vagrant.d';
const INDEX = '%s/data/machine-index/index'.format(HOME);
const EMULATOR = '/usr/bin/x-terminal-emulator';

/**
 * Post terminal action enum
 *
 * @type {Object}
 */
const PostTerminalAction = new Enum.Enum([
    'NONE',
    'PAUSE',
    'EXIT',
]);

/**
 * Vagrant.Monitor constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Monitor = new Lang.Class({

    Name: 'Vagrant.Monitor',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this._file = Gio.File.new_for_path(INDEX);
        this._emulator = EMULATOR;
        this._index = this._parse();
        this._monitor = null;
        this._command = null;
        this._version = null;
        this._post_terminal_action = PostTerminalAction.NONE;

        try {
            let [ok, output, error, status] = GLib.spawn_sync(null, ['which', 'vagrant'], null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (!status && output)
                this._command = output.toString().trim();
        }
        catch(e) {
            // pass
        }

        try {
            let [ok, output, error, status] = GLib.spawn_sync(null, ['vagrant', '--version'], null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (!status && output)
                this._version = output.toString().trim();
        }
        catch(e) {
            // pass
        }
    },

    /**
     * Open terminal and execute command
     *
     * @param  {String} cwd
     * @param  {String} cmd
     * @return {Void}
     */
    _exec: function(cwd, cmd) {
        if (!this.command)
            return;

        cwd = cwd || '~';
        cmd = cmd || ':';
        cmd = cmd.replace(/;+$/, '');

        let exe = '';
        exe += 'cd %s; '.format(cwd);
        exe += '%s; '.format(cmd);
        exe += 'exec /bin/bash';

        try {
            let subprocess = new Gio.Subprocess({
                argv: [ this._emulator, '-e', '/bin/bash -c "%s"'.format(exe) ],
                flags: Gio.SubprocessFlags.STDOUT_PIPE,
            });
            subprocess.init(null);
        }
        catch(e) {
            this.emit('error', {
                title: _("Terminal emulator"),
                message: e.toString(),
            });
        }
    },

    /**
     * Open terminal and execute vagrant command
     *
     * @param  {Mixed}  cmd
     * @param  {String} id
     * @return {Void}
     */
    _vagrant: function(cmd, id) {
        let machine = this.machine[id];
        if (!machine) return;

        let msg = _("Press any key to close terminal...");
        let cwd = machine.vagrantfile_path;
        let exe = '';

        if (cmd instanceof Array) {
            for (let i in cmd) {
                exe += '%s %s;'.format(this.command, cmd[i]);
            }
        }
        else if (typeof cmd === 'string')
            exe += '%s %s;'.format(this.command, cmd);
        else
            exe += this.command + ';';

        if ((this.postTerminalAction | PostTerminalAction.PAUSE) === this.postTerminalAction)
            exe += 'echo \\"%s\\";read -n 1 -s;'.format(msg);
        if ((this.postTerminalAction | PostTerminalAction.EXIT) === this.postTerminalAction)
            exe += 'exit;';

        this._exec(cwd, exe);
    },

    /**
     * Parse vagrant machine index file
     * and store data to this.machine
     *
     * @return {String}
     */
    _parse: function() {
        let path = this._file.get_path();
        let [ok, content] = GLib.file_get_contents(path);

        return JSON.parse(content);
    },

    /**
     * Vagrant machine index file change
     * event handler
     *
     * to do: optimize
     * set 250ms timeout and cancel previous
     * interval, so handler won't be executed
     * too often???
     *
     * @param  {Object} monitor
     * @param  {Object} file
     * @return {Void}
     */
    _handle_monitor_changed: function(monitor, file) {
        let _old = this._index;
        let _new = this._parse();
        let emit = [];

        // check actual changes
        if (JSON.stringify(_old) === JSON.stringify(_new))
            return;

        // check if machine is missing
        for (let id in _old.machines) {
            if (!(id in _new.machines))
                emit = emit.concat('remove', id);
        }

        // check if machine is added
        for (let id in _new.machines) {
            if (!(id in _old.machines))
                emit = emit.concat('add', id);
        }

        // check if state changed
        for (let id in _new.machines) {
            if (id in _old.machines && _new.machines[id].state !== _old.machines[id].state)
                emit = emit.concat('state', id);
        }

        // save state
        this._index = _new;

        // emit signal
        for (let i = 0; i < emit.length; i += 2) {
            this.emit(emit[i], {
                id: emit[i + 1],
            });
        }
    },

    /**
     * Get terminal emulator path
     *
     * @return {String}
     */
    get emulator() {
        return this._emulator;
    },

    /**
     * Set terminal emulator path
     *
     * @param  {String} value
     * @return {Void}
     */
    set emulator(value) {
        this._emulator = value || EMULATOR;
    },

    /**
     * Terminal config getter
     *
     * @return {Number}
     */
    get postTerminalAction() {
        return this._post_terminal_action;
    },

    /**
     * Terminal config setter
     *
     * @param  {Number} value
     * @return {Void}
     */
    set postTerminalAction(value) {
        if (value < PostTerminalAction.min())
            value = PostTerminalAction.min();
        else if (value > PostTerminalAction.max())
            value = PostTerminalAction.max();

        this._post_terminal_action = value;
    },

    /**
     * Vagrand command
     *
     * @return {String}
     */
    get command() {
        return this._command;
    },

    /**
     * Vagrant version
     *
     * @return {Array}
     */
    get version() {
        return this._version;
    },

    /**
     * Vagrant machines from index file
     *
     * @return {Array}
     */
    get machine() {
        return this._index.machines;
    },

    /**
     * Monitor vagrant machine index
     * file change
     *
     * warning: make sure you use
     * this.stop() on destructor
     *
     * @return {Void}
     */
    listen: function() {
        if (this._monitor)
            return;

        this._monitor = this._file.monitor(Gio.FileMonitorFlags.NONE, null);
        this._monitor.connect('changed', Lang.bind(this, this._handle_monitor_changed));
    },

    /**
     * Unmonitor vagrant machine index
     * file change
     *
     * @return {Void}
     */
    unlisten: function() {
        if (!this._monitor)
            return;

        this._monitor.cancel();
        this._monitor = null;
    },

    vagrantfile: function(machine_id) {
        let machine = this.machine[machine_id];
        if (!machine) return;

        let uri = GLib.filename_to_uri(machine.vagrantfile_path + '/Vagrantfile', null);
        Gio.AppInfo.launch_default_for_uri(uri, null);
    },

    /**
     * Open terminal at machine vagrantfile_path
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    terminal: function(machine_id) {
        let machine = this.machine[machine_id];
        if (!machine) return;

        this._exec(machine.vagrantfile_path);
    },

    /**
     * Open file manager at machine vagrantfile_path
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    file_manager: function(machine_id) {
        let machine = this.machine[machine_id];
        if (!machine) return;

        let uri = GLib.filename_to_uri(machine.vagrantfile_path, null);
        Gio.AppInfo.launch_default_for_uri(uri, null);
    },

    /**
     * Open terminal and execute command:
     * vagrant up
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    up: function(machine_id) {
        this._vagrant('up', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant up --provision
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    up_provision: function(machine_id) {
        this._vagrant('up --provision', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant up;vagrant ssh
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    up_ssh: function(machine_id) {
        this._vagrant([ 'up', 'ssh' ], machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant up;vagrant rdp
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    up_rdp: function(machine_id) {
        this._vagrant([ 'up', 'rdp' ], machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant provision
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    provision: function(machine_id) {
        this._vagrant('provision', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant ssh
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    ssh: function(machine_id) {
        this._vagrant('ssh', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant rdp
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    rdp: function(machine_id) {
        this._vagrant('rdp', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant resume
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    resume: function(machine_id) {
        this._vagrant('resume', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant suspend
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    suspend: function(machine_id) {
        this._vagrant('suspend', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant halt
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    halt: function(machine_id) {
        this._vagrant('halt', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant destroy
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    destroy: function(machine_id) {
        this._vagrant('destroy', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant destroy --force
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    destroy_force: function(machine_id) {
        this._vagrant('destroy --force', machine_id);
    },

    /* --- */

});

Signals.addSignalMethods(Monitor.prototype);
