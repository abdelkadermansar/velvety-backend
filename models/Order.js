const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  image: {
    type: String,
    required: true
  },
  size: String,
  category: String
}, { _id: true });

const shippingAddressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  province: {
    type: String,
    required: true
  },
  postalCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'Canada'
  },
  phone: {
    type: String,
    required: true
  },
  email: String
}, { _id: false });

const paymentResultSchema = new mongoose.Schema({
  id: String,
  status: String,
  update_time: String,
  email_address: String,
  transactionId: String,
  receiptUrl: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  orderItems: [orderItemSchema],
  
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  
  billingAddress: shippingAddressSchema,
  
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'paypal', 'cash_on_delivery']
  },
  
  paymentResult: paymentResultSchema,
  
  itemsPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0.0
  },
  
  taxPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0.0
  },
  
  shippingPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0.0
  },
  
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0.0
  },
  
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  couponCode: String,
  
  isPaid: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  
  paidAt: Date,
  
  isDelivered: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  
  deliveredAt: Date,
  
  status: {
    type: String,
    enum: [
      'pending',           // En attente de paiement
      'processing',        // En cours de traitement
      'confirmed',         // Confirmé
      'shipped',           // Expédié
      'out_for_delivery',  // En cours de livraison
      'delivered',         // Livré
      'cancelled',         // Annulé
      'refunded',          // Remboursé
      'on_hold'            // En attente
    ],
    default: 'pending',
    index: true
  },
  
  trackingNumber: String,
  trackingUrl: String,
  carrier: String,
  
  estimatedDeliveryDate: Date,
  
  notes: String,
  adminNotes: String,
  
  cancellationReason: String,
  refundReason: String,
  
  refundAmount: Number,
  refundedAt: Date,
  
  invoiceUrl: String,
  
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index composé pour les recherches fréquentes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });

// Générer un numéro de commande unique avant la sauvegarde
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
    
    // Vérifier l'unicité
    const existingOrder = await this.constructor.findOne({ orderNumber: this.orderNumber });
    if (existingOrder) {
      // Si le numéro existe déjà, en générer un nouveau
      this.orderNumber = `ORD-${year}${month}${day}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    }
  }
  next();
});

// Mettre à jour les timestamps lors des changements de statut
orderSchema.pre('save', function(next) {
  if (this.isModified('isPaid') && this.isPaid && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  if (this.isModified('isDelivered') && this.isDelivered && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  
  if (this.isModified('status')) {
    if (this.status === 'shipped' && !this.trackingNumber) {
      // Logique pour générer un numéro de suivi si nécessaire
    }
  }
  
  next();
});

// Calculer le nombre d'articles
orderSchema.virtual('totalItems').get(function() {
  return this.orderItems.reduce((acc, item) => acc + item.quantity, 0);
});

// Obtenir le statut en français
orderSchema.virtual('statusText').get(function() {
  const statusMap = {
    'pending': 'En attente',
    'processing': 'En cours',
    'confirmed': 'Confirmé',
    'shipped': 'Expédié',
    'out_for_delivery': 'En livraison',
    'delivered': 'Livré',
    'cancelled': 'Annulé',
    'refunded': 'Remboursé',
    'on_hold': 'En attente'
  };
  return statusMap[this.status] || this.status;
});

// Vérifier si la commande peut être annulée
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'processing'].includes(this.status) && !this.isDelivered;
};

// Vérifier si la commande peut être remboursée
orderSchema.methods.canBeRefunded = function() {
  return ['delivered', 'shipped'].includes(this.status) && this.isPaid && !this.isDelivered;
};

// Calculer le sous-total (sans taxes et frais)
orderSchema.methods.calculateSubtotal = function() {
  return this.orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
};

// Mettre à jour les prix
orderSchema.methods.updatePrices = function() {
  this.itemsPrice = this.calculateSubtotal();
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice - this.discountAmount;
};

// Formater les données pour la facture
orderSchema.methods.getInvoiceData = function() {
  return {
    orderNumber: this.orderNumber,
    date: this.createdAt,
    customer: this.shippingAddress.name,
    email: this.shippingAddress.email,
    items: this.orderItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    })),
    subtotal: this.itemsPrice,
    tax: this.taxPrice,
    shipping: this.shippingPrice,
    discount: this.discountAmount,
    total: this.totalPrice,
    shippingAddress: this.shippingAddress,
    paymentMethod: this.paymentMethod
  };
};

// Middleware pour mettre à jour le stock après sauvegarde
orderSchema.post('save', async function(doc) {
  if (doc.status === 'cancelled' || doc.status === 'refunded') {
    // Si la commande est annulée ou remboursée, remettre le stock
    const Product = mongoose.model('Product');
    for (const item of doc.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: item.quantity }
      });
    }
  }
});

module.exports = mongoose.model('Order', orderSchema);