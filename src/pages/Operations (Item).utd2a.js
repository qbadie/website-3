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
    OP_FAMILY_REF: "linkedFamily",
    OP_DONOR_REF: "linkedDonor",
    OP_INDIVIDUAL_REF: "linkedIndividual",
    // --- CORRECTED: This is the multi-ref field on the Family item ---
    FAMILY_MEMBERS_REF: "Import4_linkedFamilyMembers"
};
// ====================================================================

$w.onReady(function () {
    $w('#dynamicDataset').onReady(async () => {
        const currentOperation = $w('#dynamicDataset').getCurrentItem();
        if (!currentOperation) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load an item. Please check the URL.");
            return;
        }
        setupEventHandlers(currentOperation);
        await initialUiSetup();
    });

    // This event runs BEFORE a new member is saved via dataset #7.
    // It's used to create the custom 'individualId'.
    $w('#dataset7').onBeforeSave((itemToSave) => {
        const uniqueId = `IND-${Date.now()}`;
        itemToSave.individualId = uniqueId;
        console.log(`Generating custom ID for new member: ${uniqueId}`);
        return itemToSave;
    });

    // This event runs AFTER a new member is saved via dataset #7.
    $w('#dataset7').onAfterSave(async (savedIndividual) => {
        console.log("New member saved. Now linking to family.");
        const linkedFamily = await $w('#dataset1').getCurrentItem();
        if (linkedFamily) {
            // --- NEW: Add a reference to the new individual back to the Family item. ---
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, linkedFamily._id, savedIndividual._id);
        }
        
        // Refresh the page state and reset the form.
        await initialUiSetup();
        $w('#dataset7').new();
    });
});

/**
 * Sets up all interactive element event handlers for the page.
 */
function setupEventHandlers(currentOperation) {
    const operationId = currentOperation._id;
    $w('#linkedFamilyRepeater').onItemReady(($item, itemData) => {
        $item('#removeLinkedFamilyButton').onClick(() => handleRemoveLink(operationId, itemData._id, 'Family'));
    });
    $w('#linkedDonorsRepeater').onItemReady(($item, itemData) => {
        $item('#removeLinkedDonorButton').onClick(() => handleRemoveLink(operationId, itemData._id, 'Donor'));
    });
    $w('#linkedMemberRepeater').onItemReady(($item, itemData) => {
        $item('#removeLinkedMemberButton').onClick(() => handleRemoveLink(operationId, itemData._id, 'Individual'));
    });
    $w('#addExistingFamily').onClick(() => {
        $w('#familySearchTable, #input3').expand();
    });
    $w('#addExistingDonor').onClick(() => {
        $w('#donorSearchTable, #searchInput').expand();
    });
    $w('#addNewFamily').onClick(() => handleAddNew('Family'));
    $w('#addNewDonor').onClick(() => handleAddNew('Donor'));
    $w('#input3').onInput(() => filterSearchTable('Family'));
    $w('#searchInput').onInput(() => filterSearchTable('Donor'));
    $w('#familySearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Family'));
    $w('#donorSearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Donor'));
    $w('#familyMembersDisplayTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Individual'));
}

/**
 * --- UPDATED: Sets visibility and filters the individuals table with code. ---
 */
async function initialUiSetup() {
    $w('#familySearchTable, #input3, #donorSearchTable, #searchInput').collapse();
    const linkedFamily = await $w('#dataset1').getCurrentItem();

    if (linkedFamily) {
        // --- NEW: Filter logic for the family members table ---
        const memberIds = linkedFamily[FIELDS.FAMILY_MEMBERS_REF].map(ref => ref._id);
        
        if (memberIds && memberIds.length > 0) {
            // If the family has linked members, create a filter to find them.
            const filter = wixData.filter().hasSome("_id", memberIds);
            await $w('#dataset4').setFilter(filter);
        } else {
            // If the family has no members linked, clear the filter and show nothing.
            await $w('#dataset4').setFilter(wixData.filter().eq("_id", "")); // No item will match this
        }

        $w('#familyMembersDisplayTable, #linkedMemberRepeater, #box148').expand();
    } else {
        $w('#familyMembersDisplayTable, #linkedMemberRepeater, #box148').collapse();
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
        if (type === 'Family') await initialUiSetup();
    } catch (err) { console.error(`Error linking ${type}:`, err); }
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
        } else {
            collectionId = COLLECTIONS.DONORS;
            newItem = { donorName: `New Donor - ${Date.now()}` };
        }
        const newLinkedItem = await wixData.insert(collectionId, newItem);
        await handleLink(currentOperation._id, newLinkedItem, type);
    } catch (err) { console.error(`Error creating new ${type}:`, err); }
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
        if (type === 'Family') await initialUiSetup();
    } catch (err) { console.error(`Error removing ${type} link:`, err); }
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
    } else {
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