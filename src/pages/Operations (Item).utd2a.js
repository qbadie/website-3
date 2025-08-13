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
    setInitialUiState();
    $w('#dynamicDataset').onReady(() => {
        const currentOperation = $w('#dynamicDataset').getCurrentItem();
        if (!currentOperation) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load an item. Please check the URL.");
            return;
        }
        setupEventHandlers(currentOperation);
        loadUniqueId();
        $w('#dataset1').onReady(async () => {
            await populateMembersTableAndUpdateVisibility();
        });
    });

    $w('#dataset7').onAfterSave(async (savedIndividual) => {
        console.log("New member saved. Now creating two-way reference.");
        const linkedFamily = await $w('#dataset1').getCurrentItem();
        if (linkedFamily && savedIndividual) {
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, linkedFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, linkedFamily._id);
        }
        await populateMembersTableAndUpdateVisibility();
        loadUniqueId();
    });
});

/**
 * A helper function to create a small delay.
 * @param {number} ms - The number of milliseconds to wait.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sets the initial collapsed state of search elements.
 */
function setInitialUiState() {
    $w('#familySearchTable, #input3, #donorSearchTable, #searchInput').collapse();
}

/**
 * --- UPDATED: Populates the table using a direct and robust data query. ---
 */
async function populateMembersTableAndUpdateVisibility() {
    // Get the main operation item, which we know is ready.
    const currentOperation = $w('#dynamicDataset').getCurrentItem();
    // Directly check the reference field for a linked family.
    const familyRef = currentOperation[FIELDS.OP_FAMILY_REF];

    if (familyRef && familyRef.length > 0) {
        const familyId = familyRef[0]._id;

        // Use wixData.get() with .include() to guarantee all member data is loaded.
        const linkedFamily = await wixData.get(COLLECTIONS.FAMILIES, familyId, {
            "include": [FIELDS.FAMILY_MEMBERS_REF]
        });

        const memberRefs = linkedFamily[FIELDS.FAMILY_MEMBERS_REF] || [];
        
        if (memberRefs.length > 0) {
            // The referenced items are already included, so we can use them directly.
            $w('#familyMembersDisplayTable').rows = memberRefs;
        } else {
            $w('#familyMembersDisplayTable').rows = [];
        }
        
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
        
        if (type === 'Family') {
            await populateMembersTableAndUpdateVisibility();
        } else {
             await linkedDataset.refresh();
        }
    } catch (err) { console.error(`Error linking ${type}:`, err); }
}

/**
 * --- UPDATED: Handles removing a reference from the current Operation. ---
 */
async function handleRemoveLink(operationId, itemIdToRemove, type) {
    try {
        let refField, linkedDataset;

        if (type === 'Family') {
            // --- FIX: When removing a family, first remove all its linked individuals from the operation ---
            const { items: individualsToRemove } = await $w('#dataset3').getItems(0, $w('#dataset3').getTotalCount());
            for (const individual of individualsToRemove) {
                await handleRemoveLink(operationId, individual._id, 'Individual');
            }
            // Now proceed with removing the family
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
       
         if (type === 'Family') {
            await populateMembersTableAndUpdateVisibility();
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