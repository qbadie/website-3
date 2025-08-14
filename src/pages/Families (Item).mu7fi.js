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
    // Reference from an Operation TO a Donor
    OP_DONOR_REF: "linkedDonor",
    // Multi-reference field in 'Families' collection pointing to its members
    FAMILY_MEMBERS_REF: "Import6_import_4_linked_family_members",
    // Single-reference field in 'Individuals' collection pointing back to its family
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members"
};
// ====================================================================


$w.onReady(function () {
    // Wait for the main dynamic dataset for the CURRENT FAMILY to load.
    $w('#dynamicDataset').onReady(() => {
        const currentFamily = $w('#dynamicDataset').getCurrentItem();

        if (!currentFamily) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load a family item.");
            return;
        }

        // Setup all parts of the page that depend on the current family.
        setupLinkedOperationsRepeater();
        setupFamilyCompositionRepeater(currentFamily);
        setupNewMemberForm(currentFamily);
    });
});


/**
 * Configures the repeater showing Operations linked to this Family.
 * It also fetches and displays the Donor for each operation.
 */
function setupLinkedOperationsRepeater() {
    // This dataset should be filtered by the page context to only show operations linked to this family.
    const operationsDataset = $w('#dataset1');

    operationsDataset.onReady(() => {
        $w('#linkedFamilyRepeater').onItemReady(async ($item, itemData, index) => {
            // itemData is an Operation item.
            // Check for a linked donor and fetch their details.
            if (itemData[FIELDS.OP_DONOR_REF]) {
                try {
                    const donor = await wixData.get(COLLECTIONS.DONORS, itemData[FIELDS.OP_DONOR_REF]);
                    if (donor) {
                        $item('#linkedDonorName').text = donor.donorName || "N/A";
                        $item('#linkedDonorOrg').text = donor.organizationName || "N/A";
                        // ... populate other donor fields ...
                    }
                } catch (e) {
                    console.error("Could not fetch donor details: ", e);
                    $item('#linkedDonorName').text = "Error";
                }
            } else {
                $item('#linkedDonorName').text = "No Donor Linked";
                $item('#linkedDonorOrg').text = "";
            }
        });
    });
}


/**
 * Configures the repeater showing the members of this Family.
 * @param {object} currentFamily The family item from the dynamic dataset.
 */
function setupFamilyCompositionRepeater(currentFamily) {
    // This dataset should be filtered by page context to show individuals in this family.
    const familyMembersDataset = $w('#dataset3');

    familyMembersDataset.onReady(() => {
        if (familyMembersDataset.getTotalCount() > 0) {
            $w('#familyComposition').expand();
        } else {
            $w('#familyComposition').collapse();
        }
    });

    $w('#familyCompositionRepeater').onItemReady(($item, itemData, index) => {
        const memberId = itemData._id;

        $item('#deleteMemberButton').onClick(async () => {
            // When a member is deleted, we only need to remove the reference from the family.
            await wixData.removeReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, memberId);
            // Also remove the reference from the individual back to the family.
            await wixData.removeReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, memberId, currentFamily._id);
            await familyMembersDataset.refresh();
        });
    });
}

/**
 * Configures the form for adding a new member to the current family.
 * @param {object} currentFamily The family item from the dynamic dataset.
 */
function setupNewMemberForm(currentFamily) {
    const newMemberDataset = $w('#dataset4'); // Unfiltered dataset for creating new individuals.

    // Pre-load the unique ID when the dataset is ready.
    newMemberDataset.onReady(() => {
        loadAndSetUniqueId();
    });

    // Handle the button click to save the new member.
    $w('#addNewMemberButton').onClick(() => {
        if ($w('#memberAgeInput').validity.valid && $w('#memberBoyOrGirl').validity.valid && $w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            newMemberDataset.save()
                .catch(err => {
                    console.error("Error saving new member:", err);
                    $w('#newMemberErrorText').text = "Could not save member.";
                    $w('#newMemberErrorText').expand();
                });
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
    });

    // After the new Individual item is saved, link it to the current Family.
    newMemberDataset.onAfterSave(async (savedIndividual) => {
        if (currentFamily && savedIndividual) {
            // Create the two-way reference.
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, currentFamily._id, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, currentFamily._id);
            
            // Refresh the members list and prepare the form for another entry.
            await $w('#dataset3').refresh();
            $w('#memberAgeInput').value = null;
            $w('#memberBoyOrGirl').value = null;
            $w('#memberSizeOrExtraInfoInput').value = null;
            loadAndSetUniqueId();
        }
    });
}

/**
 * Generates a unique ID and sets it on the new member form dataset.
 */
function loadAndSetUniqueId() {
    const now = new Date();
    const uniqueId = `IND-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Set the value directly in the dataset fields.
    const newMemberDataset = $w('#dataset4');
    newMemberDataset.setFieldValues({
        'individualId': uniqueId,
        'title': `Member - ${uniqueId}`
    });
}