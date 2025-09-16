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
    // This single function now controls the entire page.
    initializePage();
});

/**
 * Initializes the session, fetches all data, and sets up all page events.
 */
async function initializePage() {
    initializeSession();
    await populateFamilyAndIndividualList();
    await populateSelectedRequestsRepeater();
    setupCheckoutForm();
}

function initializeSession() {
    let sessionId = session.getItem("checkoutSessionId");
    if (!sessionId) {
        sessionId = String(Date.now());
        session.setItem("checkoutSessionId", sessionId);
    }
    checkoutSessionId = sessionId;
    console.log(`User's Checkout Session ID: ${checkoutSessionId}`);
}

/**
 * Creates a "flat" list of families and their needs and populates the main repeater.
 */
async function populateFamilyAndIndividualList() {
    console.log("Starting to build the request list...");
    const flatList = [];
    
    // Step 1: Fetch all Families directly from the collection.
    const familiesResult = await wixData.query(COLLECTIONS.FAMILIES).find();
    if (familiesResult.items.length === 0) {
        console.log("No families found in the collection.");
        $w('#repeater1').data = [];
        return;
    }
    console.log(`Found ${familiesResult.items.length} families to process.`);

    for (const family of familiesResult.items) {
        // Step 2: For each family, get all related data in parallel.
        const familyRequestsQuery = wixData.query(COLLECTIONS.OPERATIONS)
            .hasSome(FIELDS.OP_FAMILY_REF, family._id)
            .isEmpty(FIELDS.OP_INDIVIDUAL_REF)
            .find();
        
        const individualsQuery = wixData.query(COLLECTIONS.INDIVIDUALS)
            .hasSome(FIELDS.INDIVIDUAL_FAMILY_REF, family._id)
            .find();

        const [familyRequests, individuals] = await Promise.all([familyRequestsQuery, individualsQuery]);

        let hasAnyRequests = familyRequests.items.length > 0;
        const individualItems = [];

        for (const individual of individuals.items) {
             const individualRequestQuery = await wixData.query(COLLECTIONS.OPERATIONS)
                .hasSome(FIELDS.OP_INDIVIDUAL_REF, individual._id)
                .find();

            if (individualRequestQuery.items.length > 0) {
                 hasAnyRequests = true;
                 individualItems.push({
                    _id: individual._id,
                    type: 'individual',
                    data: { individual, request: individualRequestQuery.items[0] }
                });
            }
        }

        // Step 3: Assemble the data for the repeater.
        if (hasAnyRequests) {
            flatList.push({ 
                _id: family._id, 
                type: 'family', 
                data: {
                    familyDetails: family,
                    familyRequest: familyRequests.items.length > 0 ? familyRequests.items[0] : null
                }
            });
            flatList.push(...individualItems);
        }
    }

    console.log(`Populating main repeater (#repeater1) with ${flatList.length} total items.`);
    const repeater = $w('#repeater1');
    repeater.data = flatList;

    repeater.onItemReady(($item, item, index) => {
        const textElement = $item('#requestInfoText');
        let htmlString = "";

        switch (item.type) {
            case 'family':
                const { familyDetails, familyRequest } = item.data;
                htmlString = `<p style="font-size:18px;"><strong>${familyDetails.headOfFamily}'s Family</strong></p><p><strong>About:</strong> ${familyDetails.familyDescription || 'N/A'}</p>`;
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
                htmlString = `<p style="margin-left:20px;"><strong>${individual.boyOrGirl || 'Member'}, Age: ${individual.age || ''}</strong><br><strong>Needs:</strong> ${request.requestDonationDetails || 'N/A'}<br><strong>Sizes:</strong> ${request.sizeDetails || 'N/A'}</p>`;
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
        await populateSelectedRequestsRepeater();
    });
}

async function populateSelectedRequestsRepeater() {
    const selectedOps = await wixData.query(COLLECTIONS.OPERATIONS)
        .eq("checkoutSessionId", checkoutSessionId)
        .find();

    $w('#repeater2').data = selectedOps.items;

    $w('#repeater2').onItemReady(($item, itemData, index) => {
        $item('#button19').onClick(async () => {
            await wixData.save(COLLECTIONS.OPERATIONS, { ...itemData, checkoutSessionId: null });
            await populateFamilyAndIndividualList();
            await populateSelectedRequestsRepeater();
        });
    });
}

function setupCheckoutForm() {
    const submitButton = $w('#button20');
    const captcha = $w('#captcha1');
    
    submitButton.disable(); 
    captcha.onVerified(() => submitButton.enable());

    submitButton.onClick(async () => {
        submitButton.disable();
        submitButton.label = "Processing...";

        try {
            const newDonorData = {
                donorName: $w('#input3').value,
                donorEmail: $w('#input1').value,
                phone: $w('#input2').value,
                donorId: `DON-${Date.now()}`
            };

            const newDonor = await wixData.insert(COLLECTIONS.DONORS, newDonorData);
            
            const selectedOps = await wixData.query(COLLECTIONS.OPERATIONS)
                .eq("checkoutSessionId", checkoutSessionId)
                .find();

            for (const operation of selectedOps.items) {
                await wixData.insertReference(COLLECTIONS.DONORS, FIELDS.DONOR_OPS_REF, newDonor._id, operation._id);
                await wixData.insertReference(COLLECTIONS.OPERATIONS, FIELDS.OP_DONOR_REF, operation._id, newDonor._id);
                await wixData.save(COLLECTIONS.OPERATIONS, { ...operation, checkoutSessionId: null });
            }
            
            submitButton.label = "Success!";

        } catch (err) {
            console.error("Checkout failed:", err);
            submitButton.label = "Error - Please Try Again";
            submitButton.enable();
        }
    });
}