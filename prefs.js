/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Import modules.
const Signals = imports.signals;
const Mainloop = imports.mainloop;
const {GObject, Gtk, Gdk, GdkPixbuf} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Icons = Me.imports.icons;
const Settings = Me.imports.settings;
const Translation = Me.imports.translation;
const Vagrant = Me.imports.vagrant;
const _ = Translation.translate;

/**
 * Extension preferences initialization.
 *
 * @return {Void}
 */
function init() {
    Translation.init();
}

/**
 * Extension preferences build widget.
 *
 * @return {Void}
 */
function buildPrefsWidget() {
    return new Widget();
}

/**
 * Widget extends Gtk.Box.
 */
const Widget = new GObject.Class({
    Name: 'Prefs.Widget',
    GTypeName: 'GnomeVagrantIndicatorPrefsWidget',
    Extends: Gtk.Box,

    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init: function() {
        this.parent({ orientation: Gtk.Orientation.VERTICAL, });

        this._def();
        this._css();
        this._ui();
        this._bind();
    },

    /**
     * Initialize object properties.
     *
     * @return {Void}
     */
    _def: function() {
        this.settings = Settings.settings();
        //this.settings.connect('changed', this._handleSettings.bind(this));
    },

    /**
     * Apply stylesheet.
     *
     * @return {Void}
     */
    _css: function() {
        let provider = new Gtk.CssProvider();
        provider.load_from_path(Me.dir.get_path() + '/prefs.css');
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    },

    /**
     * Create user interface.
     *
     * @return {Void}
     */
    _ui: function() {
        this._ui = {};

        let notebook = new Gtk.Notebook();
        notebook.set_vexpand(true);
        notebook.append_page(this._createPageSettings(), new Gtk.Label({ label: _("Settings"), }));
        notebook.append_page(this._createPageVagrant(), new Gtk.Label({ label: _("Vagrant"), }));
        notebook.append_page(this._createPageSystem(), new Gtk.Label({ label: _("System"), }));
        notebook.append_page(this._createPageAbout(), new Gtk.Label({ label: _("About"), }));
        this.append(notebook);

        if (typeof this.show_all === 'function')
            this.show_all();
    },

    /**
     * Create new page.
     *
     * @return {Object}
     */
    _createNewPage: function() {
        let page = new Box();
        page.set_hexpand(true);
        page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page');

        return page;
    },

    /**
     * Create settings page.
     *
     * @return {Object}
     */
    _createPageSettings: function() {
        this._ui.settings = {};
        this._ui.settings.page = this._createNewPage();
        this._ui.settings.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-settings');

        let desc = _("<i>Refresh machines status</i> will get state of all active Vagrant environments and prune invalid entries from the list. Note that this can be heavy task and can last some time if you have many boxes."),
            label = new Label({ label: desc });
        label.get_style_context().add_class('gnome-vagrant-indicator-prefs-info');
        this._ui.settings.page.actor.append(label);

        this._ui.settings.autoglobalstatusprune = new InputSwitch('auto-global-status-prune', this.settings.get_boolean('auto-global-status-prune'), _("Refresh machines status at startup"), _("Refresh machines status at startup (work in progress)"));
        this._ui.settings.autoglobalstatusprune.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.settings.page.actor.append(this._ui.settings.autoglobalstatusprune);

        this._ui.settings.execglobalstatusprune = new InputButton(_("Execute"), _("Refresh machines status"), _("Refresh machines status"));
        this._ui.settings.execglobalstatusprune.connect('changed', this._handleGlobalStatusPrune.bind(this));
        this._ui.settings.page.actor.append(this._ui.settings.execglobalstatusprune);

        this._ui.settings.page.actor.append(new Separator());

        this._ui.settings.notifications = new InputSwitch('notifications', this.settings.get_boolean('notifications'), _("Show notifications"), _("Display notification on vagrant machine state change"));
        this._ui.settings.notifications.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.settings.page.actor.append(this._ui.settings.notifications);

        this._ui.settings.machinefullpath = new InputSwitch('machine-full-path', this.settings.get_boolean('machine-full-path'), _("Show machine full path"), _("Show machine full path as instance name"));
        this._ui.settings.machinefullpath.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.settings.page.actor.append(this._ui.settings.machinefullpath);

        this._ui.settings.machinename = new InputSwitch('machine-name', this.settings.get_boolean('machine-name'), _("Show machine name"), _("Show machine name next to instance name"));
        this._ui.settings.machinename.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.settings.page.actor.append(this._ui.settings.machinename);

        this._ui.settings.postterminalaction = new InputComboBox('post-terminal-action', this.settings.get_string('post-terminal-action'), _("Post terminal action"), _("Terminal action after vagrant command execution"), { 'NONE': _("Leave opened"), /*'PAUSE': _("Wait for keypress"),*/ 'EXIT': _("Close"), 'BOTH': _("Wait for keypress and close") });
        this._ui.settings.postterminalaction.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.settings.page.actor.append(this._ui.settings.postterminalaction);

        return this._ui.settings.page;
    },

    /**
     * Create vagrant page.
     *
     * @return {Object}
     */
    _createPageVagrant: function() {
        this._ui.vagrant = {};
        this._ui.vagrant.page = this._createNewPage();
        this._ui.vagrant.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-vagrant');

        this._ui.vagrant.up = new InputSwitch('display-vagrant-up', this.settings.get_boolean('display-vagrant-up'), _("Up"), _("Display menu for `vagrant up` command"));
        this._ui.vagrant.up.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.up);

        this._ui.vagrant.upprovision = new InputSwitch('display-vagrant-up-provision', this.settings.get_boolean('display-vagrant-up-provision'), _("Up and Provision"), _("Display menu for `vagrant up --provision` command"));
        this._ui.vagrant.upprovision.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.upprovision);

        this._ui.vagrant.upssh = new InputSwitch('display-vagrant-up-ssh', this.settings.get_boolean('display-vagrant-up-ssh'), _("Up and SSH"), _("Display menu for `vagrant up; vagrant ssh` command"));
        this._ui.vagrant.upssh.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.upssh);

        this._ui.vagrant.uprdp = new InputSwitch('display-vagrant-up-rdp', this.settings.get_boolean('display-vagrant-up-rdp'), _("Up and RPD"), _("Display menu for `vagrant up; vagrant rdp` command"));
        this._ui.vagrant.uprdp.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.uprdp);

        this._ui.vagrant.provision = new InputSwitch('display-vagrant-provision', this.settings.get_boolean('display-vagrant-provision'), _("Provision"), _("Display menu for `vagrant provision` command"));
        this._ui.vagrant.provision.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.provision);

        this._ui.vagrant.ssh = new InputSwitch('display-vagrant-ssh', this.settings.get_boolean('display-vagrant-ssh'), _("SSH"), _("Display menu for `vagrant ssh` command"));
        this._ui.vagrant.ssh.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.ssh);

        this._ui.vagrant.rdp = new InputSwitch('display-vagrant-rdp', this.settings.get_boolean('display-vagrant-rdp'), _("RDP"), _("Display menu for `vagrant rdp` command"));
        this._ui.vagrant.rdp.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.rdp);

        this._ui.vagrant.resume = new InputSwitch('display-vagrant-resume', this.settings.get_boolean('display-vagrant-resume'), _("Resume"), _("Display menu for `vagrant resume` command"));
        this._ui.vagrant.resume.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.resume);

        this._ui.vagrant.suspend = new InputSwitch('display-vagrant-suspend', this.settings.get_boolean('display-vagrant-suspend'), _("Suspend"), _("Display menu for `vagrant suspend` command"));
        this._ui.vagrant.suspend.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.suspend);

        this._ui.vagrant.halt = new InputSwitch('display-vagrant-halt', this.settings.get_boolean('display-vagrant-halt'), _("Halt"), _("Display menu for `vagrant halt` command"));
        this._ui.vagrant.halt.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.halt);

        this._ui.vagrant.destroy = new InputSwitch('display-vagrant-destroy', this.settings.get_boolean('display-vagrant-destroy'), _("Destroy"), _("Display menu for `vagrant destroy` command"));
        this._ui.vagrant.destroy.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.vagrant.page.actor.append(this._ui.vagrant.destroy);

        return this._ui.vagrant.page;
    },

    /**
     * Create system page.
     *
     * @return {Object}
     */
    _createPageSystem: function() {
        this._ui.system = {};
        this._ui.system.page = this._createNewPage();
        this._ui.system.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-system');

        this._ui.system.terminal = new InputSwitch('display-system-terminal', this.settings.get_boolean('display-system-terminal'), _("Open in Terminal"), _("Display Open in Terminal system menu"));
        this._ui.system.terminal.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.system.page.actor.append(this._ui.system.terminal);

        this._ui.system.file_manager = new InputSwitch('display-system-file-manager', this.settings.get_boolean('display-system-file-manager'), _("Open in File Manager"), _("Display Open in File Manager system menu"));
        this._ui.system.file_manager.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.system.page.actor.append(this._ui.system.file_manager);

        this._ui.system.vagrantfile = new InputSwitch('display-system-vagrantfile', this.settings.get_boolean('display-system-vagrantfile'), _("Edit Vagrantfile"), _("Display Edit Vagrantfile system menu"));
        this._ui.system.vagrantfile.connect('changed', this._handleWidgetChange.bind(this));
        this._ui.system.page.actor.append(this._ui.system.vagrantfile);

        return this._ui.system.page;
    },

    /**
     * Create about page.
     *
     * @return {Object}
     */
    _createPageAbout: function() {
        this._ui.about = {};
        this._ui.about.page = this._createNewPage();
        this._ui.about.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about');

        this._ui.about.title = new Label({ label: Me.metadata.name, });
        this._ui.about.title.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-title');
        this._ui.about.page.actor.append(this._ui.about.title);

        let ico = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/assets/%s.svg'.format(Icons.DEFAULT), 64, 64, null);
        this._ui.about.icon = Gtk.Image.new_from_pixbuf(ico);
        this._ui.about.icon.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-icon');
        this._ui.about.page.actor.append(this._ui.about.icon);

        this._ui.about.desc = new Label({ label: Me.metadata['description-html'] || Me.metadata.description, });
        this._ui.about.desc.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-description');
        this._ui.about.page.actor.append(this._ui.about.desc);

        this._ui.about.version = new Label({ label: _("Version") + ': ' + Me.metadata.version, });
        this._ui.about.version.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-version');
        this._ui.about.page.actor.append(this._ui.about.version);

        this._ui.about.author = new Label({ label: Me.metadata['original-author-html'] || Me.metadata['original-author'], });
        this._ui.about.author.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-author');
        this._ui.about.page.actor.append(this._ui.about.author);

        this._ui.about.webpage = new Label({ label: '<a href="' + Me.metadata.url + '">' + Me.metadata.url + '</a>', });
        this._ui.about.webpage.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-webpage');
        this._ui.about.page.actor.append(this._ui.about.webpage);

        this._ui.about.license = new Label({ label: Me.metadata['license-html'] || Me.metadata.license, });
        this._ui.about.license.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-license');
        this._ui.about.page.actor.append(this._ui.about.license);

        return this._ui.about.page;
    },

    /**
     * Bind events.
     *
     * @return {Void}
     */
    _bind: function() {
        this.connect('destroy', this._handleDestroy.bind(this));
    },

    /**
     * Widget destroy event handler.
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleDestroy: function(widget, event) {
        if (this.settings)
            this.settings.run_dispose();
    },

    /**
     * Settings widget change event handler.
     *
     * @param  {String} widget
     * @param  {String} event
     * @return {Void}
     */
    _handleWidgetChange: function(widget, event) {
        let oldValue = this.settings['get_' + event.type](event.key);

        if (oldValue != event.value)
            this.settings['set_' + event.type](event.key, event.value);
    },

    /**
     * Settings widget click event handler.
     *
     * @param  {String} widget
     * @param  {String} event
     * @return {Void}
     */
    _handleGlobalStatusPrune: function(widget, event) {
        let vagrant = new Vagrant.Emulator();
        vagrant.globalStatus(true);

        // This can be heavy task, so let's disable widget for a moment to
        // prevent multiple button clicks.
        widget.enabled = false;
        Mainloop.timeout_add(5000, function() {
            widget.enabled = true;

            // Stop repeating.
            return false;
        }.bind(this), null);
    },

    /**
     * Settings changed event handler.
     *
     * @param  {Object} widget
     * @param  {String} key
     * @return {Void}
     */
    _handleSettings: function(widget, key) {
        // pass
    },

    /* --- */
});

/**
 * Box extends Gtk.Frame:
 * used so we can use padding property in css.
 */
const Box = new GObject.Class({
    Name: 'Prefs.Box',
    GTypeName: 'GnomeVagrantIndicatorPrefsBox',
    Extends: Gtk.Frame,

    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init: function() {
        this.parent();

        this.actor = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, });
        this.set_child(this.actor);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-box');
    },

    /* --- */
});

/**
 * Separator extends Gtk.Separator.
 */
const Separator = new GObject.Class({
    Name: 'Prefs.Separator',
    GTypeName: 'GnomeVagrantIndicatorPrefsSeparator',
    Extends: Gtk.Separator,

    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init: function() {
        this.parent({ orientation: Gtk.Orientation.HORIZONTAL });

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-separator');
    },

    /* --- */
});

/**
 * Label extends Gtk.Label:
 * just a common Gtk.Label object with markup and line wrap.
 *
 * @param  {Object}
 * @return {Object}
 */
const Label = new GObject.Class({
    Name: 'Prefs.Label',
    GTypeName: 'GnomeVagrantIndicatorPrefsLabel',
    Extends: Gtk.Label,

    /**
     * Constructor.
     *
     * @param  {Object} options (optional)
     * @return {Void}
     */
    _init: function(options) {
        let o = options || {};
        if (!('label' in options)) o.label = 'undefined';

        this.parent(o);
        this.set_markup(this.get_text());
        this.wrap = true;
        this.set_justify(Gtk.Justification.CENTER);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-label');
    },

    /* --- */
});

/**
 * Input extends Box:
 * horizontal Gtk.Box object with label and widget for editing settings.
 *
 * @param  {Object}
 * @return {Object}
 */
const Input = new GObject.Class({
    Name: 'Prefs.Input',
    GTypeName: 'GnomeVagrantIndicatorPrefsInput',
    Extends: Box,
    Signals: {
        changed: {
            param_types: [ GObject.TYPE_OBJECT ],
        },
    },

    /**
     * Constructor.
     *
     * @param  {String} key
     * @param  {String} text
     * @param  {String} tooltip
     * @return {Void}
     */
    _init: function(key, text, tooltip) {
        this.parent();
        this.actor.set_orientation(Gtk.Orientation.HORIZONTAL);

        let label = new Gtk.Label({ label: text, xalign: 0, tooltip_text: tooltip || '' });
        label.set_hexpand(true);
        this.actor.append(label);

        this._key = key;
        this._label = label;
        this._widget = null;

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input');
    },

    /**
     * Input change event handler.
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handleChange: function(widget) {
        let emit = new GObject.Object();
        emit.key = this.key;
        emit.value = this.value;
        emit.type = this.type;

        this.emit('changed', emit);
    },

    /**
     * Type property getter.
     *
     * @return {String}
     */
    get type() {
        return 'variant';
    },

    /**
     * Key property getter.
     *
     * @return {String}
     */
    get key() {
        return this._key;
    },

    /**
     * Enabled property getter.
     *
     * @return {Boolean}
     */
    get enabled() {
        return this._widget.is_sensitive();
    },

    /**
     * Enabled property setter.
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set enabled(value) {
        this._widget.set_sensitive(value);
    },

    /**
     * Value property getter.
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.value;
    },

    /**
     * Value property setter.
     *
     * @param  {Mixed} value
     * @return {Void}
     */
    set value(value) {
        this._widget.value = value;
    },

    /* --- */
});

/**
 * InputEntry extends Input.
 */
const InputEntry = new GObject.Class({
    Name: 'Prefs.InputEntry',
    GTypeName: 'GnomeVagrantIndicatorPrefsInputEntry',
    Extends: Input,

    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init: function(key, value, text, tooltip) {
        this.parent(key, text, tooltip);

        this._widget = new Gtk.Entry({ text: value });
        this._widget.connect('notify::text', this._handleChange.bind(this));
        this.actor.append(this._widget);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-entry');
    },

    /**
     * Type property getter.
     *
     * @return {String}
     */
    get type() {
        return 'string';
    },

    /**
     * Value property getter.
     *
     * @return {String}
     */
    get value() {
        return this._widget.text;
    },

    /**
     * Value property setter.
     *
     * @param  {String} value
     * @return {Void}
     */
    set value(value) {
        this._widget.text = value;
    },

    /* --- */
});

/**
 * InputSwitch extends Input.
 */
const InputSwitch = new GObject.Class({
    Name: 'Prefs.InputSwitch',
    GTypeName: 'GnomeVagrantIndicatorPrefsInputSwitch',
    Extends: Input,

    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init: function(key, value, text, tooltip) {
        this.parent(key, text, tooltip);

        this._widget = new Gtk.Switch({ active: value });
        this._widget.connect('notify::active', this._handleChange.bind(this));
        this.actor.append(this._widget);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-switch');
    },

    /**
     * Type property getter.
     *
     * @return {String}
     */
    get type() {
        return 'boolean';
    },

    /**
     * Value property getter.
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.active;
    },

    /**
     * Value property setter.
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
 * InputButton extends Input.
 */
const InputButton = new GObject.Class({
    Name: 'Prefs.InputButton',
    GTypeName: 'GnomeVagrantIndicatorPrefsInputButton',
    Extends: Input,

    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init: function(label, text, tooltip) {
        this.parent(null, text, tooltip);

        this._widget = new Gtk.Button({ label: label });
        this._widget.connect('clicked', this._handleChange.bind(this));
        this.actor.append(this._widget);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-button');
    },

    /**
     * Value property getter.
     *
     * @return {Boolean}
     */
    get value() {
        return null;
    },

    /**
     * Value property setter.
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        // pass
    },

    /* --- */
});

/**
 * InputComboBox extends Gtk.Box.
 */
const InputComboBox = new GObject.Class({
    Name: 'Prefs.InputComboBox',
    GTypeName: 'GnomeVagrantIndicatorPrefsInputComboBox',
    Extends: Input,

    /**
     * Constructor
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
        this._widget.connect('notify::active', this._handleChange.bind(this));
        this.actor.append(this._widget);

        for (let id in options) {
            this._widget.append(id, options[id]);
        }

        this.value = value;

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-combobox');
    },

    /**
     * Type property getter.
     *
     * @return {String}
     */
    get type() {
        return 'string';
    },

    /**
     * Value property getter.
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.get_active_id();
    },

    /**
     * Value property setter.
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.set_active_id(value);
    },

    /* --- */
});
