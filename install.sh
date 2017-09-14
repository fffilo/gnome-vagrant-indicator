#!/bin/bash

URL="https://github.com/fffilo"
UUID="gnome-vagrant-indicator"
BRANCH="master"
BUILD="/tmp"

# first argument (branch) exists?
[ -n "$1" ] && BRANCH="$1"

# clear
rm -rf ${BUILD}/${UUID}*

# download
wget -O ${BUILD}/${UUID}.zip ${URL}/${UUID}/archive/${BRANCH}.zip

# unarchive
unzip ${BUILD}/${UUID}.zip -d ${BUILD}

# install
make --directory=${BUILD}/${UUID}-master install

# clear
rm -rf ${BUILD}/${UUID}*
