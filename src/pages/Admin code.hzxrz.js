import wixData from 'wix-data';

// This function will find all element IDs by starting from a parent element
// and recursively searching through all its children.
function findAllChildren(element, idSet) {
    // Add the current element's ID to our set.
    if (element && element.id) {
        idSet.add(`#${element.id}`);
    }

    // If the element has children, run this function for each child.
    if (element.children && element.children.length > 0) {
        element.children.forEach(child => {
            // This is the recursive part.
            findAllChildren(child, idSet);
        });
    }
}

$w.onReady(function () {
    $w("#exportButton").onClick((event) => {
        // Create a new Set to hold the IDs and prevent duplicates.
        const allElementIds = new Set();

        // Get the page element itself using the event's context.
        const page = $w.at(event.context);
        
        // Start the recursive search from the main page element.
        findAllChildren(page, allElementIds);
        
        // Format the text for a clean output.
        const header = "ELEMENT IDs ON THIS PAGE:\n=========================";
        const outputText = [...allElementIds].sort().join("\n");

        // Display the final, sorted list in your text box.
        $w("#outputBox").value = header + "\n" + outputText;
    });
});