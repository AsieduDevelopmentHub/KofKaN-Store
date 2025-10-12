// Authentication functionality for signin/signup
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
        this.setupPasswordToggles();
        this.setupPasswordStrength();
    }

    setupEventListeners() {
        // Signin form
        const signinForm = document.getElementById('signin-form');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }

        // Social signin buttons
        const googleSignin = document.getElementById('google-signin');
        if (googleSignin) {
            googleSignin.addEventListener('click', () => this.handleGoogleSignIn());
        }

        const facebookSignin = document.getElementById('facebook-signin');
        if (facebookSignin) {
            facebookSignin.addEventListener('click', () => this.handleFacebookSignIn());
        }

        // Social signup buttons
        const googleSignup = document.getElementById('google-signup');
        if (googleSignup) {
            googleSignup.addEventListener('click', () => this.handleGoogleSignUp());
        }

        const facebookSignup = document.getElementById('facebook-signup');
        if (facebookSignup) {
            facebookSignup.addEventListener('click', () => this.handleFacebookSignUp());
        }

        // Real-time validation
        this.setupRealTimeValidation();
    }

    setupPasswordToggles() {
        const toggles = document.querySelectorAll('.password-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const button = e.target.closest('.password-toggle');
                const input = button.previousElementSibling;
                const icon = button.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;

        passwordInput.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });
    }

    updatePasswordStrength(password) {
        const strengthBars = document.querySelectorAll('.strength-bar');
        const requirements = {
            length: document.getElementById('req-length'),
            uppercase: document.getElementById('req-uppercase'),
            lowercase: document.getElementById('req-lowercase'),
            number: document.getElementById('req-number'),
            special: document.getElementById('req-special')
        };

        // Reset
        strengthBars.forEach(bar => bar.className = 'strength-bar');
        Object.values(requirements).forEach(req => {
            req.className = req.id.replace('req-', '');
        });

        if (!password) return;

        // Check requirements
        const hasLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        // Update requirement indicators
        if (hasLength) requirements.length.classList.add('valid');
        if (hasUppercase) requirements.uppercase.classList.add('valid');
        if (hasLowercase) requirements.lowercase.classList.add('valid');
        if (hasNumber) requirements.number.classList.add('valid');
        if (hasSpecial) requirements.special.classList.add('valid');

        // Calculate strength
        const requirementsMet = [hasLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
        let strength = 'weak';

        if (requirementsMet >= 4) strength = 'good';
        else if (requirementsMet >= 3) strength = 'fair';
        else if (requirementsMet >= 2) strength = 'weak';

        // Update strength bars
        strengthBars.forEach((bar, index) => {
            if (index < requirementsMet) {
                bar.classList.add(strength);
            }
        });
    }

    setupRealTimeValidation() {
        // Email validation
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', (e) => {
                this.validateEmail(e.target.value, 'email-error');
            });
        }

        // Password confirmation
        const confirmPassword = document.getElementById('confirm_password');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', (e) => {
                this.validatePasswordMatch();
            });
        }

        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }

    async handleSignIn(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('.auth-submit');
        
        // Validate form
        if (!this.validateSignInForm(form)) {
            return;
        }

        // Show loading state
        this.setLoadingState(submitButton, true);

        try {
            const formData = new FormData(form);
            const data = {
                email: formData.get('email'),
                password: formData.get('password'),
                remember_me: formData.get('remember_me') === 'on'
            };

            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.setCurrentUser(result.user, result.token);
                this.showNotification('Successfully signed in!', 'success');
                
                // Redirect to account page
                setTimeout(() => {
                    window.location.href = '../account/index.html';
                }, 1000);
            } else {
                this.showNotification(result.message || 'Sign in failed', 'error');
                this.showError('email', result.message);
            }

        } catch (error) {
            console.error('Sign in error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        } finally {
            this.setLoadingState(submitButton, false);
        }
    }

    async handleSignUp(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('.auth-submit');
        
        // Validate form
        if (!this.validateSignUpForm(form)) {
            return;
        }

        // Show loading state
        this.setLoadingState(submitButton, true);

        try {
            const formData = new FormData(form);
            const data = {
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: formData.get('password'),
                newsletter: formData.get('newsletter') === 'on',
                agree_terms: formData.get('agree_terms') === 'on'
            };

            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Account created successfully! Please check your email for verification.', 'success');
                
                // Redirect to signin page after successful registration
                setTimeout(() => {
                    window.location.href = 'signin.html';
                }, 2000);
            } else {
                this.showNotification(result.message || 'Registration failed', 'error');
                if (result.field) {
                    this.showError(result.field, result.message);
                }
            }

        } catch (error) {
            console.error('Sign up error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        } finally {
            this.setLoadingState(submitButton, false);
        }
    }

    validateSignInForm(form) {
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        let isValid = true;

        this.clearErrors();

        if (!this.validateEmail(email, 'email-error')) {
            isValid = false;
        }

        if (!password) {
            this.showError('password', 'Password is required');
            isValid = false;
        }

        return isValid;
    }

    validateSignUpForm(form) {
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        const confirmPassword = form.querySelector('#confirm_password').value;
        const agreeTerms = form.querySelector('#agree_terms').checked;
        let isValid = true;

        this.clearErrors();

        // Required fields
        const requiredFields = ['first_name', 'last_name', 'email', 'password', 'confirm_password'];
        requiredFields.forEach(field => {
            const input = form.querySelector(`#${field}`);
            if (!input.value.trim()) {
                this.showError(field, `${this.formatFieldName(field)} is required`);
                isValid = false;
            }
        });

        // Email validation
        if (!this.validateEmail(email, 'email-error')) {
            isValid = false;
        }

        // Password strength
        if (password && !this.validatePasswordStrength(password)) {
            this.showError('password', 'Password does not meet requirements');
            isValid = false;
        }

        // Password match
        if (password !== confirmPassword) {
            this.showError('confirm_password', 'Passwords do not match');
            isValid = false;
        }

        // Terms agreement
        if (!agreeTerms) {
            this.showError('terms', 'You must agree to the terms and conditions');
            isValid = false;
        }

        return isValid;
    }

    validateEmail(email, errorId) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError(errorId.replace('-error', ''), 'Please enter a valid email address');
            return false;
        }
        return true;
    }

    validatePasswordStrength(password) {
        const hasLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    }

    validatePasswordMatch() {
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirm_password')?.value;
        const errorElement = document.getElementById('confirm_password-error');

        if (!password || !confirmPassword) return;

        if (password !== confirmPassword) {
            this.showError('confirm_password', 'Passwords do not match');
        } else {
            this.clearError('confirm_password');
        }
    }

    setLoadingState(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}-error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        const inputElement = document.getElementById(field);
        if (inputElement) {
            inputElement.closest('.form-group').classList.add('error');
        }
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field}-error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        const inputElement = document.getElementById(field);
        if (inputElement) {
            inputElement.closest('.form-group').classList.remove('error');
        }
    }

    clearErrors() {
        document.querySelectorAll('.form-error').forEach(error => {
            error.textContent = '';
        });
        
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });
    }

    formatFieldName(field) {
        return field.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    setCurrentUser(user, token) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', token); // Store the token
    }

    checkAuthentication() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            
            // If on auth pages and already authenticated, redirect to account
            if (window.location.pathname.includes('/auth/')) {
                window.location.href = '../account/index.html';
            }
        } else if (!window.location.pathname.includes('/auth/')) {
            // If not on auth pages and not authenticated, redirect to signin
            window.location.href = '../auth/signin.html';
        }
    }

    handleGoogleSignIn() {
        // Google Sign-In implementation would go here
        this.showNotification('Google Sign-In would be implemented here', 'info');
    }

    handleFacebookSignIn() {
        // Facebook Sign-In implementation would go here
        this.showNotification('Facebook Sign-In would be implemented here', 'info');
    }

    handleGoogleSignUp() {
        this.handleGoogleSignIn();
    }

    handleFacebookSignUp() {
        this.handleFacebookSignIn();
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 1rem 2rem;
            border-radius: 8px;
            border-left: 4px solid ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            box-shadow: var(--shadow);
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            border: 1px solid var(--border-color);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize authentication system
const authSystem = new AuthSystem();