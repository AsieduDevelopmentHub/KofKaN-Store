const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
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