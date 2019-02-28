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
        this._displayVagrant = Enum.sum(DisplayVagrant);
        this._displaySystem = Enum.sum(DisplaySystem);

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
        item.setDisplayVagrant(this.getDisplayVagrant());
        item.setDisplaySystem(this.getDisplaySystem());
        item.connect('system', Lang.bind(this, this._handleSystem));
        item.connect('vagrant', Lang.bind(this, this._handleVagrant));
        this.addMenuItem(item, index);
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
     * Set item state
     *
     * @param  {String} id
     * @param  {String} value
     * @return {Void}
     */
    state: function(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.actor.remove_style_class_name(actor.state);
            actor.actor.add_style_class_name(value);
            actor.state = value;
        });
    },

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @return {Number}
     */
    getDisplayVagrant: function() {
        return this._displayVagrant;
    },

    /**
     * Set DisplayVagrant
     *
     * @param  {Number} value
     * @return {Void}
     */
    setDisplayVagrant: function(value) {
        if (value < Enum.min(DisplayVagrant))
            value = Enum.min(DisplayVagrant);
        else if (value > Enum.sum(DisplayVagrant))
            value = Enum.sum(DisplayVagrant);

        this._displayVagrant = value;

        this._getItem().forEach(function(actor) {
            actor.setDisplayVagrant(value);
        });
    },

    /**
     * Get DisplaySystem:
     * display system menu subitems
     * from DisplaySystem enum
     *
     * @return {Number}
     */
    getDisplaySystem: function() {
        return this._displaySystem;
    },

    /**
     * Set DisplaySystem
     *
     * @param  {Number} value
     * @return {Void}
     */
    setDisplaySystem: function(value) {
        if (value < Enum.min(DisplaySystem))
            value = Enum.min(DisplaySystem);
        else if (value > Enum.sum(DisplaySystem))
            value = Enum.sum(DisplaySystem);

        this._displaySystem = value;

        this._getItem().forEach(function(actor) {
            actor.setDisplaySystem(value);
        });
    },

    /**
     * Get machine specific config
     *
     * @param  {String} id
     * @param  {String} key (optional)
     * @return {Mixed}
     */
    getConfig: function(id, key) {
        let result;
        this._getItem(id).forEach(function(actor) {
            result = actor.getConfig(key);
        });

        return result;
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

        this._getItem().forEach(function(actor) {
            actor.shorten = value;
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

        this._configFile = Gio.File.new_for_path(this.path + '/.' + Me.metadata.uuid);
        this._configMonitor = null;
        this._configInterval = null;
        this._configData = {};

        this._ui();
        this._bind();
        this._loadConfig(true);

        this.setDisplayVagrant(DisplayVagrant.NONE);
        this.setDisplaySystem(DisplaySystem.NONE);

        // with setter we're making sure className
        // (machine state) is set
        this.state = state;
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        Mainloop.source_remove(this._configInterval);

        this._configMonitor.cancel();
        this._configMonitor = null;
        this._configFile = null;
        this._configInterval = null;

        this.parent();
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

        this._configMonitor = this._configFile.monitor(Gio.FileMonitorFlags.NONE, null);
        this._configMonitor.connect('changed', Lang.bind(this, this._handleMonitorChanged));
    },

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @return {Number}
     */
    getDisplayVagrant: function() {
        return this._displayVagrant;
    },

    /**
     * Set DisplayVagrant
     *
     * @param  {Number} value
     * @return {Void}
     */
    setDisplayVagrant: function(value) {
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
    getDisplaySystem: function() {
        return this._displaySystem;
    },

    /**
     * Set DisplaySystem
     *
     * @param  {Number} value
     * @return {Void}
     */
    setDisplaySystem: function(value) {
        if (value < Enum.min(DisplaySystem))
            value = Enum.min(DisplaySystem);
        else if (value > Enum.sum(DisplaySystem))
            value = Enum.sum(DisplaySystem);

        this._displaySystem = value;

        this._refreshMenu();
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
     * Get configuration from config file
     *
     * @param  {String} key (optional)
     * @return {Mixed}
     */
    getConfig: function(key) {
        let result = this._configData;
        if (!key)
            return result;

        let arr = key.split('.');
        for (let i = 0; i < arr.length; i++) {
            if (!(arr[i] in result))
                return undefined;

            result = result[arr[i]];
        }

        return result;
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

        this._refreshMenuByLabel();
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

    /**
     * Load config and store it to
     * this._configData
     *
     * @param  {Boolean} skipRefresh (optional)
     * @return {Void}
     */
    _loadConfig: function(skipRefresh) {
        try {
            let [ ok, contents ] = GLib.file_get_contents(this._configFile.get_path());
            if (ok)
                this._configData = JSON.parse(contents);
            else
                throw '';
        }
        catch(e) {
            this._configData = {};
        }

        if (!skipRefresh)
            this._refreshMenu();
    },

    /**
     * Show/hide system/vagrant menu
     * items
     *
     * @return {Void}
     */
    _refreshMenu: function() {
        this._refreshMenuByLabel();
        this._refreshMenuByDisplay();
        this._refreshMenuByState();
        this._refreshMenuDropdown();
        this._refreshMenuHeaders();
    },

    /**
     * Set menu label based on  shorten
     * property
     *
     * @return {Void}
     */
    _refreshMenuByLabel: function() {
        let text = this.getConfig('label');
        if (!text) {
            let full = this.getConfig('settings.machineFullPath');
            let shorten = !full;
            if (full === null || typeof full === 'undefined')
                shorten = this.shorten;

            text = this.path;
            if (shorten)
                text = GLib.basename(text);
        }

        this.label.text = text;
    },

    /**
     * Show/hide system/vagrant menu
     * items based on user display
     * property
     *
     * @return {Void}
     */
    _refreshMenuByDisplay: function() {
        let value = this.getDisplayVagrant();
        for (let key in this.vagrant) {
            if (key === 'header')
                continue;

            let menu = this.vagrant[key];
            let display = Enum.getValue(DisplayVagrant, key.toUpperCase());
            let visible = (value | display) === value;

            menu.actor.visible = visible;
        }

        value = this.getDisplaySystem();
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

        if (this.state === 'poweroff' || this.state === 'shutoff') {
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
            command: Vagrant.CommandSystem.TERMINAL,
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
        this.emit('vagrant', {
            id: this.id,
            command: widget.command,
        });
    },

    /**
     * Machine config file content
     * change event handler
     *
     * @param  {Object} monitor
     * @param  {Object} file
     * @return {Void}
     */
    _handleMonitorChanged: function(monitor, file) {
        Mainloop.source_remove(this._configInterval);
        this._configInterval = Mainloop.timeout_add(500, Lang.bind(this, this._handleMonitorChangedDelayed), null);
    },

    /**
     * Adding delay after machine config
     * file content change event handler
     * which will prevent unnecessary
     * multiple code execution
     *
     * @return {Boolean}
     */
    _handleMonitorChangedDelayed: function() {
        this._configInterval = null;
        this._loadConfig();

        // stop repeating
        return false;
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
