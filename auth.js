document.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById('emailDisplay');
    const emailPassword = document.getElementById('emailPassword');
    const authenticateBtn = document.getElementById('authenticateBtn');
    const clearAuthBtn = document.getElementById('clearAuthBtn');
    const authStatus = document.getElementById('authStatus');
    const spinner = authenticateBtn.querySelector('.spinner-border');

    // Predefined credentials (in a real app, this should be handled securely)
    const validCredentials = [
        { email: 'user@example.com', password: 'password123' },
        { email: 'admin@example.com', password: 'admin123' }
    ];

    // Check if already authenticated
    const checkAuthStatus = () => {
        const isAuthenticated = localStorage.getItem('emailAuth');
        const userEmail = localStorage.getItem('userEmail');
        
        if (isAuthenticated && userEmail) {
            emailDisplay.value = userEmail;
            authStatus.textContent = 'Authenticated';
            authStatus.className = 'badge status-badge bg-success';
            emailDisplay.disabled = true;
            emailPassword.disabled = true;
            authenticateBtn.disabled = true;
        } else {
            emailDisplay.value = '';
            emailDisplay.disabled = false;
            authStatus.textContent = 'Not Authenticated';
            authStatus.className = 'badge status-badge bg-danger';
        }
    };

    // Initial status check
    checkAuthStatus();

    // Handle authentication
    authenticateBtn.addEventListener('click', async () => {
        const email = emailDisplay.value.trim();
        const password = emailPassword.value;

        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }

        // Show loading state
        spinner.classList.remove('d-none');
        authenticateBtn.disabled = true;

        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check credentials
            const isValid = validCredentials.some(cred => 
                cred.email === email && cred.password === password
            );

            if (isValid) {
                // Store authentication status
                localStorage.setItem('emailAuth', 'true');
                localStorage.setItem('userEmail', email);
                
                // Update UI
                authStatus.textContent = 'Authenticated';
                authStatus.className = 'badge status-badge bg-success';
                emailPassword.disabled = true;
                emailDisplay.disabled = true;
                
                showToast('Authentication successful!');
            } else {
                throw new Error('Invalid email or password');
            }
        } catch (error) {
            showToast(error.message, true);
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
            emailDisplay.value = '';
            emailDisplay.disabled = false;
            emailPassword.value = '';
            emailPassword.disabled = false;
            authenticateBtn.disabled = false;
            checkAuthStatus();
            showToast('Authentication cleared');
        }
    });

    // Toast notification function
    const showToast = (message, isError = false) => {
        const toastDiv = document.createElement('div');
        toastDiv.className = `toast align-items-center border-0 ${isError ? 'text-bg-danger' : 'text-bg-success'} position-fixed top-0 end-0 m-3`;
        toastDiv.setAttribute('role', 'alert');
        toastDiv.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        document.body.appendChild(toastDiv);
        const toast = new bootstrap.Toast(toastDiv);
        toast.show();
        setTimeout(() => toastDiv.remove(), 3000);
    };
}); 