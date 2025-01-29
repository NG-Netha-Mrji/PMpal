document.addEventListener("DOMContentLoaded", function () {
  // Parse search content into Gmail query format
  function parseSearchContent(searchContent) {
    console.log("Original search content:", searchContent);
    const searchTerms = searchContent.split(/\s+/);
    //console.log('Split search terms:', searchTerms);

    let formattedQuery = [];

    searchTerms.forEach((term) => {
      //console.log('Processing term:', term);

      // Check for explicit Gmail operators
      if (
        term.toLowerCase().startsWith("from:") ||
        term.toLowerCase().startsWith("to:") ||
        term.toLowerCase().startsWith("subject:") ||
        term.toLowerCase().startsWith("label:") ||
        term.toLowerCase().startsWith("after:") ||
        term.toLowerCase().startsWith("before:") ||
        term.toLowerCase().startsWith("has:")
      ) {
        //console.log('Found Gmail operator:', term);
        formattedQuery.push(term);
      }
      // Check for email addresses without operators
      else if (term.includes("@")) {
        //console.log('Found email address, adding from: operator:', term);
        formattedQuery.push(`from:${term}`);
      }
      // Check for date patterns (YYYY/MM/DD or YYYY-MM-DD)
      else if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(term)) {
        //console.log('Found date pattern, adding after: operator:', term);
        formattedQuery.push(`after:${term}`);
      }
      // Regular search terms
      else {
        // If term contains spaces or special characters, wrap in quotes
        if (/[\s"']/.test(term)) {
          // console.log('Found term with spaces/special chars, adding quotes:', term);
          formattedQuery.push(`"${term.replace(/"/g, "")}"`);
        } else {
          // console.log('Adding regular search term:', term);
          formattedQuery.push(term);
        }
      }
    });

    const finalQuery = formattedQuery.join(" ");
    console.log("Final formatted query:", finalQuery);
    return finalQuery;
  }

  // Initialize Google API Client
  async function initializeGoogleAPI() {
    try {
      return new Promise((resolve, reject) => {
        gapi.load("client:auth2", async () => {
          try {
            await gapi.client.init({
              clientId:
                "746662336433-f8v8vpepmjp22mlvgutl0o4gno44h5kn.apps.googleusercontent.com",
              scope:
                "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels email profile",
              plugin_name: "PM Pal",
            });

            const authInstance = gapi.auth2.getAuthInstance();
            // Check if user is signed in
            if (!authInstance.isSignedIn.get()) {
              await authInstance.signIn(); // Prompt user to sign in
            }

            const currentUser = authInstance.currentUser.get();
            const profile = currentUser.getBasicProfile();
            const authResponse = currentUser.getAuthResponse();

            localStorage.setItem("accessToken", authResponse.access_token);
            localStorage.setItem("userEmail", profile.getEmail());

            await gapi.client.load("gmail", "v1");
            console.log("Gmail API initialized successfully");
            resolve();
          } catch (error) {
            console.error("Error in API initialization:", error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error("Error loading Gmail API:", error);
      throw error;
    }
  }

  // Reset tabs and content on page load
  function resetResults() {
    const resultTabs = document.getElementById("resultTabs");
    const resultsContainer = document.getElementById("resultsContainer");
    const emailsContainer = document.getElementById("emailsContainer");
    const copyButtonContainer = document.getElementById("copyButtonContainer");

    resultTabs.classList.add("d-none");
    copyButtonContainer.style.display = "none";
    resultsContainer.innerHTML =
      '<p class="text-muted text-center">Email insights will appear here...</p>';
    document.getElementById("emailsList").innerHTML =
      '<p class="text-muted text-center">Email contents will appear here...</p>';
    document.getElementById("searchQueryDisplay").textContent = "";
  }

  // Call reset on page load
  resetResults();

  // Handle form submission
  const searchForm = document.getElementById("searchForm");
  if (!searchForm) {
    console.error("Search form not found");
    return;
  }

  searchForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    resetResults();

    try {
      // Show loading spinner
      resultsContainer.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border" role="status"></div>
                    <p class="mt-2">Initializing Gmail API...</p>
                </div>
            `;

      // Initialize Gmail API and get fresh token
      await initializeGoogleAPI();
      const accessToken = localStorage.getItem("accessToken");
      const userEmail = localStorage.getItem("userEmail");

      console.log("Token: " + accessToken);
      console.log("user email: " + userEmail);

      if (!accessToken || !userEmail) {
        throw new Error("Not authenticated. Please sign in again.");
      }

      // Set authorization header with fresh token
      gapi.client.setToken({ access_token: accessToken });

      // Update loading message
      resultsContainer.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border" role="status"></div>
                    <p class="mt-2">Analyzing emails for ${userEmail}...</p>
                </div>
            `;

      // Get and parse search content
      const rawSearchContent = document
        .getElementById("searchContent")
        .value.trim();
      console.log("Starting search with content:", rawSearchContent);
      const searchQuery = parseSearchContent(rawSearchContent);
      console.log("Gmail API search query:", searchQuery);

      // Get form values
      const insights = document.getElementById("insights").value.trim();
      const outputFormat = document.getElementById("outputFormat").value;

      if (!searchQuery) {
        throw new Error("Please enter search content");
      }

      // Fetch and process emails
      let emailsWithContent = [];
      let pageToken = null;

      console.log("fetching emails from mailbox");

      while (emailsWithContent.length < 10) {
        const emailsResponse = await gapi.client.gmail.users.messages.list({
          userId: "me",
          q: searchQuery,
          maxResults: 20,
          pageToken: pageToken,
        });

        if (!emailsResponse.result.messages) {
          break;
        }

        console.log("Filtering fetched emails");

        const emailDetailsPromises = emailsResponse.result.messages.map(
          (email) =>
            gapi.client.gmail.users.messages.get({
              userId: "me",
              id: email.id,
              format: "full",
            })
        );

        const emailDetails = await Promise.all(emailDetailsPromises);

        for (const detail of emailDetails) {
          if (emailsWithContent.length >= 10) break;

          const email = detail.result;
          const body = decodeEmailBody(email.payload);

          console.log("Processing email:", {
            id: email.id,
            subject: email.payload.headers.find((h) => h.name === "Subject")
              ?.value,
            bodyLength: body.length,
          });

          if (body) {
            emailsWithContent.push({
              ...email,
              decodedBody: body, // Store decoded body to avoid reprocessing
            });
          }
        }

        pageToken = emailsResponse.result.nextPageToken;
        if (!pageToken) break;
      }

      // Sort emails by date in descending order
      emailsWithContent.sort((a, b) => {
        const dateA = new Date(
          a.payload.headers.find((h) => h.name === "Date")?.value || 0
        );
        const dateB = new Date(
          b.payload.headers.find((h) => h.name === "Date")?.value || 0
        );
        return dateB - dateA; // Descending order
      });

      if (emailsWithContent.length === 0) {
        throw new Error(
          "No emails found with content matching your search criteria"
        );
      }

      // Display emails in the emails tab
      const emailsList = document.getElementById("emailsList");
      const searchQueryDisplay = document.getElementById("searchQueryDisplay");

      // Show the query used
      searchQueryDisplay.textContent = searchQuery;

      // Format and display sorted emails
      emailsList.innerHTML = emailsWithContent
        .map((email, index) => {
          const headers = email.payload.headers;
          const subject =
            headers.find((h) => h.name === "Subject")?.value || "No Subject";
          const from =
            headers.find((h) => h.name === "From")?.value || "Unknown Sender";
          const date =
            headers.find((h) => h.name === "Date")?.value || "No Date";
          const formattedDate = new Date(date).toLocaleString();

          return `
                    <div class="email-item card mb-3">
                        <div class="card-header">
                            <strong>Email ${index + 1}</strong>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${subject}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">From: ${from}</h6>
                            <h6 class="card-subtitle mb-2 text-muted">Date: ${formattedDate}</h6>
                            <pre class="card-text mt-3">${
                              email.decodedBody
                            }</pre>
                        </div>
                    </div>
                `;
        })
        .join("");

      // Show tabs after successful analysis
      document.getElementById("resultTabs").classList.remove("d-none");

      // Process emails for analysis
      let analysisResult = "";
      let emailsContent = "";

      // Format emails for LLM analysis
      emailsContent = emailsWithContent
        .map((email) => {
          const headers = email.payload.headers;
          const subject =
            headers.find((h) => h.name === "Subject")?.value || "No Subject";
          const from =
            headers.find((h) => h.name === "From")?.value || "Unknown Sender";
          const date =
            headers.find((h) => h.name === "Date")?.value || "No Date";
          const formattedDate = new Date(date).toLocaleString();

          // Truncate and clean email body
          const body = email.decodedBody || "";
          const truncatedBody =
            body.length > 1500
              ? body.substring(0, 1500) + "...(truncated)"
              : body;

          return `
Email ${emailsWithContent.indexOf(email) + 1}:
Subject: ${subject}
From: ${from}
Date: ${formattedDate}
---
${truncatedBody}
-------------------`;
        })
        .join("\n\n");

      // Call LLM API with proper formatting and error handling
      try {
        console.log(
          "Sending content to LLM API:",
          emailsContent.length,
          "characters"
        );

        const llmResponse = await fetch(
          "https://llmfoundry.straive.com/openai/v1/chat/completions",
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are a project management assistant analyzing emails. Please analyze the following emails and provide insights based on these requirements:

${insights || "Provide a comprehensive analysis of the email content"}

Please format your response following these guidelines:
1. ${
                    outputFormat === "keypoints"
                      ? "Format the response as key points with clear headings"
                      : outputFormat === "table"
                      ? "Format the response in a tabular format using markdown tables"
                      : "Provide an executive summary with clear sections"
                  }
2. Include a summary of key findings
3. Highlight any action items or follow-ups needed
4. Note any important dates or deadlines
5. Identify any risks or concerns
6. Provide recommendations if applicable

Use markdown formatting for better readability.`,
                },
                {
                  role: "user",
                  content: emailsContent.substring(0, 15000), // Limit content length
                },
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          }
        );

        if (!llmResponse.ok) {
          const errorData = await llmResponse.json().catch(() => ({}));
          console.error("LLM API Error:", llmResponse.status, errorData);
          throw new Error(
            `API Error: ${llmResponse.status} - ${
              errorData.error || "Unknown error"
            }`
          );
        }

        const llmData = await llmResponse.json();
        analysisResult = llmData.choices[0].message.content;

        // Display results
        resultsContainer.innerHTML = `
                    <div class="alert alert-success" role="alert">
                        <h4 class="alert-heading">Here is the Gist</h4>
                        <h5 class="alert-heading">Search query</h5>
                        <p>${searchQuery}</p>
                        <hr>
                        <div class="analysis-content">
                            ${marked.parse(analysisResult)}
                        </div>
                    </div>
                `;
      } catch (error) {
        console.error("Analysis error:", error);
        resultsContainer.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <h4 class="alert-heading">Analysis Error</h4>
                        <p>${error.message}</p>
                        <hr>
                        <p class="mb-0">Please try again with fewer emails or contact support if the problem persists.</p>
                    </div>
                `;
      }

      // Show and setup copy button
      copyButtonContainer.style.display = "flex";
      document.getElementById("copyButton").onclick = async () => {
        try {
          const activeTab = document.querySelector(".tab-pane.active");
          let contentToCopy = "";

          if (activeTab.id === "analysisContent") {
            contentToCopy = analysisResult;
          } else if (activeTab.id === "emailsContent") {
            contentToCopy = emailsContent;
          }

          await navigator.clipboard.writeText(contentToCopy);
          const copyButton = document.getElementById("copyButton");
          const originalHTML = copyButton.innerHTML;
          copyButton.innerHTML = '<i class="bi bi-check2"></i> Copied!';
          copyButton.classList.add("btn-success");
          copyButton.classList.remove("btn-outline-primary");

          setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.classList.remove("btn-success");
            copyButton.classList.add("btn-outline-primary");
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text:", err);
          alert("Failed to copy to clipboard");
        }
      };
    } catch (error) {
      console.error("Error:", error);
      resetResults();
      resultsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Error</h4>
                    <p>An error occurred while processing your request: ${error.message}</p>
                    <hr>
                    <p class="mb-0">Try refreshing the page and authenticating again.</p>
                </div>
            `;
    }
  });

  // Function to decode email body
  function decodeEmailBody(payload) {
    let body = "";

    // Function to decode base64 content
    function decodeBase64(encoded) {
      try {
        return atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
      } catch (error) {
        console.error("Base64 decoding error:", error);
        return "";
      }
    }

    // Function to recursively find text content
    function findTextContent(part) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }

      if (part.mimeType === "text/html" && part.body?.data && !body) {
        // Only use HTML if we haven't found plain text
        const htmlContent = decodeBase64(part.body.data);
        // Strip HTML tags for plain text
        return htmlContent.replace(/<[^>]*>/g, "");
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          const content = findTextContent(subPart);
          if (content) return content;
        }
      }
      return "";
    }

    // Check for simple body first
    if (payload.body?.data) {
      body = decodeBase64(payload.body.data);
    }
    // If no simple body, check parts recursively
    else if (payload.parts) {
      body = findTextContent(payload);
    }

    return body.trim();
  }
});
