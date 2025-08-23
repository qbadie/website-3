import wixData from 'wix-data';
import { session } from 'wix-storage';

// ====================================================================
// --- Configuration ---
const COLLECTIONS = {
    OPERATIONS: "Import3",
    DONORS: "Import5",
    // NOTE: We will be modifying the Operations collection directly
    // instead of using a separate "Selected Requests" collection.
};

const FIELDS = {
    OP_DONOR_REF: "linkedDonor",
    DONOR_OPS_REF: "Import3_linkedDonor"
};

// This will hold the unique ID for the guest's entire session.
let checkoutSessionId;
// ====================================================================


$w.onReady(function () {
    // 1. Generate or retrieve the unique ID for this user's session.
    initializeSession();

    // 2. Set up the main repeater with all the interactive elements.
    setupRequestsRepeater();
    
    // 3. Set up the repeater for items the user has selected.
    setupSelectedRequestsRepeater();

    // 4. Set up the final checkout/submission logic.
    setupCheckoutForm();
});

/**
 * Creates a unique ID for the user's session or retrieves the existing one.
 * This is the key to preventing multiuser interference.
 */
function initializeSession() {
    let sessionId = session.getItem("checkoutSessionId");
    if (!sessionId) {
        // If the user is new, create a unique ID based on the current time.
        sessionId = String(Date.now());
        session.setItem("checkoutSessionId", sessionId);
    }
    checkoutSessionId = sessionId;
    console.log(`User's Checkout Session ID: ${checkoutSessionId}`);
}


// ====================================================================
// --- Feature 1: Main Requests Repeater (#repeater1) ---
// ====================================================================

function setupRequestsRepeater() {
    const liveRequestsDataset = $w('#dataset1');

    // We need to include the linked individual's data to populate the "For Who?" text.
    liveRequestsDataset.include("linkedIndividual");

    $w('#repeater1').onItemReady(($item, itemData, index) => {
        // --- Logic for "For Who?" text (#text138) ---
        if (itemData.linkedIndividual) {
            const individual = itemData.linkedIndividual;
            $item('#text138').text = `For ${individual.boyOrGirl}, Age: ${individual.age}`;
        } else {
            $item('#text138').text = "For Family";
        }

        // --- Logic for "Urgent Need" box (#box172) ---
        if (itemData.urgentNeedStatus === true) {
            $item('#box172').expand();
        } else {
            $item('#box172').collapse();
        }

        // --- Logic for the "Select Request" switch (#switch1) ---
        // First, check if this item is already part of the current session.
        if (itemData.checkoutSessionId === checkoutSessionId) {
            $item('#switch1').checked = true;
        }

        $item('#switch1').onChange(async (event) => {
            const isSelected = event.target.checked;
            
            if (isSelected) {
                // When selected, "claim" this operation by adding our session ID to it.
                await wixData.save(COLLECTIONS.OPERATIONS, {
                    ...itemData,
                    checkoutSessionId: checkoutSessionId
                });
            } else {
                // When deselected, "release" it by clearing the session ID.
                await wixData.save(COLLECTIONS.OPERATIONS, {
                    ...itemData,
                    checkoutSessionId: null
                });
            }
            // Refresh the "Selected Requests" repeater to show the change.
            $w('#dataset4').refresh();
        });
    });
}


// ====================================================================
// --- Feature 2 & 3: Selected Requests & Multiuser Safety ---
// ====================================================================

function setupSelectedRequestsRepeater() {
    const selectedRequestsDataset = $w('#dataset4');

    // Filter the dataset to ONLY show items "claimed" by the current user's session.
    selectedRequestsDataset.setFilter(
        wixData.filter().eq("checkoutSessionId", checkoutSessionId)
    );

    $w('#repeater2').onItemReady(($item, itemData, index) => {
        // Logic for the remove button (#button19)
        $item('#button19').onClick(async () => {
            // "Release" the item by clearing its session ID.
            await wixData.save(COLLECTIONS.OPERATIONS, {
                ...itemData,
                checkoutSessionId: null
            });
            // Refresh both datasets to update the UI everywhere.
            await $w('#dataset1').refresh();
            await $w('#dataset4').refresh();
        });
    });
}


// ====================================================================
// --- Feature 4: Captcha and Final Checkout ---
// ====================================================================

function setupCheckoutForm() {
    const submitButton = $w('#button20'); // <-- Make sure this is your submit button's ID
    const captcha = $w('#captcha1');

    // The submit button should be disabled by default in the editor.
    submitButton.disable();

    // When the captcha is verified, enable the submit button.
    captcha.onVerified(() => {
        submitButton.enable();
    });

    // When the submit button is clicked, run the final transaction.
    submitButton.onClick(async () => {
        submitButton.disable();
        submitButton.label = "Processing...";

        try {
            // 1. Gather all the donor info from your input fields.
            // Make sure your input field IDs are correct here.
            const newDonorData = {
                donorName: $w('#input3').value,
                donorEmail: $w('#input1').value,
                phone: $w('#input2').value,
                donorMessage: $w('#textBox1').value,
                org: $w('#input4').value,
                prefferedFulfillment: $w('#checkboxGroup1').value,
                donorId: `DON-${Date.now()}` // Create a unique ID for the new donor
            };

            // 2. Create the new Donor item in the database.
            const newDonor = await wixData.insert(COLLECTIONS.DONORS, newDonorData);

            // 3. Get all the operations selected in this session.
            const selectedOps = await wixData.query(COLLECTIONS.OPERATIONS)
                .eq("checkoutSessionId", checkoutSessionId)
                .find();

            // 4. Loop through the selected operations and create the two-way links.
            for (const operation of selectedOps.items) {
                // From Donor -> Operation
                await wixData.insertReference(COLLECTIONS.DONORS, FIELDS.DONOR_OPS_REF, newDonor._id, operation._id);
                // From Operation -> Donor
                await wixData.insertReference(COLLECTIONS.OPERATIONS, FIELDS.OP_DONOR_REF, operation._id, newDonor._id);
            }

            // 5. (Optional) Clear the session ID from the operations.
            for (const operation of selectedOps.items) {
                await wixData.save(COLLECTIONS.OPERATIONS, {
                    ...operation,
                    checkoutSessionId: null
                });
            }

            submitButton.label = "Success!";
            // You can also navigate the user to a "Thank You" page here.

        } catch (err) {
            console.error("Checkout failed:", err);
            submitButton.label = "Error - Please Try Again";
            submitButton.enable();
        }
    });
}