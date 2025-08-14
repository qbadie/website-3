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
    // Set up the event handler for the "Add New Member" dataset (#dataset4).
    // This uses the exact same successful pattern as your Operations page.
    const newMemberDataset = $w('#dataset4');

    // This event runs AFTER a new member is saved via the dataset.
    newMemberDataset.onAfterSave(async (savedIndividual) => {
        console.log("New member saved. Now creating two-way reference.");

        // FIX: Get the current family from the page's main dynamic dataset.
        const currentFamily = $w('#dynamicDataset').getCurrentItem();

        if (currentFamily && savedIndividual) {
            // Create the two-way reference link.
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, currentFamily._id);
        }
        
        // Refresh the members list and prepare the form for the next entry.
        await $w('#dataset3').refresh();
        loadUniqueId();
    });

    // To prevent errors, only call loadUniqueId when the dataset is ready.
    newMemberDataset.onReady(() => {
        loadUniqueId();
        setupEventHandlers();
    });
});

/**
 * Sets up all interactive element event handlers for the page.
 */
function setupEventHandlers() {
    // This button click simply validates the inputs and tells the dataset to save.
    // The onAfterSave handler does all the real work.
    $w('#addNewMemberButton').onClick(() => {
        if ($w('#memberAgeInput').validity.valid && $w('#memberBoyOrGirlInput').validity.valid && $w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            $w('#dataset4').save();
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
    });

    // NOTE: Other handlers for deleting members, etc., can be added here as needed.
    // The focus here is to fix the Add New Member functionality.
}

/**
 * Generates and pre-loads a unique ID into the invisible input field and dataset.
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
    
    // Set the value of the input field.
    $w('#individualIdInput').value = uniqueId;
    // Set the value in the dataset field directly.
    $w('#dataset4').setFieldValue('individualId', uniqueId);
}