// backend/routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');

// Temporary middleware for testing - REMOVE LATER
const auth = (req, res, next) => {
  req.user = { 
    id: 'temp-user-id', 
    role: 'user',
    doctorId: 'temp-doctor-id'
  };
  next();
};

const adminAuth = (req, res, next) => {
  req.user = { 
    id: 'temp-admin-id', 
    role: 'admin' 
  };
  next();
};

// Get all doctors with advanced filtering and search
router.get('/', async (req, res) => {
  try {
    const { 
      specialization, 
      department,
      search, 
      experience,
      rating,
      language,
      available,
      verified,
      page = 1,
      limit = 10,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;
    
    let filter = { status: 'active' };
    
    // Filter by specialization
    if (specialization) {
      filter.specialization = specialization;
    }
    
    // Filter by department
    if (department) {
      filter.department = department;
    }
    
    // Filter by availability
    if (available !== undefined) {
      filter.isAvailable = available === 'true';
    }
    
    // Filter by verification status
    if (verified !== undefined) {
      filter.verified = verified === 'true';
    }
    
    // Filter by minimum experience
    if (experience) {
      filter.yearsOfExperience = { $gte: parseInt(experience) };
    }
    
    // Filter by minimum rating
    if (rating) {
      filter['rating.average'] = { $gte: parseFloat(rating) };
    }
    
    // Filter by language
    if (language) {
      filter.languages = { $in: [new RegExp(language, 'i')] };
    }
    
    // Search across multiple fields
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { 'qualifications.degree': { $regex: search, $options: 'i' } },
        { 'qualifications.institution': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    // Sort configuration
    const sortConfig = {};
    if (sortBy === 'rating') {
      sortConfig['rating.average'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'experience') {
      sortConfig.yearsOfExperience = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'name') {
      sortConfig.name = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'fee') {
      sortConfig.consultationFee = sortOrder === 'desc' ? -1 : 1;
    }
    // Add default sort
    sortConfig._id = 1;

    const doctors = await Doctor.find(filter)
      .populate('department', 'name description')
      .populate('hospital', 'name address')
      .select('-__v')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit));

    const totalDoctors = await Doctor.countDocuments(filter);
    const totalPages = Math.ceil(totalDoctors / limit);

    res.json({
      success: true,
      data: doctors.map(doctor => ({
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        specialtyDisplay: doctor.specialtyDisplay,
        experience: doctor.yearsOfExperience,
        experienceLevel: doctor.experienceLevel,
        bio: doctor.bio,
        isAvailable: doctor.isAvailable,
        nextAvailable: doctor.nextAvailable,
        rating: doctor.rating,
        profileImage: doctor.profileImage?.url, // FIXED: Access url property
        qualifications: doctor.qualifications,
        languages: doctor.languages,
        consultationFee: doctor.consultationFee,
        formattedFee: doctor.formattedFee,
        availability: doctor.availability,
        department: doctor.department,
        hospital: doctor.hospital,
        contact: {
          email: doctor.email,
          phone: doctor.phone,
          address: doctor.address
        },
        statistics: doctor.statistics,
        verified: doctor.verified,
        status: doctor.status
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalDoctors,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        specialization,
        department,
        experience,
        rating,
        language,
        available,
        search
      }
    });

  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get available doctors for booking
router.get('/available', async (req, res) => {
  try {
    const doctors = await Doctor.find({ 
      status: 'active', 
      isAvailable: true,
      verified: true 
    })
      .populate('department', 'name')
      .populate('hospital', 'name')
      .select('doctorId name specialization department hospital consultationFee profileImage availability rating statistics')
      .sort({ 'rating.average': -1, 'statistics.totalPatients': -1 });

    res.json({
      success: true,
      data: doctors.map(doctor => ({
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        specialtyDisplay: doctor.specialtyDisplay,
        department: doctor.department?.name,
        hospital: doctor.hospital?.name,
        consultationFee: doctor.consultationFee,
        formattedFee: doctor.formattedFee,
        profileImage: doctor.profileImage?.url, // FIXED: Access url property
        rating: doctor.rating.average,
        totalReviews: doctor.rating.totalReviews,
        availability: doctor.availability,
        nextAvailable: doctor.nextAvailable,
        experience: doctor.yearsOfExperience,
        experienceLevel: doctor.experienceLevel
      }))
    });
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available doctors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('department', 'name description services')
      .populate('hospital', 'name address contact')
      // .populate('user', 'name email'); // COMMENTED OUT: User model might not exist

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        fullName: doctor.fullName,
        email: doctor.email,
        phone: doctor.phone,
        address: doctor.address,
        specialization: doctor.specialization,
        specialtyDisplay: doctor.specialtyDisplay,
        licenseNumber: doctor.licenseNumber,
        yearsOfExperience: doctor.yearsOfExperience,
        experienceLevel: doctor.experienceLevel,
        bio: doctor.bio,
        isAvailable: doctor.isAvailable,
        nextAvailable: doctor.nextAvailable,
        rating: doctor.rating,
        profileImage: doctor.profileImage?.url, // FIXED: Access url property
        qualifications: doctor.qualifications,
        languages: doctor.languages,
        consultationFee: doctor.consultationFee,
        formattedFee: doctor.formattedFee,
        availability: doctor.availability,
        department: doctor.department,
        hospital: doctor.hospital,
        // user: doctor.user, // COMMENTED OUT: User model might not exist
        professionalMemberships: doctor.professionalMemberships,
        statistics: doctor.statistics,
        preferences: doctor.preferences,
        verified: doctor.verified,
        status: doctor.status,
        lastActive: doctor.lastActive,
        createdAt: doctor.createdAt,
        updatedAt: doctor.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get doctor by doctorId
router.get('/by-doctorId/:doctorId', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.doctorId })
      .populate('department', 'name description')
      .populate('hospital', 'name');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        specialtyDisplay: doctor.specialtyDisplay,
        profileImage: doctor.profileImage?.url, // FIXED: Access url property
        rating: doctor.rating,
        consultationFee: doctor.consultationFee,
        formattedFee: doctor.formattedFee,
        isAvailable: doctor.isAvailable,
        department: doctor.department,
        hospital: doctor.hospital
      }
    });

  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new doctor (Admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const doctorData = req.body;

    // Check if doctor already exists with same license number or email
    const existingDoctor = await Doctor.findOne({
      $or: [
        { licenseNumber: doctorData.licenseNumber },
        { email: doctorData.email }
      ]
    });

    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this license number or email already exists'
      });
    }

    const doctor = new Doctor(doctorData);
    await doctor.save();

    // Populate references before sending response
    await doctor.populate('department', 'name');
    await doctor.populate('hospital', 'name');

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: {
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        department: doctor.department,
        hospital: doctor.hospital
      }
    });

  } catch (error) {
    console.error('Error creating doctor:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update doctor (Admin or Doctor own profile)
router.put('/:id', auth, async (req, res) => {
  try {
    const doctorId = req.params.id;
    const updateData = req.body;
    
    // Check if user is admin or the doctor themselves
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = req.user.id === doctorId || req.user.doctorId === doctorId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this doctor profile'
      });
    }

    // Remove restricted fields for non-admin users
    if (!isAdmin) {
      delete updateData.verified;
      delete updateData.status;
      delete updateData.licenseNumber;
      delete updateData.doctorId;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('department', 'name')
      .populate('hospital', 'name');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: {
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        isAvailable: doctor.isAvailable,
        status: doctor.status,
        verified: doctor.verified
      }
    });

  } catch (error) {
    console.error('Error updating doctor:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get doctor availability for specific date
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check if doctor works on this day - FIXED: Use workingDays instead of days
    if (!doctor.availability.workingDays.includes(dayName)) {
      return res.json({
        success: true,
        available: false,
        message: 'Doctor does not work on this day'
      });
    }

    // Generate available time slots
    const availableSlots = doctor.generateTimeSlots(date);

    res.json({
      success: true,
      available: true,
      date: date,
      day: dayName,
      availableSlots: availableSlots.map(slot => ({
        time: slot,
        display: formatTimeForDisplay(slot)
      })),
      workingHours: {
        start: doctor.availability.startTime,
        end: doctor.availability.endTime,
        break: {
          start: doctor.availability.breakStart,
          end: doctor.availability.breakEnd
        }
      },
      slotDuration: doctor.availability.slotDuration
    });

  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor availability',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Check specific time slot availability
router.get('/:id/availability/check', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.query;
    
    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Date and time parameters are required'
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const availability = doctor.checkAvailability(date, time);

    res.json({
      success: true,
      available: availability.available,
      message: availability.reason,
      data: {
        date,
        time,
        doctor: {
          id: doctor._id,
          name: doctor.name,
          specialization: doctor.specialization
        }
      }
    });

  } catch (error) {
    console.error('Error checking doctor availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking doctor availability',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get doctors by department
router.get('/department/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { available } = req.query;
    
    let filter = { 
      department: departmentId,
      status: 'active'
    };
    
    if (available !== undefined) {
      filter.isAvailable = available === 'true';
    }
    
    const doctors = await Doctor.find(filter)
      .populate('department', 'name')
      .populate('hospital', 'name')
      .select('doctorId name specialization yearsOfExperience rating profileImage bio isAvailable consultationFee languages')
      .sort({ 'rating.average': -1, yearsOfExperience: -1 });

    res.json({
      success: true,
      data: doctors.map(doctor => ({
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        specialtyDisplay: doctor.specialtyDisplay,
        experience: doctor.yearsOfExperience,
        experienceLevel: doctor.experienceLevel,
        rating: doctor.rating.average,
        totalReviews: doctor.rating.totalReviews,
        profileImage: doctor.profileImage?.url, // FIXED: Access url property
        bio: doctor.bio,
        isAvailable: doctor.isAvailable,
        consultationFee: doctor.consultationFee,
        formattedFee: doctor.formattedFee,
        languages: doctor.languages
      }))
    });

  } catch (error) {
    console.error('Error fetching department doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching department doctors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get available specialties
router.get('/meta/specialties', async (req, res) => {
  try {
    const specialties = await Doctor.distinct('specialization', { status: 'active' });
    
    const specialtiesWithCount = await Promise.all(
      specialties.map(async (specialty) => {
        const count = await Doctor.countDocuments({ 
          specialization: specialty, 
          status: 'active' 
        });
        return {
          value: specialty,
          label: specialty.charAt(0).toUpperCase() + specialty.slice(1).replace(/-/g, ' '),
          count
        };
      })
    );

    // Sort by count descending
    specialtiesWithCount.sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: specialtiesWithCount
    });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching specialties',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get doctor statistics
router.get('/meta/stats', adminAuth, async (req, res) => {
  try {
    const stats = await Doctor.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching doctor statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Add qualification to doctor
router.post('/:id/qualifications', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { degree, institution, year, country } = req.body;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check authorization
    const isAuthorized = req.user.role === 'admin' || req.user.id === doctor.user?.toString();
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this doctor profile'
      });
    }

    doctor.qualifications.push({ degree, institution, year, country });
    await doctor.save();

    res.json({
      success: true,
      message: 'Qualification added successfully',
      data: doctor.qualifications
    });

  } catch (error) {
    console.error('Error adding qualification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding qualification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update doctor rating
router.post('/:id/rating', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    await doctor.updateRating(parseInt(rating));

    res.json({
      success: true,
      message: 'Rating updated successfully',
      data: {
        averageRating: doctor.rating.average,
        totalReviews: doctor.rating.totalReviews,
        ratingBreakdown: doctor.rating.breakdown
      }
    });

  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating rating',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update doctor availability status
router.patch('/:id/availability', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check authorization
    const isAuthorized = req.user.role === 'admin' || req.user.id === doctor.user?.toString();
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this doctor availability'
      });
    }

    doctor.isAvailable = isAvailable;
    doctor.lastActive = new Date();
    await doctor.save();

    res.json({
      success: true,
      message: `Doctor is now ${isAvailable ? 'available' : 'unavailable'}`,
      data: {
        isAvailable: doctor.isAvailable,
        lastActive: doctor.lastActive
      }
    });

  } catch (error) {
    console.error('Error updating doctor availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating doctor availability',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete doctor (Admin only - soft delete)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor deleted successfully',
      data: {
        id: doctor._id,
        name: doctor.name,
        status: doctor.status
      }
    });

  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to format time for display
function formatTimeForDisplay(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

module.exports = router;