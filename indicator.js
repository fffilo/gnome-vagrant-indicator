/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Menu = Me.imports.menu;
const Notification = Me.imports.notification;
const Enum = Me.imports.enum;
const Vagrant = Me.imports.vagrant;
const Icons = Me.imports.icons;
const Settings = Me.imports.settings;
const Translation = Me.imports.translation;
const _ = Translation.translate;

/**
 * Indicator.Base constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Base = new Lang.Class({

    Name: 'Indicator.Base',
    Extends: PanelMenu.Button,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.parent(null, Me.metadata.name);

        this._def();
        this._ui();
        this.refresh();

        Main.panel.addToStatusArea(Me.metadata.uuid, this);
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        if (this.vagrant)
            this.vagrant.destroy();
        if (this.settings)
            this.settings.run_dispose();

        this.parent();
    },

    /**
     * Initialize object properties
     *
     * @return {Void}
     */
    _def: function() {
        this.notification = new Notification.Base();

        this.settings = Settings.settings();
        this.settings.connect('changed', Lang.bind(this, this._handleSettings));

        this.vagrant = new Vagrant.Emulator();
        this.vagrant.connect('error', Lang.bind(this, this._handleVagrantError));
        this.vagrant.monitor.connect('add', Lang.bind(this, this._handleVagrantAdd));
        this.vagrant.monitor.connect('remove', Lang.bind(this, this._handleVagrantRemove));
        this.vagrant.monitor.connect('state', Lang.bind(this, this._handleVagrantState));
        this.vagrant.monitor.start();
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this.actor.add_style_class_name('panel-status-button');
        this.actor.add_style_class_name('gnome-vagrant-indicator');

        this.icon = new St.Icon({
            icon_name: Icons.DEFAULT,
            style_class: 'system-status-icon',
        });
        this.actor.add_actor(this.icon);

        this.machine = new Menu.Machine(this);
        this.machine.shorten = !this.settings.get_boolean('machine-full-path');
        this.machine.setDisplayVagrant(this._getSettingsMachineMenuDisplayVagrant());
        this.machine.setDisplaySystem(this._getSettingsMachineMenuDisplaySystem());
        this.machine.connect('system', Lang.bind(this, this._handleMachineSystem));
        this.machine.connect('vagrant', Lang.bind(this, this._handleMachineVagrant));
        this.menu.addMenuItem(this.machine);
        this.menu.addMenuItem(new Menu.Separator());

        this.preferences = new Menu.Item(_("Preferences"));
        this.preferences.connect('activate', Lang.bind(this, this._handlePreferences));
        this.menu.addMenuItem(this.preferences);
    },

    /**
     * Refresh machine menu
     *
     * @return {Void}
     */
    refresh: function() {
        this.machine.clear();

        for (let id in this.vagrant.index.machines) {
            let machine = this.vagrant.index.machines[id];
            this.machine.add(id, machine.vagrantfile_path, machine.state);
        }
    },

    /**
     * Convert settings boolean display-vagrant
     * values to Menu.DisplayVagrant value
     *
     * @return {Number}
     */
    _getSettingsMachineMenuDisplayVagrant: function() {
        let display = Enum.toObject(Menu.DisplayVagrant);
        let result = 0;

        for (let key in display) {
            let value = display[key];
            let setting = 'display-vagrant-' + key.toLowerCase().replace(/_/g, '-');

            result += this.settings.get_boolean(setting) ? display[key] : 0;
        }

        return result;
    },

    /**
     * Convert settings boolean display-system
     * values to Menu.DisplaySystem value
     *
     * @return {Number}
     */
    _getSettingsMachineMenuDisplaySystem: function() {
        let display = Enum.toObject(Menu.DisplaySystem);
        let result = 0;

        for (let key in display) {
            let value = display[key];
            let setting = 'display-system-' + key.toLowerCase().replace(/_/g, '-');

            result += this.settings.get_boolean(setting) ? display[key] : 0;
        }

        return result;
    },

    /**
     * Settings changed event handler
     *
     * @param  {Object} widget
     * @param  {String} key
     * @return {Void}
     */
    _handleSettings: function(widget, key) {
        if (key === 'machine-full-path')
            this.machine.shorten = !widget.get_boolean(key);
        else if (key.startsWith('display-system-'))
            this.machine.setDisplaySystem(this._getSettingsMachineMenuDisplaySystem());
        else if (key.startsWith('display-vagrant-'))
            this.machine.setDisplayVagrant(this._getSettingsMachineMenuDisplayVagrant());
    },

    /**
     * Monitor machine add event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleVagrantAdd: function(widget, event) {
        let machine = this.vagrant.index.machines[event.id];
        let index = Object.keys(this.vagrant.index.machines).indexOf(event.id);

        this.machine.add(event.id, machine.vagrantfile_path, machine.state, index);
    },

    /**
     * Monitor machine remove event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleVagrantRemove: function(widget, event) {
        this.machine.remove(event.id);
    },

    /**
     * Monitor machine state change event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleVagrantState: function(widget, event) {
        let machine = this.vagrant.index.machines[event.id];
        this.machine.state(event.id, machine.state);

        let notify = this.machine.getConfig(event.id, 'settings.notifications');
        if (typeof notify === 'undefined')
            notify = this.settings.get_boolean('notifications');
        if (notify)
            this.notification.show('Machine went %s'.format(machine.state), machine.vagrantfile_path);
    },

    /**
     * Monitor error event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleVagrantError: function(widget, event) {
        if (!this.settings.get_boolean('notifications'))
            return;

        let arr = event.toString().split(':');
        let title = arr[0].trim();
        let message = arr.slice(1).join(':').trim();

        if (!message) {
            message = title;
            title = 'Vagrant.Unknown';
        }

        this.notification.show(title, message);
    },

    /**
     * Machines item (system command)
     * activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleMachineSystem: function(widget, event) {
        try {
            this.vagrant.open(event.id, event.command);
        }
        catch(e) {
            this.vagrant.emit('error', e);
        }
    },

    /**
     * Machines item (vagrant command)
     * activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleMachineVagrant: function(widget, event) {
        try {
            let action = this.settings.get_string('post-terminal-action');
            action = Enum.getValue(Vagrant.PostTerminalAction, action);

            this.vagrant.execute(event.id, event.command, action);
        }
        catch(e) {
            this.vagrant.emit('error', e);
        }
    },

    /**
     * Preferences activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handlePreferences: function(widget, event) {
        Util.spawn(['gnome-shell-extension-prefs', Me.metadata.uuid]);
    },

    /* --- */

});
