// Cart page functionality
class CartPage {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.shippingRates = {
            'accra': 0,
            'kumasi': 15,
            'takoradi': 15,
            'central': 20,
            'other': 25
        };
        this.promoCode = null;
        this.promoDiscount = 0;
        this.itemToRemove = null;
        this.init();
    }

    init() {
        this.loadCart();
        this.setupEventListeners();
        this.loadRecentlyViewed();
        this.loadFrequentlyBought();
        this.updateCartCount();
    }

    loadCart() {
        const cartItems = document.getElementById('cart-items');
        const emptyCart = document.getElementById('empty-cart');
        const cartItemsCount = document.getElementById('cart-items-count');

        if (this.cart.length === 0) {
            cartItems.classList.remove('active');
            emptyCart.classList.add('active');
            cartItemsCount.textContent = '0';
            this.updateOrderSummary();
            return;
        }

        emptyCart.classList.remove('active');
        cartItems.classList.add('active');
        cartItemsCount.textContent = this.cart.length.toString();

        cartItems.innerHTML = this.cart.map(item => this.createCartItemHTML(item)).join('');
        this.updateOrderSummary();
    }

    createCartItemHTML(item) {
        const stockStatus = this.getStockStatus(item.stock);
        const stockClass = this.getStockClass(item.stock);
        const itemTotal = (item.price * item.quantity).toFixed(2);

        return `
            <div class="cart-item" data-product-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image"
                     onerror="this.src='../images/products/default.jpg'">
                
                <div class="cart-item-details">
                    <div class="cart-item-header">
                        <h3 class="cart-item-title">${item.name}</h3>
                        <div class="cart-item-price">GH₵ ${item.price.toFixed(2)}</div>
                    </div>
                    
                    <div class="cart-item-sku">SKU: ${item.sku || `PROD-${item.id}`}</div>
                    
                    <div class="cart-item-stock ${stockClass}">
                        <i class="fas fa-${this.getStockIcon(item.stock)}"></i>
                        <span>${stockStatus}</span>
                    </div>
                    
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="cartPage.updateQuantity(${item.id}, -1)" 
                                    ${item.quantity <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" value="${item.quantity}" min="1" max="${item.stock}" 
                                   class="quantity-input" onchange="cartPage.setQuantity(${item.id}, this.value)">
                            <button class="quantity-btn" onclick="cartPage.updateQuantity(${item.id}, 1)"
                                    ${item.quantity >= item.stock ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        
                        <div class="item-total">GH₵ ${itemTotal}</div>
                        
                        <div class="cart-item-actions">
                            <button class="save-btn" onclick="cartPage.moveToWishlist(${item.id})" 
                                    title="Save for later">
                                <i class="far fa-heart"></i>
                            </button>
                            <button class="remove-btn" onclick="cartPage.showRemoveModal(${item.id})" 
                                    title="Remove item">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getStockStatus(stock) {
        if (stock > 10) return 'In Stock';
        if (stock > 0) return `Only ${stock} left`;
        return 'Out of Stock';
    }

    getStockClass(stock) {
        if (stock > 10) return 'stock-in';
        if (stock > 0) return 'stock-low';
        return 'stock-out';
    }

    getStockIcon(stock) {
        if (stock > 10) return 'check-circle';
        if (stock > 0) return 'exclamation-circle';
        return 'times-circle';
    }

    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        const newQuantity = item.quantity + change;
        
        if (newQuantity < 1) {
            this.showRemoveModal(productId);
            return;
        }

        if (newQuantity > item.stock) {
            this.showNotification(`Only ${item.stock} items available in stock`, 'error');
            return;
        }

        item.quantity = newQuantity;
        this.saveCart();
        this.loadCart();
        this.showNotification('Quantity updated', 'success');
    }

    setQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        const newQuantity = parseInt(quantity);
        
        if (newQuantity < 1) {
            this.showRemoveModal(productId);
            return;
        }

        if (newQuantity > item.stock) {
            this.showNotification(`Only ${item.stock} items available in stock`, 'error');
            item.quantity = item.stock;
        } else {
            item.quantity = newQuantity;
        }

        this.saveCart();
        this.loadCart();
        this.showNotification('Quantity updated', 'success');
    }

    showRemoveModal(productId) {
        this.itemToRemove = productId;
        const item = this.cart.find(item => item.id === productId);
        
        if (!item) return;

        const modal = document.getElementById('remove-modal');
        const preview = document.getElementById('modal-item-preview');

        preview.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.src='../images/products/default.jpg'">
            <div class="modal-item-info">
                <div class="modal-item-title">${item.name}</div>
                <div class="modal-item-price">GH₵ ${item.price.toFixed(2)} × ${item.quantity}</div>
            </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideRemoveModal() {
        const modal = document.getElementById('remove-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.itemToRemove = null;
    }

    removeItem() {
        if (!this.itemToRemove) return;

        this.cart = this.cart.filter(item => item.id !== this.itemToRemove);
        this.saveCart();
        this.loadCart();
        this.hideRemoveModal();
        this.showNotification('Item removed from cart', 'success');
    }

    moveToWishlist(productId) {
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        
        if (!wishlist.includes(productId)) {
            wishlist.push(productId);
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            
            // Update wishlist count in navigation
            const wishlistCount = document.querySelector('.wishlist-count');
            if (wishlistCount) {
                const currentCount = parseInt(wishlistCount.textContent) || 0;
                wishlistCount.textContent = currentCount + 1;
            }
        }

        this.removeItemFromCart(productId);
        this.showNotification('Item moved to wishlist', 'success');
    }

    removeItemFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.loadCart();
    }

    clearCart() {
        if (this.cart.length === 0) return;

        this.cart = [];
        this.saveCart();
        this.loadCart();
        this.showNotification('Cart cleared', 'success');
    }

    updateOrderSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = this.calculateShipping();
        const tax = this.calculateTax(subtotal);
        const discount = this.calculateDiscount(subtotal);
        const total = subtotal + shipping + tax - discount;

        document.getElementById('subtotal-amount').textContent = `GH₵ ${subtotal.toFixed(2)}`;
        document.getElementById('shipping-amount').textContent = `GH₵ ${shipping.toFixed(2)}`;
        document.getElementById('tax-amount').textContent = `GH₵ ${tax.toFixed(2)}`;
        document.getElementById('discount-amount').textContent = `- GH₵ ${discount.toFixed(2)}`;
        document.getElementById('total-amount').textContent = `GH₵ ${total.toFixed(2)}`;
    }

    calculateShipping() {
        const shippingSelect = document.getElementById('shipping-region');
        if (!shippingSelect || !shippingSelect.value) return 0;

        return this.shippingRates[shippingSelect.value] || 0;
    }

    calculateTax(subtotal) {
        // Ghana VAT rate is 12.5%
        return subtotal * 0.125;
    }

    calculateDiscount(subtotal) {
        if (!this.promoCode) return 0;

        // Example promo codes
        const promoCodes = {
            'WELCOME10': 0.1,  // 10% off
            'TECH20': 0.2,     // 20% off
            'GHANA25': 0.25    // 25% off
        };

        const discountRate = promoCodes[this.promoCode] || 0;
        return subtotal * discountRate;
    }

    applyPromoCode() {
        const promoInput = document.getElementById('promo-code');
        const promoMessage = document.getElementById('promo-message');
        
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
            this.showNotification('Promo code applied!', 'success');
        } else {
            promoMessage.textContent = 'Invalid promo code';
            promoMessage.className = 'promo-message promo-error';
        }
    }

    setupEventListeners() {
        // Clear cart button
        const clearCartBtn = document.getElementById('clear-cart');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                if (this.cart.length > 0) {
                    if (confirm('Are you sure you want to clear your cart?')) {
                        this.clearCart();
                    }
                }
            });
        }

        // Shipping region change
        const shippingSelect = document.getElementById('shipping-region');
        if (shippingSelect) {
            shippingSelect.addEventListener('change', () => {
                this.updateOrderSummary();
            });
        }

        // Promo code apply
        const applyPromoBtn = document.getElementById('apply-promo');
        if (applyPromoBtn) {
            applyPromoBtn.addEventListener('click', () => {
                this.applyPromoCode();
            });
        }

        // Promo code enter key
        const promoInput = document.getElementById('promo-code');
        if (promoInput) {
            promoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyPromoCode();
                }
            });
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                this.proceedToCheckout();
            });
        }

        // Remove modal events
        const removeModalClose = document.getElementById('remove-modal-close');
        const cancelRemove = document.getElementById('cancel-remove');
        const confirmRemove = document.getElementById('confirm-remove');

        if (removeModalClose) {
            removeModalClose.addEventListener('click', () => this.hideRemoveModal());
        }
        if (cancelRemove) {
            cancelRemove.addEventListener('click', () => this.hideRemoveModal());
        }
        if (confirmRemove) {
            confirmRemove.addEventListener('click', () => this.removeItem());
        }

        // Close modal when clicking outside
        const removeModal = document.getElementById('remove-modal');
        if (removeModal) {
            removeModal.addEventListener('click', (e) => {
                if (e.target === removeModal) {
                    this.hideRemoveModal();
                }
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideRemoveModal();
            }
        });
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty', 'error');
            return;
        }

        // Check if any items are out of stock
        const outOfStockItems = this.cart.filter(item => item.stock === 0);
        if (outOfStockItems.length > 0) {
            this.showNotification('Some items in your cart are out of stock', 'error');
            return;
        }

        // Check if quantities exceed stock
        const overstockedItems = this.cart.filter(item => item.quantity > item.stock);
        if (overstockedItems.length > 0) {
            this.showNotification('Some items exceed available stock', 'error');
            return;
        }

        // Redirect to checkout page
        window.location.href = '../checkout/index.html';
    }

    async loadRecentlyViewed() {
        const recentItems = document.getElementById('recent-items');
        if (!recentItems) return;

        try {
            // Simulate API call for recently viewed
            const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
            
            if (recentlyViewed.length === 0) {
                // Load some sample recently viewed items
                recentItems.innerHTML = `
                    <div class="recent-item" onclick="window.location.href='../products/arduino-uno/index.html'">
                        <img src="../images/products/arduino-uno.jpg" alt="Arduino Uno" onerror="this.src='../images/products/default.jpg'">
                        <div class="recent-item-info">
                            <div class="recent-item-title">Arduino Uno R3</div>
                            <div class="recent-item-price">GH₵ 89.99</div>
                        </div>
                    </div>
                    <div class="recent-item" onclick="window.location.href='../products/esp32-board/index.html'">
                        <img src="../images/products/esp32-board.jpg" alt="ESP32 Board" onerror="this.src='../images/products/default.jpg'">
                        <div class="recent-item-info">
                            <div class="recent-item-title">ESP32 Development Board</div>
                            <div class="recent-item-price">GH₵ 75.99</div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading recently viewed:', error);
        }
    }

    async loadFrequentlyBought() {
        const frequentlyBought = document.getElementById('frequently-bought');
        if (!frequentlyBought) return;

        try {
            // This would typically come from your API
            const products = [
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
                    name: "LED Pack",
                    price: 4.99,
                    image: "../images/products/led-pack.jpg",
                    description: "Assorted LED pack with 50 pieces"
                }
            ];

            frequentlyBought.innerHTML = products.map(product => `
                <div class="product-card">
                    <img src="${product.image}" alt="${product.name}" class="product-image"
                         onerror="this.src='../images/products/default.jpg'">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-price">GH₵ ${product.price.toFixed(2)}</p>
                    <p class="product-description">${product.description}</p>
                    <div class="product-actions">
                        <button class="btn btn-primary btn-small" onclick="cartPage.addToCart(${product.id})">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading frequently bought:', error);
        }
    }

    async addToCart(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) throw new Error('Product not found');
            
            const product = await response.json();
            
            const existingItem = this.cart.find(item => item.id === productId);
            
            if (existingItem) {
                if (existingItem.quantity >= product.stock_quantity) {
                    this.showNotification(`Only ${product.stock_quantity} items available in stock`, 'error');
                    return;
                }
                existingItem.quantity += 1;
            } else {
                this.cart.push({
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    image: product.image_url,
                    quantity: 1,
                    stock: product.stock_quantity,
                    sku: product.sku
                });
            }

            this.saveCart();
            this.loadCart();
            this.updateCartCount();
            this.showNotification('Product added to cart!', 'success');
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('Error adding product to cart', 'error');
        }
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
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

// Initialize cart page
const cartPage = new CartPage();