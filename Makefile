INSTALL_PATH = ~/.local/share/gnome-shell/extensions
INSTALL_NAME = gnome-vagrant-indicator@gnome-shell-exstensions.fffilo.github.com
BUILD_DIR = _build
FILES = assets/ CHANGELOG.md convenience.js COPYING enum.js extension.js icons.js indicator.js menu.js metadata.json notification.js prefs.css prefs.js README.md schemas/ settings.js stylesheet.css translation.js vagrant.js

install: build
	rm -rf $(INSTALL_PATH)/$(INSTALL_NAME)
	mkdir -p $(INSTALL_PATH)/$(INSTALL_NAME)
	cp -r --preserve=timestamps $(BUILD_DIR)/* $(INSTALL_PATH)/$(INSTALL_NAME)
	rm -rf $(BUILD_DIR)
	echo Installed in $(INSTALL_PATH)/$(INSTALL_NAME)

build: compile-schema
	rm -rf $(BUILD_DIR)
	mkdir $(BUILD_DIR)
	cp -r --preserve=timestamps $(FILES) $(BUILD_DIR)
	echo Build was successfull

compile-schema:
	glib-compile-schemas schemas

clean:
	rm -rf $(BUILD_DIR)

uninstall:
	rm -rf $(INSTALL_PATH)/$(INSTALL_NAME)
