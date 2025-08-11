import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
// Updated with the exact Collection and Field IDs from your project.
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

        // This check is critical. If the page URL is invalid and no item loads,
        // it stops the code to prevent further errors.
        if (!currentOperation) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load an item. Please check the URL.");
            // You can add a user-facing error message here if you have a text element for it.
            return; 
        }
        
        // If the item loaded successfully, set up all page functionality.
        setupEventHandlers(currentOperation);
        initialUiSetup();
    });
});

/**
 * Sets the initial visibility of page elements when the page loads.
 */
function initialUiSetup() {
    // Collapse search sections until they are needed.
    // Note: Using #input3 for family search and #searchInput for donor search based on the element list.
    $w('#familySearchTable').collapse();
    $w('#input3').collapse();
    $w('#donorSearchTable').collapse();
    $w('#searchInput').collapse();

    // Check if a family is linked to this operation.
    const linkedFamiliesCount = $w('#dataset1').getTotalCount();

    // The "Individuals" section is only visible if a family is linked.
    if (linkedFamiliesCount > 0) {
        $w('#familyMembersDisplayTable').expand();
        $w('#linkedMemberRepeater').expand();
        // Assuming #box148 is the container for the "Add New Member" inputs.
        $w('#box148').expand();
    } else {
        $w('#familyMembersDisplayTable').collapse();
        $w('#linkedMemberRepeater').collapse();
        $w('#box148').collapse();
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
        $w('#input3').expand();
    });
    $w('#addExistingDonor').onClick(() => {
        $w('#donorSearchTable').expand();
        $w('#searchInput').expand();
    });

    // --- Search Input Handlers ---
    $w('#input3').onInput(() => filterSearchTable('Family'));
    $w('#searchInput').onInput(() => filterSearchTable('Donor'));

    // --- Search Table Row Select Handlers ---
    $w('#familySearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Family'));
    $w('#donorSearchTable').onRowSelect((event) => handleLink(operationId, event.rowData, 'Donor'));

    // --- Individual/Family Member Handlers ---
    $w('#AddNewMemberButton').onClick(() => handleAddNewMember());
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
        let refField, linkedDataset;

        if (type === 'Family') {
            refField = FIELDS.OP_FAMILY_REF;
            linkedDataset = $w('#dataset1'); 
            $w('#familySearchTable').collapse();
            $w('#input3').collapse();
        } else if (type === 'Donor') {
            refField = FIELDS.OP_DONOR_REF;
            linkedDataset = $w('#dataset5');
            $w('#donorSearchTable').collapse();
            $w('#searchInput').collapse();
        } else if (type === 'Individual') {
            refField = FIELDS.OP_INDIVIDUAL_REF;
            linkedDataset = $w('#dataset3');
        }

        await wixData.insertReference(COLLECTIONS.OPERATIONS, refField, operationId, selectedItem._id);
        await linkedDataset.refresh();
        console.log(`Successfully linked ${type} ${selectedItem._id} to Operation ${operationId}`);

        // If a family was just linked, refresh the UI to show the individuals section.
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
        console.log(`Successfully unlinked ${type} ${itemIdToRemove} from Operation ${operationId}`);
        
        // If a family was unlinked, refresh the UI to hide the individuals section if it was the last one.
        if (type === 'Family') {
            await initialUiSetup();
        }

    } catch (err) {
        console.error(`Error removing ${type} link:`, err);
    }
}

/**
 * Filters the search tables for Families or Donors based on input.
 * @param {string} type - The type of table to filter: 'Family' or 'Donor'.
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

/**
 * Creates a new individual item and links it to the family currently associated with the operation.
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
        [FIELDS.INDIVIDUAL_FAMILY_REF]: linkedFamily._id // This links the new individual to the family
    };

    try {
        await wixData.insert(COLLECTIONS.INDIVIDUALS, newMember);
        // Refresh the table of all family members to show the new addition.
        await $w('#dataset4').refresh();
        console.log("Successfully added new family member.");
        
        // Clear input fields for the next entry.
        $w('#newMemberAgeInput').value = "";
        $w('#newMemberBoyOrGirlInput').value = "";
        $w('#newMemberSizeOrInfoInput').value = "";
    } catch (err) {
        console.error("Failed to add new member:", err);
    }
}