const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  createOrder,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  cancelOrder,
  getOrderStats
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

// Validation
const orderValidation = [
  body('orderItems').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  body('itemsPrice').isNumeric().withMessage('Items price must be a number'),
  body('totalPrice').isNumeric().withMessage('Total price must be a number')
];

// Protected routes (user)
router.post('/', protect, orderValidation, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/cancel', protect, cancelOrder);

// Admin routes
router.get('/', protect, admin, getOrders);
router.get('/stats/all', protect, admin, getOrderStats);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);

module.exports = router;