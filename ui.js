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

        let action = this.settings.get_string('post-terminal-action');
        action = Vagrant.PostTerminalAction._from_string(action);

        this.monitor = new Vagrant.Monitor();
        this.monitor.postTerminalAction = action;
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
        this.machine.shorten = !this.settings.get_boolean('machine-full-path');
        this.machine.display = this._get_settings_machine_menu_display();
        this.machine.connect('execute', Lang.bind(this, this._handle_machines));
        this.menu.addMenuItem(this.machine);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.preferences = new PopupMenu.PopupMenuItem(_("Preferences"));
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
     * values to MachineMenuDisplay value
     *
     * @return {Number}
     */
    _get_settings_machine_menu_display: function() {
        return 0
            | (this.settings.get_boolean("system-terminal") ? MachineMenuDisplay._from_string('terminal') : 0)
            | (this.settings.get_boolean("system-nautilus") ? MachineMenuDisplay._from_string('nautilus') : 0)
            | (this.settings.get_boolean("system-vagrantfile") ? MachineMenuDisplay._from_string('vagrantfile') : 0)
            | (this.settings.get_boolean("vagrant-up") ? MachineMenuDisplay._from_string('up') : 0)
            | (this.settings.get_boolean("vagrant-up-provision") ? MachineMenuDisplay._from_string('up-provision') : 0)
            | (this.settings.get_boolean("vagrant-up-ssh") ? MachineMenuDisplay._from_string('up-ssh') : 0)
            | (this.settings.get_boolean("vagrant-up-rdp") ? MachineMenuDisplay._from_string('up-rdp') : 0)
            | (this.settings.get_boolean("vagrant-provision") ? MachineMenuDisplay._from_string('provision') : 0)
            | (this.settings.get_boolean("vagrant-ssh") ? MachineMenuDisplay._from_string('ssh') : 0)
            | (this.settings.get_boolean("vagrant-rdp") ? MachineMenuDisplay._from_string('rdp') : 0)
            | (this.settings.get_boolean("vagrant-resume") ? MachineMenuDisplay._from_string('resume') : 0)
            | (this.settings.get_boolean("vagrant-suspend") ? MachineMenuDisplay._from_string('suspend') : 0)
            | (this.settings.get_boolean("vagrant-halt") ? MachineMenuDisplay._from_string('halt') : 0)
            | (this.settings.get_boolean("vagrant-destroy") ? MachineMenuDisplay._from_string('destroy') : 0);
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
            action = Vagrant.PostTerminalAction._from_string(action);
            this.monitor.postTerminalAction = action;
        }
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
     * @return {Void}
     */
    _init: function() {
        this.parent();

        this.actor.add_style_class_name('gnome-vagrant-indicator-machine');

        this._shorten = false;
        this._display = MachineMenuDisplay.ALL;

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
     * Display error
     *
     * @return {Void}
     */
    error: function() {
        this.removeAll();

        this.empty = new PopupMenu.PopupMenuItem(_("Vagrant not installed on your system"));
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

        let item = new MachineMenuInstance(id, path, state);
        item.shorten = this.shorten;
        item.display = this.display;
        item.connect('execute', Lang.bind(this, this._handle_menu_item));
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
     * Property shorten getter
     *
     * @return {Boolean}
     */
    get shorten() {
        return this._shorten;
    },

    /**
     * Property shorten setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set shorten(value) {
        this._shorten = !!value;

        this._get_item().forEach(function(actor) {
            actor.shorten = value;
        });
    },

    /**
     * Property display getter
     *
     * @return {Number}
     */
    get display() {
        return this._display;
    },

    /**
     * Property display setter
     *
     * @param  {Number} value
     * @return {Void}
     */
    set display(value) {
        if (value < MachineMenuDisplay._min())
            value = MachineMenuDisplay._min();
        else if (value > MachineMenuDisplay._max())
            value = MachineMenuDisplay._max();

        this._display = value;

        this._get_item().forEach(function(actor) {
            actor.display = value;
        });
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
                return actor instanceof MachineMenuInstance && (id ? actor.id === id : true);
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
        this.emit('execute', {
            id: event.id,
            method: event.method,
        });
    },

    /* --- */

});

Signals.addSignalMethods(MachineMenu.prototype);

/**
 * Ui.MachineMenuInstance constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const MachineMenuInstance = new Lang.Class({

    Name: 'Ui.MachineMenuInstance',
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

        this._id = id;
        this._path = path;
        this._state = 'unknown';
        this._shorten = true;
        this._display = MachineMenuDisplay.NONE;
        this._ui();

        this.state = state;
        this.shorten = false;
        this.display = MachineMenuDisplay.ALL;
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-instance');
        this.setOrnament(PopupMenu.Ornament.DOT);

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
        this.system = {};

        let item = new MachineMenuHeader(_("SYSTEM COMMANDS"));
        this.menu.addMenuItem(item);
        this.system.header = item;

        let menu = [
            'terminal', _("Open in Terminal"),
            'nautilus', _("Open in Nautilus"),
            'vagrantfile', _("Edit Vagrantfile"),
        ];

        for (let i = 0; i < menu.length; i += 2) {
            let item = new MachineMenuCommand(menu[i + 1]);
            item.method = menu[i];
            item.connect('execute', Lang.bind(this, this._handle_execute));
            this.menu.addMenuItem(item);
            this.system[item.method] = item;
        }
    },

    /**
     * Create user interface for
     * vagrant commands menu
     *
     * @return {Void}
     */
    _ui_vagrant: function() {
        this.vagrant = {};

        let item = new MachineMenuHeader(_("VAGRANT COMMANDS"));
        this.menu.addMenuItem(item);
        this.vagrant.header = item;

        let menu = [
            'up', _("Up"),
            'up_provision', _("Up and Provision"),
            'up_ssh', _("Up and SSH"),
            'up_rdp', _("Up and RDP"),
            'provision', _("Provision"),
            'ssh', _("SSH"),
            'rdp', _("RDP"),
            'resume', _("Resume"),
            'suspend', _("Suspend"),
            'halt', _("Halt"),
            'destroy', _("Destroy"),
        ];

        for (let i = 0; i < menu.length; i += 2) {
            let item = new MachineMenuCommand(menu[i + 1]);
            item.method = menu[i];
            item.connect('execute', Lang.bind(this, this._handle_execute));
            this.menu.addMenuItem(item);
            this.vagrant[item.method] = item;
        }
    },

    /**
     * Property shorten getter
     *
     * @return {Boolean}
     */
    get shorten() {
        return this._shorten;
    },

    /**
     * Property shorten setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set shorten(value) {
        this._shorten = !!value;

        let path = this.path;
        if (this.shorten)
            path = GLib.basename(path);

        this.label.text = path;
    },

    /**
     * Property display getter
     *
     * @return {Number}
     */
    get display() {
        return this._display;
    },

    /**
     * Property display setter
     *
     * @param  {Number} value
     * @return {Void}
     */
    set display(value) {
        if (value < MachineMenuDisplay._min())
            value = MachineMenuDisplay._min();
        else if (value > MachineMenuDisplay._max())
            value = MachineMenuDisplay._max();

        this._display = value;

        for (let method in this.system) {
            if (method === 'header')
                continue;

            let menu = this.system[method];
            let display = MachineMenuDisplay._from_string(method);
            let visible = (value | display) === value;

            global.log("Vagrant", method, visible);

            menu.actor.visible = visible;
        }

        for (let method in this.vagrant) {
            if (method === 'header')
                continue;

            let menu = this.vagrant[method];
            let display = MachineMenuDisplay._from_string(method);
            let visible = (value | display) === value;

            global.log("Vagrant", method, visible);
            menu.actor.visible = visible;
        }

        this.system.header.actor.visible = false
            || this.system.terminal.actor.visible
            || this.system.nautilus.actor.visible
            || this.system.vagrantfile.actor.visible;

        this.vagrant.header.actor.visible = false
            || this.vagrant.up.actor.visible
            || this.vagrant.up_provision.actor.visible
            || this.vagrant.up_ssh.actor.visible
            || this.vagrant.up_rdp.actor.visible
            || this.vagrant.provision.actor.visible
            || this.vagrant.ssh.actor.visible
            || this.vagrant.rdp.actor.visible
            || this.vagrant.resume.actor.visible
            || this.vagrant.suspend.actor.visible
            || this.vagrant.halt.actor.visible
            || this.vagrant.destroy.actor.visible;
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
     * Property path getter
     *
     * @return {String}
     */
    get path() {
        return this._path;
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
     * Get submenu item from menu list
     *
     * @param  {String} method (optional)
     * @return {Object}
     */
    _get_item: function(method) {
        return this.get_children()
            .map(function(actor) {
                return actor._delegate;
            })
            .filter(function(actor) {
                return actor instanceof MachineMenuInstance && (method ? actor.method === method : true);
            });
    },

    /**
     * Menu subitem execute event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_execute: function(widget, event) {
        this.emit('execute', {
            id: this.id,
            method: widget.method,
        });
    },

    /* --- */

});

Signals.addSignalMethods(MachineMenuInstance.prototype);

/**
 * Ui.MachineMenuCommand constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const MachineMenuCommand = new Lang.Class({

    Name: 'Ui.MachineMenuInstance',
    Extends: PopupMenu.PopupMenuItem,

    /**
     * Constructor
     *
     * @param  {String} title
     * @param  {String} method
     * @return {Void}
     */
    _init: function(title) {
        this.parent(title);

        this._def();
        this._ui();
        this._bind();
    },

    /**
     * Initialize object properties
     *
     * @return {Void}
     */
    _def: function() {
        this._method = 'unknown';
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-command');
        this.actor.add_style_class_name(this.method);
    },

    /**
     * Bind events
     *
     * @return {Void}
     */
    _bind: function() {
        this.connect('activate', Lang.bind(this, this._handle_activate));
    },

    /**
     * Activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_activate: function(widget, event) {
        this.emit('execute', {});
    },

    /**
     * Property method getter
     *
     * @return {String}
     */
    get method() {
        return this._method;
    },

    /**
     * Property method getter
     *
     * @param  {String} value
     * @return {Void}
     */
    set method(value) {
        this._method = value;
    },

    /* --- */

});

Signals.addSignalMethods(MachineMenuInstance.prototype);

/**
 * Ui.MachineMenuHeader constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const MachineMenuHeader = new Lang.Class({

    Name: 'Ui.MachineMenuHeader',
    Extends: PopupMenu.PopupMenuItem,

    /**
     * Constructor
     *
     * @param  {String} title
     * @return {Void}
     */
    _init: function(title) {
        this.parent(title);

        this.actor.add_style_class_name('gnome-vagrant-indicator-machine-menu-header');
        this.setSensitive(false);
    },

});

/**
 * MachineMenuDisplay enum
 *
 * @type {Object}
 */
let MachineMenuDisplay = Object.freeze({
    UNKNOWN: 0,
    NONE: Math.pow(2, 0),
    TERMINAL: Math.pow(2, 1),
    NAUTILUS: Math.pow(2, 2),
    VAGRANTFILE: Math.pow(2, 3),
    UP: Math.pow(2, 4),
    UP_PROVISION: Math.pow(2, 5),
    UP_SSH: Math.pow(2, 6),
    UP_RDP: Math.pow(2, 7),
    PROVISION: Math.pow(2, 8),
    SSH: Math.pow(2, 9),
    RDP: Math.pow(2, 10),
    RESUME: Math.pow(2, 11),
    SUSPEND: Math.pow(2, 12),
    HALT: Math.pow(2, 13),
    DESTROY: Math.pow(2, 14),
    ALL: Math.pow(2, 15) - 1,
    _min: function() {
        return this.NONE;
    },
    _max: function() {
        return this.ALL;
    },
    _from_string: function(str) {
        str = str
            .toString()
            .toUpperCase()
            .replace(/[^A-Za-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');

        let props = Object.keys(this);
        for (let i in props) {
            let key = props[i];
            let val = this[key];

            if (!key.startsWith('_') && typeof val === 'number' && str === key)
                return val;
        }

        return this.UNKNOWN;
    },
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
