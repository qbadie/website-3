import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
// ====================================================================
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
// --- Page Setup ---
// ====================================================================

$w.onReady(function () {
    // Main dataset for the current Operation item
    $w('#dynamicDataset').onReady(async () => {
        const currentOperation = $w('#dynamicDataset').getCurrentItem();

        if (currentOperation) {
            // Set up all click and input handlers
            setupEventHandlers(currentOperation);
            // Set the initial visibility of page sections
            await initialUiSetup();
        } else {
            console.error("Dynamic item failed to load. Cannot initialize page.");
        }
    });
});

/**
 * Sets the initial state of the page, collapsing search sections
 * and managing the visibility of the individuals section.
 */
async function initialUiSetup() {
    // Collapse all search UIs on page load
    $w('#familySearchTable, #familySearchInput').collapse();
    $w('#donorSearchTable, #donorSearchInput').collapse();

    // Check if a family is linked to this operation
    const linkedFamiliesCount = $w('#dataset1').getTotalCount();

    if (linkedFamiliesCount > 0) {
        // If family is linked, show the individuals section
        $w('#familyMembersDisplayTable, #linkedMemberRepeater, #newMemberBox').expand();
    } else {
        // Otherwise, hide the individuals section
        $w('#familyMembersDisplayTable, #linkedMemberRepeater, #newMemberBox').collapse();
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
        $w('#familySearchTable, #familySearchInput').expand();
    });
    $w('#addExistingDonor').onClick(() => {
        $w('#donorSearchTable, #donorSearchInput').expand();
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


// ====================================================================
// --- Core Logic Functions ---
// ====================================================================

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
            linkedDataset = '#dataset1';
            $w('#familySearchTable, #familySearchInput').collapse();
        } else if (type === 'Donor') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = '#dataset5';
            $w('#donorSearchTable, #donorSearchInput').collapse();
        } else if (type === 'Individual') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = '#dataset3';
        }

        // Create the reference in the Operations collection
        await wixData.insertReference(collectionName, refField, operationId, selectedItem._id);
        
        // Refresh the corresponding repeater's dataset to show the new item
        await $w(linkedDataset).refresh();
        console.log(`Successfully linked ${type} ${selectedItem._id} to Operation ${operationId}`);

        // If a family was just linked, refresh the UI
        if (type === 'Family') {
            await initialUiSetup();
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
            linkedDataset = '#dataset1';
        } else if (type === 'Donor') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = '#dataset5';
        } else if (type === 'Individual') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = '#dataset3';
        }

        // Remove the reference from the Operations collection
        await wixData.removeReference(collectionName, refField, operationId, itemIdToRemove);
        
        // Refresh the repeater's dataset to remove the item
        await $w(linkedDataset).refresh();
        console.log(`Successfully unlinked ${type} ${itemIdToRemove} from Operation ${operationId}`);
        
        // If a family was unlinked, refresh the UI
        if (type === 'Family') {
            await initialUiSetup();
        }

    } catch (err) {
        console.error(`Error removing ${type} link:`, err);
    }
}

/**
 * Filters the search tables for Families or Donors.
 * @param {string} type - The type of table to filter: 'Family' or 'Donor'.
 */
async function filterSearchTable(type) {
    let searchDataset, searchInput, searchableFields;

    if (type === 'Family') {
        searchDataset = '#dataset2';
        searchInput = '#familySearchInput';
        searchableFields = ['headOfFamily', 'familyMembers', 'familyDescription']; // Add other fields as needed
    } else { // 'Donor'
        searchDataset = '#dataset6';
        searchInput = '#donorSearchInput';
        searchableFields = ['donorName', 'organizationName', 'donorEmail']; // Add other fields as needed
    }

    const searchTerm = $w(searchInput).value;
    let filter = wixData.filter();

    if (searchTerm && searchTerm.length > 0) {
        // Create an 'or' filter across all searchable fields
        filter = searchableFields.map(field => wixData.filter().contains(field, searchTerm))
                                 .reduce((f1, f2) => f1.or(f2));
    }

    await $w(searchDataset).setFilter(filter);
}

/**
 * Creates a new individual item and links it to the currently displayed family.
 */
async function handleAddNewMember() {
    // Get the ID of the currently linked family
    const linkedFamily = await $w('#dataset1').getCurrentItem();
    if (!linkedFamily) {
        console.error("Cannot add member, no family is linked to this operation.");
        // Consider showing a message to the user in the UI
        return;
    }

    // Create the new member object from input fields
    const newMember = {
        age: $w('#newMemberAgeInput').value,
        boyOrGirl: $w('#newMemberBoyOrGirlInput').value,
        sizeOrInfo: $w('#newMemberSizeOrInfoInput').value,
        // ACTION: This links the new individual to the current family
        [FIELDS.INDIVIDUAL_FAMILY_REF]: linkedFamily._id
    };

    try {
        // Insert the new item into the 'Individuals' collection
        await wixData.insert(COLLECTIONS.INDIVIDUALS, newMember);
        
        // Refresh the table of family members to show the new addition
        await $w('#dataset4').refresh();
        console.log("Successfully added new family member.");
        
        // Clear the input fields for the next entry
        $w('#newMemberAgeInput, #newMemberBoyOrGirlInput, #newMemberSizeOrInfoInput').value = "";
    } catch (err) {
        console.error("Failed to add new member:", err);
    }
}