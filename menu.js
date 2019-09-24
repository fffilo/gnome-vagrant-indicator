/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const PopupMenu = imports.ui.popupMenu;
const {GLib, GObject, Clutter} = imports.gi;
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
 * @return {Object}
 */
var Machine = class Machine extends PopupMenuSection {
    /**
     * Constructor
     *
     * @return {void}
     */
    constructor() {
        super();

        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-machine');

        this._shorten = false;
        this._display_vagrant = Enum.sum(DisplayVagrant);
        this._display_system = Enum.sum(DisplaySystem);

        this.clear();
    }

    /**
     * Empty list
     *
     * @return {void}
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
     * @param  {String} msg
     * @return {void}
     */
    error(msg) {
        this.removeAll();

        this.empty = new PopupMenuItem(msg || 'ERROR');
        this.empty.setSensitive(false);
        this.addMenuItem(this.empty);
    }

    /**
     * Add item to list
     *
     * @param  {String} id
     * @param  {String} path
     * @param  {String} state
     * @param  {Number} index (optional)
     * @return {void}
     */
    add(id, path, state, index) {
        if (this.empty)
            this.empty.destroy();
        this.empty = null;

        let item = new Path(id, path, state);
        item.shorten = this.shorten;
        item.setDisplayVagrant(this.getDisplayVagrant());
        item.setDisplaySystem(this.getDisplaySystem());
        item.connect('system', this._handle_system.bind(this));
        item.connect('vagrant', this._handle_vagrant.bind(this));
        this.addMenuItem(item, index);
    }

    /**
     * Remove item from list
     *
     * @return {void}
     */
    remove(id) {
        this._get_item(id).forEach(function(actor) {
            actor.destroy();
        });

        if (!this._get_item().length)
            this.clear();
    }

    /**
     * Set item state
     *
     * @param  {String} id
     * @param  {String} value
     * @return {void}
     */
    state(id, value) {
        this._get_item(id).forEach(function(actor) {
            actor.actor.remove_style_class_name(actor.state);
            actor.actor.add_style_class_name(value);
            actor.state = value;
        });
    }

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @return {Number}
     */
    getDisplayVagrant() {
        return this._display_vagrant;
    }

    /**
     * Set DisplayVagrant
     *
     * @param  {Number} value
     * @return {void}
     */
    setDisplayVagrant(value) {
        if (value < Enum.min(DisplayVagrant))
            value = Enum.min(DisplayVagrant);
        else if (value > Enum.sum(DisplayVagrant))
            value = Enum.sum(DisplayVagrant);

        this._display_vagrant = value;

        this._get_item().forEach(function(actor) {
            actor.setDisplayVagrant(value);
        });
    }

    /**
     * Get DisplaySystem:
     * display system menu subitems
     * from DisplaySystem enum
     *
     * @return {Number}
     */
    getDisplaySystem() {
        return this._display_system;
    }

    /**
     * Set DisplaySystem
     *
     * @param  {Number} value
     * @return {void}
     */
    setDisplaySystem(value) {
        if (value < Enum.min(DisplaySystem))
            value = Enum.min(DisplaySystem);
        else if (value > Enum.sum(DisplaySystem))
            value = Enum.sum(DisplaySystem);

        this._display_system = value;

        this._get_item().forEach(function(actor) {
            actor.setDisplaySystem(value);
        });
    }

    /**
     * Property shorten getter
     *
     * @return {Boolean}
     */
    get shorten() {
        return this._shorten;
    }

    /**
     * Property shorten setter
     *
     * @param  {Boolean} value
     * @return {void}
     */
    set shorten(value) {
        this._shorten = !!value;

        this._get_item().forEach(function(actor) {
            actor.shorten = value;
        });
    }

    /**
     * Get submenu item from menu list
     *
     * @param  {String} id (optional)
     * @return {Object}
     */
    _get_item(id) {
        return this.box.get_children()
            .map(function(actor) {
                return actor._delegate;
            })
            .filter(function(actor) {
                return actor instanceof Path && (id ? actor.id === id : true);
            });
    }

    /**
     * Menu subitem (system command)
     * execute event handler
     *
     * @param  {Object} widget
     * @param  {GLib.Variant} object
     * @return {void}
     */
    _handle_system(widget, object) {
        let unpack = object.recursiveUnpack();
        this.emit('system', unpack);
    }

    /**
     * Menu subitem (vagrant command)
     * execute event handler
     *
     * @param  {Object} widget
     * @param  {GLib.Variant} object
     * @return {void}
     */
    _handle_vagrant(widget, object) {
        let unpack = object.recursiveUnpack();
        this.emit('vagrant', unpack);
    }

    /* --- */

};

/**
 * Menu.Path constructor
 *
 * @param  {Object}
 * @return {Object}
 */
var Path = GObject.registerClass({
    Signals: {
        'system': { param_types: [ GObject.TYPE_VARIANT ] },
        'vagrant': { param_types: [ GObject.TYPE_VARIANT ] },
    }
}, class Path extends PopupSubMenuMenuItem {
    /**
     * Constructor
     *
     * @param  {String} id
     * @param  {String} path
     * @param  {String} state
     * @return {void}
     */
    _init(id, path, state) {
        super._init('unknown');

        this._id = id;
        this._path = path;
        this._state = 'unknown';
        this._shorten = true;
        this._display_system = null;

        this._ui();
        this._bind();

        this.setDisplayVagrant(DisplayVagrant.NONE);
        this.setDisplaySystem(DisplaySystem.NONE);

        this.state = state;
        this.shorten = false;
    }

    /**
     * Create user interface
     *
     * @return {void}
     */
    _ui() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-path');
        this.menu.actor.add_style_class_name('gnome-vagrant-indicator-menu-submenu');
        this.setOrnament(PopupMenu.Ornament.DOT);

        this._ui_vagrant();
        this._ui_system();
    }

    /**
     * Create user interface for
     * vagrant commands menu
     *
     * @return {void}
     */
    _ui_vagrant() {
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
            item.connect('execute', this._handle_vagrant.bind(this));
            this.menu.addMenuItem(item);
            this.vagrant[id] = item;
        }
    }

    /**
     * Create user interface for
     * system commands menu
     *
     * @return {void}
     */
    _ui_system() {
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
            item.connect('execute', this._handle_system.bind(this));
            this.menu.addMenuItem(item);
            this.system[id] = item;
        }
    }

    /**
     * Bind events
     *
     * @return {void}
     */
    _bind() {
        this.connect('activate', this._handle_activate.bind(this));
    }

    /**
     * Get DisplayVagrant:
     * display vagrant menu subitems
     * from DisplayVagrant enum
     *
     * @return {Number}
     */
    getDisplayVagrant() {
        return this._display_vagrant;
    }

    /**
     * Set DisplayVagrant
     *
     * @param  {Number} value
     * @return {void}
     */
    setDisplayVagrant(value) {
        if (value < Enum.min(DisplayVagrant))
            value = Enum.min(DisplayVagrant);
        else if (value > Enum.sum(DisplayVagrant))
            value = Enum.sum(DisplayVagrant);

        this._display_vagrant = value;

        this._refresh_menu();
    }

    /**
     * Get DisplaySystem:
     * display system menu subitems
     * from DisplaySystem enum
     *
     * @return {Number}
     */
    getDisplaySystem() {
        return this._display_system;
    }

    /**
     * Set DisplaySystem
     *
     * @param  {Number} value
     * @return {void}
     */
    setDisplaySystem(value) {
        if (value < Enum.min(DisplaySystem))
            value = Enum.min(DisplaySystem);
        else if (value > Enum.sum(DisplaySystem))
            value = Enum.sum(DisplaySystem);

        this._display_system = value;

        this._refresh_menu();
    }

    /**
     * Act like PopupMenu.PopupMenuItem
     * when submenu is empty
     *
     * @param  {Booelan} open
     * @return {void}
     */
    setSubmenuShown(open) {
        super.setSubmenuShown(open);

        if (!this.system.header.actor.visible && !this.vagrant.header.actor.visible)
            this.emit('activate');
    }

    /**
     * Property shorten getter
     *
     * @return {Boolean}
     */
    get shorten() {
        return this._shorten;
    }

    /**
     * Property shorten setter
     *
     * @param  {Boolean} value
     * @return {void}
     */
    set shorten(value) {
        this._shorten = !!value;

        let path = this.path;
        if (this.shorten)
            path = GLib.basename(path);

        this.label.text = path;
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
     * @return {void}
     */
    set state(value) {
        this.actor.remove_style_class_name(this.state);
        this.actor.add_style_class_name(value);

        this._state = value;

        this._refresh_menu();
    }

    /**
     *
     * Show/hide system/vagrant menu
     * items
     *
     * @return {void}
     */
    _refresh_menu() {
        this._refresh_menu_by_display();
        this._refresh_menu_by_state();
        this._refresh_menu_dropdown();
        this._refresh_menu_headers();
    }

    /**
     * Show/hide system/vagrant menu
     * items based on user display
     * property
     *
     * @return {void}
     */
    _refresh_menu_by_display() {
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
    }

    /**
     * Hide vagrant menu items based
     * on virtual machine state
     *
     * @return {void}
     */
    _refresh_menu_by_state() {
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
    }

    /**
     * Show/hide dropdown arrow
     *
     * @return {void}
     */
    _refresh_menu_dropdown() {
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
     * @return {void}
     */
    _refresh_menu_headers() {
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
     * @return {Object}
     */
    _get_item(method) {
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
     * @param  {Object} widget
     * @param  {Clutter.Event.$gtype} event
     * @return {void}
     */
    _handle_activate(widget, event) {
        let data = new GLib.Variant('a{sv}', {
            'id': new GLib.Variant('s', this.id),
            'command': new GLib.Variant('i', Vagrant.CommandSystem.TERMINAL),
        });
        this.emit('system', data);
    }

    /**
     * Menu subitem (system command)
     * execute event handler
     *
     * @param  {Object} widget
     * @return {void}
     */
    _handle_system(widget) {
        let data = new GLib.Variant('a{sv}', {
            'id': new GLib.Variant('s', this.id),
            'command': new GLib.Variant('i', widget.command),
        });
        this.emit('system', data);
    }

    /**
     * Menu subitem (vagrant command)
     * execute event handler
     *
     * @param  {Object} widget
     * @return {void}
     */
    _handle_vagrant(widget) {
        let data = new GLib.Variant('a{sv}', {
            'id': new GLib.Variant('s', this.id),
            'command': new GLib.Variant('i', widget.command),
        });
        this.emit('vagrant', data);
    }

    /* --- */

});

/**
 * Menu.Command constructor
 *
 * @param  {Object}
 * @return {Object}
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
     * @return {void}
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
     * @return {void}
     */
    _def() {
        this._method = 'unknown';
    }

    /**
     * Create user interface
     *
     * @return {void}
     */
    _ui() {
        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-command');
        this.actor.add_style_class_name(this.method);
    }

    /**
     * Bind events
     *
     * @return {void}
     */
    _bind() {
        this.connect('activate', this._handle_activate.bind(this));
    }

    /**
     * Activate event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {void}
     */
    _handle_activate(widget, event) {
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
     * @return {void}
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
 * @return {Object}
 */
var Header = GObject.registerClass(class Header extends PopupMenuItem {
    /**
     * Constructor
     *
     * @param  {String} title
     * @return {void}
     */
    _init(title) {
        super._init(title);

        this.actor.add_style_class_name('gnome-vagrant-indicator-menu-header');
        this.setSensitive(false);
    }

    /* --- */

});
