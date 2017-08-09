#!/bin/bash

# clear
rm -rf /tmp/gnome-vagrant-indicator*

# download
wget -O /tmp/gnome-vagrant-indicator.zip https://github.com/fffilo/gnome-vagrant-indicator/archive/master.zip

# unarchive
unzip /tmp/gnome-vagrant-indicator.zip -d /tmp

# install
make --directory=/tmp/gnome-vagrant-indicator-master install

# clear
rm -rf /tmp/gnome-vagrant-indicator*
