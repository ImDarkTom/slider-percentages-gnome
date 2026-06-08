import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gvc from 'gi://Gvc';
import Gio from "gi://Gio";

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class SliderPercentagesExtension extends Extension {
    _mixer?: Gvc.MixerControl;
    _sink?: Gvc.MixerStream;

    _idleId?: number;
    _label?: St.Label;

    gsettings?: Gio.Settings;

    enable() {
        this.gsettings = this.getSettings();

        // Connect to mixer to track sink changes
        this._mixer = new Gvc.MixerControl({ name: this.uuid });
        this._mixer.connectObject('default-sink-changed', (mixer: Gvc.MixerControl) => this._onSinkChanged(mixer), this);
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
                throw new Error(`${this.uuid}: Failed to find volume slider in quick settings.`);
            }

            // [mute button] [slider] [<our inserted label>] [settings button]
            sliderRow.insert_child_at_index(this._label, 2);

            this._update();

            this._idleId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    _onSinkChanged(mixer: Gvc.MixerControl) {
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

    _update() {
        if (!this._label || !this._sink || !this._mixer) return;

        const volumePercent = Math.round(this._sink.get_volume() / this._mixer.get_vol_max_norm() * 100);
        this._label.text = this._sink.get_is_muted() ? '0%' : `${volumePercent}%`;
    }

    disable() {
        this.gsettings = undefined;

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
