INSTALL_PATH = ~/.local/share/gnome-shell/extensions
INSTALL_NAME = gnome-vagrant-indicator@gnome-shell-exstensions.fffilo.github.com
BUILD_DIR = _build
FILES = assets/ CHANGELOG.md config-index.js convenience.js COPYING enum.js extension.js icons.js indicator.js menu.js metadata.json monitor.js notification.js prefs.css prefs.js README.md schemas/ settings.js stylesheet.css terminal.js translation.js vagrant.js

install: build
	rm -rf $(INSTALL_PATH)/$(INSTALL_NAME)
	mkdir -p $(INSTALL_PATH)/$(INSTALL_NAME)
	cp -r --preserve=timestamps $(BUILD_DIR)/* $(INSTALL_PATH)/$(INSTALL_NAME)
	rm -rf $(BUILD_DIR)
	echo Installed in $(INSTALL_PATH)/$(INSTALL_NAME)

archive: build
	cd ${BUILD_DIR} && zip -r ../archive.zip *
	rm -rf $(BUILD_DIR)
	echo Archive created

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


