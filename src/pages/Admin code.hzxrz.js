import wixData from 'wix-data';

$w.onReady(function () {
    // This code runs when the page is ready.
    // We will set up the button's click event here.

    $w("#exportButton").onClick(async () => {
        // Show a "loading" message in the text box
        $w("#outputBox").value = "Generating IDs, please wait...";

        // --- GET ALL COLLECTION IDs ---
        const collections = await wixData.getCollections();
        const collectionIDs = collections.map(c => c.id);
        const collectionText = "DATABASE COLLECTIONS:\n" + "=====================\n" + collectionIDs.join("\n");

        // --- GET ALL PAGE ELEMENT IDs ---
        // The $w("*") selector gets every element on the page
        const allElements = $w("*");
        const elementIDs = allElements.map(element => "#" + element.id);
        const elementText = "PAGE ELEMENT IDs:\n" + "=================\n" + elementIDs.join("\n");

        // --- DISPLAY THE RESULTS ---
        // Combine everything and put it in the output text box
        $w("#outputBox").value = collectionText + "\n\n" + elementText;
    });
});