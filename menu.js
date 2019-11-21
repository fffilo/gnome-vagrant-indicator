/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;
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

// Display enums
const DisplayVagrant = Vagrant.CommandVagrant;
const DisplaySystem = Vagrant.CommandSystem;

/**
 * Menu.Machine constructor
 *
 * @param  {Object}
 * @return {Object}
 */
var Machine = new Lang.Class({

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
     * @return {Object}
     */
    add: function(id, path, state, index) {
        if (this.empty)
            this.empty.destroy();
        this.empty = null;

        let item = new Path(id, path, state);
        item.connect('error', Lang.bind(this, this._handleError));
        item.connect('system', Lang.bind(this, this._handleSystem));
        item.connect('vagrant', Lang.bind(this, this._handleVagrant));
        this.addMenuItem(item, index);

        return item;
    },

    /**
     * Remove item from list
     *
     * @return {Void}
     */
    remove: function(id) {
        this._getItem(id).forEach(function(actor) {
            actor.destroy();
        });

        if (!this._getItem().length)
            this.clear();
    },

    /**
     * Get item state
     *
     * @param  {String} id
     * @return {Void}
     */
    getState: function(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;

        return item[0].state;
    },

    /**
     * Set item state
     *
     * @param  {String} id
     * @param  {String} value
     * @return {Void}
     */
    setState: function(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.actor.remove_style_class_name(actor.state);
            actor.actor.add_style_class_name(value);
            actor.state = value;
        });
    },

    /**
     * Get item shorten property
     *
     * @param  {String}  id
     * @return {Boolean}
     */
    getShorten: function(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;

        return item[0].shorten;
    },

    /**
     * Set item shorten property
     *
     * @param  {String}  id
     * @param  {Boolean} value
     * @return {Void}
     */
    setShorten: function(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.shorten = value;
        });
    },

    /**
     * Get item title
     *
     * @param  {String}  id
     * @return {Mixed}
     */
    getTitle: function(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;

        return item[0].title;
    },

    /**
     * Set item title
     *
     * @param  {String}  id
     * @param  {Boolean} value
     * @return {Void}
     */
    setTitle: function(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.title = value;
        });
    },

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @return {Number}
     */
    getDisplayVagrant: function(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;

        return item[0].displayVagrant;
    },

    /**
     * Set DisplayVagrant
     *
     * @param  {Number} value
     * @return {Void}
     */
    setDisplayVagrant: function(id, value) {
        if (value < Enum.min(DisplayVagrant))
            value = Enum.min(DisplayVagrant);
        else if (value > Enum.sum(DisplayVagrant))
            value = Enum.sum(DisplayVagrant);

        this._getItem(id).forEach(function(actor) {
            actor.displayVagrant = value;
        });
    },

    /**
     * Get DisplaySystem:
     * display system menu subitems
     * from DisplaySystem enum
     *
     * @return {Number}
     */
    getDisplaySystem: function(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;

        return item[0].displaySystem;
    },

    /**
     * Set DisplaySystem
     *
     * @param  {Number} value
     * @return {Void}
     */
    setDisplaySystem: function(id, value) {
        if (value < Enum.min(DisplaySystem))
            value = Enum.min(DisplaySystem);
        else if (value > Enum.sum(DisplaySystem))
            value = Enum.sum(DisplaySystem);

        this._getItem(id).forEach(function(actor) {
            actor.displaySystem = value;
        });
    },

    /**
     * Get submenu item from menu list
     *
     * @param  {String} id (optional)
     * @return {Object}
     */
    _getItem: function(id) {
        return this.box.get_children()
            .map(function(actor) {
                return actor._delegate;
            })
            .filter(function(actor) {
                return actor instanceof Path && (id ? actor.id === id : true);
            });
    },

    /**
     * Error handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleError: function(widget, event) {
        this.emit('error', event);
    },

    /**
     * Menu subitem (system command)
     * execute event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleSystem: function(widget, event) {
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
    _handleVagrant: function(widget, event) {
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
var Path = new Lang.Class({

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
        this._title = null;
        this._state = 'unknown';
        this._shorten = true;
        this._displayVagrant = Enum.sum(DisplayVagrant);
        this._displaySystem = Enum.sum(DisplaySystem);

        this._ui();
        this._bind();

        // with setter we're making sure className
        // (machine state) is set
        this.state = state;
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

        this._uiVagrant();
        this._uiSystem();
    },

    /**
     * Create user interface for
     * vagrant commands menu
     *
     * @return {Void}
     */
    _uiVagrant: function() {
        this.vagrant = {};

        let item = new Header(_("VAGRANT COMMANDS"));
        this.menu.addMenuItem(item);
        this.vagrant.header = item;

        let menu = [
            'up', DisplayVagrant.UP, _("Up"),
            'up_provision', DisplayVagrant.UP_PROVISION, _("Up and Provision"),
            'up_ssh', DisplayVagrant.UP_SSH, _("Up and SSH"),
            'up_rdp', DisplayVagrant.UP_RDP, _("Up and RDP"),
            'provision', DisplayVagrant.PROVISION, _("Provision"),
            'ssh', DisplayVagrant.SSH, _("SSH"),
            'rdp', DisplayVagrant.RDP, _("RDP"),
            'resume', DisplayVagrant.RESUME, _("Resume"),
            'suspend', DisplayVagrant.SUSPEND, _("Suspend"),
            'halt', DisplayVagrant.HALT, _("Halt"),
            'destroy', DisplayVagrant.DESTROY, _("Destroy"),
        ];

        for (let i = 0; i < menu.length; i += 3) {
            let id = menu[i];
            let cmd = menu[i + 1];
            let label = menu[i + 2];

            let item = new Command(label);
            item.command = cmd;
            item.connect('execute', Lang.bind(this, this._handleVagrant));
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
    _uiSystem: function() {
        this.system = {};

        let item = new Header(_("SYSTEM COMMANDS"));
        this.menu.addMenuItem(item);
        this.system.header = item;

        let menu = [
            'terminal', DisplaySystem.TERMINAL, _("Open in Terminal"),
            'file_manager', DisplaySystem.FILE_MANAGER, _("Open in File Manager"),
            'vagrantfile', DisplaySystem.VAGRANTFILE, _("Edit Vagrantfile"),
            'machine_config', DisplaySystem.MACHINE_CONFIG, _("Machine Configuration"),
        ];

        for (let i = 0; i < menu.length; i += 3) {
            let id = menu[i];
            let cmd = menu[i + 1];
            let label = menu[i + 2];

            let item = new Command(label);
            item.command = cmd;
            item.connect('execute', Lang.bind(this, this._handleSystem));
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
        this.connect('activate', Lang.bind(this, this._handleActivate));
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

        this._refreshMenu();
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

        this._refreshMenu();
    },

    get title() {
        return this._title;
    },

    set title(value) {
        try {
            if (value)
                value = value.toString();
        }
        catch(e) {
            value = null;
        }

        this._title = value || null;

        this._refreshMenu();
    },

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @return {Number}
     */
    get displayVagrant() {
        return this._displayVagrant;
    },

    /**
     * Set DisplayVagrant
     *
     * @param  {Number} value
     * @return {Void}
     */
    set displayVagrant(value) {
        if (value < Enum.min(DisplayVagrant))
            value = Enum.min(DisplayVagrant);
        else if (value > Enum.sum(DisplayVagrant))
            value = Enum.sum(DisplayVagrant);

        this._displayVagrant = value;

        this._refreshMenu();
    },

    /**
     * Get DisplaySystem:
     * display system menu subitems
     * from DisplaySystem enum
     *
     * @return {Number}
     */
    get displaySystem() {
        return this._displaySystem;
    },

    /**
     * Set DisplaySystem
     *
     * @param  {Number} value
     * @return {Void}
     */
    set displaySystem(value) {
        if (value < Enum.min(DisplaySystem))
            value = Enum.min(DisplaySystem);
        else if (value > Enum.sum(DisplaySystem))
            value = Enum.sum(DisplaySystem);

        this._displaySystem = value;

        this._refreshMenu();
    },

    /**
     * Show/hide system/vagrant menu
     * items
     *
     * @return {Void}
     */
    _refreshMenu: function() {
        this._refreshMenuByTitle();
        this._refreshMenuByDisplayVagrant();
        this._refreshMenuByDisplaySystem();
        this._refreshMenuByState();
        this._refreshMenuDropdown();
        this._refreshMenuHeaders();
    },

    /**
     * Set menu label based on shorten
     * property or title
     *
     * @todo - depricated
     *
     * @return {Void}
     */
    _refreshMenuByTitle: function() {
        let title = this.title;
        if (!title) {
            title = this.path;
            if (this.shorten)
                title = GLib.basename(title);
        }

        this.label.text = title;
    },

    /**
     * Show/hide vagrant menu items
     * based on user display property
     *
     * @return {Void}
     */
    _refreshMenuByDisplayVagrant: function() {
        let value = this.displayVagrant;
        for (let key in this.vagrant) {
            if (key === 'header')
                continue;

            let menu = this.vagrant[key];
            let display = Enum.getValue(DisplayVagrant, key.toUpperCase());
            let visible = (value | display) === value;

            menu.actor.visible = visible;
        }
    },

    /**
     * Show/hide system menu items
     * based on user display property
     *
     * @return {Void}
     */
    _refreshMenuByDisplaySystem: function() {
        let value = this.displaySystem;
        for (let key in this.system) {
            if (key === 'header')
                continue;

            let menu = this.system[key];
            let display = Enum.getValue(DisplaySystem, key.toUpperCase());
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
    _refreshMenuByState: function() {
        this.setSensitive(true);

        let state = this.state;
        if (state === 'shutoff')
            state = 'poweroff';

        if (state === 'poweroff') {
            this.vagrant.provision.actor.visible = false;
            this.vagrant.ssh.actor.visible = false;
            this.vagrant.rdp.actor.visible = false;
            this.vagrant.resume.actor.visible = false;
            this.vagrant.suspend.actor.visible = false;
            this.vagrant.halt.actor.visible = false;
        }
        else if (state === 'preparing') {
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
        else if (state === 'running') {
            this.vagrant.up.actor.visible = false;
            this.vagrant.up_provision.actor.visible = false;
            this.vagrant.up_ssh.actor.visible = false;
            this.vagrant.up_rdp.actor.visible = false;
            this.vagrant.resume.actor.visible = false;
            this.vagrant.suspend.actor.visible = false;
            this.vagrant.destroy.actor.visible = false;
        }
        else if (state === 'saved') {
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
        //else if (state === 'aborted') {
        //    @todo - what to do here?
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
    _refreshMenuDropdown: function() {
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
    _refreshMenuHeaders: function() {
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
    _getItem: function(method) {
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
    _handleActivate: function(widget, event) {
        this.emit('system', {
            id: this.id,
            command: DisplaySystem.TERMINAL,
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
    _handleSystem: function(widget, event) {
        let key = Enum.getKey(DisplaySystem, widget.command);
        key = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        key = key.replace(/_[a-z]/g, function(match) {
            return match.charAt(1).toUpperCase();
        });
        if (typeof this['_handleSystem' + key] === 'function')
            if (this['_handleSystem' + key].call(this, widget, event))
                return;

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
    _handleVagrant: function(widget, event) {
        let key = Enum.getKey(DisplayVagrant, widget.command);
        key = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        key = key.replace(/_[a-z]/g, function(match) {
            return match.charAt(1).toUpperCase();
        });
        if (typeof this['_handleVagrant' + key] === 'function')
            if (this['_handleVagrant' + key].call(this, widget, event))
                return;

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
var Command = new Lang.Class({

    Name: 'Menu.Command',
    Extends: Item,

    /**
     * Constructor
     *
     * @param  {String} title
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
        this.connect('activate', Lang.bind(this, this._handleActivate));
    },

    /**
     * Activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleActivate: function(widget, event) {
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
var Header = new Lang.Class({

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
