(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const getStoredTheme = () => localStorage.getItem('theme');
        const setStoredTheme = (theme) => localStorage.setItem('theme', theme);

        const getPreferredTheme = () => {
            const storedTheme = getStoredTheme();
            if (storedTheme) {
                return storedTheme;
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };

        const setTheme = (theme) => {
            const htmlElement = document.documentElement;
            if (htmlElement) {
                htmlElement.setAttribute('data-bs-theme', theme);
            }
        };

        const showActiveTheme = (theme, focus = false) => {
            const themeToggleButtons = document.querySelectorAll('[data-bs-theme-value]');
            if (!themeToggleButtons.length) return;

            themeToggleButtons.forEach(button => {
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
            });

            const activeButton = document.querySelector(`[data-bs-theme-value="${theme}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
                activeButton.setAttribute('aria-pressed', 'true');
                if (focus) {
                    activeButton.focus();
                }
            }
        };

        // Set initial theme
        setTheme(getPreferredTheme());

        // Add event listeners only if elements exist
        const themeToggleButtons = document.querySelectorAll('[data-bs-theme-value]');
        if (themeToggleButtons.length) {
            themeToggleButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const theme = button.getAttribute('data-bs-theme-value');
                    if (theme) {
                        setStoredTheme(theme);
                        setTheme(theme);
                        showActiveTheme(theme, true);
                    }
                });
            });
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const storedTheme = getStoredTheme();
            if (!storedTheme) {
                setTheme(getPreferredTheme());
            }
        });

        // Show active theme after DOM is fully loaded
        window.addEventListener('load', () => {
            showActiveTheme(getPreferredTheme());
        });
    });
})(); 