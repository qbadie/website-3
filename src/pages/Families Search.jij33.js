// This code will now work correctly with the properly configured dataset.
import wixData from 'wix-data';
import wixLocationFrontend from 'wix-location-frontend';

// A timer for debouncing the search input to improve performance
let debounceTimer;

$w.onReady(function () {
    // Sets up page functionality
    setupRowSelect();
    setupInstantSearch();

    // This listener on the DATASET is now valid
    $w('#dataset1').onReady(() => {
        updateFeedbackText();
    });
});

/**
 * Sets up row selection for the #familiesTable.
 * When a row is clicked, it navigates to that family's dynamic page.
 */
function setupRowSelect() {
    $w('#familiesTable').onRowSelect((event) => {
        const itemPageLink = event.rowData['link-families-familyId']; 
        if (itemPageLink) {
            wixLocationFrontend.to(itemPageLink);
        }
    });
}

/**
 * Sets up an instant "as-you-type" search on the #searchInput element.
 */
function setupInstantSearch() {
    $w('#searchInput').onInput(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            applyFilters();
        }, 500); // Debounce to reduce server queries while typing
    });
}

/**
 * Applies filters to the dataset based on the search term.
 */
async function applyFilters() {
    const searchableFields = [
        'headOfFamily', 'familyMembers', 'familyDescription',
        'directions', 'needs', 'staffNotes', 'primaryMailingAddress'
    ];

    let finalFilter = wixData.filter();
    let searchTerm = $w('#searchInput').value;

    // If there is a search term, create a search filter
    if (searchTerm && searchTerm.length > 0) {
        const searchFilters = searchableFields.map(field => wixData.filter().contains(field, searchTerm));
        finalFilter = searchFilters.reduce((fullFilter, currentFilter) => fullFilter.or(currentFilter));
    }
    
    // This function call on the DATASET is now valid
    await $w('#dataset1').setFilter(finalFilter);
    updateFeedbackText();
}

/**
 * Updates the #messageText element with the current item count from the dataset.
 */
function updateFeedbackText() {
    const totalCount = $w('#dataset1').getTotalCount();
    if (totalCount > 0) {
        $w('#messageText').text = `Showing ${totalCount} families.`;
        $w('#messageText').expand();
    } else {
        $w('#messageText').text = "No families found matching your criteria.";
        $w('#messageText').expand();
    }
}