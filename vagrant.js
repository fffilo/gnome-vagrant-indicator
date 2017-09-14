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
const Signals = imports.signals;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Enum = Me.imports.enum;
const Translation = Me.imports.translation;
const _ = Translation.translate;

// global properties
const BASH_PATH = '/bin/bash';
const TERMINAL_PATH = '/usr/bin/x-terminal-emulator';
const VAGRANT_EXE = 'vagrant';
const VAGRANT_HOME = GLib.getenv('VAGRANT_HOME') || GLib.getenv('HOME') + '/.vagrant.d';
const VAGRANT_INDEX = '%s/data/machine-index/index'.format(VAGRANT_HOME);

/**
 * Vagrant command enum
 *
 * @type {Object}
 */
const CommandVagrant = new Enum.Enum([
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
 * @type {Object}
 */
const CommandSystem = new Enum.Enum([
    'NONE',
    'TERMINAL',
    'FILE_MANAGER',
    'VAGRANTFILE',
]);

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
 * Vagrant.Exception constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Exception = new Lang.Class({

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
            + (this.title && this.message ? ' - ' : '')
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
 * @return {Object}
 */
const Index = new Lang.Class({

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
            let data = JSON.parse(content);

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
        this._index = null;
        this._file = null;
        this._monitor = null;

        let index = new Index();
        this._index = index.parse();
        this._file = Gio.File.new_for_path(index.path);
        this.emit('change');
        index.destroy();
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.stop();
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
        this._monitor.connect('changed', Lang.bind(this, this._handle_monitor_changed));
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

        this._monitor.cancel();
        this._monitor = null;
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
     * Vagrant machine index file content
     * change event handler
     *
     * @param  {Object} monitor
     * @param  {Object} file
     * @return {Void}
     */
    _handle_monitor_changed: function(monitor, file) {
        let index = new Index();
        let emit = [];
        let _new = index.parse();
        let _old = this.index;
        index.destroy();

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

        // no changes
        if (!emit.length)
            return;

        // save new index
        this._index = _new;

        // emit change
        this.emit('change', {
            index: this.index,
        });

        // emit remove/add/state signal(s)
        for (let i = 0; i < emit.length; i += 2) {
            this.emit(emit[i], {
                id: emit[i + 1],
            });
        }
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
const Emulator = new Lang.Class({

    Name: 'Vagrant.Emulator',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this._index = null;
        this._monitor = null;
        this._terminal = null;
        this._command = null;
        this._version = null;

        let index = new Index();
        this._index = index.parse();
        index.destroy();

        this._monitor = new Monitor();
        this._monitor.connect('change', Lang.bind(this, this._handle_monitor_change));

        this._terminal = TERMINAL_PATH;
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.monitor.destroy();
    },

    /**
     * Validate vagrant command and vagrant machine id:
     * on check fail error signal will be emited with
     * error as message and provided title as title
     * (if no title is provided signal won't be
     * emited)
     *
     * @param  {String}  id    machine id
     * @param  {String}  title (optional) error signal title
     * @return {Boolean}
     */
    _validate: function(id, title) {
        let error, machine = this.index.machines[id];

        // set error
        if (!this.command || !GLib.file_test(this.command, GLib.FileTest.EXISTS) || !GLib.file_test(this.command, GLib.FileTest.IS_EXECUTABLE))
            error = _("Vagrant not installed on your system");
        else if (!machine)
            error = _("Invalid machine id");
        else if (typeof machine !== 'object')
            error = _("Corrupted data");
        else if (!machine.vagrantfile_path || !GLib.file_test(machine.vagrantfile_path, GLib.FileTest.EXISTS) || !GLib.file_test(machine.vagrantfile_path, GLib.FileTest.IS_DIR))
            error = _("Path does not exist");
        else if (!GLib.file_test(machine.vagrantfile_path + '/Vagrantfile', GLib.FileTest.EXISTS) || !GLib.file_test(machine.vagrantfile_path + '/Vagrantfile', GLib.FileTest.IS_REGULAR))
            error = _("Missing Vagrantfile");

        // emit error
        if (error && title) {
            this.emit('error', {
                title: title,
                message: error,
            });
        }

        return !error;
    },

    /**
     * Open terminal and execute command
     *
     * @param  {String} cwd
     * @param  {String} cmd
     * @return {Void}
     */
    _popup: function(cwd, cmd) {
        cwd = cwd || '~';
        cmd = cmd || ':';
        cmd = cmd.replace(/;+$/, '');

        let exe = '';
        exe += 'cd %s; '.format(cwd);
        exe += '%s; '.format(cmd);
        exe += 'exec %s'.format(BASH_PATH);

        try {
            let subprocess = new Gio.Subprocess({
                argv: [ this.terminal, '-e', '%s -c "%s"'.format(BASH_PATH, exe) ],
                flags: Gio.SubprocessFlags.STDOUT_PIPE,
            });
            subprocess.init(null);
        }
        catch(e) {
            this.emit('error', {
                title: _("Vagrant Terminal"),
                message: e.toString(),
            });
        }
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
        if (!this._validate(id, _("Vagrant Command")))
            return;

        let msg = _("Press any key to close terminal...");
        let cwd = this.index.machines[id].vagrantfile_path;
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

        if (action) {
            if ((action | PostTerminalAction.PAUSE) === action)
                exe += 'echo \\"%s\\";read -n 1 -s;'.format(msg);
            if ((action | PostTerminalAction.EXIT) === action)
                exe += 'exit;';
        }

        this._popup(cwd, exe);
    },

    /**
     * Moniror change signal event handler
     *
     * @param  {Object} monitor
     * @param  {Object} event
     * @return {Void}
     */
    _handle_monitor_change: function(monitor, event) {
        this._index = event.index;
    },

    /**
     * Property index getter:
     * parsed vagrant machine index file content
     *
     * @return {Object}
     */
    get index() {
        return this._index;
    },

    /**
     * Property monitor getter
     *
     * @return {Object}
     */
    get monitor() {
        return this._monitor;
    },

    /**
     * Property terminal getter:
     * terminal executable file path
     *
     * @return {String}
     */
    get terminal() {
        return this._terminal;
    },

    /**
     * Property terminal setter
     *
     * @param  {String} value
     * @return {Void}
     */
    set terminal(value) {
        this._terminal = value;
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
     * Parse vagrant machine index file content
     * and save it to this.index
     *
     * @return {Void}
     */
    refresh: function() {
        let index = new Index();
        this._index = index.parse();
        index.destroy();
    },

    /**
     * Execute system command
     *
     * @param  {String} id  machine id
     * @param  {Number} cmd CommandSystem
     * @return {Void}
     */
    open: function(id, cmd) {
        if (!this._validate(id, _("System Command")))
            return;

        if ((cmd | CommandSystem.TERMINAL) === cmd) {
            this._popup(this.index.machines[id].vagrantfile_path);
        }
        if ((cmd | CommandSystem.VAGRANTFILE) === cmd) {
            let uri = GLib.filename_to_uri(this.index.machines[id].vagrantfile_path + '/Vagrantfile', null);
            Gio.AppInfo.launch_default_for_uri(uri, null);
        }
        if ((cmd | CommandSystem.FILE_MANAGER) === cmd) {
            let uri = GLib.filename_to_uri(this.index.machines[id].vagrantfile_path, null);
            Gio.AppInfo.launch_default_for_uri(uri, null);
        }
    },

    /**
     * Execute vagrant command
     *
     * @param  {String} id     machine id
     * @param  {Number} cmd    CommandVagrant
     * @param  {Number} action (optional) PostTerminalAction
     * @return {Void}
     */
    execute: function(id, cmd, action) {
        if (!this._validate(id, _("System Command")))
            return;

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

    /* --- */

});

Signals.addSignalMethods(Emulator.prototype);

/**
 * Vagrant.MonitorXXX constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const MonitorXXX = new Lang.Class({

    Name: 'Vagrant.MonitorXXX',

    /**
     * Constructor
     *
     * @return {Void}
     * /
    _init: function() {
        this._file = Gio.File.new_for_path(INDEX);
        this._emulator = EMULATOR;
        this._index = this._parse();
        this._monitor = null;
        this._command = null;
        this._version = null;
        this._post_terminal_action = PostTerminalAction.NONE;

        this._which();
    },

    /**
     * Destructor
     *
     * @return {Void}
     * /
    run_dispose: function() {
        this.unlisten();
    },

    /**
     * Find exe path and vagrant version
     *
     * @return {Void}
     * /
    _which: function() {
        this._command = null;
        this._version = null;

        try {
            let [ok, output, error, status] = GLib.spawn_sync(null, ['which', EXE], null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (!status && output)
                this._command = output.toString().trim();
        }
        catch(e) {
            return;
        }

        try {
            let [ok, output, error, status] = GLib.spawn_sync(null, [EXE, '--version'], null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (!status && output)
                this._version = output.toString().trim();
        }
        catch(e) {
            return;
        }
    },

    /**
     * Validate vagrant command and vagrant machine id:
     * on check fail error signal will be emited with
     * error as message and provided title as title
     * (if no title is provided signal won't be
     * emited)
     *
     * @param  {String}  machine_id
     * @param  {String}  title      (optional)
     * @return {Boolean}
     * /
    _validate: function(machine_id, title) {
        let error, machine = this.machine[machine_id];

        // recheck vagrant installation
        if (!this.command)
            this._which();

        // set error
        if (!this.command || !GLib.file_test(this.command, GLib.FileTest.EXISTS) || !GLib.file_test(this.command, GLib.FileTest.IS_EXECUTABLE))
            error = _("Vagrant not installed on your system");
        else if (!machine)
            error = _("Invalid machine id");
        else if (typeof machine !== 'object')
            error = _("Corrupted data");
        else if (!machine.vagrantfile_path || !GLib.file_test(machine.vagrantfile_path, GLib.FileTest.EXISTS) || !GLib.file_test(machine.vagrantfile_path, GLib.FileTest.IS_DIR))
            error = _("Path does not exist");
        else if (!GLib.file_test(machine.vagrantfile_path + '/Vagrantfile', GLib.FileTest.EXISTS) || !GLib.file_test(machine.vagrantfile_path + '/Vagrantfile', GLib.FileTest.IS_REGULAR))
            error = _("Missing Vagrantfile");

        // emit error
        if (error && title) {
            this.emit('error', {
                title: title,
                message: error,
            });
        }

        return !error;
    },

    /**
     * Open terminal and execute command
     *
     * @param  {String} cwd
     * @param  {String} cmd
     * @return {Void}
     * /
    _exec: function(cwd, cmd) {
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
     * /
    _vagrant: function(cmd, id) {
        if (!this._validate(id, _("Vagrant Command")))
            return;

        let msg = _("Press any key to close terminal...");
        let cwd = this.machine[id].vagrantfile_path;
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
     *
     * @return {Object}
     * /
    _parse: function() {
        try {
            let path = this._file.get_path();
            let [ok, content] = GLib.file_get_contents(path);

            return JSON.parse(content);
        }
        catch(e) {
            // pass
        }

        // empty result on no file found or invalid file content
        return {
            version: 0,
            machines: {},
        };
    },

    /**
     * Vagrant machine index file change
     * event handler
     *
     * @param  {Object} monitor
     * @param  {Object} file
     * @return {Void}
     * /
    _handle_monitor_changed: function(monitor, file) {
        this.refresh();
    },

    /**
     * Get terminal emulator path
     *
     * @return {String}
     * /
    get emulator() {
        return this._emulator;
    },

    /**
     * Set terminal emulator path
     *
     * @param  {String} value
     * @return {Void}
     * /
    set emulator(value) {
        this._emulator = value || EMULATOR;
    },

    /**
     * Terminal config getter
     *
     * @return {Number}
     * /
    get postTerminalAction() {
        return this._post_terminal_action;
    },

    /**
     * Terminal config setter
     *
     * @param  {Number} value
     * @return {Void}
     * /
    set postTerminalAction(value) {
        if (value < PostTerminalAction.min())
            value = PostTerminalAction.min();
        else if (value > PostTerminalAction.max())
            value = PostTerminalAction.max();

        this._post_terminal_action = value;
    },

    /**
     * Vagrant command
     *
     * @return {String}
     * /
    get command() {
        return this._command;
    },

    /**
     * Vagrant version
     *
     * @return {Array}
     * /
    get version() {
        return this._version;
    },

    /**
     * Vagrant machines from index file
     *
     * @return {Array}
     * /
    get machine() {
        return this._index.machines;
    },

    /**
     * Monitor vagrant machine index
     * file change
     *
     * @return {Void}
     * /
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
     * /
    unlisten: function() {
        if (!this._monitor)
            return;

        this._monitor.cancel();
        this._monitor = null;
    },

    /**
     * Read vagrant machine index file,
     * parse data and emit signals
     *
     *
     * @return {Void}
     * /
    refresh: function() {
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
     * Open Vagrantfile
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    vagrantfile: function(machine_id) {
        if (!this._validate(machine_id, _("Vagrantfile")))
            return;

        let uri = GLib.filename_to_uri(this.machine[machine_id].vagrantfile_path + '/Vagrantfile', null);
        Gio.AppInfo.launch_default_for_uri(uri, null);
    },

    /**
     * Open terminal at machine vagrantfile_path
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    terminal: function(machine_id) {
        if (!this._validate(machine_id, _("Terminal")))
            return;

        this._exec(this.machine[machine_id].vagrantfile_path);
    },

    /**
     * Open file manager at machine vagrantfile_path
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    file_manager: function(machine_id) {
        if (!this._validate(machine_id, _("File Manager")))
            return;

        let uri = GLib.filename_to_uri(this.machine[machine_id].vagrantfile_path, null);
        Gio.AppInfo.launch_default_for_uri(uri, null);
    },

    /**
     * Open terminal and execute command:
     * vagrant up
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    up: function(machine_id) {
        this._vagrant('up', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant up --provision
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    up_provision: function(machine_id) {
        this._vagrant('up --provision', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant up;vagrant ssh
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    up_ssh: function(machine_id) {
        this._vagrant([ 'up', 'ssh' ], machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant up;vagrant rdp
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    up_rdp: function(machine_id) {
        this._vagrant([ 'up', 'rdp' ], machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant provision
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    provision: function(machine_id) {
        this._vagrant('provision', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant ssh
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    ssh: function(machine_id) {
        this._vagrant('ssh', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant rdp
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    rdp: function(machine_id) {
        this._vagrant('rdp', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant resume
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    resume: function(machine_id) {
        this._vagrant('resume', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant suspend
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    suspend: function(machine_id) {
        this._vagrant('suspend', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant halt
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    halt: function(machine_id) {
        this._vagrant('halt', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant destroy
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    destroy: function(machine_id) {
        this._vagrant('destroy', machine_id);
    },

    /**
     * Open terminal and execute command:
     * vagrant destroy --force
     *
     * @param  {String} machine_id
     * @return {Void}
     * /
    destroy_force: function(machine_id) {
        this._vagrant('destroy --force', machine_id);
    },

    /* --- */

});

Signals.addSignalMethods(Monitor.prototype);
