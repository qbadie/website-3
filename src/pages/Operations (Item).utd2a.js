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
    OP_INDIVIDUAL_REF_REVERSE: "Import3_linkedIndividual",
    FAMILY_MEMBERS_REF: "Import6_import_4_linked_family_members",
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members"
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

    $w('#dataset7').onBeforeSave((itemToSave) => {
        // --- VALIDATION GATE: This is the critical fix ---
        // If the item about to be saved is missing essential data, stop the save.
        if (!itemToSave.age || !itemToSave.boyOrGirl || !itemToSave.sizeOrInfo) {
            console.log("Blocking save of empty member.");
            // Using Promise.reject is the correct way to cancel a save from this event.
            return Promise.reject("Validation Failed: Member data is missing.");
        }

        // If validation passes, proceed to add the ID and title.
        const uniqueId = `IND-${Date.now()}`;
        itemToSave.individualId = uniqueId;
        itemToSave.title = `Member - ${uniqueId}`;
        return itemToSave;
    });

    $w('#dataset7').onAfterSave(async (savedIndividual) => {
        console.log("New member saved. Now creating two-way reference.");
        const linkedFamily = await $w('#dataset1').getCurrentItem();
        if (linkedFamily && savedIndividual) {
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, linkedFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, linkedFamily._id);
        }
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
    $w('#addExistingFamily').onClick(() => $w('#familySearchTable, #input3').expand());
    $w('#addExistingDonor').onClick(() => $w('#donorSearchTable, #searchInput').expand());
    $w('#input3').onInput(() => filterSearchTable('Family'));
    $w('#searchInput').onInput(() => filterSearchTable('Donor'));
    $w('#familySearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Family'));
    $w('#donorSearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Donor'));
    $w('#familyMembersDisplayTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Individual'));
}

/**
 * Populates the family members table purely with code.
 */
async function initialUiSetup() {
    $w('#familySearchTable, #input3, #donorSearchTable, #searchInput').collapse();
    const linkedFamily = await $w('#dataset1').getCurrentItem();

    if (linkedFamily) {
        const results = await wixData.query(COLLECTIONS.INDIVIDUALS)
            .hasSome(FIELDS.INDIVIDUAL_FAMILY_REF, linkedFamily._id)
            .find();
        $w('#familyMembersDisplayTable').rows = results.items;
        $w('#familyMembersDisplayTable, #linkedMemberRepeater, #box148').expand();
    } else {
        $w('#familyMembersDisplayTable').rows = [];
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
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.OP_INDIVIDUAL_REF_REVERSE, selectedItem._id, operationId);
        }
        await wixData.insertReference(COLLECTIONS.OPERATIONS, refField, operationId, selectedItem._id);
        await linkedDataset.refresh();
        if (type === 'Family') await initialUiSetup();
    } catch (err) { console.error(`Error linking ${type}:`, err); }
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
            await wixData.removeReference(COLLECTIONS.INDIVIDUALS, FIELDS.OP_INDIVIDUAL_REF_REVERSE, itemIdToRemove, operationId);
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