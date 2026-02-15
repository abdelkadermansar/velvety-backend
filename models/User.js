const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  name: {
    type: String,
    required: [true, 'Please add a recipient name']
  },
  address: {
    type: String,
    required: [true, 'Please add a street address']
  },
  city: {
    type: String,
    required: [true, 'Please add a city']
  },
  province: {
    type: String,
    required: [true, 'Please add a province/state']
  },
  postalCode: {
    type: String,
    required: [true, 'Please add a postal code']
  },
  country: {
    type: String,
    required: [true, 'Please add a country'],
    default: 'Canada'
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    match: [
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
      'Please add a valid phone number'
    ]
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  addresses: [addressSchema],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get default address
userSchema.methods.getDefaultAddress = function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

// Get full address as string
userSchema.methods.getAddressString = function(addressId) {
  const address = this.addresses.id(addressId);
  if (!address) return '';
  
  return `${address.address}, ${address.city}, ${address.province} ${address.postalCode}, ${address.country}`;
};

// Virtual for order count (populated separately)
userSchema.virtual('orderCount', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'user',
  count: true
});

// Virtual for total spent (populated separately)
userSchema.virtual('totalSpent', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'user',
  match: { isPaid: true }
});

// Ensure only one default address
userSchema.pre('save', function(next) {
  const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
  
  if (defaultAddresses.length > 1) {
    // If multiple defaults, keep only the last one as default
    this.addresses.forEach((addr, index) => {
      addr.isDefault = index === this.addresses.length - 1;
    });
  }
  
  // If no default address but addresses exist, set first as default
  if (defaultAddresses.length === 0 && this.addresses.length > 0) {
    this.addresses[0].isDefault = true;
  }
  
  next();
});

// Remove sensitive info when converting to JSON
userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpire;
    delete ret.emailVerificationToken;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);