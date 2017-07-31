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
        this._handle_monitor_changed();

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
        this._monitor = null;
        this._index = {};
        this._command = null;
        this._version = null;

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
        let bash = '';
        bash += 'cd %s; '.format(cwd || '~');
        bash += '%s; '.format(cmd || ':');
        bash += 'exec /bin/bash';

        let subprocess = new Gio.Subprocess({
            argv: [ 'x-terminal-emulator', '-e', '/bin/bash -c "%s"'.format(bash) ],
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        subprocess.init(null);
    },

    /**
     * Open terminal and execute vagrant command
     *
     * @param  {String} cmd
     * @param  {String} id
     * @return {Void}
     */
    _vagrant: function(cmd, id) {
        let machine = this.machine[id];
        if (!machine) return;

        let cwd = machine.vagrantfile_path;
        this._exec(cwd, '%s %s'.format(this.command, cmd || ''));
    },

    /**
     * Parse vagrant machine index file
     * and store data to this.machine
     *
     * @return {Boolean}
     */
    _parse: function() {
        let path = this._file.get_path();
        let [ok, content] = GLib.file_get_contents(path);

        this._index = JSON.parse(content);
    },

    /**
     * Vagrant machine index file change
     * event handler
     *
     * to do: set 500ms timeout and cancel
     * previous interval, so changed signal
     * won't be emited too often???
     *
     * @param  {Object} file
     * @param  {Object} otherFile
     * @param  {Number} eventType
     * @return {Void}
     */
    _handle_monitor_changed: function(file, otherFile, eventType) {
        this._parse();
        this.emit('changed', {
            monitor: this.monitor,
        });
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
     * vagrant up --provision
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    up_and_provision: function(machine_id) {
        this._vagrant('up --provision', machine_id);
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
     * vagrant destroy --force
     *
     * @param  {String} machine_id
     * @return {Void}
     */
    destroy: function(machine_id) {
        this._vagrant('destroy', machine_id);
    },

});

Signals.addSignalMethods(Monitor.prototype);
