// Account Management System
class AccountSystem {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'dashboard';
        this.init();
    }

    async init() {
        const isAuthenticated = await this.checkAuthentication();
        if (!isAuthenticated) {
            return;
        }
        this.setupEventListeners();
        this.loadDashboardData();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        // Immediate check for token presence
        if (!token || !user) {
            console.log('No token or user found, redirecting to signin');
            this.redirectToSignIn();
            return false;
        }

        try {
            // Verify token with server - FIXED ENDPOINT
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Token invalid');
            }

            const data = await response.json();
            
            // Token is valid, update user data
            this.currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            this.displayUserInfo();
            return true;

        } catch (error) {
            console.error('Authentication failed:', error);
            this.logout();
            return false;
        }
    }

    redirectToSignIn() {
        window.location.href = '../auth/signin.html';
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.redirectToSignIn();
    }

    displayUserInfo() {
        if (!this.currentUser) return;
        
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const memberSinceElement = document.getElementById('member-since');
        
        if (userNameElement) {
            userNameElement.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        }
        
        if (userEmailElement) {
            userEmailElement.textContent = this.currentUser.email;
        }
        
        if (memberSinceElement && this.currentUser.created_at) {
            const memberSince = new Date(this.currentUser.created_at).getFullYear();
            memberSinceElement.textContent = memberSince;
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
            
            const cancelProfile = document.getElementById('cancel-profile');
            if (cancelProfile) {
                cancelProfile.addEventListener('click', () => {
                    this.loadProfileData();
                });
            }
        }

        // Address management
        const addAddressBtn = document.getElementById('add-address-btn');
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', () => {
                this.showAddAddressModal();
            });
        }

        const addressForm = document.getElementById('address-form');
        if (addressForm) {
            addressForm.addEventListener('submit', (e) => this.handleAddAddress(e));
        }

        const closeAddressModal = document.getElementById('close-address-modal');
        if (closeAddressModal) {
            closeAddressModal.addEventListener('click', () => {
                this.hideAddAddressModal();
            });
        }

        const cancelAddress = document.getElementById('cancel-address');
        if (cancelAddress) {
            cancelAddress.addEventListener('click', () => {
                this.hideAddAddressModal();
            });
        }

        // Wishlist management
        const clearWishlist = document.getElementById('clear-wishlist');
        if (clearWishlist) {
            clearWishlist.addEventListener('click', () => {
                this.clearWishlist();
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleWishlistFilter(e.target.dataset.filter);
            });
        });

        // Order filters
        const orderStatusFilter = document.getElementById('order-status-filter');
        const orderTimeFilter = document.getElementById('order-time-filter');
        
        if (orderStatusFilter) {
            orderStatusFilter.addEventListener('change', () => this.loadOrders());
        }
        if (orderTimeFilter) {
            orderTimeFilter.addEventListener('change', () => this.loadOrders());
        }
    }

    switchTab(tabName) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update active tab
        document.querySelectorAll('.account-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.currentTab = tabName;

        // Load tab-specific data
        switch(tabName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'profile':
                this.loadProfileData();
                break;
            case 'addresses':
                this.loadAddresses();
                break;
            case 'wishlist':
                this.loadWishlist();
                break;
            case 'reviews':
                this.loadReviews();
                break;
            case 'preferences':
                this.loadPreferences();
                break;
            case 'security':
                this.loadSecurity();
                break;
        }
    }

    async loadDashboardData() {
        try {
            // Load stats
            const stats = await this.fetchUserStats();
            this.updateDashboardStats(stats);

            // Load recent orders
            const orders = await this.fetchRecentOrders();
            this.updateRecentOrders(orders);

            // Load recently viewed
            const viewed = await this.fetchRecentlyViewed();
            this.updateRecentlyViewed(viewed);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async fetchUserStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/user/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.stats;
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }

        // Fallback mock data
        return {
            totalOrders: 0,
            wishlistCount: 0,
            totalReviews: 0,
            pendingOrders: 0,
            shippingOrders: 0,
            totalSpent: 0,
            savingsPercent: 0
        };
    }

    updateDashboardStats(stats) {
        const elements = {
            'total-orders': stats.totalOrders,
            'wishlist-count': stats.wishlistCount,
            'total-reviews': stats.totalReviews,
            'pending-orders': stats.pendingOrders,
            'shipping-orders': stats.shippingOrders,
            'total-spent': stats.totalSpent ? stats.totalSpent.toFixed(2) : '0.00',
            'savings-percent': `${stats.savingsPercent || 0}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update badges
        const ordersBadge = document.getElementById('orders-badge');
        const wishlistBadge = document.getElementById('wishlist-badge');
        
        if (ordersBadge) ordersBadge.textContent = stats.totalOrders;
        if (wishlistBadge) wishlistBadge.textContent = stats.wishlistCount;
    }

    async fetchRecentOrders() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/user/orders?limit=5', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.orders.slice(0, 5); // Get only 5 most recent
            }
        } catch (error) {
            console.error('Error fetching recent orders:', error);
        }

        return [];
    }

    updateRecentOrders(orders) {
        const container = document.getElementById('recent-orders');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <p>No recent orders</p>
                    <a href="../products/index.html" class="btn btn-primary">Start Shopping</a>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item">
                <div class="order-info">
                    <h4>Order #${order.order_number}</h4>
                    <div class="order-meta">
                        <span>${new Date(order.created_at).toLocaleDateString()}</span>
                        <span>GH₵ ${order.total_amount.toFixed(2)}</span>
                        <span>${order.item_count} items</span>
                    </div>
                </div>
                <div class="order-actions">
                    <span class="order-status status-${order.status}">
                        ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <button class="btn btn-outline btn-small" onclick="accountSystem.viewOrder('${order.order_number}')">
                        View
                    </button>
                </div>
            </div>
        `).join('');
    }

    async fetchRecentlyViewed() {
        // This would typically come from your API or localStorage
        const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
        return recentlyViewed.slice(0, 4); // Return only 4 most recent
    }

    updateRecentlyViewed(products) {
        const container = document.getElementById('recently-viewed');
        if (!container) return;
        
        if (products.length === 0) {
            container.innerHTML = '<p class="empty-text">No recently viewed items</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="recent-product" onclick="window.location.href='../products/arduino-uno/index.html'">
                <img src="${product.image}" alt="${product.name}" 
                     onerror="this.src='../images/products/default.jpg'">
                <h4>${product.name}</h4>
                <div class="price">GH₵ ${product.price.toFixed(2)}</div>
            </div>
        `).join('');
    }

    async loadOrders() {
        try {
            const statusFilter = document.getElementById('order-status-filter')?.value || 'all';
            const timeFilter = document.getElementById('order-time-filter')?.value || 'all';
            
            const orders = await this.fetchOrders(statusFilter, timeFilter);
            this.displayOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showNotification('Failed to load orders', 'error');
        }
    }

    async fetchOrders(status = 'all', timePeriod = 'all') {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/user/orders?status=${status}&period=${timePeriod}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.orders;
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }

        return [];
    }

    displayOrders(orders) {
        const container = document.getElementById('orders-list');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <p>No orders found</p>
                    <a href="../products/index.html" class="btn btn-primary">Start Shopping</a>
                </div>
            `;
            return;
        }

        // Display orders list
        container.innerHTML = orders.map(order => this.createOrderHTML(order)).join('');
    }

    createOrderHTML(order) {
        return `
            <div class="order-card">
                <div class="order-header">
                    <h4>Order #${order.order_number}</h4>
                    <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div class="order-body">
                    <div class="order-total">GH₵ ${order.total_amount.toFixed(2)}</div>
                    <div class="order-status status-${order.status}">
                        ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                </div>
                <div class="order-actions">
                    <button class="btn btn-outline btn-small" onclick="accountSystem.viewOrder('${order.order_number}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    async loadProfileData() {
        if (!this.currentUser) return;

        // Populate profile form with current user data
        const elements = {
            'profile-first-name': this.currentUser.first_name || '',
            'profile-last-name': this.currentUser.last_name || '',
            'profile-email': this.currentUser.email || '',
            'profile-phone': this.currentUser.phone || '',
            'profile-dob': this.currentUser.date_of_birth || '',
            'profile-gender': this.currentUser.gender || ''
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.currentUser = result.user;
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                this.displayUserInfo();
                this.showNotification('Profile updated successfully!', 'success');
            } else {
                this.showNotification('Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async loadAddresses() {
        try {
            const addresses = await this.fetchAddresses();
            this.displayAddresses(addresses);
        } catch (error) {
            console.error('Error loading addresses:', error);
        }
    }

    async fetchAddresses() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/user/addresses', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.addresses;
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
        }

        return [];
    }

    displayAddresses(addresses) {
        const container = document.getElementById('addresses-list');
        if (!container) return;
        
        if (addresses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>No addresses saved</p>
                    <button class="btn btn-primary" onclick="accountSystem.showAddAddressModal()">
                        Add Your First Address
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = addresses.map(address => this.createAddressHTML(address)).join('');
    }

    createAddressHTML(address) {
        return `
            <div class="address-card ${address.is_default ? 'default' : ''}">
                ${address.is_default ? '<span class="address-default-badge">Default</span>' : ''}
                <div class="address-type">${address.address_type} Address</div>
                <div class="address-details">
                    ${address.street_address}<br>
                    ${address.city}, ${address.region}<br>
                    ${address.postal_code}<br>
                    ${address.landmark ? `Landmark: ${address.landmark}` : ''}
                </div>
                <div class="address-actions">
                    <button class="btn btn-outline btn-small" onclick="accountSystem.editAddress(${address.id})">
                        Edit
                    </button>
                    ${!address.is_default ? `
                        <button class="btn btn-outline btn-small" onclick="accountSystem.setDefaultAddress(${address.id})">
                            Set Default
                        </button>
                        <button class="btn btn-outline btn-small" onclick="accountSystem.deleteAddress(${address.id})">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showAddAddressModal() {
        const modal = document.getElementById('add-address-modal');
        if (modal) {
            modal.classList.add('active');
        }
        
        const addressForm = document.getElementById('address-form');
        if (addressForm) {
            addressForm.reset();
        }
    }

    hideAddAddressModal() {
        const modal = document.getElementById('add-address-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async handleAddAddress(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/user/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.hideAddAddressModal();
                this.loadAddresses();
                this.showNotification('Address added successfully!', 'success');
            } else {
                this.showNotification('Failed to add address', 'error');
            }
        } catch (error) {
            console.error('Error adding address:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async loadWishlist() {
        try {
            const wishlist = await this.fetchWishlist();
            this.displayWishlist(wishlist);
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }

    async fetchWishlist() {
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        // You would typically fetch product details from your API
        return wishlist.map(id => ({
            id: id,
            name: `Product ${id}`,
            price: 19.99,
            image: '../images/products/default.jpg',
            inStock: true
        }));
    }

    displayWishlist(items) {
        const container = document.getElementById('wishlist-items');
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <p>Your wishlist is empty</p>
                    <a href="../products/index.html" class="btn btn-primary">Browse Products</a>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="wishlist-item">
                <button class="remove-wishlist" onclick="accountSystem.removeFromWishlist(${item.id})">
                    <i class="fas fa-times"></i>
                </button>
                <img src="${item.image}" alt="${item.name}" 
                     onerror="this.src='../images/products/default.jpg'">
                <h4>${item.name}</h4>
                <div class="price">GH₵ ${item.price.toFixed(2)}</div>
                <div class="wishlist-actions-item">
                    <button class="btn btn-primary btn-small" onclick="accountSystem.addToCart(${item.id})">
                        Add to Cart
                    </button>
                </div>
            </div>
        `).join('');
    }

    handleWishlistFilter(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Filter wishlist items
        this.loadWishlist(); // This would apply the filter in a real implementation
    }

    async removeFromWishlist(productId) {
        let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        wishlist = wishlist.filter(id => id !== productId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        
        this.loadWishlist();
        this.updateWishlistCount();
        this.showNotification('Item removed from wishlist', 'success');
    }

    async clearWishlist() {
        if (confirm('Are you sure you want to clear your entire wishlist?')) {
            localStorage.removeItem('wishlist');
            this.loadWishlist();
            this.updateWishlistCount();
            this.showNotification('Wishlist cleared', 'success');
        }
    }

    updateWishlistCount() {
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        const wishlistCount = document.getElementById('wishlist-count');
        const wishlistBadge = document.getElementById('wishlist-badge');
        
        if (wishlistCount) wishlistCount.textContent = wishlist.length;
        if (wishlistBadge) wishlistBadge.textContent = wishlist.length;
    }

    async addToCart(productId) {
        try {
            // This would integrate with your cart system
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingItem = cart.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: `Product ${productId}`,
                    price: 19.99,
                    quantity: 1,
                    image: '../images/products/default.jpg'
                });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            this.showNotification('Product added to cart!', 'success');
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('Error adding product to cart', 'error');
        }
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

// Initialize account system
const accountSystem = new AccountSystem();