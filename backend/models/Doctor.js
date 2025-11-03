const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  // Unique Identifier
  doctorId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'DOC' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
  },

  // Basic Information
  name: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  // Professional Information
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'cardiology', 'neurology', 'pediatrics', 'orthopedics', 
      'ophthalmology', 'ent', 'pulmonology', 'oncology',
      'hematology', 'gastroenterology', 'dermatology', 'dentistry',
      'psychiatry', 'obgyn', 'urology', 'physical-therapy',
      'general-medicine', 'surgery', 'emergency-medicine'
    ]
  },
  
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z0-9]{6,15}$/, 'Please enter a valid license number']
  },
  
  yearsOfExperience: {
    type: Number,
    required: true,
    min: [0, 'Experience cannot be negative'],
    max: [60, 'Please verify years of experience']
  },
  
  // Qualifications and Education
  qualifications: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      min: [1950, 'Please verify graduation year'],
      max: [new Date().getFullYear(), 'Year cannot be in future']
    },
    country: String
  }],
  
  // Professional Details
  bio: {
    type: String,
    required: true,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  
  consultationFee: {
    type: Number,
    required: true,
    min: [0, 'Consultation fee cannot be negative'],
    default: 0
  },
  
  // Availability with more realistic structure
  availability: {
    workingDays: {
      type: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    startTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '09:00'
    },
    endTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '17:00'
    },
    breakStart: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '13:00'
    },
    breakEnd: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '14:00'
    },
    slotDuration: {
      type: Number, // in minutes
      default: 30,
      enum: [15, 20, 30, 45, 60]
    }
  },

  // Current availability status
  isAvailable: {
    type: Boolean,
    default: true
  },
  
  // Ratings and Reviews
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: value => Math.round(value * 10) / 10 // Round to 1 decimal
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  
  // Contact Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s-()]{10,}$/, 'Please enter a valid phone number']
  },
  
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'Kenya'
    }
  },
  
  // Media
  profileImage: {
    url: {
      type: String,
      default: 'default-doctor.jpg'
    },
    thumbnail: String,
    altText: {
      type: String,
      default: 'Doctor profile picture'
    }
  },
  
  // Languages spoken
  languages: [{
    type: String,
    enum: ['English', 'Swahili', 'French', 'Arabic', 'Spanish', 'Hindi', 'Other'],
    default: ['English']
  }],
  
  // Department Reference
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  
  // User Account Reference for authentication
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User account is required']
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave', 'suspended'],
    default: 'active'
  },
  
  // Practice Information
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  
  // Professional Memberships
  professionalMemberships: [{
    organization: String,
    membershipId: String,
    since: Number,
    active: {
      type: Boolean,
      default: true
    }
  }],
  
  // Statistics
  statistics: {
    totalPatients: {
      type: Number,
      default: 0
    },
    monthlyPatients: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },

  // Preferences
  preferences: {
    maxPatientsPerDay: {
      type: Number,
      default: 20,
      min: 1,
      max: 50
    },
    allowEmergency: {
      type: Boolean,
      default: true
    },
    notificationEnabled: {
      type: Boolean,
      default: true
    }
  },

  // Metadata
  verified: {
    type: Boolean,
    default: false
  },
  
  lastActive: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

// Virtual for full specialty name
doctorSchema.virtual('specialtyDisplay').get(function() {
  const specialtyMap = {
    'cardiology': 'Cardiology',
    'neurology': 'Neurology',
    'pediatrics': 'Pediatrics',
    'orthopedics': 'Orthopedics',
    'ophthalmology': 'Ophthalmology',
    'ent': 'ENT (Ear, Nose & Throat)',
    'pulmonology': 'Pulmonology',
    'oncology': 'Oncology',
    'hematology': 'Hematology',
    'gastroenterology': 'Gastroenterology',
    'dermatology': 'Dermatology',
    'dentistry': 'Dentistry',
    'psychiatry': 'Psychiatry',
    'obgyn': 'Obstetrics & Gynecology',
    'urology': 'Urology',
    'physical-therapy': 'Physical Therapy',
    'general-medicine': 'General Medicine',
    'surgery': 'Surgery',
    'emergency-medicine': 'Emergency Medicine'
  };
  
  return specialtyMap[this.specialization] || this.specialization;
});

// Virtual for experience level
doctorSchema.virtual('experienceLevel').get(function() {
  if (this.yearsOfExperience >= 20) return 'Senior Consultant';
  if (this.yearsOfExperience >= 10) return 'Consultant';
  if (this.yearsOfExperience >= 5) return 'Specialist';
  return 'Junior Doctor';
});

// Virtual for formatted consultation fee
doctorSchema.virtual('formattedFee').get(function() {
  if (this.consultationFee === 0) return 'Free Consultation';
  return `KES ${this.consultationFee.toLocaleString()}`;
});

// Virtual for next available slot
doctorSchema.virtual('nextAvailable').get(function() {
  if (!this.isAvailable) return null;
  
  const now = new Date();
  const currentDay = now.toLocaleString('en', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todaySchedule = this.availability.workingDays.includes(currentDay);
  
  if (todaySchedule) {
    const [startHour, startMinute] = this.availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.availability.endTime.split(':').map(Number);
    const [breakStartHour, breakStartMinute] = this.availability.breakStart.split(':').map(Number);
    const [breakEndHour, breakEndMinute] = this.availability.breakEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    const breakStart = breakStartHour * 60 + breakStartMinute;
    const breakEnd = breakEndHour * 60 + breakEndMinute;
    
    if (currentTime < startTime) {
      return `Today at ${this.availability.startTime}`;
    } else if (currentTime >= breakStart && currentTime < breakEnd) {
      return `Today at ${this.availability.breakEnd}`;
    } else if (currentTime < endTime) {
      return 'Available Now';
    }
  }
  
  // Find next available day
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayIndex = days.indexOf(currentDay);
  
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDay = days[nextDayIndex];
    
    if (this.availability.workingDays.includes(nextDay)) {
      return `Next ${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)} at ${this.availability.startTime}`;
    }
  }
  
  return 'Not Available';
});

// Pre-save middleware
doctorSchema.pre('save', function(next) {
  // Update lastActive when status changes to active
  if (this.isModified('status') && this.status === 'active') {
    this.lastActive = new Date();
  }
  
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  next();
});

// Indexes for better performance
doctorSchema.index({ doctorId: 1 });
doctorSchema.index({ specialization: 1, isAvailable: 1 });
doctorSchema.index({ email: 1 });
doctorSchema.index({ licenseNumber: 1 });
doctorSchema.index({ department: 1, status: 1 });
doctorSchema.index({ 'availability.workingDays': 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ status: 1 });
doctorSchema.index({ lastActive: -1 });

// Static method to find available doctors by specialty
doctorSchema.statics.findAvailableBySpecialty = function(specialty) {
  return this.find({
    specialization: specialty,
    isAvailable: true,
    status: 'active',
    verified: true
  })
  .populate('department', 'name description')
  .populate('hospital', 'name address')
  .sort({ 'rating.average': -1, yearsOfExperience: -1 });
};

// Static method to find doctors by department
doctorSchema.statics.findByDepartment = function(departmentId) {
  return this.find({
    department: departmentId,
    status: 'active'
  })
  .populate('department')
  .sort({ 'rating.average': -1 });
};

// Static method to get doctor statistics
doctorSchema.statics.getStats = async function() {
  return {
    totalDoctors: await this.countDocuments({ status: 'active' }),
    availableDoctors: await this.countDocuments({ isAvailable: true, status: 'active' }),
    averageRating: await this.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, avgRating: { $avg: '$rating.average' } } }
    ]).then(result => result[0]?.avgRating || 0),
    bySpecialization: await this.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  };
};

// Method to check availability for a specific date and time
doctorSchema.methods.checkAvailability = function(date, time) {
  if (!this.isAvailable || this.status !== 'active') {
    return { available: false, reason: 'Doctor is not available' };
  }

  const appointmentDate = new Date(date);
  const dayName = appointmentDate.toLocaleString('en', { weekday: 'long' }).toLowerCase();
  
  // Check if doctor works on this day
  if (!this.availability.workingDays.includes(dayName)) {
    return { available: false, reason: 'Doctor does not work on this day' };
  }

  const [timeHour, timeMinute] = time.split(':').map(Number);
  const appointmentTime = timeHour * 60 + timeMinute;
  
  const [startHour, startMinute] = this.availability.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.availability.endTime.split(':').map(Number);
  const [breakStartHour, breakStartMinute] = this.availability.breakStart.split(':').map(Number);
  const [breakEndHour, breakEndMinute] = this.availability.breakEnd.split(':').map(Number);
  
  const workStart = startHour * 60 + startMinute;
  const workEnd = endHour * 60 + endMinute;
  const breakStart = breakStartHour * 60 + breakStartMinute;
  const breakEnd = breakEndHour * 60 + breakEndMinute;

  // Check if within working hours
  if (appointmentTime < workStart || appointmentTime >= workEnd) {
    return { available: false, reason: 'Outside working hours' };
  }

  // Check if during break time
  if (appointmentTime >= breakStart && appointmentTime < breakEnd) {
    return { available: false, reason: 'During break time' };
  }

  return { available: true };
};

// Method to update rating with new review
doctorSchema.methods.updateRating = function(newRating) {
  if (newRating < 1 || newRating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Update rating breakdown
  this.rating.breakdown[newRating] += 1;
  
  // Calculate new average
  const totalRatings = Object.values(this.rating.breakdown).reduce((sum, count) => sum + count, 0);
  const totalScore = Object.entries(this.rating.breakdown)
    .reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0);
  
  this.rating.average = totalScore / totalRatings;
  this.rating.totalReviews = totalRatings;
  
  return this.save();
};

// Method to generate time slots for a specific day
doctorSchema.methods.generateTimeSlots = function(date) {
  const dayName = new Date(date).toLocaleString('en', { weekday: 'long' }).toLowerCase();
  
  if (!this.availability.workingDays.includes(dayName)) {
    return [];
  }

  const slots = [];
  const [startHour, startMinute] = this.availability.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.availability.endTime.split(':').map(Number);
  const [breakStartHour, breakStartMinute] = this.availability.breakStart.split(':').map(Number);
  const [breakEndHour, breakEndMinute] = this.availability.breakEnd.split(':').map(Number);
  
  const slotDuration = this.availability.slotDuration;
  let currentTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  const breakStart = breakStartHour * 60 + breakStartMinute;
  const breakEnd = breakEndHour * 60 + breakEndMinute;

  while (currentTime + slotDuration <= endTime) {
    // Skip break time
    if (currentTime >= breakStart && currentTime < breakEnd) {
      currentTime = breakEnd;
      continue;
    }

    const hour = Math.floor(currentTime / 60);
    const minute = currentTime % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    slots.push(timeString);
    currentTime += slotDuration;
  }

  return slots;
};

// Ensure virtual fields are serialized
doctorSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

doctorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Doctor', doctorSchema);