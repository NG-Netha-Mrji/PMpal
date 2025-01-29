const createElement = (tag, className, innerHTML = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
};

const showMessage = (message, isError) => {
    const responseDisplay = document.getElementById('decoderOutput'); // Use decoderOutput for displaying results
    responseDisplay.value = message; // Populate the textarea with the message
    updateCopyButtonState(); // Update copy button state after showing message
};

const postData = async (input) => {
    try {
        const responseDisplay = document.getElementById('decoderOutput');
        responseDisplay.innerHTML = ''; // Clear previous messages

        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `Assume you are a project manager assistant. Your task is to analyze the email provided and generate a well-structured output that is clear, actionable, and easy to read. Please follow these steps:
                        **Sentiment Analysis**:
                           - Analyze the tone of the email (Positive/Negative/Neutral).
                           - If the sentiment is negative, briefly explain the reasons for the negative tone.

                        **Highlight Key Points**:
                           - Use bullet points to extract the main ideas or concerns from the email.

                        **Action Items**:
                           - Categorize action items for each stakeholder (e.g., Project Manager, Team Members).
                           - Use the format: "**Stakeholder Name**: Action 1, Action 2"

                        **Calendar Events**:
                           - If any meetings or deadlines are implied, suggest corresponding Google Calendar events with specific details (title, date, and time).

                        **Formatting**:
                           - Use **bold headings** to make the structure clear (e.g., **Sentiment Analysis**, **Action Items**, **Calendar Events**).
                           - Use bullet points for lists and subcategories.
                           - Do not merge multiple sections into a single paragraph.
                           - Give response in Markdown format.`
                    },
                    { role: "user", content: input }
                ]
            })
        });

        const data = await response.json();
        if (response.ok) {
            // Display the result in decoderOutput
            showMessage(data.choices[0].message.content, false);
            // Display results
            responseDisplay.innerHTML = `
            <div class="alert alert-success" role="alert">
                <h4 class="alert-heading">Decoding Complete!</h4>
                <hr>
            <div class="analysis-content">
                ${data.choices[0].message.content}
            </div>
            </div>
            `;
            document.getElementById('draft-email').disabled = false; // Enable the draft email button
        } else {
            showMessage(data.error.message || 'Error fetching response.', true);
        }
    } catch (error) {
        showMessage('An error occurred: ' + error.message, true);
    }
};

// Event listener for the submit button to trigger postData
document.getElementById('submitButton').addEventListener('click', async () => {
    const input = document.getElementById('inquiryInput').value;
    await postData(input); // Trigger postData and handle response
});

// Function to generate email draft
const generateEmailDraft = async (input) => {
    const emailButton = document.getElementById('draft-email');
    const emailSpinner = createElement('span', 'spinner-border spinner-border-sm text-white', '');
    emailSpinner.setAttribute('role', 'status');
    emailSpinner.setAttribute('aria-hidden', 'true');

    emailButton.appendChild(emailSpinner);
    emailButton.disabled = true;

    try {
        // Get the additional inputs
        const draftContent = document.getElementById('draft-email-content').value.trim();
        const draftHints = document.getElementById('draft-hints').value.trim();

        // Determine the appropriate system prompt based on input combinations
        let systemPrompt = '';
        if (draftContent && draftHints) {
            systemPrompt = `As a Project Manager, generate a response email using the following draft email and modification requirements provided:

            Original Draft:
            ${draftContent}

            Modification Requirements:
            ${draftHints}

            Please maintain a professional tone while incorporating the requested changes.`;
        } else if (draftContent) {
            systemPrompt = `As a Project Manager, improve and refine the following draft email:

            Original Draft:
            ${draftContent}

            Please enhance the content while maintaining the core message and ensuring a professional tone.`;
        } else if (draftHints) {
            systemPrompt = `As a Project Manager, generate a reply email based on the following requirements and guidelines:

            Requirements:
            ${draftHints}

            Please ensure the response is professional, clear, and addresses all the specified points.`;
        } else {
            systemPrompt = `As a Project Manager, generate a positive and professional reply email. 
            The response should be:
            - Constructive and solution-oriented
            - Empathetic and understanding
            - Clear and actionable
            - Maintaining a positive professional tone throughout`;
        }

        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input }
                ]
            })
        });

        const data = await response.json();

        if (response.ok) {
            const draftContent = data.choices[0].message.content;
            const draftOutput = document.getElementById('draftOutput');
            draftOutput.value = draftContent; // Populate the draft output textarea
            updateCopyButtonState(); // Update copy button state after showing draft
        } else {
            alert('Error generating email draft.');
        }
    } catch (error) {
        alert('An error occurred: ' + error.message);
    } finally {
        //document.getElementById('draft-email').disabled = false; // Enable the button when done
        emailSpinner.remove();
    }
};

           

    
// Event listener for the draft-email button
document.getElementById('draft-email').addEventListener('click', async () => {
    const input = document.getElementById('draft-email-content').value;
    await generateEmailDraft(input);
});