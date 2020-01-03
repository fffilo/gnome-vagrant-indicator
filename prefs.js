/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// import modules
const Mainloop = imports.mainloop;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Icons = Me.imports.icons;
const Settings = Me.imports.settings;
const Translation = Me.imports.translation;
const Vagrant = Me.imports.vagrant;
const _ = Translation.translate;

/**
 * Extension preferences initialization
 *
 * @return {Void}
 */
function init() {
    Translation.init();
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
var Widget = GObject.registerClass(class Widget extends Gtk.Box {
    /**
     * Widget initialization
     *
     * @return {Void}
     */
    _init() {
        super._init({ orientation: Gtk.Orientation.VERTICAL, });

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
        this.settings = Settings.settings();
        //this.settings.connect('changed', this._handleSettings.bind(this));
    }

    /**
     * Create user interface
     *
     * @return {Void}
     */
    _ui() {
        let css = new Gtk.CssProvider();
        css.load_from_path(Me.path + '/prefs.css');
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        let notebook = new Gtk.Notebook();
        this.ui = {};
        notebook.append_page(this._pageSettings(), new Gtk.Label({ label: _("Settings"), }));
        notebook.append_page(this._pageVagrant(), new Gtk.Label({ label: _("Vagrant"), }));
        notebook.append_page(this._pageSystem(), new Gtk.Label({ label: _("System"), }));
        notebook.append_page(this._pageAbout(), new Gtk.Label({ label: _("About"), }));
        this.add(notebook);

        this.show_all();
    }

    /**
     * Create new page
     *
     * @return {Object}
     */
    _page() {
        let page = new Box();
        page.expand = true;
        page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page');

        return page;
    }

    /**
     * Create new settings page
     *
     * @return {Object}
     */
    _pageSettings() {
        this.ui.settings = {};
        this.ui.settings.page = this._page();
        this.ui.settings.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-settings');

        let desc = _("<i>Refresh machines status</i> will get state of all active Vagrant environments and prune invalid entries from the list. Note that this can be heavy task and can last some time if you have many boxes.");
        let label = new Label({ label: desc, });
        label.get_style_context().add_class('gnome-vagrant-indicator-prefs-info');
        this.ui.settings.page.actor.add(label);

        this.ui.settings.autoglobalstatusprune = new InputSwitch('auto-global-status-prune', this.settings.get_boolean('auto-global-status-prune'), _("Refresh machines status at startup"), _("Refresh machines status at startup (work in progress)"));
        this.ui.settings.autoglobalstatusprune.connect('changed', this._handleWidget.bind(this));
        this.ui.settings.page.actor.add(this.ui.settings.autoglobalstatusprune);

        this.ui.settings.execglobalstatusprune = new InputButton(_("Execute"), _("Refresh machines status"), _("Refresh machines status"));
        this.ui.settings.execglobalstatusprune.connect('changed', this._handleGlobalStatusPrune.bind(this));
        this.ui.settings.page.actor.add(this.ui.settings.execglobalstatusprune);

        this.ui.settings.page.actor.add(new Separator());

        this.ui.settings.notifications = new InputSwitch('notifications', this.settings.get_boolean('notifications'), _("Show notifications"), _("Display notification on vagrant machine state change"));
        this.ui.settings.notifications.connect('changed', this._handleWidget.bind(this));
        this.ui.settings.page.actor.add(this.ui.settings.notifications);

        this.ui.settings.machinefullpath = new InputSwitch('machine-full-path', this.settings.get_boolean('machine-full-path'), _("Show machine full path"), _("Show machine full path as instance name"));
        this.ui.settings.machinefullpath.connect('changed', this._handleWidget.bind(this));
        this.ui.settings.page.actor.add(this.ui.settings.machinefullpath);

        this.ui.settings.postterminalaction = new InputComboBox('post-terminal-action', this.settings.get_string('post-terminal-action'), _("Post terminal action"), _("Terminal action after vagrant command execution"), { 'NONE': _("Leave opened"), /*'PAUSE': _("Wait for keypress"),*/ 'EXIT': _("Close"), 'BOTH': _("Wait for keypress and close") });
        this.ui.settings.postterminalaction.connect('changed', this._handleWidget.bind(this));
        this.ui.settings.page.actor.add(this.ui.settings.postterminalaction);

        return this.ui.settings.page;
    }

    /**
     * Create new vagrant page
     *
     * @return {Object}
     */
    _pageVagrant() {
        this.ui.vagrant = {};
        this.ui.vagrant.page = this._page();
        this.ui.vagrant.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-vagrant');

        //this.ui.vagrant.none = new InputSwitch('display-vagrant-none', this.settings.get_boolean('display-vagrant-none'), _("Disabled"), _("Disabled"));
        //this.ui.vagrant.none.connect('changed', this._handleWidget.bind(this));
        //this.ui.vagrant.page.actor.add(this.ui.vagrant.none);

        this.ui.vagrant.up = new InputSwitch('display-vagrant-up', this.settings.get_boolean('display-vagrant-up'), _("Up"), _("Display menu for `vagrant up` command"));
        this.ui.vagrant.up.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.up);

        this.ui.vagrant.upprovision = new InputSwitch('display-vagrant-up-provision', this.settings.get_boolean('display-vagrant-up-provision'), _("Up and Provision"), _("Display menu for `vagrant up --provision` command"));
        this.ui.vagrant.upprovision.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.upprovision);

        this.ui.vagrant.upssh = new InputSwitch('display-vagrant-up-ssh', this.settings.get_boolean('display-vagrant-up-ssh'), _("Up and SSH"), _("Display menu for `vagrant up; vagrant ssh` command"));
        this.ui.vagrant.upssh.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.upssh);

        this.ui.vagrant.uprdp = new InputSwitch('display-vagrant-up-rdp', this.settings.get_boolean('display-vagrant-up-rdp'), _("Up and RPD"), _("Display menu for `vagrant up; vagrant rdp` command"));
        this.ui.vagrant.uprdp.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.uprdp);

        this.ui.vagrant.provision = new InputSwitch('display-vagrant-provision', this.settings.get_boolean('display-vagrant-provision'), _("Provision"), _("Display menu for `vagrant provision` command"));
        this.ui.vagrant.provision.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.provision);

        this.ui.vagrant.ssh = new InputSwitch('display-vagrant-ssh', this.settings.get_boolean('display-vagrant-ssh'), _("SSH"), _("Display menu for `vagrant ssh` command"));
        this.ui.vagrant.ssh.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.ssh);

        this.ui.vagrant.rdp = new InputSwitch('display-vagrant-rdp', this.settings.get_boolean('display-vagrant-rdp'), _("RDP"), _("Display menu for `vagrant rdp` command"));
        this.ui.vagrant.rdp.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.rdp);

        this.ui.vagrant.resume = new InputSwitch('display-vagrant-resume', this.settings.get_boolean('display-vagrant-resume'), _("Resume"), _("Display menu for `vagrant resume` command"));
        this.ui.vagrant.resume.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.resume);

        this.ui.vagrant.suspend = new InputSwitch('display-vagrant-suspend', this.settings.get_boolean('display-vagrant-suspend'), _("Suspend"), _("Display menu for `vagrant suspend` command"));
        this.ui.vagrant.suspend.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.suspend);

        this.ui.vagrant.halt = new InputSwitch('display-vagrant-halt', this.settings.get_boolean('display-vagrant-halt'), _("Halt"), _("Display menu for `vagrant halt` command"));
        this.ui.vagrant.halt.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.halt);

        this.ui.vagrant.destroy_force = new InputSwitch('display-vagrant-destroy', this.settings.get_boolean('display-vagrant-destroy'), _("Destroy"), _("Display menu for `vagrant destroy` command"));
        this.ui.vagrant.destroy_force.connect('changed', this._handleWidget.bind(this));
        this.ui.vagrant.page.actor.add(this.ui.vagrant.destroy_force);

        //this.ui.vagrant.destroy_force = new InputSwitch('display-vagrant-destroy-force', this.settings.get_boolean('display-vagrant-destroy-force'), _("Disabled"), _("Disabled"));
        //this.ui.vagrant.destroy_force.connect('changed', this._handleWidget.bind(this));
        //this.ui.vagrant.page.actor.add(this.ui.vagrant.destroy_force);

        return this.ui.vagrant.page;
    }

    /**
     * Create new system page
     *
     * @return {Object}
     */
    _pageSystem() {
        this.ui.system = {};
        this.ui.system.page = this._page();
        this.ui.system.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-system');

        //this.ui.system.none = new InputSwitch('display-system-none', this.settings.get_boolean('display-system-none'), _("Disabled"), _("Disabled"));
        //this.ui.system.none.connect('changed', this._handleWidget.bind(this));
        //this.ui.system.page.actor.add(this.ui.system.none);

        this.ui.system.terminal = new InputSwitch('display-system-terminal', this.settings.get_boolean('display-system-terminal'), _("Open in Terminal"), _("Display Open in Terminal system menu"));
        this.ui.system.terminal.connect('changed', this._handleWidget.bind(this));
        this.ui.system.page.actor.add(this.ui.system.terminal);

        this.ui.system.file_manager = new InputSwitch('display-system-file-manager', this.settings.get_boolean('display-system-file-manager'), _("Open in File Manager"), _("Display Open in File Manager system menu"));
        this.ui.system.file_manager.connect('changed', this._handleWidget.bind(this));
        this.ui.system.page.actor.add(this.ui.system.file_manager);

        this.ui.system.vagrantfile = new InputSwitch('display-system-vagrantfile', this.settings.get_boolean('display-system-vagrantfile'), _("Edit Vagrantfile"), _("Display Edit Vagrantfile system menu"));
        this.ui.system.vagrantfile.connect('changed', this._handleWidget.bind(this));
        this.ui.system.page.actor.add(this.ui.system.vagrantfile);

        return this.ui.system.page;
    }

    /**
     * Create new about page
     *
     * @return {Object}
     */
    _pageAbout() {
        this.ui.about = {};
        this.ui.about.page = this._page();
        this.ui.about.page.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about');

        this.ui.about.title = new Label({ label: Me.metadata.name, });
        this.ui.about.title.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-title');
        this.ui.about.page.actor.add(this.ui.about.title);

        let ico = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/assets/%s.svg'.format(Icons.DEFAULT), 64, 64, null);
        this.ui.about.icon = Gtk.Image.new_from_pixbuf(ico);
        this.ui.about.icon.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-icon');
        this.ui.about.page.actor.add(this.ui.about.icon);

        this.ui.about.desc = new Label({ label: Me.metadata['description-html'] || Me.metadata.description, });
        this.ui.about.desc.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-description');
        this.ui.about.page.actor.add(this.ui.about.desc);

        this.ui.about.version = new Label({ label: _("Version") + ': ' + Me.metadata.version, });
        this.ui.about.version.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-version');
        this.ui.about.page.actor.add(this.ui.about.version);

        this.ui.about.author = new Label({ label: Me.metadata['original-author-html'] || Me.metadata['original-author'], });
        this.ui.about.author.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-author');
        this.ui.about.page.actor.add(this.ui.about.author);

        this.ui.about.webpage = new Label({ label: '<a href="' + Me.metadata.url + '">' + Me.metadata.url + '</a>', });
        this.ui.about.webpage.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-webpage');
        this.ui.about.page.actor.add(this.ui.about.webpage);

        this.ui.about.license = new Label({ label: Me.metadata['license-html'] || Me.metadata.license, });
        this.ui.about.license.get_style_context().add_class('gnome-vagrant-indicator-prefs-page-about-license');
        this.ui.about.page.actor.pack_end(this.ui.about.license, false, false, 0);

        return this.ui.about.page;
    }

    /**
     * Bind events
     *
     * @return {Void}
     */
    _bind() {
        this.connect('destroy', this._handleDestroy.bind(this));
    }

    /**
     * Widget destroy event handler
     *
     * @param  {Object} widget
     * @param  {Object} event
     * @return {Void}
     */
    _handleDestroy(widget, event) {
        if (this.settings)
            this.settings.run_dispose();
    }

    /**
     * Settings widget change event handler
     *
     * @param  {String} widget
     * @param  {String} event
     * @return {Void}
     */
    _handleWidget(widget, event) {
        let oldValue = this.settings['get_' + event.type](event.key);

        if (oldValue != event.value)
            this.settings['set_' + event.type](event.key, event.value);
    }

    /**
     * Settings widget click event handler
     *
     * @param  {String} widget
     * @param  {String} event
     * @return {Void}
     */
    _handleGlobalStatusPrune(widget, event) {
        let vagrant = new Vagrant.Emulator();
        vagrant.globalStatus(true);

        // this can be heavy task, so let's disable
        // widget for a moment to prevent multiple
        // button clicks
        widget.enabled = false;
        Mainloop.timeout_add(5000, (function() {
            widget.enabled = true;

            // stop repeating
            return false;
        }).bind(this, null));
    }

    /**
     * Settings changed event handler
     *
     * @param  {Object} widget
     * @param  {String} key
     * @return {Void}
     */
    _handleSettings(widget, key) {
        // pass
    }

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
var Box = GObject.registerClass(class Box extends Gtk.Frame {
    _init() {
        super._init();

        this.actor = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, });
        this.add(this.actor);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-box');
    }

    /* --- */

});

/**
 * Separator constructor
 * extends Gtk.Separator
 *
 * @param  {Object}
 * @return {Object}
 */
const Separator = new GObject.Class({

    Name: 'Prefs.Separator',
    GTypeName: 'GnomeVagrantIndicatorPrefsSeparator',
    Extends: Gtk.Separator,

    _init: function() {
        this.parent({ orientation: Gtk.Orientation.HORIZONTAL });

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-separator');
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
var Label = GObject.registerClass(class Label extends Gtk.Label {
    /**
     * Constructor
     *
     * @param  {Object} options (optional)
     * @return {Void}
     */
    _init(options) {
        let o = options || {};
        if (!('label' in options)) o.label = 'undefined';

        super._init(o);
        this.set_markup(this.get_text());
        this.set_line_wrap(true);
        this.set_justify(Gtk.Justification.CENTER);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-label');
    }

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
var Input = GObject.registerClass({
    Signals: {
        'changed': { param_types: [ GObject.TYPE_OBJECT ] },
    }
}, class Input extends Box {
    /**
     * Constructor
     *
     * @param  {String} key
     * @param  {String} text
     * @param  {String} tooltip
     * @return {Void}
     */
    _init(key, text, tooltip) {
        super._init();
        this.actor.set_orientation(Gtk.Orientation.HORIZONTAL);

        this._key = key;
        this._label = new Gtk.Label({ label: text, xalign: 0, tooltip_text: tooltip || '' });
        this._widget = null;

        this.actor.pack_start(this._label, true, true, 0);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input');
    }

    /**
     * Input change event handler
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handleChange(widget) {
        let emit = new GObject.Object();
        emit.key = this.key;
        emit.value = this.value;
        emit.type = this.type;

        this.emit('changed', emit);
    }

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'variant';
    }

    /**
     * Key getter
     *
     * @return {String}
     */
    get key() {
        return this._key;
    }

    /**
     * Enabled getter
     *
     * @return {Boolean}
     */
    get enabled() {
        return this._widget.is_sensitive();
    }

    /**
     * Enabled setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set enabled(value) {
        this._widget.set_sensitive(value);
    }

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.value;
    }

    /**
     * Value setter
     *
     * @param  {Mixed} value
     * @return {Void}
     */
    set value(value) {
        this._widget.value = value;
    }

    /* --- */

});

/**
 * InputEntry constructor
 * extends Input
 *
 * @param  {Object}
 * @return {Object}
 */
var InputEntry = GObject.registerClass(class InputEntry extends Input {
    /**
     * Constructor
     *
     * @return {Void}
     */
    _init(key, value, text, tooltip) {
        super._init(key, text, tooltip);

        this._widget = new Gtk.Entry({ text: value });
        this._widget.connect('notify::text', this._handleChange.bind(this));
        this.actor.add(this._widget);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-entry');
    }

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'string';
    }

    /**
     * Value getter
     *
     * @return {String}
     */
    get value() {
        return this._widget.text;
    }

    /**
     * Value setter
     *
     * @param  {String} value
     * @return {Void}
     */
    set value(value) {
        this._widget.text = value;
    }

    /* --- */

});

/**
 * InputSwitch constructor
 * extends Input
 *
 * @param  {Object}
 * @return {Object}
 */
var InputSwitch = GObject.registerClass({
    Signals: {
        'changed': { param_types: [ GObject.TYPE_OBJECT ] },
    }
}, class InputSwitch extends Input {
    /**
     * Constructor
     *
     * @return {Void}
     */
    _init(key, value, text, tooltip) {
        super._init(key, text, tooltip);

        this._widget = new Gtk.Switch({ active: value });
        this._widget.connect('notify::active', this._handleChange.bind(this));
        this.actor.add(this._widget);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-switch');
    }

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'boolean';
    }

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.active;
    }

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.active = value;
    }

    /* --- */

});

/**
 * InputButton constructor
 * extends Input
 *
 * @param  {Object}
 * @return {Object}
 */
var InputButton = GObject.registerClass(class InputButton extends Input {
    /**
     * Constructor
     *
     * @return {Void}
     */
    _init(label, text, tooltip) {
        super._init(null, text, tooltip);

        this._widget = new Gtk.Button({ label: label, expand: false });
        this._widget.connect('clicked', this._handleChange.bind(this));
        this.actor.add(this._widget);

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-button');
    }

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return null;
    }

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        // pass
    }

    /* --- */

});

/**
 * InputComboBox constructor
 * extends Gtk.Box
 *
 * @param  {Object}
 * @return {Object}
 */
var InputComboBox = GObject.registerClass(class InputComboBox extends Input {
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
    _init(key, value, text, tooltip, options) {
        super._init(key, text, tooltip);

        this._widget = new Gtk.ComboBoxText();
        this._widget.connect('notify::active', this._handleChange.bind(this));
        this.actor.add(this._widget);

        for (let id in options) {
            this._widget.append(id, options[id]);
        }

        this.value = value;

        this.get_style_context().add_class('gnome-vagrant-indicator-prefs-input-combobox');
    }

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'string';
    }

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.get_active_id();
    }

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.set_active_id(value);
    }

    /* --- */

});
