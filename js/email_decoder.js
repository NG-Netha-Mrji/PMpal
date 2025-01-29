import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";
const marked = new Marked();
const decodedHtmlOutput = document.getElementById('decodedHtmlOutput');
//var activeTab = document.querySelector('.tab-pane.active');
var decodedContent='';
var finalDraftContent='';
var contentToCopy='';

console.log ("Initialising");

const createElement = (tag, className, innerHTML = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
};


// Reset tabs and content on page load
function resetResults() {
    document.getElementById('inquiryInput').value = '';
    //document.getElementById('decoderOutput').value = '';
    document.getElementById('draft-email-content').value = '';
    document.getElementById('draft-hints').value = '';
    document.getElementById('draftOutput').value = '';
    document.getElementById('copyButton').style.display = 'block';
    document.getElementById('copyButton').disabled = true;
    
    const copyButtonContainer = document.getElementById('copyButtonContainer');
    copyButtonContainer.style.display = 'none';

  }

    // Call reset on page load
    resetResults();


    
    //function to set content to be copied

    const checkContentToCopy = () => {
     const activeTab = document.querySelector('.tab-pane.active');

        if (activeTab.id === 'decoder') {
            contentToCopy = decodedContent;
        } else if (activeTab.id === 'draft') {
            contentToCopy = finalDraftContent;
        }
        console.log("active Tab: " + activeTab.id);
        console.log("content to copy: " + contentToCopy);
        //console.log("decoded content: " + decodedContent);
        //console.log("draft content: " + draftContent);
    };

    
    // Function to update the copy button state
    const updateCopyButtonState = () => {
    //const activeTab = document.querySelector('.tab-pane.active');
    //let contentToCopy = '';

    checkContentToCopy();    
    const copyButton = document.getElementById('copyButton');
        if (contentToCopy) {
            copyButton.style.display = 'block';
            copyButton.disabled = false;
        } else {
            //copyButton.style.display = 'none';
            copyButton.disabled = true;
        }
    };

// Function to check and update the draft button state
const checkDraftButtonState = () => {
    const draftButton = document.getElementById('draft-email');
    const draftContent = document.getElementById('draft-email-content').value;
    const draftHints = document.getElementById('draft-hints').value;
    //const decoderOutput = document.getElementById('decodedHtmlOutput').innerHTML;

    console.log('decoder output: ' + decodedContent);
    console.log('draft content: ' + draftContent);
    console.log('draft hints: ' + draftHints);

    if (decodedContent || draftContent || draftHints) {
        draftButton.disabled = false;
    } else {
        draftButton.disabled = true;
    }
};


const showMessage = (message, isError) => {
    //const responseDisplay = document.getElementById('decoderOutput'); // Use decoderOutput for displaying results
    decodedHtmlOutput.innerHTML = isError ? `<div class="alert alert-danger">${message}</div>` : marked.parse(message); // Parse message if not an error
    updateCopyButtonState(); // Update copy button state after showing message
};

const postData = async (input) => {
    try {
        //const responseDisplay = document.getElementById('decoderOutput');
        decodedHtmlOutput.innerHTML = ''; // Clear previous messages

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
                        1. Sentiment Analysis:
                           - Analyze the tone of the email (Positive/Negative/Neutral).
                           - If the sentiment is negative, briefly explain the reasons for the negative tone.

                        2. Highlight Key Points:
                           - Use bullet points to extract the main ideas or concerns from the email.

                        3. Action Items:
                           - Categorize action items for each stakeholder (e.g., Project Manager, Team Members).
                           - Use the format: "**Stakeholder Name**: Action 1, Action 2"

                        4. Calendar Events:
                           - If any meetings or deadlines are implied, suggest corresponding Google Calendar events with specific details (title, date, and time).

                        Respond in markdown format.`
                    },
                    { role: "user", content: input }
                ]
            })
        });

        const data = await response.json();
        //marked.parse(data.choices[0].message.content);
        if (response.ok) {
            // Display the result in decoderOutput
            
            decodedContent=data.choices[0].message.content;

            contentToCopy=decodedContent;

            //showMessage(data.choices[0].message.content, false);
            
            //console.log(marked.parse(data.choices[0].message.content));
            // Display results in HTML format
            //const decodedHtmlOutput = document.getElementById('decodedHtmlOutput'); // Reference to the new div
            decodedHtmlOutput.innerHTML = `
            <div class="alert alert-success" role="alert">
                <h4 class="alert-heading">Decoding Complete!</h4>
                <hr>
                <div class="analysis-content">
                    ${marked.parse(decodedContent)}
                </div>
            </div>
            `;
            console.log("response display: " + decodedContent);
            updateCopyButtonState();
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
    const emailButton1 = document.getElementById('submitButton');
    const emailSpinner1 = createElement('span', 'spinner-border spinner-border-sm text-white', '');
    
    emailSpinner1.setAttribute('role', 'status');
    emailSpinner1.setAttribute('aria-hidden', 'true');

    emailButton1.appendChild(emailSpinner1);
    emailButton1.disabled = true;
    await postData(input); // Trigger postData and handle response
    emailSpinner1.remove();
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
            finalDraftContent = data.choices[0].message.content;
            contentToCopy = finalDraftContent;
            
            console.log('draft email: ' + contentToCopy);

            const draftOutput = document.getElementById('draftOutput');
            draftOutput.value = finalDraftContent; // Populate the draft output textarea
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

// Add event listeners to update copy button state based on switches to the tabs
document.getElementById('decoder').addEventListener('focus', updateCopyButtonState);
document.getElementById('decoder').addEventListener('click', updateCopyButtonState);
document.getElementById('draft').addEventListener('focus', updateCopyButtonState);
document.getElementById('draft').addEventListener('click', updateCopyButtonState);

// Add event listeners to update draft button state based on changes to draft or hints textarea
document.getElementById('draft-email-content').addEventListener('input', checkDraftButtonState);
document.getElementById('draft-hints').addEventListener('input', checkDraftButtonState);


// Copy to clipboard functionality
document.getElementById('copyButton').addEventListener('click', () => {
    
    try {
            copyButtonContainer.style.display = 'flex';    
            checkContentToCopy(); 
            navigator.clipboard.writeText(contentToCopy);
            const copyButton = document.getElementById('copyButton');
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = '<i class="bi bi-check2"></i> Copied!';
            copyButton.classList.add('btn-success');
            copyButton.classList.remove('btn-outline-primary');
                    
            setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.classList.remove('btn-success');
            copyButton.classList.add('btn-outline-primary');
            }, 2000);
        } catch (err)
                 {
                    console.error('Failed to copy text:', err);
                    alert('Failed to copy to clipboard');
                 }

    });