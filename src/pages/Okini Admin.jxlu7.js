import wixData from 'wix-data';

// ====================================================================
// --- Configuration ---
const DONORS_COLLECTION_ID = "Import5"; 
const APPROVAL_FIELD_KEY = "approvedDonor";
// ====================================================================


$w.onReady(function () {
    updateNewDonorCount();
    setupRequestsRepeater();
});


/**
 * Sets up the repeater for operations to display the progress bar status.
 */
function setupRequestsRepeater() {
    // ACTION: Make sure this is the ID of your requests repeater.
    $w("#requestsRepeater").onItemReady(($item, itemData, index) => {
        const progressBar = $item("#progressBar1");
        // FIX: Select the new text element you added.
        const statusText = $item("#text128"); 
        const status = itemData.operationType;

        const statusSettings = {
            "Requested": { value: 10 },
            "Pledged": { value: 50 },
            "PendingFulfillment": { value: 75 },
            "Fulfilled": { value: 100 }
        };

        const currentStatus = statusSettings[status];

        if (currentStatus) {
            // 1. Set the progress bar's numerical value.
            progressBar.value = currentStatus.value;
            
            // 2. Set the text of your new text element.
            statusText.text = `${status}`;
        }
    });
}


/**
 * Queries the Donors collection to count unapproved items and updates the text element.
 */
async function updateNewDonorCount() {
    const countElement = $w('#text127'); 

    try {
        const count = await wixData.query(DONORS_COLLECTION_ID)
            .ne(APPROVAL_FIELD_KEY, true)
            .count();

        if (count === 1) {
            countElement.text = "There is 1 donor pending approval";
        } else {
            countElement.text = `There are ${count} donors pending approval`;
        }

    } catch (error) {
        console.error("Failed to count new donors:", error);
        countElement.text = "Error loading donor count.";
    }
}