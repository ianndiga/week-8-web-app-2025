const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  detailedDescription: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  specialistsCount: {
    type: Number,
    default: 1
  },
  successRate: {
    type: String,
    default: '95%'
  },
  features: [{
    type: String
  }],
  icon: {
    type: String,
    default: '🏥'
  },
  procedures: [{
    step: Number,
    title: String,
    description: String,
    duration: String
  }],
  requirements: [{
    type: String
  }],
  testimonials: [{
    patientName: String,
    rating: Number,
    comment: String,
    date: Date
  }],
  images: [{
    type: String
  }],
  consultationFee: {
    type: String,
    default: 'Free Consultation'
  },
  insuranceCovered: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes for better performance
serviceSchema.index({ category: 1, active: 1 });
serviceSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Service', serviceSchema);