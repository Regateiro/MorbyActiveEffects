export async function _rollAttack(wrapper, config) {
    if(this.parent?.flags?.dnd5e?.bladeMastery && ["dagger", "longsword", "shortsword", "scimitar", "rapier", "greatsword"].includes(this.system.baseItem)) {
        config['elvenAccuracy'] = true;
    } else if(this.parent?.flags?.dnd5e?.greaterRage) {
        config['elvenAccuracy'] = true;
    }
    return await wrapper.call(this, config);
};