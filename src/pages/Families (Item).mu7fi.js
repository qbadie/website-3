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
    OP_DONOR_REF: "linkedDonor",
    OP_INDIVIDUAL_REF: "linkedIndividual",
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

        // Setup all remaining page components.
        setupEventHandlers();
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
 * Configures the repeater showing Operations linked to this Family.
 */
function setupLinkedOperationsRepeater() {
    // #dataset1 is the dataset for linked operations, connected to #linkedFamilyRepeater
    $w('#linkedFamilyRepeater').onItemReady(async ($item, itemData, index) => {
        // itemData is an Operation item.

        // --- Populate Donor Details ---
        if (itemData[FIELDS.OP_DONOR_REF]) {
            try {
                const donor = await wixData.get(COLLECTIONS.DONORS, itemData[FIELDS.OP_DONOR_REF]);
                if (donor) {
                    $item('#linkedDonorName').text = donor.donorName || "N/A";
                    $item('#linkedDonorOrg').text = donor.organizationName || "";
                }
            } catch (e) {
                console.error("Could not fetch donor details:", e);
                $item('#linkedDonorName').text = "Error";
            }
        } else {
            $item('#linkedDonorName').text = "No Donor Linked";
            $item('#linkedDonorOrg').text = "";
        }

        // --- Populate Family/Individual Info ---
        if (itemData[FIELDS.OP_INDIVIDUAL_REF]) {
             $item('#linkedFamilyOrIndividual').text = "Individual";
             const individual = await wixData.get(COLLECTIONS.INDIVIDUALS, itemData[FIELDS.OP_INDIVIDUAL_REF]);
             if(individual) {
                const sizeInfo = individual.sizeOrInfo ? individual.sizeOrInfo.split(' ').slice(0, 3).join(' ') + '...' : '';
                $item('#linkedIndividualInfo').text = `${individual.boyOrGirl || ''} ${individual.age || ''} - ${sizeInfo}`;
                $item('#linkedIndividualInfo').expand();
             }
        } else {
            $item('#linkedFamilyOrIndividual').text = "Family";
            $item('#linkedIndividualInfo').collapse();
        }
    });
}

/**
 * Sets up the event handler for the "Add New Member" button.
 */
function setupEventHandlers() {
    $w('#addMemberButton').onClick(() => {
        if ($w('#memberAgeInput').validity.valid && $w('#memberBoyOrGirlInput').validity.valid && $w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            $w('#dataset4').save();
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
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