// ============================================================================
// Advanced Conflict Detection & Data Integrity System
// File: js/conflict-detection.js
// Step 14A - Room Conflicts + Time Overlaps
// ============================================================================

// ============================================================================
// CONFLICT DETECTION CORE ENGINE
// ============================================================================

class ConflictDetector {
    constructor() {
        this.conflicts = [];
        this.warnings = [];
        this.suggestions = [];
        this.bufferMinutes = 15; // Default buffer time for setup/cleanup
    }

    // Main conflict detection method
    async detectConflicts(eventData, excludeEventId = null) {
        this.reset();
        
        try {
            console.log('🔍 Running comprehensive conflict detection...');
            
            // Load existing events
            const existingEvents = await this.loadAllEvents();
            
            // Filter out the event being edited (if any)
            const otherEvents = existingEvents.filter(event => 
                event.id !== excludeEventId
            );
            
            // Run all conflict checks
            this.checkRoomConflicts(eventData, otherEvents);
            this.checkTimeConflicts(eventData, otherEvents);
            this.validateEventData(eventData);
            
            // Generate suggestions if conflicts found
            if (this.hasConflicts()) {
                await this.generateSuggestions(eventData, otherEvents);
            }
            
            const result = {
                hasConflicts: this.hasConflicts(),
                hasWarnings: this.hasWarnings(),
                conflicts: this.conflicts,
                warnings: this.warnings,
                suggestions: this.suggestions,
                summary: this.generateSummary()
            };
            
            console.log('🔍 Conflict detection complete:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Conflict detection error:', error);
            return {
                hasConflicts: false,
                hasWarnings: true,
                conflicts: [],
                warnings: [{ type: 'system', message: 'Unable to check for conflicts: ' + error.message }],
                suggestions: [],
                summary: 'Conflict detection temporarily unavailable'
            };
        }
    }

    // Reset conflict state
    reset() {
        this.conflicts = [];
        this.warnings = [];
        this.suggestions = [];
    }

    // Check if there are any conflicts
    hasConflicts() {
        return this.conflicts.length > 0;
    }

    // Check if there are any warnings
    hasWarnings() {
        return this.warnings.length > 0;
    }

    // Load all existing events (approved + pending)
    async loadAllEvents() {
        try {
            const [approvedEvents, pendingEvents] = await Promise.all([
                window.GitHubAPI.loadApprovedEvents(),
                window.GitHubAPI.loadPendingEvents()
            ]);
            
            // Combine and normalize events
            const allEvents = [
                ...approvedEvents.map(event => ({ ...event, source: 'approved' })),
                ...pendingEvents.map(event => ({ ...event, source: 'pending' }))
            ];
            
            return allEvents;
        } catch (error) {
            console.error('❌ Error loading events for conflict detection:', error);
            return [];
        }
    }

    // ============================================================================
    // ROOM CONFLICT DETECTION
    // ============================================================================

    checkRoomConflicts(eventData, existingEvents) {
        console.log('🏢 Checking room conflicts...');
        
        const eventDate = new Date(eventData.eventDate);
        const eventLocation = eventData.location?.trim().toLowerCase();
        
        if (!eventLocation) {
            this.warnings.push({
                type: 'location',
                severity: 'medium',
                message: 'No location specified for event',
                field: 'location'
            });
            return;
        }

        // Get event reservation times with buffer
        const { startTime, endTime } = this.getEventTimeRange(eventData, true);
        
        existingEvents.forEach(existingEvent => {
            const existingEventData = existingEvent.eventData || existingEvent;
            const existingDate = new Date(existingEventData.eventDate);
            const existingLocation = existingEventData.location?.trim().toLowerCase();
            
            // Check if same date and location
            if (this.isSameDate(eventDate, existingDate) && 
                this.isSameLocation(eventLocation, existingLocation)) {
                
                const { startTime: existingStart, endTime: existingEnd } = this.getEventTimeRange(existingEventData, true);
                
                // Check for time overlap
                if (this.hasTimeOverlap(startTime, endTime, existingStart, existingEnd)) {
                    this.conflicts.push({
                        type: 'room',
                        severity: 'high',
                        message: `${eventData.location} is already booked from ${this.formatTime(existingStart)} to ${this.formatTime(existingEnd)}`,
                        conflictingEvent: {
                            id: existingEvent.id,
                            name: existingEventData.name,
                            date: existingEventData.eventDate,
                            startTime: existingEventData.reservationStartTime || existingEventData.eventStartTime,
                            endTime: existingEventData.reservationEndTime || existingEventData.eventEndTime,
                            location: existingEventData.location,
                            source: existingEvent.source
                        },
                        field: 'location'
                    });
                }
            }
        });
    }

    // ============================================================================
    // TIME CONFLICT DETECTION
    // ============================================================================

    checkTimeConflicts(eventData, existingEvents) {
        console.log('⏰ Checking time conflicts...');
        
        // Check if event times are within reservation times
        this.validateEventVsReservationTimes(eventData);
        
        // Check for unrealistic time durations
        this.validateTimeDurations(eventData);
        
        // Check for past date submissions
        this.validateEventDate(eventData);
        
        // Check for academic calendar conflicts (if applicable)
        this.checkAcademicCalendarConflicts(eventData);
    }

    validateEventVsReservationTimes(eventData) {
        const eventStart = this.parseTime(eventData.eventStartTime);
        const eventEnd = this.parseTime(eventData.eventEndTime);
        const reservationStart = this.parseTime(eventData.reservationStartTime);
        const reservationEnd = this.parseTime(eventData.reservationEndTime);
        
        if (eventStart && eventEnd && reservationStart && reservationEnd) {
            if (eventStart < reservationStart) {
                this.conflicts.push({
                    type: 'time',
                    severity: 'high',
                    message: 'Event start time is before reservation start time',
                    field: 'eventStartTime'
                });
            }
            
            if (eventEnd > reservationEnd) {
                this.conflicts.push({
                    type: 'time',
                    severity: 'high',
                    message: 'Event end time is after reservation end time',
                    field: 'eventEndTime'
                });
            }
        }
    }

    validateTimeDurations(eventData) {
        const eventStart = this.parseTime(eventData.eventStartTime);
        const eventEnd = this.parseTime(eventData.eventEndTime);
        const reservationStart = this.parseTime(eventData.reservationStartTime);
        const reservationEnd = this.parseTime(eventData.reservationEndTime);
        
        // Check event duration
        if (eventStart && eventEnd) {
            const eventDuration = (eventEnd - eventStart) / (1000 * 60); // minutes
            
            if (eventDuration <= 0) {
                this.conflicts.push({
                    type: 'time',
                    severity: 'high',
                    message: 'Event end time must be after start time',
                    field: 'eventEndTime'
                });
            } else if (eventDuration < 15) {
                this.warnings.push({
                    type: 'time',
                    severity: 'medium',
                    message: 'Event duration is very short (less than 15 minutes)',
                    field: 'eventEndTime'
                });
            } else if (eventDuration > 480) { // 8 hours
                this.warnings.push({
                    type: 'time',
                    severity: 'medium',
                    message: 'Event duration is very long (more than 8 hours)',
                    field: 'eventEndTime'
                });
            }
        }
        
        // Check reservation duration
        if (reservationStart && reservationEnd) {
            const reservationDuration = (reservationEnd - reservationStart) / (1000 * 60);
            
            if (reservationDuration <= 0) {
                this.conflicts.push({
                    type: 'time',
                    severity: 'high',
                    message: 'Reservation end time must be after start time',
                    field: 'reservationEndTime'
                });
            }
        }
    }

    validateEventDate(eventData) {
        const eventDate = new Date(eventData.eventDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (eventDate < today) {
            this.conflicts.push({
                type: 'date',
                severity: 'high',
                message: 'Event date cannot be in the past',
                field: 'eventDate'
            });
        }
        
        // Check if event is too far in the future (1 year)
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        if (eventDate > oneYearFromNow) {
            this.warnings.push({
                type: 'date',
                severity: 'low',
                message: 'Event is scheduled more than a year in advance',
                field: 'eventDate'
            });
        }
    }

    checkAcademicCalendarConflicts(eventData) {
        // Check against common W&M dates (could be expanded with actual calendar data)
        const eventDate = new Date(eventData.eventDate);
        const academicYearStart = new Date(eventDate.getFullYear(), 7, 15); // Aug 15
        const academicYearEnd = new Date(eventDate.getFullYear() + 1, 4, 15); // May 15
        
        if (eventDate < academicYearStart || eventDate > academicYearEnd) {
            this.warnings.push({
                type: 'academic',
                severity: 'medium',
                message: 'Event is scheduled outside the typical academic year',
                field: 'eventDate'
            });
        }
        
        // Check for common holidays/breaks
        this.checkHolidayConflicts(eventDate);
    }

    checkHolidayConflicts(eventDate) {
        const holidays = this.getHolidayDates(eventDate.getFullYear());
        
        holidays.forEach(holiday => {
            if (this.isSameDate(eventDate, holiday.date)) {
                this.warnings.push({
                    type: 'holiday',
                    severity: 'medium',
                    message: `Event is scheduled on ${holiday.name}`,
                    field: 'eventDate'
                });
            }
        });
    }

    // ============================================================================
    // DATA VALIDATION
    // ============================================================================

    validateEventData(eventData) {
        console.log('✅ Validating event data...');
        
        // Required fields validation
        const requiredFields = [
            { field: 'name', label: 'Event Name' },
            { field: 'eventDate', label: 'Event Date' },
            { field: 'location', label: 'Location' },
            { field: 'eventType', label: 'Event Type' },
            { field: 'contactPerson', label: 'Contact Person' },
            { field: 'contactEmail', label: 'Contact Email' }
        ];
        
        requiredFields.forEach(({ field, label }) => {
            if (!eventData[field] || eventData[field].toString().trim() === '') {
                this.conflicts.push({
                    type: 'validation',
                    severity: 'high',
                    message: `${label} is required`,
                    field: field
                });
            }
        });
        
        // Email validation
        if (eventData.contactEmail && !this.isValidEmail(eventData.contactEmail)) {
            this.conflicts.push({
                type: 'validation',
                severity: 'high',
                message: 'Please enter a valid email address',
                field: 'contactEmail'
            });
        }
        
        // Phone validation (if provided)
        if (eventData.contactNumber && !this.isValidPhone(eventData.contactNumber)) {
            this.warnings.push({
                type: 'validation',
                severity: 'low',
                message: 'Phone number format may be invalid',
                field: 'contactNumber'
            });
        }
        
        // Event name length
        if (eventData.name && eventData.name.length > 100) {
            this.warnings.push({
                type: 'validation',
                severity: 'medium',
                message: 'Event name is very long and may be truncated in displays',
                field: 'name'
            });
        }
    }

    // ============================================================================
    // SUGGESTION GENERATION
    // ============================================================================

    async generateSuggestions(eventData, existingEvents) {
        console.log('💡 Generating conflict resolution suggestions...');
        
        // Room conflict suggestions
        if (this.hasRoomConflicts()) {
            await this.suggestAlternativeLocations(eventData, existingEvents);
            this.suggestAlternativeTimes(eventData, existingEvents);
        }
        
        // Time conflict suggestions
        if (this.hasTimeConflicts()) {
            this.suggestTimeAdjustments(eventData);
        }
    }

    async suggestAlternativeLocations(eventData, existingEvents) {
        // Get list of all available locations
        const allLocations = this.getAllLocations();
        const eventDate = new Date(eventData.eventDate);
        const { startTime, endTime } = this.getEventTimeRange(eventData, true);
        
        const availableLocations = allLocations.filter(location => {
            return !this.isLocationBooked(location, eventDate, startTime, endTime, existingEvents);
        });
        
        if (availableLocations.length > 0) {
            this.suggestions.push({
                type: 'location',
                title: 'Alternative Locations Available',
                options: availableLocations.slice(0, 3), // Show top 3
                action: 'change_location'
            });
        }
    }

    suggestAlternativeTimes(eventData, existingEvents) {
        const eventDate = new Date(eventData.eventDate);
        const location = eventData.location;
        
        // Find available time slots for the same day
        const availableSlots = this.findAvailableTimeSlots(eventDate, location, existingEvents);
        
        if (availableSlots.length > 0) {
            this.suggestions.push({
                type: 'time',
                title: 'Alternative Times Available',
                options: availableSlots.slice(0, 3),
                action: 'change_time'
            });
        } else {
            // Suggest nearby dates
            this.suggestAlternativeDates(eventData, existingEvents);
        }
    }

    suggestAlternativeDates(eventData, existingEvents) {
        const originalDate = new Date(eventData.eventDate);
        const location = eventData.location;
        const { startTime, endTime } = this.getEventTimeRange(eventData, false);
        
        const alternativeDates = [];
        
        // Check next 7 days
        for (let i = 1; i <= 7; i++) {
            const checkDate = new Date(originalDate);
            checkDate.setDate(checkDate.getDate() + i);
            
            if (!this.isLocationBooked(location, checkDate, startTime, endTime, existingEvents)) {
                alternativeDates.push({
                    date: checkDate,
                    formatted: this.formatDate(checkDate),
                    dayOfWeek: checkDate.toLocaleDateString('en-US', { weekday: 'long' })
                });
            }
            
            if (alternativeDates.length >= 3) break;
        }
        
        if (alternativeDates.length > 0) {
            this.suggestions.push({
                type: 'date',
                title: 'Alternative Dates Available',
                options: alternativeDates,
                action: 'change_date'
            });
        }
    }

    suggestTimeAdjustments(eventData) {
        // Suggest fixing time-related issues
        const eventStart = this.parseTime(eventData.eventStartTime);
        const eventEnd = this.parseTime(eventData.eventEndTime);
        const reservationStart = this.parseTime(eventData.reservationStartTime);
        const reservationEnd = this.parseTime(eventData.reservationEndTime);
        
        if (eventStart && reservationStart && eventStart < reservationStart) {
            const suggestedStart = new Date(reservationStart.getTime() + 15 * 60000); // 15 min buffer
            this.suggestions.push({
                type: 'time_adjustment',
                title: 'Suggested Time Fix',
                message: `Move event start time to ${this.formatTime(suggestedStart)} or later`,
                action: 'adjust_start_time',
                suggestedValue: this.formatTimeForInput(suggestedStart)
            });
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    // Check if two dates are the same day
    isSameDate(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    // Check if two locations are the same (normalized)
    isSameLocation(loc1, loc2) {
        if (!loc1 || !loc2) return false;
        return loc1.trim().toLowerCase() === loc2.trim().toLowerCase();
    }

    // Get event time range with optional buffer
    getEventTimeRange(eventData, includeBuffer = false) {
        const eventDate = new Date(eventData.eventDate);
        const reservationStart = eventData.reservationStartTime || eventData.eventStartTime;
        const reservationEnd = eventData.reservationEndTime || eventData.eventEndTime;
        
        let startTime = this.combineDateTime(eventDate, reservationStart);
        let endTime = this.combineDateTime(eventDate, reservationEnd);
        
        if (includeBuffer) {
            startTime = new Date(startTime.getTime() - this.bufferMinutes * 60000);
            endTime = new Date(endTime.getTime() + this.bufferMinutes * 60000);
        }
        
        return { startTime, endTime };
    }

    // Check if two time ranges overlap
    hasTimeOverlap(start1, end1, start2, end2) {
        return start1 < end2 && start2 < end1;
    }

    // Parse time string to Date object
    parseTime(timeString) {
        if (!timeString) return null;
        
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return date;
        } catch (error) {
            return null;
        }
    }

    // Combine date and time
    combineDateTime(date, timeString) {
        const combined = new Date(date);
        if (timeString) {
            const [hours, minutes] = timeString.split(':');
            combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        return combined;
    }

    // Format time for display
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    // Format time for input field
    formatTimeForInput(date) {
        return date.toTimeString().slice(0, 5);
    }

    // Format date for display
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    }

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Phone validation
    isValidPhone(phone) {
        const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
        const digitCount = phone.replace(/\D/g, '').length;
        return phoneRegex.test(phone) && digitCount >= 10;
    }

    // Get all available locations
    getAllLocations() {
        return [
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
        ];
    }

    // Check if location is booked at specific time
    isLocationBooked(location, date, startTime, endTime, existingEvents) {
        return existingEvents.some(event => {
            const eventData = event.eventData || event;
            const eventDate = new Date(eventData.eventDate);
            
            if (!this.isSameDate(date, eventDate)) return false;
            if (!this.isSameLocation(location, eventData.location)) return false;
            
            const { startTime: eventStart, endTime: eventEnd } = this.getEventTimeRange(eventData, true);
            return this.hasTimeOverlap(startTime, endTime, eventStart, eventEnd);
        });
    }

    // Find available time slots for a day/location
    findAvailableTimeSlots(date, location, existingEvents) {
        const slots = [];
        const workingHours = { start: 8, end: 22 }; // 8 AM to 10 PM
        
        for (let hour = workingHours.start; hour < workingHours.end - 1; hour++) {
            const slotStart = new Date(date);
            slotStart.setHours(hour, 0, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setHours(hour + 2); // 2-hour slots
            
            if (!this.isLocationBooked(location, date, slotStart, slotEnd, existingEvents)) {
                slots.push({
                    startTime: this.formatTime(slotStart),
                    endTime: this.formatTime(slotEnd),
                    timeValue: this.formatTimeForInput(slotStart)
                });
            }
        }
        
        return slots;
    }

    // Get holiday dates for a year
    getHolidayDates(year) {
        return [
            { name: 'New Year\'s Day', date: new Date(year, 0, 1) },
            { name: 'Thanksgiving', date: this.getThanksgiving(year) },
            { name: 'Christmas Day', date: new Date(year, 11, 25) },
            // Add more holidays as needed
        ];
    }

    // Calculate Thanksgiving date
    getThanksgiving(year) {
        const november = new Date(year, 10, 1);
        const firstThursday = 4 - november.getDay() + (november.getDay() === 0 ? 4 : 0);
        return new Date(year, 10, firstThursday + 21);
    }

    // Check if there are room conflicts
    hasRoomConflicts() {
        return this.conflicts.some(conflict => conflict.type === 'room');
    }

    // Check if there are time conflicts
    hasTimeConflicts() {
        return this.conflicts.some(conflict => conflict.type === 'time');
    }

    // Generate summary message
    generateSummary() {
        if (!this.hasConflicts() && !this.hasWarnings()) {
            return 'No conflicts detected. Event can be submitted.';
        }
        
        const parts = [];
        
        if (this.conflicts.length > 0) {
            parts.push(`${this.conflicts.length} conflict${this.conflicts.length > 1 ? 's' : ''} found`);
        }
        
        if (this.warnings.length > 0) {
            parts.push(`${this.warnings.length} warning${this.warnings.length > 1 ? 's' : ''}`);
        }
        
        return parts.join(', ');
    }
}

// ============================================================================
// GLOBAL CONFLICT DETECTION INSTANCE
// ============================================================================

// Create global instance
window.ConflictDetector = new ConflictDetector();

// ============================================================================
// ENHANCED GITHUB API INTEGRATION
// ============================================================================

// Enhanced conflict checking function for GitHub API
async function checkEventConflictsEnhanced(eventData, excludeEventId = null) {
    try {
        const result = await window.ConflictDetector.detectConflicts(eventData, excludeEventId);
        
        // Convert to legacy format for backward compatibility
        const legacyConflicts = result.conflicts.map(conflict => ({
            type: conflict.type,
            message: conflict.message,
            event: conflict.conflictingEvent
        }));
        
        return {
            conflicts: legacyConflicts,
            hasConflicts: result.hasConflicts,
            hasWarnings: result.hasWarnings,
            warnings: result.warnings,
            suggestions: result.suggestions,
            summary: result.summary,
            detailed: result
        };
        
    } catch (error) {
        console.error('❌ Enhanced conflict detection error:', error);
        return {
            conflicts: [],
            hasConflicts: false,
            hasWarnings: true,
            warnings: [{ type: 'system', message: 'Conflict detection temporarily unavailable' }],
            suggestions: [],
            summary: 'Unable to check for conflicts'
        };
    }
}

// ============================================================================
// DATA INTEGRITY UTILITIES
// ============================================================================

class DataIntegrityManager {
    static async validateDataIntegrity() {
        console.log('🔧 Running data integrity check...');
        
        try {
            const [pendingEvents, approvedEvents] = await Promise.all([
                window.GitHubAPI.loadPendingEvents(),
                window.GitHubAPI.loadApprovedEvents()
            ]);
            
            const issues = [];
            
            // Check for duplicate IDs
            issues.push(...this.checkDuplicateIds(pendingEvents, approvedEvents));
            
            // Check for invalid dates
            issues.push(...this.checkInvalidDates(pendingEvents, approvedEvents));
            
            // Check for missing required fields
            issues.push(...this.checkMissingFields(pendingEvents, approvedEvents));
            
            return {
                issues,
                hasIssues: issues.length > 0,
                summary: `Found ${issues.length} data integrity issue${issues.length !== 1 ? 's' : ''}`
            };
            
        } catch (error) {
            console.error('❌ Data integrity check failed:', error);
            return {
                issues: [{ type: 'system', message: 'Data integrity check failed: ' + error.message }],
                hasIssues: true,
                summary: 'Data integrity check failed'
            };
        }
    }
    
    static checkDuplicateIds(pendingEvents, approvedEvents) {
        const issues = [];
        const allIds = new Set();
        const duplicates = new Set();
        
        [...pendingEvents, ...approvedEvents].forEach(event => {
            if (event.id) {
                if (allIds.has(event.id)) {
                    duplicates.add(event.id);
                }
                allIds.add(event.id);
            }
        });
        
        duplicates.forEach(id => {
            issues.push({
                type: 'duplicate_id',
                severity: 'high',
                message: `Duplicate event ID found: ${id}`,
                eventId: id
            });
        });
        
        return issues;
    }
    
    static checkInvalidDates(pendingEvents, approvedEvents) {
        const issues = [];
        
        [...pendingEvents, ...approvedEvents].forEach(event => {
            const eventData = event.eventData || event;
            
            if (eventData.eventDate) {
                const date = new Date(eventData.eventDate);
                if (isNaN(date.getTime())) {
                    issues.push({
                        type: 'invalid_date',
                        severity: 'high',
                        message: `Invalid event date: ${eventData.eventDate}`,
                        eventId: event.id,
                        eventName: eventData.name
                    });
                }
            }
        });
        
        return issues;
    }
    
    static checkMissingFields(pendingEvents, approvedEvents) {
        const issues = [];
        const requiredFields = ['name', 'eventDate', 'location', 'contactEmail'];
        
        [...pendingEvents, ...approvedEvents].forEach(event => {
            const eventData = event.eventData || event;
            
            requiredFields.forEach(field => {
                if (!eventData[field] || eventData[field].toString().trim() === '') {
                    issues.push({
                        type: 'missing_field',
                        severity: 'medium',
                        message: `Missing required field: ${field}`,
                        eventId: event.id,
                        eventName: eventData.name || 'Unnamed Event',
                        field: field
                    });
                }
            });
        });
        
        return issues;
    }
    
    static async repairDataIssues(issues) {
        console.log('🔧 Attempting to repair data issues...');
        
        const repairedIssues = [];
        const unrepairedIssues = [];
        
        for (const issue of issues) {
            try {
                if (await this.repairSingleIssue(issue)) {
                    repairedIssues.push(issue);
                } else {
                    unrepairedIssues.push(issue);
                }
            } catch (error) {
                console.error('❌ Failed to repair issue:', issue, error);
                unrepairedIssues.push(issue);
            }
        }
        
        return {
            repaired: repairedIssues,
            unrepaired: unrepairedIssues,
            summary: `Repaired ${repairedIssues.length} of ${issues.length} issues`
        };
    }
    
    static async repairSingleIssue(issue) {
        // This is a placeholder for actual repair logic
        // In a real implementation, you would add specific repair methods
        console.log('🔧 Attempting to repair issue:', issue);
        
        switch (issue.type) {
            case 'duplicate_id':
                // Could regenerate IDs for duplicates
                return false; // Requires manual intervention
                
            case 'invalid_date':
                // Could attempt to parse and fix dates
                return false; // Requires manual intervention
                
            case 'missing_field':
                // Could set default values for some fields
                return false; // Requires manual intervention
                
            default:
                return false;
        }
    }
}

// Export data integrity manager
window.DataIntegrityManager = DataIntegrityManager;

console.log('🔍 Advanced Conflict Detection System loaded successfully');
console.log('🎯 Features: Room conflicts, Time overlaps, Data validation, Smart suggestions');
