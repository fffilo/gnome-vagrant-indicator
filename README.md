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

**Important** : _Last known state of Vagrant-managed VMs_ is taken from vagrant
machine index file, which means that the state in indicator will only be accurate
if machine is managed by vagrant. If the machine is powered with eq. virtualbox,
the state in indicator won't change.

## Installation

- install using [GNOME Shell extension website](https://extensions.gnome.org/extension/1269/gnome-vagrant-indicator/)
- build and install from source
	- download source from GitHub (clone repository or download zip)
	- from `gnome-vagrant-indicator` directory execute `make install`
- bash one-liner
	- `wget https://raw.githubusercontent.com/fffilo/gnome-vagrant-indicator/master/install.sh -O - | bash`

#### Gnome shell versions

Indicator should work with the newest gnome shell. The older version won't be supported.
But that doesn't mean you can not install older working indicator. The easiest way to
install indicator is to use [GNOME Shell extension website](https://extensions.gnome.org/extension/1269/gnome-vagrant-indicator/).
Just pick your gnome shell version next to download label and install it.

**Important** : To have working indicator, [vagrant](https://www.vagrantup.com/)
must be installed on your system.

## Settings

Use _Preferences_ to setup your indicator. Those settings will apply to all machines.

If you want you can set specific setting for individual machine. Open file
`~/.config/gnome-vagrant-indicator@gnome-shell-exstensions.fffilo.github.com/config.json`.
Set it's content to look something like this:

	{
		"xxx": {
			"order": 1,
			"label": "My App"
		},
		yyy": {
			"order": 2,
			"notifications": false
		}
	}

...where `xxx` and `yyy` are machine ids. Adjust your machine id(s) and property
key(s) (see _Config keys_) and save file. Indicator should immediately refresh.
Note that you do not need to add all machine ids to config, nor you do not need
to add all config keys for each machine.

**Important** : If config is not valid json file it will be ignored (all machines
will use settings set in _Preferences_).

### Config command line helper

To make things easier you can use `config-index` helper:

	gjs ~/.local/share/gnome-shell/extensions/gnome-vagrant-indicator@gnome-shell-exstensions.fffilo.github.com/bin/config-index.js

...which will output your config (all machines with their current values)
which you can paste in `config.json`.

### Config keys

| Key | Type | Description |
| --- | --- | --- |
| `label` | `string` | The machine label displayed in indicator. If omitted it will show machine path/name. |
| `order` | `number` | Machine order. By default machines are ordered chronologically, but you can set your own order with this number. |
| `notifications` | `boolean` | Display notifications for current machine. |
| `machineFullPath` | `boolean` | Display machine full path or just it's basename. Note that this will be ignored if `label` is set. |
| `machineName` | `boolean` | Display machine name next to instance name (path). Note that this will be ignored if `label` is set. |
| `postTerminalAction` | `string` | What to do with terminal emulator when vagrant command finishes. Possible values are `NONE` (leave opened),  `EXIT` (close), or `BOTH` (wait for keypress and close). |
| `displaySystemTerminal` | `boolean` | Display _Open in Terminal_ in _System Commands_ section. This will open default terminal in vagrant machine's path. |
| `displaySystemFileManager` | `boolean` | Display _Open in File Manager_ in _System Commands_ section. This will open default file manager in vagrant machine's path. |
| `displaySystemVagrantfile` | `boolean` | Display _Edit Vagrantfile_ in _System Commands_ section. This will open `Vagrantfile` with default editor. |
| `displayVagrantUp` | `boolean` | Display _Up_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant up` command. |
| `displayVagrantUpProvision` | `boolean` | Display _Up and Provision_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant up --provision` command. |
| `displayVagrantUpSsh` | `boolean` | Display _Up and SSH_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant up; vagrant ssh` command. |
| `displayVagrantUpRdp` | `boolean` | Display _Up and RPD_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant up; vagrant rdp` command. |
| `displayVagrantProvision` | `boolean` | Display _Provision_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant provision` command. |
| `displayVagrantSsh` | `boolean` | Display _SSH_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant ssh` command. |
| `displayVagrantRdp` | `boolean` | Display _RDP_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant rdp` command. |
| `displayVagrantResume` | `boolean` | Display _Resume_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant resume` command. |
| `displayVagrantSuspend` | `boolean` | Display _Suspend_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant suspend` command. |
| `displayVagrantHalt` | `boolean` | Display _Halt_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant halt` command. |
| `displayVagrantDestroy` | `boolean` | Display _Destroy_ in _Vagrant Commands_ section. This will open default terminal and execute `vagrant destroy` command. |

## Credits

- [HashiCorp](https://www.hashicorp.com/), author of [vagrant](https://www.vagrantup.com/) tool for building and distributing virtualized development environments
- [Timur Rubeko](https://github.com/candidtim/), author of [vgapplet](https://github.com/candidtim/vagrant-appindicator) (for inspiration)
