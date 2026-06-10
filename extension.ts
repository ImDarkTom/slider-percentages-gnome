import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gvc from 'gi://Gvc';
import Gio from "gi://Gio";

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Shows a volume percentage next to GNOME's OSD popup (popup that appears
 * when adjusting the volume with media keys).
 *
 * GNOME exposes no hook for this, so we wrap `OsdWindow.setLevel()`. Wrapping it
 * on the shared prototype means popups created later (e.g. when a monitor is
 * plugged in) are handled too, without us having to track monitor changes.
 * Each popup gets its own label, added the first time it is shown.
 * 
 * Loosely based on:
 * - https://github.com/orgs/linuxmint/discussions/752
 */
class OsdVolumeLabel {
    private readonly settings: Gio.Settings;
    private osdPrototype?: any;
    private originalSetLevel?: (value: number | null) => void;

    constructor(settings: Gio.Settings) {
        this.settings = settings;
    }

    enable() {
        // `_osdWindows` contains popups for each monitor
        const [ sampleWindow ] = Main.osdWindowManager._osdWindows;
        if (!sampleWindow) return;

        this.osdPrototype = Object.getPrototypeOf(sampleWindow);
        this.originalSetLevel = this.osdPrototype.setLevel;

        const self = this;
        this.osdPrototype.setLevel = function (value: number | null) {
            // `this` is the OsdWindow being updated, `self` is this OsdVolumeLabel.
            self.originalSetLevel!.call(this, value);
            self.updateLabel(this, value);
        };
    }

    disable() {
        if (this.osdPrototype && this.originalSetLevel) {
            this.osdPrototype.setLevel = this.originalSetLevel;
        }

        this.osdPrototype = undefined;
        this.originalSetLevel = undefined;

        for (const osd of Main.osdWindowManager._osdWindows) {
            // Remove all added percent labels
            if (osd?._percentLabel) {
                osd._percentLabel.destroy();
                delete osd._percentLabel;
            }
        }
    }

    private updateLabel(osd: any, value: number | null) {
        const label = this.labelFor(osd);

        if (
            value != null 
            && this.isVolumeOsd(osd) 
            && this.settings.get_boolean('osd-volume')
        ) {
            // `value` in this context is the volume as a float, e.g. '0.50' for 50%
            label.text = `${Math.round(value * 100)}%`;
            label.visible = true;
        } else {
            label.visible = false;
        }
    }

    private labelFor(osd: any): St.Label {
        if (!osd._percentLabel) {
            osd._percentLabel = new St.Label({
                text: '--%',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'min-width: 3em; text-align: right;',
            });

            // add label to horizontal layout, 
            // layout becomes: [icon] [title + level bar] [percentage]
            osd._hbox.add_child(osd._percentLabel);
        }

        return osd._percentLabel;
    }

    private isVolumeOsd(osd: any): boolean {
        const iconNames: string[] = osd._icon?.gicon?.get_names?.() ?? [];
        return iconNames.some(name => name.startsWith('audio-'));
    }
}

class QuickSettingsVolumeLabel {
    private readonly gsettings: Gio.Settings;
    private readonly mixerName: string;

    private _mixer?: Gvc.MixerControl;
    private _sink?: Gvc.MixerStream;
    private _label?: St.Label;
    private _idleId = 0;

    constructor(settings: Gio.Settings, mixerName: string) {
        this.gsettings = settings;
        this.mixerName = mixerName;   
    }

    enable() {
        // Connect to mixer to track sink changes
        this._mixer = new Gvc.MixerControl({ name: this.mixerName });
        this._mixer.connectObject(
            'default-sink-changed', 
            (mixer: Gvc.MixerControl) => this._onSinkChanged(mixer), this
        
        );
        this._mixer.open();

        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._label = new St.Label({
                text: '--%',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'min-width: 3em; text-align: right;',
            });

            this.gsettings?.bind('quick-settings-volume', this._label, 'visible',
                Gio.SettingsBindFlags.DEFAULT
            );

            const quickSettingsMenu = Main.panel.statusArea.quickSettings.menu;

            const sliderRow = quickSettingsMenu._grid.get_children()[1].get_first_child();
            if (!sliderRow) {
                throw new Error('Failed to find volume slider in quick settings.');
            }

            // [mute button] [slider] [<our inserted label>] [settings button]
            sliderRow.insert_child_at_index(this._label, 2);

            this._update();

            this._idleId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    private _onSinkChanged(mixer: Gvc.MixerControl) {
        this._sink?.disconnectObject(this);

        this._sink = mixer.get_default_sink();
        if (!this._sink) return;

        this._sink.connectObject(
            'notify::volume', () => this._update(),
            'notify::is-muted', () => this._update(),
            this
        );

        this._update();
    }

    private _update() {
        if (!this._label || !this._sink || !this._mixer) return;

        const volumePercent = Math.round(this._sink.get_volume() / this._mixer.get_vol_max_norm() * 100);
        this._label.text = this._sink.get_is_muted() ? '0%' : `${volumePercent}%`;
    }

    disable() {
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
        
        this._sink?.disconnectObject(this);
        this._sink = undefined;

        this._mixer?.disconnectObject(this);
        this._mixer?.close();
        this._mixer = undefined;

        this._label?.destroy();
        this._label = undefined;
    }
}

export default class SliderPercentagesExtension extends Extension {
    _osdVolumeLabel?: OsdVolumeLabel;
    _qsVolumeLabel?: QuickSettingsVolumeLabel;

    enable() {
        const settings = this.getSettings();

        this._osdVolumeLabel = new OsdVolumeLabel(settings);
        this._osdVolumeLabel.enable();

        this._qsVolumeLabel = new QuickSettingsVolumeLabel(settings, this.uuid);
        this._qsVolumeLabel.enable();
    }

    disable() {
        this._osdVolumeLabel?.disable();
        this._osdVolumeLabel = undefined;

        this._qsVolumeLabel?.disable();
        this._qsVolumeLabel = undefined;
    }
}
