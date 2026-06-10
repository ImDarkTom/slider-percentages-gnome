import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gvc from 'gi://Gvc';
import Gio from "gi://Gio";

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { QuickSlider } from 'resource:///org/gnome/shell/ui/quickSettings.js';

/**
 * Shows percentages next to (supported) GNOME OSD popups.
 *
 * GNOME exposes no hook for this, so we wrap `OsdWindow.setLevel()`. Wrapping it
 * on the shared prototype means popups created later (e.g. when a monitor is
 * plugged in) are handled too, without us having to track monitor changes.
 * Each popup gets its own label, added the first time it is shown.
 * 
 * Loosely based on:
 * - https://github.com/orgs/linuxmint/discussions/752
 */
class OsdLabels {
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
            // `this` is the OsdWindow being updated, `self` is this OsdLabels.
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
        const key = this.settingsKeyFor(osd);

        if (value != null && key && this.settings.get_boolean(key)) {
            // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/osdWindow.js#L45
            const max = osd.level?.maximumValue;
            const fraction = max && max > 0 
                ? value / max 
                : value;

            label.text = `${Math.round(fraction * 100)}%`;
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

    private settingsKeyFor(osd: any): string | null {
        const iconNames: string[] = osd._icon?.gicon?.get_names?.() ?? [];
        
        if (iconNames.some((name) => name.startsWith('audio-'))) {
            return 'osd-volume';
        } else if (iconNames.some((name) => name.startsWith('display-brightness'))) {
            return 'osd-brightness';
        } else if (iconNames.some((name) => name.startsWith('keyboard-brightness'))) {
            return 'osd-keyboard-backlight';
        } else {
            return null;
        }
    }
}

class QuickSettingsVolumeLabel {
    private readonly settings: Gio.Settings;
    private readonly mixerName: string;

    private mixer?: Gvc.MixerControl;
    private sink?: Gvc.MixerStream;
    private label?: St.Label;
    private idleId = 0;

    constructor(settings: Gio.Settings, mixerName: string) {
        this.settings = settings;
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

            this.settings?.bind('quick-settings-volume', this.label, 'visible',
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
}

class QuickSettingsBrightnessLabel {
    private readonly settings: Gio.Settings;

    private label?: St.Label;
    private idleId = 0;

    constructor(settings: Gio.Settings) {
        this.settings = settings;
    }

    enable() {
        // Lazily add after Quick Settings is built
        this.idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this.label = new St.Label({
                text: '--%',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'min-width: 3em; text-align: right;',
            });

            this.settings?.bind('quick-settings-brightness', this.label, 'visible',
                Gio.SettingsBindFlags.DEFAULT
            );

            const qsBrightnessIndicator = Main.panel.statusArea.quickSettings._brightness;
            const qsBrightnessItem = qsBrightnessIndicator?.quickSettingsItems?.[0] as QuickSlider | undefined;
            if (!qsBrightnessItem) {
                // Device/displays don't support custom brightness
                this.idleId = 0;
                return GLib.SOURCE_REMOVE;
            }

            const sliderRow = qsBrightnessItem.get_first_child();
            if (!sliderRow) {
                this.idleId = 0;
                return GLib.SOURCE_REMOVE;
            }

            // [brightness icon] [slider] [<our inserted label>]
            sliderRow.insert_child_at_index(this.label, 2);

            qsBrightnessItem.slider.connectObject('notify::value',
                () => this.updateLabel(qsBrightnessItem.slider.value),
                this
            );

            this.updateLabel(qsBrightnessItem.slider.value);

            this.idleId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        if (this.idleId) {
            GLib.source_remove(this.idleId);
            this.idleId = 0;
        }
        
        this.label?.destroy();
        this.label = undefined;
    }

    private updateLabel(newValue: number) {
        if (!this.label) return;

        const brightnessPercent = Math.round(newValue * 100);
        this.label.text = `${brightnessPercent}%`;
    }
}

export default class SliderPercentagesExtension extends Extension {
    private osdLabels?: OsdLabels;
    private qsVolumeLabel?: QuickSettingsVolumeLabel;
    private qsBrightnessLabel?: QuickSettingsBrightnessLabel;

    enable() {
        const settings = this.getSettings();

        this.osdLabels = new OsdLabels(settings);
        this.osdLabels.enable();

        this.qsVolumeLabel = new QuickSettingsVolumeLabel(settings, this.uuid);
        this.qsVolumeLabel.enable();

        this.qsBrightnessLabel = new QuickSettingsBrightnessLabel(settings);
        this.qsBrightnessLabel.enable();
    }

    disable() {
        this.osdLabels?.disable();
        this.osdLabels = undefined;

        this.qsVolumeLabel?.disable();
        this.qsVolumeLabel = undefined;

        this.qsBrightnessLabel?.disable();
        this.qsBrightnessLabel = undefined;
    }
}
