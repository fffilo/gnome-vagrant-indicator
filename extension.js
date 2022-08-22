/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Indicator = Me.imports.libs.extension.indicator;

/**
 * Global indicator object.
 *
 * @type {Indicator.Base}
 */
let indicator = null;

/**
 * Extension initialization.
 *
 * @param  {Object} extensionMeta
 * @return {Void}
 */
var init = (extensionMeta) => {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

/**
 * Extension enable.
 *
 * @return {Void}
 */
var enable = () => {
    if (indicator)
        return;

    indicator = new Indicator.Base();
}

/**
 * Extension disable.
 *
 * @return {Void}
 */
var disable = () => {
    if (!indicator)
        return;

    indicator.destroy();
    indicator = null;
}
