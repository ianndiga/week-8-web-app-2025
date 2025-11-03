// backend/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const ContactSubmission = require('../models/ContactSubmission');

// Get contact information
router.get('/info', async (req, res) => {
  try {
    const contactInfo = await Contact.findOne();
    
    if (!contactInfo) {
      // Return default contact info
      return res.json({
        success: true,
        contactInfo: {
          phone: '+254115947353',
          email: 'info@jijuehospital.com',
          address: 'Health Street, Nairobi City, Kenya',
          operatingHours: 'Mon-Fri: 8am-6pm, Sat: 9am-1pm, Sun: Emergency Only',
          emergencyPhone: '+254115947353',
          whatsapp: '+254115947353',
          facebook: 'JijueHospital',
          twitter: '@JijueHospital'
        }
      });
    }

    res.json({
      success: true,
      contactInfo: {
        phone: contactInfo.phone,
        email: contactInfo.email,
        address: contactInfo.address,
        operatingHours: contactInfo.operatingHours,
        emergencyPhone: contactInfo.emergencyPhone,
        whatsapp: contactInfo.whatsapp,
        facebook: contactInfo.facebook,
        twitter: contactInfo.twitter
      }
    });

  } catch (error) {
    console.error('Error fetching contact info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contact information'
    });
  }
});

// Submit contact form
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone, subject, department, message, source } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Create new contact submission
    const contactSubmission = new ContactSubmission({
      name,
      email,
      phone,
      subject,
      department,
      message,
      source,
      status: 'new',
      ipAddress: req.ip
    });

    await contactSubmission.save();

    // In a real application, you would send email notifications here
    // await sendContactNotification(contactSubmission);

    res.json({
      success: true,
      message: 'Contact form submitted successfully',
      submissionId: contactSubmission._id
    });

  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting contact form'
    });
  }
});

// Chat endpoints
router.get('/chat/status', async (req, res) => {
  try {
    // Check if chat support is available (you could check business hours, etc.)
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 8 && hour < 18; // 8 AM to 6 PM
    
    res.json({
      success: true,
      chatAvailable: isBusinessHours,
      message: isBusinessHours ? 'Chat is available' : 'Chat is available during business hours (8 AM - 6 PM)'
    });
  } catch (error) {
    console.error('Error checking chat status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking chat availability'
    });
  }
});

router.post('/chat/message', async (req, res) => {
  try {
    const { message } = req.body;

    // Simple chatbot logic - in a real app, you'd use a proper chatbot service
    let response = 'Thank you for your message. Our support team will get back to you soon.';
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      response = 'For emergencies, please call our emergency line immediately: +254115947353';
    } else if (lowerMessage.includes('appointment') || lowerMessage.includes('book')) {
      response = 'To book an appointment, please visit our patient portal or call our reception at +254115947353';
    } else if (lowerMessage.includes('hours') || lowerMessage.includes('open')) {
      response = 'We are open Monday-Friday: 8am-6pm, Saturday: 9am-1pm. Emergency services are available 24/7.';
    } else if (lowerMessage.includes('location') || lowerMessage.includes('address')) {
      response = 'We are located at Health Street, Nairobi City, Kenya. You can get directions on Google Maps.';
    }

    res.json({
      success: true,
      response
    });

  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing chat message'
    });
  }
});

module.exports = router;