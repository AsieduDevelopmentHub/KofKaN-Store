// Checkout page functionality
class CheckoutPage {
    constructor() {
        this.currentStep = 1;
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.orderData = {
            contact: {},
            shipping: {},
            payment: {},
            items: [],
            summary: {}
        };
        this.promoCode = null;
        this.promoDiscount = 0;
        this.init();
    }

    init() {
        this.loadOrderSummary();
        this.setupEventListeners();
        this.setupFormValidation();
        this.updateCartCount();
        
        // Generate bank reference
        this.generateBankReference();
    }

    loadOrderSummary() {
        const orderItemsPreview = document.getElementById('order-items-preview');
        const reviewItems = document.getElementById('review-items');
        
        if (this.cart.length === 0) {
            window.location.href = '../cart/index.html';
            return;
        }

        // Update order data
        this.orderData.items = [...this.cart];
        
        // Load items in sidebar
        orderItemsPreview.innerHTML = this.cart.map(item => this.createOrderItemHTML(item)).join('');
        
        // Load items in review section
        if (reviewItems) {
            reviewItems.innerHTML = this.cart.map(item => this.createReviewItemHTML(item)).join('');
        }

        this.updateOrderSummary();
    }

    createOrderItemHTML(item) {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        
        return `
            <div class="preview-item">
                <img src="${item.image}" alt="${item.name}" 
                     onerror="this.src='../images/products/default.jpg'">
                <div class="preview-item-info">
                    <div class="preview-item-title">${item.name}</div>
                    <div class="preview-item-details">
                        <span>Qty: ${item.quantity}</span>
                        <span>GH₵ ${itemTotal}</span>
                    </div>
                </div>
            </div>
        `;
    }

    createReviewItemHTML(item) {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        
        return `
            <div class="review-item">
                <img src="${item.image}" alt="${item.name}" 
                     onerror="this.src='../images/products/default.jpg'">
                <div class="review-item-info">
                    <div class="review-item-title">${item.name}</div>
                    <div class="review-item-details">
                        <span>Quantity: ${item.quantity}</span>
                        <span>GH₵ ${itemTotal}</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateOrderSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = this.calculateShipping();
        const tax = this.calculateTax(subtotal);
        const discount = this.calculateDiscount(subtotal);
        const total = subtotal + shipping + tax - discount;

        // Update sidebar summary
        document.getElementById('summary-subtotal').textContent = `GH₵ ${subtotal.toFixed(2)}`;
        document.getElementById('summary-shipping').textContent = `GH₵ ${shipping.toFixed(2)}`;
        document.getElementById('summary-tax').textContent = `GH₵ ${tax.toFixed(2)}`;
        document.getElementById('summary-discount').textContent = `- GH₵ ${discount.toFixed(2)}`;
        document.getElementById('summary-total').textContent = `GH₵ ${total.toFixed(2)}`;

        // Update order data
        this.orderData.summary = {
            subtotal,
            shipping,
            tax,
            discount,
            total
        };
    }

    calculateShipping() {
        const shippingMethod = document.querySelector('input[name="shipping_method"]:checked');
        if (!shippingMethod) return 0;

        return shippingMethod.value === 'express' ? 30 : 15;
    }

    calculateTax(subtotal) {
        // Ghana VAT rate is 12.5%
        return subtotal * 0.125;
    }

    calculateDiscount(subtotal) {
        if (!this.promoCode) return 0;

        const promoCodes = {
            'WELCOME10': 0.1,
            'TECH20': 0.2,
            'GHANA25': 0.25
        };

        const discountRate = promoCodes[this.promoCode] || 0;
        return subtotal * discountRate;
    }

    setupEventListeners() {
        // Step navigation
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextStep = parseInt(e.target.closest('.next-step').dataset.next);
                this.goToStep(nextStep);
            });
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prevStep = parseInt(e.target.closest('.prev-step').dataset.prev);
                this.goToStep(prevStep);
            });
        });

        // Edit section buttons
        document.querySelectorAll('.edit-section').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = parseInt(e.target.dataset.section);
                this.goToStep(section);
            });
        });

        // Shipping method change
        document.querySelectorAll('input[name="shipping_method"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateOrderSummary();
            });
        });

        // Payment method change
        document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.showPaymentDetails(e.target.value);
            });
        });

        // Promo code apply
        const applyPromoBtn = document.getElementById('apply-checkout-promo');
        if (applyPromoBtn) {
            applyPromoBtn.addEventListener('click', () => {
                this.applyPromoCode();
            });
        }

        // Promo code enter key
        const promoInput = document.getElementById('checkout-promo');
        if (promoInput) {
            promoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyPromoCode();
                }
            });
        }

        // Form submission
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.placeOrder();
            });
        }

        // Real-time form updates for review section
        this.setupRealTimeUpdates();
    }

    setupRealTimeUpdates() {
        // Contact information updates
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');

        if (emailInput) {
            emailInput.addEventListener('input', () => {
                this.updateReviewSection();
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                this.updateReviewSection();
            });
        }

        // Shipping information updates
        const shippingInputs = ['first_name', 'last_name', 'address', 'city', 'region', 'postal_code', 'landmark'];
        shippingInputs.forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateReviewSection();
                });
            }
        });
    }

    updateReviewSection() {
        // Update contact information
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        
        if (email || phone) {
            document.getElementById('review-contact').innerHTML = `
                <div><strong>Email:</strong> ${email}</div>
                <div><strong>Phone:</strong> ${phone}</div>
            `;
        }

        // Update shipping information
        const firstName = document.getElementById('first_name').value;
        const lastName = document.getElementById('last_name').value;
        const address = document.getElementById('address').value;
        const city = document.getElementById('city').value;
        const region = document.getElementById('region').value;
        const postalCode = document.getElementById('postal_code').value;
        const landmark = document.getElementById('landmark').value;

        if (firstName || lastName || address) {
            let shippingHTML = `
                <div><strong>Name:</strong> ${firstName} ${lastName}</div>
                <div><strong>Address:</strong> ${address}</div>
            `;

            if (city) shippingHTML += `<div><strong>City:</strong> ${city}</div>`;
            if (region) shippingHTML += `<div><strong>Region:</strong> ${region}</div>`;
            if (postalCode) shippingHTML += `<div><strong>Postal Code:</strong> ${postalCode}</div>`;
            if (landmark) shippingHTML += `<div><strong>Landmark:</strong> ${landmark}</div>`;

            document.getElementById('review-shipping').innerHTML = shippingHTML;
        }

        // Update payment information
        const paymentMethod = document.querySelector('input[name="payment_method"]:checked');
        if (paymentMethod) {
            let paymentText = '';
            
            switch (paymentMethod.value) {
                case 'paystack':
                    paymentText = 'Pay with Paystack (Cards, Mobile Money, Bank Transfer)';
                    break;
                case 'mobile_money':
                    const provider = document.getElementById('mobile_money_provider').value;
                    const number = document.getElementById('mobile_number').value;
                    paymentText = `Mobile Money (${provider}) - ${number}`;
                    break;
                case 'bank_transfer':
                    paymentText = 'Bank Transfer';
                    break;
            }

            document.getElementById('review-payment').innerHTML = `<div>${paymentText}</div>`;
        }
    }

    showPaymentDetails(paymentMethod) {
        // Hide all payment details
        document.querySelectorAll('.payment-details').forEach(detail => {
            detail.classList.add('hidden');
        });

        // Show selected payment details
        const selectedDetail = document.getElementById(`${paymentMethod}-details`);
        if (selectedDetail) {
            selectedDetail.classList.remove('hidden');
        }

        this.updateReviewSection();
    }

    applyPromoCode() {
        const promoInput = document.getElementById('checkout-promo');
        const promoMessage = document.getElementById('checkout-promo-message');
        
        if (!promoInput || !promoMessage) return;

        const code = promoInput.value.trim().toUpperCase();
        
        if (!code) {
            promoMessage.textContent = 'Please enter a promo code';
            promoMessage.className = 'promo-message promo-error';
            return;
        }

        const validCodes = ['WELCOME10', 'TECH20', 'GHANA25'];
        
        if (validCodes.includes(code)) {
            this.promoCode = code;
            promoMessage.textContent = 'Promo code applied successfully!';
            promoMessage.className = 'promo-message promo-success';
            this.updateOrderSummary();
        } else {
            promoMessage.textContent = 'Invalid promo code';
            promoMessage.className = 'promo-message promo-error';
            this.promoCode = null;
            this.updateOrderSummary();
        }
    }

    goToStep(stepNumber) {
        // Validate current step before proceeding
        if (!this.validateStep(this.currentStep)) {
            return;
        }

        // Update steps UI
        document.querySelectorAll('.checkout-step').forEach(step => {
            step.classList.remove('active');
        });

        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });

        // Show target step
        document.getElementById(`step-${stepNumber}`).classList.add('active');
        document.querySelector(`.step[data-step="${stepNumber}"]`).classList.add('active');

        // Update progress (activate all steps up to current)
        for (let i = 1; i <= stepNumber; i++) {
            document.querySelector(`.step[data-step="${i}"]`).classList.add('active');
        }

        this.currentStep = stepNumber;

        // Update review section when reaching step 4
        if (stepNumber === 4) {
            this.updateReviewSection();
        }

        // Scroll to top of form
        const formSection = document.querySelector('.checkout-form-section');
        if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    validateStep(stepNumber) {
        let isValid = true;

        switch (stepNumber) {
            case 1:
                isValid = this.validateContactInformation();
                break;
            case 2:
                isValid = this.validateShippingInformation();
                break;
            case 3:
                isValid = this.validatePaymentInformation();
                break;
        }

        return isValid;
    }

    validateContactInformation() {
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        let isValid = true;

        // Clear previous errors
        this.clearErrors();

        // Validate email
        if (!email) {
            this.showError('email', 'Email address is required');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showError('email', 'Please enter a valid email address');
            isValid = false;
        }

        // Validate phone
        if (!phone) {
            this.showError('phone', 'Phone number is required');
            isValid = false;
        } else if (!this.isValidPhone(phone)) {
            this.showError('phone', 'Please enter a valid Ghanaian phone number');
            isValid = false;
        }

        if (isValid) {
            this.orderData.contact = { email, phone };
        }

        return isValid;
    }

    validateShippingInformation() {
        const requiredFields = ['first_name', 'last_name', 'address', 'city', 'region'];
        let isValid = true;

        // Clear previous errors
        this.clearErrors();

        // Validate required fields
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (!input.value.trim()) {
                this.showError(field, `${this.formatFieldName(field)} is required`);
                isValid = false;
            }
        });

        if (isValid) {
            this.orderData.shipping = {
                first_name: document.getElementById('first_name').value,
                last_name: document.getElementById('last_name').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                region: document.getElementById('region').value,
                postal_code: document.getElementById('postal_code').value,
                landmark: document.getElementById('landmark').value,
                shipping_method: document.querySelector('input[name="shipping_method"]:checked').value
            };
        }

        return isValid;
    }

    validatePaymentInformation() {
        const paymentMethod = document.querySelector('input[name="payment_method"]:checked');
        let isValid = true;

        this.clearErrors();

        if (!paymentMethod) {
            this.showNotification('Please select a payment method', 'error');
            isValid = false;
        } else {
            this.orderData.payment = {
                method: paymentMethod.value
            };

            // Validate payment details based on method
            if (paymentMethod.value === 'mobile_money') {
                const provider = document.getElementById('mobile_money_provider').value;
                const number = document.getElementById('mobile_number').value;

                if (!provider) {
                    this.showError('mobile_money_provider', 'Please select a mobile money provider');
                    isValid = false;
                }
                if (!number) {
                    this.showError('mobile_number', 'Mobile number is required');
                    isValid = false;
                } else if (!this.isValidPhone(number)) {
                    this.showError('mobile_number', 'Please enter a valid Ghanaian phone number');
                    isValid = false;
                }

                if (isValid) {
                    this.orderData.payment.mobile_money = { provider, number };
                }
            }
        }

        return isValid;
    }

    setupFormValidation() {
        // Real-time validation for email
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', () => {
                if (emailInput.value && !this.isValidEmail(emailInput.value)) {
                    this.showError('email', 'Please enter a valid email address');
                } else {
                    this.clearError('email');
                }
            });
        }

        // Real-time validation for phone
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('blur', () => {
                if (phoneInput.value && !this.isValidPhone(phoneInput.value)) {
                    this.showError('phone', 'Please enter a valid Ghanaian phone number');
                } else {
                    this.clearError('phone');
                }
            });
        }
    }

    async placeOrder() {
        // Validate all steps
        if (!this.validateStep(1) || !this.validateStep(2) || !this.validateStep(3)) {
            this.showNotification('Please fix the errors in the form', 'error');
            return;
        }

        // Validate terms agreement
        const agreeTerms = document.getElementById('agree_terms');
        if (!agreeTerms.checked) {
            this.showError('terms', 'You must agree to the terms and conditions');
            this.showNotification('Please agree to the terms and conditions', 'error');
            return;
        }

        // Show loading overlay
        this.showLoading();

        try {
            // Prepare order data
            const orderData = {
                ...this.orderData,
                promo_code: this.promoCode,
                order_number: this.generateOrderNumber()
            };

            // Process payment based on selected method
            const paymentMethod = this.orderData.payment.method;
            
            switch (paymentMethod) {
                case 'paystack':
                    await this.processPaystackPayment(orderData);
                    break;
                case 'mobile_money':
                    await this.processMobileMoneyPayment(orderData);
                    break;
                case 'bank_transfer':
                    await this.processBankTransfer(orderData);
                    break;
                default:
                    throw new Error('Invalid payment method');
            }

        } catch (error) {
            console.error('Order placement error:', error);
            this.hideLoading();
            this.showNotification('Failed to place order. Please try again.', 'error');
        }
    }

    async processPaystackPayment(orderData) {
        try {
            // First, create the order in your database
            const orderResponse = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer: orderData.contact,
                    cart: orderData.items,
                    totalAmount: orderData.summary.total,
                    shippingAddress: orderData.shipping
                })
            });

            const orderResult = await orderResponse.json();

            if (!orderResult.success) {
                throw new Error('Failed to create order');
            }

            // Initialize Paystack payment
            const handler = PaystackPop.setup({
                key: 'pk_test_57afcffcb3978abfdad6c22623fe2e816d452d21' , // Replace with your actual key
                email: orderData.contact.email,
                amount: Math.round(orderData.summary.total * 100), // Convert to kobo
                currency: 'GHS',
                ref: orderResult.orderNumber,
                metadata: {
                    order_id: orderResult.orderId,
                    custom_fields: [
                        {
                            display_name: "Customer Name",
                            variable_name: "customer_name",
                            value: `${orderData.shipping.first_name} ${orderData.shipping.last_name}`
                        },
                        {
                            display_name: "Shipping Address",
                            variable_name: "shipping_address",
                            value: orderData.shipping.address
                        }
                    ]
                },
                callback: (response) => {
                    // Verify payment on your server
                    this.verifyPayment(response.reference, orderResult.orderId);
                },
                onClose: () => {
                    this.hideLoading();
                    this.showNotification('Payment window closed. Your order is still pending.', 'info');
                }
            });

            handler.openIframe();

        } catch (error) {
            throw error;
        }
    }

    async processMobileMoneyPayment(orderData) {
        // For demo purposes - in real implementation, this would integrate with mobile money API
        this.showNotification('Mobile Money payment would be processed here', 'info');
        this.hideLoading();
        
        // Simulate successful payment after 2 seconds
        setTimeout(() => {
            this.completeOrder(orderData);
        }, 2000);
    }

    async processBankTransfer(orderData) {
        // For bank transfer, we just create the order and show instructions
        try {
            const orderResponse = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer: orderData.contact,
                    cart: orderData.items,
                    totalAmount: orderData.summary.total,
                    shippingAddress: orderData.shipping,
                    paymentMethod: 'bank_transfer'
                })
            });

            const orderResult = await orderResponse.json();

            if (orderResult.success) {
                // Redirect to order confirmation with bank instructions
                window.location.href = `../order-confirmation/index.html?order=${orderResult.orderNumber}&payment=bank_transfer`;
            } else {
                throw new Error('Failed to create order');
            }

        } catch (error) {
            throw error;
        }
    }

    async verifyPayment(reference, orderId) {
        try {
            const response = await fetch(`/api/verify-payment/${reference}`);
            const result = await response.json();

            if (result.status && result.data.status === 'success') {
                this.completeOrder();
            } else {
                throw new Error('Payment verification failed');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Payment verification failed. Please contact support.', 'error');
        }
    }

    completeOrder() {
        this.hideLoading();
        
        // Clear cart
        localStorage.removeItem('cart');
        
        // Redirect to success page
        window.location.href = '../order-confirmation/index.html?success=true';
    }

    // Utility methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^(\+233|0)[235]\d{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}-error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        const inputElement = document.getElementById(field);
        if (inputElement) {
            inputElement.style.borderColor = '#ef4444';
        }
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field}-error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        const inputElement = document.getElementById(field);
        if (inputElement) {
            inputElement.style.borderColor = '';
        }
    }

    clearErrors() {
        document.querySelectorAll('.form-error').forEach(error => {
            error.textContent = '';
        });
        
        document.querySelectorAll('.form-input').forEach(input => {
            input.style.borderColor = '';
        });
    }

    formatFieldName(field) {
        return field.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    generateOrderNumber() {
        return 'KOF' + Date.now();
    }

    generateBankReference() {
        const reference = this.generateOrderNumber();
        const bankReference = document.getElementById('bank-reference');
        if (bankReference) {
            bankReference.textContent = reference;
        }
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    updateCartCount() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        cartCountElements.forEach(element => {
            element.textContent = totalItems;
        });
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

// Initialize checkout page
const checkoutPage = new CheckoutPage();