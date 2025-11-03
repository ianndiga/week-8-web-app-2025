const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  // Basic Information
  patientId: {
    type: String,
    required: true,
    unique: true,
    default: () => generatePatientId()
    // Removed: index: true (duplicate with schema.index below)
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  idNumber: {
    type: String,
    required: true,
    unique: true
    // Removed: index: true (covered by composite index below)
  },
  
  // Contact Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
    // Removed: index: true (covered by composite index below)
  },
  phone: {
    type: String,
    required: true
  },
  alternatePhone: String,
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  postalCode: String,
  
  // Medical Information - UPDATED BLOOD TYPE
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
    set: function(bloodType) {
      if (!bloodType || bloodType === 'Unknown' || bloodType === '') {
        return 'Unknown';
      }
      return bloodType.toUpperCase();
    },
    default: 'Unknown'
  },
  
  // Enhanced Medical History (from first schema)
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic']
    },
    notes: String
  }],
  
  // Enhanced Allergies (from first schema)
  allergies: [{
    allergen: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    reaction: String
  }],
  
  // Enhanced Medications (from first schema)
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String,
    prescribedDate: Date,
    prescribingDoctor: String
  }],
  
  // Legacy fields (kept for backward compatibility)
  medicalConditionsText: String,
  familyHistory: String,
  allergiesText: String,
  currentMedicationsText: String,
  
  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true
    }
  },
  
  // Insurance & Payment
  paymentMethod: {
    type: String,
    required: true,
    enum: ['insurance', 'sha', 'cash', 'bank', 'mobile', 'credit', 'debit', 'other']
  },
  
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String
  },
  
  // Additional insurance fields (from second schema)
  insuranceProvider: String,
  policyNumber: String,
  
  // User Account Reference (from first schema)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status & Metadata
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Additional Fields
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed', '']
  },
  nationality: String,
  occupation: String,
  employer: String,
  
  // Medical Preferences
  preferredLanguage: {
    type: String,
    default: 'English'
  },
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    phone: { type: Boolean, default: true }
  },
  
  // Consent & Privacy
  consentToTreat: {
    type: Boolean,
    default: false
  },
  privacyPolicyAccepted: {
    type: Boolean,
    default: false
  },
  termsAccepted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Indexes for faster queries - KEEP THESE (removed duplicates from field definitions)
patientSchema.index({ email: 1, idNumber: 1 });           // Composite index
patientSchema.index({ patientId: 1 });                   // Single field index
patientSchema.index({ lastName: 1, firstName: 1 });      // Name search index
patientSchema.index({ 'emergencyContact.phone': 1 });    // Emergency contact search
patientSchema.index({ status: 1 });                      // Status filter
patientSchema.index({ createdAt: -1 });                  // Recent patients

// Method to check if patient is minor
patientSchema.methods.isMinor = function() {
  return this.age < 18;
};

// Method to get active medical conditions
patientSchema.methods.getActiveConditions = function() {
  return this.medicalHistory.filter(condition => 
    condition.status === 'active' || condition.status === 'chronic'
  );
};

// Static method to find by email or phone
patientSchema.statics.findByEmailOrPhone = function(email, phone) {
  return this.findOne({
    $or: [
      { email: email },
      { phone: phone }
    ]
  });
};

// Static method to generate patient ID
patientSchema.statics.generatePatientId = function() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAT${timestamp}${random}`;
};

// Helper function to generate patient ID (for default value)
function generatePatientId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAT${timestamp}${random}`;
}

// Pre-save middleware to generate patient ID if not provided
patientSchema.pre('save', function(next) {
  if (!this.patientId) {
    this.patientId = generatePatientId();
  }
  
  // Convert simple text fields to arrays if needed
  if (this.allergiesText && this.allergies.length === 0) {
    this.allergies = this.allergiesText.split(',').map(allergy => ({
      allergen: allergy.trim(),
      severity: 'moderate',
      reaction: 'Not specified'
    }));
  }

  // Handle medical conditions text
  if (this.medicalConditionsText && this.medicalHistory.length === 0) {
    this.medicalHistory = this.medicalConditionsText.split(',').map(condition => ({
      condition: condition.trim(),
      status: 'active',
      diagnosedDate: new Date()
    }));
  }

  // Handle current medications text
  if (this.currentMedicationsText && this.currentMedications.length === 0) {
    this.currentMedications = this.currentMedicationsText.split(',').map(medication => ({
      name: medication.trim(),
      dosage: 'As prescribed',
      frequency: 'Daily'
    }));
  }

  // Normalize blood type before saving (additional safety)
  if (this.bloodType && this.bloodType !== 'Unknown') {
    this.bloodType = this.bloodType.toUpperCase();
  }
  
  next();
});

// Ensure virtual fields are serialized
patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Patient', patientSchema);