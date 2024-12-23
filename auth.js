document.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById('emailDisplay');
    const otpInput = document.getElementById('otpInput');
    const requestOtpBtn = document.getElementById('requestOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const clearAuthBtn = document.getElementById('clearAuthBtn');
    const authStatus = document.getElementById('authStatus');
    const otpSpinner = document.querySelector('.spinner-border');

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
        
        if (isAuthenticated && userEmail) {
            emailDisplay.value = userEmail;
            authStatus.textContent = 'Authenticated';
            authStatus.className = 'badge status-badge bg-success';
            emailDisplay.disabled = true;
            otpInput.disabled = true;
            requestOtpBtn.disabled = true;
            verifyOtpBtn.disabled = true;
        } else {
            emailDisplay.value = '';
            emailDisplay.disabled = false;
            otpInput.disabled = false;
            requestOtpBtn.disabled = false;
            authStatus.textContent = 'Not Authenticated';
            authStatus.className = 'badge status-badge bg-danger';
        }
    };

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