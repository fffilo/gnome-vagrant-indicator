/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*
  Copyright (c) 2017, Franjo Filo <fffilo666@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the GNOME nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Enum = Me.imports.enum;
const Terminal = Me.imports.terminal;
const Dict =  Me.imports.dict;

// global properties
const VAGRANT_EXE = 'vagrant';
const VAGRANT_HOME = GLib.getenv('VAGRANT_HOME') || GLib.getenv('HOME') + '/.vagrant.d';
const VAGRANT_INDEX = '%s/data/machine-index/index'.format(VAGRANT_HOME);

// translations
const MESSAGE_KEYPRESS = 'Press any key to close terminal...';
const MESSAGE_VAGRANT_NOT_INSTALLED = 'Vagrant not installed on your system';
const MESSAGE_INVALID_MACHINE = 'Invalid machine id';
const MESSAGE_CORRUPTED_DATA = 'Corrupted data';
const MESSAGE_INVALID_PATH= 'Path does not exist';
const MESSAGE_MISSING_VAGRANTFILE = 'Missing Vagrantfile';

/**
 * Vagrant command enum
 *
 * @type {Enum.Enum}
 */
var CommandVagrant = new Enum.Enum([
    'NONE',
    'UP',
    'UP_PROVISION',
    'UP_SSH',
    'UP_RDP',
    'PROVISION',
    'SSH',
    'RDP',
    'RESUME',
    'SUSPEND',
    'HALT',
    'DESTROY',
    'DESTROY_FORCE',
]);

/**
 * System command enum
 *
 * @type {Enum.Enum}
 */
var CommandSystem = new Enum.Enum([
    'NONE',
    'TERMINAL',
    'FILE_MANAGER',
    'VAGRANTFILE',
    'MACHINE_CONFIG',
]);

/**
 * Post terminal action enum
 *
 * @type {Enum.Enum}
 */
var PostTerminalAction = new Enum.Enum([
    'NONE',
    'PAUSE',
    'EXIT',
    //'BOTH',
]);
Enum.addMember(PostTerminalAction, 'BOTH', Enum.sum(PostTerminalAction));

/**
 * Vagrant.Exception constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Exception = new Lang.Class({

    Name: 'Vagrant.Exception',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function(message, title) {
        this._message = message;
        this._title = title;
    },

    /**
     * Property message getter
     *
     * @return {String}
     */
    get message() {
        return this._message;
    },

    /**
     * Property title getter
     *
     * @return {String}
     */
    get title() {
        return this._title;
    },

    /**
     * Exception as string
     *
     * @return {String}
     */
    toString: function() {
        return ''
            + (this.title || '')
            + (this.title && this.message ? ': ' : '')
            + (this.message || '');
    },

    /* --- */

});

/**
 * Vagrant.Index constructor:
 * parsing vagrant machine index file
 * content
 *
 * @param  {Object}
 * @return {Class}
 */
var Index = new Lang.Class({

    Name: 'Vagrant.Index',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this._path = VAGRANT_INDEX;
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        // pass
    },

    /**
     * Property path getter:
     * vagrant machine index file path
     *
     * @return {String}
     */
    get path() {
        return this._path;
    },

    /**
     * Parse vagrant machine index file content
     *
     * @return {Object}
     */
    parse: function() {
        try {
            let [ok, content] = GLib.file_get_contents(this.path);
            let data = Dict.jsonDecode(content);

            if (typeof data !== 'object') throw '';
            if (typeof data.machines !== 'object') throw '';

            return data;
        }
        catch(e) {
            // pass
        }

        // empty result on no file found or invalid file content
        return {
            version: 0,
            machines: {},
        }
    },

    /* --- */

});

/**
 * Vagrant.Monitor constructor:
 * monitoring changes in vagrant machine
 * index file
 *
 * @param  {Object}
 * @return {Class}
 */
var Monitor = new Lang.Class({

    Name: 'Vagrant.Monitor',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this._index = null;
        this._file = null;
        this._monitor = null;
        this._interval = null;

        let path = this.refresh();
        this._file = Gio.File.new_for_path(path);
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.stop();

        this._interval = null;
        this._monitor = null;
        this._file = null;
        this._index = null;
    },

    /**
     * Monitor vagrant machine index file
     * content change
     *
     * @return {Void}
     */
    start: function() {
        if (this._monitor)
            return;

        this._monitor = this._file.monitor(Gio.FileMonitorFlags.NONE, null);
        this._monitor.connect('changed', Lang.bind(this, this._handleMonitorChanged));
    },

    /**
     * Unmonitor vagrant machine index file
     * content change
     *
     * @return {Void}
     */
    stop: function() {
        if (!this._monitor)
            return;

        Mainloop.source_remove(this._interval);

        this._monitor.cancel();
        this._monitor = null;
        this._interval = null;
    },

    /**
     * Parse vagrant machine index file content,
     * save it to this.index and return vagrant
     * path
     *
     * @return {String}
     */
    refresh: function() {
        let index = new Index();
        let result = index.path;

        this._index = index.parse();

        index.destroy();

        return result;
    },

    /**
     * Property index getter:
     * vagrant machine index file content
     * as object
     *
     * @return {String}
     */
    get index() {
        return this._index;
    },

    /**
     * Delay (in miliseconds) for event
     * emitting. This will prevent same
     * event emit on continuously file
     * save every few miliseconds.
     *
     * @return {Number}
     */
    get delay() {
        return 1000;
    },

    /**
     * Vagrant machine index file content
     * change event handler
     *
     * @param  {GInotifyFileMonitor} monitor
     * @param  {GLocalFile}          file
     * @return {Void}
     */
    _handleMonitorChanged: function(monitor, file) {
        Mainloop.source_remove(this._interval);
        this._interval = Mainloop.timeout_add(this.delay, Lang.bind(this, this._handleMonitorChangedDelayed), null);
    },

    /**
     * Adding delay after vagrant machine
     * index file content change event
     * handler which will prevent
     * unnecessary multiple code
     * execution
     *
     * @return {Boolean}
     */
    _handleMonitorChangedDelayed: function() {
        this._interval = null;

        let emit = [];
        let _old = Dict.deepClone(this.index);
        let _new = null;
        this.refresh();
        _new = Dict.deepClone(this.index);

        // check actual changes
        if (Dict.isEqual(_old, _new))
            return;

        // check if machine is missing
        for (let id in _old.machines) {
            if (!(id in _new.machines))
                emit = emit.concat('remove', {
                    id: id,
                    name: _old.machines[id].name,
                    provider: _old.machines[id].provider,
                    state: _old.machines[id].state,
                    path : _old.machines[id].vagrantfile_path,
                });
        }

        // check if machine is added
        for (let id in _new.machines) {
            if (!(id in _old.machines))
                emit = emit.concat('add', {
                    id: id,
                    name: _new.machines[id].name,
                    provider: _new.machines[id].provider,
                    state: _new.machines[id].state,
                    path : _new.machines[id].vagrantfile_path,
                });
        }

        // check if state changed
        for (let id in _new.machines) {
            if (id in _old.machines && _new.machines[id].state !== _old.machines[id].state)
                emit = emit.concat('state', {
                    id: id,
                    name: _new.machines[id].name,
                    provider: _new.machines[id].provider,
                    state: _new.machines[id].state,
                    path : _new.machines[id].vagrantfile_path,
                });
        }

        // no changes
        if (!emit.length)
            return false;

        // emit change
        this.emit('change', {
            index: this.index,
        });

        // emit remove/add/state signal(s)
        for (let i = 0; i < emit.length; i += 2) {
            this.emit(emit[i], emit[i + 1]);
        }

        // stop repeating
        return false;
    },

    /* --- */

});

Signals.addSignalMethods(Monitor.prototype);

/**
 * Vagrant.Emulator constructor:
 * executing vagrant commands
 *
 * @param  {Object}
 * @return {Object}
 */
var Emulator = new Lang.Class({

    Name: 'Vagrant.Emulator',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this._monitor = null;
        this._terminal = null;
        this._command = null;
        this._version = null;

        this._monitor = new Monitor();
        this._monitor.start();

        this._terminal = new Terminal.Emulator();
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        if (this.terminal)
            this.terminal.destroy();
        if (this.monitor)
            this.monitor.destroy();

        this._version = null;
        this._command = null;
        this._terminal = null;
        this._monitor = null;
    },

    /**
     * Validate vagrant command and vagrant machine id
     *
     * @param  {String}  id machine id
     * @return {Boolean}
     */
    _validate: function(id) {
        let index = this.monitor.index;
        let machine = index.machines[id] || null;

        if (!this.command || !GLib.file_test(this.command, GLib.FileTest.EXISTS) || !GLib.file_test(this.command, GLib.FileTest.IS_EXECUTABLE))
            throw new Exception(MESSAGE_VAGRANT_NOT_INSTALLED, 'Vagrant.Emulator');
        else if (!machine)
            throw new Exception(MESSAGE_INVALID_MACHINE, 'Vagrant.Emulator');
        else if (typeof machine !== 'object')
            throw new Exception(MESSAGE_CORRUPTED_DATA, 'Vagrant.Emulator');
        else if (!machine.vagrantfile_path || !GLib.file_test(machine.vagrantfile_path, GLib.FileTest.EXISTS) || !GLib.file_test(machine.vagrantfile_path, GLib.FileTest.IS_DIR))
            throw new Exception(MESSAGE_INVALID_PATH, 'Vagrant.Emulator');
        else if (!GLib.file_test(machine.vagrantfile_path + '/Vagrantfile', GLib.FileTest.EXISTS) || !GLib.file_test(machine.vagrantfile_path + '/Vagrantfile', GLib.FileTest.IS_REGULAR))
            throw new Exception(MESSAGE_MISSING_VAGRANTFILE, 'Vagrant.Emulator');
    },

    /**
     * Open terminal and execute vagrant command
     *
     * @param  {String} id     machine id
     * @param  {String} cmd    vagrant command (up|halt...)
     * @param  {Number} action (optional) PostTerminalAction
     * @return {Void}
     */
    _exec: function(id, cmd, action) {
        this._validate(id);

        let index = this.monitor.index;
        let cwd = index.machines[id].vagrantfile_path;
        let name = 'name' in index.machines[id] ? index.machines[id].name : '';
        let exe = '';

        if (cmd instanceof Array)
            for (let i in cmd) {
                exe += '%s %s %s;'.format(this.command, cmd[i], name);
            }
        else if (typeof cmd === 'string')
            exe += '%s %s %s;'.format(this.command, cmd, name);
        else
            exe += this.command + ';';

        if (action) {
            if ((action | PostTerminalAction.PAUSE) === action)
                exe += 'echo "%s";read -n 1 -s;'.format(MESSAGE_KEYPRESS.replace(/\"/g, '\\\\"'));
            if ((action | PostTerminalAction.EXIT) === action)
                exe += 'exit;';
        }

        this.terminal.popup(cwd, exe);
    },

    /**
     * Property monitor getter
     *
     * @return {Vagrant.Monitor}
     */
    get monitor() {
        return this._monitor;
    },

    /**
     * Property terminal getter:
     * terminal emulator
     *
     * @return {Terminal.Emulator}
     */
    get terminal() {
        return this._terminal;
    },

    /**
     * Property command getter:
     * vagrant command path
     *
     * @return {String}
     */
    get command() {
        if (!this._command) {
            try {
                let [ok, output, error, status] = GLib.spawn_sync(null, ['which', VAGRANT_EXE], null, GLib.SpawnFlags.SEARCH_PATH, null);
                if (!status && output)
                    this._command = output.toString().trim();
            }
            catch(e) {
                // pass
            }
        }

        return this._command;
    },

    /**
     * Property version getter:
     * vagrant version
     *
     * @return {String}
     */
    get version() {
        if (!this._version && this._command) {
            try {
                let [ok, output, error, status] = GLib.spawn_sync(null, [this.command, '--version'], null, GLib.SpawnFlags.SEARCH_PATH, null);
                if (!status && output)
                    this._version = output.toString().trim();
            }
            catch(e) {
                // pass
            }
        }

        return this._version;
    },

    /**
     * Execute system command
     *
     * @param  {String} id  machine id
     * @param  {Number} cmd CommandSystem enum
     * @return {Void}
     */
    open: function(id, cmd) {
        this._validate(id);

        let index = this.monitor.index;
        if ((cmd | CommandSystem.TERMINAL) === cmd) {
            this.terminal.popup(index.machines[id].vagrantfile_path);
        }
        if ((cmd | CommandSystem.VAGRANTFILE) === cmd) {
            let uri = GLib.filename_to_uri(index.machines[id].vagrantfile_path + '/Vagrantfile', null);
            Gio.AppInfo.launch_default_for_uri(uri, null);
        }
        if ((cmd | CommandSystem.FILE_MANAGER) === cmd) {
            let uri = GLib.filename_to_uri(index.machines[id].vagrantfile_path, null);
            Gio.AppInfo.launch_default_for_uri(uri, null);
        }
        if ((cmd | CommandSystem.MACHINE_CONFIG) === cmd) {
            let uri = GLib.filename_to_uri(index.machines[id].vagrantfile_path + '/.' + Me.metadata.uuid, null);
            Gio.AppInfo.launch_default_for_uri(uri, null);
        }
    },

    /**
     * Execute vagrant command
     *
     * @param  {String} id     machine id
     * @param  {Number} cmd    CommandVagrant enum
     * @param  {Number} action (optional) PostTerminalAction enum
     * @return {Void}
     */
    execute: function(id, cmd, action) {
        this._validate(id);

        if ((cmd | CommandVagrant.UP) === cmd)
            this._exec(id, 'up', action);
        if ((cmd | CommandVagrant.UP_PROVISION) === cmd)
            this._exec(id, 'up --provision', action);
        if ((cmd | CommandVagrant.UP_SSH) === cmd)
            this._exec(id, ['up', 'ssh'], action);
        if ((cmd | CommandVagrant.UP_RDP) === cmd)
            this._exec(id, ['up', 'rdp'], action);
        if ((cmd | CommandVagrant.PROVISION) === cmd)
            this._exec(id, 'provision', action);
        if ((cmd | CommandVagrant.SSH) === cmd)
            this._exec(id, 'ssh', action);
        if ((cmd | CommandVagrant.RDP) === cmd)
            this._exec(id, 'rdp', action);
        if ((cmd | CommandVagrant.RESUME) === cmd)
            this._exec(id, 'resume', action);
        if ((cmd | CommandVagrant.SUSPEND) === cmd)
            this._exec(id, 'suspend', action);
        if ((cmd | CommandVagrant.HALT) === cmd)
            this._exec(id, 'halt', action);
        if ((cmd | CommandVagrant.DESTROY) === cmd)
            this._exec(id, 'destroy', action);
        if ((cmd | CommandVagrant.DESTROY_FORCE) === cmd)
            this._exec(id, 'destroy --force', action);
    },

    /**
     * Open terminal emulator and execute
     * vagrant global-status {--prune}
     *
     * @param  {Boolean} prune (optional)
     * @return {Void}
     */
    globalStatus: function(prune) {
        let cwd = GLib.getenv('HOME');
        let exe = ''
            + this.command
            + ' global-status'
            + (prune ? ' --prune' : '');

        this.terminal.popup(cwd, exe);
    },

    /**
     * Execute vagrant global-status {--prune}
     * in the background
     *
     * @param  {Boolean}  prune    (optional)
     * @param  {Function} callback (optional)
     * @return {Void}
     */
    globalStatusAsync: function(prune, callback) {
        let exe = ''
            + this.command
            + ' global-status'
            + (prune ? ' --prune' : '');

        try {
            let subprocess = new Gio.Subprocess({
                argv: exe.split(' '),
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });

            subprocess.init(null);
            subprocess.communicate_utf8_async(null, null, Lang.bind(this, this._handleGlobalStatus, exe, callback));
        }
        catch(e) {
            if (typeof callback === 'function')
                callback.call(this, {
                    status: -1,
                    stdin: exe,
                    stdout: '',
                    stderr: e.toString(),
                });
        }
    },

    /**
     * Async shell exec event handler
     *
     * @param  {Gio.Subprocess} source
     * @param  {Gio.Task}       resource
     * @param  {String}         stdin
     * @param  {Function}       callback (optional)
     * @return {Void}
     */
    _handleGlobalStatus: function(source, resource, stdin, callback) {
        let status = source.get_exit_status();
        let [, stdout, stderr] = source.communicate_utf8_finish(resource);

        if (typeof callback === 'function')
            callback.call(this, {
                status: status,
                stdin: stdin,
                stdout: stdout,
                stderr: stderr,
            });
    },

    /* --- */

});

Signals.addSignalMethods(Emulator.prototype);
