const createElement = (tag, className, innerHTML = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
};

const showMessage = (message, isError) => {
    const responseDisplay = document.getElementById('responseDisplay');
    responseDisplay.innerHTML = ''; // Clear any existing messages

    const cardContainer = createElement('div', 'd-flex justify-content-center align-items-center vh-20');
    const card = createElement('div', `card mt-3 ${isError ? 'border-danger' : 'border-success'}`);
    const cardHeader = createElement('div', `card-header ${isError ? 'text-danger' : 'text-success'}`, isError ? 'Error' : 'Response');
    const cardBody = createElement('div', 'card-body');
    const cardText = createElement('p', 'card-text', message);
    cardText.style.whiteSpace = 'pre-wrap';


    const copyButton = createElement('button', 'btn btn-sm btn-outline-primary mt-2', 'Copy to Clipboard');
    copyButton.onclick = () => handleCopy(message);

    cardBody.append(cardText, copyButton);
    card.append(cardHeader, cardBody);
    cardContainer.appendChild(card);
    responseDisplay.appendChild(cardContainer);
};

// Function to handle copy to clipboard action
const handleCopy = (message) => {
    navigator.clipboard.writeText(message).then(() => {
        showToast('Copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy response.');
    });
};

// Show toast message
const showToast = (text) => {
    const toast = createElement('div', 'toast align-items-center text-bg-success border-0 position-fixed top-0 end-0 m-3');
    toast.setAttribute('role', 'alert');
    const toastBody = createElement('div', 'd-flex');
    const toastContent = createElement('div', 'toast-body', text);
    const closeButton = createElement('button', 'btn-close me-2 m-auto', '');
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');

    toastBody.append(toastContent, closeButton);
    toast.appendChild(toastBody);
    document.body.appendChild(toast);

    const toastElement = new bootstrap.Toast(toast);
    toastElement.show();
    setTimeout(() => toastElement.hide(), 3000); // Hide toast after 3 seconds
};
document.getElementById('draft-email').disabled = true; // Disable button initially
// Function to handle postData and show response
const postData = async (input) => {
    try {
        const responseDisplay = document.getElementById('responseDisplay');
        responseDisplay.innerHTML = ''; // Clear previous messages

        // Create and display the spinner
        const spinner = document.createElement('div');
        spinner.className = 'd-flex justify-content-center mt-3';
        spinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        responseDisplay.appendChild(spinner); // Add spinner to the response display area

        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content:
                        `Assume you are a project manager assistant. Your task is to analyze the email provided and generate a well-structured output that is clear, actionable, and easy to read. Please follow these steps:
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
                           - Give response in Markdown format.
                     `},
                    { role: "user", content: input }
                ]
            })
        });

        const data = await response.json();
        if (response.ok) {
            // Display the result in responseDisplay
            showMessage(data.choices[0].message.content, false);

            // Show and enable the draft email button after the response is generated
            const draftEmailButton = document.getElementById('draft-email');
            draftEmailButton.classList.remove('d-none');  // Show the button
            draftEmailButton.disabled = false;           // Enable the button

        } else {
            showMessage(data.error.message || 'Error fetching response.', true);
        }
    } catch (error) {
        showMessage('An error occurred: ' + error.message, true);
    }
};

const generateEmailDraft = async (input) => {
    const emailButton = document.getElementById('draft-email');
    const emailSpinner = createElement('span', 'spinner-border spinner-border-sm text-white', ''); // Create the spinner element inside the button
    emailSpinner.setAttribute('role', 'status');
    emailSpinner.setAttribute('aria-hidden', 'true');

    emailButton.appendChild(emailSpinner); // Add the spinner to the button
    emailButton.disabled = true; // Disable the button to prevent multiple clicks

    try {
        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: `Generate a reply email as a Project Manager based on the following input. Make sure it is in a professional and positive tone.` },
                    { role: "user", content: input }
                ]
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Populate the email input field with the generated draft
            const draftContent = data.choices[0].message.content;

            // Create a card to display the draft email
            const cardContainer = createElement('div', 'd-flex justify-content-center align-items-center vh-20');
            const card = createElement('div', 'card mt-3');
            const cardHeader = createElement('div', 'card-header', 'Draft Email');
            const cardBody = createElement('div', 'card-body');
            const cardText = createElement('p', 'card-text', draftContent);
            cardText.style.whiteSpace = 'pre-wrap';


            // Create the "Copy Email" button
            const copyButton = createElement('button', 'btn btn-sm btn-outline-primary mt-2', 'Copy Email');
            copyButton.onclick = () => handleCopy(draftContent); // Copy email content

            cardBody.append(cardText, copyButton);
            card.append(cardHeader, cardBody);
            cardContainer.appendChild(card);
            document.getElementById('responseDisplay').appendChild(cardContainer);
        } else {
            alert('Error generating email draft.');
        }
    } catch (error) {
        alert('An error occurred: ' + error.message);
    } finally {
        emailButton.disabled = true; // Enable the button again
        emailSpinner.remove(); // Remove the spinner from the button
    }
};

// Event listener for the draft-email button
document.getElementById('draft-email').addEventListener('click', async () => {
    const input = document.getElementById('inquiryInput').value;
    await generateEmailDraft(input);
});

// Event listener for the submit button to trigger postData
document.addEventListener('DOMContentLoaded', () => {
    const lastInquiry = localStorage.getItem('lastInquiry') || '';
    document.getElementById('inquiryInput').value = lastInquiry;

    document.getElementById('submitButton').addEventListener('click', async () => {
        const input = document.getElementById('inquiryInput').value;
        localStorage.setItem('lastInquiry', input);
        await postData(input); // Trigger postData and handle response
    });
});
