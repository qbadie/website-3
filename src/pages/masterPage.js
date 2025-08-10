// This function recursively finds all element IDs on the page.
function findAllChildren(element, idSet) {
    if (element && element.id) {
        idSet.add(`#${element.id}`);
    }
    if (element.children && element.children.length > 0) {
        element.children.forEach(child => {
            findAllChildren(child, idSet);
        });
    }
}

$w.onReady(function () {
    // Select the button and text box directly. This is the correct syntax
    // for selecting global elements (in the header) from masterPage.js.
    // @ts-ignore
    const exportButton = $w("#exportButton");
    // @ts-ignore
    const outputBox = $w("#outputBox");

    // Set up the click event for the button.
    exportButton.onClick((event) => {
        const allElementIds = new Set();

        // Now, INSIDE the click handler, we can use event.context
        // to get a reference to the current PAGE being viewed.
        const page = $w.at(event.context);
        
        // Start the search from the page element.
        findAllChildren(page, allElementIds);
        
        const header = "ELEMENT IDs ON THIS PAGE:\n=========================";
        const outputText = [...allElementIds].sort().join("\n");

        // Update the output box's value with the results.
        outputBox.value = header + "\n" + outputText;
    });
});