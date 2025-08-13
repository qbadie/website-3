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
    // This is the main dataset for the current "Operation" item on the page.
    $w('#dynamicDataset').onReady(() => {
        const currentOperation = $w('#dynamicDataset').getCurrentItem();
        if (!currentOperation) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load an item. Please check the URL.");
            return;
        }

        // 1. Set up all button and input event handlers immediately.
        setupEventHandlers(currentOperation);
        
        // 2. Now wait for the linked family dataset to be ready.
        $w('#dataset1').onReady(async () => {
            // 3. Once BOTH datasets are ready, it is safe to set up the page UI.
            await initialUiSetup();
        });
    });

    // Event handlers for the "Add New Member" form dataset
    $w('#dataset7').onBeforeSave((itemToSave) => {
        if (!itemToSave) {
            console.error("onBeforeSave triggered with an undefined item.");
            return Promise.reject("Cannot save an undefined item.");
        }
        const uniqueId = `IND-${Date.now()}`;
        itemToSave.individualId = uniqueId;
        itemToSave.title = `Member - ${uniqueId}`;
        return itemToSave;
    });

    $w('#dataset7').onAfterSave(async (savedIndividual) => {
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
    $w('#AddNewMemberButton').onClick(() => {
        const age = $w('#newMemberAgeInput').value;
        const boyOrGirl = $w('#newMemberBoyOrGirlInput').value;
        const sizeOrInfo = $w('#newMemberSizeOrInfoInput').value;

        if (age && boyOrGirl && sizeOrInfo) {
            $w('#newMemberErrorText').collapse();
            $w('#dataset7').save();
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
    });
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
 * Populates the family members table and sets element visibility.
 */
async function initialUiSetup() {
    $w('#familySearchTable, #input3, #donorSearchTable, #searchInput').collapse();
    
    // Refresh the dataset to ensure we have the latest linked family data.
    await $w('#dataset1').refresh();
    const linkedFamily = $w('#dataset1').getCurrentItem();

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
 * Generates a unique ID in the format IND-YYMMDDHHMMSS.
 */
function generateCustomId() {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    return `IND-${year}${month}${day}${hours}${minutes}${seconds}`;
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
 * Filters the search tables for Families or Donors.
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