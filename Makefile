NAME = slider-percentages
UUID = $(NAME)@imdarktom

.PHONY: all pack install clean

all: dist/extension.js

node_modules/.package_lock.json: package.json
	npm install

dist/extension.js dist/prefs.js: node_modules/.package_lock.json *.ts
	npm run build

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.$(NAME).gschema.xml
	glib-compile-schemas schemas

$(UUID).zip: dist/extension.js dist/prefs.js schemas/gschemas.compiled
	@mkdir -p build/
	@cp -r schemas dist/
	@cp metadata.json dist/
	@(cd dist && zip ../build/$(UUID).zip -9r .)

pack: $(UUID).zip

install: $(UUID).zip
	gnome-extensions install --force build/$(UUID).zip

clean:
	@rm -rf dist node_modules build/


test-shell: install
	dbus-run-session gnome-shell --devkit --wayland
