GNOME Vagrant Indicator
=======================

Inspired by [vgapplet](https://github.com/candidtim/vagrant-appindicator),
**GNOME Vagrant Indicator** lets you easily manage your vagrant machines
from status area.

## Features

- displays last known state of Vagrant-managed VMs
- shows notification when machines state changes
- allows opening Terminal in the VM's home directory
- allows opening default File Manager in the VM's home directory
- allows editing VM's Vagrantfile
- allows executing basic vagrant commands on VM
	- up
	- provision
	- ssh
	- rdp
	- resume
	- suspend
	- halt
	- destroy

_Last known state of Vagrant-managed VMs_ is taken from vagrant machine index
file, which means that the state in indicator will only be accurate if
machine is managed by vagrant. If the machine is powered with eq.
virtualbox, the state in indicator won't change.

## Installation

To have working indicator, [vagrant](https://www.vagrantup.com/) must be installed
on your system.

- install using [GNOME Shell extension website](https://extensions.gnome.org/extension/1269/gnome-vagrant-indicator/)
- build and install from source
	- download source from GitHub (clone repository or download zip)
	- from `gnome-vagrant-indicator` directory execute `make install`
- bash one-liner
	- `wget https://raw.githubusercontent.com/fffilo/gnome-vagrant-indicator/master/install.sh -O - | sh`

## Credits

- [HashiCorp](https://www.hashicorp.com/), author of [vagrant](https://www.vagrantup.com/) tool for building and distributing virtualized development environments
- unknown author of [indicator icon](https://www.vagrantup.com/assets/images/logo-hashicorp-e1aea9d4.svg) (modified by [Franjo Filo](https://github.com/fffilo/))
- [Timur Rubeko](https://github.com/candidtim/), author of [vgapplet](https://github.com/candidtim/vagrant-appindicator) (for inspiration)
- [Giovanni Campagna](https://github.com/gcampax/), author of [convenience.js](https://github.com/gcampax/gnome-shell-extensions/blob/master/lib/convenience.js)
