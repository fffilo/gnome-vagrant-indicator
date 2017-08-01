/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Signals = imports.signals;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Icons = Me.imports.icons;
const Vagrant = Me.imports.vagrant;
const Helper = Me.imports.helper;
const _ = Helper.translate;

/**
 * Ui.Indicator constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Indicator = new Lang.Class({

    Name: 'Ui.Indicator',
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
        this.notification = new Notification();

        this.settings = Convenience.getSettings();
        this.settings.connect('changed', Lang.bind(this, this._handle_settings));

        this.monitor = new Vagrant.Monitor();
        this.monitor.connect('add', Lang.bind(this, this._handle_monitor_add));
        this.monitor.connect('remove', Lang.bind(this, this._handle_monitor_remove));
        this.monitor.connect('state', Lang.bind(this, this._handle_monitor_state));
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

        this.machine = new MachineMenu(this);
        this.machine.connect('click', Lang.bind(this, this._handle_machines));

        this.preferences = new PopupMenu.PopupMenuItem(_("Preferences"));
        this.preferences.connect('activate', Lang.bind(this, this._handle_preferences));
        this.menu.addMenuItem(this.preferences);
    },

    refresh: function() {
        this.machine.clear();

        let fullpath = this.settings.get_boolean('machine-full-path');

        for (let id in this.monitor.machine) {
            let machine = this.monitor.machine[id];
            let path = machine.vagrantfile_path;
            if (!fullpath)
                path = GLib.basename(path);

            this.machine.add(id, path, machine.state);
        }
    },

    /**
     * Settings changed event handler
     *
     * @param  {Object} widget
     * @param  {String} key
     * @return {Void}
     */
    _handle_settings: function(widget, key) {
        if (key === 'machine-full-path')
            this.refresh();
        else if (key === 'terminal-config')
            this.monitor.terminalConfig = parseInt(widget.get_string(key));
        else if (key.substr(0, 5) === 'menu-') {
            this.refresh();
        }
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
        let path = machine.vagrantfile_path;
        if (!this.settings.get_boolean('machine-full-path'))
            path = GLib.basename(path);

        this.machine.add(event.id, path, machine.state, index);
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
     * Machines item activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_machines: function(widget, event) {
        this.monitor[event.method](event.id);
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

/**
 * Ui.MachineMenu constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const MachineMenu = new Lang.Class({

    Name: 'Ui.MachineMenu',
    Extends: PopupMenu.PopupMenuSection,

    /**
     * Constructor
     *
     * @param  {Object} indicator
     * @return {Void}
     */
    _init: function(indicator) {
        this.parent();

        this.indicator = indicator;

        this._ui();
        this.clear();
    },

    /**
     * Empty list
     *
     * @return {Void}
     */
    clear: function() {
        this.removeAll();

        this.empty = new PopupMenu.PopupMenuItem(_("No Vagrant machines found"));
        this.empty.setSensitive(false);
        this.addMenuItem(this.empty);
    },

    /**
     * Add item to list
     *
     * @param  {String} id
     * @param  {String} path
     * @param  {String} state
     * @param  {Number} index (optional)
     * @return {Void}
     */
    add: function(id, path, state, index) {
        if (this.empty)
            this.empty.destroy();
        this.empty = null;

        let item = new MachineMenuItem(id, path, state);
        item.display = MachineMenuDisplay.ALL;
        item.connect('click', Lang.bind(this, this._handle_menu_item));
        this.addMenuItem(item, index);
    },

    /**
     * Remove item from list
     *
     * @return {Void}
     */
    remove: function(id) {
        this._get_item(id).forEach(function(actor) {
            actor.destroy();
        });

        if (!this._get_item().length)
            this.clear();
    },

    /**
     * Set item title
     *
     * @param  {String} id
     * @param  {String} value
     * @return {Void}
     */
    title: function(id, value) {
        this._get_item(id).forEach(function(actor) {
            actor.label.text = value;
        });
    },

    /**
     * Set item state
     *
     * @param  {String} id
     * @param  {String} value
     * @return {Void}
     */
    state: function(id, value) {
        this._get_item(id).forEach(function(actor) {
            actor.actor.remove_style_class_name(actor.state);
            actor.actor.add_style_class_name(value);
            actor.state = value;
        });
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-machine');

        this.indicator.menu.addMenuItem(this);
        this.indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    },

    /**
     * Get submenu item from menu list
     *
     * @param  {String} id (optional)
     * @return {Object}
     */
    _get_item: function(id) {
        return this.box.get_children()
            .map(function(actor) {
                return actor._delegate;
            })
            .filter(function(actor) {
                return actor instanceof MachineMenuItem && (id ? actor.id === id : true);
            });
    },

    /**
     * Subitem activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_menu_item: function(widget, event) {
        this.emit('click', {
            id: event.id,
            method: event.method,
        });
    },

    /* --- */

});

Signals.addSignalMethods(MachineMenu.prototype);

/**
 * Ui.MachineMenuItem constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const MachineMenuItem = new Lang.Class({

    Name: 'Ui.MachineMenuItem',
    Extends: PopupMenu.PopupSubMenuMenuItem,

    /**
     * Constructor
     *
     * @param  {String} id
     * @param  {String} path
     * @param  {String} state
     * @return {Void}
     */
    _init: function(id, path, state) {
        this.parent('unknown');

        this.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-item');
        this.setOrnament(PopupMenu.Ornament.DOT);

        this._id = 'unknown';
        this._path = 'unknown';
        this._state = 'unknown';

        if (id) this.id = id;
        if (path) this.path = path;
        if (state) this.state = state;

        this._ui();
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this._ui_system();
        this._ui_vagrant();
    },

    /**
     * Create user interface for
     * system commands menu
     *
     * @return {Void}
     */
    _ui_system: function() {
        this.menuSystem = {};

        let item = new PopupMenu.PopupMenuItem(_("SYSTEM COMMANDS"));
        item.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-item-subitem');
        item.actor.add_style_class_name('title');
        item.setSensitive(false);
        this.menu.addMenuItem(item);
        this.menuSystem.title = item;

        let menu = [
            'terminal', _("Open in Terminal"),
            'nautilus', _("Open in Nautilus"),
            'vagrantfile', _("Edit Vagrantfile"),
        ];

        for (let i = 0; i < menu.length; i += 2) {
            let item = new PopupMenu.PopupMenuItem(menu[i + 1]);
            item.id = this.id;
            item.method = menu[i];
            item.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-item-subitem');
            item.actor.add_style_class_name(item.method);
            item.connect('activate', Lang.bind(this, this._handle_menu_item));

            this.menu.addMenuItem(item);
            this.menuSystem[menu[i]] = item;
        }
    },

    /**
     * Create user interface for
     * vagrant commands menu
     *
     * @return {Void}
     */
    _ui_vagrant: function() {
        this.menuVagrant = {};

        let item = new PopupMenu.PopupMenuItem(_("VAGRANT COMMANDS"));
        item.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-item-subitem');
        item.actor.add_style_class_name('title');
        item.setSensitive(false);
        this.menu.addMenuItem(item);
        this.menuVagrant.title = item;

        let menu = [
            'up', _("Up"),
            'provision', _("Provision"),
            'ssh', _("SSH"),
            'rdp', _("RDP"),
            'resume', _("Resume"),
            'suspend', _("Suspend"),
            'halt', _("Halt"),
            'destroy', _("Destroy"),
        ];

        for (let i = 0; i < menu.length; i += 2) {
            let item = new PopupMenu.PopupMenuItem(menu[i + 1]);
            item.id = this.id;
            item.method = menu[i];
            item.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-item-subitem');
            item.actor.add_style_class_name(item.method);
            item.connect('activate', Lang.bind(this, this._handle_menu_item));

            this.menu.addMenuItem(item);
            this.menuVagrant[menu[i]] = item;
        }
    },

    /**
     * Property display getter
     *
     * @return {Number}
     */
    get display() {
        let result = 0;
        if (this.menuSystem.terminal.actor.visible) result += MachineMenuDisplay.TERMINAL;
        if (this.menuSystem.nautilus.actor.visible) result += MachineMenuDisplay.NAUTILUS;
        if (this.menuSystem.vagrantfile.actor.visible) result += MachineMenuDisplay.VAGRANTFILE;
        if (this.menuVagrant.up.actor.visible) result += MachineMenuDisplay.UP;
        if (this.menuVagrant.provision.actor.visible) result += MachineMenuDisplay.PROVISION;
        if (this.menuVagrant.ssh.actor.visible) result += MachineMenuDisplay.SSH;
        if (this.menuVagrant.rdp.actor.visible) result += MachineMenuDisplay.RDP;
        if (this.menuVagrant.resume.actor.visible) result += MachineMenuDisplay.RESUME;
        if (this.menuVagrant.suspend.actor.visible) result += MachineMenuDisplay.SUSPEND;
        if (this.menuVagrant.halt.actor.visible) result += MachineMenuDisplay.HALT;
        if (this.menuVagrant.destroy.actor.visible) result += MachineMenuDisplay.DESTROY;

        return result;
    },

    /**
     * Property display setter
     *
     * @param  {Number} value
     * @return {Void}
     */
    set display(value) {
        if (value < MachineMenuDisplay.NONE)
            value = MachineMenuDisplay.NONE;
        else if (value > MachineMenuDisplay.ALL)
            value = MachineMenuDisplay.ALL;

        this.menuSystem.terminal.actor.visible = !((value | MachineMenuDisplay.TERMINAL) > Math.max(value, MachineMenuDisplay.TERMINAL));
        this.menuSystem.nautilus.actor.visible = !((value | MachineMenuDisplay.NAUTILUS) > Math.max(value, MachineMenuDisplay.NAUTILUS));
        this.menuSystem.vagrantfile.actor.visible = !((value | MachineMenuDisplay.VAGRANTFILE) > Math.max(value, MachineMenuDisplay.VAGRANTFILE));
        this.menuVagrant.up.actor.visible = !((value | MachineMenuDisplay.UP) > Math.max(value, MachineMenuDisplay.UP));
        this.menuVagrant.provision.actor.visible = !((value | MachineMenuDisplay.PROVISION) > Math.max(value, MachineMenuDisplay.PROVISION));
        this.menuVagrant.ssh.actor.visible = !((value | MachineMenuDisplay.SSH) > Math.max(value, MachineMenuDisplay.SSH));
        this.menuVagrant.rdp.actor.visible = !((value | MachineMenuDisplay.RDP) > Math.max(value, MachineMenuDisplay.RDP));
        this.menuVagrant.resume.actor.visible = !((value | MachineMenuDisplay.RESUME) > Math.max(value, MachineMenuDisplay.RESUME));
        this.menuVagrant.suspend.actor.visible = !((value | MachineMenuDisplay.SUSPEND) > Math.max(value, MachineMenuDisplay.SUSPEND));
        this.menuVagrant.halt.actor.visible = !((value | MachineMenuDisplay.HALT) > Math.max(value, MachineMenuDisplay.HALT));
        this.menuVagrant.destroy.actor.visible = !((value | MachineMenuDisplay.DESTROY) > Math.max(value, MachineMenuDisplay.DESTROY));

        this.menuSystem.title.actor.visible = false
            || this.menuSystem.terminal.actor.visible
            || this.menuSystem.nautilus.actor.visible
            || this.menuSystem.vagrantfile.actor.visible;
        this.menuVagrant.title.actor.visible = false
            || this.menuVagrant.up.actor.visible
            || this.menuVagrant.provision.actor.visible
            || this.menuVagrant.ssh.actor.visible
            || this.menuVagrant.rdp.actor.visible
            || this.menuVagrant.resume.actor.visible
            || this.menuVagrant.suspend.actor.visible
            || this.menuVagrant.halt.actor.visible
            || this.menuVagrant.destroy.actor.visible;
    },

    /**
     * Property id getter
     *
     * @return {String}
     */
    get id() {
        return this._id;
    },

    /**
     * Property id setter
     *
     * @param  {String} value
     * @return {Void}
     */
    set id(value) {
        this._id = value;
    },

    /**
     * Property path getter
     *
     * @return {String}
     */
    get path() {
        return this._path;
    },

    /**
     * Property path setter
     *
     * @param  {String} value
     * @return {Void}
     */
    set path(value) {
        this._path = value;

        //this.label.text = this.path;
    },

    /**
     * Property state getter
     *
     * @return {String}
     */
    get state() {
        return this._state;
    },

    /**
     * Property state setter
     *
     * @param  {String} value
     * @return {Void}
     */
    set state(value) {
        this.actor.remove_style_class_name(this.state);
        this.actor.add_style_class_name(value);

        this._state = value;
    },

    /**
     * Menu item activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_menu_item: function(widget, event) {
        this.emit('click', {
            id: widget.id,
            method: widget.method,
        });
    },

    /* --- */

});

Signals.addSignalMethods(MachineMenuItem.prototype);

/**
 * MachineMenuDisplay enum
 *
 * @type {Object}
 */
const MachineMenuDisplay = Object.freeze({
    UNKNOWN: 0,
    NONE: 1,
    TERMINAL: 2,
    NAUTILUS: 4,
    VAGRANTFILE: 8,
    UP: 16,
    PROVISION: 32,
    SSH: 64,
    RDP: 128,
    RESUME: 256,
    SUSPEND: 512,
    HALT: 1024,
    DESTROY: 2048,
    ALL: 4095,
});

/**
 * Ui.Notification constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Notification = new Lang.Class({

    Name: 'Ui.Notification',

    /**
     * Constructor
     *
     * @param  {String} title
     * @param  {String} icon
     * @return {Void}
     */
    _init: function(title, icon) {
        this._title = title || Me.metadata.name;
        this._icon = icon || Icons.DEFAULT;

        this._source = null;
    },

    /**
     * Prepare source
     *
     * @return {Void}
     */
    _prepare: function() {
        if (this._source !== null)
            return;

        this._source = new MessageTray.Source(this._title, this._icon);
        this._source.connect('destroy', Lang.bind(this, this._handle_destroy));

        Main.messageTray.add(this._source);
    },

    /**
     * Get existing notification from
     * source or create new one
     *
     * @param  {String} title
     * @param  {String} message
     * @return {Object}
     */
    _notification: function(title, message) {
        let result = null;
        if (this._source.notifications.length) {
            result = this._source.notifications[0];
            result.update(title, message, {
                clear: true,
            });
        }
        else {
            result = new MessageTray.Notification(this._source, title, message);
            result.setTransient(true);
            result.setResident(false);
        }

        return result;
    },

    /**
     * Source destroy event handler:
     * clear source
     *
     * @return {Void}
     */
    _handle_destroy: function() {
        this._source = null;
    },

    /**
     * Show notification
     *
     * @param  {String} title
     * @param  {String} message
     * @return {Void}
     */
    show: function(title, message) {
        this._prepare();
        this._source.notify(this._notification(title, message));
    },

});
