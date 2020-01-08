/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const {GLib, GObject, Clutter} = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Enum = Me.imports.enum;
const Vagrant = Me.imports.vagrant;
const Translation = Me.imports.translation;
const _ = Translation.translate;

// PopupMenu proxies
var PopupSeparatorMenuItem = PopupMenu.PopupSeparatorMenuItem;
var PopupMenuItem = PopupMenu.PopupMenuItem;
var PopupSubMenuMenuItem = PopupMenu.PopupSubMenuMenuItem;
var PopupMenuSection = PopupMenu.PopupMenuSection;

// Display enums
var DisplayVagrant = Vagrant.CommandVagrant;
var DisplaySystem = Vagrant.CommandSystem;

/**
 * Menu.Machine constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Machine = class Machine extends PopupMenuSection {
    /**
     * Constructor
     *
     * @return {Void}
     */
    constructor() {
        super();

        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-machine');
        this.clear();
    }

    /**
     * Empty list
     *
     * @return {Void}
     */
    clear() {
        this.removeAll();

        this.empty = new PopupMenuItem(_("No Vagrant machines found"));
        this.empty.setSensitive(false);
        this.addMenuItem(this.empty);
    }

    /**
     * Display error
     *
     * @param  {String} message
     * @return {Void}
     */
    error(message) {
        this.removeAll();

        this.empty = new Item(message || 'ERROR');
        this.empty.setSensitive(false);
        this.addMenuItem(this.empty);
    }

    /**
     * Add item to list
     *
     * @param  {String}    id
     * @param  {String}    path
     * @param  {String}    name
     * @param  {String}    state
     * @param  {Number}    index (optional)
     * @return {Menu.Path}
     */
    add(id, path, name, state, index) {
        if (this.empty)
            this.empty.destroy();
        this.empty = null;

        let item = new Path(id, path, name, state);
        //item.connect('error', this._handleError.bind(this));
        item.connect('system', this._handleSystem.bind(this));
        item.connect('vagrant', this._handleVagrant.bind(this));

        this.addMenuItem(item, index > -1 ? index : undefined);

        return item;
    }

    /**
     * Remove item from list
     *
     * @return {Void}
     */
    remove(id) {
        this._getItem(id).forEach(function(actor) {
            actor.destroy();
        });

        if (!this._getItem().length)
            this.clear();
    }

    /**
     * Get item index
     *
     * @param  {String} id
     * @return {Number}
     */
    getItemIndex(id) {
        let result = -1;
        this.box.get_children()
            .map(function(actor) {
                return actor._delegate;
            })
            .filter(function(actor) {
                return actor instanceof Path;
            })
            .forEach(function(actor, index) {
                if (id ? actor.id === id : true)
                    result = index;
            });

        return result;
    }

    /**
     * Set item index
     *
     * @param  {String} id
     * @param  {Number} index
     * @return {Void}
     */
    setItemIndex(id, index) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return;
        item = item[0];

        if (index < 0 || index >= this._getItem().length || this.getItemIndex(id) === index)
            return;

        // this.moveMenuItem not working
        // (it moves menuItem, but not it's subMenu)
        //this.moveMenuItem(item, index);

        // ...let's remove old and add new item
        let path = item.path;
        let name = item.name;
        let state = item.state;
        let title = item.title;
        let displayMachineFullPath = item.displayMachineFullPath;
        let displayMachineName = item.displayMachineName;
        let displayVagrant = item.displayVagrant;
        let displaySystem = item.displaySystem;

        this.remove(id);
        item = this.add(id, path, name, state, index);
        item.title = title;
        item.displayMachineFullPath = displayMachineFullPath;
        item.displayMachineName = displayMachineName;
        item.displayVagrant = displayVagrant;
        item.displaySystem = displaySystem;
    }

    /**
     * Get item state
     *
     * @param  {String} id
     * @return {String}
     */
    getState(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;
        item = item[0];

        return item.state;
    }

    /**
     * Set item state
     *
     * @param  {String} id
     * @param  {String} value
     * @return {Void}
     */
    setState(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.actor.remove_style_class_name(actor.state);
            actor.actor.add_style_class_name(value);
            actor.state = value;
        });
    }

    /**
     * Get item displayMachineFullPath property
     *
     * @param  {String}  id
     * @return {Boolean}
     */
    getDisplayMachineFullPath(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;
        item = item[0];

        return item.displayMachineFullPath;
    }

    /**
     * Set item displayMachineFullPath property
     *
     * @param  {String}  id
     * @param  {Boolean} value
     * @return {Void}
     */
    setDisplayMachineFullPath(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.displayMachineFullPath = value;
        });
    }

    /**
     * Get item displayMachineName property
     *
     * @param  {String}  id
     * @return {Boolean}
     */
    getDisplayMachineName(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;
        item = item[0];

        return item.displayMachineName;
    }

    /**
     * Set item displayMachineName property
     *
     * @param  {String}  id
     * @param  {Boolean} value
     * @return {Void}
     */
    setDisplayMachineName(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.displayMachineName = value;
        });
    }

    /**
     * Get item title
     *
     * @param  {String} id
     * @return {Mixed}
     */
    getTitle(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;
        item = item[0];

        return item.title;
    }

    /**
     * Set item title
     *
     * @param  {String} id
     * @param  {Mixed}  value
     * @return {Void}
     */
    setTitle(id, value) {
        this._getItem(id).forEach(function(actor) {
            actor.title = value;
        });
    }

    /**
     * Get item current label
     *
     * @param  {String} id
     * @return {String}
     */
    getCurrentLabel(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;
        item = item[0];

        return item.label.text;
    }

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @param  {String} id
     * @return {Number}
     */
    getDisplayVagrant(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;
        item = item[0];

        return item.displayVagrant;
    }

    /**
     * Set DisplayVagrant
     *
     * @param  {String} id
     * @param  {Number} value
     * @return {Void}
     */
    setDisplayVagrant(id, value) {
        if (value < Enum.min(DisplayVagrant))
            value = Enum.min(DisplayVagrant);
        else if (value > Enum.sum(DisplayVagrant))
            value = Enum.sum(DisplayVagrant);

        this._getItem(id).forEach(function(actor) {
            actor.displayVagrant = value;
        });
    }

    /**
     * Get DisplaySystem:
     * display system menu subitems
     * from DisplaySystem enum
     *
     * @param  {String} id
     * @return {Number}
     */
    getDisplaySystem(id) {
        let item = this._getItem(id);
        if (item.length !== 1)
            return null;
        item = item[0];

        return item.displaySystem;
    }

    /**
     * Set DisplaySystem
     *
     * @param  {String} id
     * @param  {Number} value
     * @return {Void}
     */
    setDisplaySystem(id, value) {
        if (value < Enum.min(DisplaySystem))
            value = Enum.min(DisplaySystem);
        else if (value > Enum.sum(DisplaySystem))
            value = Enum.sum(DisplaySystem);

        this._getItem(id).forEach(function(actor) {
            actor.displaySystem = value;
        });
    }

    /**
     * Get submenu item from menu list
     *
     * @param  {String} id (optional)
     * @return {Array}
     */
    _getItem(id) {
        return this.box.get_children()
            .map(function(actor) {
                return actor._delegate;
            })
            .filter(function(actor) {
                return actor instanceof Path && (id ? actor.id === id : true);
            });
    }

    /**
     * Error handler
     *
     * @param  {Menu.Path} widget
     * @param  {GObject.Object}    event
     * @return {Void}
     */
    _handleError(widget, event) {
        this.emit('error', event);
    }

    /**
     * Menu subitem (system command)
     * execute event handler
     *
     * @param  {Menu.Path} widget
     * @param  {GObject.Object}   object
     * @return {Void}
     */
    _handleSystem(widget, object) {
        this.emit('system', object);
    }

    /**
     * Menu subitem (vagrant command)
     * execute event handler
     *
     * @param  {Menu.Path} widget
     * @param  {GObject.Object}   object
     * @return {Void}
     */
    _handleVagrant(widget, object) {
        this.emit('vagrant', object);
    }

    /* --- */

};

/**
 * Menu.Path constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Path = GObject.registerClass({
    Signals: {
        'system': { param_types: [ GObject.TYPE_OBJECT ] },
        'vagrant': { param_types: [ GObject.TYPE_OBJECT ] },
        'error': { param_types: [ GObject.TYPE_NONE ]},
    }
}, class Path extends Machine {
    /**
     * Constructor
     *
     * @param  {String} id
     * @param  {String} path
     * @param  {String} name
     * @param  {String} state
     * @return {Void}
     */
    _init(id, path, name, state) {
        super._init('unknown');

        this._id = id;
        this._path = path;
        this._name = name;
        this._title = null;
        this._state = 'unknown';
        this._displayMachineFullPath = false;
        this._displayMachineName = false;
        this._displayVagrant = Enum.sum(DisplayVagrant);
        this._displaySystem = Enum.sum(DisplaySystem);

        this._ui();
        this._bind();

        // with setter we're making sure className
        // (machine state) is set
        this.state = state;
    }

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-path');
        this.menu.actor.add_style_class_name('gnome-vagrant-indicator-menu-submenu');
        this.setOrnament(PopupMenu.Ornament.DOT);

        this._uiVagrant();
        this._uiSystem();
    }

    /**
     * Create user interface for
     * vagrant commands menu
     *
     * @return {Void}
     */
    _uiVagrant() {
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
            item.connect('execute', this._handleVagrant.bind(this));
            this.menu.addMenuItem(item);
            this.vagrant[id] = item;
        }
    }

    /**
     * Create user interface for
     * system commands menu
     *
     * @return {Void}
     */
    _uiSystem() {
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
            item.connect('execute', this._handleSystem.bind(this));
            this.menu.addMenuItem(item);
            this.system[id] = item;
        }
    }

    /**
     * Bind events
     *
     * @return {Void}
     */
    _bind() {
        this.connect('activate', this._handleActivate.bind(this));
    }

    /**
     * Act like PopupMenu.PopupMenuItem
     * when submenu is empty
     *
     * @param  {Boolean} open
     * @return {Void}
     */
    setSubmenuShown(open) {
        super.setSubmenuShown(open);

        if (!this.system.header.actor.visible && !this.vagrant.header.actor.visible)
            this.emit('activate');
    }

    /**
     * Property displayMachineFullPath getter
     *
     * @return {Boolean}
     */
    get displayMachineFullPath() {
        return this._displayMachineFullPath;
    }

    /**
     * Property displayMachineFullPath setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set displayMachineFullPath(value) {
        this._displayMachineFullPath = !!value;

        this._refreshMenu();
    }

    /**
     * Property displayMachineName getter
     *
     * @return {Boolean}
     */
    get displayMachineName() {
        return this._displayMachineName;
    }

    /**
     * Property displayMachineName setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set displayMachineName(value) {
        this._displayMachineName = !!value;

        this._refreshMenu();
    }

    /**
     * Property id getter
     *
     * @return {String}
     */
    get id() {
        return this._id;
    }

    /**
     * Property path getter
     *
     * @return {String}
     */
    get path() {
        return this._path;
    }

    /**
     * Property name getter
     *
     * @return {String}
     */
    get name() {
        return this._name;
    }

    /**
     * Property state getter
     *
     * @return {String}
     */
    get state() {
        return this._state;
    }

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
    }

    /**
     * Property title getter
     *
     * @return {Mixed}
     */
    get title() {
        return this._title;
    }

    /**
     * Property title setter
     *
     * @param  {Mixed} value
     * @return {Void}
     */
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
    }

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @return {Number}
     */
    get displayVagrant() {
        return this._displayVagrant;
    }

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
    }

    /**
     * Get DisplaySystem:
     * display system menu subitems
     * from DisplaySystem enum
     *
     * @return {Number}
     */
    get displaySystem() {
        return this._displaySystem;
    }

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
    }

    /**
     * Show/hide system/vagrant menu
     * items
     *
     * @return {Void}
     */
    _refreshMenu() {
        this._refreshMenuByTitle();
        this._refreshMenuByDisplayVagrant();
        this._refreshMenuByDisplaySystem();
        this._refreshMenuByState();
        this._refreshMenuDropdown();
        this._refreshMenuHeaders();
    }

    /**
     * Set menu label based on title or based
     * on displayMachineFullPath and
     * displayMachineName
     *
     * property or title
     *
     * @return {Void}
     */
    _refreshMenuByTitle() {
        let title = this.title;
        if (!title) {
            title = this.path;
            if (!this.displayMachineFullPath)
                title = GLib.basename(title);
            if (this.displayMachineName)
                title = (title + ' ' + this.name).trim();
        }

        this.label.text = title;
    }

    /**
     * Show/hide vagrant menu items
     * based on user display property
     *
     * @return {Void}
     */
    _refreshMenuByDisplayVagrant() {
        let value = this.displayVagrant;
        for (let key in this.vagrant) {
            if (key === 'header')
                continue;

            let menu = this.vagrant[key];
            let display = Enum.getValue(DisplayVagrant, key.toUpperCase());
            let visible = (value | display) === value;

            menu.actor.visible = visible;
        }
    }

    /**
     * Show/hide system menu items
     * based on user display property
     *
     * @return {Void}
     */
    _refreshMenuByDisplaySystem() {
        let value = this.displaySystem;
        for (let key in this.system) {
            if (key === 'header')
                continue;

            let menu = this.system[key];
            let display = Enum.getValue(DisplaySystem, key.toUpperCase());
            let visible = (value | display) === value;

            menu.actor.visible = visible;
        }
    }

    /**
     * Hide vagrant menu items based
     * on virtual machine state
     *
     * @return {Void}
     */
    _refreshMenuByState() {
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
    }

    /**
     * Show/hide dropdown arrow
     *
     * @return {Void}
     */
    _refreshMenuDropdown() {
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
    }

    /**
     * Show/hide system/vagrant menu
     * headers
     *
     * @return {Void}
     */
    _refreshMenuHeaders() {
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
    }

    /**
     * Get submenu item from menu list
     *
     * @param  {String} method (optional)
     * @return {Array}
     */
    _getItem(method) {
        return this.get_children()
            .map(function(actor) {
                return actor._delegate;
            })
            .filter(function(actor) {
                return actor instanceof Path && (method ? actor.method === method : true);
            });
    }

    /**
     * Menu item activate event handler
     * (called only if submenu is empty)
     *
     * @param  {Menu.Path}     widget
     * @param  {Clutter.Event.$gtype} event
     * @return {Void}
     */
    _handleActivate(widget, event) {
        let emit = new GObject.Object();
        emit.id = this.id;
        emit.command = DisplaySystem.TERMINAL;
        this.emit('system', emit);
    }

    /**
     * Menu subitem (system command)
     * execute event handler
     *
     * @param  {Menu.Command} widget
     * @return {Void}
     */
    _handleSystem(widget) {
        let emit = new GObject.Object();
        emit.id = this.id;
        emit.command = widget.command;
        this.emit('system', emit);
    }

    /**
     * Menu subitem (vagrant command)
     * execute event handler
     *
     * @param  {Menu.Command} widget
     * @param  {Object}       event
     * @return {Void}
     */
    _handleVagrant(widget, event) {
        let emit = new GObject.Object();
        emit.id = this.id;
        emit.command = widget.command;
        this.emit('vagrant', emit);
    }

    /* --- */

});

/**
 * Menu.Command constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Command = GObject.registerClass({
    Signals: {
        'execute': { param_types: GObject.TYPE_NONE },
    }
}, class Command extends PopupMenuItem {
    /**
     * Constructor
     *
     * @param  {String} title
     * @return {Void}
     */
    _init(title) {
        super._init(title);

        this._def();
        this._ui();
        this._bind();
    }

    /**
     * Initialize object properties
     *
     * @return {Void}
     */
    _def() {
        this._method = 'unknown';
    }

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-command');
        this.actor.add_style_class_name(this.method);
    }

    /**
     * Bind events
     *
     * @return {Void}
     */
    _bind() {
        this.connect('activate', this._handleActivate.bind(this));
    }

    /**
     * Activate event handler
     *
     * @param  {Menu.Command}  widget
     * @param  {Clutter.Event} event
     * @return {Void}
     */
    _handleActivate(widget, event) {
        this.emit('execute');
    }

    /**
     * Property method getter
     *
     * @return {String}
     */
    get method() {
        return this._method;
    }

    /**
     * Property method getter
     *
     * @param  {String} value
     * @return {Void}
     */
    set method(value) {
        this._method = value;
    }

    /* --- */

});

/**
 * Menu.Header constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Header = GObject.registerClass(class Header extends PopupMenuItem {
    /**
     * Constructor
     *
     * @param  {String} title
     * @return {Void}
     */
    _init(title) {
        super._init(title);

        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-header');
        this.setSensitive(false);
    }

    /* --- */

});
