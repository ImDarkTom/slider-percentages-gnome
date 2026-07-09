import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gtk from 'gi://Gtk';

export default class SliderPercentagesPreferences extends ExtensionPreferences {
    static createLabelPrefsGroup(settings: Gio.Settings): Adw.PreferencesGroup {
        const labelGroup = new Adw.PreferencesGroup({
            title: _('Label'),
            description: _('Customise the added label'),
        });


        // Font weight
        const fontWeightRow = new Adw.ComboRow({
            title: _('Font Weight'),
            subtitle: _('How heavy the font is'),
            model: Gtk.StringList.new([
                _('Thin (100)'),
                _('Extra Light (200)'),
                _('Light (300)'),
                _('Normal (400)'),
                _('Medium (500)'),
                _('Semi Bold (600)'),
                _('Bold (700)'),
                _('Extra Bold (800)'),
                _('Black (900)'),
                _('Extra Black (950)'),
            ]),
        });

        labelGroup.add(fontWeightRow);

        settings.bind('label-font-weight', fontWeightRow, 'selected', Gio.SettingsBindFlags.DEFAULT);


        // Font Family
        const fontFamilyRow = new Adw.ComboRow({
            title: _('Font Family'),
            subtitle: _('Which font family the labels use'),
            model: Gtk.StringList.new([
                _('System Default (sans-serif)'),
                _('Serif'),
                _('Monospace'),
                _('Custom'),
            ]),
        });

        labelGroup.add(fontFamilyRow);

        settings.bind('label-font-family', fontFamilyRow, 'selected', Gio.SettingsBindFlags.DEFAULT);


        // Custom font family
        const customFontFamilyRow = new Adw.EntryRow({
            title: _('Custom Font Family'),
            text: settings.get_string('label-custom-font-family'),
        });

        customFontFamilyRow.add_css_class('property');
        customFontFamilyRow.set_tooltip_text(_('Used when Font Family is set to Custom'));

        labelGroup.add(customFontFamilyRow);

        settings.bind(
            'label-custom-font-family',
            customFontFamilyRow,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );

        return labelGroup;
    }

    fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        const settings = this.getSettings();

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

        const quickSettingsBrightnessEnabled = new Adw.SwitchRow({
            title: _('Brightness Slider'),
            subtitle: _('Show a brightness percentage label next to the brightness slider in the quick settings'),
        });

        quickSettingsGroup.add(quickSettingsBrightnessEnabled);

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

        const osdKeyboardBacklightEnabled = new Adw.SwitchRow({
            title: _('Keyboard Backlight Popup'),
            subtitle: _('Show a brightness level next to the OSD keyboard backlight popup (if supported)'),
        });

        osdGroup.add(osdKeyboardBacklightEnabled);

        // Label Group

        const labelGroup = SliderPercentagesPreferences.createLabelPrefsGroup(settings);

        page.add(labelGroup);

        window.add(page);

        settings.bind('quick-settings-volume', quickSettingsVolumeEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('quick-settings-brightness', quickSettingsBrightnessEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);

        settings.bind('osd-volume', osdVolumeEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('osd-brightness', osdBrightnessEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('osd-keyboard-backlight', osdKeyboardBacklightEnabled, 'active', Gio.SettingsBindFlags.DEFAULT);

        return Promise.resolve();
    }
}
