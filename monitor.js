/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Vagrant = Me.imports.vagrant;
const Settings = Me.imports.settings;

const PROPERTIES = [
    'label',
    'notifications',
    'machineFullPath',
    'postTerminalAction',
    'displaySystemNone',
    'displaySystemTerminal',
    'displaySystemFileManager',
    'displaySystemVagrantfile',
    //'displaySystemMachineConfig',
    'displayVagrantNone',
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
    'displayVagrantDestroyForce',
];

/**
 * Monitor.Schema constructor
 *
 * @param  {Object}
 * @return {Object}
 */
var Schema = new Lang.Class({

    Name: 'Monitor.Schema',

    /**
     * Gio.Settings value getter for
     * each setting type
     *
     * @type {Object}
     */
    _getMethod: {
        b: 'get_boolean',
        i: 'get_int',
        s: 'get_string',
    },

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this._settings = Settings.settings();
        this._signal = null;
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.stop();
        this._settings.run_dispose();
    },

    /**
     * Start monitoring
     *
     * @return {Void}
     */
    start: function() {
        if (this._signal)
            return;

        this._signal = this._settings.connect('changed', Lang.bind(this, this._handleChange));
    },

    /**
     * Stop monitoring
     *
     * @return {Void}
     */
    stop: function() {
        if (!this._signal)
            return;

        this._settings.disconnect(this._signal);
        this._signal = null;
    },

    /**
     * Get value by key
     *
     * @param  {String} key
     * @return {Mixed}
     */
    getValue: function(key) {
        // PROPERTIES is list of camel-case properties
        key = key.replace(/\-([a-z])/g, function(match, group) {
            return group.toUpperCase();
        });

        // validate
        if (PROPERTIES.indexOf(key) === -1)
            return null;
        if (key === 'label')
            return null;

        // Gio.Settings use kebab-case properties
        key = key.replace(/[A-Z]/g, function(match) {
            return '-' + match.toLowerCase();
        });

        // get and set
        let value = this._settings.get_value(key);
        let type = value.get_type_string();
        let method = this._getMethod[type];
        let result = this._settings[method](key);

        return result;
    },

    /**
     * Gio.Settings changed event handler
     *
     * @param  {Object} widget
     * @param  {String} key
     * @return {Void}
     */
    _handleChange: function(widget, key) {
        this.emit('change', {
            id: key,
        });
    },

    /* --- */

});

Signals.addSignalMethods(Schema.prototype);

/**
 * Monitor.Config constructor
 *
 * @param  {Object}
 * @return {Object}
 */
var Config = new Lang.Class({

    Name: 'Monitor.Config',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this._file = Gio.File.new_for_path(this.path);
        this._monitor = null;
        this._interval = null;
        this._config = this._read() || {};
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.stop();

        this._config = null;
        this._interval = null;
        this._monitor = null;
        this._file = null;
    },

    /**
     * Path getter
     *
     * @return {String}
     */
    get path() {
        return GLib.get_home_dir() + '/.' + Me.metadata.uuid;
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
     * Start monitoring
     *
     * @return {Void}
     */
    start: function() {
        if (this._monitor)
            return;

        this._monitor = this._file.monitor(Gio.FileMonitorFlags.NONE, null);
        this._monitor.connect('changed', Lang.bind(this, this._handleChange));
    },

    /**
     * Stop monitoring
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
     * Get machine value by key
     *
     * @param  {String} machine
     * @param  {String} key
     * @return {Mixed}
     */
    getValue: function(machine, key) {
        if (key)
            key = key.replace(/\-([a-z])/g, function(match, group) {
                return group.toUpperCase();
            });

        if (!machine)
            return this._config;
        else if (typeof key === 'undefined')
            return this._config[machine] || null;
        else if (machine in this._config && (key in this._config[machine]))
            return this._config[machine][key];

        return null;
    },

    /**
     * Compare two objects
     *
     * @param  {Object}  src
     * @param  {Object}  dst
     * @return {Boolean}
     */
    _compare: function(src, dst) {
        return JSON.stringify(src, Object.keys(src).sort()) === JSON.stringify(dst, Object.keys(dst).sort());
    },

    /**
     * Read json file
     *
     * @return {Object}
     */
    _read: function() {
        let result = null;

        try {
            let [ ok, contents ] = GLib.file_get_contents(this._file.get_path());
            if (!ok)
                throw '';

            result = JSON.parse(contents);
            if (!result || typeof result !== 'object' || result === null || result instanceof Array)
                throw '';

            // @todo
            //      - validate machine
            //      - validate properties
        }
        catch(e) {
            result = null;
        }

        return result;
    },

    /**
     * Parse content of file, store it to
     * this._config and return list of
     * changed machines
     *
     * @return {Mixed}
     */
    _parse: function() {
        let json = this._read();
        if (!json)
            return null;

        // store
        let config = Object.assign({}, this._config);
        this._config = json;

        // check if machine is missing
        let result = null;
        for (let machine in config) {
            if (!(machine in this._config))
                result = (result || []).concat([machine]);
        }

        // check if machine is added
        for (let machine in this._config) {
            if (!(machine in config))
                result = (result || []).concat([machine]);
        }

        // check if config changed
        for (let machine in this._config) {
            if (machine in config && !this._compare(this._config[machine], config[machine]))
                result = (result || []).concat([machine]);
        }

        // return changes
        return result;
    },

    /**
     * File monitor change event handler
     *
     * @param  {Object} monitor
     * @param  {Object} file
     * @return {Void}
     */
    _handleChange: function(monitor, file) {
        Mainloop.source_remove(this._interval);
        this._interval = Mainloop.timeout_add(this.delay, Lang.bind(this, this._handleChangeDelayed), null);
    },

    /**
     * File monitor change event handler
     * (delayed)
     *
     * @return {Void}
     */
    _handleChangeDelayed: function() {
        this._interval = null;

        let changes = this._parse();
        if (changes)
            this.emit('change', {
                id: changes,
            });

        // stop repeating
        return false;
    },

    /* --- */

});

Signals.addSignalMethods(Config.prototype);

/**
 * Monitor.Monitor constructor
 *
 * @param  {Object}
 * @return {Object}
 */
var Monitor = new Lang.Class({

    Name: 'Monitor.Monitor',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        // @todo
        //      - this._machines can be replaced with this._vagrant.index
        //
        this._machines = null;
        this._data = null;

        this._vagrant = new Vagrant.Monitor();
        this._vagrant.connect('state', Lang.bind(this, this._handleVagrantState));
        this._vagrant.connect('add', Lang.bind(this, this._handleVagrantAdd));
        this._vagrant.connect('remove', Lang.bind(this, this._handleVagrantRemove));

        this._config = new Config();
        this._config.connect('change', Lang.bind(this, this._handleConfigChange));

        this._schema = new Schema();
        this._schema.connect('change', Lang.bind(this, this._handleSchemaChange));
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        if (this._schema)
            this._schema.destroy();
        if (this._config)
            this._config.destroy();
        if (this._vagrant)
            this._vagrant.destroy();

        this._schema = null;
        this._config = null;
        this._vagrant = null;
        this._data = null;
        this._machines = null;
    },

    /**
     * Start monitoring
     *
     * @return {Void}
     */
    start: function() {
        let index = new Vagrant.Index();
        let parse = index.parse();
        this._machines = Object.keys(parse.machines);
        this._update();

        this._vagrant.start();
        this._config.start();
        this._schema.start();
    },

    /**
     * Stop monitoring
     *
     * @return {Void}
     */
    stop: function() {
        this._vagrant.stop();
        this._config.stop();
        this._schema.stop();

        this._machines = null;
        this._update();
    },

    /**
     * Get machine list
     *
     * @return {Object}
     */
    getMachineList: function() {
        return this._machines;
    },

    /**
     * Get machine detail (from vagrant
     * index file)
     *
     * @param  {String} machine
     * @param  {String} key     (optional)
     * @return {Mixed}
     */
    getMachineDetail: function(machine, key) {
        let index = this._vagrant.index;
        if (index && index.machines && (machine in index.machines) && (typeof key === 'undefined'))
            return index.machines[machine];
        else if (index && index.machines && (machine in index.machines) && (key in index.machines[machine]))
            return index.machines[machine][key];

        return null;
    },

    /**
     * Get value by key (from Schema object)
     *
     * @param  {String} key
     * @return {Mixed}
     */
    getSchemaValue: function(key) {
        return this._schema.getValue(key);
    },

    /**
     * Get machine value by key (for
     * Config object)
     *
     * @param  {String} machine
     * @param  {String} key
     * @return {Mixed}
     */
    getConfigValue: function(machine, key) {
        return this._config.getValue(machine, key);
    },

    /**
     * Get machine value by key (get config
     * value and use schema value as
     * fallback)
     *
     * @param  {String} machine
     * @param  {String} key
     * @return {Mixed}
     */
    getValue: function(machine, key) {
        let result = null;
        if (result === null)
            result = this.getConfigValue(machine, key);
        if (result === null)
            result = this.getSchemaValue(key);

        return result;
    },

    /**
     * Update data
     *
     * @return {Void}
     */
    _update: function() {
        this._data = {};
        if (!this._machines)
            return;

        for (let i = 0; i < this._machines.length; i++) {
            this._updateMachine(this._machines[i]);
        }
    },

    /**
     * Update data for specific machine
     *
     * @param  {String} machine
     * @return {Void}
     */
    _updateMachine: function(machine) {
        if (!this._machines)
            return;

        let index = this._machines.indexOf(machine);
        if (index !== -1) {
            this._data[machine] = {};

            for (let i = 0; i < PROPERTIES.length; i++) {
                this._updateMachineKey(machine, PROPERTIES[i]);
            }
        }
        else if (index === -1 && machine in this._data)
            delete this._data[machine];
    },

    /**
     * Update data for specific machine
     * by key
     *
     * @param  {String} machine
     * @param  {String} key
     * @return {Void}
     */
    _updateMachineKey: function(machine, key) {
        if (!this._machines)
            return;

        let index = this._machines.indexOf(machine);
        if (index === -1)
            return;

        key = key.replace(/\-([a-z])/g, function(match, group) {
            return group.toUpperCase();
        });

        index = PROPERTIES.indexOf(key);
        if (index === -1)
            return;

        this._data[machine][key] = this.getValue(machine, key);
    },

    /**
     * Vagrant state event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Object}
     */
    _handleVagrantState: function(widget, event) {
        this.emit('state', event);
    },

    /**
     * Vagrant add event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Object}
     */
    _handleVagrantAdd: function(widget, event) {
        this._machines.push(event.id);
        this._updateMachine(event.id);

        this.emit('add', event);
    },

    /**
     * Vagrant remove event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Object}
     */
    _handleVagrantRemove: function(widget, event) {
        let index = this._machines.indexOf(event.id);
        if (index !== -1)
            this._machines.splice(index, 1);
        this._updateMachine(event.id);

        this.emit('remove', event);
    },

    /**
     * Config change event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Object}
     */
    _handleConfigChange: function(widget, event) {
        // get and update this._data
        let data = JSON.parse(JSON.stringify(this._data));
        for (let i = 0; i < event.id.length; i++) {
            let machine = event.id[i];
            this._updateMachine(machine);
        }

        // compare and prepare emit object
        let emit = {};
        for (let i = 0; i < event.id.length; i++) {
            let machine = event.id[i];
            emit[machine] = [];

            if (!(machine in data))
                emit[machine] = Object.keys(this._data[machine]);
            else if (!(machine in this._data))
                emit[machine] = Object.keys(data[machine]);
            else
                for (let key in this._data[machine]) {
                    if (this._data[machine][key] !== data[machine][key])
                        emit[machine].push(key);
                }

            if (!emit[machine].length)
                delete emit[machine];
        }

        // is there anything to emit?
        if (Object.keys(emit).length)
            this.emit('change', emit);
    },

    /**
     * Schema change event handler
     *
     * @param  {Object} widget
     * @param  {String} event
     * @return {Void}
     */
    _handleSchemaChange: function(widget, event) {
        // get and update this._data
        let key = event.id;
        key = key.replace(/\-([a-z])/g, function(match, group) {
            return group.toUpperCase();
        });

        let data = JSON.parse(JSON.stringify(this._data));
        for (let i = 0; i < this._machines.length; i++) {
            let machine = this._machines[i];
            this._updateMachineKey(machine, key);
        }

        // compare and prepare emit object
        let emit = {};
        for (let i = 0; i < this._machines.length; i++) {
            let machine = this._machines[i];
            emit[machine] = [];

            if (this._data[machine][key] !== data[machine][key])
                emit[machine].push(key);

            if (!emit[machine].length)
                delete emit[machine];
        }

        // is there anything to emit?
        if (Object.keys(emit).length)
            this.emit('change', emit);
    },

    /* --- */

});

Signals.addSignalMethods(Monitor.prototype);
