const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
    try {
        let query = {};

        // If user is patient, only show their appointments
        if (req.user.role === 'patient') {
            const patient = await Patient.findOne({ user: req.user.id });
            query.patient = patient._id;
        }

        // If user is doctor, only show their appointments
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ user: req.user.id });
            query.doctor = doctor._id;
        }

        const appointments = await Appointment.find(query)
            .populate('patient', 'user')
            .populate('doctor', 'user specialization')
            .populate('department', 'name')
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

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient')
            .populate('doctor')
            .populate('department');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.status(200).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res, next) => {
    try {
        // Add patient to req.body
        if (req.user.role === 'patient') {
            const patient = await Patient.findOne({ user: req.user.id });
            req.body.patient = patient._id;
        }

        const appointment = await Appointment.create(req.body);

        // Populate the created appointment
        const populatedAppointment = await Appointment.findById(appointment._id)
            .populate('patient')
            .populate('doctor')
            .populate('department');

        res.status(201).json({
            success: true,
            data: populatedAppointment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
    try {
        let appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('patient')
          .populate('doctor')
          .populate('department');

        res.status(200).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private
exports.deleteAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        await Appointment.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get doctor appointments
// @route   GET /api/appointments/doctor/:doctorId
// @access  Private
exports.getDoctorAppointments = async (req, res, next) => {
    try {
        const appointments = await Appointment.find({ doctor: req.params.doctorId })
            .populate('patient')
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

// @desc    Get patient appointments
// @route   GET /api/appointments/patient/:patientId
// @access  Private
exports.getPatientAppointments = async (req, res, next) => {
    try {
        const appointments = await Appointment.find({ patient: req.params.patientId })
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