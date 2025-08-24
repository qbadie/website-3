import wixData from 'wix-data';
import { session } from 'wix-storage';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    OPERATIONS: "Import3",
    DONORS: "Import5",
    INDIVIDUALS: "Import6"
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
    $w('#repeater1').onItemReady(async ($item, itemData, index) => {
        // --- Logic for "For Who?" text (#text138) ---
        // FIX: We must manually fetch the individual's data since .include() cannot be used here.
        if (itemData.linkedIndividual) {
            try {
                // Get the ID from the reference field. It might be an array, so we take the first.
                const individualId = Array.isArray(itemData.linkedIndividual) ? itemData.linkedIndividual[0]._id : itemData.linkedIndividual._id;
                const individual = await wixData.get(COLLECTIONS.INDIVIDUALS, individualId);
                if (individual) {
                    $item('#text138').text = `For ${individual.boyOrGirl}, Age: ${individual.age}`;
                }
            } catch(e) {
                 $item('#text138').text = "For Family";
            }
        } else {
            $item('#text138').text = "For Family";
        }

        // --- Logic for "Urgent Need" box (#box172) ---
        // FIX: Using .expand() and .collapse() instead of .toggle().
        const isUrgent = itemData.urgentNeedStatus === true || String(itemData.urgentNeedStatus).toUpperCase() === 'TRUE';
        if (isUrgent) {
            $item('#box172').show();
        } else {
            $item('#box172').hide();
        }

        // --- Logic for the "Select Request" switch (#switch1) ---
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
    const submitButton = $w('#button20'); // <-- Use your actual submit button ID
    const newDonorDataset = $w('#dataset3');
    
    // ACTION: In the Editor, select your submit button and check "Disabled on load".
    
    $w('#captcha1').onVerified(() => {
        submitButton.enable();
    });

    // When a new donor is successfully created...
    newDonorDataset.onAfterSave(async (newDonor) => {
        // ...link all the selected operations to them.
        const selectedOps = await wixData.query(COLLECTIONS.OPERATIONS)
            .eq("checkoutSessionId", checkoutSessionId)
            .find();

        for (const operation of selectedOps.items) {
            await wixData.insertReference(COLLECTIONS.DONORS, FIELDS.DONOR_OPS_REF, newDonor._id, operation._id);
            await wixData.insertReference(COLLECTIONS.OPERATIONS, FIELDS.OP_DONOR_REF, operation._id, newDonor._id);
            await wixData.save(COLLECTIONS.OPERATIONS, { ...operation, checkoutSessionId: null });
        }
        
        submitButton.label = "Success!";
        // Optional: Navigate to a "Thank You" page here.
    });

    newDonorDataset.onError(() => {
        submitButton.label = "Error - Please Try Again";
        submitButton.enable();
    });

    // The submit button now just saves the new donor dataset.
    submitButton.onClick(() => {
        submitButton.disable();
        submitButton.label = "Processing...";
        newDonorDataset.setFieldValues({
            donorId: `DON-${Date.now()}`
        });
        newDonorDataset.save();
    });
}