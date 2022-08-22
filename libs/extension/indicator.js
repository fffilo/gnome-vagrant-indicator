/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const {GObject, St} = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Menu = Me.imports.lib.extension.menu;
const Notification = Me.imports.lib.extension.notification;
const Enum = Me.imports.lib.extension.enum;
const Vagrant = Me.imports.lib.extension.vagrant;
const Monitor = Me.imports.lib.extension.monitor;
const Icons = Me.imports.lib.extension.icons;
const Translation = Me.imports.lib.extension.translation;
const _ = Translation.translate;

/**
 * Indicator.Base.
 */
var Base = GObject.registerClass(class Base extends PanelMenu.Button {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init() {
        super._init(null, Me.metadata.name);

        this._notifier = new Notification.Notifier();
        this._vagrant = new Vagrant.Emulator();
        this._monitor = new Monitor.Monitor(this.vagrant.monitor);

        if (this.monitor.getValue(null, "autoGlobalStatusPrune"))
            this.vagrant.globalStatusAsync(true);

        this.notifier.icon = new Icons.Icon();
        this.vagrant.connect('error', this._handleVagrantError.bind(this));
        this.monitor.connect('state', this._handleMonitorState.bind(this));
        this.monitor.connect('add', this._handleMonitorAdd.bind(this));
        this.monitor.connect('remove', this._handleMonitorRemove.bind(this));
        this.monitor.connect('change', this._handleMonitorChange.bind(this));
        this.monitor.start();

        this._render();

        Main.panel.addToStatusArea(Me.metadata.uuid, this);
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        super.destroy();

        if (this.monitor)
            this.monitor.destroy();
        if (this.vagrant)
            this.vagrant.destroy();
        if (this.notifier)
            this.notifier.destroy();

        this._monitor = null;
        this._vagrant = null;
        this._notifier = null;
    }

    /**
     * Notifier property getter.
     *
     * @return {Notification.Notifier}
     */
    get notifier() {
        return this._notifier;
    }

    /**
     * Vagrant property getter.
     *
     * @return {Vagrant.Emulator}
     */
    get vagrant() {
        return this._vagrant;
    }

    /**
     * Monitor property getter.
     *
     * @return {Monitor.Monitor}
     */
    get monitor() {
        return this._monitor;
    }

    /**
     * Render menu.
     *
     * @return {Void}
     */
    _render() {
        this.add_style_class_name('panel-status-button');
        this.add_style_class_name('gnome-vagrant-indicator');

        this.icon = new St.Icon({
            icon_name: Icons.DEFAULT,
            gicon: new Icons.Icon(),
            style_class: 'system-status-icon',
        });
        this.add_actor(this.icon);

        this.machine = new Menu.Machine(this);
        this.machine.connect('error', this._handleMachineError.bind(this));
        this.machine.connect('system', this._handleMachineSystem.bind(this));
        this.machine.connect('vagrant', this._handleMachineVagrant.bind(this));
        this.menu.addMenuItem(this.machine);
        this.menu.addMenuItem(new Menu.Separator());

        this.preferences = new Menu.Item(_("Preferences"));
        this.preferences.connect('activate', this._handlePreferences.bind(this));
        this.menu.addMenuItem(this.preferences);

        this.refresh();
    }

    /**
     * Refresh machine menu.
     *
     * @return {Void}
     */
    refresh() {
        this.machine.clear();

        let machines = this.monitor.getMachineList();
        for (let i = 0; i < machines.length; i++) {
            let id = machines[i],
                path = this.monitor.getMachineDetail(id, 'vagrantfile_path'),
                name = this.monitor.getMachineDetail(id, 'name'),
                state = this.monitor.getMachineDetail(id, 'state'),
                title = this.monitor.getValue(id, 'label'),
                displayMachineFullPath = this.monitor.getValue(id, 'machineFullPath'),
                displayMachineName = this.monitor.getValue(id, 'machineName'),
                displayVagrant = this._getDisplayVagrant(id),
                displaySystem = this._getDisplaySystem(id),
                item = this.machine.add(id, path, name, state);

            item.title = title;
            item.displayMachineFullPath = displayMachineFullPath;
            item.displayMachineName = displayMachineName;
            item.displayVagrant = displayVagrant;
            item.displaySystem = displaySystem;
        }
    }

    /**
     * Convert boolean display-vagrant values to Menu.Path.displayVagrant
     * value.
     *
     * @param  {String} id
     * @return {Number}
     */
    _getDisplayVagrant(id) {
        let display = Enum.toObject(Menu.DisplayVagrant),
            result = 0;

        for (let key in display) {
            let value = display[key],
                prop = 'display-vagrant-' + key.toLowerCase().replace(/_/g, '-'),
                enabled = this.monitor.getValue(id, prop);

            result += enabled ? value : 0;
        }

        return result;
    }

    /**
     * Convert boolean display-system values to Menu.Path.displaySystem value.
     *
     * @param  {String} id
     * @return {Number}
     */
    _getDisplaySystem(id) {
        let display = Enum.toObject(Menu.DisplaySystem),
            result = 0;

        for (let key in display) {
            let value = display[key],
                prop = 'display-system-' + key.toLowerCase().replace(/_/g, '-'),
                enabled = this.monitor.getValue(id, prop);

            result += enabled ? value : 0;
        }

        return result;
    }

    /**
     * Monitor change event handler.
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {Void}
     */
    _handleMonitorChange(widget, event) {
        for (let id in event) {
            let props = event[id],
                order = props.indexOf('order') === -1 ? 0 : 1,
                label = props.indexOf('label') === -1 ? 0 : 1,
                machineFullPath = props.indexOf('machineFullPath') === -1 ? 0 : 1,
                machineName = props.indexOf('machineName') === -1 ? 0 : 1,
                displaySystem = props.filter(item => item.startsWith('displaySystem')).length,
                displayVagrant = props.filter(item => item.startsWith('displayVagrant')).length;

            if (order)
                this.machine.setItemIndex(id, this.monitor.getMachineList().indexOf(id));
            if (label)
                this.machine.setTitle(id, this.monitor.getValue(id, 'label'));
            if (machineFullPath)
                this.machine.setDisplayMachineFullPath(id, this.monitor.getValue(id, 'machineFullPath'));
            if (machineName)
                this.machine.setDisplayMachineName(id, this.monitor.getValue(id, 'machineName'));
            if (displayVagrant)
                this.machine.setDisplayVagrant(id, this._getDisplayVagrant(id));
            if (displaySystem)
                this.machine.setDisplaySystem(id, this._getDisplaySystem(id));
        }
    }

    /**
     * Monitor machine add event handler.
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {Void}
     */
    _handleMonitorAdd(widget, event) {
        let id = event.id,
            path = event.path,
            name = event.name,
            state = event.state,
            title = this.monitor.getValue(id, 'label'),
            displayMachineFullPath = this.monitor.getValue(id, 'machineFullPath'),
            displayMachineName = this.monitor.getValue(id, 'machineName'),
            displayVagrant = this._getDisplayVagrant(id),
            displaySystem = this._getDisplaySystem(id),
            index = Object.keys(this.monitor.getMachineList()).indexOf(id),
            item = this.machine.add(id, path, name, state, index);

        item.title = title;
        item.displayMachineFullPath = displayMachineFullPath;
        item.displayMachineName = displayMachineName;
        item.displayVagrant = displayVagrant;
        item.displaySystem = displaySystem;
    }

    /**
     * Monitor machine remove event handler.
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {Void}
     */
    _handleMonitorRemove(widget, event) {
        let id = event.id,
            label = this.machine.getCurrentLabel(id);
        this.machine.remove(id);

        let notify = this.monitor.getValue(id, 'notifications');
        if (!notify)
            return;

        let title = label,
            message = 'Machine destroyed';
        this.notifier.notify(title, message);
    }

    /**
     * Monitor machine state change event handler.
     *
     * @param  {Monitor.Monitor} widget
     * @param  {Object}          event
     * @return {Void}
     */
    _handleMonitorState(widget, event) {
        let id = event.id,
            state = event.state;
        this.machine.setState(id, state);

        let notify = this.monitor.getValue(id, 'notifications');
        if (!notify)
            return;

        let title = this.machine.getCurrentLabel(id),
            message = 'Machine went %s'.format(state);
        this.notifier.notify(title, message);
    }

    /**
     * Default error event handler.
     *
     * @param  {String} error
     * @return {Void}
     */
    _notifyError(error) {
        let notify = this.monitor.getValue(null, 'notifications');
        if (!notify)
            return;

        let arr = error.toString().split(':'),
            title = arr[0].trim(),
            message = arr.slice(1).join(':').trim();

        if (!message) {
            message = title;
            title = 'Vagrant.Unknown';
        }

        this.notifier.notify(title, message);
    }

    /**
     * Monitor error event handler.
     *
     * @param  {Vagrant.Emulator} widget
     * @param  {Object}           event
     * @return {Void}
     */
    _handleVagrantError(widget, event) {
        this._notifyError(event.error);
    }

    /**
     * Machine error event handler.
     *
     * @param  {Menu.Machine} widget
     * @param  {Object}       event
     * @return {Void}
     */
    _handleMachineError(widget, event) {
        this._notifyError(event.error);
    }

    /**
     * Machines item (system command) activate event handler.
     *
     * @param  {Menu.Machine} widget
     * @param  {Object}       event
     * @return {Void}
     */
    _handleMachineSystem(widget, event) {
        try {
            let id = event.id,
                command = event.command;

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
     * Machines item (vagrant command) activate event handler.
     *
     * @param  {Menu.Machine} widget
     * @param  {Object}       event
     * @return {Void}
     */
    _handleMachineVagrant(widget, event) {
        try {
            let id = event.id,
                command = event.command,
                action = this.monitor.getValue(id, 'postTerminalAction');
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
     * Preferences activate event handler.
     *
     * @param  {PopupMenuItem} widget
     * @param  {Clutter.Event} event
     * @return {Void}
     */
    _handlePreferences(widget, event) {
        if (typeof ExtensionUtils.openPrefs === 'function')
            ExtensionUtils.openPrefs();
        else
            Util.spawn(['gnome-shell-extension-prefs', Me.metadata.uuid]);
    }

    /* --- */
});
