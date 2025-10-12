const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
// Authentication API Routes
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MySQL Database Connection for XAMPP
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kofkan_technologies',
    charset: 'utf8mb4'
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        // Retry connection after 5 seconds
        setTimeout(() => {
            console.log('Retrying database connection...');
            db.connect();
        }, 5000);
        return;
    }
    console.log('Connected to MySQL database (XAMPP)');
});

// API Routes - Products
app.get('/api/products', (req, res) => {
    const { category, search, page = 1, limit = 12 } = req.query;
    let query = `
        SELECT p.*, 
               GROUP_CONCAT(DISTINCT c.name SEPARATOR ', ') as categories
        FROM products p
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE p.active = TRUE
    `;
    
    const params = [];
    
    if (category) {
        query += ' AND c.slug = ?';
        params.push(category);
    }
    
    if (search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
    }
    
    query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), offset);
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Failed to fetch products' });
            return;
        }
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(DISTINCT p.id) as total FROM products p LEFT JOIN product_categories pc ON p.id = pc.product_id LEFT JOIN categories c ON pc.category_id = c.id WHERE p.active = TRUE';
        const countParams = [];
        
        if (category) {
            countQuery += ' AND c.slug = ?';
            countParams.push(category);
        }
        
        if (search) {
            countQuery += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm);
        }
        
        db.query(countQuery, countParams, (countErr, countResults) => {
            if (countErr) {
                res.json({
                    products: results,
                    pagination: { page, limit, total: results.length }
                });
                return;
            }
            
            res.json({
                products: results,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResults[0].total,
                    pages: Math.ceil(countResults[0].total / limit)
                }
            });
        });
    });
});

app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    
    const query = `
        SELECT p.*, 
               GROUP_CONCAT(DISTINCT c.name SEPARATOR ', ') as categories,
               GROUP_CONCAT(DISTINCT c.slug) as category_slugs
        FROM products p
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE p.id = ? AND p.active = TRUE
        GROUP BY p.id
    `;
    
    db.query(query, [productId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        
        // Parse JSON specifications if they exist
        const product = results[0];
        if (product.specifications) {
            try {
                product.specifications = JSON.parse(product.specifications);
            } catch (e) {
                product.specifications = {};
            }
        }
        
        res.json(product);
    });
});

// Categories API
app.get('/api/categories', (req, res) => {
    const query = 'SELECT * FROM categories WHERE active = TRUE ORDER BY name';
    
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Orders API
app.post('/api/orders', (req, res) => {
    const { customer, cart, totalAmount, shippingAddress } = req.body;
    
    // Generate unique order number
    const orderNumber = 'KOF' + Date.now();
    
    const orderQuery = `
        INSERT INTO orders 
        (order_number, total_amount, customer_email, customer_phone, shipping_address, billing_address) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const orderParams = [
        orderNumber,
        totalAmount,
        customer.email,
        customer.phone,
        JSON.stringify(shippingAddress),
        JSON.stringify(shippingAddress) // Using same as billing for now
    ];
    
    db.query(orderQuery, orderParams, (err, result) => {
        if (err) {
            console.error('Order creation error:', err);
            res.status(500).json({ error: 'Failed to create order' });
            return;
        }
        
        const orderId = result.insertId;
        
        // Insert order items
        const orderItemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ?';
        const orderItemsValues = cart.map(item => [
            orderId,
            item.id,
            item.quantity,
            item.price,
            (item.price * item.quantity)
        ]);
        
        db.query(orderItemsQuery, [orderItemsValues], (itemsErr) => {
            if (itemsErr) {
                console.error('Order items error:', itemsErr);
                res.status(500).json({ error: 'Failed to create order items' });
                return;
            }
            
            res.json({
                orderId,
                orderNumber,
                success: true
            });
        });
    });
});

// Paystack Payment Integration
app.post('/api/initialize-payment', async (req, res) => {
    const { email, amount, orderId, orderNumber } = req.body;
    
    try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                amount: amount * 100, // Convert to kobo
                reference: orderNumber,
                metadata: {
                    order_id: orderId,
                    order_number: orderNumber
                },
                callback_url: `${req.headers.origin}/order-confirmation/index.html`
            })
        });

        const data = await response.json();
        
        if (data.status) {
            // Update order with Paystack reference
            const updateQuery = 'UPDATE orders SET paystack_reference = ? WHERE id = ?';
            db.query(updateQuery, [data.data.reference, orderId]);
        }
        
        res.json(data);
    } catch (error) {
        console.error('Paystack error:', error);
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

// Verify Payment
app.get('/api/verify-payment/:reference', async (req, res) => {
    const { reference } = req.params;
    
    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        });

        const data = await response.json();
        
        if (data.status && data.data.status === 'success') {
            // Update order status
            const updateQuery = 'UPDATE orders SET payment_status = "successful", status = "paid" WHERE paystack_reference = ?';
            db.query(updateQuery, [reference]);
            
            // Update inventory
            const inventoryQuery = `
                UPDATE products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                SET p.stock_quantity = p.stock_quantity - oi.quantity
                WHERE o.paystack_reference = ?
            `;
            db.query(inventoryQuery, [reference]);
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Order Details
app.get('/api/orders/:orderNumber', (req, res) => {
    const { orderNumber } = req.params;
    
    const orderQuery = `
        SELECT o.*, 
               JSON_ARRAYAGG(
                   JSON_OBJECT(
                       'product_id', oi.product_id,
                       'name', p.name,
                       'quantity', oi.quantity,
                       'unit_price', oi.unit_price,
                       'total_price', oi.total_price,
                       'image_url', p.image_url
                   )
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.order_number = ?
        GROUP BY o.id
    `;
    
    db.query(orderQuery, [orderNumber], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        const order = results[0];
        try {
            order.items = JSON.parse(order.items);
            order.shipping_address = JSON.parse(order.shipping_address || '{}');
            order.billing_address = JSON.parse(order.billing_address || '{}');
        } catch (e) {
            order.items = [];
            order.shipping_address = {};
            order.billing_address = {};
        }
        
        res.json(order);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    db.query('SELECT 1', (err) => {
        if (err) {
            res.status(500).json({ status: 'Database connection failed' });
            return;
        }
        res.json({ status: 'OK', database: 'Connected' });
    });
});

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
    const { first_name, last_name, email, phone, password, newsletter } = req.body;

    try {
        // Check if user already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
                if (err) reject(err);
                resolve(results[0]);
            });
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
                field: 'email'
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Generate verification token
        const verificationToken = require('crypto').randomBytes(32).toString('hex');

        // Create user
        const userQuery = `
            INSERT INTO users (first_name, last_name, email, phone, password_hash, verification_token)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const result = await new Promise((resolve, reject) => {
            db.query(userQuery, [first_name, last_name, email, phone, passwordHash, verificationToken], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });

        // Create user preferences
        const preferencesQuery = `
            INSERT INTO user_preferences (user_id, newsletter_subscribed, marketing_emails)
            VALUES (?, ?, ?)
        `;

        await new Promise((resolve, reject) => {
            db.query(preferencesQuery, [result.insertId, newsletter, newsletter], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });

        // Send verification email (implementation depends on your email service)
        // await sendVerificationEmail(email, verificationToken);

        res.json({
            success: true,
            message: 'User created successfully. Please check your email for verification.'
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Signin endpoint
app.post('/api/auth/signin', async (req, res) => {
    const { email, password, remember_me } = req.body;

    try {
        // Find user
        const userQuery = `
            SELECT u.*, up.newsletter_subscribed, up.theme_preference 
            FROM users u 
            LEFT JOIN user_preferences up ON u.id = up.user_id 
            WHERE u.email = ?
        `;

        const user = await new Promise((resolve, reject) => {
            db.query(userQuery, [email], (err, results) => {
                if (err) reject(err);
                resolve(results[0]);
            });
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is locked
        if (user.account_locked) {
            return res.status(401).json({
                success: false,
                message: 'Account is locked. Please contact support.'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            // Increment login attempts
            const newAttempts = user.login_attempts + 1;
            const lockAccount = newAttempts >= 5;

            await new Promise((resolve, reject) => {
                db.query(
                    'UPDATE users SET login_attempts = ?, account_locked = ? WHERE id = ?',
                    [newAttempts, lockAccount, user.id],
                    (err, results) => {
                        if (err) reject(err);
                        resolve(results);
                    }
                );
            });

            return res.status(401).json({
                success: false,
                message: lockAccount 
                    ? 'Account locked due to too many failed attempts' 
                    : 'Invalid email or password'
            });
        }

        // Reset login attempts on successful login
        await new Promise((resolve, reject) => {
            db.query(
                'UPDATE users SET login_attempts = 0, last_login = NOW() WHERE id = ?',
                [user.id],
                (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                }
            );
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: remember_me ? '30d' : '1d' }
        );

        // Remove sensitive data
        const { password_hash, verification_token, reset_token, ...safeUser } = user;

        res.json({
            success: true,
            user: safeUser,
            token
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Middleware to verify token
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if token exists in database (optional for logout functionality)
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Verification endpoint
// app.get('/api/auth/verify', verifyToken, (req, res) => {
//     res.json({ 
//         valid: true, 
//         user: {
//             id: req.user._id,
//             first_name: req.user.first_name,
//             last_name: req.user.last_name,
//             email: req.user.email
//         }
//     });
// });

// Protected route example
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    const userQuery = `
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, 
               u.email_verified, u.created_at, up.newsletter_subscribed, up.theme_preference
        FROM users u 
        LEFT JOIN user_preferences up ON u.id = up.user_id 
        WHERE u.id = ?
    `;

    db.query(userQuery, [req.user.userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: results[0] });
    });
});


// Get user profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const userQuery = `
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, 
               u.email_verified, u.date_of_birth, u.gender, u.created_at,
               up.newsletter_subscribed, up.theme_preference, up.language, up.currency
        FROM users u 
        LEFT JOIN user_preferences up ON u.id = up.user_id 
        WHERE u.id = ?
    `;

    db.query(userQuery, [req.user.userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: results[0] });
    });
});

// Update user profile
app.put('/api/user/profile', authenticateToken, (req, res) => {
    const { first_name, last_name, phone, date_of_birth, gender } = req.body;
    
    const updateQuery = `
        UPDATE users 
        SET first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, gender = ?, updated_at = NOW()
        WHERE id = ?
    `;

    db.query(updateQuery, [first_name, last_name, phone, date_of_birth, gender, req.user.userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        // Get updated user data
        const userQuery = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, 
                   u.email_verified, u.date_of_birth, u.gender, u.created_at,
                   up.newsletter_subscribed, up.theme_preference
            FROM users u 
            LEFT JOIN user_preferences up ON u.id = up.user_id 
            WHERE u.id = ?
        `;

        db.query(userQuery, [req.user.userId], (err, userResults) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ 
                success: true,
                user: userResults[0] 
            });
        });
    });
});

// Get user addresses
app.get('/api/user/addresses', authenticateToken, (req, res) => {
    const addressesQuery = `
        SELECT * FROM addresses 
        WHERE user_id = ? 
        ORDER BY is_default DESC, created_at DESC
    `;

    db.query(addressesQuery, [req.user.userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json({ addresses: results });
    });
});

// Add new address
app.post('/api/user/addresses', authenticateToken, (req, res) => {
    const { address_type, street_address, city, region, postal_code, landmark, is_default } = req.body;
    
    // If this is set as default, update other addresses
    if (is_default) {
        db.query(
            'UPDATE addresses SET is_default = FALSE WHERE user_id = ?',
            [req.user.userId],
            (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ message: 'Database error' });
                }
            }
        );
    }

    const insertQuery = `
        INSERT INTO addresses (user_id, address_type, street_address, city, region, postal_code, landmark, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [
        req.user.userId, address_type, street_address, city, region, postal_code, landmark, is_default
    ], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json({ 
            success: true,
            message: 'Address added successfully',
            addressId: results.insertId
        });
    });
});

// Get user orders
app.get('/api/user/orders', authenticateToken, (req, res) => {
    const { status, period } = req.query;
    
    let ordersQuery = `
        SELECT o.*, COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.customer_email = ?
    `;

    const params = [req.user.email];

    // Add status filter
    if (status && status !== 'all') {
        ordersQuery += ' AND o.status = ?';
        params.push(status);
    }

    // Add time period filter
    if (period && period !== 'all') {
        const days = parseInt(period);
        ordersQuery += ' AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
        params.push(days);
    }

    ordersQuery += ' GROUP BY o.id ORDER BY o.created_at DESC';

    db.query(ordersQuery, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json({ orders: results });
    });
});

// Get user stats
app.get('/api/user/stats', authenticateToken, (req, res) => {
    const statsQuery = `
        SELECT 
            (SELECT COUNT(*) FROM orders WHERE customer_email = ?) as total_orders,
            (SELECT COUNT(*) FROM orders WHERE customer_email = ? AND status = 'pending') as pending_orders,
            (SELECT COUNT(*) FROM orders WHERE customer_email = ? AND status = 'shipped') as shipped_orders,
            (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_email = ? AND payment_status = 'successful') as total_spent
    `;

    db.query(statsQuery, [req.user.email, req.user.email, req.user.email, req.user.email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json({ stats: results[0] });
    });
});

// Serve HTML files
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, req.path, 'index.html');
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log(`KofKaN-Technologies server running on port ${PORT}`);
    console.log(`Database: ${process.env.DB_NAME || 'kofkan_technologies'}`);
    console.log(`Access the site: http://localhost:${PORT}`);
});