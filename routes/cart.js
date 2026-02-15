const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  mergeCart,
  validateCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// Validation
const addToCartValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const updateCartValidation = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// All cart routes are protected
router.use(protect);

router.get('/', getCart);
router.get('/summary', getCartSummary);
router.get('/validate', validateCart);

router.post('/items', addToCartValidation, addToCart);
router.post('/merge', mergeCart);

router.put('/items/:productId', updateCartValidation, updateCartItem);

router.delete('/items/:productId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;