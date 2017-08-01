/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// import modules
const Lang = imports.lang;
const Signals = imports.signals;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Icons = Me.imports.icons;
const Helper = Me.imports.helper;
const _ = Helper.translate;

/**
 * Extension preferences initialization
 *
 * @return {Void}
 */
function init() {
    Convenience.initTranslations();
}

/**
 * Extension preferences build widget
 *
 * @return {Void}
 */
function buildPrefsWidget() {
    return new Widget();
}

/**
 * Widget constructor
 * extends Gtk.Box
 *
 * @param  {Object}
 * @return {Object}
 */
const Widget = new GObject.Class({

    Name: 'Prefs.Widget',
    GTypeName: 'Widget',
    Extends: Gtk.Box,

    /**
     * Widget initialization
     *
     * @return {Void}
     */
    _init: function() {
        this.parent({ orientation: Gtk.Orientation.VERTICAL, });

        this._def();
        this._ui();
    },

    /**
     * Initialize object properties
     *
     * @return {Void}
     */
    _def: function() {
        this.settings = Convenience.getSettings();
        //this.settings.connect('changed', Lang.bind(this, this._handle_settings));
    },

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui: function() {
        let css = new Gtk.CssProvider();
        css.load_from_path(Me.path + '/prefs.css');
        Gtk.StyleContext.add_provider_for_screen( Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION );

        let notebook = new Gtk.Notebook();
        this.ui = {};
        notebook.append_page(this._page_settings(), new Gtk.Label({ label: _("Settings"), }));
        notebook.append_page(this._page_menu(), new Gtk.Label({ label: _("Menu"), }));
        notebook.append_page(this._page_about(), new Gtk.Label({ label: _("About"), }));
        this.add(notebook);

        this.show_all();
    },

    /**
     * Create new page
     *
     * @return {Object}
     */
    _page: function() {
        let page = new Box();
        page.expand = true;
        page.get_style_context().add_class('gnome-vagrant-prefs-page');

        return page;
    },

    /**
     * Create new settings page
     *
     * @return {Object}
     */
    _page_settings: function() {
        this.ui.settings = {};
        this.ui.settings.page = this._page();
        this.ui.settings.page.get_style_context().add_class('gnome-vagrant-prefs-page-settings');

        this.ui.settings.notifications = new InputSwitch('notifications', this.settings.get_boolean('notifications'), _("Show notifications"), _("Display notification vagrant machine state change"));
        this.ui.settings.notifications.name = 'gnome-vagrant-prefs-page-settings-notifications';
        this.ui.settings.notifications.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.settings.page.actor.add(this.ui.settings.notifications);

        return this.ui.settings.page;
    },

    /**
     * Create new channels page
     *
     * @return {Object}
     */
    _page_menu: function() {
        this.ui.menu = {};
        this.ui.menu.page = this._page();
        this.ui.menu.page.get_style_context().add_class('gnome-vagrant-prefs-page-menu');

        this.ui.menu.up = new InputSwitch('menu-up', this.settings.get_boolean('menu-up'), _("Up"), _("Display menu for `vagrant up` command"));
        this.ui.menu.up.name = 'gnome-vagrant-prefs-page-menu-up';
        this.ui.menu.up.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.up);

        this.ui.menu.provision = new InputSwitch('menu-provision', this.settings.get_boolean('menu-provision'), _("Provision"), _("Display menu for `vagrant provision` command"));
        this.ui.menu.provision.name = 'gnome-vagrant-prefs-page-menu-provision';
        this.ui.menu.provision.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.provision);

        this.ui.menu.ssh = new InputSwitch('menu-ssh', this.settings.get_boolean('menu-ssh'), _("SSH"), _("Display menu for `vagrant ssh` command"));
        this.ui.menu.ssh.name = 'gnome-vagrant-prefs-page-menu-ssh';
        this.ui.menu.ssh.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.ssh);

        this.ui.menu.rdp = new InputSwitch('menu-rdp', this.settings.get_boolean('menu-rdp'), _("RDP"), _("Display menu for `vagrant rdp` command"));
        this.ui.menu.rdp.name = 'gnome-vagrant-prefs-page-menu-rdp';
        this.ui.menu.rdp.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.rdp);

        this.ui.menu.resume = new InputSwitch('menu-resume', this.settings.get_boolean('menu-resume'), _("Resume"), _("Display menu for `vagrant resume` command"));
        this.ui.menu.resume.name = 'gnome-vagrant-prefs-page-menu-resume';
        this.ui.menu.resume.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.resume);

        this.ui.menu.suspend = new InputSwitch('menu-suspend', this.settings.get_boolean('menu-suspend'), _("Suspend"), _("Display menu for `vagrant suspend` command"));
        this.ui.menu.suspend.name = 'gnome-vagrant-prefs-page-menu-suspend';
        this.ui.menu.suspend.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.suspend);

        this.ui.menu.halt = new InputSwitch('menu-halt', this.settings.get_boolean('menu-halt'), _("Halt"), _("Display menu for `vagrant halt` command"));
        this.ui.menu.halt.name = 'gnome-vagrant-prefs-page-menu-halt';
        this.ui.menu.halt.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.halt);

        this.ui.menu.destroy = new InputSwitch('menu-destroy', this.settings.get_boolean('menu-destroy'), _("Destroy"), _("Display menu for `vagrant destroy` command"));
        this.ui.menu.destroy.name = 'gnome-vagrant-prefs-page-menu-destroy';
        this.ui.menu.destroy.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.menu.page.actor.add(this.ui.menu.destroy);

        return this.ui.menu.page;
    },

    /**
     * Create new about page
     *
     * @return {Object}
     */
    _page_about: function() {
        this.ui.about = {};
        this.ui.about.page = this._page();
        this.ui.about.page.get_style_context().add_class('gnome-vagrant-prefs-page-about');

        this.ui.about.title = new Label({ label: Me.metadata.name, });
        this.ui.about.title.get_style_context().add_class('gnome-vagrant-prefs-page-about-title');
        this.ui.about.page.actor.add(this.ui.about.title);

        let ico = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/assets/gnome-vagrant-indicator-symbolic.svg', 64, 64, null);
        this.ui.about.icon = Gtk.Image.new_from_pixbuf(ico);
        this.ui.about.icon.get_style_context().add_class('gnome-vagrant-prefs-page-about-icon');
        this.ui.about.page.actor.add(this.ui.about.icon);

        this.ui.about.desc = new Label({ label: Me.metadata.description, });
        this.ui.about.desc.get_style_context().add_class('gnome-vagrant-prefs-page-about-description');
        this.ui.about.page.actor.add(this.ui.about.desc);

        this.ui.about.version = new Label({ label: _("Version") + ': ' + Me.metadata.version, });
        this.ui.about.version.get_style_context().add_class('gnome-vagrant-prefs-page-about-version');
        this.ui.about.page.actor.add(this.ui.about.version);

        this.ui.about.author = new Label({ label: Me.metadata.maintainer + ' <a href="mailto:' + Me.metadata.email + '">&lt;' + Me.metadata.email + '&gt;</a>', });
        this.ui.about.author.get_style_context().add_class('gnome-vagrant-prefs-page-about-author');
        this.ui.about.page.actor.add(this.ui.about.author);

        this.ui.about.webpage = new Label({ label: '<a href="' + Me.metadata.url + '">' + Me.metadata.url + '</a>', });
        this.ui.about.webpage.get_style_context().add_class('gnome-vagrant-prefs-page-about-webpage');
        this.ui.about.page.actor.add(this.ui.about.webpage);

        return this.ui.about.page;
    },

    /**
     * Bind events
     *
     * @return {Void}
     */
    _bind: function() {
        this.connect('destroy', Lang.bind(this, this._handle_destroy));
    },

    /**
     * Widget destroy event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_destroy: function(widget, event) {
        if (this.settings)
            this.settings.run_dispose();
    },

    _handle_widget: function(widget, event) {
        let old_value = this.settings['get_' + event.type](event.key);

        if (old_value != event.value)
            this.settings['set_' + event.type](event.key, event.value);
    },

    /**
     * Settings changed event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handle_settings: function(widget, event) {
        // pass
    },

    /* --- */

});

/**
 * Box constructor
 * extends Gtk.Frame
 *
 * used so we can use padding
 * property in css
 *
 * to add widget to Box use
 * actor
 *
 * @param  {Object}
 * @return {Object}
 */
const Box = new GObject.Class({

    Name: 'Prefs.Box',
    GTypeName: 'PrefsBox',
    Extends: Gtk.Frame,

    _init: function() {
        this.parent();

        this.actor = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, });
        this.actor.get_style_context().add_class('actor');
        this.add(this.actor);
    },

    /* --- */

});

/**
 * Label constructor
 * extends Gtk.Label
 *
 * just a common Gtk.Label object
 * with markup and line wrap
 *
 * @param  {Object}
 * @return {Object}
 */
const Label = new GObject.Class({

    Name: 'Prefs.Label',
    GTypeName: 'PrefsLabel',
    Extends: Gtk.Label,

    /**
     * Constructor
     *
     * @param  {Object} options (optional)
     * @return {Void}
     */
    _init: function(options) {
        let o = options || {};
        if (!('label' in options)) o.label = 'undefined';

        this.parent(o);
        this.set_markup(this.get_text());
        this.set_line_wrap(true);
        this.set_justify(Gtk.Justification.CENTER);
    },

    /* --- */

});

/**
 * Input constructor
 * extends Box
 *
 * horizontal Gtk.Box object with label
 * and widget for editing settings
 *
 * @param  {Object}
 * @return {Object}
 */
const Input = new GObject.Class({

    Name: 'Prefs.Input',
    GTypeName: 'PrefsInput',
    Extends: Box,

    /**
     * Constructor
     *
     * @param  {String} key
     * @param  {String} text
     * @param  {String} tooltip
     * @return {Void}
     */
    _init: function(key, text, tooltip) {
        this.parent();
        this.actor.set_orientation(Gtk.Orientation.HORIZONTAL);

        this._key = key;
        this._label = new Gtk.Label({ label: text, xalign: 0, tooltip_text: tooltip || '' });
        this._widget = null;

        this.actor.pack_start(this._label, true, true, 0);
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.value;
    },

    /**
     * Value setter
     *
     * @param  {Mixed} value
     * @return {Void}
     */
    set value(value) {
        this._widget.value = value;
    },

    /**
     * Input change event handler
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handle_change: function(widget) {
        this.emit('changed', {
            key: this._key,
            value: widget.value,
            type: typeof widget.value,
        });
    },

    /* --- */

});

Signals.addSignalMethods(Input.prototype);


/**
 * InputSwitch constructor
 * extends Input
 *
 * @param  {Object}
 * @return {Object}
 */
const InputSwitch = new GObject.Class({

    Name: 'Prefs.InputSwitch',
    GTypeName: 'PrefsInputSwitch',
    Extends: Input,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function(key, value, text, tooltip) {
        this.parent(key, text, tooltip);

        this._widget = new Gtk.Switch({ active: value });
        this._widget.connect('notify::active', Lang.bind(this, this._handle_change));
        this.actor.add(this._widget);
    },

    /**
     * Input change event handler
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handle_change: function(widget) {
        this.emit('changed', {
            key: this._key,
            value: widget.active,
            type: 'boolean',
        });
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.active;
    },

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.active = value;
    },

    /* --- */

});
