import wixData from 'wix-data';
import { session } from 'wix-storage';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    OPERATIONS: "Import3",
    FAMILIES: "Import4",
    INDIVIDUALS: "Import6",
    DONORS: "Import5"
};

const FIELDS = {
    OP_FAMILY_REF: "linkedFamily",
    OP_INDIVIDUAL_REF: "linkedIndividual",
    INDIVIDUAL_FAMILY_REF: "import_4_linked_family_members",
    OP_DONOR_REF: "linkedDonor",
    DONOR_OPS_REF: "Import3_linkedDonor"
};

let checkoutSessionId;
// ====================================================================


$w.onReady(function () {
    initializeSession();
    
    // This ensures the main function runs only after the Families dataset is ready.
    $w('#dataset2').onReady(() => {
        populateFamilyAndIndividualList();
    });
    
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
 * DEFENSIVE VERSION: Creates a "flat" list and populates the repeater,
 * with robust checks to prevent crashes from inconsistent data.
 */
async function populateFamilyAndIndividualList() {
    const flatList = [];
    const familyCount = $w('#dataset2').getTotalCount();
    if (familyCount === 0) {
        $w('#repeater1').data = [];
        return;
    }
    const familiesResult = await $w('#dataset2').getItems(0, familyCount);

    for (const family of familiesResult.items) {
        const familyRequestsQuery = await wixData.query(COLLECTIONS.OPERATIONS)
            .hasSome(FIELDS.OP_FAMILY_REF, family._id)
            .isEmpty(FIELDS.OP_INDIVIDUAL_REF)
            .find();
        
        const individualsQuery = await wixData.query(COLLECTIONS.INDIVIDUALS)
            .hasSome(FIELDS.INDIVIDUAL_FAMILY_REF, family._id)
            .find();

        let hasAnyRequests = familyRequestsQuery.items.length > 0;
        const individualItems = [];

        for (const individual of individualsQuery.items) {
             const individualRequestQuery = await wixData.query(COLLECTIONS.OPERATIONS)
                .hasSome(FIELDS.OP_INDIVIDUAL_REF, individual._id)
                .find();

            // Only add the individual if they have a linked request.
            if (individualRequestQuery.items.length > 0) {
                 hasAnyRequests = true;
                 individualItems.push({
                    _id: individual._id,
                    type: 'individual',
                    data: { individual, request: individualRequestQuery.items[0] }
                });
            }
        }

        if (hasAnyRequests) {
            flatList.push({ _id: family._id, type: 'family', data: { familyDetails: family, familyRequest: familyRequestsQuery.items[0] } });
            flatList.push(...individualItems);
        }
    }

    const repeater = $w('#repeater1');
    repeater.data = flatList;

    repeater.onItemReady(($item, item, index) => {
        const textElement = $item('#requestInfoText');
        let htmlString = "";

        switch (item.type) {
            case 'family':
                const { familyDetails, familyRequest } = item.data;
                htmlString = `
                    <p style="font-size:18px; font-weight:bold;">${familyDetails.headOfFamily}</p>
                    <p><strong>About:</strong> ${familyDetails.familyDescription || 'N/A'}</p>
                `;
                // If a family-level request exists, add it and configure its controls.
                if (familyRequest) {
                    htmlString += `<p style="margin-left: 20px;"><strong>Family Need:</strong> ${familyRequest.requestDonationDetails || 'N/A'}</p>`;
                    configureSwitchAndUrgentBox($item, familyRequest);
                } else {
                    $item('#switch1').collapse(); 
                    $item('#box172').collapse();
                }
                break;
            
            case 'individual':
                const { individual, request } = item.data;
                htmlString = `
                    <p style="margin-left: 20px;">
                        <strong>${individual.boyOrGirl || 'Member'}, Age: ${individual.age || ''}</strong><br>
                        <strong>Needs:</strong> ${request.requestDonationDetails || 'N/A'}<br>
                        <strong>Sizes:</strong> ${request.sizeDetails || 'N/A'}
                    </p>
                `;
                configureSwitchAndUrgentBox($item, request);
                break;
        }
        
        textElement.html = htmlString;
    });
}

function configureSwitchAndUrgentBox($item, requestData) {
    const isUrgent = requestData.urgentNeedStatus === true || String(requestData.urgentNeedStatus).toUpperCase() === 'TRUE';
    if (isUrgent) { $item('#box172').expand(); } 
    else { $item('#box172').collapse(); }

    const switchElement = $item('#switch1');
    switchElement.expand();
    switchElement.checked = (requestData.checkoutSessionId === checkoutSessionId);
    
    switchElement.onChange(async () => {
        const newSessionId = switchElement.checked ? checkoutSessionId : null;
        await wixData.save(COLLECTIONS.OPERATIONS, { ...requestData, checkoutSessionId: newSessionId });
        $w('#dataset4').refresh();
    });
}

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
    
    $w('#captcha1').onVerified(() => submitButton.enable());

    newDonorDataset.onAfterSave(async (newDonor) => {
        const selectedOps = await wixData.query(COLLECTIONS.OPERATIONS)
            .eq("checkoutSessionId", checkoutSessionId)
            .find();

        for (const operation of selectedOps.items) {
            await wixData.insertReference(COLLECTIONS.DONORS, FIELDS.DONOR_OPS_REF, newDonor._id, operation._id);
            await wixData.insertReference(COLLECTIONS.OPERATIONS, FIELDS.OP_DONOR_REF, operation._id, newDonor._id);
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
        newDonorDataset.setFieldValues({ donorId: `DON-${Date.now()}` });
        newDonorDataset.save();
    });
}