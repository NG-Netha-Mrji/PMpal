document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    
    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Check authentication status from localStorage
        const authStatus = localStorage.getItem('authStatus');
        const userEmail = localStorage.getItem('userEmail');
        
        if (!authStatus || authStatus !== 'authenticated') {
            // Show error message using Bootstrap alert
            const resultsContainer = document.getElementById('resultsContainer');
            resultsContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Please authenticate your email before using this feature. 
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
                <p class="mt-2">Analyzing content for ${userEmail}...</p>
            </div>
        `;

        // Get form values
        const searchContent = document.getElementById('searchContent').value;
        const insights = document.getElementById('insights').value;
        const outputFormat = document.getElementById('outputFormat').value;

        try {
            // Prepare the prompt based on output format
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

            // Prepare the API request
            const prompt = `
                Search through emails for ${userEmail} with the following criteria:
                Search Keywords: ${searchContent}
                Required Insights: ${insights}
                ${formatInstruction}
            `;

            const response = await fetch('https://api.llmfoundry.com/api/v1/chat/completions', {
                method: 'POST',
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: 'Gemini 2.0 Flash Exp',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an AI assistant helping to analyze emails and provide insights.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const analysisResult = data.choices[0].message.content;

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

        } catch (error) {
            console.error('Error:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Error</h4>
                    <p>An error occurred while processing your request. Please try again later.</p>
                    <hr>
                    <p class="mb-0">Error details: ${error.message}</p>
                </div>
            `;
        }
    });
}); 