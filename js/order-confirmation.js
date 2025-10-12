// Order Confirmation Page Functionality
class OrderConfirmation {
    constructor() {
        this.orderData = null;
        this.orderId = this.getOrderIdFromURL();
        this.init();
    }

    init() {
        this.loadOrderData();
        this.setupEventListeners();
        this.updateCartCount();
        this.loadRecommendedProducts();
    }

    getOrderIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('order') || this.generateOrderNumber();
    }

    generateOrderNumber() {
        return 'KOF' + Date.now().toString().slice(-9);
    }

    loadOrderData() {
        // Try to get order data from localStorage (from checkout)
        const storedOrder = localStorage.getItem('lastOrder');
        
        if (storedOrder) {
            this.orderData = JSON.parse(storedOrder);
            this.displayOrderData();
        } else {
            // Fallback: Generate demo data
            this.generateDemoOrderData();
        }

        // Check if this is a bank transfer order
        this.checkPaymentMethod();
    }

    generateDemoOrderData() {
        // This would typically come from your API
        this.orderData = {
            orderNumber: this.orderId,
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: 'paystack',
            createdAt: new Date().toISOString(),
            items: [
                {
                    id: 1,
                    name: "Arduino Uno R3",
                    price: 89.99,
                    quantity: 1,
                    image: "../images/products/arduino-uno.jpg",
                    sku: "ARD-UNO-R3"
                },
                {
                    id: 2,
                    name: "ESP32 Development Board",
                    price: 75.99,
                    quantity: 1,
                    image: "../images/products/esp32-board.jpg",
                    sku: "ESP32-DEV"
                }
            ],
            shipping: {
                method: 'standard',
                cost: 15,
                address: {
                    firstName: 'Kwame',
                    lastName: 'Asare',
                    address: '123 Main Street',
                    city: 'Accra',
                    region: 'Greater Accra',
                    postalCode: 'GA123',
                    landmark: 'Near Ghana Telecom'
                },
                estimatedDelivery: '3-5 business days'
            },
            payment: {
                method: 'paystack',
                status: 'paid',
                transactionId: 'PS_' + Date.now(),
                amount: 196.73
            },
            summary: {
                subtotal: 165.98,
                shipping: 15,
                tax: 20.75,
                discount: 5,
                total: 196.73
            }
        };

        this.displayOrderData();
    }

    displayOrderData() {
        if (!this.orderData) return;

        // Update order number
        document.getElementById('order-number').textContent = this.orderData.orderNumber;
        document.getElementById('pending-order-number').textContent = this.orderData.orderNumber;

        // Display order items
        this.displayOrderItems();

        // Display order totals
        this.displayOrderTotals();

        // Display shipping information
        this.displayShippingInfo();

        // Display payment information
        this.displayPaymentInfo();

        // Update status badges
        this.updateStatusBadges();

        // Update timeline
        this.updateTimeline();

        // Set bank reference if needed
        document.getElementById('bank-reference-value').textContent = this.orderData.orderNumber;
        document.getElementById('bank-amount').textContent = `GH₵ ${this.orderData.summary.total.toFixed(2)}`;
    }

    displayOrderItems() {
        const orderItemsContainer = document.getElementById('order-items');
        
        if (!orderItemsContainer || !this.orderData.items) return;

        orderItemsContainer.innerHTML = this.orderData.items.map(item => `
            <div class="order-item">
                <img src="${item.image}" alt="${item.name}" class="order-item-image"
                     onerror="this.src='../images/products/default.jpg'">
                <div class="order-item-details">
                    <div class="order-item-header">
                        <h4 class="order-item-title">${item.name}</h4>
                        <div class="order-item-price">GH₵ ${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                    <div class="order-item-sku">SKU: ${item.sku}</div>
                    <div class="order-item-meta">
                        <span>Quantity: ${item.quantity}</span>
                        <span>GH₵ ${item.price.toFixed(2)} each</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayOrderTotals() {
        const summary = this.orderData.summary;
        
        document.getElementById('summary-subtotal').textContent = `GH₵ ${summary.subtotal.toFixed(2)}`;
        document.getElementById('summary-shipping').textContent = `GH₵ ${summary.shipping.toFixed(2)}`;
        document.getElementById('summary-tax').textContent = `GH₵ ${summary.tax.toFixed(2)}`;
        document.getElementById('summary-discount').textContent = `- GH₵ ${summary.discount.toFixed(2)}`;
        document.getElementById('summary-total').textContent = `GH₵ ${summary.total.toFixed(2)}`;
    }

    displayShippingInfo() {
        const shipping = this.orderData.shipping;
        
        document.getElementById('shipping-method').textContent = 
            shipping.method === 'express' ? 'Express Delivery' : 'Standard Delivery';
        document.getElementById('estimated-delivery').textContent = shipping.estimatedDelivery;
        
        const address = shipping.address;
        document.getElementById('shipping-address').innerHTML = `
            ${address.firstName} ${address.lastName}<br>
            ${address.address}<br>
            ${address.city}, ${address.region}<br>
            ${address.postalCode}<br>
            ${address.landmark ? `Landmark: ${address.landmark}` : ''}
        `;
    }

    displayPaymentInfo() {
        const payment = this.orderData.payment;
        
        let paymentMethodText = '';
        switch (payment.method) {
            case 'paystack':
                paymentMethodText = 'Paystack (Card/Mobile Money)';
                break;
            case 'mobile_money':
                paymentMethodText = 'Mobile Money';
                break;
            case 'bank_transfer':
                paymentMethodText = 'Bank Transfer';
                break;
            default:
                paymentMethodText = payment.method;
        }

        document.getElementById('payment-method').textContent = paymentMethodText;
        document.getElementById('payment-status').textContent = 
            payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
        document.getElementById('amount-paid').textContent = `GH₵ ${this.orderData.summary.total.toFixed(2)}`;
        document.getElementById('transaction-id').textContent = payment.transactionId;
    }

    updateStatusBadges() {
        document.getElementById('order-status-badge').textContent = 
            this.orderData.status.charAt(0).toUpperCase() + this.orderData.status.slice(1);
        
        document.getElementById('payment-status-badge').textContent = 
            this.orderData.payment.status.charAt(0).toUpperCase() + this.orderData.payment.status.slice(1);
        
        document.getElementById('payment-status-badge').className = `status-badge ${this.orderData.payment.status}`;
    }

    updateTimeline() {
        // Update times based on order creation
        const orderTime = new Date(this.orderData.createdAt);
        const processingTime = new Date(orderTime.getTime() + 24 * 60 * 60 * 1000); // +1 day
        const shippingTime = new Date(orderTime.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
        const deliveryTime = new Date(orderTime.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

        document.getElementById('order-time').textContent = this.formatTime(orderTime);
        document.getElementById('processing-time').textContent = this.formatTime(processingTime, true);
        document.getElementById('shipping-time').textContent = this.formatTime(shippingTime, true);
        document.getElementById('delivery-time').textContent = this.formatTime(deliveryTime, true);
    }

    formatTime(date, relative = false) {
        if (relative) {
            const now = new Date();
            const diffTime = date - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays < 7) return `In ${diffDays} days`;
            return date.toLocaleDateString();
        }
        
        return date.toLocaleString();
    }

    checkPaymentMethod() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentMethod = urlParams.get('payment');
        
        if (paymentMethod === 'bank_transfer') {
            this.showBankTransferView();
        }
    }

    showBankTransferView() {
        // Show pending header
        document.getElementById('confirmation-header').classList.add('hidden');
        document.getElementById('pending-header').classList.remove('hidden');
        
        // Show bank instructions
        document.getElementById('bank-instructions').classList.remove('hidden');
        
        // Update payment status
        document.getElementById('payment-status').textContent = 'Pending';
        document.getElementById('payment-status').className = 'status-badge pending';
        document.getElementById('payment-status-badge').textContent = 'Pending';
        document.getElementById('payment-status-badge').className = 'status-badge pending';
    }

    setupEventListeners() {
        // Track order button
        const trackOrderBtn = document.getElementById('track-order-btn');
        if (trackOrderBtn) {
            trackOrderBtn.addEventListener('click', () => {
                this.showTrackingModal();
            });
        }

        // Download invoice button
        const downloadInvoiceBtn = document.getElementById('download-invoice-btn');
        if (downloadInvoiceBtn) {
            downloadInvoiceBtn.addEventListener('click', () => {
                this.downloadInvoice();
            });
        }

        // Contact support button
        const contactSupportBtn = document.getElementById('contact-support-btn');
        if (contactSupportBtn) {
            contactSupportBtn.addEventListener('click', () => {
                this.contactSupport();
            });
        }

        // Copy tracking number
        const copyTrackingBtn = document.getElementById('copy-tracking');
        if (copyTrackingBtn) {
            copyTrackingBtn.addEventListener('click', () => {
                this.copyTrackingNumber();
            });
        }

        // Tracking modal close
        const trackingModalClose = document.getElementById('tracking-modal-close');
        const trackingModal = document.getElementById('tracking-modal');
        
        if (trackingModalClose && trackingModal) {
            trackingModalClose.addEventListener('click', () => {
                trackingModal.classList.remove('active');
            });

            // Close modal when clicking outside
            trackingModal.addEventListener('click', (e) => {
                if (e.target === trackingModal) {
                    trackingModal.classList.remove('active');
                }
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const trackingModal = document.getElementById('tracking-modal');
                if (trackingModal) {
                    trackingModal.classList.remove('active');
                }
            }
        });
    }

    showTrackingModal() {
        const trackingModal = document.getElementById('tracking-modal');
        if (trackingModal) {
            // Update modal with current tracking info
            document.getElementById('modal-tracking-number').textContent = 
                'TRK' + this.orderData.orderNumber.slice(3);
            
            trackingModal.classList.add('active');
        }
    }

    downloadInvoice() {
        // In a real implementation, this would generate and download a PDF invoice
        this.showNotification('Invoice download would start here', 'info');
        
        // Simulate invoice download
        setTimeout(() => {
            const invoiceData = this.generateInvoiceData();
            this.downloadJSONAsFile(invoiceData, `invoice-${this.orderData.orderNumber}.json`);
        }, 1000);
    }

    generateInvoiceData() {
        return {
            invoiceNumber: 'INV-' + this.orderData.orderNumber,
            orderNumber: this.orderData.orderNumber,
            date: new Date().toISOString(),
            items: this.orderData.items,
            totals: this.orderData.summary,
            shipping: this.orderData.shipping,
            payment: this.orderData.payment
        };
    }

    downloadJSONAsFile(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    contactSupport() {
        const subject = `Support Request for Order ${this.orderData.orderNumber}`;
        const body = `Hello KofKaN-Technologies Support Team,\n\nI need assistance with my order ${this.orderData.orderNumber}.\n\n[Please describe your issue here]`;
        
        window.location.href = `mailto:support@kofkan-technologies.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    copyTrackingNumber() {
        const trackingNumber = document.getElementById('modal-tracking-number').textContent;
        navigator.clipboard.writeText(trackingNumber).then(() => {
            this.showNotification('Tracking number copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy tracking number', 'error');
        });
    }

    async loadRecommendedProducts() {
        const recommendedContainer = document.getElementById('recommended-products');
        if (!recommendedContainer) return;

        try {
            // This would typically come from your API
            const recommendedProducts = [
                {
                    id: 101,
                    name: "Jumper Wires Pack",
                    price: 9.99,
                    image: "../images/products/jumper-wires.jpg",
                    description: "Set of 120 premium jumper wires"
                },
                {
                    id: 102,
                    name: "Breadboard 830 Points",
                    price: 6.99,
                    image: "../images/products/breadboard.jpg",
                    description: "Solderless breadboard for prototyping"
                },
                {
                    id: 103,
                    name: "Sensor Kit",
                    price: 35.99,
                    image: "../images/products/sensor-kit.jpg",
                    description: "Complete sensor kit with 15 sensors"
                },
                {
                    id: 104,
                    name: "Power Supply Module",
                    price: 12.99,
                    image: "../images/products/power-supply.jpg",
                    description: "Adjustable DC power supply module"
                }
            ];

            recommendedContainer.innerHTML = recommendedProducts.map(product => `
                <div class="product-card">
                    <img src="${product.image}" alt="${product.name}" class="product-image"
                         onerror="this.src='../images/products/default.jpg'">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-price">GH₵ ${product.price.toFixed(2)}</p>
                    <p class="product-description">${product.description}</p>
                    <div class="product-actions">
                        <button class="btn btn-primary btn-small" onclick="orderConfirmation.addToCart(${product.id})">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading recommended products:', error);
        }
    }

    async addToCart(productId) {
        try {
            // This would integrate with your cart system
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            // For demo purposes, add a sample product
            const product = {
                id: productId,
                name: `Product ${productId}`,
                price: 19.99,
                quantity: 1,
                image: "../images/products/default.jpg"
            };

            cart.push(product);
            localStorage.setItem('cart', JSON.stringify(cart));
            
            this.updateCartCount();
            this.showNotification('Product added to cart!', 'success');
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('Error adding product to cart', 'error');
        }
    }

    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        const cartCountElements = document.querySelectorAll('.cart-count');
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

// Initialize order confirmation page
const orderConfirmation = new OrderConfirmation();