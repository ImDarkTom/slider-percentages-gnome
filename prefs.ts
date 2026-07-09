import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gtk from 'gi://Gtk';

export default class SliderPercentagesPreferences extends ExtensionPreferences {
    private static createLabelPrefsGroup(settings: Gio.Settings): Adw.PreferencesGroup {
        const labelGroup = new Adw.PreferencesGroup({
            title: _('Label'),
            description: _('Customise the added label'),
        });


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


        const fontFamilyRow = new Adw.ComboRow({
            title: _('Font Family'),
            subtitle: _('Which font family the labels use'),
            model: Gtk.StringList.new([
                _('System Default'),
                _('Sans Serif'),
                _('Serif'),
                _('Monospace'),
                _('Custom'),
            ]),
        });

        labelGroup.add(fontFamilyRow);
        settings.bind('label-font-family', fontFamilyRow, 'selected', Gio.SettingsBindFlags.DEFAULT);


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


        SliderPercentagesPreferences.createSwitchRow({
            title: 'Include Percentage Symbol',
            subtitle: 'Add the percentage symbol next to the label',
            group: labelGroup,
            settings,
            key: 'label-include-percentage-symbol',
        });

        return labelGroup;
    }

    private static createSwitchRow({ title, subtitle, group, settings, key }: {
        title: string,
        subtitle: string,
        group: Adw.PreferencesGroup,
        settings: Gio.Settings,
        key: string,
    }) {
        const switchRow = new Adw.SwitchRow({
            title: _(title),
            subtitle: _(subtitle),
        });

        group.add(switchRow);
        settings.bind(key, switchRow, 'active', Gio.SettingsBindFlags.DEFAULT);
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
        SliderPercentagesPreferences.createSwitchRow({
            title: 'Volume Slider',
            subtitle: 'Show a volume percentage label next to the volume slider in the quick settings',
            group: quickSettingsGroup,
            settings,
            key: 'quick-settings-volume'
        });

        SliderPercentagesPreferences.createSwitchRow({
            title: 'Brightness Slider',
            subtitle: 'Show a brightness percentage label next to the brightness slider in the quick settings',
            group: quickSettingsGroup,
            settings,
            key: 'quick-settings-brightness'
        });

        // OSD group
        const osdGroup = new Adw.PreferencesGroup({
            title: _('On-Screen Display'),
            description: _('Additions for OSD popups'),
        });

        page.add(osdGroup);

        // OSD items
        SliderPercentagesPreferences.createSwitchRow({
            title: 'Volume Popup',
            subtitle: 'Show a volume percentage next to the OSD volume popup',
            group: osdGroup,
            settings,
            key: 'osd-volume'
        });

        SliderPercentagesPreferences.createSwitchRow({
            title: 'Brightness Popup',
            subtitle: 'Show a brightness percentage next to the OSD brightness popup',
            group: osdGroup,
            settings,
            key: 'osd-brightness'
        });

        SliderPercentagesPreferences.createSwitchRow({
            title: 'Keyboard Backlight Popup',
            subtitle: 'Show a brightness level next to the OSD keyboard backlight popup (if supported)',
            group: osdGroup,
            settings,
            key: 'osd-keyboard-backlight'
        });

        // Label Group

        const labelGroup = SliderPercentagesPreferences.createLabelPrefsGroup(settings);
        page.add(labelGroup);

        window.add(page);

        return Promise.resolve();
    }
}
