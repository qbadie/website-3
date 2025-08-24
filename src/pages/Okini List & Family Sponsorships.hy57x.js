import wixData from 'wix-data';
import { session } from 'wix-storage';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    OPERATIONS: "Import3",
    DONORS: "Import5"
};

const FIELDS = {
    OP_DONOR_REF: "linkedDonor",
    DONOR_OPS_REF: "Import3_linkedDonor"
};

let checkoutSessionId;
// ====================================================================


$w.onReady(function () {
    initializeSession();
    setupRequestsRepeater();
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


// ====================================================================
// --- Feature 1: Main Requests Repeater (#repeater1) ---
// ====================================================================

function setupRequestsRepeater() {
    const liveRequestsDataset = $w('#dataset1');
    liveRequestsDataset.include("linkedIndividual");

    $w('#repeater1').onItemReady(($item, itemData, index) => {
        if (itemData.linkedIndividual && itemData.linkedIndividual.length > 0) {
            const individual = itemData.linkedIndividual[0];
            $item('#text138').text = `For ${individual.boyOrGirl}, Age: ${individual.age}`;
        } else {
            $item('#text138').text = "For Family";
        }

        // FIX: More robust check for any "truthy" urgent status.
        $item('#box172').toggle(!!itemData.urgentNeedStatus);

        $item('#switch1').checked = (itemData.checkoutSessionId === checkoutSessionId);
        $item('#switch1').onChange(async (event) => {
            const newSessionId = event.target.checked ? checkoutSessionId : null;
            await wixData.save(COLLECTIONS.OPERATIONS, { ...itemData, checkoutSessionId: newSessionId });
            $w('#dataset4').refresh();
        });
    });
}


// ====================================================================
// --- Feature 2 & 3: Selected Requests & Multiuser Safety ---
// ====================================================================

function setupSelectedRequestsRepeater() {
    const selectedRequestsDataset = $w('#dataset4');
    selectedRequestsDataset.setFilter(wixData.filter().eq("checkoutSessionId", checkoutSessionId));

    $w('#repeater2').onItemReady(($item, itemData, index) => {
        $item('#button19').onClick(async () => {
            await wixData.save(COLLECTIONS.OPERATIONS, { ...itemData, checkoutSessionId: null });
            await $w('#dataset1').refresh();
            await $w('#dataset4').refresh();
        });
    });
}


// ====================================================================
// --- Feature 4: Captcha and Final Checkout ---
// ====================================================================

function setupCheckoutForm() {
    const submitButton = $w('#button20');
    // ACTION: Ensure this button is "Disabled on load" in the Editor.
    
    $w('#captcha1').onVerified(() => {
        submitButton.enable();
    });

    submitButton.onClick(async () => {
        submitButton.disable();
        submitButton.label = "Processing...";

        try {
            const newDonorData = {
                donorName: $w('#input3').value,
                donorEmail: $w('#input1').value,
                phone: $w('#input2').value,
                donorMessage: $w('#textBox1').value,
                organizationName: $w('#input4').value, // Corrected from 'org'
                prefferedFulfillment: $w('#checkboxGroup1').value,
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
            // Optional: Navigate to a "Thank You" page.
            // import wixLocation from 'wix-location';
            // wixLocation.to("/thank-you-page-url");

        } catch (err) {
            console.error("Checkout failed:", err);
            submitButton.label = "Error - Please Try Again";
            submitButton.enable();
        }
    });
}