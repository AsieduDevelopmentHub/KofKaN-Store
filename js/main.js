// Main e-commerce functionality
class KofkanEcommerce {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.loadFeaturedProducts();
        this.loadCategories();
        this.updateCartCount();
        this.setupEventListeners();
        this.loadTestimonials();
        this.setupScrollEffects();
    }

    setupEventListeners() {
        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => this.handleNewsletter(e));
        }

        // Category clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.category-card')) {
                const category = e.target.closest('.category-card').dataset.category;
                window.location.href = `products/index.html?category=${category}`;
            }
        });
    }

    setupScrollEffects() {
        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 100) {
                navbar.style.background = 'var(--bg-primary)';
                navbar.style.backdropFilter = 'blur(10px)';
            } else {
                navbar.style.background = 'var(--bg-primary)';
                navbar.style.backdropFilter = 'none';
            }
        });

        // Fade in animation for elements
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.product-card, .category-card, .feature-card').forEach(el => {
            observer.observe(el);
        });
    }

    async loadFeaturedProducts() {
        const featuredContainer = document.getElementById('featured-products');
        if (!featuredContainer) return;

        try {
            const response = await fetch('/api/products?limit=6');
            const data = await response.json();
            
            if (data.products && data.products.length > 0) {
                featuredContainer.innerHTML = data.products.map(product => this.createProductCard(product)).join('');
            } else {
                featuredContainer.innerHTML = this.getFallbackProducts();
            }
        } catch (error) {
            console.error('Error loading featured products:', error);
            featuredContainer.innerHTML = this.getFallbackProducts();
        }
    }

    async loadCategories() {
        const categoriesContainer = document.getElementById('categories-grid');
        if (!categoriesContainer) return;

        const categories = [
            { name: 'Development Boards', icon: 'fas fa-microchip', slug: 'development-boards', count: '15+ Products' },
            { name: 'Sensors', icon: 'fas fa-wave-square', slug: 'sensors', count: '25+ Products' },
            { name: 'Actuators', icon: 'fas fa-cogs', slug: 'actuators', count: '12+ Products' },
            { name: 'Displays', icon: 'fas fa-tv', slug: 'displays', count: '8+ Products' },
            { name: 'Power Supply', icon: 'fas fa-battery-full', slug: 'power-supply', count: '10+ Products' },
            { name: 'Kits & Bundles', icon: 'fas fa-box-open', slug: 'kits-bundles', count: '5+ Kits' }
        ];

        categoriesContainer.innerHTML = categories.map(category => `
            <div class="category-card" data-category="${category.slug}">
                <div class="category-icon">
                    <i class="${category.icon}"></i>
                </div>
                <h3>${category.name}</h3>
                <p>${category.count}</p>
            </div>
        `).join('');
    }

    createProductCard(product) {
        return `
            <div class="product-card" onclick="window.location.href='/products/product.html?id=${product.id}'">
                ${product.stock_quantity < 10 ? '<span class="product-badge">Low Stock</span>' : ''}
                <img src="${product.image_url || 'images/products/default.jpg'}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="this.src='images/products/default.jpg'">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">${parseFloat(product.price).toFixed(2)}</p>
                <p class="product-description">${product.description?.substring(0, 50)}...</p>
                <div class="product-actions">
                    <button class="btn btn-primary btn-small" onclick="ecommerce.addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-outline btn-small" onclick="ecommerce.addToWishlist(${product.id})">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getFallbackProducts() {
        const fallbackProducts = [
            {
                id: 1,
                name: "Arduino Uno R3",
                price: "89.99",
                description: "The perfect board for beginners and experienced users alike with 14 digital I/O pins.",
                image_url: "images/products/arduino-uno.jpg",
                stock_quantity: 25
            },
            {
                id: 2,
                name: "ESP32 Development Board",
                price: "75.99",
                description: "Feature-rich IoT development board with WiFi and Bluetooth capabilities.",
                image_url: "images/products/esp32-board.jpg",
                stock_quantity: 30
            },
            {
                id: 3,
                name: "Sensor Starter Kit",
                price: "149.99",
                description: "Complete sensor kit with 15 different sensors for various applications.",
                image_url: "images/products/sensor-kit.jpg",
                stock_quantity: 15
            }
        ];

        return fallbackProducts.map(product => this.createProductCard(product)).join('');
    }

    loadTestimonials() {
        const testimonialsContainer = document.getElementById('testimonials-grid');
        if (!testimonialsContainer) return;

        const testimonials = [
            {
                text: "KofKaN-Technologies has been my go-to for all my electronics projects. Fast delivery across Accra and quality products!",
                author: "Kwame Asare",
                location: "Accra",
                avatar: "KA"
            },
            {
                text: "The Arduino kits are excellent quality and the customer service is top-notch. Highly recommended for students and professionals.",
                author: "Ama Serwaa",
                location: "Kumasi",
                avatar: "AS"
            },
            {
                text: "Great prices and fast shipping to Takoradi. My components always arrive well-packaged and in perfect condition.",
                author: "Kofi Mensah",
                location: "Takoradi",
                avatar: "KM"
            }
        ];

        testimonialsContainer.innerHTML = testimonials.map(testimonial => `
            <div class="testimonial-card">
                <p class="testimonial-text">"${testimonial.text}"</p>
                <div class="testimonial-author">
                    <div class="author-avatar">${testimonial.avatar}</div>
                    <div class="author-info">
                        <h4>${testimonial.author}</h4>
                        <p>${testimonial.location}, Ghana</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async addToCart(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`);
            const product = await response.json();
            
            const existingItem = this.cart.find(item => item.id === productId);
            
            if (existingItem) {
                if (existingItem.quantity >= product.stock_quantity) {
                    this.showNotification('Sorry, only ' + product.stock_quantity + ' items available in stock', 'error');
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
                    stock: product.stock_quantity
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

    async handleNewsletter(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const button = form.querySelector('button');
        
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="loading-spinner"></div> Subscribing...';
        button.disabled = true;

        // Simulate API call
        setTimeout(() => {
            this.showNotification('Thank you for subscribing to our newsletter!', 'success');
            form.reset();
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }

    showNotification(message, type = 'info') {
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

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
}

// Initialize ecommerce functionality
const ecommerce = new KofkanEcommerce();