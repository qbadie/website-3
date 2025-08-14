import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    OPERATIONS: "Import3", // Added back
    FAMILIES: "Import4",
    DONORS: "Import5", // Added back
    INDIVIDUALS: "Import6"
};

const FIELDS = {
    OP_DONOR_REF: "linkedDonor", // Added back
    OP_INDIVIDUAL_REF: "linkedIndividual", // Added back
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
        setupEventHandlers();
        setupFamilyCompositionRepeater(currentFamily);
        // --- ADDED BACK: This function will populate the requests repeater ---
        setupLinkedOperationsRepeater();
    });

    const newMemberDataset = $w('#dataset4');
    
    newMemberDataset.onReady(() => {
        loadUniqueId();
    });

    newMemberDataset.onAfterSave(async (savedIndividual) => {
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
 * --- NEW: Configures the repeater showing Operations linked to this Family. ---
 * It fetches and displays the correct Donor for each operation.
 */
function setupLinkedOperationsRepeater() {
    // #dataset1 is the dataset for linked operations
    $w('#linkedFamilyRepeater').onItemReady(async ($item, itemData, index) => {
        // itemData is an Operation item from the repeater's data.

        // --- Populate Donor Details ---
        if (itemData[FIELDS.OP_DONOR_REF]) {
            try {
                const donor = await wixData.get(COLLECTIONS.DONORS, itemData[FIELDS.OP_DONOR_REF]);
                if (donor) {
                    $item('#linkedDonorName').text = donor.donorName || "Not Available";
                    $item('#linkedDonorOrg').text = donor.organizationName || "";
                    $item('#linkedDonorNumber').text = donor.donorPhone || "";
                    $item('#linkedDonorEmail').text = donor.donorEmail || "";
                    $item('#linkedDonorStaffNotes').text = donor.staffNotes || "";
                }
            } catch (e) {
                console.error("Could not fetch donor details:", e);
                $item('#linkedDonorName').text = "Error Loading Donor";
            }
        } else {
            $item('#linkedDonorName').text = "No Donor Linked";
            // Clear other donor fields if none is linked
            // @ts-ignore
            $item('#linkedDonorOrg, #linkedDonorNumber, #linkedDonorEmail, #linkedDonorStaffNotes').text = "";
        }

        // --- Populate Family/Individual Info ---
        // On a Family page, the operation is always linked to the Family, not an individual.
        $item('#linkedFamilyOrIndividual').text = "Family";
        $item('#linkedIndividualInfo').collapse(); // Hide the individual info string as it's not relevant here.
    });
}

/**
 * Sets up the event handler for the "Add New Member" button.
 */
function setupEventHandlers() {
    $w('#addNewMemberButton').onClick(() => {
        if ($w('#memberAgeInput').validity.valid && $w('#memberBoyOrGirl').validity.valid && $w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            $w('#dataset4').save();
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
    });
}

/**
 * Configures the repeater showing the members of this Family, including the delete button.
 */
function setupFamilyCompositionRepeater(currentFamily) {
    const familyMembersDataset = $w('#dataset3');
    familyMembersDataset.onReady(() => {
        if (familyMembersDataset.getTotalCount() > 0) {
            $w('#familyComposition').expand();
        } else {
            $w('#familyComposition').collapse();
        }
    });

    $w('#familyCompositionRepeater').onItemReady(($item, itemData, index) => {
        $item('#deleteMemberButton').onClick(async () => {
            await wixData.remove(COLLECTIONS.INDIVIDUALS, itemData._id);
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