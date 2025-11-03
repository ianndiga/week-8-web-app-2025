const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    ref: 'Patient'
  },
  type: {
    type: String,
    enum: ['insurance', 'cash', 'bank', 'mobile', 'credit', 'debit'],
    required: true
  },
  provider: String,
  accountNumber: String,
  cardType: String,
  expiryDate: String,
  isPrimary: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);