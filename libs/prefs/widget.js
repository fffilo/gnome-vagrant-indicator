/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

'use strict';

const { Gtk, Gdk, GLib, Gio } = imports.gi;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Icons = Me.imports.libs.extension.icons;
const Vagrant = Me.imports.libs.extension.vagrant;
const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

/**
 * Preferences widget.
 */
var Widget = class Widget {
    /**
     * Constructor.
     *
     * @param  {ExtensionPrefsDialog} window
     * @return {Void}
     */
    constructor(window) {
        this._window = window;
        this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
        this._builder = Gtk.Builder.new_from_file(`${Me.path}/libs/prefs/widget.ui`);

        this._loadStylesheet();
        this._includeIcons();
        this._buildUI();

        this.window.connect('close-request', this._handleWindowCloseRequest.bind(this));
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        if (this.__globalStatusPruneInterval)
            Mainloop.source_remove(this.__globalStatusPruneInterval);

        this.settings.run_dispose();

        delete this.__globalStatusPruneInterval;
        delete this._builder;
        delete this._settings;
        delete this._window;
    }

    /**
     * Window property getter.
     *
     * @return {ExtensionPrefsDialog}
     */
    get window() {
        return this._window;
    }

    /**
     * Settings property getter.
     *
     * @return {Gio.Settings}
     */
    get settings() {
        return this._settings;
    }

    /**
     * Builder property getter.
     *
     * @return {Gtk.Builder}
     */
    get builder() {
        return this._builder;
    }

    /**
     * Load stylesheet from CSS file.
     *
     * @return {Void}
     */
    _loadStylesheet() {
        const provider = new Gtk.CssProvider();
        provider.load_from_path(`${Me.path}/libs/prefs/widget.css`);

        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    }

    /**
     * Include icons.
     *
     * @return {Void}
     */
    _includeIcons() {
        Icons.include();
    }

    /**
     * Build UI.
     *
     * @return {Void}
     */
    _buildUI() {
        this._buildUIWindow();
        this._buildUIAddPages();
        this._buildUISettings();
        this._buildUIActions();
        this._buildUIAbout();
    }

    /**
     * Build UI:
     * set window size and enable search.
     *
     * @return {Void}
     */
    _buildUIWindow() {
        let width = this.settings.get_int('prefs-default-width'),
            height = this.settings.get_int('prefs-default-height');
        if (width && height)
            this.window.set_default_size(width, height);

        this.window.set_search_enabled(true);
    }

    /**
     * Build UI:
     * add all pages to window.
     *
     * @return {Void}
     */
    _buildUIAddPages() {
        this.window.add(this._findChild('page-settings'));
        this.window.add(this._findChild('page-menu'));
        this.window.add(this._findChild('page-about'));
    }

    /**
     * Build UI:
     * sync settings and its widgets.
     *
     * @return {Void}
     */
    _buildUISettings() {
        this._registerSettingWidget('notifications');
        this._registerSettingWidget('machine-full-path');
        this._registerSettingWidget('machine-name');
        this._registerSettingWidget('post-terminal-action');
        this._registerSettingWidget('auto-global-status-prune');
        this._registerSettingWidget('display-vagrant-up');
        this._registerSettingWidget('display-vagrant-up-provision');
        this._registerSettingWidget('display-vagrant-up-ssh');
        this._registerSettingWidget('display-vagrant-up-rdp');
        this._registerSettingWidget('display-vagrant-provision');
        this._registerSettingWidget('display-vagrant-ssh');
        this._registerSettingWidget('display-vagrant-rdp');
        this._registerSettingWidget('display-vagrant-resume');
        this._registerSettingWidget('display-vagrant-suspend');
        this._registerSettingWidget('display-vagrant-halt');
        this._registerSettingWidget('display-vagrant-destroy');
        this._registerSettingWidget('display-system-terminal');
        this._registerSettingWidget('display-system-file-manager');
        this._registerSettingWidget('display-system-vagrantfile');
    }

    /**
     * Build UI:
     * bind action widgets.
     *
     * @return {Void}
     */
    _buildUIActions() {
        this._findChild('action-global-status-prune').connect('clicked', this._handleGlobalStatusPruneButtonClick.bind(this));
    }

    /**
     * Build UI:
     * sync about page with metadata.
     *
     * @return {Void}
     */
    _buildUIAbout() {
        let url = this._getMetadataProperty('url'),
            webpage = `<a href="${url}">${url}</a>`,
            gnomeVersion = this._getGnomeVersion(),
            sessionType = this._getSessionType();

        this._findChild('about-icon').set_from_icon_name(Icons.DEFAULT);
        this._findChild('about-title').set_label(this._getMetadataProperty('name'));
        this._findChild('about-description').set_label(this._getMetadataProperty('description-html', 'description'));
        this._findChild('about-version').set_label(this._getMetadataProperty('version'));
        this._findChild('about-gnome').set_label(gnomeVersion);
        this._findChild('about-session').set_label(sessionType);
        this._findChild('about-author').set_label(this._getMetadataProperty('original-author-html', 'original-author'));
        this._findChild('about-webpage').set_label(webpage);
        this._findChild('about-license').set_label(this._getMetadataProperty('license-html', 'license'));
    }

    /**
     * Register setting widget:
     * find widget, set its value (from settings) and bind change to store
     * value in our schema.
     *
     * @param  {String} property
     * @return {Void}
     */
    _registerSettingWidget(property) {
        const widget = this._findChild('setting-' + property);
        if (!widget)
            throw 'Widget: can not register setting widget (unknown property).';

        if (widget instanceof Gtk.Switch) {
            widget.set_active(this.settings.get_boolean(property));
            this.settings.bind(property, widget, 'active', Gio.SettingsBindFlags.DEFAULT);
        }
        else if (widget.get_style_context().has_class('setting--post-terminal-action')) {
            widget.set_selected(this._postTerminalActionStringToIndex(this.settings.get_string(property)));
            widget.connect('notify::selected', (widget, event) => this.settings.set_string(property, this._postTerminalActionIndexToString(widget.get_selected())));
            // @todo - two way binding?
        }
        else
            throw 'Widget: can not register setting (unsupported widget type).';
    }

    /**
     * Post terminal action enum list.
     *
     * @return {Array}
     */
    _postTerminalActionEnumList() {
        return [
            'NONE',
            'EXIT',
            'BOTH',
        ];
    }

    /**
     * Post terminal action string to index.
     *
     * @param  {String} value
     * @return {Number}
     */
    _postTerminalActionStringToIndex(value) {
        return this._postTerminalActionEnumList().indexOf(value);
    }

    /**
     * Post terminal action index to string.
     *
     * @param  {Number} value
     * @return {String}
     */
    _postTerminalActionIndexToString(value) {
        return this._postTerminalActionEnumList()[value];
    }

    /**
     * Find child (builder object) by name.
     *
     * @param  {String}          name
     * @return {Gtk.Widget|Null}
     */
    _findChild(name) {
        return this.builder.get_object(name);
    }

    /**
     * Label markup fix:
     * since Gtk.Label markup doesn't support <br> tags, we're gonna replace
     * all line break tags with newlines.
     *
     * @param  {String} text
     * @return {String}
     */
    _labelMarkupFix(text) {
        return text.replace(/<br\s*(?:\/?)\s*>/g, '\n');
    }

    /**
     * Get first truthy property from metadata.
     *
     * @param  {...String} props
     * @return {String}
     */
    _getMetadataProperty(...props) {
        return props.reduce((carry, item) => carry || this._labelMarkupFix(Me.metadata[item] || ''), '');
    }

    /**
     * Get GNOME version.
     *
     * @return {String}
     */
    _getGnomeVersion() {
        return imports.misc.config.PACKAGE_VERSION || _("unknown");
    }

    /**
     * Get session type (wayland, X11 or unknown).
     *
     * @return {String}
     */
    _getSessionType() {
        return GLib.getenv('XDG_SESSION_TYPE') || _("unknown");
    }

    /**
     * Window close request event handler:
     * store window size to schema and destroy instance.
     *
     * @param  {ExtensionPrefsDialog} widget
     * @return {Void}
     */
    _handleWindowCloseRequest(widget) {
        if (widget.default_width != this.settings.get_int('prefs-default-width'))
            this.settings.set_int('prefs-default-width', widget.default_width);
        if (widget.default_height != this.settings.get_int('prefs-default-height'))
            this.settings.set_int('prefs-default-height', widget.default_height);

        this.destroy();
    }

    /**
     * Global status prune button click event handler:
     * execute `vagrant global-status --prune`.
     *
     * @param  {Gtk.Button} widget
     * @return {Void}
     */
    _handleGlobalStatusPruneButtonClick(widget) {
        const emulator = new Vagrant.Emulator();
        emulator.globalStatus(true);

        // This can be heavy task, so let's disable widget for a moment to
        // prevent multiple button clicks.
        if (this.__globalStatusPruneInterval)
            Mainloop.source_remove(this.__globalStatusPruneInterval);
        this.__globalStatusPruneInterval = Mainloop.timeout_add(5000, () => {
            widget.set_sensitive(true);
            delete this.__globalStatusPruneInterval;

            return GLib.SOURCE_REMOVE;
        }, null);

        widget.set_sensitive(false);
    }
};
