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
        // #dataset3 is the repeater for this family's members
        setupFamilyCompositionRepeater(currentFamily);
        // Setup the form, passing the current family object for reliable linking
        setupNewMemberForm(currentFamily);
    });
});

/**
 * Configures the repeater showing the members of this Family.
 * @param {object} currentFamily The family item from the dynamic dataset.
 */
function setupFamilyCompositionRepeater(currentFamily) {
    const familyMembersDataset = $w('#dataset3');

    familyMembersDataset.onReady(() => {
        $w('#familyComposition').toggle(familyMembersDataset.getTotalCount() > 0);
    });

    $w('#familyCompositionRepeater').onItemReady(($item, itemData, index) => {
        $item('#deleteMemberButton').onClick(async () => {
            await wixData.removeReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, itemData._id);
            await wixData.removeReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, itemData._id, currentFamily._id);
            await familyMembersDataset.refresh();
        });
    });
}

/**
 * Configures the form for adding a new member MANUALLY and RELIABLY.
 * @param {object} currentFamily The family item from the page's dynamic dataset.
 */
function setupNewMemberForm(currentFamily) {
    // IMPORTANT: Make sure #dataset4 (New individuals) is set to "Read-only" mode in its settings.
    
    $w('#addNewMemberButton').onClick(async () => {
        // 1. Validate inputs
        if (!$w('#memberAgeInput').validity.valid || !$w('#memberBoyOrGirl').validity.valid || !$w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
            return; 
        }
        $w('#newMemberErrorText').collapse();
        $w('#addNewMemberButton').disable();

        try {
            // 2. Manually build the data object to be saved.
            // ACTION: Ensure the Field Key in your DB matches 'individualId'.
            const newMemberData = {
                age: $w('#memberAgeInput').value,
                boyOrGirl: $w('#memberBoyOrGirl').value,
                sizeOrInfo: $w('#memberSizeOrExtraInfoInput').value,
                individualId: generateUniqueId() 
            };
            
            // This log will show you exactly what is being sent to the database.
            console.log("Attempting to insert new member:", newMemberData);

            // 3. Insert the new record directly into the Individuals collection.
            const savedIndividual = await wixData.insert(COLLECTIONS.INDIVIDUALS, newMemberData);

            // 4. Create the two-way reference link.
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, currentFamily._id);
            
            // 5. Refresh the members list and clear the input fields.
            await $w('#dataset3').refresh();
            $w('#memberAgeInput').value = null;
            $w('#memberBoyOrGirl').value = null;
            $w('#memberSizeOrExtraInfoInput').value = null;

        } catch (err) {
            console.error("Failed to add new member:", err);
            $w('#newMemberErrorText').text = "An error occurred. Could not add member.";
            $w('#newMemberErrorText').expand();
        } finally {
            $w('#addNewMemberButton').enable();
        }
    });
}

/**
 * Generates a unique ID string.
 */
function generateUniqueId() {
    const now = new Date();
    return `IND-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

// NOTE: All other functions related to searching/linking operations and donors have been removed
// to simplify this code to its core purpose: managing family members on the Family page.