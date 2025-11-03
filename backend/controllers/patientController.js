const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private/Admin,Doctor
exports.getPatients = async (req, res, next) => {
    try {
        const patients = await Patient.find()
            .populate('user', 'name email phone dateOfBirth gender profileImage');

        res.status(200).json({
            success: true,
            count: patients.length,
            data: patients
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res, next) => {
    try {
        const patient = await Patient.findOne({ user: req.params.id })
            .populate('user', 'name email phone dateOfBirth gender address profileImage');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res, next) => {
    try {
        let patient = await Patient.findOne({ user: req.params.id });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        patient = await Patient.findByIdAndUpdate(patient._id, req.body, {
            new: true,
            runValidators: true
        }).populate('user', 'name email phone dateOfBirth gender address profileImage');

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get patient appointments
// @route   GET /api/patients/:id/appointments
// @access  Private
exports.getPatientAppointments = async (req, res, next) => {
    try {
        const patient = await Patient.findOne({ user: req.params.id });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const appointments = await Appointment.find({ patient: patient._id })
            .populate('doctor')
            .populate('department')
            .sort({ appointmentDate: -1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};