const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  addAddress,
  updateAddress,
  deleteAddress,
  addToWishlist,
  removeFromWishlist,
  getWishlist
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

// Address validation
const addressValidation = [
  body('name').notEmpty().withMessage('Recipient name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('province').notEmpty().withMessage('Province is required'),
  body('postalCode').notEmpty().withMessage('Postal code is required'),
  body('phone').notEmpty().withMessage('Phone number is required')
];

// Protected routes (user)
router.use(protect);

// Address routes
router.post('/addresses', addressValidation, addAddress);
router.put('/addresses/:addressId', addressValidation, updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

// Wishlist routes
router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

// Admin only routes
router.get('/', admin, getUsers);
router.get('/:id', admin, getUserById);
router.put('/:id', admin, updateUser);
router.delete('/:id', admin, deleteUser);

module.exports = router;