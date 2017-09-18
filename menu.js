/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Enum = Me.imports.enum;
const Vagrant = Me.imports.vagrant;
const Translation = Me.imports.translation;
const _ = Translation.translate;

// PopupMenu proxies
const Separator = PopupMenu.PopupSeparatorMenuItem;
const Item = PopupMenu.PopupMenuItem;
const SubMenu = PopupMenu.PopupSubMenuMenuItem;
const Section = PopupMenu.PopupMenuSection;

/**
 * Display enum
 *
 * @type {Object}
 */
const Display = new Enum.Enum([
    'NONE',
    'TERMINAL',
    'FILE_MANAGER',
    'VAGRANTFILE',
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
]);

/**
 * Menu.Machine constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Machine = new Lang.Class({

    Name: 'Menu.Machine',
    Extends: Section,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.parent();

        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-machine');

        this._shorten = false;
        this._display = Display._sum();

        this.clear();
    },

    /**
     * Empty list
     *
     * @return {Void}
     */
    clear: function() {
        this.removeAll();

        this.empty = new Item(_("No Vagrant machines found"));
        this.empty.setSensitive(false);
        this.addMenuItem(this.empty);
    },

    /**
     * Display error
     *
     * @param  {String} msg
     * @return {Void}
     */
    error: function(msg) {
        this.removeAll();

        this.empty = new Item(msg || 'ERROR');
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

        let item = new Path(id, path, state);
        item.shorten = this.shorten;
        item.display = this.display;
        item.connect('system', Lang.bind(this, this._handle_system));
        item.connect('vagrant', Lang.bind(this, this._handle_vagrant));
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
        if (value < Display._min())
            value = Display._min();
        else if (value > Display._sum())
            value = Display._sum();

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
                return actor instanceof Path && (id ? actor.id === id : true);
            });
    },

    /**
     * Menu subitem (system command)
     * execute event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_system: function(widget, event) {
        this.emit('system', {
            id: event.id,
            command: event.command,
        });
    },

    /**
     * Menu subitem (vagrant command)
     * execute event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_vagrant: function(widget, event) {
        this.emit('vagrant', {
            id: event.id,
            command: event.command,
        });
    },

    /* --- */

});

/**
 * Menu.Path constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Path = new Lang.Class({

    Name: 'Menu.Path',
    Extends: SubMenu,

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
        this._display = Display.NONE;

        this._ui();
        this._bind();

        this.state = state;
        this.shorten = false;
        this.display = Display._sum();
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-path');
        this.menu.actor.add_style_class_name('gnome-vagrant-indicator-menu-submenu');
        this.setOrnament(PopupMenu.Ornament.DOT);

        this._ui_vagrant();
        this._ui_system();
    },

    /**
     * Create user interface for
     * vagrant commands menu
     *
     * @return {Void}
     */
    _ui_vagrant: function() {
        this.vagrant = {};

        let item = new Header(_("VAGRANT COMMANDS"));
        this.menu.addMenuItem(item);
        this.vagrant.header = item;

        let menu = [
            'up', Vagrant.CommandVagrant.UP, _("Up"),
            'up_provision', Vagrant.CommandVagrant.UP_PROVISION, _("Up and Provision"),
            'up_ssh', Vagrant.CommandVagrant.UP_SSH, _("Up and SSH"),
            'up_rdp', Vagrant.CommandVagrant.UP_RDP, _("Up and RDP"),
            'provision', Vagrant.CommandVagrant.PROVISION, _("Provision"),
            'ssh', Vagrant.CommandVagrant.SSH, _("SSH"),
            'rdp', Vagrant.CommandVagrant.RDP, _("RDP"),
            'resume', Vagrant.CommandVagrant.RESUME, _("Resume"),
            'suspend', Vagrant.CommandVagrant.SUSPEND, _("Suspend"),
            'halt', Vagrant.CommandVagrant.HALT, _("Halt"),
            'destroy', Vagrant.CommandVagrant.DESTROY, _("Destroy"),
        ];

        for (let i = 0; i < menu.length; i += 3) {
            let id = menu[i];
            let cmd = menu[i + 1];
            let label = menu[i + 2];

            let item = new Command(label);
            item.command = cmd;
            item.connect('execute', Lang.bind(this, this._handle_vagrant));
            this.menu.addMenuItem(item);
            this.vagrant[id] = item;
        }
    },

    /**
     * Create user interface for
     * system commands menu
     *
     * @return {Void}
     */
    _ui_system: function() {
        this.system = {};

        let item = new Header(_("SYSTEM COMMANDS"));
        this.menu.addMenuItem(item);
        this.system.header = item;

        let menu = [
            'terminal', Vagrant.CommandSystem.TERMINAL, _("Open in Terminal"),
            'file_manager', Vagrant.CommandSystem.FILE_MANAGER, _("Open in File Manager"),
            'vagrantfile', Vagrant.CommandSystem.VAGRANTFILE, _("Edit Vagrantfile"),
        ];

        for (let i = 0; i < menu.length; i += 3) {
            let id = menu[i];
            let cmd = menu[i + 1];
            let label = menu[i + 2];

            let item = new Command(label);
            item.command = cmd;
            item.connect('execute', Lang.bind(this, this._handle_system));
            this.menu.addMenuItem(item);
            this.system[id] = item;
        }
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
        if (value < Display._min())
            value = Display._min();
        else if (value > Display._sum())
            value = Display._sum();

        this._display = value;

        this._refresh_menu();
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

        this._refresh_menu();
    },

    /**
     * Act like PopupMenu.PopupMenuItem
     * when submenu is empty
     *
     * @param  {Booelan} open
     * @return {Void}
     */
    setSubmenuShown: function(open) {
        this.parent(open);

        if (!this.system.header.actor.visible && !this.vagrant.header.actor.visible)
            this.emit('activate');
    },

    /**
     *
     * Show/hide system/vagrant menu
     * items
     *
     * @return {Void}
     */
    _refresh_menu: function() {
        this._refresh_menu_by_display();
        this._refresh_menu_by_state();
        this._refresh_menu_dropdown();
        this._refresh_menu_headers();
    },

    /**
     * Show/hide system/vagrant menu
     * items based on user display
     * property
     *
     * @return {Void}
     */
    _refresh_menu_by_display: function() {
        let value = this.display;

        for (let method in this.vagrant) {
            if (method === 'header')
                continue;

            let menu = this.vagrant[method];
            let display = Display._from_string(method.toUpperCase());
            let visible = (value | display) === value;

            menu.actor.visible = visible;
        }

        for (let method in this.system) {
            if (method === 'header')
                continue;

            let menu = this.system[method];
            let display = Display._from_string(method.toUpperCase());
            let visible = (value | display) === value;

            menu.actor.visible = visible;
        }
    },

    /**
     * Hide vagrant menu items based
     * on virtual machine state
     *
     * @return {Void}
     */
    _refresh_menu_by_state: function() {
        this.setSensitive(true);

        if (this.state === 'poweroff') {
            this.vagrant.provision.actor.visible = false;
            this.vagrant.ssh.actor.visible = false;
            this.vagrant.rdp.actor.visible = false;
            this.vagrant.resume.actor.visible = false;
            this.vagrant.suspend.actor.visible = false;
            this.vagrant.halt.actor.visible = false;
        }
        else if (this.state === 'preparing') {
            this.vagrant.up.actor.visible = false;
            this.vagrant.up_provision.actor.visible = false;
            this.vagrant.up_ssh.actor.visible = false;
            this.vagrant.up_rdp.actor.visible = false;
            this.vagrant.provision.actor.visible = false;
            this.vagrant.ssh.actor.visible = false;
            this.vagrant.rdp.actor.visible = false;
            this.vagrant.resume.actor.visible = false;
            this.vagrant.suspend.actor.visible = false;
            this.vagrant.destroy.actor.visible = false;
        }
        else if (this.state === 'running') {
            this.vagrant.up.actor.visible = false;
            this.vagrant.up_provision.actor.visible = false;
            this.vagrant.up_ssh.actor.visible = false;
            this.vagrant.up_rdp.actor.visible = false;
            this.vagrant.resume.actor.visible = false;
            this.vagrant.suspend.actor.visible = false;
            this.vagrant.destroy.actor.visible = false;
        }
        else if (this.state === 'saved') {
            this.vagrant.up.actor.visible = false;
            this.vagrant.up_provision.actor.visible = false;
            this.vagrant.up_ssh.actor.visible = false;
            this.vagrant.up_rdp.actor.visible = false;
            this.vagrant.provision.actor.visible = false;
            this.vagrant.ssh.actor.visible = false;
            this.vagrant.rdp.actor.visible = false;
            this.vagrant.suspend.actor.visible = false;
            this.vagrant.halt.actor.visible = false;
            this.vagrant.destroy.actor.visible = false;
        }
        //else if (this.state === 'aborted') {
        //}
        else {
            // disable menu on aborted or unknown state
            this.setSensitive(false);
        }
    },

    /**
     * Show/hide dropdown arrow
     *
     * @return {Void}
     */
    _refresh_menu_dropdown: function() {
        this._triangleBin.visible = false
            || this.system.terminal.actor.visible
            || this.system.file_manager.actor.visible
            || this.system.vagrantfile.actor.visible
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
     * Show/hide system/vagrant menu
     * headers
     *
     * @return {Void}
     */
    _refresh_menu_headers: function() {
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

        this.system.header.actor.visible = false
            || this.system.terminal.actor.visible
            || this.system.file_manager.actor.visible
            || this.system.vagrantfile.actor.visible;
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
                return actor instanceof Path && (method ? actor.method === method : true);
            });
    },

    /**
     * Menu item activate event handler
     * (called only if submenu is empty)
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_activate: function(widget, event) {
        this.emit('execute', {
            id: this.id,
            type: 'system',
            method: Vagrant.SystemCommand.TERMINAL,
        });
    },

    /**
     * Menu subitem (system command)
     * execute event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_system: function(widget, event) {
        this.emit('system', {
            id: this.id,
            command: widget.command,
        });
    },

    /**
     * Menu subitem (vagrant command)
     * execute event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_vagrant: function(widget, event) {
        this.emit('vagrant', {
            id: this.id,
            command: widget.command,
        });
    },

    /* --- */

});

/**
 * Menu.Command constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Command = new Lang.Class({

    Name: 'Menu.Command',
    Extends: Item,

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
        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-command');
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

/**
 * Menu.Header constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Header = new Lang.Class({

    Name: 'Menu.Header',
    Extends: Item,

    /**
     * Constructor
     *
     * @param  {String} title
     * @return {Void}
     */
    _init: function(title) {
        this.parent(title);

        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-header');
        this.setSensitive(false);
    },

    /* --- */

});
