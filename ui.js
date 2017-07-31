/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Signals = imports.signals;
const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Icons = Me.imports.icons;
const Helper = Me.imports.helper;
const Vagrant = Me.imports.vagrant;
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
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.monitor.unlisten();
        this.parent();
    },

    _def: function() {
        // to do: settings

        this.monitor = new Vagrant.Monitor();
        this.monitor.listen();
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this.actor.add_style_class_name('panel-status-button');

        this.icon = new St.Icon({
            icon_name: Icons.DEFAULT,
            style_class: 'system-status-icon',
        });
        this.actor.add_actor(this.icon);

        this.machines = new Machines(this);
        this.machines.connect('click', Lang.bind(this, this._handle_machines));

        this.preferences = new PopupMenu.PopupMenuItem(_("Preferences"));
        this.preferences.connect('activate', Lang.bind(this, this._handle_preferences));
        this.menu.addMenuItem(this.preferences);

        // refresh machines menu
    },

    /**
     * Handle machines item click
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_machines: function(widget, event) {

    },

    /**
     * Handle preferences click
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_preferences: function(widget, event) {

    },

    /* --- */

});

/**
 * Ui.Machines constructor
 *
 * @param  {Object}
 * @return {Object}
 */
const Machines = new Lang.Class({

    Name: 'Ui.Machines',
    Extends: PopupMenu.PopupMenuSection,

    /**
     * Constructor
     *
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

        let item = new PopupMenu.PopupMenuItem(_("No Vagrant machines found"));
        item.setSensitive(false);
        this.addMenuItem(item);
    },

    /**
     * Add item to list
     *
     * @return {Void}
     */
    add: function() {

    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        this.indicator.menu.addMenuItem(this);
        this.indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    },

    /**
     * Handle subitem click
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_menu_item: function(widget, event) {
        this.emit('click', {
            title: widget.label.text,
            url: widget.url,
        });
    },

    /* --- */

});

Signals.addSignalMethods(Machines.prototype);
