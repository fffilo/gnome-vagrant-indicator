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
        if (this.monitor)
            this.monitor.unlisten();
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
        this.settings.connect('changed', Lang.bind(this, this._handle_settings));

        let action = this.settings.get_string('post-terminal-action');
        action = Vagrant.PostTerminalAction.from_string(action);

        this.monitor = new Vagrant.Monitor();
        this.monitor.postTerminalAction = action;
        this.monitor.emulator = this.settings.get_string('emulator');
        this.monitor.connect('add', Lang.bind(this, this._handle_monitor_add));
        this.monitor.connect('remove', Lang.bind(this, this._handle_monitor_remove));
        this.monitor.connect('state', Lang.bind(this, this._handle_monitor_state));
        this.monitor.connect('error', Lang.bind(this, this._handle_monitor_error));
        this.monitor.listen();
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
        this.machine.display = this._get_settings_machine_menu_display();
        this.machine.connect('execute', Lang.bind(this, this._handle_machines));
        this.menu.addMenuItem(this.machine);
        this.menu.addMenuItem(new Menu.Separator());

        this.preferences = new Menu.Item(_("Preferences"));
        this.preferences.connect('activate', Lang.bind(this, this._handle_preferences));
        this.menu.addMenuItem(this.preferences);
    },

    /**
     * Refresh machine menu
     *
     * @return {Void}
     */
    refresh: function() {
        this.machine.clear();

        for (let id in this.monitor.machine) {
            let machine = this.monitor.machine[id];
            this.machine.add(id, machine.vagrantfile_path, machine.state);
        }
    },

    /**
     * Convert settings boolean machine-menu-display
     * values to Menu.Display value
     *
     * @return {Number}
     */
    _get_settings_machine_menu_display: function() {
        return 0
            | (this.settings.get_boolean('system-terminal') ? Menu.Display.from_string('terminal') : 0)
            | (this.settings.get_boolean('system-file-manager') ? Menu.Display.from_string('file-manager') : 0)
            | (this.settings.get_boolean('system-vagrantfile') ? Menu.Display.from_string('vagrantfile') : 0)
            | (this.settings.get_boolean('vagrant-up') ? Menu.Display.from_string('up') : 0)
            | (this.settings.get_boolean('vagrant-up-provision') ? Menu.Display.from_string('up-provision') : 0)
            | (this.settings.get_boolean('vagrant-up-ssh') ? Menu.Display.from_string('up-ssh') : 0)
            | (this.settings.get_boolean('vagrant-up-rdp') ? Menu.Display.from_string('up-rdp') : 0)
            | (this.settings.get_boolean('vagrant-provision') ? Menu.Display.from_string('provision') : 0)
            | (this.settings.get_boolean('vagrant-ssh') ? Menu.Display.from_string('ssh') : 0)
            | (this.settings.get_boolean('vagrant-rdp') ? Menu.Display.from_string('rdp') : 0)
            | (this.settings.get_boolean('vagrant-resume') ? Menu.Display.from_string('resume') : 0)
            | (this.settings.get_boolean('vagrant-suspend') ? Menu.Display.from_string('suspend') : 0)
            | (this.settings.get_boolean('vagrant-halt') ? Menu.Display.from_string('halt') : 0)
            | (this.settings.get_boolean('vagrant-destroy') ? Menu.Display.from_string('destroy') : 0);
        },

    /**
     * Settings changed event handler
     *
     * @param  {Object} widget
     * @param  {String} key
     * @return {Void}
     */
    _handle_settings: function(widget, key) {
        if (key === 'post-terminal-action') {
            let action = this.settings.get_string('post-terminal-action');
            action = Vagrant.PostTerminalAction.from_string(action);
            this.monitor.postTerminalAction = action;
        }
        else if (key === 'emulator')
            this.monitor.emulator = this.settings.get_string('emulator');
        else if (key === 'machine-full-path')
            this.machine.shorten = !widget.get_boolean(key);
        else if (key.startsWith('system-'))
            this.machine.display = this._get_settings_machine_menu_display();
        else if (key.startsWith('vagrant-'))
            this.machine.display = this._get_settings_machine_menu_display();
    },

    /**
     * Monitor machine add event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_monitor_add: function(widget, event) {
        let machine = this.monitor.machine[event.id];
        let index = Object.keys(this.monitor.machine).indexOf(event.id);

        this.machine.add(event.id, machine.vagrantfile_path, machine.state, index);
    },

    /**
     * Monitor machine remove event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_monitor_remove: function(widget, event) {
        this.machine.remove(event.id);
    },

    /**
     * Monitor machine state change event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_monitor_state: function(widget, event) {
        let machine = this.monitor.machine[event.id];
        this.machine.state(event.id, machine.state);

        if (this.settings.get_boolean('notifications'))
            this.notification.show('Machine went %s'.format(machine.state), machine.vagrantfile_path);
    },

    /**
     * Monitor error event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_monitor_error: function(widget, event) {
        if (this.settings.get_boolean('notifications'))
            this.notification.show(event.title, event.message);
    },

    /**
     * Machines item activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_machines: function(widget, event) {
        let id = event.id;
        let method = event.method;

        if (event.method === 'default')
            method = 'terminal';

        this.monitor[method](id);
    },

    /**
     * Preferences activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_preferences: function(widget, event) {
        Util.spawn(['gnome-shell-extension-prefs', Me.metadata.uuid]);
    },

    /* --- */

});
