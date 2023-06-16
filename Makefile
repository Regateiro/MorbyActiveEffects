INSTALL_PATH=~/.local/share/FoundryVTT/Data/modules/morby-active-effects

.PHONY: compress install

compress:
	cd src/ && zip -r module.zip * && mv module.zip ../

install: compress
	rm -rf $(INSTALL_PATH)
	mkdir $(INSTALL_PATH)
	unzip module.zip -d $(INSTALL_PATH)