document.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById('emailDisplay');
    const emailPassword = document.getElementById('emailPassword');
    const authenticateBtn = document.getElementById('authenticateBtn');
    const clearAuthBtn = document.getElementById('clearAuthBtn');
    const authStatus = document.getElementById('authStatus');
    const spinner = authenticateBtn.querySelector('.spinner-border');

    // Check if already authenticated
    const checkAuthStatus = () => {
        const isAuthenticated = localStorage.getItem('emailAuth');
        const userEmail = localStorage.getItem('userEmail');
        
        if (isAuthenticated && userEmail) {
            emailDisplay.value = userEmail;
            authStatus.textContent = 'Authenticated';
            authStatus.className = 'badge status-badge bg-success';
            emailPassword.disabled = true;
            authenticateBtn.disabled = true;
        } else {
            // For demo, you might want to get this from your actual auth system
            emailDisplay.value = 'user@example.com';
            authStatus.textContent = 'Not Authenticated';
            authStatus.className = 'badge status-badge bg-danger';
        }
    };

    // Initial status check
    checkAuthStatus();

    // Handle authentication
    authenticateBtn.addEventListener('click', async () => {
        const password = emailPassword.value;
        if (!password) {
            alert('Please enter your password');
            return;
        }

        // Show loading state
        spinner.classList.remove('d-none');
        authenticateBtn.disabled = true;

        try {
            // Replace with your actual authentication endpoint
            const response = await fetch('your-auth-endpoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailDisplay.value,
                    password: password
                })
            });

            if (response.ok) {
                // Store authentication status
                localStorage.setItem('emailAuth', 'true');
                localStorage.setItem('userEmail', emailDisplay.value);
                
                // Update UI
                authStatus.textContent = 'Authenticated';
                authStatus.className = 'badge status-badge bg-success';
                emailPassword.disabled = true;
                
                // You might want to store a secure token here instead
                // localStorage.setItem('authToken', response.token);
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            alert('Authentication failed: ' + error.message);
            authStatus.textContent = 'Authentication Failed';
            authStatus.className = 'badge status-badge bg-danger';
        } finally {
            spinner.classList.add('d-none');
            authenticateBtn.disabled = false;
        }
    });

    // Handle clearing authentication
    clearAuthBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear authentication?')) {
            localStorage.removeItem('emailAuth');
            localStorage.removeItem('userEmail');
            emailPassword.value = '';
            emailPassword.disabled = false;
            authenticateBtn.disabled = false;
            checkAuthStatus();
        }
    });
}); 