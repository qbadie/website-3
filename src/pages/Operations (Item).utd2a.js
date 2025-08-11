import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
// ACTION REQUIRED: Verify these collection and field names match your site's database (CMS)
const COLLECTIONS = {
    OPERATIONS: "Operations",
    FAMILIES: "Families",
    DONORS: "Donors",
    INDIVIDUALS: "Individuals"
};

const FIELDS = {
    // Reference fields in the 'Operations' collection
    OP_FAMILY_REF: "linkedFamily",
    OP_DONOR_REF: "linkedDonor",
    OP_INDIVIDUAL_REF: "linkedIndividual",

    // Reference field in the 'Individuals' collection linking to a Family
    INDIVIDUAL_FAMILY_REF: "family"
};
// ====================================================================


$w.onReady(function () {
    // Main dataset for the current Operation item
    $w('#dynamicDataset').onReady(() => {
        const currentOperation = $w('#dynamicDataset').getCurrentItem();

        // CRITICAL FIX: Check if the main item loaded correctly.
        // This stops all other code from running if the page URL is invalid.
        if (!currentOperation) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load an item. Please check that the URL is correct and that the item exists.");
            // Optional: Display a user-friendly error message on the page.
            // $w('#errorMessage').text = "Sorry, we couldn't load the details for this request.";
            // $w('#errorMessage').expand();
            return; // Stop execution
        }
        
        // If the item loaded, proceed with setting up the page.
        setupEventHandlers(currentOperation);
        initialUiSetup();
    });
});

/**
 * Sets the initial state of the page, collapsing search sections.
 * This now selects elements individually to prevent VSCode errors.
 */
function initialUiSetup() {
    // Collapse search UIs individually
    $w('#familySearchTable').collapse();
    $w('#familySearchInput').collapse();
    $w('#donorSearchTable').collapse();
    $w('#donorSearchInput').collapse();

    // Check if a family is linked to this operation
    const linkedFamiliesCount = $w('#dataset1').getTotalCount();

    // Hide or show the entire individuals section based on whether a family is linked.
    if (linkedFamiliesCount > 0) {
        $w('#familyMembersDisplayTable').expand();
        $w('#linkedMemberRepeater').expand();
        $w('#newMemberBox').expand();
    } else {
        $w('#familyMembersDisplayTable').collapse();
        $w('#linkedMemberRepeater').collapse();
        $w('#newMemberBox').collapse();
    }
}

/**
 * Sets up all interactive element event handlers for the page.
 * @param {object} currentOperation - The current operation item from the dynamic dataset.
 */
function setupEventHandlers(currentOperation) {
    const operationId = currentOperation._id;

    // --- Repeater "Remove Link" Button Handlers ---
    $w('#linkedFamilyRepeater').onItemReady(($item, itemData) => {
        $item('#removeLinkedFamilyButton').onClick(() => handleRemoveLink(operationId, itemData._id, 'Family'));
    });
    $w('#linkedDonorsRepeater').onItemReady(($item, itemData) => {
        $item('#removeLinkedDonorButton').onClick(() => handleRemoveLink(operationId, itemData._id, 'Donor'));
    });
    $w('#linkedMemberRepeater').onItemReady(($item, itemData) => {
        $item('#removeLinkedMemberButton').onClick(() => handleRemoveLink(operationId, itemData._id, 'Individual'));
    });

    // --- "Add Existing" Button Handlers ---
    $w('#addExistingFamily').onClick(() => {
        $w('#familySearchTable').expand();
        $w('#familySearchInput').expand();
    });
    $w('#addExistingDonor').onClick(() => {
        $w('#donorSearchTable').expand();
        $w('#donorSearchInput').expand();
    });

    // --- Search Input Handlers ---
    $w('#familySearchInput').onInput(() => filterSearchTable('Family'));
    $w('#donorSearchInput').onInput(() => filterSearchTable('Donor'));

    // --- Search Table Row Select Handlers ---
    $w('#familySearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Family'));
    $w('#donorSearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Donor'));

    // --- Individual/Family Member Handlers ---
    $w('#addNewMemberButton').onClick(() => handleAddNewMember());
    $w('#familyMembersDisplayTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Individual'));
}


/**
 * Handles linking an item (Family, Donor, or Individual) to the current Operation.
 * @param {string} operationId - The _id of the current operation.
 * @param {object} selectedItem - The full item object selected from a search table.
 * @param {string} type - The type of item being linked: 'Family', 'Donor', or 'Individual'.
 */
async function handleLink(operationId, selectedItem, type) {
    try {
        let collectionName, refField, linkedDataset;

        if (type === 'Family') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_FAMILY_REF;
            linkedDataset = $w('#dataset1'); // Use direct element reference
            $w('#familySearchTable').collapse();
            $w('#familySearchInput').collapse();
        } else if (type === 'Donor') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = $w('#dataset5'); // Use direct element reference
            $w('#donorSearchTable').collapse();
            $w('#donorSearchInput').collapse();
        } else if (type === 'Individual') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = $w('#dataset3'); // Use direct element reference
        }

        await wixData.insertReference(collectionName, refField, operationId, selectedItem._id);
        await linkedDataset.refresh();
        console.log(`Successfully linked ${type} ${selectedItem._id} to Operation ${operationId}`);

        if (type === 'Family') {
            await initialUiSetup(); // Refresh UI to show/hide individuals section
        }

    } catch (err) {
        console.error(`Error linking ${type}:`, err);
    }
}

/**
 * Handles removing a reference from the current Operation.
 * @param {string} operationId - The _id of the current operation.
 * @param {string} itemIdToRemove - The _id of the item to be unlinked.
 * @param {string} type - The type of item being unlinked: 'Family', 'Donor', or 'Individual'.
 */
async function handleRemoveLink(operationId, itemIdToRemove, type) {
    try {
        let collectionName, refField, linkedDataset;

        if (type === 'Family') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_FAMILY_REF;
            linkedDataset = $w('#dataset1'); // Use direct element reference
        } else if (type === 'Donor') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = $w('#dataset5'); // Use direct element reference
        } else if (type === 'Individual') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = $w('#dataset3'); // Use direct element reference
        }

        await wixData.removeReference(collectionName, refField, operationId, itemIdToRemove);
        await linkedDataset.refresh();
        console.log(`Successfully unlinked ${type} ${itemIdToRemove} from Operation ${operationId}`);
        
        if (type === 'Family') {
            await initialUiSetup(); // Refresh UI to show/hide individuals section
        }

    } catch (err) {
        console.error(`Error removing ${type} link:`, err);
    }
}

/**
 * Filters the search tables for Families or Donors.
 */
async function filterSearchTable(type) {
    let searchDataset, searchInput, searchableFields;

    if (type === 'Family') {
        searchDataset = $w('#dataset2');
        searchInput = $w('#familySearchInput');
        searchableFields = ['headOfFamily', 'familyMembers', 'familyDescription'];
    } else { // 'Donor'
        searchDataset = $w('#dataset6');
        searchInput = $w('#donorSearchInput');
        searchableFields = ['donorName', 'organizationName', 'donorEmail'];
    }

    const searchTerm = searchInput.value;
    let filter = wixData.filter();

    if (searchTerm && searchTerm.length > 0) {
        filter = searchableFields.map(field => wixData.filter().contains(field, searchTerm))
                                 .reduce((f1, f2) => f1.or(f2));
    }

    await searchDataset.setFilter(filter);
}

/**
 * Creates a new individual item and links it to the currently displayed family.
 */
async function handleAddNewMember() {
    const linkedFamily = await $w('#dataset1').getCurrentItem();
    if (!linkedFamily) {
        console.error("Cannot add member: no family is linked to this operation.");
        return;
    }

    const newMember = {
        age: $w('#newMemberAgeInput').value,
        boyOrGirl: $w('#newMemberBoyOrGirlInput').value,
        sizeOrInfo: $w('#newMemberSizeOrInfoInput').value,
        [FIELDS.INDIVIDUAL_FAMILY_REF]: linkedFamily._id
    };

    try {
        await wixData.insert(COLLECTIONS.INDIVIDUALS, newMember);
        await $w('#dataset4').refresh();
        console.log("Successfully added new family member.");
        
        // Clear input fields individually
        $w('#newMemberAgeInput').value = "";
        $w('#newMemberBoyOrGirlInput').value = "";
        $w('#newMemberSizeOrInfoInput').value = "";
    } catch (err) {
        console.error("Failed to add new member:", err);
    }
}