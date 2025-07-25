// ============================================================================
// AQEvent Scheduler - Enhanced Main Application Logic (William & Mary)
// File: js/app.js
// Enhanced to support multiple dates, file uploads, and new form fields
// ============================================================================

// ============================================================================
// GLOBAL APPLICATION STATE
// ============================================================================

window.AQEvent = {
    // Application metadata
    app: {
        name: 'AQEvent Scheduler',
        version: '2.0.0',
        institution: 'William & Mary',
        currentPage: 'index',
        isInitialized: false
    },
    
    // W&M Academic configuration
    config: {
        timezone: 'America/New_York',
        academicYear: '2025-2026',
        semesterStart: '2025-07-01',
        semesterEnd: '2027-06-31',
        
        // W&M specific locations
        locations: [
            'Concert Hall (Room 132)',
            'Comey Recital Hall (Room 142)',
            'The Glenn Close Theatre',
            'Studio Theatre',
        ],
        
        eventTypes: [
            // Arts & Performance
            'Theatre',
            'Music Concert',
            'Dance Performance',
            'Film Screening',
            'Arts Exhibition',
            'Rehearsal',
            'Performance',
            'Lecture',
            'Seminar',
            'Conference',
            'Panel Discussion',
            'Workshop',
            'Masterclass',
            'Symposium',
            'Meeting',
            'Orientation',
            'Info Session',
            'Ceremony ',
            'Open House',
            'Community Gathering',
            'Fundraiser',
            'Social Event',
            'Music Recital',
            'Competition',
            'Audition',
            'Technical Setup Only',
            'Private Event',
            'Other'
        ]

        
        // Academic time slots
        timeSlots: {
            morning: { start: '06:00', end: '12:00' },
            afternoon: { start: '12:00', end: '17:00' },
            evening: { start: '17:00', end: '23:00' }
        },

        // Enhanced file upload settings
        fileUpload: {
            allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.xlsx', '.xls', '.ppt', '.pptx'],
            maxFileSize: 50 * 1024 * 1024, // 50MB per file
            maxTotalFiles: 10,
            storageFolder: 'event-files'
        }
    },
    
    // Current user session
    user: {
        isAuthenticated: false,
        isAdmin: false,
        email: '',
        permissions: []
    },
    
    // Enhanced application state
    state: {
        currentEvents: [],
        pendingEvents: [],
        studentNames: [],
        filters: {},
        loading: false,
        errors: [],
        
        // New state for enhanced features
        uploadedFiles: [],
        selectedDates: [],
        recurringDates: [],
        formSeries: null
    }
};

// ============================================================================
// INITIALIZATION & PAGE MANAGEMENT
// ============================================================================

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎓 William & Mary AQEvent Scheduler v2.0 initializing...');
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
        showNotification('Create a new request! 🎓', 'success');
        
        console.log('✅ Enhanced application initialized successfully');
        
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
    console.log('📄 Initializing enhanced page functionality for:', page);
    
    switch (page) {
        case 'index':
            await initializeEnhancedEventForm();
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

// Initialize enhanced event submission form
async function initializeEnhancedEventForm() {
    console.log('📝 Initializing enhanced W&M event submission form...');
    
    try {
        // Load student names for autocomplete (if still needed)
        window.AQEvent.state.studentNames = await window.GitHubAPI.loadStudentNames();
        console.log('👥 Loaded', window.AQEvent.state.studentNames.length, 'student names');
        
        // Setup enhanced form validation
        setupEnhancedFormValidation();
        
        // Setup enhanced form submission
        setupEnhancedFormSubmission();
        
        // Set academic date constraints
        setupAcademicDateConstraints();
        
        // Auto-populate W&M specific data
        populateWMData();
        
        // Setup enhanced features
        setupEnhancedFormFeatures();
        
        console.log('✅ Enhanced form initialization complete');
        
    } catch (error) {
        console.error('❌ Error initializing enhanced form:', error);
        showNotification('Error loading form data: ' + error.message, 'error');
    }
}

// Setup enhanced form features
function setupEnhancedFormFeatures() {
    // Setup file upload handling
    setupAdvancedFileUpload();
    
    // Setup currency formatting
    setupCurrencyFormatting();
    
    // Setup organization type handling
    setupOrganizationTypeHandling();
    
    // Setup date frequency handling
    setupDateFrequencyHandling();
    
    // Setup recurring events
    setupRecurringEventsSystem();
    
    // Setup form auto-save with enhanced data
    setupEnhancedFormAutoSave();
}

// Initialize calendar view
async function initializeCalendarView() {
    console.log('📅 Initializing W&M calendar view...');
    
    try {
        // Load approved events
        window.AQEvent.state.currentEvents = await window.GitHubAPI.loadApprovedEvents();
        console.log('📋 Loaded', window.AQEvent.state.currentEvents.length, 'approved events');
        
        // Setup calendar functionality
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
        
        // Setup admin functionality
        setupAdminControls();
        
    } catch (error) {
        console.error('❌ Error initializing admin panel:', error);
        showNotification('Error loading admin panel: ' + error.message, 'error');
    }
}

// ============================================================================
// ENHANCED FILE UPLOAD SYSTEM
// ============================================================================

function setupAdvancedFileUpload() {
    const fileInput = document.getElementById('eventFiles');
    if (!fileInput) return;
    
    console.log('📎 Setting up advanced file upload system...');
    
    // Enhanced file input handling
    fileInput.addEventListener('change', handleFileSelection);
    
    // Drag and drop support
    setupDragAndDrop();
    
    // File validation
    setupFileValidation();
}

function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (validateFile(file)) {
            window.AQEvent.state.uploadedFiles.push(file);
        }
    });
    
    updateFilePreviewDisplay();
    console.log('📁 Files selected:', window.AQEvent.state.uploadedFiles.length);
}

function validateFile(file) {
    const config = window.AQEvent.config.fileUpload;
    
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!config.allowedTypes.includes(fileExtension)) {
        showNotification(`File type ${fileExtension} is not allowed`, 'error');
        return false;
    }
    
    // Check file size
    if (file.size > config.maxFileSize) {
        showNotification(`File ${file.name} is too large (max ${config.maxFileSize / 1024 / 1024}MB)`, 'error');
        return false;
    }
    
    // Check total files
    if (window.AQEvent.state.uploadedFiles.length >= config.maxTotalFiles) {
        showNotification(`Maximum ${config.maxTotalFiles} files allowed`, 'error');
        return false;
    }
    
    return true;
}

function setupDragAndDrop() {
    const fileInput = document.getElementById('eventFiles');
    if (!fileInput) return;
    
    const dropZone = fileInput.closest('.form-group');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('drag-over');
    }
    
    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        
        files.forEach(file => {
            if (validateFile(file)) {
                window.AQEvent.state.uploadedFiles.push(file);
            }
        });
        
        updateFilePreviewDisplay();
    }
}

function updateFilePreviewDisplay() {
    // This function is implemented in the HTML's inline JavaScript
    // We're keeping the interface consistent
    if (window.updateFilePreview) {
        window.updateFilePreview();
    }
}

// ============================================================================
// CURRENCY FORMATTING SYSTEM
// ============================================================================

function setupCurrencyFormatting() {
    const budgetInput = document.getElementById('estimatedBudget');
    if (!budgetInput) return;
    
    console.log('💰 Setting up currency formatting...');
    
    budgetInput.addEventListener('input', formatCurrencyInput);
    budgetInput.addEventListener('blur', finalizeCurrencyInput);
}

function formatCurrencyInput(event) {
    let value = event.target.value;
    
    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    event.target.value = value;
}

function finalizeCurrencyInput(event) {
    let value = parseFloat(event.target.value);
    if (!isNaN(value) && value > 0) {
        event.target.value = value.toFixed(2);
    } else if (event.target.value === '') {
        event.target.value = '';
    } else {
        event.target.value = '0.00';
    }
}

// ============================================================================
// ORGANIZATION TYPE HANDLING
// ============================================================================

function setupOrganizationTypeHandling() {
    const groupTypeSelect = document.getElementById('groupCompanyType');
    if (!groupTypeSelect) return;
    
    console.log('🏢 Setting up organization type handling...');
    
    groupTypeSelect.addEventListener('change', handleOrganizationTypeChange);
    
    // Setup mutual exclusion for organization checkboxes
    setupOrganizationCheckboxLogic();
}

function handleOrganizationTypeChange(event) {
    const externalOrgDetails = document.getElementById('externalOrgDetails');
    if (!externalOrgDetails) return;
    
    if (event.target.value === 'external-organization') {
        externalOrgDetails.style.display = 'block';
        externalOrgDetails.classList.add('slide-down');
    } else {
        externalOrgDetails.style.display = 'none';
        // Clear all checkboxes
        externalOrgDetails.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    }
}

function setupOrganizationCheckboxLogic() {
    const profitOrg = document.getElementById('profitOrg');
    const nonProfitOrg = document.getElementById('nonProfitOrg');
    const vaTaxExempt = document.getElementById('vaTaxExempt');
    const org501c3 = document.getElementById('org501c3');
    
    if (!profitOrg || !nonProfitOrg) return;
    
    // Mutual exclusion between profit and non-profit
    profitOrg.addEventListener('change', function() {
        if (this.checked) {
            nonProfitOrg.checked = false;
            if (vaTaxExempt) vaTaxExempt.checked = false;
            if (org501c3) org501c3.checked = false;
        }
    });
    
    nonProfitOrg.addEventListener('change', function() {
        if (this.checked) {
            profitOrg.checked = false;
            // Auto-check related non-profit options
            if (vaTaxExempt) vaTaxExempt.checked = true;
            if (org501c3) org501c3.checked = true;
        } else {
            // Uncheck related options if non-profit is unchecked
            if (vaTaxExempt) vaTaxExempt.checked = false;
            if (org501c3) org501c3.checked = false;
        }
    });
}

// ============================================================================
// DATE FREQUENCY HANDLING
// ============================================================================

function setupDateFrequencyHandling() {
    const frequencySelect = document.getElementById('eventFrequency');
    if (!frequencySelect) return;
    
    console.log('📅 Setting up date frequency handling...');
    
    frequencySelect.addEventListener('change', handleFrequencyChange);
}

function handleFrequencyChange(event) {
    const frequency = event.target.value;
    
    // Hide all date groups
    hideAllDateGroups();
    
    // Clear previous selections
    window.AQEvent.state.selectedDates = [];
    window.AQEvent.state.recurringDates = [];
    
    switch (frequency) {
        case 'single':
            showSingleDateInput();
            break;
        case 'multiple':
            showMultipleDateInput();
            break;
        case 'daily':
        case 'weekly':
        case 'monthly':
        case 'yearly':
            showRecurringDateInput(frequency);
            break;
    }
}

function hideAllDateGroups() {
    const groups = ['singleDateGroup', 'multipleDatesGroup', 'recurringGroup'];
    groups.forEach(groupId => {
        const group = document.getElementById(groupId);
        if (group) {
            group.style.display = 'none';
        }
    });
}

function showSingleDateInput() {
    const group = document.getElementById('singleDateGroup');
    if (group) {
        group.style.display = 'block';
        document.getElementById('eventDate').required = true;
    }
}

function showMultipleDateInput() {
    const group = document.getElementById('multipleDatesGroup');
    if (group) {
        group.style.display = 'block';
    }
}

function showRecurringDateInput(frequency) {
    const group = document.getElementById('recurringGroup');
    if (group) {
        group.style.display = 'block';
        document.getElementById('recurringStartDate').required = true;
        document.getElementById('recurringEndDate').required = true;
        
        // Update interface based on frequency
        updateRecurringInterface(frequency);
    }
}

// ============================================================================
// RECURRING EVENTS SYSTEM
// ============================================================================

function setupRecurringEventsSystem() {
    console.log('🔄 Setting up recurring events system...');
    
    // Setup event listeners for recurring date generation
    const triggerElements = [
        'recurringStartDate', 
        'recurringEndDate', 
        'recurringInterval'
    ];
    
    triggerElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', debounce(generateRecurringDates, 500));
        }
    });
    
    // Setup days of week checkboxes
    const dayCheckboxes = document.querySelectorAll('.days-of-week-selector input[type="checkbox"]');
    dayCheckboxes.forEach(cb => {
        cb.addEventListener('change', debounce(generateRecurringDates, 500));
    });
    
    // Setup monthly pattern radio buttons
    const monthlyRadios = document.querySelectorAll('input[name="monthlyPattern"]');
    monthlyRadios.forEach(radio => {
        radio.addEventListener('change', debounce(generateRecurringDates, 500));
    });
    
    // Setup generate preview button
    const generateBtn = document.getElementById('generatePreviewBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateRecurringDates);
    }
}

function generateRecurringDates() {
    const frequency = document.getElementById('eventFrequency').value;
    const startDate = document.getElementById('recurringStartDate').value;
    const endDate = document.getElementById('recurringEndDate').value;
    const interval = parseInt(document.getElementById('recurringInterval').value) || 1;
    
    if (!startDate || !endDate || !frequency) {
        window.AQEvent.state.recurringDates = [];
        updateRecurringPreview([]);
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
        updateRecurringPreview(['Error: Start date must be before end date']);
        return;
    }
    
    let dates = [];
    
    try {
        switch (frequency) {
            case 'daily':
                dates = generateDailyDates(start, end, interval);
                break;
            case 'weekly':
                dates = generateWeeklyDates(start, end, interval);
                break;
            case 'monthly':
                dates = generateMonthlyDates(start, end, interval);
                break;
            case 'yearly':
                dates = generateYearlyDates(start, end, interval);
                break;
        }
        
        // Limit preview to first 100 dates
        const previewDates = [...dates];
        if (previewDates.length > 100) {
            previewDates.splice(100);
            previewDates.push(`... and ${dates.length - 100} more dates`);
        }
        
        window.AQEvent.state.recurringDates = dates;
        updateRecurringPreview(previewDates);
        
        console.log('📅 Generated', dates.length, 'recurring dates');
        
    } catch (error) {
        console.error('❌ Error generating recurring dates:', error);
        updateRecurringPreview(['Error generating dates: ' + error.message]);
    }
}

function generateDailyDates(start, end, interval) {
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + interval);
    }
    
    return dates;
}

function generateWeeklyDates(start, end, interval) {
    const selectedDays = Array.from(document.querySelectorAll('.days-of-week-selector input:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedDays.length === 0) {
        selectedDays.push(start.getDay()); // Default to start date's day
    }
    
    const dates = [];
    const current = new Date(start);
    current.setDate(current.getDate() - current.getDay()); // Start of week
    
    while (current <= end) {
        selectedDays.forEach(day => {
            const date = new Date(current);
            date.setDate(current.getDate() + day);
            
            if (date >= start && date <= end) {
                dates.push(new Date(date));
            }
        });
        
        current.setDate(current.getDate() + (7 * interval));
    }
    
    return dates.sort((a, b) => a - b);
}

function generateMonthlyDates(start, end, interval) {
    const pattern = document.querySelector('input[name="monthlyPattern"]:checked')?.value || 'date';
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
        if (pattern === 'date') {
            // Same date each month
            const targetDate = new Date(current.getFullYear(), current.getMonth(), start.getDate());
            if (targetDate.getMonth() === current.getMonth() && targetDate <= end && targetDate >= start) {
                dates.push(new Date(targetDate));
            }
        } else {
            // Same day of week (e.g., "2nd Tuesday")
            const weekOfMonth = Math.ceil(start.getDate() / 7);
            const dayOfWeek = start.getDay();
            const targetDate = getNthWeekdayOfMonth(current.getFullYear(), current.getMonth(), weekOfMonth, dayOfWeek);
            
            if (targetDate && targetDate <= end && targetDate >= start) {
                dates.push(new Date(targetDate));
            }
        }
        
        current.setMonth(current.getMonth() + interval);
    }
    
    return dates;
}

function generateYearlyDates(start, end, interval) {
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
        dates.push(new Date(current));
        current.setFullYear(current.getFullYear() + interval);
    }
    
    return dates;
}

function getNthWeekdayOfMonth(year, month, week, dayOfWeek) {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const offset = (dayOfWeek - firstWeekday + 7) % 7;
    const date = new Date(year, month, 1 + offset + (week - 1) * 7);
    
    // Check if this date is actually in the target month
    return date.getMonth() === month ? date : null;
}

function updateRecurringPreview(dates) {
    const previewContainer = document.getElementById('recurringPreview');
    if (!previewContainer) return;
    
    if (dates.length === 0) {
        previewContainer.textContent = 'Select start date, end date, and options to preview dates';
        return;
    }
    
    const dateStrings = dates.map(date => {
        if (typeof date === 'string') return date; // Error messages or "... more"
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    });
    
    previewContainer.innerHTML = dateStrings.join('<br>');
}

// ============================================================================
// ENHANCED FORM VALIDATION SYSTEM
// ============================================================================

function setupEnhancedFormValidation() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    console.log('✅ Setting up enhanced W&M form validation...');
    
    // Real-time validation for all form inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateEnhancedField);
        input.addEventListener('input', clearFieldError);
    });
    
    // Special validation for enhanced fields
    setupEnhancedFieldValidation();
}

function validateEnhancedField(event) {
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
    
    // Enhanced field-specific validation
    switch (field.id) {
        case 'estimatedAttendees':
            return validateAttendeeCount(field, value);
        case 'totalPerformers':
            return validatePerformerCount(field, value);
        case 'estimatedBudget':
            return validateBudget(field, value);
        case 'contactEmail':
            return validateEnhancedEmail(field, value);
        case 'contactNumber':
            return validateEnhancedPhone(field, value);
        case 'websiteAddress':
            return validateWebsiteURL(field, value);
        case 'eventDate':
        case 'recurringStartDate':
        case 'recurringEndDate':
            return validateEnhancedDate(field, value);
        default:
            return validateBasicField(field, value);
    }
}

function validateAttendeeCount(field, value) {
    if (!value) return true;
    
    const count = parseInt(value);
    if (isNaN(count) || count < 1) {
        showFieldError(field, 'Please enter a valid number of attendees (minimum 1)');
        return false;
    }
    
    if (count > 10000) {
        showFieldWarning(field, 'Very large event - please confirm attendee count');
    }
    
    return true;
}

function validatePerformerCount(field, value) {
    if (!value) return true;
    
    const count = parseInt(value);
    if (isNaN(count) || count < 0) {
        showFieldError(field, 'Please enter a valid number of performers');
        return false;
    }
    
    return true;
}

function validateBudget(field, value) {
    if (!value) return true;
    
    const budget = parseFloat(value);
    if (isNaN(budget) || budget < 0) {
        showFieldError(field, 'Please enter a valid budget amount');
        return false;
    }
    
    if (budget > 100000) {
        showFieldWarning(field, 'Large budget amount - please confirm');
    }
    
    return true;
}

function validateEnhancedEmail(field, value) {
    if (!value) return true;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    // Enhanced W&M email suggestion
    if (!value.includes('@wm.edu') && !value.includes('@email.wm.edu')) {
        showFieldWarning(field, 'Consider using your William & Mary email address');
    }
    
    return true;
}

function validateEnhancedPhone(field, value) {
    if (!value) return true;
    
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    const digitCount = value.replace(/\D/g, '').length;
    
    if (!phoneRegex.test(value) || digitCount < 10) {
        showFieldError(field, 'Please enter a valid phone number (at least 10 digits)');
        return false;
    }
    
    return true;
}

function validateWebsiteURL(field, value) {
    if (!value) return true;
    
    // Check if it's a social media handle (starts with @)
    if (value.startsWith('@')) {
        if (value.length < 2) {
            showFieldError(field, 'Please enter a valid social media handle');
            return false;
        }
        return true;
    }
    
    // Check if it's a URL
    try {
        new URL(value);
        return true;
    } catch {
        // Try to add https:// and validate again
        try {
            new URL('https://' + value);
            showFieldWarning(field, 'URL should include https://');
            return true;
        } catch {
            showFieldError(field, 'Please enter a valid URL or social media handle (starting with @)');
            return false;
        }
    }
}

function validateEnhancedDate(field, value) {
    if (!value) return true;
    
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showFieldError(field, 'Event date cannot be in the past');
        return false;
    }
    
    // Check academic year boundaries
    const academicStart = new Date(window.AQEvent.config.semesterStart);
    const academicEnd = new Date(window.AQEvent.config.semesterEnd);
    
    if (selectedDate < academicStart || selectedDate > academicEnd) {
        showFieldWarning(field, `Date is outside the ${window.AQEvent.config.academicYear} academic year`);
    }
    
    return true;
}

function validateBasicField(field, value) {
    // Basic validation for other fields
    if (field.type === 'email') {
        return validateEnhancedEmail(field, value);
    } else if (field.type === 'tel') {
        return validateEnhancedPhone(field, value);
    } else if (field.type === 'date') {
        return validateEnhancedDate(field, value);
    }
    
    return true;
}

function setupEnhancedFieldValidation() {
    // Setup time field validation (start/end times)
    setupEnhancedTimeValidation();
    
    // Setup acknowledgement validation
    setupAcknowledgementValidation();
    
    // Setup organization type validation
    setupOrganizationValidation();
}

function setupEnhancedTimeValidation() {
    const timeFields = {
        reservationStart: document.getElementById('reservationStartTime'),
        reservationEnd: document.getElementById('reservationEndTime'),
        eventStart: document.getElementById('eventStartTime'),
        eventEnd: document.getElementById('eventEndTime')
    };
    
    // Validate time relationships
    Object.values(timeFields).forEach(field => {
        if (field) {
            field.addEventListener('change', validateEnhancedTimeRelationships);
        }
    });
}

function validateEnhancedTimeRelationships() {
    const times = {
        reservationStart: document.getElementById('reservationStartTime')?.value,
        reservationEnd: document.getElementById('reservationEndTime')?.value,
        eventStart: document.getElementById('eventStartTime')?.value,
        eventEnd: document.getElementById('eventEndTime')?.value
    };
    
    let isValid = true;
    
    // Check if reservation end is after start
    if (times.reservationStart && times.reservationEnd) {
        if (times.reservationStart >= times.reservationEnd) {
            showNotification('Reservation end time must be after start time', 'error');
            isValid = false;
        }
    }
    
    // Check if event end is after start
    if (times.eventStart && times.eventEnd) {
        if (times.eventStart >= times.eventEnd) {
            showNotification('Event end time must be after start time', 'error');
            isValid = false;
        }
    }
    
    // Check if event is within reservation
    if (times.reservationStart && times.reservationEnd && times.eventStart && times.eventEnd) {
        if (times.eventStart < times.reservationStart || times.eventEnd > times.reservationEnd) {
            showNotification('Event times must be within reservation times', 'warning');
        }
    }
    
    return isValid;
}

function setupAcknowledgementValidation() {
    const acknowledgements = ['bookingAcknowledgement', 'expenseAcknowledgement'];
    
    acknowledgements.forEach(ackId => {
        const ack = document.getElementById(ackId);
        if (ack) {
            ack.addEventListener('change', function() {
                if (this.checked) {
                    clearFieldError({ target: this.closest('.form-group') });
                }
            });
        }
    });
}

function setupOrganizationValidation() {
    const groupTypeSelect = document.getElementById('groupCompanyType');
    if (!groupTypeSelect) return;
    
    groupTypeSelect.addEventListener('change', function() {
        if (this.value === 'external-organization') {
            // Validate that at least one organization type is selected
            setTimeout(() => {
                const checkboxes = document.querySelectorAll('#externalOrgDetails input[type="checkbox"]');
                const checkedBoxes = document.querySelectorAll('#externalOrgDetails input[type="checkbox"]:checked');
                
                if (checkboxes.length > 0 && checkedBoxes.length === 0) {
                    showFieldWarning(this, 'Please select at least one organization type');
                }
            }, 100);
        }
    });
}

// ============================================================================
// ENHANCED FORM SUBMISSION SYSTEM
// ============================================================================

function setupEnhancedFormSubmission() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    console.log('📤 Setting up enhanced form submission...');
    
    form.addEventListener('submit', handleEnhancedFormSubmission);
}

async function handleEnhancedFormSubmission(event) {
    event.preventDefault();
    
    console.log('📤 Processing Enhanced W&M Event Submission...');
    
    // Comprehensive validation
    if (!validateCompleteEnhancedForm()) {
        showNotification('Please correct the errors before submitting', 'error');
        return;
    }
    
    // Check authentication
    const authData = window.GitHubAPI.getStoredAuthData();
    if (!authData || !authData.token) {
        showTokenSetupDialog();
        return;
    }
    
    try {
        showLoadingState('Preparing your enhanced event submission...');
        
        // Collect enhanced form data
        const formData = collectEnhancedFormData();
        
        // Process file uploads
        if (window.AQEvent.state.uploadedFiles.length > 0) {
            showLoadingState('Processing uploaded files...');
            formData.uploadedFiles = await processFileUploads();
        }
        
        // Generate events from dates
        const events = generateEventsFromFormData(formData);
        
        if (events.length === 0) {
            throw new Error('No valid events to submit');
        }
        
        // Check for conflicts across all events
        showLoadingState('Checking for scheduling conflicts...');
        const conflictResults = await checkMultipleEventConflicts(events);
        
        if (conflictResults.hasConflicts) {
            hideLoadingState();
            
            const shouldProceed = await showConflictConfirmationDialog(conflictResults);
            if (!shouldProceed) {
                showNotification('Submission cancelled. Please resolve conflicts or choose different times.', 'info');
                return;
            }
        }
        
        // Submit events
        showLoadingState('Submitting events for approval...');
        const results = await submitMultipleEvents(events);
        
        hideLoadingState();
        
        // Show results
        handleSubmissionResults(results);
        
    } catch (error) {
        hideLoadingState();
        console.error('❌ Enhanced submission error:', error);
        
        if (error.message.includes('token') || error.message.includes('401')) {
            showTokenSetupDialog();
        } else {
            showNotification('Error submitting event: ' + error.message, 'error');
        }
    }
}

// ============================================================================
// ENHANCED DATA COLLECTION
// ============================================================================

function collectEnhancedFormData() {
    console.log('📋 Collecting enhanced form data...');
    
    // Get organization types for external organizations
    const groupType = document.getElementById('groupCompanyType').value;
    let organizationTypes = [];
    
    if (groupType === 'external-organization') {
        const orgTypeMap = {
            'profitOrg': 'Profit Organization',
            'nonProfitOrg': 'Non-Profit Organization', 
            'vaTaxExempt': 'Virginia Sales Tax Exempt',
            'org501c3': '501(c)3 Organization'
        };
        
        Object.keys(orgTypeMap).forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                organizationTypes.push(orgTypeMap[id]);
            }
        });
    }
    
    return {
        // Basic information
        name: document.getElementById('eventName')?.value || '',
        location: document.getElementById('location')?.value || '',
        eventType: document.getElementById('eventType')?.value || '',
        estimatedAttendees: parseInt(document.getElementById('estimatedAttendees')?.value) || 0,
        totalPerformers: parseInt(document.getElementById('totalPerformers')?.value) || 0,
        staffingSupportRequired: document.getElementById('staffingSupportToggle')?.classList.contains('active') || false,
        estimatedBudget: parseFloat(document.getElementById('estimatedBudget')?.value) || 0,
        description: document.getElementById('description')?.value || '',
        
        // Timing
        reservationStartTime: document.getElementById('reservationStartTime')?.value || '',
        reservationEndTime: document.getElementById('reservationEndTime')?.value || '',
        eventStartTime: document.getElementById('eventStartTime')?.value || '',
        eventEndTime: document.getElementById('eventEndTime')?.value || '',
        
        // Contact information
        contactPerson: document.getElementById('contactPerson')?.value || '',
        groupCompanyName: document.getElementById('groupCompanyName')?.value || '',
        groupCompanyType: groupType,
        organizationTypes: organizationTypes,
        contactNumber: document.getElementById('contactNumber')?.value || '',
        contactEmail: document.getElementById('contactEmail')?.value || '',
        websiteAddress: document.getElementById('websiteAddress')?.value || '',
        
        // Event frequency and dates
        eventFrequency: document.getElementById('eventFrequency')?.value || '',
        
        // Acknowledgements
        acknowledgements: {
            bookingUnderstanding: document.getElementById('bookingAcknowledgement')?.checked || false,
            expenseResponsibility: document.getElementById('expenseAcknowledgement')?.checked || false
        },
        
        // Enhanced metadata
        submissionSource: 'Enhanced AQEvent Form v2.0',
        submissionTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
}

function generateEventsFromFormData(formData) {
    console.log('🔄 Generating events from form data...');
    
    const events = [];
    const frequency = formData.eventFrequency;
    let dates = [];
    
    // Get dates based on frequency type
    switch (frequency) {
        case 'single':
            const singleDate = document.getElementById('eventDate')?.value;
            if (singleDate) dates = [singleDate];
            break;
            
        case 'multiple':
            dates = [...window.AQEvent.state.selectedDates];
            break;
            
        case 'daily':
        case 'weekly':
        case 'monthly':
        case 'yearly':
            dates = window.AQEvent.state.recurringDates.map(d => d.toISOString().split('T')[0]);
            break;
    }
    
    // Generate individual events
    dates.forEach((date, index) => {
        const eventData = { ...formData };
        eventData.eventDate = date;
        
        // Add series information for multiple events
        if (dates.length > 1) {
            eventData.isPartOfSeries = true;
            eventData.seriesId = generateSeriesId();
            eventData.seriesIndex = index + 1;
            eventData.seriesTotalCount = dates.length;
            eventData.seriesFrequency = frequency;
            
            // Modify name to indicate series
            eventData.name = `${formData.name} (${index + 1}/${dates.length})`;
        }
        
        events.push(eventData);
    });
    
    console.log('📅 Generated', events.length, 'events from form data');
    return events;
}

function generateSeriesId() {
    return 'SERIES_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================================================
// FILE UPLOAD PROCESSING
// ============================================================================

async function processFileUploads() {
    console.log('📎 Processing', window.AQEvent.state.uploadedFiles.length, 'files...');
    
    const processedFiles = [];
    
    for (const file of window.AQEvent.state.uploadedFiles) {
        try {
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                data: await fileToBase64(file)
            };
            
            processedFiles.push(fileData);
            
        } catch (error) {
            console.error('❌ Error processing file:', file.name, error);
            showNotification(`Failed to process file: ${file.name}`, 'warning');
        }
    }
    
    console.log('✅ Processed', processedFiles.length, 'files successfully');
    return processedFiles;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ============================================================================
// CONFLICT DETECTION FOR MULTIPLE EVENTS
// ============================================================================

async function checkMultipleEventConflicts(events) {
    console.log('🔍 Checking conflicts for', events.length, 'events...');
    
    const allConflicts = [];
    const allWarnings = [];
    
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        
        try {
            // Check conflicts with existing events
            const existingEvents = await window.GitHubAPI.loadApprovedEvents();
            const result = await window.ConflictDetector.detectConflicts(event);
            
            if (result.hasConflicts) {
                allConflicts.push({
                    eventIndex: i + 1,
                    eventDate: event.eventDate,
                    conflicts: result.conflicts
                });
            }
            
            if (result.hasWarnings) {
                allWarnings.push({
                    eventIndex: i + 1,
                    eventDate: event.eventDate,
                    warnings: result.warnings
                });
            }
            
        } catch (error) {
            console.error('❌ Error checking conflicts for event', i + 1, ':', error);
        }
    }
    
    return {
        hasConflicts: allConflicts.length > 0,
        hasWarnings: allWarnings.length > 0,
        conflicts: allConflicts,
        warnings: allWarnings,
        totalEvents: events.length
    };
}

async function showConflictConfirmationDialog(conflictResults) {
    const conflictCount = conflictResults.conflicts.length;
    const totalEvents = conflictResults.totalEvents;
    
    let message = `⚠️ SCHEDULING CONFLICTS DETECTED\n\n`;
    message += `${conflictCount} of ${totalEvents} events have conflicts:\n\n`;
    
    conflictResults.conflicts.forEach(conflict => {
        message += `Event ${conflict.eventIndex} (${new Date(conflict.eventDate).toLocaleDateString()}):\n`;
        conflict.conflicts.forEach(c => {
            message += `  • ${c.message}\n`;
        });
        message += '\n';
    });
    
    message += `Do you want to submit anyway?\n\n`;
    message += `Note: The admin will be notified of these conflicts and may request changes.`;
    
    return confirm(message);
}

// ============================================================================
// MULTIPLE EVENT SUBMISSION
// ============================================================================

async function submitMultipleEvents(events) {
    console.log('📤 Submitting', events.length, 'events...');
    
    const results = [];
    
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        
        try {
            showLoadingState(`Submitting event ${i + 1} of ${events.length}...`);
            
            const result = await window.GitHubAPI.submitEventForApproval(event);
            results.push({
                success: result.success,
                eventId: result.eventId,
                eventIndex: i + 1,
                eventDate: event.eventDate,
                eventName: event.name,
                error: result.error
            });
            
            // Small delay to prevent overwhelming the API
            if (i < events.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            console.error('❌ Error submitting event', i + 1, ':', error);
            results.push({
                success: false,
                eventIndex: i + 1,
                eventDate: event.eventDate,
                eventName: event.name,
                error: error.message
            });
        }
    }
    
    return results;
}

function handleSubmissionResults(results) {
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const failedResults = results.filter(r => !r.success);
    
    if (successCount === totalCount) {
        // All successful
        showNotification(
            `✅ Successfully submitted all ${successCount} event${successCount > 1 ? 's' : ''} for approval!`,
            'success',
            7000
        );
        
        // Show detailed success dialog
        const eventIds = results.map(r => r.eventId).filter(id => id).join(', ');
        const eventDates = results.map(r => new Date(r.eventDate).toLocaleDateString()).join(', ');
        
        alert(
            `🎉 Submission Successful!\n\n` +
            `Your ${totalCount} event${totalCount > 1 ? 's have' : ' has'} been submitted for approval.\n\n` +
            `Event ID${totalCount > 1 ? 's' : ''}: ${eventIds}\n` +
            `Date${totalCount > 1 ? 's' : ''}: ${eventDates}\n\n` +
            `What happens next:\n` +
            `• The Events Committee will review your submission${totalCount > 1 ? 's' : ''}\n` +
            `• You'll receive email notifications once approved\n` +
            `• Processing time: 1-3 business days`
        );
        
        // Reset form
        resetEnhancedForm();
        
    } else if (successCount > 0) {
        // Partial success
        showNotification(
            `⚠️ ${successCount} of ${totalCount} events submitted successfully. ${failedResults.length} events failed.`,
            'warning',
            10000
        );
        
        // Show details of failed submissions
        const failedDetails = failedResults.map(r => 
            `Event ${r.eventIndex} (${new Date(r.eventDate).toLocaleDateString()}): ${r.error}`
        ).join('\n');
        
        alert(
            `Partial Success\n\n` +
            `${successCount} events were submitted successfully.\n\n` +
            `Failed submissions:\n${failedDetails}\n\n` +
            `Please review the failed events and try submitting them again.`
        );
        
    } else {
        // All failed
        showNotification(
            `❌ All event submissions failed. Please check your connection and try again.`,
            'error',
            10000
        );
        
        const errorDetails = failedResults.map(r => r.error).join('\n');
        alert(`Submission Failed\n\nErrors:\n${errorDetails}`);
    }
}

// ============================================================================
// ENHANCED FORM AUTO-SAVE
// ============================================================================

function setupEnhancedFormAutoSave() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    console.log('💾 Setting up enhanced form auto-save...');
    
    const inputs = form.querySelectorAll('input, select, textarea');
    
    // Load saved data
    loadEnhancedFormData();
    
    // Save data on input
    inputs.forEach(input => {
        input.addEventListener('input', debounce(saveEnhancedFormData, 2000));
        input.addEventListener('change', debounce(saveEnhancedFormData, 1000));
    });
    
    // Clear saved data on successful submission
    form.addEventListener('submit', function() {
        clearSavedEnhancedFormData();
    });
}

function saveEnhancedFormData() {
    try {
        const formData = collectEnhancedFormData();
        
        // Add current form state
        formData.formState = {
            selectedDates: window.AQEvent.state.selectedDates,
            recurringDates: window.AQEvent.state.recurringDates.map(d => d.toISOString()),
            uploadedFileNames: window.AQEvent.state.uploadedFiles.map(f => f.name),
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('aqevent_enhanced_form_draft', JSON.stringify(formData));
        console.log('💾 Enhanced form data auto-saved');
        
    } catch (error) {
        console.error('❌ Error saving enhanced form data:', error);
    }
}

function loadEnhancedFormData() {
    try {
        const saved = localStorage.getItem('aqevent_enhanced_form_draft');
        if (!saved) return;
        
        const data = JSON.parse(saved);
        if (!data || !data.formState) return;
        
        // Check if saved data is not too old (24 hours)
        const savedAt = new Date(data.formState.savedAt);
        const now = new Date();
        const hoursSinceStore = (now - savedAt) / (1000 * 60 * 60);
        
        if (hoursSinceStore > 24) {
            clearSavedEnhancedFormData();
            return;
        }
        
        // Restore basic form fields
        Object.keys(data).forEach(key => {
            if (key === 'formState' || key === 'acknowledgements') return;
            
            const fieldMap = {
                'name': 'eventName'
            };
            
            const fieldId = fieldMap[key] || key;
            const element = document.getElementById(fieldId);
            
            if (element && data[key]) {
                if (element.type === 'checkbox') {
                    element.checked = data[key];
                } else {
                    element.value = data[key];
                }
            }
        });
        
        // Restore acknowledgements
        if (data.acknowledgements) {
            Object.keys(data.acknowledgements).forEach(ackKey => {
                const element = document.getElementById(ackKey);
                if (element) {
                    element.checked = data.acknowledgements[ackKey];
                }
            });
        }
        
        // Restore toggles
        if (data.staffingSupportRequired) {
            const toggle = document.getElementById('staffingSupportToggle');
            if (toggle) toggle.classList.add('active');
        }
        
        // Restore organization types
        if (data.organizationTypes && data.organizationTypes.length > 0) {
            const orgTypeMap = {
                'Profit Organization': 'profitOrg',
                'Non-Profit Organization': 'nonProfitOrg',
                'Virginia Sales Tax Exempt': 'vaTaxExempt',
                '501(c)3 Organization': 'org501c3'
            };
            
            data.organizationTypes.forEach(type => {
                const checkboxId = orgTypeMap[type];
                const checkbox = document.getElementById(checkboxId);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // Restore form state
        if (data.formState.selectedDates) {
            window.AQEvent.state.selectedDates = data.formState.selectedDates;
        }
        
        console.log('📄 Loaded enhanced saved form data');
        showNotification('Restored your previous draft', 'info');
        
    } catch (error) {
        console.error('❌ Error loading enhanced saved form data:', error);
        clearSavedEnhancedFormData();
    }
}

function clearSavedEnhancedFormData() {
    localStorage.removeItem('aqevent_enhanced_form_draft');
}

// ============================================================================
// ENHANCED FORM RESET
// ============================================================================

function resetEnhancedForm() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    console.log('🔄 Resetting enhanced form...');
    
    // Reset form fields
    form.reset();
    
    // Reset enhanced state
    window.AQEvent.state.uploadedFiles = [];
    window.AQEvent.state.selectedDates = [];
    window.AQEvent.state.recurringDates = [];
    
    // Reset UI elements
    if (window.updateFilePreview) window.updateFilePreview();
    if (window.updateMultipleDatesDisplay) window.updateMultipleDatesDisplay();
    if (window.updateRecurringPreviewDisplay) window.updateRecurringPreviewDisplay([]);
    
    // Hide all date groups
    hideAllDateGroups();
    
    // Reset toggles
    const staffingToggle = document.getElementById('staffingSupportToggle');
    if (staffingToggle) staffingToggle.classList.remove('active');
    
    // Hide external org details
    const externalOrgDetails = document.getElementById('externalOrgDetails');
    if (externalOrgDetails) externalOrgDetails.style.display = 'none';
    
    // Clear errors
    form.querySelectorAll('.field-error, .field-warning').forEach(el => el.remove());
    form.querySelectorAll('.form-control').forEach(field => {
        field.style.borderColor = '';
        field.classList.remove('error', 'warning');
    });
    
    // Clear saved data
    clearSavedEnhancedFormData();
    
    showNotification('Form reset successfully', 'info');
}

// ============================================================================
// ENHANCED VALIDATION FUNCTIONS
// ============================================================================

function validateCompleteEnhancedForm() {
    console.log('✅ Running complete enhanced form validation...');
    
    let isValid = true;
    
    // Validate basic required fields
    const requiredFields = [
        'eventName', 'location', 'eventType', 'estimatedAttendees', 
        'description', 'contactPerson', 'groupCompanyType', 
        'contactNumber', 'contactEmail'
    ];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        }
    });
    
    // Validate event frequency and dates
    const frequency = document.getElementById('eventFrequency')?.value;
    if (!frequency) {
        showFieldError(document.getElementById('eventFrequency'), 'Please select an event frequency');
        isValid = false;
    } else {
        // Validate dates based on frequency
        switch (frequency) {
            case 'single':
                if (!document.getElementById('eventDate')?.value) {
                    showFieldError(document.getElementById('eventDate'), 'Event date is required');
                    isValid = false;
                }
                break;
            case 'multiple':
                if (window.AQEvent.state.selectedDates.length === 0) {
                    showNotification('Please select at least one date for multiple date events', 'error');
                    isValid = false;
                }
                break;
            case 'daily':
            case 'weekly':
            case 'monthly':
            case 'yearly':
                if (!document.getElementById('recurringStartDate')?.value || 
                    !document.getElementById('recurringEndDate')?.value) {
                    showNotification('Start date and end date are required for recurring events', 'error');
                    isValid = false;
                }
                if (window.AQEvent.state.recurringDates.length === 0) {
                    showNotification('No valid recurring dates generated. Please check your settings.', 'error');
                    isValid = false;
                }
                break;
        }
    }
    
    // Validate timing
    if (!validateEnhancedTimeRelationships()) {
        isValid = false;
    }
    
    // Validate acknowledgements
    const acknowledgements = ['bookingAcknowledgement', 'expenseAcknowledgement'];
    acknowledgements.forEach(ackId => {
        const ack = document.getElementById(ackId);
        if (ack && !ack.checked) {
            showFieldError(ack.closest('.form-group'), 'This acknowledgement is required');
            isValid = false;
        }
    });
    
    // Validate organization type for external organizations
    const groupType = document.getElementById('groupCompanyType')?.value;
    if (groupType === 'external-organization') {
        const orgTypes = document.querySelectorAll('#externalOrgDetails input[type="checkbox"]:checked');
        if (orgTypes.length === 0) {
            showNotification('Please select at least one organization type for external organizations', 'error');
            isValid = false;
        }
    }
    
    console.log('✅ Enhanced form validation complete. Valid:', isValid);
    return isValid;
}

// ============================================================================
// WILLIAM & MARY SPECIFIC FUNCTIONALITY (ENHANCED)
// ============================================================================

// Populate form with enhanced W&M specific data
function populateWMData() {
    console.log('🎓 Populating enhanced W&M specific data...');
    
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
    
    console.log('🎓 Enhanced W&M specific data populated');
}

// Setup enhanced academic date constraints
function setupAcademicDateConstraints() {
    const dateInputs = ['eventDate', 'recurringStartDate', 'recurringEndDate'];
    
    dateInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            input.min = today;
            
            // Set maximum date to end of academic year
            input.max = window.AQEvent.config.semesterEnd;
            
            // Add enhanced academic calendar validation
            input.addEventListener('change', validateEnhancedAcademicDate);
        }
    });
}

// Enhanced academic date validation
function validateEnhancedAcademicDate(event) {
    const selectedDate = new Date(event.target.value);
    const semesterStart = new Date(window.AQEvent.config.semesterStart);
    const semesterEnd = new Date(window.AQEvent.config.semesterEnd);
    
    if (selectedDate < semesterStart || selectedDate > semesterEnd) {
        showFieldWarning(
            event.target, 
            `Date is outside the ${window.AQEvent.config.academicYear} academic year`
        );
    }
    
    // Check for academic holidays/breaks
    checkAcademicHolidays(selectedDate, event.target);
}

function checkAcademicHolidays(date, field) {
    // Common academic break periods (these could be loaded from a config)
    const holidays = [
        { name: 'Winter Break', start: new Date(2024, 11, 20), end: new Date(2025, 0, 15) },
        { name: 'Spring Break', start: new Date(2025, 2, 10), end: new Date(2025, 2, 17) },
        { name: 'Summer Break', start: new Date(2025, 4, 15), end: new Date(2025, 7, 20) }
    ];
    
    holidays.forEach(holiday => {
        if (date >= holiday.start && date <= holiday.end) {
            showFieldWarning(field, `Event is scheduled during ${holiday.name}`);
        }
    });
}

// ============================================================================
// GLOBAL EVENT LISTENERS
// ============================================================================

// Setup enhanced global event listeners
function setupGlobalEventListeners() {
    console.log('👂 Setting up enhanced global event listeners...');
    
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
    
    // Enhanced form submission with Enter key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.form && !e.target.matches('textarea')) {
            e.preventDefault();
            const submitBtn = e.target.form.querySelector('[type="submit"], .btn-primary');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
    });
    
    // Handle file input changes globally
    document.addEventListener('change', function(e) {
        if (e.target.type === 'file') {
            console.log('📎 File input changed:', e.target.files.length, 'files');
        }
    });
    
    // Handle enhanced form state changes
    document.addEventListener('input', function(e) {
        if (e.target.form && e.target.form.id === 'eventForm') {
            // Debounced form validation
            clearTimeout(window.formValidationTimeout);
            window.formValidationTimeout = setTimeout(() => {
                validateEnhancedField({ target: e.target });
            }, 1000);
        }
    });
}

// ============================================================================
// HELPER FUNCTIONS (ENHANCED)
// ============================================================================

// Enhanced notification system
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    // Create enhanced notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Enhanced W&M branded styling
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--wm-white);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        padding: var(--spacing-md);
        z-index: 10001;
        transform: translateX(400px);
        transition: transform var(--transition-normal);
        border-left: 4px solid;
        max-width: 400px;
        font-weight: 500;
        font-size: var(--font-size-base);
        border: 1px solid var(--wm-gray-200);
        line-height: 1.4;
    `;
    
    // Enhanced type-specific styling
    const typeStyles = {
        success: { borderColor: 'var(--wm-success)', color: 'var(--wm-success)', icon: '✅' },
        error: { borderColor: 'var(--wm-error)', color: 'var(--wm-error)', icon: '❌' },
        warning: { borderColor: 'var(--wm-warning)', color: 'var(--wm-warning)', icon: '⚠️' },
        info: { borderColor: 'var(--wm-primary-green)', color: 'var(--wm-primary-green)', icon: 'ℹ️' }
    };
    
    const style = typeStyles[type] || typeStyles.info;
    notification.style.borderLeftColor = style.borderColor;
    notification.style.color = style.color;
    
    // Add icon
    notification.textContent = `${style.icon} ${message}`;
    
    document.body.appendChild(notification);
    
    // Enhanced animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-hide with fade
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    console.log(`🔔 Enhanced Notification [${type}]:`, message);
}

// Enhanced loading state
function showLoadingState(message = 'Loading...') {
    window.AQEvent.state.loading = true;
    
    // Create or update enhanced loading overlay
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
            background: rgba(244, 244, 244, 0.95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;
        
        loading.innerHTML = `
            <div class="spinner" style="width: 50px; height: 50px; border-width: 4px;"></div>
            <p style="color: var(--wm-primary-green); font-weight: 600; margin-top: var(--spacing-md); font-size: var(--font-size-lg);">${message}</p>
            <small style="color: var(--wm-gray-600); margin-top: var(--spacing-xs);">Please wait...</small>
        `;
        
        document.body.appendChild(loading);
    } else {
        loading.querySelector('p').textContent = message;
        loading.style.display = 'flex';
    }
}

// Enhanced loading state hide
function hideLoadingState() {
    window.AQEvent.state.loading = false;
    
    const loading = document.getElementById('globalLoading');
    if (loading) {
        loading.style.opacity = '0';
        setTimeout(() => {
            loading.style.display = 'none';
            loading.style.opacity = '1';
        }, 300);
    }
}

// Enhanced error state
function showErrorState(message) {
    hideLoadingState();
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: var(--wm-white);
        border: 2px solid var(--wm-error);
        border-radius: var(--radius-lg);
        padding: var(--spacing-xl);
        margin: var(--spacing-lg);
        text-align: center;
        color: var(--wm-error);
        box-shadow: var(--shadow-md);
    `;
    
    errorDiv.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: var(--spacing-md);">⚠️</div>
        <h3 style="color: var(--wm-error); margin-bottom: var(--spacing-sm);">System Error</h3>
        <p style="margin-bottom: var(--spacing-md); max-width: 600px; margin-left: auto; margin-right: auto;">${message}</p>
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

// Show enhanced field error
function showFieldError(field, message) {
    // Clear existing error
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) existingError.remove();
    
    field.style.borderColor = 'var(--wm-error)';
    field.classList.add('error');
    
    const error = document.createElement('div');
    error.className = 'field-error';
    error.style.cssText = `
        color: var(--wm-error);
        font-size: var(--font-size-sm);
        margin-top: 4px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
    `;
    error.innerHTML = `<span>❌</span><span>${message}</span>`;
    
    field.parentNode.appendChild(error);
}

// Show enhanced field warning
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
        display: flex;
        align-items: center;
        gap: 4px;
    `;
    warning.innerHTML = `<span>⚠️</span><span>${message}</span>`;
    
    field.parentNode.appendChild(warning);
}

// Clear enhanced field error
function clearFieldError(event) {
    const field = event.target;
    field.style.borderColor = '';
    field.classList.remove('error', 'warning');
    
    const errors = field.parentNode.querySelectorAll('.field-error, .field-warning');
    errors.forEach(error => error.remove());
}

// Enhanced debounce function
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Close all modals
function closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
    });
}

// Enhanced token setup dialog
function showTokenSetupDialog() {
    const token = prompt(
        '🔐 GitHub Token Required\n\n' +
        'To submit events, you need to set up a GitHub Personal Access Token.\n\n' +
        'Please enter your GitHub token:'
    );
    
    if (token) {
        const password = prompt('Enter the admin password to save this token:');
        
        if (password && window.GitHubAPI.validateAdminPassword(password)) {
            window.GitHubAPI.storeAuthData(token, password);
            showNotification('Token saved! Please try submitting again.', 'success');
        } else {
            showNotification('Invalid password. Token not saved.', 'error');
        }
    }
}

// Load initial application data
async function loadInitialData() {
    try {
        console.log('📊 Loading initial application data...');
        
        // Enhanced data loading would go here
        // This is where we might load configuration, user preferences, etc.
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
    }
}

// Enhanced admin authentication check
function checkAdminAuthentication() {
    const authData = window.GitHubAPI.getStoredAuthData();
    return authData && window.GitHubAPI.validateAdminPassword(authData.password);
}

// Enhanced show admin login
function showAdminLogin() {
    console.log('🔐 Enhanced admin authentication required');
    // This will be implemented in the admin panel
}

// Enhanced setup admin controls
function setupAdminControls() {
    console.log('⚙️ Setting up enhanced admin controls');
    // This will be implemented in the admin panel
}

// Enhanced setup calendar filters
function setupCalendarFilters() {
    console.log('📅 Setting up enhanced calendar filters');
    // This will be implemented in the calendar
}

// Enhanced global reset function
function resetForm() {
    if (confirm('Are you sure you want to reset the form? All unsaved data will be lost.')) {
        resetEnhancedForm();
    }
}

// ============================================================================
// ENHANCED UTILITY EXPORTS
// ============================================================================

// Enhanced W&M academic date utilities
const EnhancedDateUtils = {
    // Enhanced format date for W&M academic use
    formatAcademic: function(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: window.AQEvent.config.timezone
        });
    },
    
    // Enhanced format time for W&M academic use
    formatTime: function(time) {
        if (!time) return 'TBD';
        
        try {
            const [hours, minutes] = time.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: window.AQEvent.config.timezone
            });
        } catch (error) {
            return time;
        }
    },
    
    // Enhanced check if date is within academic year
    isAcademicYear: function(date) {
        const checkDate = new Date(date);
        const start = new Date(window.AQEvent.config.semesterStart);
        const end = new Date(window.AQEvent.config.semesterEnd);
        return checkDate >= start && checkDate <= end;
    },
    
    // Enhanced get academic day of week
    getAcademicDay: function(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(date).getDay()];
    },
    
    // New: Get academic week number
    getAcademicWeek: function(date) {
        const start = new Date(window.AQEvent.config.semesterStart);
        const checkDate = new Date(date);
        const diffTime = Math.abs(checkDate - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.ceil(diffDays / 7);
    },
    
    // New: Format date range
    formatDateRange: function(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start.toDateString() === end.toDateString()) {
            return this.formatAcademic(start);
        }
        
        return `${this.formatAcademic(start)} - ${this.formatAcademic(end)}`;
    }
};

// Enhanced form utilities
const EnhancedFormUtils = {
    // Enhanced reset form to initial state
    reset: function(formId = 'eventForm') {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            
            // Reset enhanced state
            window.AQEvent.state.uploadedFiles = [];
            window.AQEvent.state.selectedDates = [];
            window.AQEvent.state.recurringDates = [];
            
            // Reset UI elements
            if (window.updateFilePreview) window.updateFilePreview();
            if (window.updateMultipleDatesDisplay) window.updateMultipleDatesDisplay();
            
            // Reset toggles
            const toggles = form.querySelectorAll('.toggle-switch.active');
            toggles.forEach(toggle => toggle.classList.remove('active'));
            
            // Clear errors
            this.clearAllErrors(form);
            
            // Hide dynamic groups
            hideAllDateGroups();
        }
    },
    
    // Enhanced clear all field errors
    clearAllErrors: function(form) {
        const errorElements = form.querySelectorAll('.field-error, .field-warning');
        errorElements.forEach(el => el.remove());
        
        const fields = form.querySelectorAll('.form-control');
        fields.forEach(field => {
            field.style.borderColor = '';
            field.classList.remove('error', 'warning');
        });
    },
    
    // New: Validate all fields
    validateAll: function(formId = 'eventForm') {
        return validateCompleteEnhancedForm();
    },
    
    // New: Collect form data
    collectData: function(formId = 'eventForm') {
        return collectEnhancedFormData();
    }
};

// Enhanced validation utilities
const EnhancedValidationUtils = {
    // Enhanced validate entire form
    validateForm: function(formId = 'eventForm') {
        return validateCompleteEnhancedForm();
    },
    
    // Enhanced check for time conflicts
    checkTimeConflict: function(startTime, endTime, existingEvents) {
        return checkMultipleEventConflicts([{
            eventStartTime: startTime,
            eventEndTime: endTime,
            eventDate: new Date().toISOString().split('T')[0]
        }]);
    },
    
    // New: Validate file upload
    validateFile: function(file) {
        return validateFile(file);
    },
    
    // New: Validate date range
    validateDateRange: function(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return start < end;
    }
};

// ============================================================================
// EXPORT ENHANCED GLOBAL UTILITIES
// ============================================================================

// Make enhanced utilities available globally
window.AQEventUtils = {
    DateUtils: EnhancedDateUtils,
    FormUtils: EnhancedFormUtils,
    ValidationUtils: EnhancedValidationUtils,
    showNotification,
    showLoadingState,
    hideLoadingState,
    navigateToPage,
    
    // Enhanced utilities
    resetForm: resetEnhancedForm,
    validateForm: validateCompleteEnhancedForm,
    collectFormData: collectEnhancedFormData,
    processFiles: processFileUploads,
    generateEvents: generateEventsFromFormData
};

// ============================================================================
// ENHANCED APPLICATION READY
// ============================================================================

console.log('William & Mary AQEvent Scheduler Enhanced app.js v2.0 loaded successfully!');
console.log('Utilities: window.AQEventUtils');
console.log('Application state: window.AQEvent');
console.log('Features: Multiple dates, file uploads, enhanced validation, recurring events');
