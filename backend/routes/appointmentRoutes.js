// backend/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

// Get all appointments with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      status,
      date,
      type,
      page = 1,
      limit = 10,
      sortBy = 'appointmentDate',
      sortOrder = 'asc'
    } = req.query;

    let filter = {};
    
    // Build filter based on query parameters
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'name specialization profileImage contactEmail phone')
      .populate('patient', 'firstName lastName email phone patientId')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalAppointments = await Appointment.countDocuments(filter);
    const totalPages = Math.ceil(totalAppointments / limit);

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        id: apt._id,
        appointmentId: apt.appointmentId,
        patient: {
          id: apt.patient?._id,
          patientId: apt.patient?.patientId,
          name: `${apt.patient?.firstName} ${apt.patient?.lastName}`,
          email: apt.patient?.email,
          phone: apt.patient?.phone
        },
        doctor: {
          id: apt.doctor?._id,
          name: apt.doctor?.name,
          specialization: apt.doctor?.specialization,
          profileImage: apt.doctor?.profileImage,
          contactEmail: apt.doctor?.contactEmail,
          phone: apt.doctor?.phone
        },
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        duration: apt.duration,
        type: apt.type,
        consultationType: apt.consultationType,
        reason: apt.reason,
        symptoms: apt.symptoms,
        priority: apt.priority,
        status: apt.status,
        notes: apt.notes,
        createdAt: apt.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAppointments,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointments',
      error: error.message
    });
  }
});

// Get single appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name specialization profileImage contactEmail phone officeLocation')
      .populate('patient', 'firstName lastName email phone patientId dateOfBirth gender bloodType');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        patient: {
          id: appointment.patient?._id,
          patientId: appointment.patient?.patientId,
          name: `${appointment.patient?.firstName} ${appointment.patient?.lastName}`,
          email: appointment.patient?.email,
          phone: appointment.patient?.phone,
          dateOfBirth: appointment.patient?.dateOfBirth,
          gender: appointment.patient?.gender,
          bloodType: appointment.patient?.bloodType
        },
        doctor: {
          id: appointment.doctor?._id,
          name: appointment.doctor?.name,
          specialization: appointment.doctor?.specialization,
          profileImage: appointment.doctor?.profileImage,
          contactEmail: appointment.doctor?.contactEmail,
          phone: appointment.doctor?.phone,
          officeLocation: appointment.doctor?.officeLocation
        },
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        duration: appointment.duration,
        type: appointment.type,
        consultationType: appointment.consultationType,
        reason: appointment.reason,
        symptoms: appointment.symptoms,
        priority: appointment.priority,
        status: appointment.status,
        notes: appointment.notes,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment',
      error: error.message
    });
  }
});

// Create new appointment
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      type = 'consultation',
      consultationType = 'in-person',
      reason,
      symptoms = [],
      priority = 'medium',
      duration = 30
    } = req.body;

    // Validate required fields
    if (!patientId || !doctorId || !appointmentDate || !appointmentTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, doctor ID, appointmentDate, appointmentTime, and reason are required'
      });
    }

    // Check if patient exists
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check for scheduling conflicts
    const conflictDate = new Date(appointmentDate);
    const conflictingAppointments = await Appointment.findConflicts(
      doctorId,
      conflictDate,
      appointmentTime,
      duration
    );

    if (conflictingAppointments.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Doctor already has an appointment at this time',
        conflictingAppointments: conflictingAppointments.map(apt => ({
          time: apt.appointmentTime,
          duration: apt.duration
        }))
      });
    }

    // Create new appointment
    const appointment = new Appointment({
      patient: patient._id, // Use ObjectId reference
      patientId: patient.patientId, // Use custom patient ID
      doctor: doctor._id, // Use ObjectId reference
      doctorId: doctor.doctorId, // Use custom doctor ID
      department: doctor.department,
      appointmentDate: new Date(appointmentDate),
      appointmentTime: appointmentTime,
      duration: parseInt(duration),
      type: type,
      consultationType: consultationType,
      reason: reason,
      symptoms: symptoms,
      priority: priority,
      status: 'scheduled'
    });

    await appointment.save();

    // Populate the appointment for response
    await appointment.populate('doctor', 'name specialization profileImage');
    await appointment.populate('patient', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        patient: {
          name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          patientId: appointment.patient.patientId
        },
        doctor: {
          name: appointment.doctor.name,
          specialization: appointment.doctor.specialization
        },
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        type: appointment.type,
        consultationType: appointment.consultationType,
        reason: appointment.reason,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating appointment',
      error: error.message
    });
  }
});

// Update appointment
router.put('/:id', async (req, res) => {
  try {
    const {
      appointmentDate,
      appointmentTime,
      type,
      consultationType,
      reason,
      symptoms,
      priority,
      duration,
      status,
      notes
    } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check for scheduling conflicts if date/time is being updated
    if (appointmentDate || appointmentTime) {
      const newDate = appointmentDate ? new Date(appointmentDate) : appointment.appointmentDate;
      const newTime = appointmentTime || appointment.appointmentTime;
      const newDuration = duration || appointment.duration;

      const conflictingAppointments = await Appointment.findConflicts(
        appointment.doctorId,
        newDate,
        newTime,
        newDuration,
        appointment._id // Exclude current appointment
      );

      if (conflictingAppointments.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Doctor already has an appointment at this time'
        });
      }
    }

    // Update appointment fields
    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (type) appointment.type = type;
    if (consultationType) appointment.consultationType = consultationType;
    if (reason) appointment.reason = reason;
    if (symptoms) appointment.symptoms = symptoms;
    if (priority) appointment.priority = priority;
    if (duration) appointment.duration = duration;
    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    // Populate for response
    await appointment.populate('doctor', 'name specialization profileImage');
    await appointment.populate('patient', 'firstName lastName patientId');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        patient: {
          name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          patientId: appointment.patient.patientId
        },
        doctor: {
          name: appointment.doctor.name,
          specialization: appointment.doctor.specialization
        },
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        type: appointment.type,
        consultationType: appointment.consultationType,
        reason: appointment.reason,
        status: appointment.status,
        notes: appointment.notes
      }
    });

  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating appointment',
      error: error.message
    });
  }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting appointment',
      error: error.message
    });
  }
});

// Get appointments by patient ID
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, upcoming = 'true' } = req.query;

    let filter = { patientId };
    
    if (status) {
      filter.status = status;
    }

    if (upcoming === 'true') {
      filter.appointmentDate = { $gte: new Date() };
    } else if (upcoming === 'false') {
      filter.appointmentDate = { $lt: new Date() };
    }

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'name specialization profileImage contactEmail phone officeLocation')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        id: apt._id,
        appointmentId: apt.appointmentId,
        doctor: {
          id: apt.doctor?._id,
          name: apt.doctor?.name,
          specialization: apt.doctor?.specialization,
          profileImage: apt.doctor?.profileImage,
          contactEmail: apt.doctor?.contactEmail,
          phone: apt.doctor?.phone,
          officeLocation: apt.doctor?.officeLocation
        },
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        duration: apt.duration,
        type: apt.type,
        consultationType: apt.consultationType,
        reason: apt.reason,
        status: apt.status,
        notes: apt.notes
      }))
    });

  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patient appointments',
      error: error.message
    });
  }
});

// Get appointments by doctor ID
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, status } = req.query;

    let filter = { doctorId };
    
    if (status) {
      filter.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName patientId phone email')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        id: apt._id,
        appointmentId: apt.appointmentId,
        patient: {
          id: apt.patient?._id,
          patientId: apt.patient?.patientId,
          name: `${apt.patient?.firstName} ${apt.patient?.lastName}`,
          phone: apt.patient?.phone,
          email: apt.patient?.email
        },
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        duration: apt.duration,
        type: apt.type,
        consultationType: apt.consultationType,
        reason: apt.reason,
        status: apt.status,
        priority: apt.priority
      }))
    });

  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor appointments',
      error: error.message
    });
  }
});

// Update appointment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(notes !== undefined && { notes })
      },
      { new: true }
    ).populate('doctor', 'name specialization')
     .populate('patient', 'firstName lastName patientId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        patient: {
          name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          patientId: appointment.patient.patientId
        },
        doctor: {
          name: appointment.doctor.name,
          specialization: appointment.doctor.specialization
        },
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        status: appointment.status,
        notes: appointment.notes
      }
    });

  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating appointment status',
      error: error.message
    });
  }
});

// Get appointment statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const totalAppointments = await Appointment.countDocuments();
    const todayAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: startOfToday, $lt: endOfToday }
    });
    
    const appointmentsByStatus = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const upcomingAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    res.json({
      success: true,
      stats: {
        totalAppointments,
        todayAppointments,
        upcomingAppointments,
        statusBreakdown: appointmentsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching appointment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment statistics',
      error: error.message
    });
  }
});

module.exports = router;