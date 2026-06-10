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

    private mixer?: Gvc.MixerControl;
    private sink?: Gvc.MixerStream;
    private label?: St.Label;
    private idleId = 0;

    constructor(settings: Gio.Settings, mixerName: string) {
        this.gsettings = settings;
        this.mixerName = mixerName;   
    }

    enable() {
        // Connect to mixer to track sink changes
        this.mixer = new Gvc.MixerControl({ name: this.mixerName });
        this.mixer.connectObject(
            'default-sink-changed', 
            (mixer: Gvc.MixerControl) => this.onSinkChanged(mixer), this
        );
        this.mixer.open();

        // Lazily add after Quick Settings is build
        this.idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this.label = new St.Label({
                text: '--%',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'min-width: 3em; text-align: right;',
            });

            this.gsettings?.bind('quick-settings-volume', this.label, 'visible',
                Gio.SettingsBindFlags.DEFAULT
            );

            const quickSettingsMenu = Main.panel.statusArea.quickSettings.menu;

            const sliderRow = quickSettingsMenu._grid.get_children()[1].get_first_child();
            if (!sliderRow) {
                throw new Error('Failed to find volume slider in quick settings.');
            }

            // [mute button] [slider] [<our inserted label>] [settings button]
            sliderRow.insert_child_at_index(this.label, 2);

            this.updateLabel();

            this.idleId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    private onSinkChanged(mixer: Gvc.MixerControl) {
        this.sink?.disconnectObject(this);

        this.sink = mixer.get_default_sink();
        if (!this.sink) return;

        this.sink.connectObject(
            'notify::volume', () => this.updateLabel(),
            'notify::is-muted', () => this.updateLabel(),
            this
        );

        this.updateLabel();
    }

    private updateLabel() {
        if (!this.label || !this.sink || !this.mixer) return;

        const volumePercent = Math.round(this.sink.get_volume() / this.mixer.get_vol_max_norm() * 100);
        this.label.text = this.sink.get_is_muted() ? '0%' : `${volumePercent}%`;
    }

    disable() {
        if (this.idleId) {
            GLib.source_remove(this.idleId);
            this.idleId = 0;
        }
        
        this.sink?.disconnectObject(this);
        this.sink = undefined;

        this.mixer?.disconnectObject(this);
        this.mixer?.close();
        this.mixer = undefined;

        this.label?.destroy();
        this.label = undefined;
    }
}

export default class SliderPercentagesExtension extends Extension {
    private osdVolumeLabel?: OsdVolumeLabel;
    private qsVolumeLabel?: QuickSettingsVolumeLabel;

    enable() {
        const settings = this.getSettings();

        this.osdVolumeLabel = new OsdVolumeLabel(settings);
        this.osdVolumeLabel.enable();

        this.qsVolumeLabel = new QuickSettingsVolumeLabel(settings, this.uuid);
        this.qsVolumeLabel.enable();
    }

    disable() {
        this.osdVolumeLabel?.disable();
        this.osdVolumeLabel = undefined;

        this.qsVolumeLabel?.disable();
        this.qsVolumeLabel = undefined;
    }
}
