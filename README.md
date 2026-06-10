# GNOME Extension - Slider Percentages

Adds percentage labels next to the various sliders/bars throughout the GNOME interface. Currently supports:

*Quick Settings*:

- Volume Slider
- Brightness Slider

*On-Screen Display*:

- Volume Popup
- Brightness Popup
- Keyboard Backlight Popup

All of the above labels are toggleable, so if you feel you don't need some you can simply disable them individially.

## Screenshots

> tba

## Extension Compatibility

The following extensions have been tested and are compatible:

- [Quick Settings Audio Panel](https://extensions.gnome.org/extension/5940/quick-settings-audio-panel/) (v103 tested)

## Development

To install the extension from source:

```sh
git clone https://github.com/ImDarkTom/slider-percentages-gnome
cd slider-percentages-gnome/
make install
```

The extension will be available after you log out and log back in, or, you can start a test shell to see changes by running:

```sh
make test-shell
```

## Version Support

The following GNOME versions have been tested and are supported:

* 46
* 47
* 48
* 49
* 50

## License

[AGPL-3.0](https://github.com/user-attachments/assets/07590f28-837d-4520-b807-820dbc4ca81a)
