document.getElementById('anonymizeBtn').addEventListener('click', async () => {
    const text = document.getElementById('inputText').value;

    // Ensure text is entered
    if (!text) {
        alert("Please enter some text to anonymize.");
        return;
    }

    try {
        // Send request to Flask server
        const response = await fetch('http://127.0.0.1:5000/anonymize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        // Check if response is OK
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        // Parse the response as JSON
        const result = await response.json();

        // Update the result in the UI
        if (result && result.anonymized_text) {
            document.getElementById('result').innerText = result.anonymized_text;
        } else {
            document.getElementById('result').innerText = "Anonymization failed.";
        }

    } catch (error) {
        console.error("An error occurred:", error);
        document.getElementById('result').innerText = "An error occurred while processing the text.";
    }
});
