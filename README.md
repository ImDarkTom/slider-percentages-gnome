# GNOME Extension - Slider Percentages

Adds percentage labels next to the various sliders/bars throughout the GNOME interface. Currently supports:

**Quick Settings**:

- Volume Slider
- Brightness Slider

**On-Screen Display**:

- Volume Popup
- Brightness Popup
- Keyboard Backlight Popup

All of the above labels are toggleable, so if you feel you don't need some you can simply disable them individially. 

You can customise the font weight, font family, as well as disable the percentage symbol and only show the number. OSD popups and quick settings labels may be customised individually.

## Screenshots

*Quick Settings*:

<img width="250" height="audo" alt="Quick Settings Preview" src="https://github.com/user-attachments/assets/63ae7ae1-c426-4cf4-8292-c9a04b830339" />

*OSD Popups*:

<img width="250" height="auto" alt="Volume OSD Preview" src="https://github.com/user-attachments/assets/cfa8d650-85cc-4e79-8934-d332aa41f2f6" />

<img width="250" height="auto" alt="Brightness OSD Preview" src="https://github.com/user-attachments/assets/6a1b4473-a3e2-4c5e-a014-476ac4f21967" />

<img width="250" height="auto" alt="Keyboard Backlight OSD Preview" src="https://github.com/user-attachments/assets/8881600e-463e-45a1-93c0-db5bbbb546d8" />

*Preferences screen as of V2*

<img width="320" height="auto" alt="Preferences Window" src="https://github.com/user-attachments/assets/023df87e-28a2-4034-9c54-5fda753763b8" />


## Extension Compatibility

The following extensions have been tested and are compatible:

- [Quick Settings Audio Panel](https://extensions.gnome.org/extension/5940/quick-settings-audio-panel/) (v103 tested)

## Development

Prerequisites:
- NodeJS 24.x
- Make

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
