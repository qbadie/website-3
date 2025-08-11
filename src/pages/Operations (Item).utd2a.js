import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    OPERATIONS: "Import3",
    FAMILIES: "Import4",
    DONORS: "Import5",
    INDIVIDUALS: "Import6"
};

const FIELDS = {
    // Reference fields in the 'Operations' collection
    OP_FAMILY_REF: "linkedFamily",
    OP_DONOR_REF: "linkedDonor",
    OP_INDIVIDUAL_REF: "linkedIndividual",

    // Reference field in the 'Individuals' collection linking to its parent Family
    INDIVIDUAL_FAMILY_REF: "family"
};
// ====================================================================

$w.onReady(function () {
    // This is the main dataset for the current "Operation" item on the page.
    $w('#dynamicDataset').onReady(() => {
        const currentOperation = $w('#dynamicDataset').getCurrentItem();

        if (!currentOperation) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load an item. Please check the URL.");
            return;
        }

        setupEventHandlers(currentOperation);
        initialUiSetup();
    });

    // --- NEW: Event handler to modify the new member BEFORE it's saved ---
    $w('#dataset7').onBeforeSave((itemToSave) => {
        // Generate a unique, human-readable ID for the new individual.
        const uniqueId = `IND-${Date.now()}`;
        // Add the new ID to the 'individualId' field of the item.
        itemToSave.individualId = uniqueId;

        console.log(`Generating custom ID for new member: ${uniqueId}`);
        // Return the modified item so the save operation can proceed.
        return itemToSave;
    });

    // Event handler that runs AFTER a new member is saved.
    $w('#dataset7').onAfterSave(async () => {
        console.log("New member saved. Refreshing members table.");
        await $w('#dataset4').refresh();
        await initialUiSetup();
        $w('#dataset7').new();
    });
});

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
        $w('#input3').expand();
    });
    $w('#addExistingDonor').onClick(() => {
        $w('#donorSearchTable').expand();
        $w('#searchInput').expand();
    });

    // --- "Add New" Button Handlers ---
    $w('#addNewFamily').onClick(() => handleAddNew('Family'));
    $w('#addNewDonor').onClick(() => handleAddNew('Donor'));

    // --- Search Input Handlers ---
    $w('#input3').onInput(() => filterSearchTable('Family'));
    $w('#searchInput').onInput(() => filterSearchTable('Donor'));

    // --- Search Table Row Select Handlers ---
    $w('#familySearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Family'));
    $w('#donorSearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Donor'));

    // --- Individual/Family Member Handlers ---
    $w('#familyMembersDisplayTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Individual'));
}

/**
 * Sets the initial visibility of page elements when the page loads.
 */
function initialUiSetup() {
    $w('#familySearchTable').collapse();
    $w('#input3').collapse();
    $w('#donorSearchTable').collapse();
    $w('#searchInput').collapse();

    const linkedFamiliesCount = $w('#dataset1').getTotalCount();
    if (linkedFamiliesCount > 0) {
        $w('#familyMembersDisplayTable').expand();
        $w('#linkedMemberRepeater').expand();
        $w('#box148').expand();
    } else {
        $w('#familyMembersDisplayTable').collapse();
        $w('#linkedMemberRepeater').collapse();
        $w('#box148').collapse();
    }
}

/**
 * Handles linking an item to the current Operation.
 */
async function handleLink(operationId, selectedItem, type) {
    try {
        let refField, linkedDataset;

        if (type === 'Family') {
            refField = FIELDS.OP_FAMILY_REF;
            linkedDataset = $w('#dataset1');
            $w('#familySearchTable, #input3').collapse();
        } else if (type === 'Donor') {
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = $w('#dataset5');
            $w('#donorSearchTable, #searchInput').collapse();
        } else if (type === 'Individual') {
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = $w('#dataset3');
        }

        await wixData.insertReference(COLLECTIONS.OPERATIONS, refField, operationId, selectedItem._id);
        await linkedDataset.refresh();

        if (type === 'Family') {
            await initialUiSetup();
        }
    } catch (err) {
        console.error(`Error linking ${type}:`, err);
    }
}

/**
 * Creates a new blank Family or Donor and links it to the current Operation.
 */
async function handleAddNew(type) {
    try {
        await $w('#dynamicDataset').save();
        const currentOperation = $w('#dynamicDataset').getCurrentItem();
        let collectionId, newItem;

        if (type === 'Family') {
            collectionId = COLLECTIONS.FAMILIES;
            newItem = { headOfFamily: `New Family - ${Date.now()}` };
        } else { // 'Donor'
            collectionId = COLLECTIONS.DONORS;
            newItem = { donorName: `New Donor - ${Date.now()}` };
        }

        const newLinkedItem = await wixData.insert(collectionId, newItem);
        await handleLink(currentOperation._id, newLinkedItem, type);
    } catch (err) {
        console.error(`Error creating new ${type}:`, err);
    }
}

/**
 * Handles removing a reference from the current Operation.
 */
async function handleRemoveLink(operationId, itemIdToRemove, type) {
    try {
        let refField, linkedDataset;

        if (type === 'Family') {
            refField = FIELDS.OP_FAMILY_REF;
            linkedDataset = $w('#dataset1');
        } else if (type === 'Donor') {
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = $w('#dataset5');
        } else if (type === 'Individual') {
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = $w('#dataset3');
        }

        await wixData.removeReference(COLLECTIONS.OPERATIONS, refField, operationId, itemIdToRemove);
        await linkedDataset.refresh();

        if (type === 'Family') {
            await initialUiSetup();
        }
    } catch (err) {
        console.error(`Error removing ${type} link:`, err);
    }
}

/**
 * Filters the search tables for Families or Donors based on input.
 */
async function filterSearchTable(type) {
    let searchDataset, searchInput, searchableFields;

    if (type === 'Family') {
        searchDataset = $w('#dataset2');
        searchInput = $w('#input3');
        searchableFields = ['headOfFamily', 'familyMembers', 'familyDescription'];
    } else { // 'Donor'
        searchDataset = $w('#dataset6');
        searchInput = $w('#searchInput');
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