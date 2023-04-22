// Prompt the user for a yes or no decision.
export function promptUser(title, text, yesCallback, noCallback) {
    let dialog = new Dialog({
        title: title,
        content: `<p>${text}</p>`,
        buttons: {
            yes: {
            icon: '<i class="fas fa-check"></i>',
            label: "Yes",
            callback: yesCallback
            },
            no: {
            icon: '<i class="fas fa-times"></i>',
            label: "No",
            callback: noCallback
            }
        },
        default: "yes",
        render: html => console.log("morby-active-effects: rendered user prompt"),
        close: html => console.log("morby-active-effects: user prompt closed")
    });
    dialog.render(true);
}

// Determines is the current user is the actual owner of an actor and not just the GM.
// Allows the GM to be the actual owner if only the GM is the owner.
export function isActualOwner(actor) {
    return actor.isOwner && !game.user.isGM || game.user.isGM && Object.values(actor.ownership).filter(level => level == 3).length == 1;
}

export function noAction() {}
