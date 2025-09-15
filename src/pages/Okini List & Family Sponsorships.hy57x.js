import wixData from 'wix-data';
import { session } from 'wix-storage';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    OPERATIONS: "Import3",
    FAMILIES: "Import4",
    INDIVIDUALS: "Import6"
};

const FIELDS = {
    OP_FAMILY_REF: "linkedFamily",
    OP_INDIVIDUAL_REF: "linkedIndividual",
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members"
};

let checkoutSessionId;
// ====================================================================


$w.onReady(function () {
    initializeSession();
    populateFamilyAndIndividualList();
    setupSelectedRequestsRepeater();
    setupCheckoutForm();
});

function initializeSession() {
    let sessionId = session.getItem("checkoutSessionId");
    if (!sessionId) {
        sessionId = String(Date.now());
        session.setItem("checkoutSessionId", sessionId);
    }
    checkoutSessionId = sessionId;
}

/**
 * Creates a "flat" list and populates the repeater with formatted text.
 */
async function populateFamilyAndIndividualList() {
    const flatList = [];
    const familiesResult = await $w('#dataset1').getItems(0, $w('#dataset1').getTotalCount());

    for (const family of familiesResult.items) {
        // Add a "header" item for the family itself.
        flatList.push({ _id: family._id, type: 'family', data: family });

        // Find "family-level" requests.
        const familyRequests = await wixData.query(COLLECTIONS.OPERATIONS)
            .eq(FIELDS.OP_FAMILY_REF, family._id)
            .isEmpty(FIELDS.OP_INDIVIDUAL_REF)
            .find();

        if (familyRequests.items.length > 0) {
            flatList.push({ _id: familyRequests.items[0]._id, type: 'family-request', data: familyRequests.items[0] });
        }
        
        // Find all individuals for this family.
        const individuals = await wixData.query(COLLECTIONS.INDIVIDUALS)
            .hasSome(FIELDS.INDIVIDUAL_FAMILY_REF, family._id)
            .find();
        
        for (const individual of individuals.items) {
             const individualRequest = await wixData.query(COLLECTIONS.OPERATIONS)
                .hasSome(FIELDS.OP_INDIVIDUAL_REF, individual._id)
                .find();

            if (individualRequest.items.length > 0) {
                 flatList.push({
                    _id: individual._id,
                    type: 'individual',
                    data: { individual, request: individualRequest.items[0] }
                });
            }
        }
    }

    const repeater = $w('#repeater1');
    repeater.data = flatList;

    repeater.onItemReady(($item, item, index) => {
        const textElement = $item('#requestInfoText');
        let htmlString = ""; // Start with an empty string

        // Build the HTML string based on the item type.
        switch (item.type) {
            case 'family':
                htmlString = `
                    <p style="font-size:18px; font-weight:bold;">${item.data.headOfFamily}</p>
                    <p><strong>About Family:</strong> ${item.data.familyDescription || 'N/A'}</p>
                `;
                // Hide the switch for family headers
                $item('#switch1').collapse(); 
                break;
            
            case 'individual':
                const { individual, request } = item.data;
                htmlString = `
                    <p><strong>For Who:</strong> ${individual.boyOrGirl || ''}, Age: ${individual.age || ''}</p>
                    <p><strong>Needs:</strong> ${request.requestDonationDetails || 'N/A'}</p>
                    <p><strong>Sizes:</strong> ${request.sizeDetails || 'N/A'}</p>
                `;
                // Show and configure the switch for individuals
                $item('#switch1').expand();
                $item('#switch1').checked = (request.checkoutSessionId === checkoutSessionId);
                $item('#switch1').onChange(async (event) => {
                    const newSessionId = event.target.checked ? checkoutSessionId : null;
                    await wixData.save(COLLECTIONS.OPERATIONS, { ...request, checkoutSessionId: newSessionId });
                    $w('#dataset4').refresh();
                });
                break;
            
            // This case handles family-wide requests that are not for a specific person.
            case 'family-request':
                 htmlString = `<p><strong>Family Need:</strong> ${item.data.requestDonationDetails || 'N/A'}</p>`;
                 // Also show a switch for family-level requests
                 $item('#switch1').expand();
                 $item('#switch1').checked = (item.data.checkoutSessionId === checkoutSessionId);
                 $item('#switch1').onChange(async (event) => {
                     const newSessionId = event.target.checked ? checkoutSessionId : null;
                     await wixData.save(COLLECTIONS.OPERATIONS, { ...item.data, checkoutSessionId: newSessionId });
                     $w('#dataset4').refresh();
                 });
                 break;
        }
        
        // --- Logic for "Urgent Need" box (#box172) ---
        const requestData = item.data.request || item.data;
        const isUrgent = requestData.urgentNeedStatus === true || String(requestData.urgentNeedStatus).toUpperCase() === 'TRUE';
        $item('#box172').toggle(isUrgent);

        textElement.html = htmlString;
    });
}


// These functions remain the same.
function setupSelectedRequestsRepeater() {
    const selectedRequestsDataset = $w('#dataset4');
    selectedRequestsDataset.setFilter(wixData.filter().eq("checkoutSessionId", checkoutSessionId));

    $w('#repeater2').onItemReady(($item, itemData, index) => {
        $item('#button19').onClick(async () => {
            await wixData.save(COLLECTIONS.OPERATIONS, { ...itemData, checkoutSessionId: null });
            await populateFamilyAndIndividualList();
            await $w('#dataset4').refresh();
        });
    });
}

function setupCheckoutForm() {
    const submitButton = $w('#button20');
    const newDonorDataset = $w('#dataset3');
    
    $w('#captcha1').onVerified(() => {
        submitButton.enable();
    });

    newDonorDataset.onAfterSave(async (newDonor) => {
        const selectedOps = await wixData.query(COLLECTIONS.OPERATIONS)
            .eq("checkoutSessionId", checkoutSessionId)
            .find();

        for (const operation of selectedOps.items) {
            await wixData.insertReference(COLLECTIONS.DONORS, "Import3_linkedDonor", newDonor._id, operation._id);
            await wixData.insertReference(COLLECTIONS.OPERATIONS, "linkedDonor", operation._id, newDonor._id);
            await wixData.save(COLLECTIONS.OPERATIONS, { ...operation, checkoutSessionId: null });
        }
        
        submitButton.label = "Success!";
    });

    newDonorDataset.onError(() => {
        submitButton.label = "Error - Please Try Again";
        submitButton.enable();
    });

    submitButton.onClick(() => {
        submitButton.disable();
        submitButton.label = "Processing...";
        newDonorDataset.setFieldValues({
            donorId: `DON-${Date.now()}`
        });
        newDonorDataset.save();
    });
}