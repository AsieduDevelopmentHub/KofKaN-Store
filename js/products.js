// Products page functionality
class ProductsPage {
    constructor() {
        this.activePage = 1;
        this.itemsPerPage = 12;
        this.currentView = 'grid';
        this.filters = {
            category: [],
            maxPrice: 1000, // Increased max price for Ghanaian market
            stock: ['in-stock']
        };
        this.sortBy = 'newest';
        this.searchTerm = '';
        this.allProducts = [];
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        this.init();
    }

    init() {
        this.loadProducts();
        this.setupEventListeners();
        this.setupSearch();
        this.setupQuickView();
        this.updateCartCount();
    }

    // Enhanced filter functionality
    setupEventListeners() {
        // Existing event listeners...
        const filterToggle = document.getElementById('filter-toggle');
        const filterPanel = document.getElementById('filter-panel');
        
        if (filterToggle && filterPanel) {
            filterToggle.addEventListener('click', () => {
                filterPanel.classList.toggle('active');
            });
        }

        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderProducts();
            });
        });

        // Enhanced price slider
        const priceSlider = document.getElementById('price-slider');
        const priceValue = document.getElementById('price-value');
        
        if (priceSlider && priceValue) {
            // Set initial value
            priceSlider.value = this.filters.maxPrice;
            priceValue.textContent = this.filters.maxPrice;
            
            priceSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                priceValue.textContent = value;
                this.filters.maxPrice = value;
            });
        }

        // Enhanced category filters
        document.querySelectorAll('input[name="category"]').forEach(checkbox => {
            // Set initial checked state based on current filters
            if (this.filters.category.includes(checkbox.value)) {
                checkbox.checked = true;
            }
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.filters.category.includes(e.target.value)) {
                        this.filters.category.push(e.target.value);
                    }
                } else {
                    this.filters.category = this.filters.category.filter(cat => cat !== e.target.value);
                }
            });
        });

        // Enhanced stock filters
        document.querySelectorAll('input[name="stock"]').forEach(checkbox => {
            // Set initial checked state
            if (this.filters.stock.includes(checkbox.value)) {
                checkbox.checked = true;
            }
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.filters.stock.includes(e.target.value)) {
                        this.filters.stock.push(e.target.value);
                    }
                } else {
                    this.filters.stock = this.filters.stock.filter(stock => stock !== e.target.value);
                }
            });
        });

        // Apply filters with enhanced functionality
        const applyFilters = document.getElementById('apply-filters');
        if (applyFilters) {
            applyFilters.addEventListener('click', () => {
                this.activePage = 1;
                this.applyFiltersAndSearch();
                this.renderProducts();
                if (filterPanel) filterPanel.classList.remove('active');
                this.showNotification('Filters applied successfully!', 'success');
            });
        }

        // Reset filters
        const resetFilters = document.getElementById('reset-filters');
        if (resetFilters) {
            resetFilters.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // Sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applySorting();
                this.renderProducts();
            });
        }

        // Clear search
        const clearSearch = document.getElementById('clear-search');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                this.searchTerm = '';
                const searchInput = document.getElementById('product-search');
                if (searchInput) searchInput.value = '';
                this.applyFiltersAndSearch();
                this.renderProducts();
            });
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('product-search');
        const searchSuggestions = document.getElementById('search-suggestions');

        if (searchInput && searchSuggestions) {
            let searchTimeout;

            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTerm = e.target.value.trim();
                    if (this.searchTerm.length > 2) {
                        this.showSearchSuggestions(this.searchTerm);
                    } else {
                        searchSuggestions.style.display = 'none';
                    }
                }, 300);
            });

            searchInput.addEventListener('focus', () => {
                if (this.searchTerm.length > 2) {
                    this.showSearchSuggestions(this.searchTerm);
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-bar-container')) {
                    searchSuggestions.style.display = 'none';
                }
            });

            // Enter key to search
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchTerm = e.target.value.trim();
                    this.activePage = 1;
                    this.applyFiltersAndSearch();
                    this.renderProducts();
                    searchSuggestions.style.display = 'none';
                }
            });
        }
    }

    async showSearchSuggestions(term) {
        try {
            // Fetch search suggestions from API
            const response = await fetch(`/api/products?search=${encodeURIComponent(term)}&limit=5`);
            const data = await response.json();
            
            const searchSuggestions = document.getElementById('search-suggestions');
            if (searchSuggestions && data.products) {
                if (data.products.length > 0) {
                    searchSuggestions.innerHTML = data.products.map(product => `
                        <div class="search-suggestion" data-term="${product.name}">
                            <i class="fas fa-search"></i> ${product.name}
                        </div>
                    `).join('');
                    searchSuggestions.style.display = 'block';

                    // Add click events to suggestions
                    searchSuggestions.querySelectorAll('.search-suggestion').forEach(suggestion => {
                        suggestion.addEventListener('click', (e) => {
                            const term = e.currentTarget.dataset.term;
                            const searchInput = document.getElementById('product-search');
                            if (searchInput) searchInput.value = term;
                            this.searchTerm = term;
                            this.activePage = 1;
                            this.applyFiltersAndSearch();
                            this.renderProducts();
                            searchSuggestions.style.display = 'none';
                        });
                    });
                } else {
                    searchSuggestions.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
            // Fallback to local suggestions if API fails
            this.showFallbackSuggestions(term);
        }
    }

    showFallbackSuggestions(term) {
        const suggestions = [
            'Arduino Uno R3',
            'ESP32 Development Board',
            'Ultrasonic Sensor',
            'Temperature Sensor',
            'LCD Display',
            'Servo Motor',
            'Jumper Wires',
            'Breadboard',
            'Raspberry Pi',
            'Motor Driver'
        ].filter(item => 
            item.toLowerCase().includes(term.toLowerCase())
        );

        const searchSuggestions = document.getElementById('search-suggestions');
        if (searchSuggestions) {
            if (suggestions.length > 0) {
                searchSuggestions.innerHTML = suggestions.map(suggestion => `
                    <div class="search-suggestion" data-term="${suggestion}">
                        <i class="fas fa-search"></i> ${suggestion}
                    </div>
                `).join('');
                searchSuggestions.style.display = 'block';

                searchSuggestions.querySelectorAll('.search-suggestion').forEach(suggestion => {
                    suggestion.addEventListener('click', (e) => {
                        const term = e.currentTarget.dataset.term;
                        const searchInput = document.getElementById('product-search');
                        if (searchInput) searchInput.value = term;
                        this.searchTerm = term;
                        this.activePage = 1;
                        this.applyFiltersAndSearch();
                        this.renderProducts();
                        searchSuggestions.style.display = 'none';
                    });
                });
            } else {
                searchSuggestions.style.display = 'none';
            }
        }
    }

    async loadProducts() {
        const loadingSpinner = document.getElementById('loading-spinner');
        const productsView = document.getElementById('products-view');
        const noResults = document.getElementById('no-results');

        // Show loading state
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        if (productsView) productsView.innerHTML = '';
        if (noResults) noResults.classList.add('hidden');

        try {
            // Build API URL with query parameters :cite[4]
            const params = new URLSearchParams();
            params.append('page', this.activePage);
            params.append('limit', this.itemsPerPage);
            
            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }
            
            if (this.filters.category.length > 0) {
                params.append('category', this.filters.category.join(','));
            }

            // Use Fetch API to get products from your backend :cite[4]
            const response = await fetch(`/api/products?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Map the database response to match your frontend expectations
            this.allProducts = data.products.map(product => ({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                originalPrice: product.original_price ? parseFloat(product.original_price) : null,
                description: product.description,
                image: product.image_url || '../images/products/default.jpg',
                category: product.category || this.mapCategory(product.categories),
                stock: product.stock_quantity || 0,
                rating: product.rating || 4.0,
                reviewCount: product.review_count || 0,
                featured: product.featured || false,
                sku: product.sku || `PROD-${product.id}`
            }));

            this.applyFiltersAndSearch();
            this.renderProducts();
            
        } catch (error) {
            console.error('Error loading products from database:', error);
            this.showNotification('Failed to load products. Using demo data.', 'error');
            // Fallback to demo data
            this.allProducts = this.getFallbackProducts();
            this.applyFiltersAndSearch();
            this.renderProducts();
        } finally {
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
        }
    }

    formatSpecKey(key) {
        return key.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatCategory(category) {
        const categoryMap = {
            'development-boards': 'Development Boards',
            'sensors': 'Sensors',
            'actuators': 'Actuators',
            'displays': 'Displays',
            'power-supply': 'Power Supply',
            'kits-bundles': 'Kits & Bundles',
            'accessories': 'Accessories'
        };
        return categoryMap[category] || category;
    }

    getFallbackProducts() {
        return [
            {
                id: 1,
                name: "Arduino Uno R3",
                price: 89.99,
                originalPrice: 99.99,
                description: "The perfect board for beginners and experienced users alike with 14 digital I/O pins.",
                image: "../images/products/arduino-uno.jpg",
                category: "development-boards",
                stock: 25,
                rating: 4.5,
                reviewCount: 128,
                featured: true,
                sku: "ARD-UNO-R3"
            },
            {
                id: 2,
                name: "ESP32 Development Board",
                price: 75.99,
                description: "Feature-rich IoT development board with WiFi and Bluetooth capabilities.",
                image: "../images/products/esp32-board.jpg",
                category: "development-boards",
                stock: 30,
                rating: 4.3,
                reviewCount: 89,
                featured: true,
                sku: "ESP32-DEV"
            },
            {
                id: 3,
                name: "HC-SR04 Ultrasonic Sensor",
                price: 24.99,
                description: "Ultrasonic distance measurement sensor with 2cm to 400cm range.",
                image: "../images/products/ultrasonic-sensor.jpg",
                category: "sensors",
                stock: 100,
                rating: 4.2,
                reviewCount: 67,
                featured: false,
                sku: "SEN-HCSR04"
            }
        ];
    }

    // Enhanced filter application
    applyFiltersAndSearch() {
        let filteredProducts = [...this.allProducts];

        console.log('Initial products:', filteredProducts.length);
        console.log('Current filters:', this.filters);
        console.log('Search term:', this.searchTerm);

        // Apply search filter
        if (this.searchTerm) {
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                product.sku.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
            console.log('After search filter:', filteredProducts.length);
        }

        // Apply category filter
        if (this.filters.category.length > 0) {
            filteredProducts = filteredProducts.filter(product =>
                this.filters.category.includes(product.category)
            );
            console.log('After category filter:', filteredProducts.length);
        }

        // Apply price filter
        filteredProducts = filteredProducts.filter(product =>
            product.price <= this.filters.maxPrice
        );
        console.log('After price filter:', filteredProducts.length);

        // Apply stock filter
        if (this.filters.stock.includes('in-stock') && !this.filters.stock.includes('low-stock')) {
            filteredProducts = filteredProducts.filter(product => product.stock > 10);
        } else if (this.filters.stock.includes('low-stock') && !this.filters.stock.includes('in-stock')) {
            filteredProducts = filteredProducts.filter(product => product.stock > 0 && product.stock <= 10);
        } else if (this.filters.stock.includes('in-stock') && this.filters.stock.includes('low-stock')) {
            filteredProducts = filteredProducts.filter(product => product.stock > 0);
        }
        console.log('After stock filter:', filteredProducts.length);

        this.filteredProducts = filteredProducts;
        this.applySorting();
    }

    applySorting() {
        switch (this.sortBy) {
            case 'price-low':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'popular':
                this.filteredProducts.sort((a, b) => b.reviewCount - a.reviewCount);
                break;
            default: // newest
                this.filteredProducts.sort((a, b) => b.id - a.id);
        }
    }

    renderProducts() {
        const productsView = document.getElementById('products-view');
        const resultsCount = document.getElementById('results-count');
        const noResults = document.getElementById('no-results');
        const pagination = document.getElementById('pagination');

        if (!productsView) return;

        // Update results count
        if (resultsCount) {
            resultsCount.textContent = `${this.filteredProducts.length} products found`;
        }

        // Show no results message if needed
        if (this.filteredProducts.length === 0) {
            if (noResults) noResults.classList.remove('hidden');
            if (pagination) pagination.innerHTML = '';
            productsView.innerHTML = '';
            return;
        } else {
            if (noResults) noResults.classList.add('hidden');
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        const startIndex = (this.activePage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentProducts = this.filteredProducts.slice(startIndex, endIndex);

        // Render products
        productsView.className = `products-view ${this.currentView}`;
        productsView.innerHTML = currentProducts.map(product => this.createProductCard(product)).join('');

        // Render pagination
        this.renderPagination(totalPages);
    }

    createProductCard(product) {
        const viewClass = this.currentView === 'list' ? 'list' : '';
        const productData = JSON.stringify(product).replace(/"/g, '&quot;');
        
        return `
            <div class="product-card ${viewClass}" data-product-id="${product.id}">
                ${product.stock < 10 ? '<span class="product-badge">Low Stock</span>' : ''}
                ${product.originalPrice ? '<span class="product-badge sale">Sale</span>' : ''}
                
                <img src="${product.image}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="this.src='../images/products/default.jpg'">
                
                <div class="product-info-container">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-sku">SKU: ${product.sku}</p>
                    
                    <div class="product-rating-small">
                        <div class="stars">
                            ${this.renderStars(product.rating)}
                        </div>
                        <span class="review-count">(${product.reviewCount})</span>
                    </div>
                    
                    <p class="product-description">${product.description}</p>
                    
                    <div class="product-price">
                        <span class="current-price">GH₵ ${product.price.toFixed(2)}</span>
                        ${product.originalPrice ? 
                            `<span class="original-price">GH₵ ${product.originalPrice.toFixed(2)}</span>` : ''
                        }
                    </div>
                    
                    <div class="product-stock-info">
                        <i class="fas fa-${product.stock > 10 ? 'check' : 'exclamation'}-circle"></i>
                        <span>${product.stock > 10 ? 'In Stock' : `${product.stock} left`}</span>
                    </div>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-primary btn-small" onclick="productsPage.addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-outline btn-small" onclick="productsPage.addToWishlist(${product.id})">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="btn btn-outline btn-small" onclick="productsPage.showQuickView(${productData})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderStars(rating) {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars.push('<i class="fas fa-star"></i>');
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars.push('<i class="fas fa-star-half-alt"></i>');
            } else {
                stars.push('<i class="far fa-star"></i>');
            }
        }

        return stars.join('');
    }

    renderPagination(totalPages) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn ${this.activePage === 1 ? 'disabled' : ''}" 
                    onclick="productsPage.changePage(${this.activePage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.activePage - 1 && i <= this.activePage + 1)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.activePage ? 'active' : ''}" 
                            onclick="productsPage.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.activePage - 2 || i === this.activePage + 2) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn ${this.activePage === totalPages ? 'disabled' : ''}" 
                    onclick="productsPage.changePage(${this.activePage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;

        this.activePage = page;
        this.renderProducts();
        
        // Scroll to top of products
        const productsSection = document.querySelector('.products-listing');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

   // Enhanced reset filters
    resetFilters() {
        this.filters = {
            category: [],
            maxPrice: 1000,
            stock: ['in-stock']
        };
        
        // Reset UI elements
        document.querySelectorAll('input[name="category"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.querySelectorAll('input[name="stock"]').forEach(checkbox => {
            checkbox.checked = checkbox.value === 'in-stock';
        });
        
        const priceSlider = document.getElementById('price-slider');
        const priceValue = document.getElementById('price-value');
        if (priceSlider && priceValue) {
            priceSlider.value = 1000;
            priceValue.textContent = '1000';
        }

        this.searchTerm = '';
        const searchInput = document.getElementById('product-search');
        if (searchInput) searchInput.value = '';
        
        this.activePage = 1;
        this.applyFiltersAndSearch();
        this.renderProducts();
        this.showNotification('Filters reset successfully!', 'success');
    }

    async addToCart(productId) {
        try {
            // Fetch product details from your API :cite[4]
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }
            const product = await response.json();
            
            const existingItem = this.cart.find(item => item.id === productId);
            
            if (existingItem) {
                if (existingItem.quantity >= (product.stock_quantity || product.stock)) {
                    this.showNotification(`Sorry, only ${product.stock_quantity || product.stock} items available in stock`, 'error');
                    return;
                }
                existingItem.quantity += 1;
            } else {
                this.cart.push({
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    image: product.image_url || product.image,
                    quantity: 1,
                    stock: product.stock_quantity || product.stock
                });
            }

            this.saveCart();
            this.updateCartCount();
            this.showNotification('Product added to cart!', 'success');
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('Error adding product to cart', 'error');
        }
    }

    addToWishlist(productId) {
        if (!this.wishlist.includes(productId)) {
            this.wishlist.push(productId);
            localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
            this.showNotification('Added to wishlist!', 'success');
            
            // Update wishlist count in navigation
            const wishlistCount = document.querySelector('.wishlist-count');
            if (wishlistCount) {
                const currentCount = parseInt(wishlistCount.textContent) || 0;
                wishlistCount.textContent = currentCount + 1;
            }
        } else {
            this.showNotification('Already in wishlist', 'info');
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

    setupQuickView() {
        // QuickView modal event listeners
        const quickViewModal = document.getElementById('quickview-modal');
        const quickViewClose = document.getElementById('quickview-close');
        
        if (quickViewClose) {
            quickViewClose.addEventListener('click', () => {
                this.hideQuickView();
            });
        }
        
        // Close modal when clicking outside
        if (quickViewModal) {
            quickViewModal.addEventListener('click', (e) => {
                if (e.target === quickViewModal) {
                    this.hideQuickView();
                }
            });
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && quickViewModal.classList.contains('active')) {
                this.hideQuickView();
            }
        });
    }

    async quickView(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) throw new Error('Product not found');
            
            const product = await response.json();
            this.showQuickView(product);
            
        } catch (error) {
            console.error('Error loading product for QuickView:', error);
            this.showNotification('Error loading product details', 'error');
        }
    }

    showQuickView(product) {
        const modal = document.getElementById('quickview-modal');
        const content = document.getElementById('quickview-content');
        
        if (!modal || !content) return;

        // Map database product to frontend format
        const productData = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            originalPrice: product.original_price ? parseFloat(product.original_price) : null,
            description: product.description,
            image: product.image_url || '../images/products/default.jpg',
            category: product.category,
            stock: product.stock_quantity || 0,
            specifications: product.specifications ? JSON.parse(product.specifications) : {},
            sku: product.sku || `PROD-${product.id}`,
            rating: product.rating || 4.0,
            reviewCount: product.review_count || 0
        };
        content.innerHTML = this.createQuickViewHTML(productData);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    hideQuickView() {
        const modal = document.getElementById('quickview-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    createQuickViewHTML(product) {
        const discount = product.originalPrice ? 
            Math.round((1 - product.price / product.originalPrice) * 100) : 0;

        return `
            <div class="quickview-grid">
                <div class="quickview-images">
                    <div class="main-image">
                        <img src="${product.image}" alt="${product.name}" 
                             onerror="this.src='../images/products/default.jpg'">
                    </div>
                    <div class="quickview-thumbnails">
                        <div class="thumbnail active">
                            <img src="${product.image}" alt="${product.name}"
                                 onerror="this.src='../images/products/default.jpg'">
                        </div>
                        <!-- Additional thumbnails can be added here -->
                    </div>
                </div>
                
                <div class="quickview-info">
                    <h2>${product.name}</h2>
                    
                    <div class="product-rating">
                        <div class="stars">
                            ${this.renderStars(product.rating)}
                        </div>
                        <span class="rating-value">${product.rating}/5</span>
                        <span class="review-count">(${product.reviewCount} reviews)</span>
                    </div>
                    
                    <div class="quickview-price">
                        <span class="current-price">GH₵ ${product.price.toFixed(2)}</span>
                        ${product.originalPrice ? 
                            `<span class="original-price">GH₵ ${product.originalPrice.toFixed(2)}</span>
                             <span class="discount">${discount}% OFF</span>` : ''
                        }
                    </div>
                    
                    <div class="quickview-description">
                        <p>${product.description}</p>
                    </div>
                    
                    ${Object.keys(product.specifications).length > 0 ? `
                    <div class="quickview-specs">
                        <h4>Specifications</h4>
                        <ul>
                            ${Object.entries(product.specifications).map(([key, value]) => `
                                <li><strong>${this.formatSpecKey(key)}:</strong> ${value}</li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <div class="quickview-actions">
                        <button class="btn btn-primary btn-large" 
                                onclick="productsPage.addToCart(${product.id}); productsPage.hideQuickView()">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                        <button class="btn btn-outline btn-large"
                                onclick="window.location.href='arduino-uno/index.html'">
                            <i class="fas fa-external-link-alt"></i> View Full Details
                        </button>
                    </div>
                    
                    <div class="quickview-meta">
                        <div class="meta-item">
                            <i class="fas fa-shipping-fast"></i>
                            <span>Free shipping in Accra &amp; Tema</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-undo"></i>
                            <span>14-day return policy</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-shield-alt"></i>
                            <span>1-year warranty</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-box"></i>
                            <span>SKU: ${product.sku}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-layer-group"></i>
                            <span>Category: ${this.formatCategory(product.category)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize products page
const productsPage = new ProductsPage();