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
        notebook.append_page(this._page_vagrant(), new Gtk.Label({ label: _("Vagrant"), }));
        notebook.append_page(this._page_system(), new Gtk.Label({ label: _("System"), }));
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

        this.ui.settings.notifications = new InputSwitch('notifications', this.settings.get_boolean('notifications'), _("Show notifications"), _("Display notification on vagrant machine state change"));
        this.ui.settings.notifications.name = 'gnome-vagrant-prefs-page-settings-notifications';
        this.ui.settings.notifications.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.settings.page.actor.add(this.ui.settings.notifications);

        this.ui.settings.machinefullpath = new InputSwitch('machine-full-path', this.settings.get_boolean('machine-full-path'), _("Show machine full path"), _("Show machine full path as instance name"));
        this.ui.settings.machinefullpath.name = 'gnome-vagrant-prefs-page-settings-machine-full-path';
        this.ui.settings.machinefullpath.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.settings.page.actor.add(this.ui.settings.machinefullpath);

        this.ui.settings.postterminalaction = new InputComboBox('post-terminal-action', this.settings.get_string('post-terminal-action'), _("Post terminal action"), _("Vagrant terminal action after `vagrant` command execution"), { 'NONE': _("Leave opened"), /*'PAUSE': _("Wait for keypress"),*/ 'EXIT': _("Close"), 'ALL': _("Wait for keypress and close") });
        this.ui.settings.postterminalaction.name = 'gnome-vagrant-prefs-page-settings-post-terminal-action';
        this.ui.settings.postterminalaction.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.settings.page.actor.add(this.ui.settings.postterminalaction);

        return this.ui.settings.page;
    },

    /**
     * Create new vagrant page
     *
     * @return {Object}
     */
    _page_vagrant: function() {
        this.ui.vagrant = {};
        this.ui.vagrant.page = this._page();
        this.ui.vagrant.page.get_style_context().add_class('gnome-vagrant-prefs-page-vagrant');

        this.ui.vagrant.up = new InputSwitch('vagrant-up', this.settings.get_boolean('vagrant-up'), _("Up"), _("Display menu for `vagrant up` command"));
        this.ui.vagrant.up.name = 'gnome-vagrant-prefs-page-vagrant-up';
        this.ui.vagrant.up.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.up);

        this.ui.vagrant.upprovision = new InputSwitch('vagrant-up-provision', this.settings.get_boolean('vagrant-up-provision'), _("Up and Provision"), _("Display menu for `vagrant up --provision` command"));
        this.ui.vagrant.upprovision.name = 'gnome-vagrant-prefs-page-vagrant-up-provision';
        this.ui.vagrant.upprovision.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.upprovision);

        this.ui.vagrant.upssh = new InputSwitch('vagrant-up-ssh', this.settings.get_boolean('vagrant-up-ssh'), _("Up and SSH"), _("Display menu for `vagrant up; vagrant ssh` command"));
        this.ui.vagrant.upssh.name = 'gnome-vagrant-prefs-page-vagrant-up-ssh';
        this.ui.vagrant.upssh.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.upssh);

        this.ui.vagrant.uprdp = new InputSwitch('vagrant-up-rdp', this.settings.get_boolean('vagrant-up-rdp'), _("Up and RPD"), _("Display menu for `vagrant up; vagrant rdp` command"));
        this.ui.vagrant.uprdp.name = 'gnome-vagrant-prefs-page-vagrant-up-rdp';
        this.ui.vagrant.uprdp.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.uprdp);

        this.ui.vagrant.provision = new InputSwitch('vagrant-provision', this.settings.get_boolean('vagrant-provision'), _("Provision"), _("Display menu for `vagrant provision` command"));
        this.ui.vagrant.provision.name = 'gnome-vagrant-prefs-page-vagrant-provision';
        this.ui.vagrant.provision.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.provision);

        this.ui.vagrant.ssh = new InputSwitch('vagrant-ssh', this.settings.get_boolean('vagrant-ssh'), _("SSH"), _("Display menu for `vagrant ssh` command"));
        this.ui.vagrant.ssh.name = 'gnome-vagrant-prefs-page-vagrant-ssh';
        this.ui.vagrant.ssh.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.ssh);

        this.ui.vagrant.rdp = new InputSwitch('vagrant-rdp', this.settings.get_boolean('vagrant-rdp'), _("RDP"), _("Display menu for `vagrant rdp` command"));
        this.ui.vagrant.rdp.name = 'gnome-vagrant-prefs-page-vagrant-rdp';
        this.ui.vagrant.rdp.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.rdp);

        this.ui.vagrant.resume = new InputSwitch('vagrant-resume', this.settings.get_boolean('vagrant-resume'), _("Resume"), _("Display menu for `vagrant resume` command"));
        this.ui.vagrant.resume.name = 'gnome-vagrant-prefs-page-vagrant-resume';
        this.ui.vagrant.resume.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.resume);

        this.ui.vagrant.suspend = new InputSwitch('vagrant-suspend', this.settings.get_boolean('vagrant-suspend'), _("Suspend"), _("Display menu for `vagrant suspend` command"));
        this.ui.vagrant.suspend.name = 'gnome-vagrant-prefs-page-vagrant-suspend';
        this.ui.vagrant.suspend.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.suspend);

        this.ui.vagrant.halt = new InputSwitch('vagrant-halt', this.settings.get_boolean('vagrant-halt'), _("Halt"), _("Display menu for `vagrant halt` command"));
        this.ui.vagrant.halt.name = 'gnome-vagrant-prefs-page-vagrant-halt';
        this.ui.vagrant.halt.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.halt);

        this.ui.vagrant.destroy = new InputSwitch('vagrant-destroy', this.settings.get_boolean('vagrant-destroy'), _("Destroy"), _("Display menu for `vagrant destroy` command"));
        this.ui.vagrant.destroy.name = 'gnome-vagrant-prefs-page-vagrant-destroy';
        this.ui.vagrant.destroy.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.destroy);

        return this.ui.vagrant.page;
    },

    /**
     * Create new system page
     *
     * @return {Object}
     */
    _page_system: function() {
        this.ui.system = {};
        this.ui.system.page = this._page();
        this.ui.system.page.get_style_context().add_class('gnome-vagrant-prefs-page-system');

        this.ui.system.terminal = new InputSwitch('system-terminal', this.settings.get_boolean('system-terminal'), _("Open in Terminal"), _("Display Open in Terminal system menu"));
        this.ui.system.terminal.name = 'gnome-system-prefs-page-system-terminal';
        this.ui.system.terminal.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.system.page.actor.add(this.ui.system.terminal);

        this.ui.system.file_manager = new InputSwitch('system-file-manager', this.settings.get_boolean('system-file-manager'), _("Open in File Manager"), _("Display Open in File Manager system menu"));
        this.ui.system.file_manager.name = 'gnome-system-prefs-page-system-file-manager';
        this.ui.system.file_manager.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.system.page.actor.add(this.ui.system.file_manager);

        this.ui.system.vagrantfile = new InputSwitch('system-vagrantfile', this.settings.get_boolean('system-vagrantfile'), _("Edit Vagrantfile"), _("Display Edit Vagrantfile system menu"));
        this.ui.system.vagrantfile.name = 'gnome-system-prefs-page-system-vagrantfile';
        this.ui.system.vagrantfile.connect('changed', Lang.bind(this, this._handle_widget));
        this.ui.system.page.actor.add(this.ui.system.vagrantfile);

        return this.ui.system.page;
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

        this.ui.about.desc = new Label({ label: Me.metadata.description_html || Me.metadata.description, });
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

        this.ui.about.license = new Label({ label: Me.metadata.license_html || Me.metadata.license, });
        this.ui.about.license.get_style_context().add_class('gnome-vagrant-prefs-page-about-license');
        this.ui.about.page.actor.pack_end(this.ui.about.license, false, false, 0);

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

/**
 * InputComboBox constructor
 * extends Gtk.Box
 *
 * @param  {Object}
 * @return {Object}
 */
const InputComboBox = new GObject.Class({

    Name: 'Prefs.InputComboBox',
    GTypeName: 'PrefsInputComboBox',
    Extends: Input,

    /**
     * ComboBox initialization
     *
     * @param  {String} key
     * @param  {Mixed}  value
     * @param  {String} text
     * @param  {String} tooltip
     * @param  {Object} options
     * @return {Void}
     */
    _init: function(key, value, text, tooltip, options) {
        this.parent(key, text, tooltip);

        this._widget = new Gtk.ComboBoxText();
        this._widget.connect('notify::active', Lang.bind(this, this._handle_change));
        this.actor.add(this._widget);

        for (let id in options) {
            this._widget.append(id, options[id]);
        }

        this.value = value;
    },

    /**
     * Widget change event handler
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handle_change: function(widget) {
        this.emit('changed', {
            key: this._key,
            value: this.value,
            type: 'string'
        });
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.get_active_id();
    },

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.set_active_id(value);
    },

    /* --- */

});
