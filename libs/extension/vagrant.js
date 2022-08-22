/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*
 Copyright (c) 2019, Franjo Filo <fffilo666@gmail.com>

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

// Strict mode.
'use strict';

// Import modules.
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const {GLib, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Enum = Me.imports.libs.extension.enum;
const Terminal = Me.imports.libs.extension.terminal;
const Dict =  Me.imports.libs.extension.dict;

// Global properties.
const VAGRANT_EXE = 'vagrant';
const VAGRANT_HOME = GLib.getenv('VAGRANT_HOME') || GLib.getenv('HOME') + '/.vagrant.d';
const VAGRANT_INDEX = '%s/data/machine-index/index'.format(VAGRANT_HOME);

// Translations.
const MESSAGE_KEYPRESS = 'Press any key to close terminal...';
const MESSAGE_VAGRANT_NOT_INSTALLED = 'Vagrant not installed on your system';
const MESSAGE_INVALID_MACHINE = 'Invalid machine id';
const MESSAGE_CORRUPTED_DATA = 'Corrupted data';
const MESSAGE_INVALID_PATH = 'Path does not exist';
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
 * Vagrant.Exception.
 */
var Exception = class Exception {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    constructor(message, title) {
        this._message = message;
        this._title = title;
    }

    /**
     * Message property getter.
     *
     * @return {String}
     */
    get message() {
        return this._message;
    }

    /**
     * Title property getter.
     *
     * @return {String}
     */
    get title() {
        return this._title;
    }

    /**
     * Exception as string.
     *
     * @return {String}
     */
    toString() {
        return ''
            + (this.title || '')
            + (this.title && this.message ? ': ' : '')
            + (this.message || '');
    }

    /* --- */
};

/**
 * Vagrant.Index:
 * parsing vagrant machine index file content.
 */
var Index = class Index {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    constructor() {
        this._path = VAGRANT_INDEX;
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        // pass
    }

    /**
     * Path property getter:
     * vagrant machine index file path.
     *
     * @return {String}
     */
    get path() {
        return this._path;
    }

    /**
     * Parse vagrant machine index file content.
     *
     * @return {Object}
     */
    parse() {
        try {
            let [ ok, content ] = GLib.file_get_contents(this.path);
            if (!ok || !content)
                throw '';
            else if (content instanceof Uint8Array)
                content = String.fromCharCode.apply(null, content);

            let data = Dict.jsonDecode(content);
            if (typeof data !== 'object')
                throw '';
            if (typeof data.machines !== 'object')
                throw '';

            return data;
        }
        catch(e) {
            // pass
        }

        // Empty result on no file found or invalid file content.
        return {
            version: 0,
            machines: {},
        }
    }

    /* --- */
};

/**
 * Vagrant.Monitor:
 * monitoring changes in vagrant machine index file.
 */
var Monitor = class Monitor {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    constructor() {
        this._index = null;
        this._file = null;
        this._monitor = null;
        this._interval = null;

        let path = this.refresh();
        this._file = Gio.File.new_for_path(path);
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        this.stop();

        this._interval = null;
        this._monitor = null;
        this._file = null;
        this._index = null;
    }

    /**
     * Monitor vagrant machine index file content change.
     *
     * @return {Void}
     */
    start() {
        if (this._monitor)
            return;

        this._monitor = this._file.monitor(Gio.FileMonitorFlags.NONE, null);
        this._monitor.connect('changed', this._handleMonitorChanged.bind(this));
    }

    /**
     * Unmonitor vagrant machine index file content change.
     *
     * @return {Void}
     */
    stop() {
        if (!this._monitor)
            return;

        Mainloop.source_remove(this._interval);

        this._monitor.cancel();
        this._monitor = null;
        this._interval = null;
    }

    /**
     * Parse vagrant machine index file content, save it to this.index and
     * return vagrant path.
     *
     * @return {String}
     */
    refresh() {
        let index = new Index(),
            result = index.path;

        this._index = index.parse();

        index.destroy();

        return result;
    }

    /**
     * Property index getter:
     * vagrant machine index file content as object.
     *
     * @return {String}
     */
    get index() {
        return this._index;
    }

    /**
     * Delay property getter.
     *
     * Number of miliseconds for event emitting. This will prevent same event
     * emit on continuously file save every few miliseconds.
     *
     * @return {Number}
     */
    get delay() {
        return 1000;
    }

    /**
     * Vagrant machine index file content change event handler.
     *
     * @param  {GInotifyFileMonitor} monitor
     * @param  {GLocalFile}          file
     * @return {Void}
     */
    _handleMonitorChanged(monitor, file) {
        Mainloop.source_remove(this._interval);
        this._interval = Mainloop.timeout_add(this.delay, this._handleMonitorChangedDelayed.bind(this), null);
    }

    /**
     * Adding delay after vagrant machine index file content change event
     * handler which will prevent unnecessary multiple code execution.
     *
     * @return {Boolean}
     */
    _handleMonitorChangedDelayed() {
        this._interval = null;

        let emit = [],
            _old = Dict.deepClone(this.index),
            _new = null;
        this.refresh();
        _new = Dict.deepClone(this.index);

        // Check actual changes.
        if (Dict.isEqual(_old, _new))
            return;

        // Check if machine is missing.
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

        // Check if machine is added.
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

        // Check if state changed.
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

        // No changes.
        if (!emit.length)
            return false;

        // Emit change.
        this.emit('change', {
            index: this.index,
        });

        // Emit remove/add/state signal(s).
        for (let i = 0; i < emit.length; i += 2) {
            this.emit(emit[i], emit[i + 1]);
        }

        // Stop repeating.
        return false;
    }

    /* --- */
};

Signals.addSignalMethods(Monitor.prototype);

/**
 * Vagrant.Emulator:
 * executing vagrant commands.
 */
var Emulator = class Emulator {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    constructor() {
        this._monitor = null;
        this._terminal = null;
        this._command = null;
        this._version = null;

        this._monitor = new Monitor();
        this._monitor.start();

        this._terminal = new Terminal.Emulator();
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        if (this.terminal)
            this.terminal.destroy();
        if (this.monitor)
            this.monitor.destroy();

        this._version = null;
        this._command = null;
        this._terminal = null;
        this._monitor = null;
    }

    /**
     * Validate vagrant command and vagrant machine id.
     *
     * @param  {String}  id machine id
     * @return {Boolean}
     */
    _validate(id) {
        let index = this.monitor.index,
            machine = index.machines[id] || null;
        //global.log('vagrant::id::' + id);
        //global.log('vagrant::index::' + JSON.stringify(index));
        //global.log('vagrant::machine::' + JSON.stringify(machine));

        if (!machine.vagrantfile_path) {
            global.log('[vagrant] path config missing');
        }
        else if (!GLib.file_test(machine.vagrantfile_path, GLib.FileTest.EXISTS)) {
            global.log('[vagrant] path does not exists ' + machine.vagrantfile_path);
        }
        else if (!GLib.file_test(machine.vagrantfile_path, GLib.FileTest.IS_DIR)) {
            global.log('[vagrant] path is not directory');
        }

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
    }

    /**
     * Open terminal and execute vagrant command.
     *
     * @param  {String} id     machine id
     * @param  {String} cmd    vagrant command (up|halt...)
     * @param  {Number} action (optional) PostTerminalAction
     * @return {Void}
     */
    _exec(id, cmd, action) {
        this._validate(id);

        let index = this.monitor.index,
            cwd = index.machines[id].vagrantfile_path,
            name = 'name' in index.machines[id] ? index.machines[id].name : '',
            exe = '';

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
    }

    /**
     * Monitor property getter.
     *
     * @return {Vagrant.Monitor}
     */
    get monitor() {
        return this._monitor;
    }

    /**
     * Terminal property getter:
     * terminal emulator.
     *
     * @return {Terminal.Emulator}
     */
    get terminal() {
        return this._terminal;
    }

    /**
     * Command property getter:
     * vagrant command path.
     *
     * @return {String}
     */
    get command() {
        if (!this._command) {
            try {
                let [ok, output, error, status] = GLib.spawn_sync(null, ['which', VAGRANT_EXE], null, GLib.SpawnFlags.SEARCH_PATH, null);
                if (!status && output) {
                    if (output instanceof Uint8Array)
                        output = String.fromCharCode.apply(null, output);

                    this._command = output.toString().trim();
                }
            }
            catch(e) {
                // pass
            }
        }

        return this._command;
    }

    /**
     * Version property getter:
     * vagrant version.
     *
     * @return {String}
     */
    get version() {
        if (!this._version && this._command) {
            try {
                let [ok, output, error, status] = GLib.spawn_sync(null, [this.command, '--version'], null, GLib.SpawnFlags.SEARCH_PATH, null);
                if (!status && output) {
                    if (output instanceof Uint8Array)
                        output = String.fromCharCode.apply(null, output);

                    this._version = output.toString().trim();
                }
            }
            catch(e) {
                // pass
            }
        }

        return this._version;
    }

    /**
     * Execute system command.
     *
     * @param  {String} id  machine id
     * @param  {Number} cmd CommandSystem enum
     * @return {Void}
     */
    open(id, cmd) {
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
    }

    /**
     * Execute vagrant command.
     *
     * @param  {String} id     machine id
     * @param  {Number} cmd    CommandVagrant enum
     * @param  {Number} action (optional) PostTerminalAction enum
     * @return {Void}
     */
    execute(id, cmd, action) {
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
    }

    /**
     * Open terminal emulator and execute
     * `vagrant global-status {--prune}`.
     *
     * @param  {Boolean} prune (optional)
     * @return {Void}
     */
    globalStatus(prune) {
        let cwd = GLib.getenv('HOME'),
            exe = ''
                + this.command
                + ' global-status'
                + (prune ? ' --prune' : '');

        this.terminal.popup(cwd, exe);
    }

    /**
     * Execute vagrant `global-status {--prune}` in the background.
     *
     * @param  {Boolean}  prune    (optional)
     * @param  {Function} callback (optional)
     * @return {Void}
     */
    globalStatusAsync(prune, callback) {
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
            subprocess.communicate_utf8_async(null, null, this._handleGlobalStatus.bind(this, exe, callback));
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
    }

    /**
     * Async shell exec event handler.
     *
     * @param  {Gio.Subprocess} source
     * @param  {Gio.Task}       resource
     * @param  {String}         stdin
     * @param  {Function}       callback (optional)
     * @return {Void}
     */
    _handleGlobalStatus(source, resource, stdin, callback) {
        let status = source.get_exit_status(),
            [, stdout, stderr] = source.communicate_utf8_finish(resource);

        if (typeof callback === 'function')
            callback.call(this, {
                status: status,
                stdin: stdin,
                stdout: stdout,
                stderr: stderr,
            });
    }

    /* --- */
};

Signals.addSignalMethods(Emulator.prototype);
