#!/bin/bash

URL="https://github.com/fffilo"
UUID="gnome-vagrant-indicator"
BUILD="/tmp"

# clear
rm -rf ${BUILD}/${UUID}*

# download
wget -O ${BUILD}/${UUID}.zip ${URL}/${UUID}/archive/master.zip

# unarchive
unzip ${BUILD}/${UUID}.zip -d ${BUILD}

# install
make --directory=${BUILD}/${UUID}-master install

# clear
rm -rf ${BUILD}/${UUID}*
