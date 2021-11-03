/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Translation = Me.imports.translation;
const Indicator = Me.imports.indicator;

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
    Translation.init();
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
