/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const { St, Gio, GObject } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Menu = Me.imports.menu;
const Notification = Me.imports.notification;
const Enum = Me.imports.enum;
const Vagrant = Me.imports.vagrant;
const Monitor = Me.imports.monitor;
const Icons = Me.imports.icons;
const Translation = Me.imports.translation;
const _ = Translation.translate;

/**
 * Indicator.Base constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Base = GObject.registerClass(class Base extends PanelMenu.Button {

    /**
     * Constructor
     *
     * @return {void}
     */
    _init() {
        super._init(null, Me.metadata.name);

        this._notification = new Notification.Base();
        this._vagrant = new Vagrant.Emulator();
        this._monitor = new Monitor.Monitor(this.vagrant.monitor);

        if (this.monitor.getValue(null, "autoGlobalStatusPrune"))
            this.vagrant.globalStatusAsync(true);

        this.vagrant.connect('error', Lang.bind(this, this._handleVagrantError));
        this.monitor.connect('state', Lang.bind(this, this._handleMonitorState));
        this.monitor.connect('add', Lang.bind(this, this._handleMonitorAdd));
        this.monitor.connect('remove', Lang.bind(this, this._handleMonitorRemove));
        this.monitor.connect('change', Lang.bind(this, this._handleMonitorChange));
        this.monitor.start();

        this._render();

        Main.panel.addToStatusArea(Me.metadata.uuid, this);
    }

    /**
     * Destructor
     *
     * @return {void}
     */
    destroy() {
        if (this.monitor)
            this.monitor.destroy();
        if (this.vagrant)
            this.vagrant.destroy();
        if (this.notification)
            this.notification.destroy();

        this._monitor = null;
        this._vagrant = null;
        this._notification = null;

        super.destroy();
    }

    /**
     * Notification getter
     *
     * @return {Notification.Base}
     */
    get notification() {
        return this._notification;
    }

    /**
     * Vagrant getter
     *
     * @return {Vagrant.Emulator}
     */
    get vagrant() {
        return this._vagrant;
    }

    /**
     * Monitor getter
     *
     * @return {Monitor.Monitor}
     */
    get monitor() {
        return this._monitor;
    }

    /**
     * Render menu
     *
     * @return {void}
     */
    _render() {
        this.add_style_class_name('panel-status-button');
        this.add_style_class_name('gnome-vagrant-indicator');

        this.icon = new St.Icon({
            icon_name: Icons.DEFAULT,
            style_class: 'system-status-icon',
        });
        this.icon.set_gicon(Gio.icon_new_for_string(Me.path + '/assets/' + Icons.DEFAULT + ".svg"));
        this.add_actor(this.icon);

        this.machine = new Menu.Machine(this);
        this.machine.connect('error', this._handleMachineError.bind(this));
        this.machine.connect('system', this._handleMachineSystem.bind(this));
        this.machine.connect('vagrant', this._handleMachineVagrant.bind(this));
        this.menu.addMenuItem(this.machine);
        this.menu.addMenuItem(new Menu.PopupSeparatorMenuItem());

        this.preferences = new Menu.PopupMenuItem(_("Preferences"));
        this.preferences.connect('activate', this._handlePreferences.bind(this));
        this.menu.addMenuItem(this.preferences);

        this.refresh();
    }

    /**
     * Refresh machine menu
     *
     * @return {void}
     */
    refresh() {
        this.machine.clear();

        let machines = this.monitor.getMachineList();
        for (let i = 0; i < machines.length; i++) {
            let id = machines[i];
            let path = this.monitor.getMachineDetail(id, 'vagrantfile_path');
            let state = this.monitor.getMachineDetail(id, 'state');
            let title = this.monitor.getValue(id, 'label');
            let shorten = !this.monitor.getValue(id, 'machineFullPath');
            let displayVagrant = this._getDisplayVagrant(id);
            let displaySystem = this._getDisplaySystem(id);

            let item = this.machine.add(id, path, state);
            item.title = title;
            item.shorten = shorten;
            item.displayVagrant = displayVagrant;
            item.displaySystem = displaySystem;
        }
    }

    /**
     * Convert boolean display-vagrant values
     * to Menu.Path.displayVagrant value
     *
     * @param  {String} id
     * @return {Number}
     */
    _getDisplayVagrant(id) {
        let display = Enum.toObject(Menu.DisplayVagrant);
        let result = 0;

        for (let key in display) {
            let value = display[key];
            let prop = 'display-vagrant-' + key.toLowerCase().replace(/_/g, '-');
            let enabled = this.monitor.getValue(id, prop);

            result += enabled ? value : 0;
        }

        return result;
    }

    /**
     * Convert boolean display-system values
     * to Menu.Path.displaySystem value
     *
     * @param  {String} id
     * @return {Number}
     */
    _getDisplaySystem(id) {
        let display = Enum.toObject(Menu.DisplaySystem);
        let result = 0;

        for (let key in display) {
            let value = display[key];
            let prop = 'display-system-' + key.toLowerCase().replace(/_/g, '-');
            let enabled = this.monitor.getValue(id, prop);

            result += enabled ? value : 0;
        }

        return result;
    }

    /**
     * Monitor change event handler
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {void}
     */
    _handleMonitorChange(widget, event) {
        for (let id in event) {
            let props = event[id];
            let order = props.indexOf('order') === -1 ? 0 : 1;
            let label = props.indexOf('label') === -1 ? 0 : 1;
            let machineFullPath = props.indexOf('machineFullPath') === -1 ? 0 : 1;
            let displaySystem = props.filter(function(item) { return item.startsWith('displaySystem'); }).length;
            let displayVagrant = props.filter(function(item) { return item.startsWith('displayVagrant'); }).length;

            if (order)
                this.machine.setItemIndex(id, this.monitor.getMachineList().indexOf(id));
            if (label)
                this.machine.setTitle(id, this.monitor.getValue(id, 'label'));
            if (machineFullPath)
                this.machine.setShorten(id, !this.monitor.getValue(id, 'machineFullPath'));
            if (displayVagrant)
                this.machine.setDisplayVagrant(id, this._getDisplayVagrant(id));
            if (displaySystem)
                this.machine.setDisplaySystem(id, this._getDisplaySystem(id));
        }
    }

    /**
     * Monitor machine add event handler
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {void}
     */
    _handleMonitorAdd(widget, event) {
        let id = event.id;
        let path = event.path;
        let state = event.state;
        let title = this.monitor.getValue(id, 'label');
        let shorten = !this.monitor.getValue(id, 'machineFullPath');
        let displayVagrant = this._getDisplayVagrant(id);
        let displaySystem = this._getDisplaySystem(id);
        let index = Object.keys(this.monitor.getMachineList()).indexOf(id);

        let item = this.machine.add(id, path, state, index);
        item.title = title;
        item.shorten = shorten;
        item.displayVagrant = displayVagrant;
        item.displaySystem = displaySystem;
    }

    /**
     * Monitor machine remove event handler
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {void}
     */
    _handleMonitorRemove(widget, event) {
        let id = event.id;
        let path = event.path;

        this.machine.remove(id);

        let notify = this.monitor.getValue(id, 'notifications');
        if (notify)
            this.notification.show('Machine destroyed', path);
    }

    /**
     * Monitor machine state change event handler
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {void}
     */
    _handleMonitorState(widget, event) {
        let id = event.id;
        let state = event.state;
        let path = event.path;

        this.machine.setState(id, state);

        let notify = this.monitor.getValue(id, 'notifications');
        if (notify)
            this.notification.show('Machine went %s'.format(state), path);
    }

    /**
     * Default error event handler
     *
     * @param  {String} error
     * @return {void}
     */
    _notifyError(error) {
        let notify = this.monitor.getValue(null, 'notifications');
        if (!notify)
            return;

        let arr = error.toString().split(':');
        let title = arr[0].trim();
        let message = arr.slice(1).join(':').trim();

        if (!message) {
            message = title;
            title = 'Vagrant.Unknown';
        }

        this.notification.show(title, message);
    }

    /**
     * Monitor error event handler
     *
     * @param  {Vagrant.Emulator} widget
     * @param  {Object}           event
     * @return {Void}
     */
    _handleVagrantError(widget, event) {
        this._notifyError(event.error);
    }

    /**
     * Machine error event handler
     *
     * @param  {Menu.Machine} widget
     * @param  {Object}       event
     * @return {Void}
     */
    _handleMachineError(widget, event) {
        this._notifyError(event.error);
    }

    /**
     * Machines item (system command)
     * activate event handler
     *
     * @param  {Menu.Machine} widget
     * @param  {Object}       event
     * @return {void}
     */
    _handleMachineSystem(widget, event) {
        try {
            let id = event.id;
            let command = event.command;

            this.vagrant.open(id, command);
        }
        catch(e) {
            this.vagrant.emit('error', {
                id: event.id,
                error: e,
            });
        }
    }

    /**
     * Machines item (vagrant command)
     * activate event handler
     *
     * @param  {Menu.Machine} widget
     * @param  {Object}       event
     * @return {void}
     */
    _handleMachineVagrant(widget, event) {
        try {
            let id = event.id;
            let command = event.command;
            let action = this.monitor.getValue(id, 'postTerminalAction');
            action = Enum.getValue(Vagrant.PostTerminalAction, action);

            this.vagrant.execute(id, command, action);
        }
        catch(e) {
            this.vagrant.emit('error', {
                id: event.id,
                error: e,
            });
        }
    }

    /**
     * Preferences activate event handler
     *
     * @param  {PopupMenuItem} widget
     * @param  {Clutter.Event} event
     * @return {void}
     */
    _handlePreferences(widget, event) {
        Util.spawn(['gnome-shell-extension-prefs', Me.metadata.uuid]);
    }

    /* --- */

});
