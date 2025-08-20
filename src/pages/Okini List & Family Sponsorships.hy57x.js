$w.onReady(function () {
    // This function runs when the switch is toggled.
    $w('#switch1').onChange(() => {
        // Check if the switch is turned on (checked).
        if ($w('#switch1').checked) {
            // If it's on, expand the section.
            $w('#section18').expand();
        } else {
            // If it's off, collapse the section.
            $w('#section18').collapse();
        }
    });

    // This function runs when the button is clicked.
    $w('#button18').onClick(() => {
        // When the button is clicked, we do two things:
        // 1. Turn the switch to the "on" position.
        $w('#switch1').checked = true;
        
        // 2. Expand the section.
        $w('#section18').expand();
    });
});