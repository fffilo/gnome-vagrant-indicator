/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Signals = imports.signals;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// global properties
const HOME = GLib.getenv('VAGRANT_HOME') || GLib.getenv('HOME') + '/.vagrant.d';
const INDEX = '%s/data/machine-index/index'.format(HOME);

/**
 * Post terminal action enum
 *
 * @type {Object}
 */
const PostTerminalAction = Object.freeze({
    UNKNOWN: 0,
    NONE: Math.pow(2, 0),
    PAUSE: Math.pow(2, 1),
    EXIT: Math.pow(2, 2),
    ALL: Math.pow(2, 3) - 1,
    _min: function() {
        return this.NONE;
    },
    _max: function() {
        return this.ALL;
    },
    _from_string: function(str) {
        str = str
            .toString()
            .toUpperCase()
            .replace(/[^A-Za-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');

        let props = Object.keys(this);
        for (let i in props) {
            let key = props[i];
            let val = this[key];

            if (!key.startsWith('_') && typeof val === 'number' && str === key)
                return val;
        }

        return this.UNKNOWN;
    },
});

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
        this._def();

        if (!this._command)
            throw 'Unable to initialize Vagrant.Monitor (vagrant not installed)';
    },

    /**
     * Define private properties
     *
     * @return {Void}
     */
    _def: function() {
        this._file = Gio.File.new_for_path(INDEX);
        this._index = this._parse();
        this._monitor = null;
        this._command = null;
        this._version = null;
        this._post_terminal_action = PostTerminalAction.NONE;

        let ok, output, error, status;
        [ok, output, error, status] = GLib.spawn_sync(null, ['which', 'vagrant'], null, GLib.SpawnFlags.SEARCH_PATH, null);
        if (!status && output)
            this._command = output.toString().trim();

        [ok, output, error, status] = GLib.spawn_sync(null, ['vagrant', '--version'], null, GLib.SpawnFlags.SEARCH_PATH, null);
        if (!status && output)
            this._version = output.toString().trim();
    },

    /**
     * Open terminal and execute command
     *
     * @param  {String} cwd
     * @param  {String} cmd
     * @return {Void}
     */
    _exec: function(cwd, cmd) {
        cwd = cwd || '~';
        cmd = cmd || ':';
        cmd = cmd.replace(/;+$/, '');

        let exe = '';
        exe += 'cd %s; '.format(cwd);
        exe += '%s; '.format(cmd);
        exe += 'exec /bin/bash';

        let subprocess = new Gio.Subprocess({
            argv: [ 'x-terminal-emulator', '-e', '/bin/bash -c "%s"'.format(exe) ],
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        subprocess.init(null);
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
     * set 500ms timeout and cancel previous
     * interval, so changed signal won't be
     * emited too often???
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
        if (value < PostTerminalAction._min())
            value = PostTerminalAction._min();
        else if (value > PostTerminalAction._max())
            value = PostTerminalAction._max();

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
     * Open nautilus at machine vagrantfile_path
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    nautilus: function(machine_id) {
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

});

Signals.addSignalMethods(Monitor.prototype);
