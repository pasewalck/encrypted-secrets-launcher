# Encrypted Secrets Launcher Unlocker

A timed service to incrementally check any number of instances of the [Encrypted Secrets Launcher](https://github.com/pasewalck/encrypted-secrets-launcher) project and send an unlock request with a predefined password.

## Setup

Run make install, start and enable.

```
sudo make install
sudo make enable
sudo make start
```

Create configs for any number of instances. This can be done via `sudo make start` or alternatively by manually placing a `some-name.conf` in `/etc/init-secret-launcher/conf.d/` using the following format:

```
#/etc/init-secret-launcher/conf.d/some-name.conf
LAUNCHER_URL=https://example.org
PASSWORD=secret
```