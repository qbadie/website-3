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
    // --- FIX: Select and collapse each element individually ---
    $w('#familySearchTable').collapse();
    $w('#familySearchInput').collapse();
    $w('#donorSearchTable').collapse();
    $w('#donorSearchInput').collapse();

    // Check if a family is linked to this operation
    const linkedFamiliesCount = $w('#dataset1').getTotalCount();

    if (linkedFamiliesCount > 0) {
        // --- FIX: Select and expand each element individually ---
        $w('#familyMembersDisplayTable').expand();
        $w('#linkedMemberRepeater').expand();
        $w('#newMemberBox').expand();
    } else {
        // --- FIX: Select and collapse each element individually ---
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
            // --- FIX: Select and collapse each element individually ---
            $w('#familySearchTable').collapse();
            $w('#familySearchInput').collapse();
        } else if (type === 'Donor') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = '#dataset5';
            // --- FIX: Select and collapse each element individually ---
            $w('#donorSearchTable').collapse();
            $w('#donorSearchInput').collapse();
        } else if (type === 'Individual') {
            collectionName = COLLECTIONS.OPERATIONS;
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = '#dataset3';
        }

        await wixData.insertReference(collectionName, refField, operationId, selectedItem._id);
        await $w(linkedDataset).refresh();
        console.log(`Successfully linked ${type} ${selectedItem._id} to Operation ${operationId}`);

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

        await wixData.removeReference(collectionName, refField, operationId, itemIdToRemove);
        await $w(linkedDataset).refresh();
        console.log(`Successfully unlinked ${type} ${itemIdToRemove} from Operation ${operationId}`);

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
        searchableFields = ['headOfFamily', 'familyMembers', 'familyDescription'];
    } else { // 'Donor'
        searchDataset = '#dataset6';
        searchInput = '#donorSearchInput';
        searchableFields = ['donorName', 'organizationName', 'donorEmail'];
    }

    const searchTerm = $w(searchInput).value;
    let filter = wixData.filter();

    if (searchTerm && searchTerm.length > 0) {
        filter = searchableFields.map(field => wixData.filter().contains(field, searchTerm))
                                 .reduce((f1, f2) => f1.or(f2));
    }

    await $w(searchDataset).setFilter(filter);
}

/**
 * Creates a new individual item and links it to the currently displayed family.
 */
async function handleAddNewMember() {
    const linkedFamily = await $w('#dataset1').getCurrentItem();
    if (!linkedFamily) {
        console.error("Cannot add member, no family is linked to this operation.");
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
        
        // --- FIX: Clear each input field individually ---
        $w('#newMemberAgeInput').value = "";
        $w('#newMemberBoyOrGirlInput').value = "";
        $w('#newMemberSizeOrInfoInput').value = "";
    } catch (err) {
        console.error("Failed to add new member:", err);
    }
}