/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Translation = Me.imports.translation;
const Icons = Me.imports.icons;
const Indicator = Me.imports.indicator;

/**
 * Global indicator object
 *
 * @type {Object}
 */
let indicator = null;

/**
 * Extension initialization
 *
 * @param  {Object} extensionMeta
 * @return {Void}
 */
function init(extensionMeta) {
    Translation.init();
    Icons.init();
}

/**
 * Extension enable
 *
 * @return {Void}
 */
function enable() {
    if (indicator)
        return;

    indicator = new Indicator.Base();
}

/**
 * Extension disable
 *
 * @return {Void}
 */
function disable() {
    if (!indicator)
        return;

    indicator.destroy();
    indicator = null;
}
