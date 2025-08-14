import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    FAMILIES: "Import4",
    INDIVIDUALS: "Import6"
};

const FIELDS = {
    FAMILY_MEMBERS_REF: "Import6_import_4_linked_family_members",
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members"
};
// ====================================================================

$w.onReady(function () {
    // #dynamicDataset is the current Family item
    $w('#dynamicDataset').onReady(() => {
        const currentFamily = $w('#dynamicDataset').getCurrentItem();
        if (!currentFamily) {
            console.error("PAGE LOAD FAILED: Could not load the current Family item.");
            return;
        }

        // Setup all page components for the current family.
        setupEventHandlers(currentFamily); // FIX: setupEventHandlers now includes the delete button logic.
    });

    // Setup the "Add New Member" dataset (#dataset4)
    const newMemberDataset = $w('#dataset4');
    
    newMemberDataset.onReady(() => {
        loadUniqueId();
    });

    newMemberDataset.onAfterSave(async (savedIndividual) => {
        console.log("New member saved. Now creating two-way reference.");
        const currentFamily = $w('#dynamicDataset').getCurrentItem();

        if (currentFamily && savedIndividual) {
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, currentFamily._id);
        }
        
        await $w('#dataset3').refresh();
        loadUniqueId();
    });
});

/**
 * Sets up all interactive element event handlers for the page.
 * @param {object} currentFamily - The main family item from the dynamic dataset.
 */
function setupEventHandlers(currentFamily) {
    // --- ADD NEW MEMBER BUTTON ---
    $w('#addNewMemberButton').onClick(() => {
        if ($w('#memberAgeInput').validity.valid && $w('#memberBoyOrGirlInput').validity.valid && $w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            $w('#dataset4').save();
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
    });

/**
 * Configures the repeater showing the members of this Family.
 * @param {object} currentFamily The family item from the dynamic dataset.
 */
function setupFamilyCompositionRepeater(currentFamily) {
    // #dataset3 is the dataset for the members repeater
    const familyMembersDataset = $w('#dataset3');

    familyMembersDataset.onReady(() => {
        // This toggles visibility of the container element for the repeater
        $w('#familyComposition').toggle(familyMembersDataset.getTotalCount() > 0);
    });

    $w('#familyCompositionRepeater').onItemReady(($item, itemData, index) => {
        // itemData is the Individual item for the current repeater row.

        $item('#deleteMemberButton').onClick(async () => {
            console.log(`Attempting to delete individual with ID: ${itemData._id}`);
            
            // FIX: Use wixData.remove() to permanently delete the item.
            await wixData.remove(COLLECTIONS.INDIVIDUALS, itemData._id);
            
            // Refresh the repeater to show the updated list.
            await familyMembersDataset.refresh();
        });
    });
}

/**
 * Generates and pre-loads a unique ID into the dataset.
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
    $w('#dataset4').setFieldValue('individualId', uniqueId);
}