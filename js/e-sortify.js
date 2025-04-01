// *** fix email count as it seems to be fetching everything under the label chosen

// 1. Fetch only the first thread of the email (also filter only email with active content exlcuding meetings, chats, system emails, etc.)
// ** apply "for refence" label if the recipient is not in the "to address" field
// 2. recursive loop through the LLM API and apply the labels appropriately
// 3. Tweak the prompt to ensure that actions are identified for the recepient only

var email_index = 0;
const resultsContainer = document.getElementById("resultsContainer");

// var email = emailsWithContent[email_index]; // Access the specific email based on email_index

let headers = "";
let subject = "";
let from = "";
let to = "";
let cc = ""; // Get the "CC" field, defaulting to "No CC" if not found
let date = "";
let formattedDate = "";

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

  // fetch labels and populate the drop-down
  async function fetchLabels() {
    try {
      const response = await gapi.client.gmail.users.labels.list({
        userId: "me",
      });

      const labels = (response.result.labels || []).filter(
        (label) =>
          !label.id.startsWith("CATEGORY_") &&
          !["SENT", "DRAFT", "SPAM", "TRASH", "CHAT"].includes(label.name)
      );
      const fetchLabelsSelect = document.getElementById("fetch_labels");

      // Clear existing options
      fetchLabelsSelect.innerHTML = "";

      // Add the first 5 labels to the dropdown
      labels.slice(0, 100).forEach((label) => {
        const option = document.createElement("option");
        option.value = label.name;
        option.textContent = label.name;
        fetchLabelsSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching labels:", error);
      resultsContainer.innerHTML =
        '<p class="text-muted text-center">Error Fetching labels. Please refresh the page...</p>';
    }
  }

  // Initialize Google API Client
  async function initializeGoogleAPI() {
    try {
      const SCOPES =
        "https://www.googleapis.com/auth/gmail.readonly " +
        "https://www.googleapis.com/auth/gmail.send " +
        "https://www.googleapis.com/auth/gmail.modify " +
        "https://www.googleapis.com/auth/calendar.events " +
        "https://www.googleapis.com/auth/drive.file " +
        "https://www.googleapis.com/auth/drive.readonly";

      return new Promise((resolve, reject) => {
        gapi.load("client:auth2", async () => {
          try {
            await gapi.client.init({
              clientId:
                "746662336433-f8v8vpepmjp22mlvgutl0o4gno44h5kn.apps.googleusercontent.com",
              scope: SCOPES,
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

            // Show loading spinner

            resultsContainer.innerHTML = `
                  <div class="text-center">
                  <div class="spinner-border" role="status"></div>
                    <p class="mt-2">Fetching labels...</p>
                  </div>
                  `;
            // resultsContainer.innerHTML =
            //   '<p class="text-muted text-center">Fetching labels...</p><div class="spinner-border" role="status"></div>';

            // Fetch labels after authentication
            await fetchLabels();
            // Update results container after loading labels
            resultsContainer.innerHTML =
              '<p class="text-muted text-center">Details of Organized Email will appear here...</p>';
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
    //const resultsContainer = document.getElementById("resultsContainer");
    const emailsContainer = document.getElementById("emailsContainer");
    const copyButtonContainer = document.getElementById("copyButtonContainer");

    resultTabs.classList.add("d-none");
    copyButtonContainer.style.display = "none";
    resultsContainer.innerHTML =
      '<p class="text-muted text-center">Details of Organized Email will appear here...</p>';
    document.getElementById("emailsList").innerHTML =
      '<p class="text-muted text-center">Email contents will appear here...</p>';
    //document.getElementById("searchQueryDisplay").textContent = "";
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
      // resultsContainer.innerHTML = `
      //           <div class="text-center">
      //               <div class="spinner-border" role="status"></div>
      //               <p class="mt-2">Initializing Gmail API...</p>
      //           </div>
      //       `;

      // Initialize Gmail API and get fresh token
      //await initializeGoogleAPI();
      const accessToken = localStorage.getItem("accessToken");
      const userEmail = localStorage.getItem("userEmail");

      // console.log("Token: " + accessToken);
      // console.log("user email: " + userEmail);

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

      // Get the selected label and email count at the time of submission
      const selectedLabel = document.getElementById("fetch_labels").value; // Get the selected label from the dropdown
      const email_count_value = document.getElementById("email_count").value; // Get the selected email_count from the dropdown

      if (!selectedLabel) {
        throw new Error("Please select a label to fetch emails."); // Throw an error if no label is selected
      }

      // Fetch and process emails
      let emailsWithContent = [];
      let pageToken = null;

      // Create the "!Repository" label if it does not exist
      const createLabelIfNotExists = async () => {
        const existingLabels = await gapi.client.gmail.users.labels.list({
          userId: "me",
        });
        const labelExists = existingLabels.result.labels.some(
          (label) => label.name === "!Repository"
        );

        if (!labelExists) {
          await gapi.client.gmail.users.labels.create({
            userId: "me",
            resource: {
              name: "!Repository",
              labelListVisibility: "labelShow",
              messageListVisibility: "show",
            },
          });
        }
      };

      await createLabelIfNotExists(); // Ensure the label exists

      console.log(
        "fetching emails from mailbox for the selected label: " + selectedLabel
      );

      while (emailsWithContent.length < email_count_value) {
        const emailsResponse = await gapi.client.gmail.users.messages.list({
          userId: "me",
          q: `label:${selectedLabel}`,
          maxResults: email_count_value + 10,
          pageToken: pageToken,
        });

        if (!emailsResponse.result.messages) {
          break;
        }

        console.log("Filtering fetched emails");

        const emailDetailsPromises = emailsResponse.result.messages.map(
          async (email) => {
            const emailDetail = await gapi.client.gmail.users.messages.get({
              userId: "me",
              id: email.id,
              format: "full",
            });

            const body = decodeEmailBody(emailDetail.result.payload);
            const isMeetingInvitation = emailDetail.result.payload.headers.some(
              (header) =>
                header.name === "Content-Type" &&
                header.value.includes("text/calendar/Invitation")
            );

            //console.log("raw body: ", emailDetail.result.payload);
            console.log("Is meeting?: ", isMeetingInvitation);

            // Apply "!Repository" label if no content or is a meeting invitation
            if (!body || isMeetingInvitation) {
              await gapi.client.gmail.users.messages.modify({
                userId: "me",
                id: email.id,
                resource: {
                  addLabelIds: ["!Repository"],
                },
              });
              return null; // Skip adding to emailsWithContent
            }

            return emailDetail.result; // Return the email detail if it has content
          }
        ); // end of emailDetailsPromises()

        const emailDetails = await Promise.all(emailDetailsPromises);
        const filteredEmailDetails = emailDetails.filter(
          (detail) => detail !== null
        ); // Filter out null values
        // console.log("email details:", filteredEmailDetails); // Log the filtered emailDetails array

        // If you want to log specific attributes of each email detail
        filteredEmailDetails.forEach((detail, index) => {
          const email2 = detail;
          //console.log("email: " + detail);
          const body = decodeEmailBody(email2.payload);
          let email_index = index;

          console.log(`Email ${index + 1} detail:`, email2); // Log each email detail
          // Access specific properties if needed, for example:
          if (detail && detail.payload) {
            console.log(`Payload for Email ${index + 1}:`, body);
          }

          //for (const detail of filteredEmailDetails)  {

          console.log("Processing email:", {
            id: email2.id,
            subject: email2.payload.headers.find((h) => h.name === "Subject")
              ?.value,
            bodyLength: body.length,
          });

          if (body) {
            console.log("pushing email with content:\n " + body);
            emailsWithContent.push({
              ...email2,
              decodedBody: body, // Store decoded body to avoid reprocessing
            });
          }
        }); // end for (const detail of emailDetails)

        pageToken = emailsResponse.result.nextPageToken;
        if (!pageToken) break;
      } // end of while loop for populating emails with conent into the array

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
      //const searchQueryDisplay = document.getElementById("searchQueryDisplay");

      // Show the query used
      //searchQueryDisplay.textContent = searchQuery;

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

      // Ensure email_index is within bounds of emailsWithContent
      if (email_index >= 0 && email_index < emailsWithContent.length) {
        const email = emailsWithContent[email_index]; // Access the specific email based on email_index
        emailsContent = (() => {
          const headers = email.payload.headers;
          const subject =
            headers.find((h) => h.name === "Subject")?.value || "No Subject";
          const from =
            headers.find((h) => h.name === "From")?.value || "Unknown Sender";
          const to =
            headers.find((h) => h.name === "To")?.value || "No Recipient"; // Get the "To" field, defaulting to "No Recipient" if not found
          const cc = headers.find((h) => h.name === "Cc")?.value || "No CC"; // Get the "CC" field, defaulting to "No CC" if not found
          const date =
            headers.find((h) => h.name === "Date")?.value || "No Date";
          const formattedDate = new Date(date).toLocaleString();

          // Truncate and clean email body
          const body = email.decodedBody || "";

          //console.log("email body decoded: " + body);

          const truncatedBody =
            body.length > 1500
              ? body.substring(0, 1500) + "...(truncated)"
              : body;

          //              Email ${email_index + 1}:
          return `
                  Subject: ${subject}
                  From: ${from}
                  To: ${to}
                  CC: ${cc}
                  Date: ${formattedDate}
                  ---
                  ${truncatedBody}
                  -------------------`;
        })();
      } else {
        console.error("Invalid email index:", email_index); // Log an error if the index is out of bounds
      }

      console.log("emails content: " + emailsContent);

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
                  content: `Analyze the content of an email following the detailed steps provided to determine the appropriate labels and provide justification for your choice.

1. **Read the Email**: Thoroughly examine the email to understand its content, tone, and the involvement of the ${userEmail}.
2. **Determine the Tone**: Assess whether the email has a negative tone or expresses dissatisfaction, which may indicate potential escalation.
3. **Check Recipients**: Verify if ${userEmail} is present in the 'cc' field; apply the label "for reference" if it is not and do not assess other conditions.
4. **Identify the Type of Action**: Decide whether the email necessitates a response, an action, or is purely informational.
5. **Assign Labels**: Assign suitable labels based on your analysis, using the provided conditions.
6. **Justify Your Choice**: Offer a concise justification for the selected label(s).

## Labels

- "potential escalation": Use if the email indicates escalation or contains a negative tone.
- "for reference": if the email should be stored for future reference but no immediate action is needed for ${userEmail} or if the ${userEmail} is in the 'Cc' field.
- "to respond": Assign if the email requires a response, even a simple acknowledgment.
- "for action": Use when specific action is necessary only if ${userEmail} in the 'To' field.
- "less important": Apply when no other label conditions are met.

# Output Format

Provide the analysis in this JSON format:

{
  "label": "string",
  "justification": "string"
}


# Examples

**Example 1**

- **Email Content**: Email indicates dissatisfaction, asks for urgent follow-up, with ${userEmail} in 'To'.
- **Output**:

  {
    "label": "potential escalation;to respond;for action",
    "justification": "Email expresses dissatisfaction and requests urgent action, necessitating both response and resolution."
  }


**Example 2**

- **Email Content**: Email demands an acknowledgment with no additional action, ${userEmail} in 'To'.
- **Output**:
 
  {
    "label": "to respond",
    "justification": "Email requires a response but no further action."
  }
 

**Example 3**

- **Email Content**: No significant action required, with ${userEmail} in 'To' or 'Cc'.
- **Output**:
  {
    "label": "less important",
    "justification": "Email does not require a response or resolution."
  }
  

**Example 4**

- **Email Content**: Update email sent to a group, where ${userEmail} is only CC'd.
- **Output**:

  {
    "label": "for reference",
    "justification": "Email is an informational update for reference as recipient is not directly addressed."
  }


# Notes

- Use semicolons (;) when combining "to respond," "for action," and "potential escalation."
- Justifications can exceed word limits if greater clarity is needed.`,
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
        //analysisResult = `Subject: ${subject}\nFrom: ${from}\nDate: ${formattedDate}\n\n${llmData.choices[0].message.content}`;

        analysisResult = `Subject: ${subject}\nFrom: ${from}\nDate: ${formattedDate}\n\n${llmData.choices[0].message.content}`;
        // Display results
        resultsContainer.innerHTML = `
                    <div class="alert alert-success" role="alert">
                        <h4 class="alert-heading">Here is the Gist</h4>
                        <h5 class="alert-heading">Search query</h5>
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
                    <p class="mb-0">Try refreshing the page or authenticating again in case of authentication issues.</p>
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
      console.log("Checking part:", part); // Log the part being checked
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }

      if (part.mimeType === "text/html" && part.body?.data && !body) {
        const htmlContent = decodeBase64(part.body.data);
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

    if (payload.body?.data) {
      body = decodeBase64(payload.body.data);
    } else if (payload.parts) {
      body = findTextContent(payload);
    }

    //console.log("Decoded body:", body); // Log the final decoded body
    return body.trim();
  }
  resultsContainer.innerHTML = `
  <div class="text-center">
      <div class="spinner-border" role="status"></div>
      <p class="mt-2">Initializing Gmail API...</p>
  </div>
`;
  // Initialize Google API on page load
  try {
    initializeGoogleAPI(); // Await the initialization to handle any potential errors
  } catch (error) {
    console.error("Error initializing Gmail API:", error); // Log the error for debugging
    resultsContainer.innerHTML = `
          <div class="alert alert-danger" role="alert">
              <h4 class="alert-heading">Initialization Error</h4>
              <p>An error occurred while initializing the Gmail API: ${error.message}</p>
              <hr>
              <p class="mb-0">Please refresh the page or try again later.</p>
          </div>
      `; // Display an error message to the user
  }
});
