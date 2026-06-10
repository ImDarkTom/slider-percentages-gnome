import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SliderPercentagesPreferences extends ExtensionPreferences {
    _settings?: Gio.Settings;

    fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        this._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            iconName: 'dialog-information-symbolic',
        });

        // QS group
        const quickSettingsGroup = new Adw.PreferencesGroup({
            title: _('Quick Settings'),
            description: _('Additions for the Quick Settings panel'),
        });

        page.add(quickSettingsGroup);

        // QS items
        const quickSettingsVolumeEnabled = new Adw.SwitchRow({
            title: _('Volume Slider'),
            subtitle: _('Show a volume percentage label next to the volume slider in the quick settings'),
        });


        quickSettingsGroup.add(quickSettingsVolumeEnabled);

        // OSD group
        const osdGroup = new Adw.PreferencesGroup({
            title: _('On-Screen Display'),
            description: _('Additions for OSD popups'),
        });

        page.add(osdGroup);

        // OSD items
        const osdVolumeEnabled = new Adw.SwitchRow({
            title: _('Volume Popup'),
            subtitle: _('Show a volume percentage next to the OSD volume popup'),
        });

        osdGroup.add(osdVolumeEnabled);

        const osdBrightnessEnabled = new Adw.SwitchRow({
            title: _('Brightness Popup'),
            subtitle: _('Show a brightness percentage next to the OSD brightness popup'),
        });

        osdGroup.add(osdBrightnessEnabled);

        window.add(page)

        this._settings!.bind('quick-settings-volume', quickSettingsVolumeEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);

        this._settings!.bind('osd-volume', osdVolumeEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._settings!.bind('osd-brightness', osdBrightnessEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);

        return Promise.resolve();
    }
}