const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price images countInStock description');

    if (!cart) {
      cart = await Cart.create({ 
        user: req.user._id, 
        items: [],
        totalPrice: 0,
        totalItems: 0
      });
    }

    res.json({
      success: true,
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required' 
      });
    }

    // Vérifier si le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    // Vérifier le stock
    if (product.countInStock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Not enough stock. Only ${product.countInStock} available` 
      });
    }

    // Trouver ou créer le panier
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ 
        user: req.user._id, 
        items: [] 
      });
    }

    // Vérifier si le produit est déjà dans le panier
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    const productImage = product.images && product.images.length > 0 
      ? product.images.find(img => img.isMain)?.url || product.images[0].url 
      : '/placeholder.jpg';

    if (existingItemIndex > -1) {
      // Mettre à jour la quantité
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Vérifier le stock pour la nouvelle quantité
      if (product.countInStock < newQuantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot add ${quantity} more. Only ${product.countInStock} available` 
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Ajouter un nouvel item
      cart.items.push({
        product: productId,
        name: product.name,
        price: product.price,
        quantity,
        image: productImage,
        size: product.size,
        category: product.category
      });
    }

    // Sauvegarder le panier (les hooks pre-save calculeront totalItems et totalPrice)
    await cart.save();

    // Récupérer le panier avec les produits populés
    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images countInStock description');

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      cart: {
        _id: populatedCart._id,
        items: populatedCart.items,
        totalItems: populatedCart.totalItems,
        totalPrice: populatedCart.totalPrice
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.productId;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be at least 1' 
      });
    }

    // Vérifier si le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    // Vérifier le stock
    if (product.countInStock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Not enough stock. Only ${product.countInStock} available` 
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    // Trouver l'item dans le panier
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in cart' 
      });
    }

    // Mettre à jour la quantité
    cart.items[itemIndex].quantity = quantity;
    
    // Sauvegarder le panier
    await cart.save();

    // Récupérer le panier avec les produits populés
    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images countInStock description');

    res.json({
      success: true,
      message: 'Cart updated',
      cart: {
        _id: populatedCart._id,
        items: populatedCart.items,
        totalItems: populatedCart.totalItems,
        totalPrice: populatedCart.totalPrice
      }
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    // Filtrer pour enlever l'item
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    // Sauvegarder le panier
    await cart.save();

    // Récupérer le panier avec les produits populés
    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images countInStock description');

    res.json({
      success: true,
      message: 'Item removed from cart',
      cart: {
        _id: populatedCart._id,
        items: populatedCart.items,
        totalItems: populatedCart.totalItems,
        totalPrice: populatedCart.totalPrice
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    // Vider le panier
    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared',
      cart: {
        _id: cart._id,
        items: [],
        totalItems: 0,
        totalPrice: 0
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Get cart summary (for checkout)
// @route   GET /api/cart/summary
// @access  Private
const getCartSummary = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price images countInStock');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cart is empty' 
      });
    }

    // Vérifier la disponibilité des produits
    const unavailableItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || product.countInStock < item.quantity) {
        unavailableItems.push({
          name: item.name,
          available: product ? product.countInStock : 0,
          requested: item.quantity
        });
      }
    }

    if (unavailableItems.length > 0) {
      return res.json({
        success: false,
        message: 'Some items are unavailable',
        unavailableItems
      });
    }

    // Calculer les totaux
    const subtotal = cart.totalPrice;
    const taxRate = 0.05; // 5% TVA
    const taxAmount = subtotal * taxRate;
    const shippingCost = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + taxAmount + shippingCost;

    res.json({
      success: true,
      summary: {
        items: cart.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: Number(subtotal.toFixed(2)),
        taxRate: taxRate * 100 + '%',
        taxAmount: Number(taxAmount.toFixed(2)),
        shippingCost: Number(shippingCost.toFixed(2)),
        total: Number(total.toFixed(2)),
        itemCount: cart.totalItems
      }
    });
  } catch (error) {
    console.error('Cart summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Merge guest cart with user cart (after login)
// @route   POST /api/cart/merge
// @access  Private
const mergeCart = async (req, res) => {
  try {
    const { guestCartItems } = req.body;

    if (!guestCartItems || !Array.isArray(guestCartItems) || guestCartItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No guest cart items provided' 
      });
    }

    // Récupérer le panier de l'utilisateur
    let userCart = await Cart.findOne({ user: req.user._id });

    if (!userCart) {
      userCart = new Cart({ 
        user: req.user._id, 
        items: [] 
      });
    }

    // Fusionner les paniers
    for (const guestItem of guestCartItems) {
      const product = await Product.findById(guestItem.productId);
      
      if (!product || product.countInStock === 0) continue;

      const existingItem = userCart.items.find(
        item => item.product.toString() === guestItem.productId
      );

      if (existingItem) {
        // Ajouter les quantités sans dépasser le stock
        const totalQty = existingItem.quantity + (guestItem.quantity || 1);
        existingItem.quantity = Math.min(totalQty, product.countInStock);
      } else {
        // Ajouter le nouvel item
        userCart.items.push({
          product: guestItem.productId,
          name: product.name,
          price: product.price,
          quantity: Math.min(guestItem.quantity || 1, product.countInStock),
          image: product.images?.[0]?.url || '/placeholder.jpg',
          category: product.category
        });
      }
    }

    // Sauvegarder
    await userCart.save();

    // Récupérer le panier fusionné
    const mergedCart = await Cart.findById(userCart._id)
      .populate('items.product', 'name price images countInStock');

    res.json({
      success: true,
      message: 'Carts merged successfully',
      cart: {
        _id: mergedCart._id,
        items: mergedCart.items,
        totalItems: mergedCart.totalItems,
        totalPrice: mergedCart.totalPrice
      }
    });
  } catch (error) {
    console.error('Merge cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Validate cart before checkout
// @route   POST /api/cart/validate
// @access  Private
const validateCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price countInStock');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cart is empty' 
      });
    }

    const validationResults = {
      valid: true,
      items: [],
      total: cart.totalPrice,
      messages: []
    };

    for (const item of cart.items) {
      const product = item.product;
      
      if (!product) {
        validationResults.valid = false;
        validationResults.items.push({
          name: item.name,
          valid: false,
          message: 'Product no longer exists'
        });
        continue;
      }

      if (product.countInStock < item.quantity) {
        validationResults.valid = false;
        validationResults.items.push({
          name: item.name,
          valid: false,
          available: product.countInStock,
          requested: item.quantity,
          message: `Only ${product.countInStock} available`
        });
      } else {
        validationResults.items.push({
          name: item.name,
          valid: true,
          quantity: item.quantity,
          price: item.price
        });
      }
    }

    if (!validationResults.valid) {
      validationResults.messages.push('Some items in your cart are no longer available');
    }

    res.json({
      success: true,
      validation: validationResults
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  mergeCart,
  validateCart
};