import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
// These collection names and field keys are based on your confirmation.
const COLLECTIONS = {
    OPERATIONS: "Import3",
    FAMILIES: "Import4",
    DONORS: "Import5",
    INDIVIDUALS: "Import6"
};

const FIELDS = {
    // Reference from an Operation TO a Donor
    OP_DONOR_REF: "linkedDonor",
    // Reference from an Operation TO an Individual
    OP_INDIVIDUAL_REF: "linkedIndividual",
    // Multi-reference field in 'Families' collection pointing to its members (Individuals)
    FAMILY_MEMBERS_REF: "Import6_import_4_linked_family_members",
    // Single-reference field in 'Individuals' collection pointing back to its family
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members"
};
// ====================================================================


// ====================================================================
// --- Main Page Logic ---
/**
 * The main function that runs when the page is ready.
 */
$w.onReady(function () {
    // Wait for the dynamic dataset (#dynamicDataset) for the current family to load.
    $w('#dynamicDataset').onReady(() => {
        const currentFamily = $w('#dynamicDataset').getCurrentItem();

        if (!currentFamily) {
            console.error("PAGE LOAD FAILED: The dynamic dataset could not load a family item.");
            $w('#editFormTitle').text = "Family Not Found";
            return;
        }

        // Initialize all page components that depend on the current family's data.
        setupLinkedRequestsRepeater();
        setupFamilyCompositionRepeater(currentFamily._id);
        setupNewMemberForm(currentFamily._id);

        // Generate the first unique ID for a potential new member.
        loadUniqueId();
    });
});
// ====================================================================


// ====================================================================
// --- Repeater Setup ---
/**
 * Configures the repeater for linked requests (operations).
 * It fetches and displays details for the operation and its linked donor.
 */
function setupLinkedRequestsRepeater() {
    const requestsDataset = $w('#dataset1'); // Dataset for linked Operations

    requestsDataset.onReady(() => {
        if (requestsDataset.getTotalCount() === 0) {
            $w('#linkedFamilyRepeater').collapse();
            return;
        } else {
            $w('#linkedFamilyRepeater').expand();
        }

        $w('#linkedFamilyRepeater').onItemReady(async ($item, itemData, index) => {
            // 'itemData' is an item from the "Operations" collection.

            // --- Populate Donor Details ---
            if (itemData[FIELDS.OP_DONOR_REF]) {
                try {
                    // Fetch the full donor item using the reference ID.
                    const donor = await wixData.get(COLLECTIONS.DONORS, itemData[FIELDS.OP_DONOR_REF]);
                    if (donor) {
                        $item('#linkedDonorName').text = donor.donorName || "N/A";
                        $item('#linkedDonorOrg').text = donor.organizationName || "N/A";
                        $item('#linkedDonorNumber').text = donor.donorPhone || "N/A";
                        $item('#linkedDonorEmail').text = donor.donorEmail || "N/A";
                        $item('#linkedDonorStaffNotes').text = donor.staffNotes || "";
                    }
                } catch (err) {
                    console.error(`Failed to fetch donor for operation ${itemData._id}:`, err);
                    $item('#linkedDonorName').text = "Error loading donor";
                }
            } else {
                $item('#linkedDonorName').text = "No Donor Linked";
                $item('#linkedDonorOrg, #linkedDonorNumber, #linkedDonorEmail, #linkedDonorStaffNotes').text = "";
            }

            // --- Populate linkedFamilyOrIndividual ---
            if (itemData[FIELDS.OP_INDIVIDUAL_REF]) {
                $item('#linkedFamilyOrIndividual').text = "Individual";
                const individual = await wixData.get(COLLECTIONS.INDIVIDUALS, itemData[FIELDS.OP_INDIVIDUAL_REF]);
                if (individual) {
                    const sizeInfo = individual.sizeOrInfo ? individual.sizeOrInfo.split(' ').slice(0, 3).join(' ') + '...' : '';
                    $item('#linkedIndividualInfo').text = `${individual.boyOrGirl || ''} ${individual.age || ''} - ${sizeInfo}`;
                    $item('#linkedIndividualInfo').expand();
                }
            } else {
                $item('#linkedFamilyOrIndividual').text = "Family";
                $item('#linkedIndividualInfo').collapse();
            }
        });
    });
}


/**
 * Configures the repeater for family members, including the delete functionality.
 * @param {string} familyId - The _id of the current family.
 */
function setupFamilyCompositionRepeater(familyId) {
    $w('#familyCompositionRepeater').onItemReady(($item, itemData, index) => {
        // 'itemData' is an item from the "Individuals" collection.
        const individualId = itemData._id;

        $item('#deleteMemberButton').onClick(async () => {
            // Disable the button to prevent double-clicks during deletion.
            $item('#deleteMemberButton').disable();
            try {
                // Remove the reference from both sides for data integrity.
                await wixData.removeReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, familyId, individualId);
                await wixData.removeReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, individualId, familyId);
                // Refresh the list of members to reflect the deletion.
                await $w('#dataset3').refresh();
            } catch (err) {
                console.error(`Failed to delete member ${individualId}:`, err);
                $item('#deleteMemberButton').enable(); // Re-enable if it fails.
            }
        });
    });
}
// ====================================================================


// ====================================================================
// --- Form Handling & Utility Functions ---
/**
 * Configures the form for adding a new family member.
 * @param {string} familyId - The _id of the current family to link new members to.
 */
function setupNewMemberForm(familyId) {
    const newMemberDataset = $w('#dataset4'); // Dataset for new Individuals

    // Handle the "Add New Member" button click.
    $w('#addNewMemberButton').onClick(async () => {
        // Step 1: Validate all required input fields.
        const isAgeValid = $w('#memberAgeInput').validity.valid;
        const isGenderValid = $w('#memberBoyOrGirl').validity.valid;
        const isInfoValid = $w('#memberSizeOrExtraInfoInput').validity.valid;

        if (isAgeValid && isGenderValid && isInfoValid) {
            $w('#newMemberErrorText').collapse(); // Hide any previous error message.

            // Step 2: Manually set the field values for the new record.
            newMemberDataset.setFieldValues({
                "individualId": $w('#individualId').value,
                "age": $w('#memberAgeInput').value,
                "boyOrGirl": $w('#memberBoyOrGirl').value,
                "sizeOrInfo": $w('#memberSizeOrExtraInfoInput').value,
                "title": `Member - ${$w('#individualId').value}` // Auto-generate a title.
            });

            // Step 3: Save the new record. The onAfterSave trigger will handle the linking.
            try {
                await newMemberDataset.save();
            } catch (err) {
                console.error("Failed to save new member record:", err);
                $w('#newMemberErrorText').text = "Error: Could not save new member.";
                $w('#newMemberErrorText').expand();
            }
        } else {
            $w('#newMemberErrorText').text = "All member fields are required.";
            $w('#newMemberErrorText').expand();
        }
    });

    // Step 4: After a new individual is saved, link them to the current family.
    newMemberDataset.onAfterSave(async (savedIndividual) => {
        try {
            // Create the two-way reference between Family and the new Individual.
            await wixData.insertReference(COLLECTIONS.FAMILIES, FIELDS.FAMILY_MEMBERS_REF, familyId, savedIndividual._id);
            await wixData.insertReference(COLLECTIONS.INDIVIDUALS, FIELDS.INDIVIDUAL_FAMILY_REF, savedIndividual._id, familyId);

            // Refresh the family members repeater to show the new addition.
            await $w('#dataset3').refresh();

            // Clear the form fields and generate a new ID for the next entry.
            $w('#memberAgeInput').value = null;
            $w('#memberBoyOrGirl').value = null; // Assuming dropdown, resets to placeholder.
            $w('#memberSizeOrExtraInfoInput').value = null;
            loadUniqueId();

        } catch (err) {
            console.error("Failed to link new member to family:", err);
        }
    });
}


/**
 * Generates a unique ID based on the current timestamp and loads it into the input field.
 * Example format: IND-250814133317
 */
function loadUniqueId() {
    const now = new Date();
    const uniqueId = `IND-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    // Set the value in the hidden input field.
    $w('#individualId').value = uniqueId;
}
// ====================================================================