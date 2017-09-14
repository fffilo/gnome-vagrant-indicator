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
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// global properties
const BASH_PATH = '/bin/bash';
const ALTERNATIVE_NAME = 'x-terminal-emulator';
const ALTERNATIVE_PATH = '/etc/alternatives/%s'.format(ALTERNATIVE_NAME);

/**
 * Terminal.Emulator constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Emulator = new Lang.Class({

    Name: 'Terminal.Emulator',

    /**
     * Get output of shell command (sync)
     *
     * @param  {String} command command to execute
     * @return {Mixed}          output (string) or null on fail
     */
    _shell_output: function(command) {
        try {
            let argv = command.split(' ');
            let [ ok, output, error, status ] = GLib.spawn_sync(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (!status && output)
                return output.toString().trim();
        }
        catch(e) {
            // pass
        }

        return null;
    },

    /**
     * Open new terminal window
     *
     * @param  {String} cwd      (optional) working directory
     * @param  {String} command  (optional) command to execute
     * @param  {String} terminal (optional) terminal emulator (must exist in this.list)
     * @return {Void}
     */
    popup: function(cwd, command, terminal) {
        cwd = cwd || '~';
        command = command || ':';
        command = command.replace(/;+$/, '');
        terminal = terminal || this.current;

        if (this.list.indexOf(terminal) === -1)
            throw 'Terminal.Emulator: Invalid terminal emulator "%s"'.format(terminal);

        let exe = '';
        exe += 'cd %s; '.format(cwd);
        exe += '%s; '.format(command);
        exe += 'exec %s'.format(BASH_PATH);
        exe = exe.replace(/\"/g, '\\\"');

        let subprocess = new Gio.Subprocess({
            argv: [ terminal, '-e', '%s -c "%s"'.format(BASH_PATH, exe) ],
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        subprocess.init(null);
    },

    /**
     * Property list getter:
     * list of all terminal emulators installed
     *
     * @return {Object} list (array) or null on fail
     */
    get list() {
        let result = this._shell_output('update-alternatives --list %s'.format(ALTERNATIVE_NAME));
        return result === null ? null : result.split('\n');
    },

    /**
     * Property current getter:
     * default terminal emulator
     *
     * @return {Mixed} path (string) or null on fail
     */
    get current() {
        return this._shell_output('readlink %s'.format(ALTERNATIVE_PATH));
    },

    /* --- */

});
