// Content script for Anonymizer Extension

// Pre-defined selectors for specific websites
const websiteSelectors = {
    'www.google.com': 'textarea[name="q"]',
    'chat.openai.com': '#prompt-textarea',  // For ChatGPT's contenteditable div
    'chatgpt.com': '#prompt-textarea'       // In case the hostname is different
};

let anonymizerEnabled = true;
let toggleButton = null;

// Store the original text temporarily
let originalTextStorage = {};

// Create and add the toggle button
function createToggleButton() {
    if (toggleButton && document.body.contains(toggleButton)) return;

    toggleButton = document.createElement('button');
    toggleButton.innerText = 'Anonymizer';
    toggleButton.style.position = 'fixed';
    toggleButton.style.top = '10px';
    toggleButton.style.right = '10px';
    toggleButton.style.zIndex = '2147483647'; // Maximum z-index value
    toggleButton.style.backgroundColor = 'green';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.padding = '10px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.fontFamily = 'Arial, sans-serif';
    toggleButton.style.fontSize = '14px';
    toggleButton.style.borderRadius = '5px';

    toggleButton.addEventListener('click', () => {
        anonymizerEnabled = !anonymizerEnabled;
        toggleButton.style.backgroundColor = anonymizerEnabled ? 'green' : 'red';
    });

    // Make the button draggable
    toggleButton.addEventListener('mousedown', onMouseDown);

    document.body.appendChild(toggleButton);
}

// Ensure toggle button exists and is in the DOM
function ensureToggleButtonExists() {
    if (!document.body.contains(toggleButton)) {
        document.body.appendChild(toggleButton);
    }
}

// Dragging functionality
let offsetX, offsetY;

function onMouseDown(event) {
    // Calculate the offset between mouse and button position
    offsetX = event.clientX - toggleButton.getBoundingClientRect().left;
    offsetY = event.clientY - toggleButton.getBoundingClientRect().top;

    // Add event listeners to handle mouse move and up
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event) {
    // Update the position of the button based on mouse position
    toggleButton.style.left = `${event.clientX - offsetX}px`;
    toggleButton.style.top = `${event.clientY - offsetY}px`;
}

function onMouseUp() {
    // Remove the event listeners when the mouse button is released
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// Function to anonymize text based on user input
function anonymizeText(inputElement) {
    if (!anonymizerEnabled) return;

    // Get the text based on the input type (textarea or contenteditable div)
    let originalText = inputElement.value || inputElement.innerText || inputElement.textContent;

    // Store the original text for later retrieval
    originalTextStorage[inputElement.id] = originalText;

    fetch('http://127.0.0.1:5000/anonymize', {  // Local server assumed
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: originalText }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.anonymized_text) {
            // Update the text inside the search field (textarea or contenteditable div)
            if (inputElement.tagName.toLowerCase() === 'textarea') {
                inputElement.value = data.anonymized_text;  // For textarea
            } else if (inputElement.contentEditable === "true") {
                inputElement.innerText = data.anonymized_text;  // For contenteditable div
            }
        }
    })
    .catch(error => {
        console.error("Error anonymizing text:", error);
    });
}

// Function to handle Tab key press
function handleTabPress(event) {
    if (event.key === 'Tab' && anonymizerEnabled) {
        const hostname = window.location.hostname;
        if (hostname in websiteSelectors) {
            const searchInput = document.querySelector(websiteSelectors[hostname]);
            if (searchInput) {
                event.preventDefault();  // Prevent the default Tab action
                anonymizeText(searchInput);  // Anonymize text
            }
        }
    }
}

// Function to handle Alt key press to revert to original text
function handleAltPress(event) {
    if (event.altKey) {  // Check if Alt key is pressed
        const hostname = window.location.hostname;
        if (hostname in websiteSelectors && anonymizerEnabled) {
            const searchInput = document.querySelector(websiteSelectors[hostname]);
            if (searchInput) {
                // Check if original text is stored and replace the current text
                const originalText = originalTextStorage[searchInput.id];
                if (originalText) {
                    if (searchInput.tagName.toLowerCase() === 'textarea') {
                        searchInput.value = originalText;  // For textarea
                    } else if (searchInput.contentEditable === "true") {
                        searchInput.innerText = originalText;  // For contenteditable div
                    }
                }
                event.preventDefault();  // Prevent the default Alt action
            }
        }
    }
}

// Main function to initialize the extension
function initializeAnonymizer() {
    setTimeout(() => {
        createToggleButton();
        setInterval(ensureToggleButtonExists, 1000); // Check every second
    }, 2000); // Wait 2 seconds before creating the button

    // Add event listener for keydown events to detect 'Tab' and 'Alt' key presses
    document.addEventListener('keydown', handleTabPress);
    document.addEventListener('keydown', handleAltPress);

    // Observe DOM changes for dynamically loaded search inputs
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const hostname = window.location.hostname;
                if (hostname in websiteSelectors) {
                    const searchInput = document.querySelector(websiteSelectors[hostname]);
                    if (searchInput && !searchInput.dataset.anonymizerInitialized) {
                        searchInput.dataset.anonymizerInitialized = 'true';
                        searchInput.addEventListener('keydown', handleTabPress);
                    }
                }
            }
        });

        // Ensure the toggle button is always present
        ensureToggleButtonExists();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize the anonymizer when the content script loads
initializeAnonymizer();
