// @ts-nocheck
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
    FAMILY_MEMBERS_REF: "Import6_import_4_linked_family_members",
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members"
};
// ====================================================================

$w.onReady(function () {
    // This is the main dataset for the current Family item on the page.
    $w('#dynamicDataset').onReady(() => {
        const currentFamily = $w('#dynamicDataset').getCurrentItem();
        if (!currentFamily) {
            console.error("PAGE LOAD FAILED: Could not load the current Family item.");
            return;
        }
        // Pass the current family object to all setup functions for reliability.
        setupFamilyCompositionRepeater(currentFamily);
        setupNewMemberForm(currentFamily);
    });
});

/**
 * Configures the repeater showing the members of this Family.
 * @param {object} currentFamily The family item from the dynamic dataset.
 */
function setupFamilyCompositionRepeater(currentFamily) {
    const familyMembersDataset = $w('#dataset3'); // Dataset for the members repeater

    familyMembersDataset.onReady(() => {
        $w('#familyComposition').toggle(familyMembersDataset.getTotalCount() > 0);
    });

    $w('#familyCompositionRepeater').onItemReady(($item, itemData, index) => {
        const memberId = itemData._id;

        $item('#deleteMemberButton').onClick(async () => {
            // Remove the two-way reference between the family and this member.
            await wixData.removeReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, memberId);
            await wixData.removeReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, memberId, currentFamily._id);
            await familyMembersDataset.refresh();
        });
    });
}

/**
 * Configures the form for adding a new member MANUALLY and RELIABLY.
 * @param {object} currentFamily The family item from the page's dynamic dataset.
 */
function setupNewMemberForm(currentFamily) {
    $w('#addNewMemberButton').onClick(async () => {
        // 1. Validate inputs first
        if (!$w('#memberAgeInput').validity.valid || !$w('#memberBoyOrGirlInput').validity.valid || !$w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
            return; // Stop execution if invalid
        }
        $w('#newMemberErrorText').collapse();
        $w('#addNewMemberButton').disable(); // Prevent multiple clicks

        try {
            // 2. Manually gather data and generate a new ID
            const newMemberData = {
                age: $w('#memberAgeInput').value,
                boyOrGirl: $w('#memberBoyOrGirl').value,
                sizeOrInfo: $w('#memberSizeOrExtraInfoInput').value,
                individualId: generateUniqueId() // Generate a fresh ID right here
            };

            // 3. Insert the new individual record directly into the collection
            const savedIndividual = await wixData.insert(COLLECTIONS.INDIVIDUALS, newMemberData);

            // 4. Create the two-way reference using the correct family ID
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, currentFamily._id);
            
            // 5. Refresh the members list and clear the input fields
            await $w('#dataset3').refresh();
            $w('#memberAgeInput').value = null;
            $w('#memberBoyOrGirl').value = null;
            $w('#memberSizeOrExtraInfoInput').value = null;

        } catch (err) {
            console.error("Failed to add new member:", err);
            $w('#newMemberErrorText').text = "An error occurred. Could not add member.";
            $w('#newMemberErrorText').expand();
        } finally {
            // 6. Re-enable the button, whether it succeeded or failed
            $w('#addNewMemberButton').enable();
        }
    });
}

/**
 * Generates a unique ID string.
 */
function generateUniqueId() {
    const now = new Date();
    // Creates a unique ID like: IND-250814144049
    return `IND-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

// NOTE: All other functions from your code (setInitialUiState, populateMembersTableAndUpdateVisibility, etc.)
// were related to the Operations page structure and have been removed to simplify this page's code.
// The members repeater (#dataset3) and linked operations repeater (#dataset1) should be filtered
// automatically by the page context in the Wix Editor.