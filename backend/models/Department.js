const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Visual Representation
  icon: {
    type: String,
    required: true,
    default: '🏥'
  },
  
  // Leadership
  headOfDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  headDoctor: { // Alternative field for compatibility
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  
  // Contact Information
  contact: {
    phone: String,
    email: String,
    location: String,
    floor: String
  },
  
  // Alternative contact fields for compatibility
  contactEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String
  },
  location: {
    type: String
  },
  
  // Services
  services: [{
    name: String,
    description: String,
    price: Number,
    duration: String,
    requirements: [String]
  }],
  
  // Alternative services field for simple string array
  serviceList: [String],
  
  // Operating Hours
  operatingHours: {
    weekdays: {
      open: String,
      close: String,
      description: {
        type: String,
        default: 'Monday - Friday'
      }
    },
    weekends: {
      open: String,
      close: String,
      description: {
        type: String,
        default: 'Saturday - Sunday'
      }
    },
    emergency: {
      type: Boolean,
      default: true
    },
    notes: String
  },
  
  // Status and Activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'under-maintenance', 'closed'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Additional Information
  departmentCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  floor: {
    type: String,
    default: 'Ground Floor'
  },
  
  wing: {
    type: String,
    enum: ['east', 'west', 'north', 'south', 'central'],
    default: 'central'
  },
  
  capacity: {
    doctors: {
      type: Number,
      default: 0
    },
    patientsPerDay: {
      type: Number,
      default: 50
    },
    beds: {
      type: Number,
      default: 0
    }
  },
  
  equipment: [{
    name: String,
    quantity: Number,
    status: {
      type: String,
      enum: ['operational', 'maintenance', 'out-of-service'],
      default: 'operational'
    }
  }],
  
  staffCount: {
    doctors: Number,
    nurses: Number,
    technicians: Number,
    administrative: Number
  },
  
  // Statistics
  statistics: {
    monthlyPatients: {
      type: Number,
      default: 0
    },
    successRate: {
      type: String,
      default: '95%'
    },
    averageWaitTime: {
      type: String,
      default: '15 minutes'
    }
  },
  
  // Features and Specializations
  features: [{
    name: String,
    description: String,
    available: {
      type: Boolean,
      default: true
    }
  }],
  
  specializations: [String],
  
  // Emergency Information
  emergencyContact: {
    internal: String,
    external: String
  },
  
  emergencyProcedures: [String],
  
  // Accreditation and Certifications
  accreditations: [{
    body: String,
    certificate: String,
    validUntil: Date
  }],
  
  // Notes and Additional Info
  notes: String,
  
  // Images and Media
  images: [String],
  
  // Department Color for UI
  colorCode: {
    type: String,
    default: '#3B82F6'
  }

}, {
  timestamps: true
});

// Virtual for full department info
departmentSchema.virtual('fullInfo').get(function() {
  return {
    name: this.name,
    description: this.description,
    location: this.location || this.contact?.location,
    contact: this.contactEmail || this.contact?.email,
    phone: this.phone || this.contact?.phone,
    floor: this.floor || this.contact?.floor
  };
});

// Virtual for current status
departmentSchema.virtual('currentStatus').get(function() {
  if (!this.isActive) return 'Closed';
  if (this.status === 'under-maintenance') return 'Under Maintenance';
  if (this.status === 'inactive') return 'Inactive';
  return 'Active';
});

// Virtual for formatted operating hours
departmentSchema.virtual('formattedHours').get(function() {
  const weekdays = `Weekdays: ${this.operatingHours.weekdays.open} - ${this.operatingHours.weekdays.close}`;
  const weekends = `Weekends: ${this.operatingHours.weekends.open} - ${this.operatingHours.weekends.close}`;
  const emergency = this.operatingHours.emergency ? ' | 24/7 Emergency' : '';
  return `${weekdays} | ${weekends}${emergency}`;
});

// Virtual for contact information
departmentSchema.virtual('contactInfo').get(function() {
  return {
    phone: this.phone || this.contact?.phone,
    email: this.contactEmail || this.contact?.email,
    location: this.location || this.contact?.location,
    floor: this.floor || this.contact?.floor
  };
});

// Pre-save middleware to sync fields and set defaults
departmentSchema.pre('save', function(next) {
  // Sync contact information
  if (this.contact) {
    if (!this.phone && this.contact.phone) this.phone = this.contact.phone;
    if (!this.contactEmail && this.contact.email) this.contactEmail = this.contact.email;
    if (!this.location && this.contact.location) this.location = this.contact.location;
    if (!this.floor && this.contact.floor) this.floor = this.contact.floor;
  }
  
  // Sync head doctor fields
  if (this.headOfDepartment && !this.headDoctor) {
    this.headDoctor = this.headOfDepartment;
  } else if (this.headDoctor && !this.headOfDepartment) {
    this.headOfDepartment = this.headDoctor;
  }
  
  // Sync services
  if (this.services && this.services.length > 0 && (!this.serviceList || this.serviceList.length === 0)) {
    this.serviceList = this.services.map(service => service.name);
  }
  
  // Generate department code if not provided
  if (!this.departmentCode) {
    const initials = this.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
    this.departmentCode = `${initials}${Date.now().toString().slice(-4)}`;
  }
  
  // Sync status with isActive
  if (this.isActive === false && this.status === 'active') {
    this.status = 'inactive';
  } else if (this.isActive === true && this.status === 'inactive') {
    this.status = 'active';
  }
  
  next();
});

// Indexes for better performance
departmentSchema.index({ name: 1 });
departmentSchema.index({ status: 1, isActive: 1 });
departmentSchema.index({ 'operatingHours.emergency': 1 });
departmentSchema.index({ departmentCode: 1 });
departmentSchema.index({ floor: 1, wing: 1 });

// Static method to find active departments
departmentSchema.statics.findActive = function() {
  return this.find({
    isActive: true,
    status: 'active'
  }).sort({ name: 1 });
};

// Static method to find departments with emergency services
departmentSchema.statics.findEmergencyDepartments = function() {
  return this.find({
    isActive: true,
    'operatingHours.emergency': true
  });
};

// Static method to find departments by floor
departmentSchema.statics.findByFloor = function(floor) {
  return this.find({
    isActive: true,
    $or: [
      { floor: floor },
      { 'contact.floor': floor }
    ]
  });
};

// Method to add service
departmentSchema.methods.addService = function(serviceData) {
  this.services.push(serviceData);
  if (!this.serviceList.includes(serviceData.name)) {
    this.serviceList.push(serviceData.name);
  }
  return this.save();
};

// Method to update statistics
departmentSchema.methods.updateStatistics = function(monthlyPatients, successRate, waitTime) {
  if (monthlyPatients !== undefined) this.statistics.monthlyPatients = monthlyPatients;
  if (successRate !== undefined) this.statistics.successRate = successRate;
  if (waitTime !== undefined) this.statistics.averageWaitTime = waitTime;
  return this.save();
};

// Method to check if department is open now
departmentSchema.methods.isOpenNow = function() {
  if (!this.isActive || this.status !== 'active') return false;
  
  const now = new Date();
  const currentDay = now.toLocaleString('en', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const isWeekend = currentDay === 'saturday' || currentDay === 'sunday';
  const hours = isWeekend ? this.operatingHours.weekends : this.operatingHours.weekdays;
  
  if (this.operatingHours.emergency) return true; // Always open for emergency
  
  return currentTime >= hours.open && currentTime <= hours.close;
};

// Ensure virtual fields are serialized
departmentSchema.set('toJSON', { virtuals: true });
departmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Department', departmentSchema);