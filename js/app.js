// ============================================================================
// AQEvent Scheduler - Main Application Logic (William & Mary Branded)
// File: js/app.js
// Handles navigation, utilities, notifications, and shared functionality
// ============================================================================

// ============================================================================
// GLOBAL APPLICATION STATE
// ============================================================================

window.AQEvent = {
    // Application metadata
    app: {
        name: 'AQEvent Scheduler',
        version: '1.0.0',
        institution: 'William & Mary',
        currentPage: 'index',
        isInitialized: false
    },
    
    // W&M Academic configuration
    config: {
        timezone: 'America/New_York',
        academicYear: '2024-2025',
        semesterStart: '2024-08-26',
        semesterEnd: '2024-12-13',
        
        // W&M specific locations
        locations: [
            'Concert Hall (Room 132)',
            'Comey Recital Hall (Room 142)',
            'Choral Rehearsal Room (Room 154)',
            'Instrumental Rehearsal Room (Room 116)',
            'Classroom (Room 217)',
            'Classroom (Room 228)',
            'Global Ensembles Room (Room 159)',
            'The Glenn Close Theatre',
            'Studio Theatre',
            'Laboratory Theatre'
        ],
        
        // Academic event types
        eventTypes: [
            'Presented Season',
            'Theatre',
            'Music',
            'Seminar',
            'Arts Exhibition',
            'Workshop',
            'Rehearsal',
            'Performance',
            'Meeting',
            'Others'
        ],
        
        // Academic time slots
        timeSlots: {
            morning: { start: '08:00', end: '12:00' },
            afternoon: { start: '12:00', end: '17:00' },
            evening: { start: '17:00', end: '22:00' }
        }
    },
    
    // Current user session
    user: {
        isAuthenticated: false,
        isAdmin: false,
        email: '',
        permissions: []
    },
    
    // Application state
    state: {
        currentEvents: [],
        pendingEvents: [],
        studentNames: [],
        filters: {},
        loading: false,
        errors: []
    }
};

// ============================================================================
// INITIALIZATION & PAGE MANAGEMENT
// ============================================================================

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎓 William & Mary AQEvent Scheduler initializing...');
    initializeApplication();
});

// Main initialization function
async function initializeApplication() {
    try {
        showLoadingState('Initializing William & Mary Event Scheduler...');
        
        // Detect current page
        detectCurrentPage();
        
        // Initialize GitHub API
        const githubConnected = await window.GitHubAPI.initializeGitHubAPI();
        console.log('📡 GitHub API Status:', githubConnected ? 'Connected' : 'Not connected');
        
        // Setup navigation
        setupNavigation();
        
        // Initialize page-specific functionality
        await initializePageSpecific();
        
        // Setup global event listeners
        setupGlobalEventListeners();
        
        // Load initial data
        await loadInitialData();
        
        // Mark as initialized
        window.AQEvent.app.isInitialized = true;
        
        hideLoadingState();
        showNotification('William & Mary Event Scheduler ready! 🎓', 'success');
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('💥 Initialization failed:', error);
        hideLoadingState();
        showErrorState('Failed to initialize application: ' + error.message);
    }
}

// Detect which page we're currently on
function detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    if (filename.includes('admin')) {
        window.AQEvent.app.currentPage = 'admin';
    } else if (filename.includes('calendar')) {
        window.AQEvent.app.currentPage = 'calendar';
    } else {
        window.AQEvent.app.currentPage = 'index';
    }
    
    console.log('📍 Current page detected:', window.AQEvent.app.currentPage);
    
    // Update page title with W&M branding
    updatePageTitle();
}

// Update page title with W&M branding
function updatePageTitle() {
    const pageTitles = {
        'index': 'Schedule Event - AQEvent | William & Mary',
        'calendar': 'Event Calendar - AQEvent | William & Mary',
        'admin': 'Admin Panel - AQEvent | William & Mary'
    };
    
    const title = pageTitles[window.AQEvent.app.currentPage] || 'AQEvent | William & Mary';
    document.title = title;
}

// ============================================================================
// NAVIGATION SYSTEM
// ============================================================================

// Setup navigation functionality
function setupNavigation() {
    console.log('🧭 Setting up W&M navigation system...');
    
    // Handle navigation button clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('nav-btn') || e.target.closest('.nav-btn')) {
            e.preventDefault();
            const link = e.target.classList.contains('nav-btn') ? e.target : e.target.closest('.nav-btn');
            const href = link.getAttribute('href');
            
            if (href && href.startsWith('?page=')) {
                const page = href.replace('?page=', '');
                navigateToPage(page);
            }
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.page) {
            navigateToPage(e.state.page, false);
        }
    });
    
    // Highlight current page in navigation
    highlightCurrentNavigation();
}

// Navigate to a specific page
function navigateToPage(page, updateHistory = true) {
    const pageUrls = {
        'form': 'index.html',
        'calendar': 'calendar.html',
        'admin': 'admin.html'
    };
    
    const url = pageUrls[page] || 'index.html';
    
    if (updateHistory) {
        history.pushState({ page: page }, '', url);
    }
    
    // For GitHub Pages, we need to actually navigate
    window.location.href = url;
}

// Highlight current navigation item
function highlightCurrentNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const currentPage = window.AQEvent.app.currentPage;
    
    navBtns.forEach(btn => {
        const href = btn.getAttribute('href');
        btn.classList.remove('active', 'bg-gold');
        
        if ((currentPage === 'index' && href === '?page=form') ||
            (currentPage === 'calendar' && href === '?page=calendar') ||
            (currentPage === 'admin' && href === '?page=admin')) {
            btn.classList.add('active', 'bg-gold');
            btn.style.background = 'var(--wm-accent-gold)';
            btn.style.color = 'var(--wm-primary-green)';
        }
    });
}

// ============================================================================
// PAGE-SPECIFIC INITIALIZATION
// ============================================================================

// Initialize functionality specific to current page
async function initializePageSpecific() {
    const page = window.AQEvent.app.currentPage;
    console.log('📄 Initializing page-specific functionality for:', page);
    
    switch (page) {
        case 'index':
            await initializeEventForm();
            break;
        case 'calendar':
            await initializeCalendarView();
            break;
        case 'admin':
            await initializeAdminPanel();
            break;
        default:
            console.log('ℹ️ No specific initialization for this page');
    }
}

// Initialize event submission form
async function initializeEventForm() {
    console.log('📝 Initializing W&M event submission form...');
    
    try {
        // Load student names for autocomplete
        window.AQEvent.state.studentNames = await window.GitHubAPI.loadStudentNames();
        console.log('👥 Loaded', window.AQEvent.state.studentNames.length, 'student names');
        
        // Setup form validation
        setupFormValidation();
        
        // Setup student autocomplete
        setupStudentAutocomplete();
        
        // Setup form submission
        setupFormSubmission();
        
        // Set academic date constraints
        setupAcademicDateConstraints();
        
        // Auto-populate W&M specific data
        populateWMData();
        
    } catch (error) {
        console.error('❌ Error initializing form:', error);
        showNotification('Error loading form data: ' + error.message, 'error');
    }
}

// Initialize calendar view
async function initializeCalendarView() {
    console.log('📅 Initializing W&M calendar view...');
    
    try {
        // Load approved events
        window.AQEvent.state.currentEvents = await window.GitHubAPI.loadApprovedEvents();
        console.log('📋 Loaded', window.AQEvent.state.currentEvents.length, 'approved events');
        
        // Setup calendar functionality (will be expanded in calendar.html step)
        setupCalendarFilters();
        
    } catch (error) {
        console.error('❌ Error initializing calendar:', error);
        showNotification('Error loading calendar: ' + error.message, 'error');
    }
}

// Initialize admin panel
async function initializeAdminPanel() {
    console.log('⚙️ Initializing W&M admin panel...');
    
    // Check admin authentication first
    if (!checkAdminAuthentication()) {
        showAdminLogin();
        return;
    }
    
    try {
        // Load pending events
        window.AQEvent.state.pendingEvents = await window.GitHubAPI.loadPendingEvents();
        console.log('⏳ Loaded', window.AQEvent.state.pendingEvents.length, 'pending events');
        
        // Setup admin functionality (will be expanded in admin.html step)
        setupAdminControls();
        
    } catch (error) {
        console.error('❌ Error initializing admin panel:', error);
        showNotification('Error loading admin panel: ' + error.message, 'error');
    }
}

// ============================================================================
// WILLIAM & MARY SPECIFIC FUNCTIONALITY
// ============================================================================

// Populate form with W&M specific data
function populateWMData() {
    // Populate location dropdown
    const locationSelect = document.getElementById('location');
    if (locationSelect) {
        locationSelect.innerHTML = '<option value="">Select a location</option>';
        window.AQEvent.config.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationSelect.appendChild(option);
        });
    }
    
    // Populate event type dropdown
    const eventTypeSelect = document.getElementById('eventType');
    if (eventTypeSelect) {
        eventTypeSelect.innerHTML = '<option value="">Select event type</option>';
        window.AQEvent.config.eventTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            eventTypeSelect.appendChild(option);
        });
    }
    
    console.log('🎓 W&M specific data populated');
}

// Setup academic date constraints
function setupAcademicDateConstraints() {
    const eventDateInput = document.getElementById('eventDate');
    if (eventDateInput) {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        eventDateInput.min = today;
        
        // Set maximum date to end of academic year
        eventDateInput.max = window.AQEvent.config.semesterEnd;
        
        // Add academic calendar validation
        eventDateInput.addEventListener('change', validateAcademicDate);
    }
}

// Validate date against academic calendar
function validateAcademicDate(event) {
    const selectedDate = new Date(event.target.value);
    const semesterStart = new Date(window.AQEvent.config.semesterStart);
    const semesterEnd = new Date(window.AQEvent.config.semesterEnd);
    
    if (selectedDate < semesterStart || selectedDate > semesterEnd) {
        showNotification(`Please select a date within the ${window.AQEvent.config.academicYear} academic year`, 'warning');
        event.target.value = '';
    }
}

// ============================================================================
// FORM VALIDATION SYSTEM
// ============================================================================

// Setup comprehensive form validation
function setupFormValidation() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    console.log('✅ Setting up W&M form validation...');
    
    // Real-time validation for all form inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
    
    // Special validation for time fields
    setupTimeValidation();
    
    // Special validation for contact fields
    setupContactValidation();
}

// Validate individual form field
function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    
    // Clear previous error
    clearFieldError(event);
    
    // Check if required field is empty
    if (isRequired && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Field-specific validation
    switch (field.type) {
        case 'email':
            return validateEmail(field, value);
        case 'tel':
            return validatePhone(field, value);
        case 'date':
            return validateDate(field, value);
        case 'time':
            return validateTime(field, value);
        default:
            return true;
    }
}

// Email validation with W&M domain preference
function validateEmail(field, value) {
    if (!value) return true; // Empty is handled by required check
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    // Suggest W&M email if not using institutional email
    if (!value.includes('@wm.edu') && !value.includes('@email.wm.edu')) {
        showFieldWarning(field, 'Consider using your William & Mary email address');
    }
    
    return true;
}

// Phone validation
function validatePhone(field, value) {
    if (!value) return true;
    
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    const digitCount = value.replace(/\D/g, '').length;
    
    if (!phoneRegex.test(value) || digitCount < 10) {
        showFieldError(field, 'Please enter a valid phone number (at least 10 digits)');
        return false;
    }
    
    return true;
}

// Date validation for academic calendar
function validateDate(field, value) {
    if (!value) return true;
    
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showFieldError(field, 'Event date cannot be in the past');
        return false;
    }
    
    return true;
}

// Time validation
function validateTime(field, value) {
    if (!value) return true;
    
    // Basic time format validation is handled by browser
    // Add custom academic time slot validation if needed
    
    return true;
}

// Setup time field validation (start/end times)
function setupTimeValidation() {
    const timeFields = {
        reservationStart: document.getElementById('reservationStartTime'),
        reservationEnd: document.getElementById('reservationEndTime'),
        eventStart: document.getElementById('eventStartTime'),
        eventEnd: document.getElementById('eventEndTime')
    };
    
    // Validate time relationships
    Object.values(timeFields).forEach(field => {
        if (field) {
            field.addEventListener('change', validateTimeRelationships);
        }
    });
}

// Validate time relationships (start before end, event within reservation)
function validateTimeRelationships() {
    const times = {
        reservationStart: document.getElementById('reservationStartTime')?.value,
        reservationEnd: document.getElementById('reservationEndTime')?.value,
        eventStart: document.getElementById('eventStartTime')?.value,
        eventEnd: document.getElementById('eventEndTime')?.value
    };
    
    // Check if reservation end is after start
    if (times.reservationStart && times.reservationEnd) {
        if (times.reservationStart >= times.reservationEnd) {
            showNotification('Reservation end time must be after start time', 'error');
            return false;
        }
    }
    
    // Check if event end is after start
    if (times.eventStart && times.eventEnd) {
        if (times.eventStart >= times.eventEnd) {
            showNotification('Event end time must be after start time', 'error');
            return false;
        }
    }
    
    // Check if event is within reservation
    if (times.reservationStart && times.reservationEnd && times.eventStart && times.eventEnd) {
        if (times.eventStart < times.reservationStart || times.eventEnd > times.reservationEnd) {
            showNotification('Event times must be within reservation times', 'warning');
            return false;
        }
    }
    
    return true;
}

// Setup contact validation
function setupContactValidation() {
    // Auto-format phone number
    const phoneInput = document.getElementById('contactNumber');
    if (phoneInput) {
        phoneInput.addEventListener('input', formatPhoneNumber);
    }
}

// Format phone number as user types
function formatPhoneNumber(event) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 6) {
        value = value.replace(/(\d{3})(\d{3})(\d+)/, '($1) $2-$3');
    } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d+)/, '($1) $2');
    }
    event.target.value = value;
}

// ============================================================================
// STUDENT AUTOCOMPLETE SYSTEM
// ============================================================================

// Setup student name autocomplete
function setupStudentAutocomplete() {
    const studentInput = document.getElementById('assignedStudents');
    if (!studentInput) return;
    
    console.log('👥 Setting up student autocomplete...');
    
    let selectedStudents = [];
    let autocompleteIndex = -1;
    
    // Create autocomplete dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.display = 'none';
    studentInput.parentNode.insertBefore(dropdown, studentInput.nextSibling);
    
    // Create chips container
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'student-chips d-flex flex-wrap gap-xs p-sm';
    chipsContainer.style.minHeight = '40px';
    chipsContainer.style.border = '2px dashed var(--wm-gray-300)';
    chipsContainer.style.borderRadius = 'var(--radius-md)';
    chipsContainer.style.background = 'var(--wm-gray-100)';
    dropdown.parentNode.insertBefore(chipsContainer, dropdown.nextSibling);
    
    // Input event listeners
    studentInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        if (query.length > 0) {
            showAutocomplete(query);
        } else {
            hideAutocomplete();
        }
    });
    
    studentInput.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            autocompleteIndex = Math.min(autocompleteIndex + 1, items.length - 1);
            updateAutocompleteSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            autocompleteIndex = Math.max(autocompleteIndex - 1, -1);
            updateAutocompleteSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (autocompleteIndex >= 0 && items[autocompleteIndex]) {
                addStudent(items[autocompleteIndex].textContent);
            } else if (this.value.trim()) {
                addStudent(this.value.trim());
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    });
    
    // Show autocomplete suggestions
    function showAutocomplete(query) {
        const matches = window.AQEvent.state.studentNames.filter(name => 
            name.toLowerCase().includes(query) && 
            !selectedStudents.includes(name)
        );
        
        if (matches.length > 0) {
            dropdown.innerHTML = matches.map(name => 
                `<div class="autocomplete-item" style="padding: var(--spacing-xs); cursor: pointer; border-bottom: 1px solid var(--wm-gray-200);">${name}</div>`
            ).join('');
            
            // Add click handlers
            dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', function() {
                    addStudent(this.textContent);
                });
                
                item.addEventListener('mouseenter', function() {
                    this.style.background = 'var(--wm-primary-green)';
                    this.style.color = 'var(--wm-white)';
                });
                
                item.addEventListener('mouseleave', function() {
                    this.style.background = '';
                    this.style.color = '';
                });
            });
            
            dropdown.style.display = 'block';
            dropdown.style.position = 'absolute';
            dropdown.style.top = '100%';
            dropdown.style.left = '0';
            dropdown.style.right = '0';
            dropdown.style.background = 'var(--wm-white)';
            dropdown.style.border = '1px solid var(--wm-gray-300)';
            dropdown.style.borderRadius = 'var(--radius-md)';
            dropdown.style.boxShadow = 'var(--shadow-md)';
            dropdown.style.maxHeight = '200px';
            dropdown.style.overflowY = 'auto';
            dropdown.style.zIndex = '1000';
            
            autocompleteIndex = -1;
        } else {
            hideAutocomplete();
        }
    }
    
    // Hide autocomplete
    function hideAutocomplete() {
        dropdown.style.display = 'none';
        autocompleteIndex = -1;
    }
    
    // Update autocomplete selection
    function updateAutocompleteSelection() {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === autocompleteIndex) {
                item.style.background = 'var(--wm-primary-green)';
                item.style.color = 'var(--wm-white)';
            } else {
                item.style.background = '';
                item.style.color = '';
            }
        });
    }
    
    // Add student to selection
    function addStudent(name) {
        if (name && !selectedStudents.includes(name)) {
            selectedStudents.push(name);
            updateStudentChips();
            studentInput.value = '';
            hideAutocomplete();
        }
    }
    
    // Remove student from selection
    function removeStudent(name) {
        selectedStudents = selectedStudents.filter(s => s !== name);
        updateStudentChips();
    }
    
    // Update student chips display
    function updateStudentChips() {
        chipsContainer.innerHTML = selectedStudents.map(name => 
            `<div class="chip">
                ${name}
                <button type="button" class="chip-remove" onclick="removeStudentChip('${name}')">×</button>
            </div>`
        ).join('');
    }
    
    // Make remove function global
    window.removeStudentChip = removeStudent;
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.student-input-container') && !e.target.closest('.autocomplete-dropdown')) {
            hideAutocomplete();
        }
    });
}

// ============================================================================
// FORM SUBMISSION SYSTEM
// ============================================================================

// Setup form submission
function setupFormSubmission() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmission);
}

// Handle form submission
async function handleFormSubmission(event) {
    event.preventDefault();
    
    console.log('📤 Processing W&M event submission...');
    
    // Validate form
    if (!validateCompleteForm()) {
        showNotification('Please correct the errors before submitting', 'error');
        return;
    }
    
    try {
        showLoadingState('Submitting your event for approval...');
        
        // Collect form data
        const formData = collectFormData();
        
        // Check for conflicts
        const conflicts = await checkEventConflicts(formData);
        if (conflicts.length > 0) {
            hideLoadingState();
            showConflictDialog(conflicts, formData);
            return;
        }
        
        // Submit to GitHub
        const result = await window.GitHubAPI.submitEventForApproval(formData);
        
        hideLoadingState();
        
        if (result.success) {
            showNotification(`Event submitted successfully! Your event ID is: ${result.eventId}`, 'success');
            resetForm();
        } else {
            showNotification('Error submitting event: ' + result.message, 'error');
        }
        
    } catch (error) {
        hideLoadingState();
        console.error('❌ Submission error:', error);
        showNotification('Error submitting event: ' + error.message, 'error');
    }
}

// Collect form data
function collectFormData() {
    const selectedStudents = Array.from(document.querySelectorAll('.chip'))
        .map(chip => chip.textContent.replace('×', '').trim());
    
    return {
        // Basic information
        name: document.getElementById('eventName')?.value || '',
        eventDate: document.getElementById('eventDate')?.value || '',
        location: document.getElementById('location')?.value || '',
        eventType: document.getElementById('eventType')?.value || '',
        description: document.getElementById('description')?.value || '',
        
        // Timing
        reservationStartTime: document.getElementById('reservationStartTime')?.value || '',
        reservationEndTime: document.getElementById('reservationEndTime')?.value || '',
        eventStartTime: document.getElementById('eventStartTime')?.value || '',
        eventEndTime: document.getElementById('eventEndTime')?.value || '',
        
        // Contact
        contactPerson: document.getElementById('contactPerson')?.value || '',
        contactNumber: document.getElementById('contactNumber')?.value || '',
        contactEmail: document.getElementById('contactEmail')?.value || '',
        
        // Staff and logistics
        staffWorkingEvent: document.getElementById('staffWorkingEvent')?.value || '',
        neededLogistics: document.getElementById('neededLogistics')?.value || '',
        studentEmployeesNeeded: document.getElementById('studentToggle')?.classList.contains('active') ? 'Yes' : 'No',
        numberOfStudentsNeeded: document.getElementById('numberOfStudents')?.value || 0,
        assignedStudents: selectedStudents.join(', ')
    };
}

// ============================================================================
// NOTIFICATION & UI FEEDBACK SYSTEM
// ============================================================================

// Show W&M branded notification
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // W&M branded styling
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--wm-white);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        padding: var(--spacing-sm);
        z-index: 10001;
        transform: translateX(400px);
        transition: transform var(--transition-normal);
        border-left: 4px solid;
        max-width: 350px;
        font-weight: 500;
        font-size: var(--font-size-base);
        border: 1px solid var(--wm-gray-200);
    `;
    
    // Type-specific styling
    const typeStyles = {
        success: { borderColor: 'var(--wm-success)', color: 'var(--wm-success)' },
        error: { borderColor: 'var(--wm-error)', color: 'var(--wm-error)' },
        warning: { borderColor: 'var(--wm-warning)', color: 'var(--wm-warning)' },
        info: { borderColor: 'var(--wm-primary-green)', color: 'var(--wm-primary-green)' }
    };
    
    const style = typeStyles[type] || typeStyles.info;
    notification.style.borderLeftColor = style.borderColor;
    notification.style.color = style.color;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-hide
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    console.log(`🔔 Notification [${type}]:`, message);
}

// Show loading state
function showLoadingState(message = 'Loading...') {
    window.AQEvent.state.loading = true;
    
    // Create or update loading overlay
    let loading = document.getElementById('globalLoading');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'globalLoading';
        loading.className = 'loading show';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(244, 244, 244, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        loading.innerHTML = `
            <div class="spinner"></div>
            <p style="color: var(--wm-primary-green); font-weight: 600; margin-top: var(--spacing-sm);">${message}</p>
        `;
        
        document.body.appendChild(loading);
    } else {
        loading.querySelector('p').textContent = message;
        loading.style.display = 'flex';
    }
}

// Hide loading state
function hideLoadingState() {
    window.AQEvent.state.loading = false;
    
    const loading = document.getElementById('globalLoading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Show error state
function showErrorState(message) {
    hideLoadingState();
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: var(--wm-white);
        border: 2px solid var(--wm-error);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        margin: var(--spacing-lg);
        text-align: center;
        color: var(--wm-error);
    `;
    
    errorDiv.innerHTML = `
        <h3 style="color: var(--wm-error); margin-bottom: var(--spacing-sm);">⚠️ System Error</h3>
        <p style="margin-bottom: var(--spacing-sm);">${message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">🔄 Refresh Page</button>
    `;
    
    // Insert after header or at top of body
    const header = document.querySelector('.header');
    if (header && header.parentNode) {
        header.parentNode.insertBefore(errorDiv, header.nextSibling);
    } else {
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// W&M academic date utilities
const DateUtils = {
    // Format date for W&M academic use
    formatAcademic: function(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: window.AQEvent.config.timezone
        });
    },
    
    // Format time for W&M academic use
    formatTime: function(time) {
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: window.AQEvent.config.timezone
        });
    },
    
    // Check if date is within academic year
    isAcademicYear: function(date) {
        const checkDate = new Date(date);
        const start = new Date(window.AQEvent.config.semesterStart);
        const end = new Date(window.AQEvent.config.semesterEnd);
        return checkDate >= start && checkDate <= end;
    },
    
    // Get academic day of week
    getAcademicDay: function(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(date).getDay()];
    }
};

// Form utilities
const FormUtils = {
    // Reset form to initial state
    reset: function(formId = 'eventForm') {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            // Clear student chips
            const chips = document.querySelector('.student-chips');
            if (chips) chips.innerHTML = '';
            // Reset toggle switches
            const toggles = form.querySelectorAll('.toggle-switch.active');
            toggles.forEach(toggle => toggle.classList.remove('active'));
            // Clear errors
            this.clearAllErrors(form);
        }
    },
    
    // Clear all field errors
    clearAllErrors: function(form) {
        const errorElements = form.querySelectorAll('.field-error, .field-warning');
        errorElements.forEach(el => el.remove());
        
        const fields = form.querySelectorAll('.form-control');
        fields.forEach(field => {
            field.style.borderColor = '';
            field.classList.remove('error', 'warning');
        });
    }
};

// Validation utilities
const ValidationUtils = {
    // Validate entire form
    validateForm: function(formId = 'eventForm') {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                showFieldError(field, 'This field is required');
                isValid = false;
            }
        });
        
        return isValid;
    },
    
    // Check for time conflicts
    checkTimeConflict: function(startTime, endTime, existingEvents) {
        // This will be expanded when we have calendar functionality
        return false;
    }
};

// ============================================================================
// GLOBAL EVENT LISTENERS
// ============================================================================

// Setup global event listeners
function setupGlobalEventListeners() {
    // Handle escape key for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Handle click outside modals
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            closeAllModals();
        }
    });
    
    // Handle form submission with Enter key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.form && !e.target.matches('textarea')) {
            e.preventDefault();
            const submitBtn = e.target.form.querySelector('[type="submit"], .btn-primary');
            if (submitBtn) submitBtn.click();
        }
    });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Close all modals
function closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
    });
}

// Show field error
function showFieldError(field, message) {
    clearFieldError({ target: field });
    
    field.style.borderColor = 'var(--wm-error)';
    field.classList.add('error');
    
    const error = document.createElement('div');
    error.className = 'field-error';
    error.style.cssText = `
        color: var(--wm-error);
        font-size: var(--font-size-sm);
        margin-top: 4px;
        font-weight: 500;
    `;
    error.textContent = message;
    
    field.parentNode.appendChild(error);
}

// Show field warning
function showFieldWarning(field, message) {
    const existing = field.parentNode.querySelector('.field-warning');
    if (existing) existing.remove();
    
    const warning = document.createElement('div');
    warning.className = 'field-warning';
    warning.style.cssText = `
        color: var(--wm-warning);
        font-size: var(--font-size-sm);
        margin-top: 4px;
        font-weight: 500;
    `;
    warning.textContent = message;
    
    field.parentNode.appendChild(warning);
}

// Clear field error
function clearFieldError(event) {
    const field = event.target;
    field.style.borderColor = '';
    field.classList.remove('error', 'warning');
    
    const errors = field.parentNode.querySelectorAll('.field-error, .field-warning');
    errors.forEach(error => error.remove());
}

// Load initial application data
async function loadInitialData() {
    try {
        // This will be expanded as we build more features
        console.log('📊 Loading initial application data...');
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
    }
}

// Reset form (global function)
function resetForm() {
    FormUtils.reset();
    showNotification('Form reset successfully', 'info');
}

// Validate complete form (global function)
function validateCompleteForm() {
    return ValidationUtils.validateForm() && validateTimeRelationships();
}

// Check event conflicts (placeholder - will be implemented fully later)
async function checkEventConflicts(eventData) {
    try {
        const existingEvents = await window.GitHubAPI.loadApprovedEvents();
        return window.GitHubAPI.checkEventConflicts(eventData, existingEvents);
    } catch (error) {
        console.error('Error checking conflicts:', error);
        return [];
    }
}

// Show conflict dialog (placeholder)
function showConflictDialog(conflicts, eventData) {
    const message = conflicts.map(c => c.message).join('\n');
    if (confirm(`Conflict detected:\n${message}\n\nDo you want to submit anyway?`)) {
        // Force submit
        window.GitHubAPI.submitEventForApproval(eventData);
    }
}

// Admin authentication check (placeholder)
function checkAdminAuthentication() {
    const authData = window.GitHubAPI.getStoredAuthData();
    return authData && window.GitHubAPI.validateAdminPassword(authData.password);
}

// Show admin login (placeholder)
function showAdminLogin() {
    console.log('🔐 Admin authentication required');
    // This will be implemented in the admin panel step
}

// Setup admin controls (placeholder)
function setupAdminControls() {
    console.log('⚙️ Setting up admin controls');
    // This will be implemented in the admin panel step
}

// Setup calendar filters (placeholder)
function setupCalendarFilters() {
    console.log('📅 Setting up calendar filters');
    // This will be implemented in the calendar step
}

// ============================================================================
// EXPORT GLOBAL UTILITIES
// ============================================================================

// Make utilities available globally
window.AQEventUtils = {
    DateUtils,
    FormUtils,
    ValidationUtils,
    showNotification,
    showLoadingState,
    hideLoadingState,
    navigateToPage
};

// ============================================================================
// APPLICATION READY
// ============================================================================

console.log('🎓 William & Mary AQEvent Scheduler app.js loaded successfully!');
console.log('📚 Available utilities: window.AQEventUtils');
console.log('🌐 Application state: window.AQEvent');
