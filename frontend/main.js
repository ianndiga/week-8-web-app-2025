// Global configuration
const API_BASE_URL = '/api';

// Utility functions
const api = {
    async get(url) {
        const response = await fetch(`${API_BASE_URL}${url}`);
        return await response.json();
    },

    async post(url, data) {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async put(url, data) {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }
};

// Load doctors on doctors page
if (window.location.pathname === '/doctors.html' || window.location.pathname === '/') {
    loadDoctors();
}

// Load departments on services page
if (window.location.pathname === '/services.html') {
    loadDepartments();
}

async function loadDoctors() {
    try {
        const response = await api.get('/doctors');
        if (response.success) {
            displayDoctors(response.data);
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

async function loadDepartments() {
    try {
        const response = await api.get('/departments');
        if (response.success) {
            displayDepartments(response.data);
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

function displayDoctors(doctors) {
    const doctorsGrid = document.querySelector('.doctors-grid');
    if (!doctorsGrid) return;

    doctorsGrid.innerHTML = doctors.map(doctor => `
        <div class="doctor-card" data-specialty="${doctor.specialization}" data-availability="available">
            <div class="doctor-avatar">
                <div class="avatar">${getDoctorIcon(doctor.specialization)}</div>
                <div class="doctor-availability">Available Today</div>
            </div>
            <div class="doctor-info">
                <h3>${doctor.user.name}</h3>
                <p class="doctor-specialty">${formatSpecialty(doctor.specialization)}</p>
                <p class="doctor-exp">${doctor.experience} years experience</p>
                
                <div class="doctor-contact">
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <a href="mailto:${doctor.user.email}">${doctor.user.email}</a>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <a href="tel:${doctor.user.phone}">${doctor.user.phone}</a>
                    </div>
                </div>
                
                <p>${doctor.bio || 'Experienced medical professional dedicated to patient care.'}</p>
                
                <div class="doctor-specializations">
                    <span class="specialization-tag">${formatSpecialty(doctor.specialization)}</span>
                </div>
                
                <div class="doctor-actions">
                    <a href="patient-portal.html" class="btn">Book Appointment</a>
                    <button class="btn btn-outline" onclick="viewDoctorProfile('${doctor._id}')">View Profile</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getDoctorIcon(specialization) {
    const icons = {
        'cardiology': '❤️',
        'neurology': '🧠',
        'pediatrics': '👶',
        'orthopedics': '🦴',
        'ophthalmology': '👁️',
        'ent': '👂',
        'pulmonology': '🫁',
        'oncology': '🧬',
        'hematology': '🩸',
        'gastroenterology': '🍽️',
        'dermatology': '🧴',
        'dentistry': '🦷',
        'psychiatry': '🧘',
        'obgyn': '🤰',
        'urology': '🔄',
        'physical-therapy': '💪'
    };
    return icons[specialization] || '👨‍⚕️';
}

function formatSpecialty(specialty) {
    return specialty.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Jijue Hospital Frontend Loaded');
    
    // Add any initialization code here
    initializeNavigation();
    initializeAnimations();
});

function initializeNavigation() {
    // Mobile navigation toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.textContent = navMenu.classList.contains('active') ? '✕' : '☰';
        });
    }
}

function initializeAnimations() {
    // Scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.scroll-animate, .fade-in').forEach(el => {
        observer.observe(el);
    });
}