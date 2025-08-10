import wixData from 'wix-data';

// This function recursively finds all element IDs on the page.
function findAllElementIds(element, idSet) {
    if (element && element.id) {
        idSet.add(`#${element.id}`);
    }
    if (element.children && element.children.length > 0) {
        element.children.forEach(child => {
            findAllElementIds(child, idSet);
        });
    }
}

$w.onReady(function () {
    $w("#exportButton").onClick(async (event) => {
        // --- 1. GET PAGE ELEMENT IDs ---
        const allElementIds = new Set();
        const page = $w.at(event.context);
        findAllElementIds(page, allElementIds);
        
        const elementsHeader = "PAGE ELEMENT IDs:\n===================";
        const elementsText = [...allElementIds].sort().join("\n");

        // --- 2. GET COLLECTION & FIELD IDs ---
        const collectionsText = await getCollectionSchemas();

        // --- 3. DISPLAY EVERYTHING ---
        $w("#outputBox").value = `${elementsHeader}\n${elementsText}\n\n${collectionsText}`;
    });
});

// This function calls the backend to get the schemas.
async function getCollectionSchemas() {
    try {
        // FIX: The function is named getCollections, not listCollections.
        const schemas = await wixData.getCollections({ includeHidden: false });
        let output = "COLLECTION & FIELD IDs:\n=======================";

        for (const collection of schemas) {
            output += `\n\nCollection ID: "${collection.id}"`;
            if (collection.fields) {
                collection.fields.forEach(field => {
                    output += `\n  - ${field.key} (${field.type})`;
                });
            }
        }
        return output;
    } catch (error) {
        return `Error fetching collections: ${error.message}`;
    }
}