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
    // @ts-ignore
    const exportButton = $w("#exportButton");
    // @ts-ignore
    const outputBox = $w("#outputBox");

    exportButton.onClick((event) => {
        const allElementIds = new Set();

        // FIX: Instead of using the event context, we directly
        // select the main 'Page' element itself.
        const page = $w("Page");
        
        // Start the search from the page element.
        findAllChildren(page, allElementIds);
        
        const header = "ELEMENT IDs ON THIS PAGE:\n=========================";
        const outputText = [...allElementIds].sort().join("\n");

        // Update the output box's value with the results.
        outputBox.value = header + "\n" + outputText;
    });
});