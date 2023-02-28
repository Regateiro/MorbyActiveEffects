INSTALL_PATH=~/.local/share/FoundryVTT/Data/modules/ishiir-active-effects

.PHONY: compress local-install

compress:
	cd ishiir-active-effects/ && zip -r module.zip * && mv module.zip ../

install: compress
	rm -rf $(INSTALL_PATH)
	mkdir $(INSTALL_PATH)
	unzip module.zip -d $(INSTALL_PATH)