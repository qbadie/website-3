// This script uses built-in Node.js modules to interact with the file system.
const fs = require('fs');
const path = require('path');

// The directory where your page structure files are stored.
const pagesDir = path.join(__dirname, 'src', 'pages');

// This function recursively finds all IDs within a component's data structure.
function findIdsInComponent(component, ids) {
    // If the component has an ID, add it to our list.
    // A 'Set' is used to automatically prevent duplicates.
    if (component.id) {
        ids.add(`#${component.id}`);
    }

    // If the component contains other components (children), search through them too.
    if (component.components && component.components.length > 0) {
        for (const child of component.components) {
            findIdsInComponent(child, ids);
        }
    }
}

console.log('--- 🚀 Starting Element ID Export ---');

// Read all the files from your pages directory.
fs.readdir(pagesDir, (err, files) => {
    if (err) {
        return console.error('❌ Could not read the pages directory.', err);
    }

    // Process each file found in the directory.
    files.forEach(file => {
        // We only care about the page structure files, which end with '.wix'.
        if (path.extname(file) === '.wix') {
            const filePath = path.join(pagesDir, file);
            const pageContent = fs.readFileSync(filePath, 'utf8');
            const pageJson = JSON.parse(pageContent);

            const elementIds = new Set();
            
            // Start the search from the root 'page' component in the file.
            if (pageJson.page) {
                findIdsInComponent(pageJson.page, elementIds);
            }

            // Print the results for the current page if any IDs were found.
            if (elementIds.size > 0) {
                console.log(`\n📄 Page: ${file.replace('.wix', '')}`);
                console.log('-----------------------------');
                // Convert the Set to an array, sort it alphabetically, and print each ID.
                [...elementIds].sort().forEach(id => console.log(id));
            }
        }
    });

    console.log('\n✅ Export complete.');
});