PREFIX     ?= /usr/local
BINDIR     ?= $(PREFIX)/bin
SYSTEMDDIR ?= /etc/systemd/system
CONFDIR    ?= /etc/init-secret-launcher/conf.d
SCRIPT_NAME = init-secret-launcher-unlock.sh
SERVICE_NAME = auto-unlocker.service
TIMER_NAME  = auto-unlocker.timer

.PHONY: install install-script install-service install-timer install-config \
        enable start restart status logs uninstall

install: install-script install-service install-timer

install-script:
	install -m 755 unlock.sh $(DESTDIR)$(BINDIR)/$(SCRIPT_NAME)

install-service:
	install -m 644 $(SERVICE_NAME) $(DESTDIR)$(SYSTEMDDIR)/$(SERVICE_NAME)
	systemctl daemon-reload

install-timer:
	install -m 644 $(TIMER_NAME) $(DESTDIR)$(SYSTEMDDIR)/$(TIMER_NAME)
	systemctl daemon-reload

install-config:
	mkdir -p $(DESTDIR)$(CONFDIR)
ifndef NAME
	@echo "ERROR: NAME is required (e.g. NAME=production)" >&2
	@exit 1
endif
ifndef URL
	@echo "ERROR: URL is required (e.g. URL=http://10.0.0.5:3000)" >&2
	@exit 1
endif
ifndef PASSWORD
	@echo "ERROR: PASSWORD is required" >&2
	@exit 1
endif
	@{ \
		echo "# $(NAME)"; \
		echo "LAUNCHER_URL=$(URL)"; \
		echo "PASSWORD=$(PASSWORD)"; \
	} > $(DESTDIR)$(CONFDIR)/$(NAME).conf
	chmod 600 $(DESTDIR)$(CONFDIR)/$(NAME).conf

enable:
	systemctl enable $(TIMER_NAME)

start:
	systemctl start $(TIMER_NAME)

restart:
	systemctl restart $(TIMER_NAME)

status:
	systemctl status $(SERVICE_NAME)
	systemctl status $(TIMER_NAME)

logs:
	journalctl -u $(SERVICE_NAME) -f

uninstall:
	systemctl stop $(TIMER_NAME) 2>/dev/null || true
	systemctl disable $(TIMER_NAME) 2>/dev/null || true
	rm -f $(DESTDIR)$(SYSTEMDDIR)/$(TIMER_NAME)
	systemctl stop $(SERVICE_NAME) 2>/dev/null || true
	systemctl disable $(SERVICE_NAME) 2>/dev/null || true
	rm -f $(DESTDIR)$(SYSTEMDDIR)/$(SERVICE_NAME)
	rm -f $(DESTDIR)$(BINDIR)/$(SCRIPT_NAME)
	rm -rf $(DESTDIR)$(CONFDIR)
	systemctl daemon-reload
