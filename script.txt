// require('dotenv').config();

// // Access the variables
// const CLIENT_ID = process.env.CLIENT_ID;
// const API_KEY = process.env.API_KEY;

/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID =
  "829456065207-jnnpcecoq2o274thl5evirdhjrcd0bvc.apps.googleusercontent.com";
const API_KEY = "AIzaSyCJLudxOUQr-rjD35guoMLOf4j2Hm2lDaU";

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = [
  "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES =
  "https://www.googleapis.com/auth/gmail.readonly " +
  "https://www.googleapis.com/auth/gmail.send " +
  "https://www.googleapis.com/auth/gmail.modify " +
  "https://www.googleapis.com/auth/calendar.events " +
  "https://www.googleapis.com/auth/drive.file " +
  "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById("authorize_button").style.visibility = "hidden";
document.getElementById("signout_button").style.visibility = "hidden";

// Constants for DOM sections and components
const FORM_SECTIONS = [
  "email-form",
  "email-actions",
  "calendar-form",
  "drive-section",
  "labels-section",
];

const EMAIL_COMPONENTS = [
  "to",
  "subject",
  "email-content",
  "send-email-button",
  "attachment",
];

const VALID_COMMANDS = [
  "send email",
  "create event",
  "read emails",
  "upload file",
  "list files",
  "check labels",
];

// Helper functions for DOM manipulation
function setElementVisibility(elementId, isVisible) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.visibility = isVisible ? "visible" : "hidden";
  }
}

function setElementDisplay(elementId, show) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = show ? "block" : "none";
  }
}

function toggleSectionVisibility(sectionId, show) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList[show ? "remove" : "add"]("d-none");
  }
}

function resetTaskInput() {
  const taskInput = document.getElementById("task-input");
  taskInput.value = "";
  setElementDisplay("task-input", true);
  setElementDisplay('button[onclick="processTask()"]', true);
}

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
  gapi.load("client", initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOC,
  });
  gapiInited = true;
  maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "", // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById("authorize_button").style.visibility = "visible";
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
  /**
   * Callback for handling the response after attempting to obtain an access token.
   * @param {object} resp - The response object from the token request.
   * @throws Throws the response object if there is an error.
   */
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }

    setElementVisibility("signout_button", true);
    setElementVisibility("authorize_button", false);

    // Hide all sections first
    FORM_SECTIONS.forEach((id) => toggleSectionVisibility(id, false));

    // Show email form
    toggleSectionVisibility("email-form", true);

    // Reset task input
    resetTaskInput();

    // Hide all email components
    EMAIL_COMPONENTS.forEach((id) => setElementDisplay(id, false));

    // List labels after authentication
    await listLabels();
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    tokenClient.requestAccessToken({ prompt: "" });
  }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken("");
    document.getElementById("content").innerText = "";
    document.getElementById("authorize_button").innerText = "Authorize";
    document.getElementById("signout_button").style.visibility = "hidden";
  }
}

/**
 * Add a helper function for API calls
 */
async function makeGoogleApiRequest(endpoint, options = {}) {
  const token = gapi.client.getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  return fetch(`https://www.googleapis.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    ...options,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return response.json();
  });
}

/**
 * Helper function to display JSON response
 */
function displayJsonResponse(jsonData, operation) {
  const contentElement = document.getElementById("content");
  let jsonOutput = document.getElementById("json-output");

  if (!jsonOutput) {
    jsonOutput = document.createElement("div");
    jsonOutput.id = "json-output";
    jsonOutput.className = "mt-3 p-3";
    contentElement.appendChild(jsonOutput);
  }

  jsonOutput.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h4 class="mb-0">JSON Response for ${operation}</h4>
      </div>
      <div class="card-body">
        <pre class="bg-dark text-light p-3 rounded mb-0"><code>${JSON.stringify(
    jsonData,
    null,
    2
  )}</code></pre>
      </div>
    </div>
  `;
}

/**
 * Print all Labels in the authorized user's inbox with their message counts.
 */
async function listLabels() {
  try {
    const response = await gapi.client.gmail.users.labels.list({
      userId: "me",
    });

    const labels = response.result.labels;
    const labelsList = document.getElementById("labels-list");
    labelsList.innerHTML = "<h4>Gmail Labels</h4>";

    // Create a list of promises for fetching message counts
    const countPromises = labels.map(async (label) => {
      try {
        const messagesResponse = await gapi.client.gmail.users.labels.get({
          userId: "me",
          id: label.id,
        });
        return {
          name: label.name,
          messagesTotal: messagesResponse.result.messagesTotal || 0,
        };
      } catch (err) {
        console.error(`Error fetching count for ${label.name}:`, err);
        return {
          name: label.name,
          messagesTotal: 0,
        };
      }
    });

    // Wait for all counts to be fetched
    const labelCounts = await Promise.all(countPromises);

    // Sort labels alphabetically
    labelCounts.sort((a, b) => a.name.localeCompare(b.name));

    // Display labels with their counts
    labelsList.innerHTML += labelCounts
      .map((label) => `${label.name}: ${label.messagesTotal} messages<br>`)
      .join("");

    document.querySelector('button[onclick="processTask()"]').style.display =
      "block"; // Show the execute task button

    displayJsonResponse(
      {
        status: "success",
        labels: labelCounts,
      },
      "List Labels"
    );
  } catch (err) {
    console.error("Error listing labels:", err);
    alert("Error listing labels: " + err.message);
    displayJsonResponse(
      { status: "error", error: err.message },
      "List Labels Error"
    );
  }
}

/**
 * Send an email using the Gmail API
 */
async function sendEmail() {
  const sendButton = document.getElementById("send-email-button");
  const normalText = sendButton.querySelector(".normal-text");
  const spinner = sendButton.querySelector(".spinner");

  // Show spinner
  normalText.classList.add("d-none");
  spinner.classList.remove("d-none");
  sendButton.disabled = true;

  try {
    const to = document.getElementById("to").value;
    const subject = document.getElementById("subject").value;
    const content = document.getElementById("email-content").value;
    const fileInput = document.getElementById("attachment");

    let emailData = {
      to: to,
      subject: subject,
      message: content,
      attachments: [],
    };

    let attachments = [];
    if (fileInput.files.length > 0) {
      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        const base64Data = await readFileAsBase64(file);
        attachments.push({
          filename: file.name,
          mimeType: file.type,
          data: base64Data,
        });
      }
      emailData.attachments = attachments;
    }

    const email = createEmail(to, subject, content, attachments);
    const response = await gapi.client.gmail.users.messages.send({
      userId: "me",
      resource: {
        raw: email,
      },
    });

    const responseData = {
      status: "success",
      messageId: response.result.id,
      threadId: response.result.threadId,
      labelIds: response.result.labelIds,
      timestamp: new Date().toISOString(),
      emailData: emailData,
    };

    document.getElementById("content").innerHTML = "Email sent successfully!";
    displayJsonResponse(responseData, "Send Email");
  } catch (err) {
    document.getElementById("content").innerHTML =
      "Error sending email: " + err.message;
    displayJsonResponse(
      { status: "error", error: err.message },
      "Send Email Error"
    );
  } finally {
    // Hide spinner
    normalText.classList.remove("d-none");
    spinner.classList.add("d-none");
    sendButton.disabled = false;
  }
}

/**
 * Read and display latest emails
 */
async function readLatestEmails() {
  const readButton = document.getElementById("read-emails-button");
  if (!readButton) return; // Check if readButton exists
  const normalText = readButton.querySelector(".normal-text");
  const spinner = readButton.querySelector(".spinner");

  // Show spinner
  normalText.classList.add("d-none");
  spinner.classList.remove("d-none");
  readButton.disabled = true;

  try {
    const response = await gapi.client.gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
    });

    const messages = response.result.messages;
    let emailsData = [];

    for (const message of messages) {
      const email = await gapi.client.gmail.users.messages.get({
        userId: "me",
        id: message.id,
      });

      const headers = email.result.payload.headers;
      const subject = headers.find(
        (header) => header.name === "Subject"
      )?.value;
      const from = headers.find((header) => header.name === "From")?.value;
      const date = headers.find((header) => header.name === "Date")?.value;

      emailsData.push({
        id: message.id,
        threadId: message.threadId,
        subject: subject,
        from: from,
        date: date,
        snippet: email.result.snippet,
      });
    }

    // Display emails in HTML
    let output = "<h3>Latest Emails</h3>";
    emailsData.forEach((email) => {
      output += `
        <div class="email-item">
          <p><strong>From:</strong> ${email.from}</p>
          <p><strong>Subject:</strong> ${email.subject}</p>
          <p><strong>Date:</strong> ${email.date}</p>
          <p><strong>Snippet:</strong> ${email.snippet}</p>
          <hr>
        </div>
      `;
    });
    document.getElementById("content").innerHTML = output;

    // Display JSON response
    displayJsonResponse(
      {
        status: "success",
        totalEmails: emailsData.length,
        emails: emailsData,
      },
      "Read Latest Emails"
    );
  } catch (err) {
    document.getElementById("content").innerHTML =
      "Error reading emails: " + err.message;
    displayJsonResponse(
      { status: "error", error: err.message },
      "Read Emails Error"
    );
  } finally {
    // Hide spinner
    normalText.classList.remove("d-none");
    spinner.classList.add("d-none");
    readButton.disabled = false;
  }
}

/**
 * Create a calendar event and send invites
 */
async function createCalendarEvent() {
  const createButton = document.querySelector("#calendar-form button");
  const normalText = createButton.querySelector(".normal-text");
  const spinner = createButton.querySelector(".spinner");

  // Show spinner
  normalText.classList.add("d-none");
  spinner.classList.remove("d-none");
  createButton.disabled = true;

  try {
    const summary = document.getElementById("event-title").value;
    const description = document.getElementById("event-description").value;
    const startTime = document.getElementById("event-start").value;
    const endTime = document.getElementById("event-end").value;
    const attendees = document
      .getElementById("event-attendees")
      .value.split(",")
      .map((email) => ({ email: email.trim() }));

    const createGmeet = document.getElementById("create-gmeet").checked; // Check if the checkbox is checked
    const event = {
      summary: summary,
      description: description,
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: attendees,
      conferenceData: createGmeet ? { // Include conference data if checkbox is checked
        createRequest: {
          requestId: "some-random-string", // Unique ID for the request
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      } : undefined, // Only include if checkbox is checked
    };

    const response = await gapi.client.calendar.events.insert({
      calendarId: "primary",
      resource: event,
      sendUpdates: "all",
      conferenceDataVersion: 1, // Required to create a Google Meet link
    });

    const responseData = {
      status: "success",
      eventId: response.result.id,
      htmlLink: response.result.htmlLink,
      created: response.result.created,
      creator: response.result.creator,
      eventDetails: {
        summary: summary,
        description: description,
        startTime: startTime,
        endTime: endTime,
        attendees: attendees,
      },
    };

    document.getElementById("content").innerHTML =
      "Event created successfully!";
    displayJsonResponse(responseData, "Create Calendar Event");
  } catch (err) {
    document.getElementById("content").innerHTML =
      "Error creating event: " + err.message;
    displayJsonResponse(
      { status: "error", error: err.message },
      "Create Event Error"
    );
  } finally {
    // Hide spinner
    normalText.classList.remove("d-none");
    spinner.classList.add("d-none");
    createButton.disabled = false;
  }
}

/**
 * List files from Google Drive
 */
async function listDriveFiles() {
  console.log("listDriveFiles called"); // Check if the function is called
  const listButton = document.getElementById("list-drive-files-button");
  if (!listButton) {
    console.error("List button not found");
    return; // Check if listButton exists
  }

  const normalText = listButton.querySelector(".normal-text");
  const spinner = listButton.querySelector(".spinner");

  // Show spinner
  if (normalText) normalText.classList.add("d-none");
  if (spinner) spinner.classList.remove("d-none");
  listButton.disabled = true;

  try {
    const response = await gapi.client.drive.files.list({
      pageSize: 10,
      fields: "files(id, name, mimeType, webViewLink, createdTime)",
      orderBy: "createdTime desc",
    });

    console.log("Drive API response:", response); // Log the response

    const files = response.result.files;
    if (!files || files.length === 0) {
      document.getElementById("drive-list").innerHTML = "No files found.";
      return;
    }

    const output = files
      .map(
        (file) => `
      <div class="file-item">
        <strong>${file.name}</strong><br>
        Type: ${file.mimeType}<br>
        Created: ${new Date(file.createdTime).toLocaleDateString()}<br>
        <a href="${file.webViewLink}" target="_blank">View</a>
      </div>
    `
      )
      .join("");

    document.getElementById(
      "drive-list"
    ).innerHTML = `<div class="file-list">${output}</div>`;

    // Reset task input and show form
    toggleSectionVisibility("email-form", true);
    resetTaskInput();

    displayJsonResponse(
      {
        status: "success",
        totalFiles: files.length,
        files: files,
      },
      "List Drive Files"
    );
  } catch (err) {
    console.error("Error listing Drive files:", err);
    alert("Error listing files: " + err.message);
    displayJsonResponse(
      { status: "error", error: err.message },
      "List Drive Files Error"
    );
  } finally {
    // Hide spinner
    if (normalText) normalText.classList.remove("d-none");
    if (spinner) spinner.classList.add("d-none");
    listButton.disabled = false;
  }
}

/**
 * Upload a file to Google Drive
 */
async function uploadToDrive() {
  const uploadButton = document.getElementById("upload-to-drive-button");
  if (!uploadButton) return; // Check if uploadButton exists

  const normalText = uploadButton.querySelector(".normal-text");
  const spinner = uploadButton.querySelector(".spinner");

  // Show spinner
  if (normalText) normalText.classList.add("d-none");
  if (spinner) spinner.classList.remove("d-none");
  uploadButton.disabled = true;

  const fileInput = document.getElementById("drive-file");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file to upload");
    return;
  }

  try {
    // First, create a metadata object
    const metadata = {
      name: file.name,
      mimeType: file.type,
    };

    // Create a form data object
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    // Get the access token
    const token = gapi.client.getToken().access_token;

    // Upload the file using fetch
    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    const result = await response.json();

    if (result.id) {
      alert("File uploaded successfully!");
      fileInput.value = "";
      // Refresh the file list
      await listDriveFiles();
      displayJsonResponse(
        {
          status: "success",
          fileId: result.id,
          fileName: result.name,
          mimeType: result.mimeType,
        },
        "Upload to Drive"
      );
    } else {
      throw new Error("Upload failed");
    }
  } catch (err) {
    console.error("Error uploading to Drive:", err);
    alert("Error uploading file: " + err.message);
    displayJsonResponse(
      { status: "error", error: err.message },
      "Upload to Drive Error"
    );
  } finally {
    // Restore button state
    if (normalText) normalText.classList.remove("d-none");
    if (spinner) spinner.classList.add("d-none");
    uploadButton.disabled = false;
  }
}

/**
 * Hide all form sections
 */
function hideAllForms() {
  document.getElementById("email-form").style.visibility = "hidden";
  document.getElementById("email-actions").style.visibility = "hidden";
  document.getElementById("calendar-form").style.visibility = "hidden";
  document.getElementById("drive-section").style.visibility = "hidden";
}

/**
 * Process task using LLM
 * @param {string} taskInput - User's natural language input
 * @returns {Promise<object>} - Processed task result
 */
async function processTaskWithLLM(taskInput) {
  const systemPrompt = `You are a task processing assistant for a Gmail API application.
Your role is to:
1. Analyze the user's natural language input
2. Determine which action they want to perform (email, calendar, drive, labels, or read)
3. Extract all relevant information from the input

For READ requests (when user asks about email contents, checking mail, etc):
- Return ONLY "read" action with filter criteria
- DO NOT include any other sections or data
- Example response for read request:
{
  "action": "read",
  "isValid": true,
  "sections": ["email-actions"],
  "data": {
    "filter": {
      "from": "sender@email.com",
      "sortOrder": "descending",
      "limit": 1
    }
  }
}

For other actions (email, calendar, drive, labels):
Return a JSON response with the following structure:
{
  "action": "email|calendar|drive|labels",
  "isValid": boolean,
  "sections": ["email-form", "calendar-form", "drive-section", "labels-section"],
  "data": {
    "to": "email address if provided",
    "subject": "auto-generated subject based on context",
    "message": "auto-generated message based on context",
    "eventDetails": {
      "title": "event title - always generate for calendar",
      "description": "detailed event description",
      "date": "event date in YYYY-MM-DD format",
      "time": "event time in HH:mm format",
      "duration": "event duration in minutes",
      "attendees": "comma-separated list of attendees"
    }
  }
}

For each action type:
- Email: Generate professional subject and message if not provided
- Calendar: Always include title, description, date, time, and duration
- Drive: Suggest meaningful file and folder names
- Labels: Suggest appropriate label names and colors

Use the current time (${new Date().toISOString()}) to suggest appropriate dates and times.
Always generate complete, professional content for any missing information.

Only return valid JSON, no other text.`;

  try {
    const response = await fetch(
      "https://llmfoundry.straive.com/openai/v1/chat/completions",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: taskInput },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API Error:", response.status, errorText);
      if (response.status === 401) {
        alert("Please sign in to use the task processing feature.");
        return { isValid: false, action: null, sections: [], data: {} };
      }
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Raw LLM response:", result);

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error("Invalid LLM response format:", result);
      throw new Error("Invalid response from LLM API");
    }

    const parsedContent = JSON.parse(result.choices[0].message.content);
    console.log("Parsed LLM content:", parsedContent);
    return parsedContent;
  } catch (error) {
    console.error("Error processing task with LLM:", error);
    return { isValid: false, action: null, sections: [], data: {} };
  }
}

/**
 * Process natural language task input
 */
async function processTask() {
  const taskInput = document.getElementById("task-input").value;
  const executeButton = document.getElementById("execute-task-btn");
  const normalText = executeButton.querySelector(".normal-text");
  const spinner = executeButton.querySelector(".spinner");
  const taskSpinner = document.getElementById("task-spinner");

  if (!taskInput.trim()) {
    alert("Please enter a task");
    return;
  }

  // Show spinner
  normalText.classList.add("d-none");
  spinner.classList.remove("d-none");
  executeButton.disabled = true;
  taskSpinner.classList.remove("d-none");

  try {
    console.log("Processing task:", taskInput);
    const result = await processTaskWithLLM(taskInput);
    console.log("Processed result:", result);

    if (!result.isValid) {
      if (result.action === null) {
        alert(
          "Could not connect to the task processing service. Please try again."
        );
      } else {
        alert(
          "Could not understand the task. Please try rephrasing your request."
        );
      }
      return;
    }

    // Show relevant sections based on LLM response
    result.sections.forEach((section) => {
      toggleSectionVisibility(section, true);

      // Handle listing Drive files
      if (section === "drive-section") {
        console.log("Calling listDriveFiles function");
        listDriveFiles(); // Call the function to list Drive files
      }

      // Handle email form
      if (section === "email-form") {
        EMAIL_COMPONENTS.forEach((id) => setElementDisplay(id, true));
        if (result.data) {
          if (result.data.to)
            document.getElementById("to").value = result.data.to;
          if (result.data.subject)
            document.getElementById("subject").value = result.data.subject;
          if (result.data.message)
            document.getElementById("email-content").value =
              result.data.message;
        }
      }

      // Handle calendar form
      if (section === "calendar-form" && result.data?.eventDetails) {
        const { title, description, date, time, duration, attendees } =
          result.data.eventDetails;
        if (title) document.getElementById("event-title").value = title;
        if (description)
          document.getElementById("event-description").value = description;
        if (date && time) {
          const startDateTime = `${date}T${time}`;
          document.getElementById("event-start").value = startDateTime;
          // Calculate end time based on duration or default to 1 hour
          const durationMs = (duration || 60) * 60 * 1000;
          const endDateTime = new Date(
            new Date(startDateTime).getTime() + durationMs
          );
          document.getElementById("event-end").value = endDateTime
            .toISOString()
            .slice(0, 16);
        }
        if (attendees)
          document.getElementById("event-attendees").value = attendees;
      }

      // Handle email reading
      if (section === "email-actions" && result.data?.filter) {
        toggleSectionVisibility("email-actions", true);
        // Automatically trigger email reading with the filter
        readEmailsWithFilter(result.data.filter);
      }

      // Handle drive section
      if (section === "drive-section" && result.data?.driveDetails) {
        // Future implementation for drive auto-fill
      }

      // Handle labels section
      if (section === "labels-section" && result.data?.labelDetails) {
        // Future implementation for labels auto-fill
      }
    });
  } catch (error) {
    console.error("Error in processTask:", error);
    alert("An error occurred while processing your request. Please try again.");
  } finally {
    // Hide spinner and restore button
    normalText.classList.remove("d-none");
    spinner.classList.add("d-none");
    executeButton.disabled = false;
    taskSpinner.classList.add("d-none");
  }
}

/**
 * Read emails with specific filter criteria
 */
async function readEmailsWithFilter(filter) {
  const readButton = document.getElementById("read-emails-button");
  const normalText = readButton.querySelector(".normal-text");
  const spinner = readButton.querySelector(".spinner");

  if (normalText && spinner) {
    // Show spinner
    normalText.classList.add("d-none");
    spinner.classList.remove("d-none");
  }

  readButton.disabled = true;

  try {
    const query = [];
    if (filter.from) query.push(`from:${filter.from}`);
    // Add other filter criteria as needed

    const response = await gapi.client.gmail.users.messages.list({
      userId: "me",
      q: query.join(" "),
      maxResults: filter.limit || 10,
    });

    const messages = response.result.messages || [];
    const emailList = document.getElementById("email-list");
    emailList.innerHTML = ""; // Clear previous results

    for (const message of messages) {
      const emailData = await gapi.client.gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      const headers = emailData.result.payload.headers;
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "(no subject)";
      const from = headers.find((h) => h.name === "From")?.value || "";
      const date = new Date(
        parseInt(emailData.result.internalDate)
      ).toLocaleString();

      const emailDiv = document.createElement("div");
      emailDiv.className = "card mb-3";
      emailDiv.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${subject}</h5>
          <h6 class="card-subtitle mb-2 text-muted">From: ${from}</h6>
          <p class="card-text">Date: ${date}</p>
          <p class="card-text">${getEmailBody(emailData.result.payload)}</p>
        </div>
      `;
      emailList.appendChild(emailDiv);
    }
  } catch (error) {
    console.error("Error reading emails:", error);
    document.getElementById("email-list").innerHTML =
      '<div class="alert alert-danger">Error reading emails. Please try again.</div>';
  } finally {
    // Hide spinner
    if (normalText && spinner) {
      normalText.classList.remove("d-none");
      spinner.classList.add("d-none");
    }
    readButton.disabled = false;
  }
}

const filterButton = document.getElementById("filter-emails-button");
if (filterButton) {
  filterButton.addEventListener('click', () => readEmailsWithFilter('your-filter')); // Replace 'your-filter' with actual filter criteria
}

/**
 * Extract email body from payload
 */
function getEmailBody(payload) {
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain") {
        return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }
    return getEmailBody(payload.parts[0]);
  }
  if (payload.body.data) {
    return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }
  return "No content available";
}

/**
 * Helper function to read file as base64
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create email with optional attachments
 */
function createEmail(to, subject, message, attachments = []) {
  const boundary = "boundary_" + Math.random().toString(36).substring(2);
  const mimeType = "multipart/mixed; boundary=" + boundary;

  let email = [
    "Content-Type: " + mimeType + "\r\n",
    "MIME-Version: 1.0\r\n",
    "to: " + to + "\r\n",
    "subject: " + subject + "\r\n\r\n",

    "--" + boundary + "\r\n",
    "Content-Type: text/plain; charset=UTF-8\r\n",
    "Content-Transfer-Encoding: 7bit\r\n\r\n",

    message + "\r\n\r\n",
  ];

  // Add attachments if any
  attachments.forEach((attachment) => {
    email = email.concat([
      "--" + boundary + "\r\n",
      "Content-Type: " + attachment.mimeType + "\r\n",
      "Content-Transfer-Encoding: base64\r\n",
      "Content-Disposition: attachment; filename=" +
      attachment.filename +
      "\r\n\r\n",

      attachment.data + "\r\n",
    ]);
  });

  email.push("--" + boundary + "--");

  // Convert the email to base64 format
  return btoa(email.join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Read emails with specific filter criteria
 */
async function readEmailsWithFilter(filter) {
  try {
    const response = await gapi.client.gmail.users.messages.list({
      userId: "me",
      q: filter.query,
      maxResults: filter.limit || 10,
    });

    const messages = response.result.messages;
    const emailList = document.getElementById("email-list");
    emailList.innerHTML = ""; // Clear previous results

    for (const message of messages) {
      const emailData = await gapi.client.gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      const headers = emailData.result.payload.headers;
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "(no subject)";
      const from = headers.find((h) => h.name === "From")?.value || "";
      const date = new Date(
        parseInt(emailData.result.internalDate)
      ).toLocaleString();

      const emailDiv = document.createElement("div");
      emailDiv.className = "card mb-3";
      emailDiv.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${subject}</h5>
          <h6 class="card-subtitle mb-2 text-muted">From: ${from}</h6>
          <p class="card-text">Date: ${date}</p>
          <p class="card-text">${getEmailBody(emailData.result.payload)}</p>
        </div>
      `;
      emailList.appendChild(emailDiv);
    }
  } catch (error) {
    console.error("Error reading emails:", error);
    document.getElementById("email-list").innerHTML =
      '<div class="alert alert-danger">Error reading emails. Please try again.</div>';
  } finally {
    // Hide spinner
    const readButton = document.getElementById("read-emails-button");
    const normalText = readButton.querySelector(".normal-text");
    const spinner = readButton.querySelector(".spinner");
    if (normalText && spinner) {
      normalText.classList.remove("d-none");
      spinner.classList.add("d-none");
    }
    readButton.disabled = false;
  }
}
