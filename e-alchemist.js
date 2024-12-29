document.addEventListener('DOMContentLoaded', function() {
    // Load the Google API Client Library and Gmail API
    gapi.load('client:auth2', () => {
        gapi.client.init({
            clientId: '746662336433-f8v8vpepmjp22mlvgutl0o4gno44h5kn.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels email profile',
            plugin_name: 'PM Pal'
        }).then(() => {
            // Load the Gmail API
            return gapi.client.load('gmail', 'v1');
        }).then(() => {
            console.log('Gmail API initialized');
        }).catch(error => {
            console.error('Error initializing Gmail API:', error);
        });
    });

    const searchForm = document.getElementById('searchForm');
    
    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Check authentication status from localStorage
        const mailboxAuth = localStorage.getItem('mailboxAuth');
        const userEmail = localStorage.getItem('userEmail');
        const accessToken = localStorage.getItem('accessToken');
        
        if (!mailboxAuth || mailboxAuth !== 'true') {
            const resultsContainer = document.getElementById('resultsContainer');
            resultsContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Please authenticate your mailbox before using this feature. 
                    <a href="auth.html" class="alert-link">Go to Authentication Page</a>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            return;
        }

        // If authenticated, show loading spinner
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = `
            <div class="text-center">
                <div class="spinner-border" role="status"></div>
                <p class="mt-2">Analyzing emails for ${userEmail}...</p>
            </div>
        `;

        try {
            // Ensure Gmail API is loaded
            if (!gapi.client.gmail) {
                await gapi.client.load('gmail', 'v1');
            }

            // Get form values
            const searchContent = document.getElementById('searchContent').value;
            const insights = document.getElementById('insights').value;
            const outputFormat = document.getElementById('outputFormat').value;

            // Set authorization header with the access token
            gapi.client.setToken({ access_token: accessToken });

            // Use Gmail API to search emails
            const query = searchContent;
            const emailsResponse = await gapi.client.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 10
            });

            const emails = emailsResponse.result.messages || [];

            // Fetch details for each email
            const emailDetails = await Promise.all(
                emails.map(async email => {
                    const detailResponse = await gapi.client.gmail.users.messages.get({
                        userId: 'me',
                        id: email.id,
                        format: 'full'
                    });
                    return detailResponse.result;
                })
            );

            // Prepare email content for analysis
            const emailContent = emailDetails.map(email => {
                const headers = email.payload.headers;
                const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
                const date = headers.find(h => h.name === 'Date')?.value || 'No Date';
                
                let body = '';
                if (email.payload.parts) {
                    const textPart = email.payload.parts.find(part => part.mimeType === 'text/plain');
                    if (textPart && textPart.body.data) {
                        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                } else if (email.payload.body.data) {
                    body = atob(email.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }

                return `
Email ${emails.indexOf(email) + 1}:
Subject: ${subject}
From: ${from}
Date: ${date}
Content: ${body}
-------------------
`;
            }).join('\n');

            // Format instruction based on output format
            let formatInstruction = '';
            switch(outputFormat) {
                case 'keypoints':
                    formatInstruction = 'Format the response as key points with clear headings';
                    break;
                case 'table':
                    formatInstruction = 'Format the response in a tabular format using markdown tables';
                    break;
                case 'summary':
                    formatInstruction = 'Provide an executive summary with clear sections';
                    break;
            }

            // Call LLM API
            const llmResponse = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { 
                            role: "system", 
                            content: `You are a project management assistant analyzing emails. Please analyze the following emails and provide insights based on these requirements:

${insights}

Please format your response following these guidelines:
1. ${formatInstruction}
2. Include a summary of key findings
3. Highlight any action items or follow-ups needed
4. Note any important dates or deadlines
5. Identify any risks or concerns
6. Provide recommendations if applicable

Use markdown formatting for better readability.`
                        },
                        { 
                            role: "user", 
                            content: emailContent 
                        }
                    ]
                })
            });

            const llmData = await llmResponse.json();

            if (llmResponse.ok) {
                const analysisResult = llmData.choices[0].message.content;
                
                // Display the results
                resultsContainer.innerHTML = `
                    <div class="alert alert-success" role="alert">
                        <h4 class="alert-heading">Analysis Complete!</h4>
                        <p>Results for ${userEmail}</p>
                        <hr>
                        <div class="analysis-content">
                            ${marked.parse(analysisResult)}
                        </div>
                    </div>
                `;
            } else {
                throw new Error(llmData.error?.message || 'Error processing analysis');
            }

        } catch (error) {
            console.error('Error:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Error</h4>
                    <p>An error occurred while processing your request. Please try again later.</p>
                    <hr>
                    <p class="mb-0">Error details: ${error.message}</p>
                    <p class="mb-0">Try refreshing the page and authenticating again.</p>
                </div>
            `;
        }
    });
}); 