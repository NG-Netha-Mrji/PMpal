document.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById('emailDisplay');
    const otpInput = document.getElementById('otpInput');
    const requestOtpBtn = document.getElementById('requestOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const clearAuthBtn = document.getElementById('clearAuthBtn');
    const authStatus = document.getElementById('authStatus');
    const otpSpinner = document.querySelector('.spinner-border');
    const mailboxAuthBtn = document.getElementById('mailboxAuthBtn');

    // Store OTP and its expiration time
    let currentOTP = null;
    let otpExpiration = null;
    const OTP_VALIDITY_MINUTES = 2;

    // EmailJS configuration
    const EMAIL_SERVICE_ID = 'service_nhs5vl5';
    const EMAIL_TEMPLATE_ID = 'template_bcz5qpp';
    const EMAIL_PUBLIC_KEY = '8_WLGJHvcU42CAPVF';

    // Check authentication status
    const checkAuthStatus = () => {
        const isAuthenticated = localStorage.getItem('emailAuth');
        const userEmail = localStorage.getItem('userEmail');
        const mailboxAuth = localStorage.getItem('mailboxAuth');
        
        if (isAuthenticated && userEmail) {
            emailDisplay.value = userEmail;
            if (mailboxAuth === 'true') {
                authStatus.textContent = 'Mailbox Authenticated';
                authStatus.className = 'badge status-badge bg-success';
                mailboxAuthBtn.disabled = false;
                mailboxAuthBtn.classList.remove('d-none');
            } else {
                authStatus.textContent = 'Email Verified';
                authStatus.className = 'badge status-badge bg-warning';
                mailboxAuthBtn.disabled = false;
                mailboxAuthBtn.classList.remove('d-none');
            }
            emailDisplay.disabled = true;
            otpInput.disabled = true;
            requestOtpBtn.disabled = true;
            verifyOtpBtn.disabled = true;
        } else {
            emailDisplay.value = '';
            emailDisplay.disabled = false;
            otpInput.disabled = false;
            requestOtpBtn.disabled = false;
            mailboxAuthBtn.classList.add('d-none');
            authStatus.textContent = 'Not Authenticated';
            authStatus.className = 'badge status-badge bg-danger';
        }
    };

    // Mailbox Authentication
    mailboxAuthBtn.addEventListener('click', async () => {
        const email = emailDisplay.value;
        
        try {
            mailboxAuthBtn.disabled = true;
            otpSpinner.classList.remove('d-none');

            // Open OAuth popup window for email provider
            const authWindow = window.open(
                `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=YOUR_CLIENT_ID` +
                `&redirect_uri=${encodeURIComponent(window.location.origin + '/oauth-callback')}` +
                `&response_type=code` +
                `&scope=https://mail.google.com/` +
                `&access_type=offline` +
                `&prompt=consent` +
                `&login_hint=${encodeURIComponent(email)}`,
                'Email Authorization',
                'width=600,height=700'
            );

            // Handle OAuth callback
            window.addEventListener('message', async (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'oauth-callback') {
                    const { code } = event.data;
                    
                    // Exchange authorization code for access token
                    const tokenResponse = await fetch('/api/exchange-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ code })
                    });

                    if (tokenResponse.ok) {
                        const { access_token, refresh_token } = await tokenResponse.json();
                        
                        // Store tokens securely
                        localStorage.setItem('mailboxAuth', 'true');
                        localStorage.setItem('accessToken', access_token);
                        localStorage.setItem('refreshToken', refresh_token);
                        
                        showToast('Mailbox authentication successful!');
                        checkAuthStatus();
                    } else {
                        throw new Error('Failed to authenticate mailbox');
                    }
                }
            });

        } catch (error) {
            console.error('Mailbox authentication failed:', error);
            showToast('Failed to authenticate mailbox. Please try again.', true);
        } finally {
            otpSpinner.classList.add('d-none');
            mailboxAuthBtn.disabled = false;
        }
    });

    // Generate a 6-digit OTP
    const generateOTP = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Request OTP
    requestOtpBtn.addEventListener('click', async () => {
        const email = emailDisplay.value.trim();
        
        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            showToast('Please enter a valid email address', true);
            return;
        }

        otpSpinner.classList.remove('d-none');
        requestOtpBtn.disabled = true;

        try {
            // Generate new OTP and set expiration
            currentOTP = generateOTP();
            otpExpiration = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60000);

            // Send OTP via EmailJS
            const emailParams = {
                to_email: email,
                otp_code: currentOTP,
                validity_minutes: OTP_VALIDITY_MINUTES,
                to_name: email.split('@')[0] // Use part before @ as name
            };

            await emailjs.send(
                EMAIL_SERVICE_ID,
                EMAIL_TEMPLATE_ID,
                emailParams,
                EMAIL_PUBLIC_KEY
            );
            
            showToast(`OTP sent to ${email}. Valid for ${OTP_VALIDITY_MINUTES} minutes.`);
            otpInput.disabled = false;
            verifyOtpBtn.disabled = false;
            
            // Start OTP timer
            startOTPTimer();
        } catch (error) {
            console.error('Failed to send OTP:', error);
            showToast('Failed to send OTP. Please try again.', true);
        } finally {
            otpSpinner.classList.add('d-none');
            requestOtpBtn.disabled = false;
        }
    });

    // Verify OTP
    verifyOtpBtn.addEventListener('click', async () => {
        const enteredOTP = otpInput.value.trim();
        
        if (!enteredOTP) {
            showToast('Please enter the OTP', true);
            return;
        }

        if (!currentOTP || !otpExpiration || Date.now() > otpExpiration) {
            showToast('OTP has expired. Please request a new one.', true);
            return;
        }

        verifyOtpBtn.disabled = true;
        otpSpinner.classList.remove('d-none');

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (enteredOTP === currentOTP) {
                localStorage.setItem('emailAuth', 'true');
                localStorage.setItem('userEmail', emailDisplay.value);
                showToast('Authentication successful!');
                checkAuthStatus();
            } else {
                throw new Error('Invalid OTP');
            }
        } catch (error) {
            showToast(error.message, true);
        } finally {
            otpSpinner.classList.add('d-none');
            verifyOtpBtn.disabled = false;
        }
    });

    // Clear authentication
    clearAuthBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear authentication?')) {
            localStorage.removeItem('emailAuth');
            localStorage.removeItem('userEmail');
            emailDisplay.value = '';
            otpInput.value = '';
            currentOTP = null;
            otpExpiration = null;
            checkAuthStatus();
            showToast('Authentication cleared');
        }
    });

    // Start OTP timer
    const startOTPTimer = () => {
        const timerDisplay = document.getElementById('otpTimer');
        
        const updateTimer = () => {
            if (!otpExpiration) return;
            
            const now = Date.now();
            const timeLeft = otpExpiration - now;
            
            if (timeLeft <= 0) {
                timerDisplay.textContent = 'OTP Expired';
                currentOTP = null;
                otpExpiration = null;
                verifyOtpBtn.disabled = true;
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            timerDisplay.textContent = `OTP expires in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            requestAnimationFrame(updateTimer);
        };
        
        updateTimer();
    };

    // Toast notification
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

    // Initial status check
    checkAuthStatus();
}); 