UUID = slider-percentages@imdarktom

.PHONY: build install test-shell remove clean

build: clean
	mkdir -p build/
	zip -r build/$(UUID).zip \
		*.js \
		*.json

install: build remove
	gnome-extensions install -f build/$(UUID).zip

test-shell: install
	dbus-run-session gnome-shell --devkit --wayland

remove:
	rm -rf $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

clean:
	rm -rf build/