import wixData from 'wix-data';

// ====================================================================
// --- Configuration based on your provided schemas ---
const COLLECTIONS = {
    OPERATIONS: "Import3",
    FAMILIES: "Import4",
    DONORS: "Import5",
    INDIVIDUALS: "Import6"
};

const FIELDS = {
    OP_DONOR_REF: "linkedDonor",
    OP_INDIVIDUAL_REF: "linkedIndividual",
    OP_FAMILY_REF: "linkedFamily",
    FAMILY_MEMBERS_REF: "Import6_import_4_linked_family_members",
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members"
};
// ====================================================================

$w.onReady(function () {
    $w('#dynamicDataset').onReady(() => {
        const currentFamily = $w('#dynamicDataset').getCurrentItem();
        if (!currentFamily) {
            console.error("PAGE LOAD FAILED: Could not load the current Family item.");
            return;
        }
        setupEventHandlers();
        setupLinkedOperationsRepeater();
    });

    const newMemberDataset = $w('#dataset4');
    newMemberDataset.onReady(() => { loadUniqueId(); });

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
 * Fetches and displays linked operations with their full donor/individual details.
 */
async function setupLinkedOperationsRepeater() {
    const currentFamily = $w('#dynamicDataset').getCurrentItem();
    if (!currentFamily) return;

    // ACTION: Verify these two Field Keys match your Operations collection.
    const DONOR_REF_KEY = "linkedDonor";
    const INDIVIDUAL_REF_KEY = "linkedIndividual";

    const results = await wixData.query(COLLECTIONS.OPERATIONS)
        .hasSome(FIELDS.OP_FAMILY_REF, currentFamily._id)
        .include(DONOR_REF_KEY, INDIVIDUAL_REF_KEY) // Use the verified keys here
        .find();
    
    $w('#linkedFamilyRepeater').data = results.items;

    $w('#linkedFamilyRepeater').onItemReady(async ($item, itemData, index) => {
        // The 'itemData.linkedDonor' object is now available if the include worked.
        if (itemData[DONOR_REF_KEY]) {
            const donor = itemData[DONOR_REF_KEY];
            // ACTION: Verify these Field Keys match your Donors collection.
            $item('#linkedDonorName').text = donor.donorName || "N/A";
            $item('#linkedDonorOrg').text = donor.organizationName || "";
            $item('#linkedDonorNumber').text = donor.phone || "";
            $item('#linkedDonorEmail').text = donor.donorEmail || "";
            $item('#linkedDonorStaffNotes').text = donor.staffNotes || "";
        } else {
            $item('#linkedDonorName').text = "No Donor Linked";
            $item('#linkedDonorOrg, #linkedDonorNumber, #linkedDonorEmail, #linkedDonorStaffNotes').text = "";
        }

        // The 'itemData.linkedIndividual' object is now available.
        if (itemData[INDIVIDUAL_REF_KEY]) {
            const individual = itemData[INDIVIDUAL_REF_KEY];
            $item('#linkedFamilyOrIndividual').text = "Individual";
            // ACTION: Verify these Field Keys match your Individuals collection.
            const sizeInfo = individual.sizeOrInfo ? individual.sizeOrInfo.split(' ').slice(0, 3).join(' ') + '...' : '';
            $item('#linkedIndividualInfo').text = `${individual.boyOrGirl || ''} ${individual.age || ''} - ${sizeInfo}`;
            $item('#linkedIndividualInfo').expand();
        } else {
            $item('#linkedFamilyOrIndividual').text = "Family";
            $item('#linkedIndividualInfo').collapse();
        }
    });
}

function setupEventHandlers() {
    $w('#addNewMemberButton').onClick(() => {
        if ($w('#memberAgeInput').validity.valid && $w('#memberBoyOrGirlInput').validity.valid && $w('#memberSizeOrExtraInfoInput').validity.valid) {
            $w('#newMemberErrorText').collapse();
            $w('#dataset4').save();
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
    });
}

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