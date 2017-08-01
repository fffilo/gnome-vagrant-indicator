/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Signals = imports.signals;
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
        this.monitor.connect('state', Lang.bind(this, this._handle_monitor));
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

        for (let id in this.monitor.machine) {
            let machine = this.monitor.machine[id];
            this.machine.add(id, machine.vagrantfile_path, machine.state);
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
        if (key.substr(0, 5) === 'menu-')
            this.refresh();
    },

    /**
     * Monitor machine index file change event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_monitor: function(widget, event) {
        this.refresh();

        if (!this.settings.get_boolean('notifications'))
            return;

        let machine = this.monitor.machine[event.id];
        this.notification.show('Machine went %s'.format(machine.state), machine.vagrantfile_path);
    },

    /**
     * Machines item click event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_machines: function(widget, event) {
        this.monitor[event.method](event.id);
    },

    /**
     * Preferences click event handler
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
     * @return {Void}
     */
    add: function(id, path, state) {
        if (this.empty)
            this.empty.destroy();
        this.empty = null;

        let item = new PopupMenu.PopupSubMenuMenuItem(path);
        item.id = id;
        item.actor.add_style_class_name('gnome-vagrant-indicator-machine-item');
        item.actor.add_style_class_name(state);
        item.setOrnament(PopupMenu.Ornament.DOT);
        this.addMenuItem(item);

        let settings = this.indicator.settings;
        let menu = [
            'terminal', _("Open in Terminal"),
            'nautilus', _("Open in Nautilus"),
            'vagrantfile', _("Edit Vagrantfile"),
            '', '---',
        ];
        if (settings.get_boolean('menu-up')) menu = menu.concat([ 'up', _("Up") ]);
        if (settings.get_boolean('menu-provision')) menu = menu.concat([ 'provision', _("Provision") ]);
        if (settings.get_boolean('menu-ssh')) menu = menu.concat([ 'ssh', _("SSH") ]);
        if (settings.get_boolean('menu-rdp')) menu = menu.concat([ 'rdp', _("RDP") ]);
        if (settings.get_boolean('menu-resume')) menu = menu.concat([ 'resume', _("Resume") ]);
        if (settings.get_boolean('menu-suspend')) menu = menu.concat([ 'suspend', _("Suspend") ]);
        if (settings.get_boolean('menu-halt')) menu = menu.concat([ 'halt', _("Halt") ]);
        if (settings.get_boolean('menu-destroy')) menu = menu.concat([ 'destroy', _("Destroy") ]);

        for (let i = 0; i < menu.length; i += 2) {
            let subitem;
            if (menu[i]) {
                subitem = new PopupMenu.PopupMenuItem(menu[i + 1]);
                subitem.id = id;
                subitem.method = menu[i];
                subitem.actor.add_style_class_name('gnome-vagrant-indicator-machine-item-subitem');
                subitem.actor.add_style_class_name(subitem.method);
                subitem.connect('activate', Lang.bind(this, this._handle_menu_item));
            }
            else {
                subitem = new PopupMenu.PopupSeparatorMenuItem();
                subitem._separator.add_style_class_name('gnome-vagrant-indicator-machine-item-separator');
            }

            item.menu.addMenuItem(subitem);
        }
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
     * Subitem click event handler
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

Signals.addSignalMethods(MachineMenu.prototype);

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
