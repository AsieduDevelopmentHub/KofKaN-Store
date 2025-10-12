// Static components loader and theme management
class StaticComponents {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.loadTheme();
        this.loadNavigation();
        this.loadMobileNav();
        this.loadFooter();
        this.setupEventListeners();
    }

    loadTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeToggle();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeToggle();
    }

    updateThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }
    }

    loadNavigation() {
        const navContainer = document.querySelector('.navbar .nav-container');
        if (navContainer && !document.querySelector('.nav-menu')) {
            navContainer.innerHTML = `
                <div class="nav-logo">
                    <a href="/index.html">
                    <img src="/images/logos/logo.jpg" alt="KofKaN-Technologies Logo" class="logo-image">
                    KofKaN-Technologies
                    </a>
                </div>
                <ul class="nav-menu">
                    <li class="nav-item">
                        <a href="/index.html" class="nav-link">
                            <i class="fas fa-home"></i>Home
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/products/index.html" class="nav-link">
                            <i class="fas fa-box"></i>Products
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="https://kofkantechnologies.com/about.html" target="_blank" class="nav-link">
                            <i class="fas fa-info-circle"></i>About
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/contact/index.html" class="nav-link">
                            <i class="fas fa-envelope"></i>Contact
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/account/index.html" class="nav-link cart-link">
                            <i class="fas fa-user"></i>Account
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/wishlist/index.html" class="nav-link cart-link">
                            <i class="fas fa-heart"></i>Wishlist <span class="wishlist-count">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="/cart/index.html" class="nav-link cart-link">
                            <i class="fas fa-shopping-cart"></i>Cart <span class="cart-count">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <button class="theme-toggle">
                            <i class="fas ${this.currentTheme === 'light' ? 'fa-sun' : 'fa-moon'}"></i>
                        </button>
                    </li>
                </ul>
                <div class="hamburger">
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                </div>
            `;
        }
    }

    loadMobileNav() {
        const mobileNavContainer = document.querySelector('.mobile-nav');
        if (mobileNavContainer) {
            mobileNavContainer.innerHTML = `
                <ul class="mobile-nav-items">
                    <li>
                        <a href="/index.html" class="mobile-nav-link active" data-page="home">
                            <i class="fas fa-home mobile-nav-icon"></i>
                            <span>Home</span>
                        </a>
                    </li>
                    <li>
                        <a href="/products/index.html" class="mobile-nav-link" data-page="products">
                            <i class="fas fa-box mobile-nav-icon"></i>
                            <span>Products</span>
                        </a>
                    </li>
                    <li>
                        <a href="/cart/index.html" class="mobile-nav-link" data-page="cart">
                            <i class="fas fa-shopping-cart mobile-nav-icon"></i>
                            <span>Cart</span>
                        </a>
                    </li>
                    <li>
                        <a href="/wishlist/index.html" class="mobile-nav-link" data-page="wishlist">
                            <i class="fas fa-heart mobile-nav-icon"></i>
                            <span>Wishlist</span>
                        </a>
                    </li>
                    <li>
                        <a href="/account/index.html" class="mobile-nav-link" data-page="account">
                            <i class="fas fa-user mobile-nav-icon"></i>
                            <span>Account</span>
                        </a>
                    </li>
                </ul>
            `;
        }
    }

    loadFooter() {
        const footerContainer = document.querySelector('.footer .container');
        if (footerContainer && !document.querySelector('.footer-content')) {
            footerContainer.innerHTML = `
                <div class="footer-content">
                    <div class="footer-section">
                        <h3>KofKaN-Technologies</h3>
                        <p>Your trusted partner in electronics and mechatronics components across Ghana.</p>
                        <div class="social-links">
                            <a href="#"><i class="fab fa-facebook"></i></a>
                            <a href="#"><i class="fab fa-twitter"></i></a>
                            <a href="#"><i class="fab fa-instagram"></i></a>
                            <a href="#"><i class="fab fa-linkedin"></i></a>
                        </div>
                    </div>
                    <div class="footer-section">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><a href="/index.html">Home</a></li>
                            <li><a href="/products/index.html">Products</a></li>
                            <li><a href="/about/index.html">About Us</a></li>
                            <li><a href="/contact/index.html">Contact</a></li>
                            <li><a href="#">Track Order</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Categories</h4>
                        <ul>
                            <li><a href="/products/index.html?category=development-boards">Development Boards</a></li>
                            <li><a href="/products/index.html?category=sensors">Sensors</a></li>
                            <li><a href="/products/index.html?category=actuators">Actuators</a></li>
                            <li><a href="/products/index.html?category=kits-bundles">Kits & Bundles</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Contact Info</h4>
                        <p><i class="fas fa-map-marker-alt"></i> Accra, Ghana</p>
                        <p><i class="fas fa-phone"></i> +233 55 078 3777</p>
                        <p><i class="fas fa-envelope"></i> info@kofkan-technologies.com</p>
                        <p><i class="fas fa-clock"></i> Mon-Fri: 8:00 AM - 6:00 PM</p>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2024 KofKaN-Technologies. All rights reserved. | Serving Ghana with Quality Electronics</p>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Hamburger menu
        document.addEventListener('click', (e) => {
            if (e.target.closest('.hamburger')) {
                const hamburger = e.target.closest('.hamburger');
                const navMenu = document.querySelector('.nav-menu');
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            }
        });

        // Theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle')) {
                this.toggleTheme();
            }
        });

        // Close mobile menu when clicking on links
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link')) {
                const hamburger = document.querySelector('.hamburger');
                const navMenu = document.querySelector('.nav-menu');
                if (hamburger && navMenu) {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            }
        });

        // Active link highlighting
        this.highlightActiveLink();
    }

    highlightActiveLink() {
        const currentPage = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && currentPage.includes(href.replace('../', ''))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

// Initialize static components
const staticComponents = new StaticComponents();