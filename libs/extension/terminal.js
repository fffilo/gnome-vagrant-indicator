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
const {GLib, Gio} = imports.gi;

/**
 * List of yet not tested terminal emulators
 * (work in progress).
 *
 * @type {Array}
 */
const NOTESTED = [
    'wterm',
    'TermKit',
    'Final Term',
    'Tilix',
    'Termite',
    'kitty',
    'Pantheon Terminal',
    'cool-retro-team',
    'Alacritty',
    'hyper',
    'xiki',
    'conhost',
    'tym',
    'BlackScreen',
    'altyo',
];

/**
 * List of supported terminal emulators.
 *
 * @type {Array}
 */
const SUPPORTED = [
    'gnome-terminal',
    'mate-terminal',
    'xfce4-terminal',
    'terminator',
    'guake',
    'stterm',
    'terminology',
    'konsole',
    'termit',
    'xvt',
    'lxterminal',
    'mlterm',
    'roxterm',
    'rxvt',
    'lilyterm',
    'evilvte',
    'pterm',
    'aterm',
    'caterm',
    'gaterm',
    'katerm',
    'taterm',
    'mrxvt',
    'mrxvt-cjk',
    'mrxvt-mini',
    'mrxvt-full',
    'eterm',
    'kterm',
    'lxterm',
    'uxterm',
    'xterm',
    'vala-terminal',
];

/**
 * List of unsupported terminal emulators.
 *
 * @type {Array}
 */
const UNSUPPORTED = [
    'qterminal',
    'sakura',
    'Terminal',
    'tilda',
    'xiterm+thai',
];

/**
 * Terminal.Emulator.
 */
var Emulator = class Emulator {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    constructor() {
        // pass
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
     * Get output of shell command (sync) without throwing exception (instead
     * exception result is null).
     *
     * @param  {String} command command to execute
     * @return {String}         output string or null on fail
     */
    _shellOutput(command) {
        try {
            let [ ok, output, error, status ] = GLib.spawn_command_line_sync(command);
            if (!status) {
                if (output instanceof Uint8Array)
                    output = String.fromCharCode.apply(null, output);

                return output.toString().trim();
            }
        }
        catch(e) {
            // pass
        }

        return null;
    }

    /**
     * Open new terminal window.
     *
     * @param  {String} cwd      (optional) working directory
     * @param  {String} command  (optional) command to execute
     * @param  {String} terminal (optional) terminal emulator
     * @return {Void}
     */
    popup(cwd, command, terminal) {
        cwd = cwd || '~';
        command = command || ':';
        command = command.replace(/;+$/, '');
        terminal = this._shellOutput('which %s'.format(terminal)) || this.path;
        if (!terminal)
            throw 'Terminal.Emulator: Not supported.';

        // Command language interpreter.
        let shell = GLib.getenv('SHELL') || 'bash';
        shell = this._shellOutput('which %s'.format(shell)) || 'bash';

        // Specific terminal emulators guake.
        if (terminal.endsWith('guake')) {
            if (!this._shellOutput('pgrep -f guake.main'))
                throw 'Terminal.Emulator: Guake terminal not started.'

            GLib.spawn_sync(null, [ terminal, '--new-tab', cwd ], null, GLib.SpawnFlags.SEARCH_PATH, null);
            GLib.spawn_sync(null, [ terminal, '--rename-current-tab', 'vagrant' ], null, GLib.SpawnFlags.SEARCH_PATH, null);
            //GLib.spawn_sync(null, [ terminal, '--execute-command', shell ], null, GLib.SpawnFlags.SEARCH_PATH, null);
            GLib.spawn_sync(null, [ terminal, '--execute-command', command ], null, GLib.SpawnFlags.SEARCH_PATH, null);
            GLib.spawn_sync(null, [ terminal, '--show', ], null, GLib.SpawnFlags.SEARCH_PATH, null);
            // @todo - test if this works with empty command

            return;
        }

        // Quote current working directory.
        let qcwd = '"%s"'.format(cwd.replace(/\"/g, '\\\"'));

        // Terminal arguments.
        let argv = [
            terminal,
            '-e',
            shell,
            '-c',
            'cd %s; %s; %s'.format(qcwd, command, shell),
        ];

        // Argument -e (command) not working with some terminals, replacing
        // it with -x (execute).
        [ 'gnome-terminal', 'mate-terminal', 'xfce4-terminal', 'terminator' ].forEach(item => {
            if (argv[0].endsWith(item))
                argv[1] = '-x';
        });

        // More argument fixes.
        if (argv[0].endsWith('terminology')) {
            argv = [ terminal, '-d', cwd ];

            if (command !== ':') {
                argv.push('-e');
                argv.push(command);
            }
        };
        if (argv[0].endsWith('vala-terminal'))
            argv = [ terminal, '-e', 'cd %s; %s'.format(qcwd, command) ];

        // Popup window.
        let subprocess = new Gio.Subprocess({
            argv: argv,
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        subprocess.init(null);
    }

    /**
     * Property path getter (terminal emulator path).
     *
     * Find default terminal application from gsettings configuration tool.
     * Try to find any known installed emulators on fail.
     *
     * @return {Mixed} path (string) or null on fail
     */
    get path() {
        let result = this._shellOutput('gsettings get org.gnome.desktop.default-applications.terminal exec') || '';
        result = result.replace(/^'|'$/g, '');
        result = this._shellOutput('which %s'.format(result));

        // Alternatives x-terminal-emulator.
        if (result && result.endsWith('x-terminal-emulator'))
            result = this._shellOutput('readlink /etc/alternatives/x-terminal-emulator');

        // Akip unsupported terminal emulators.
        if (result)
            UNSUPPORTED.forEach(item => {
                if (result && result.endsWith(item))
                    result = null;
            });

        // Fallback - check if any common emulator installed.
        if (!result)
            SUPPORTED.forEach((item => {
                if (!result)
                    result = this._shellOutput('which %s'.format(item));
            }).bind(this));

        return result;
    }

    /* --- */
};
