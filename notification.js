/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * Notification.Source constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Source = GObject.registerClass(class Source extends MessageTray.Source {

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init() {
        super._init(Me.metadata.uuid, null);

        this._icon = null;
    }

    /**
     * Source icon getter
     *
     * @return {Gio.Icon} (or null if not set)
     */
    get icon() {
        return this._icon;
    }

    /**
     * Source icon setter
     *
     * @param  {Gio.Icon} value (or null)
     * @return {Void}
     */
    set icon(value) {
        if (!value)
            value = null;
        else if (!(value instanceof Gio.Icon))
            return;

        this._icon = value;
    }

    /**
     * Overriding getIcon method
     *
     * @return {Gio.FileIcon}
     */
    getIcon() {
        let result = this.icon;
        if (result)
            return this.icon;

        return super.getIcon();
    }

    /* --- */

});

/**
 * Notification.Notification constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Notification = GObject.registerClass(class Notification extends MessageTray.Notification {

    /**
     * Constructor
     *
     * @param  {Source} source
     * @param  {String} title
     * @param  {String} message
     * @return {Void}
     */
    _init(source, title, message) {
        super._init(source, title, message);
    }

    /**
     * Overriding createBanner method
     *
     * @return {Gio.FileIcon}
     */
    createBanner(notification) {
        let result = super.createBanner(notification);
        let prefix = Me.metadata.uuid
            .toLowerCase()
            .replace(/@.*/, '')
            .replace(/[^a-z0-9]+/g, '-')
        result.add_style_class_name(prefix + '-notification-banner');

        return result;
    }

    /* --- */

});

/**
 * Notification.Notifier constructor
 *
 * @param  {Object}
 * @return {Class}
 */
var Notifier = class Notifier {

    /**
     * Constructor
     *
     * @return {Void}
     */
    constructor() {
        this._source = null;
        this._icon = null;
    }

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy() {
        if (this.source)
            this.source.destroy();

        this._icon = null;
        this._source = null;
    }

    get source() {
        if (this._source)
            return this._source;

        this._source = new Source();
        this._source.icon = this.icon;
        this._source.connect('destroy', this._handleDestroy.bind(this));

        Main.messageTray.add(this._source);

        return this._source;
    }

    /**
     * Source icon getter
     *
     * @return {Gio.Icon} (or null if not set)
     */
    get icon() {
        return this._icon;
    }

    /**
     * Source icon setter
     *
     * @param  {Gio.Icon} value (or null)
     * @return {Void}
     */
    set icon(value) {
        if (!value)
            value = null;
        else if (!(value instanceof Gio.Icon))
            return;

        this._icon = value;
    }

    /**
     * Source destroy event handler:
     * clear source
     *
     * @return {Void}
     */
    _handleDestroy() {
        this._source = null;
    }

    /**
     * Get existing notification from
     * source or create new one
     *
     * @param  {String}       title
     * @param  {String}       message
     * @return {Notification}
     */
    _getNotification(title, message) {
        let result = null;
        if (this.source.notifications.length) {
            result = this.source.notifications[0];
            result.update(title, message, {
                clear: true,
            });
        }
        else {
            result = new Notification(this.source, title, message);
            result.setTransient(true);
            result.setResident(false);
        }

        return result;
    }

    /**
     * Show notification
     *
     * @param  {String}   title
     * @param  {String}   message
     * @return {Void}
     */
    notify(title, message) {
        let notification = this._getNotification(title, message);
        this.source.showNotification(notification);
    }

    /* --- */

};
