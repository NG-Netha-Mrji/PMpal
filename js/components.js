// Theme switching functionality
async function initializeTheme() {
  try {
    const storedTheme = localStorage.getItem("theme");

    const getPreferredTheme = () => {
      if (storedTheme) {
        return storedTheme;
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };

    const setTheme = function (theme) {
      if (
        theme === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        document.documentElement.setAttribute("data-bs-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-bs-theme", theme);
      }
    };

    setTheme(getPreferredTheme());

    // Wait for navbar elements to be fully loaded
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add click handlers to theme buttons
    const themeButtons = document.querySelectorAll("[data-bs-theme-value]");
    if (themeButtons.length === 0) {
      console.warn("Theme buttons not found in the DOM");
      return;
    }

    themeButtons.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const theme = toggle.getAttribute("data-bs-theme-value");
        localStorage.setItem("theme", theme);
        setTheme(theme);
      });
    });
  } catch (error) {
    console.error("Error initializing theme:", error);
  }
}

// update mailbox icon status
const tooltipTriggerList = document.querySelectorAll(
  '[data-bs-toggle="tooltip"]'
);
const tooltipList = [...tooltipTriggerList].map(
  (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
);

console.log("test"); // Ensure this executes

// Update mailbox status
function updateMailboxStatus() {
  const mailboxStatus = document.getElementById("mailboxStatus");

  // Check if mailboxStatus exists
  if (!mailboxStatus) {
    console.error("mailboxStatus element not found");
    return; // Exit the function if the element is not found
  }

  const statusIcon = mailboxStatus.querySelector("i");
  const isAuthenticated = localStorage.getItem("mailboxAuth") === "true";

  console.log("authentication status: " + isAuthenticated);

  if (isAuthenticated) {
    statusIcon.classList.remove("text-danger");
    statusIcon.classList.add("text-bright-success");
    statusIcon.setAttribute("title", "Mailbox authenticated");
  } else {
    statusIcon.classList.remove("text-bright-success");
    statusIcon.classList.add("text-danger");
    statusIcon.setAttribute("title", "Mailbox not authenticated");
  }

  // Refresh tooltip
  const tooltip = bootstrap.Tooltip.getInstance(statusIcon);
  if (tooltip) {
    tooltip.dispose();
  }
  new bootstrap.Tooltip(statusIcon);
}

//  // Initial status check
//  console.log("Executing updateMailboxStatus on page load"); // Added log for debugging
//  updateMailboxStatus(); // Ensure this is called after the navbar is loaded

// Listen for authentication changes
window.addEventListener("storage", (e) => {
  if (e.key === "mailboxAuth") {
    updateMailboxStatus();
  }
});

// DOM Content Loading Event
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Load navbar
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    if (navbarPlaceholder) {
      try {
        const navbarResponse = await fetch("components/navbar.html");
        if (!navbarResponse.ok) {
          throw new Error(`HTTP error! status: ${navbarResponse.status}`);
        }
        const navbarHtml = await navbarResponse.text();
        navbarPlaceholder.innerHTML = navbarHtml;

        // Initialize theme switching after navbar is loaded
        await initializeTheme();
        // call mailbox status from here
        updateMailboxStatus();
      } catch (error) {
        console.error("Error loading navbar:", error);
        navbarPlaceholder.innerHTML =
          '<div class="alert alert-danger">Error loading navigation bar</div>';
      }
    }

    // Load footer
    const footerPlaceholder = document.getElementById("footer-placeholder");
    if (footerPlaceholder) {
      try {
        const footerResponse = await fetch("components/footer.html");
        if (!footerResponse.ok) {
          throw new Error(`HTTP error! status: ${footerResponse.status}`);
        }
        const footerHtml = await footerResponse.text();
        footerPlaceholder.innerHTML = footerHtml;
      } catch (error) {
        console.error("Error loading footer:", error);
        footerPlaceholder.innerHTML =
          '<div class="alert alert-danger">Error loading footer</div>';
      }
    }
  } catch (error) {
    console.error("Error in DOMContentLoaded:", error);
  }
});
