// Theme switching functionality
async function initializeTheme() {
    try {
        const storedTheme = localStorage.getItem('theme');
        
        const getPreferredTheme = () => {
            if (storedTheme) {
                return storedTheme;
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };

        const setTheme = function(theme) {
            if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-bs-theme', theme);
            }
        };

        setTheme(getPreferredTheme());

        // Wait for navbar elements to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        // Add click handlers to theme buttons
        const themeButtons = document.querySelectorAll('[data-bs-theme-value]');
        if (themeButtons.length === 0) {
            console.warn('Theme buttons not found in the DOM');
            return;
        }

        themeButtons.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const theme = toggle.getAttribute('data-bs-theme-value');
                localStorage.setItem('theme', theme);
                setTheme(theme);
            });
        });
    } catch (error) {
        console.error('Error initializing theme:', error);
    }
}

// DOM Content Loading Event
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Load navbar
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            try {
                const navbarResponse = await fetch('components/navbar.html');
                if (!navbarResponse.ok) {
                    throw new Error(`HTTP error! status: ${navbarResponse.status}`);
                }
                const navbarHtml = await navbarResponse.text();
                navbarPlaceholder.innerHTML = navbarHtml;

                // Initialize theme switching after navbar is loaded
                await initializeTheme();
            } catch (error) {
                console.error('Error loading navbar:', error);
                navbarPlaceholder.innerHTML = '<div class="alert alert-danger">Error loading navigation bar</div>';
            }
        }

        // Load footer
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            try {
                const footerResponse = await fetch('components/footer.html');
                if (!footerResponse.ok) {
                    throw new Error(`HTTP error! status: ${footerResponse.status}`);
                }
                const footerHtml = await footerResponse.text();
                footerPlaceholder.innerHTML = footerHtml;
            } catch (error) {
                console.error('Error loading footer:', error);
                footerPlaceholder.innerHTML = '<div class="alert alert-danger">Error loading footer</div>';
            }
        }
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
    }
});