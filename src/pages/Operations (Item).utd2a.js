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
    // --- FIX: Set the initial state of the UI immediately ---
    setInitialUiState();

    $w('#dynamicDataset').onReady(() => {
        const currentOperation = $w('#dynamicDataset').getCurrentItem();
        if (!currentOperation) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load an item. Please check the URL.");
            return;
        }
        setupEventHandlers(currentOperation);
        loadUniqueId(); // Pre-load the first unique ID for the form

        // --- FIX: Wait for the linked family dataset to be ready before populating the table ---
        $w('#dataset1').onReady(async () => {
            await populateMembersTableAndUpdateVisibility();
        });
    });

    $w('#dataset7').onAfterSave(async () => {
        console.log("New member saved. Refreshing table and form.");
        await populateMembersTableAndUpdateVisibility();
        loadUniqueId();
    });
});

/**
 * --- NEW: Sets the initial collapsed state of search elements ---
 */
function setInitialUiState() {
    $w('#familySearchTable').collapse();
    $w('#input3').collapse();
    $w('#donorSearchTable').collapse();
    $w('#searchInput').collapse();
}

/**
 * --- NEW: Combines table population and UI visibility into one function ---
 */
async function populateMembersTableAndUpdateVisibility() {
    await $w('#dataset1').refresh(); // Ensure we have the absolute latest data
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
 * Sets up all interactive element event handlers for the page.
 */
function setupEventHandlers(currentOperation) {
    const operationId = currentOperation._id;

    $w('#AddNewMemberButton').onClick(() => {
        if ($w('#newMemberAgeInput').validity.valid && $w('#newMemberBoyOrGirlInput').validity.valid && $w('#newMemberSizeOrInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            $w('#dataset7').setFieldValue('title', `Member - ${$w('#individualIdInput').value}`);
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
 * Generates and pre-loads a unique ID into the invisible input field.
 */
function loadUniqueId() {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const uniqueId = `IND-${year}${month}${day}${hours}${minutes}${seconds}`;
    $w('#individualIdInput').value = uniqueId;
    $w('#dataset7').setFieldValue('individualId', uniqueId);
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
        
        // After linking, refresh the relevant dataset. The onReady handler will take care of the UI update.
        if (type === 'Family') {
            await linkedDataset.refresh();
        } else {
             await linkedDataset.refresh();
        }
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
       
        // After removing a link, refresh the relevant dataset. The onReady handler will take care of the UI update.
         if (type === 'Family') {
            await linkedDataset.refresh();
        } else {
             await linkedDataset.refresh();
        }
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