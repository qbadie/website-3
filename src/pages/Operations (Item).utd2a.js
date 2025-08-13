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
        // This single function now reliably controls the entire page setup.
        await initializePage(currentOperation);
    });

    // This event runs AFTER a new member is saved via the dataset.
    $w('#dataset7').onAfterSave(async (savedIndividual) => {
        console.log("New member saved. Now creating two-way reference.");
        const linkedFamily = await $w('#dataset1').getCurrentItem();
        if (linkedFamily && savedIndividual) {
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, linkedFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, linkedFamily._id);
        }
        // Refresh the members table and prepare the form for the next entry.
        await populateMembersTable(linkedFamily);
        loadUniqueId(); // Pre-load a new ID for the next potential member
    });
});

/**
 * A single, reliable function to set up the entire page state.
 * @param {object} currentOperation The main item for the dynamic page.
 */
async function initializePage(currentOperation) {
    setupEventHandlers(currentOperation);
    await $w('#dataset1').refresh();
    const linkedFamily = $w('#dataset1').getCurrentItem();
    await populateMembersTable(linkedFamily);

    // Set visibility of the entire individuals section
    if (linkedFamily) {
        $w('#familyMembersDisplayTable, #linkedMemberRepeater, #box148').expand();
    } else {
        $w('#familyMembersDisplayTable, #linkedMemberRepeater, #box148').collapse();
    }
    
    // Pre-load the first unique ID for the "Add New Member" form.
    loadUniqueId();
}

/**
 * Sets up all interactive element event handlers for the page.
 * @param {object} currentOperation The main item for the dynamic page.
 */
function setupEventHandlers(currentOperation) {
    const operationId = currentOperation._id;

    $w('#AddNewMemberButton').onClick(() => {
        // 1. Validate that all required input fields have a value.
        if ($w('#newMemberAgeInput').validity.valid && $w('#newMemberBoyOrGirlInput').validity.valid && $w('#newMemberSizeOrInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            // 2. If valid, programmatically save the dataset.
            $w('#dataset7').save();
        } else {
            // 3. If invalid, show an error message.
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
 * Queries and populates the family members table purely with code.
 * @param {object} linkedFamily The family item from the linkedFamiliesDataset.
 */
async function populateMembersTable(linkedFamily) {
    if (!linkedFamily) {
        $w('#familyMembersDisplayTable').rows = [];
        return;
    }
    const results = await wixData.query(COLLECTIONS.INDIVIDUALS)
        .hasSome(FIELDS.INDIVIDUAL_FAMILY_REF, linkedFamily._id)
        .find();
    $w('#familyMembersDisplayTable').rows = results.items;
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
    
    // Set the value of the input field. The dataset will get the ID from here upon save.
    $w('#individualIdInput').value = uniqueId;
    // Also set the title field in the dataset to prevent "Untitled" items.
    $w('#dataset7').setFieldValue('title', `Member - ${uniqueId}`);
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
        if (type === 'Family') await initializePage({ _id: operationId });
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
        if (type === 'Family') await initializePage({ _id: operationId });
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