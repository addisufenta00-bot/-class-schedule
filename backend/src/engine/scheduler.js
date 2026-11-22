/**
 * University Timetable Zero-Conflict Scheduler Engine
 * Supports Regular & Extension programs, Credit Hours tracking, and Multi-Actor workflows.
 */

export class TimetableEngine {
  constructor({
    courses,
    instructors,
    sections,
    rooms,
    timeSlots,
    courseAssignments,
    existingSchedule = [],
    programType = 'REGULAR'
  }) {
    this.courses = courses;
    this.instructors = instructors;
    this.sections = sections;
    this.rooms = rooms;
    this.timeSlots = timeSlots;
    this.assignments = courseAssignments;
    this.existingSchedule = existingSchedule;
    this.programType = programType;
    this.schedule = [...existingSchedule];
  }

  /**
   * Validate Hard Constraints for placing a session at a specific room and timeslot.
   * Returns { valid: boolean, errors: string[] }
   */
  validateHardConstraints({
    instructorId,
    sectionId,
    roomId,
    timeSlotId,
    isLab,
    studentCount,
    ignoreSlotId = null
  }) {
    const errors = [];

    const room = this.rooms.find(r => r.id === roomId);
    const instructor = this.instructors.find(i => i.id === instructorId);
    const section = this.sections.find(s => s.id === sectionId);
    const targetSlot = this.timeSlots.find(t => t.id === timeSlotId);

    // 1. Program Type match (Regular courses in Regular slots, Extension in Extension slots)
    if (targetSlot && targetSlot.programType !== this.programType) {
      errors.push(`Program mismatch: Target time slot is ${targetSlot.programType}, but current schedule is ${this.programType}.`);
    }

    // 2. Room Capacity Constraint
    if (room && studentCount && studentCount > room.capacity) {
      errors.push(`Room capacity exceeded: Section has ${studentCount} students, but room ${room.roomNumber} holds only ${room.capacity}.`);
    }

    // 3. Lab Equipment Requirement
    if (room && isLab && room.roomType !== 'COMPUTER_LAB' && room.roomType !== 'SCIENCE_LAB') {
      errors.push(`Lab mismatch: Laboratory session requires a Computer or Science Lab, but ${room.roomNumber} is ${room.roomType}.`);
    }

    // 4. Instructor Availability Constraint
    if (instructor && Array.isArray(instructor.unavailableSlots) && instructor.unavailableSlots.includes(timeSlotId)) {
      errors.push(`Instructor unavailable: ${instructor.name} is marked as unavailable at ${targetSlot?.dayOfWeek} period ${targetSlot?.periodNumber}.`);
    }

    // 5. Check for Double-Booking against existing schedule slots
    for (const slot of this.schedule) {
      if (ignoreSlotId && slot.id === ignoreSlotId) continue;
      if (slot.timeSlotId !== timeSlotId) continue;

      // 5a. Room Double-Booking
      if (slot.roomId === roomId) {
        errors.push(`Room clash: Room ${room?.roomNumber || roomId} is already booked at this time.`);
      }

      // 5b. Instructor Double-Booking
      if (slot.instructorId === instructorId) {
        errors.push(`Instructor clash: Instructor ${instructor?.name || instructorId} is already teaching at this time.`);
      }

      // 5c. Section Double-Booking
      if (slot.sectionId === sectionId) {
        errors.push(`Section clash: Section ${section?.name || sectionId} already has another session at this time.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate instructor credit hour loads and detect overloads (> maxCreditHours)
   */
  getInstructorCreditLoads() {
    const loads = {};
    for (const inst of this.instructors) {
      loads[inst.id] = {
        id: inst.id,
        name: inst.name,
        departmentId: inst.departmentId,
        maxCreditHours: inst.maxCreditHours,
        assignedCreditHours: 0,
        courses: []
      };
    }

    for (const a of this.assignments) {
      if (loads[a.instructorId]) {
        loads[a.instructorId].assignedCreditHours += a.creditHours;
        loads[a.instructorId].courses.push({
          courseId: a.courseId,
          sectionId: a.sectionId,
          creditHours: a.creditHours
        });
      }
    }

    return Object.values(loads);
  }

  /**
   * Automated Zero-Conflict Generator for specified programType (REGULAR or EXTENSION)
   */
  generate() {
    // Retain manually locked slots
    const lockedSlots = this.schedule.filter(s => s.isLocked && s.programType === this.programType);
    this.schedule = [...lockedSlots];

    // Filter timeSlots for the requested programType
    const availableTimeSlots = this.timeSlots.filter(t => t.programType === this.programType);

    // Build session requests for this program type
    const sessionsToSchedule = [];
    for (const assignment of this.assignments) {
      const course = this.courses.find(c => c.id === assignment.courseId);
      const section = this.sections.find(s => s.id === assignment.sectionId);
      if (!course || !section) continue;

      // Filter by programType
      if (section.programType !== this.programType && course.programType !== this.programType) {
        continue;
      }

      // Lectures
      for (let i = 0; i < course.weeklyLectureHours; i++) {
        sessionsToSchedule.push({
          assignmentId: assignment.id,
          courseId: course.id,
          instructorId: assignment.instructorId,
          sectionId: section.id,
          studentCount: section.studentCount,
          isLab: false,
          sessionIndex: i
        });
      }

      // Labs
      if (course.requiresLab && course.weeklyLabHours > 0) {
        for (let i = 0; i < course.weeklyLabHours; i++) {
          sessionsToSchedule.push({
            assignmentId: assignment.id,
            courseId: course.id,
            instructorId: assignment.instructorId,
            sectionId: section.id,
            studentCount: section.studentCount,
            isLab: true,
            sessionIndex: i
          });
        }
      }
    }

    // Most Constrained Variable First (Labs first, then larger classes)
    sessionsToSchedule.sort((a, b) => {
      if (a.isLab !== b.isLab) return a.isLab ? -1 : 1;
      return b.studentCount - a.studentCount;
    });

    const unplacedSessions = [];

    // Solve placement
    for (const session of sessionsToSchedule) {
      // Find candidate rooms
      const eligibleRooms = this.rooms.filter(room => {
        if (!room.isActive) return false;
        if (room.capacity < session.studentCount) return false;
        if (session.isLab && room.roomType !== 'COMPUTER_LAB' && room.roomType !== 'SCIENCE_LAB') return false;
        if (!session.isLab && (room.roomType === 'COMPUTER_LAB' || room.roomType === 'SCIENCE_LAB')) return false;
        return true;
      });

      // Sort by preference: 1st preference is Dean-assigned room to department, 2nd is best-fit capacity
      eligibleRooms.sort((a, b) => {
        const aDeptMatch = session.departmentId && a.allocatedDeptId === session.departmentId ? 1 : 0;
        const bDeptMatch = session.departmentId && b.allocatedDeptId === session.departmentId ? 1 : 0;
        if (aDeptMatch !== bDeptMatch) return bDeptMatch - aDeptMatch;
        return (a.capacity - session.studentCount) - (b.capacity - session.studentCount);
      });

      let placed = false;
      for (const timeSlot of availableTimeSlots) {
        for (const room of eligibleRooms) {
          const validation = this.validateHardConstraints({
            instructorId: session.instructorId,
            sectionId: session.sectionId,
            roomId: room.id,
            timeSlotId: timeSlot.id,
            isLab: session.isLab,
            studentCount: session.studentCount
          });

          if (validation.valid) {
            this.schedule.push({
              id: `sched_${session.sectionId}_${session.courseId}_${timeSlot.id}`,
              programType: this.programType,
              courseId: session.courseId,
              instructorId: session.instructorId,
              sectionId: session.sectionId,
              roomId: room.id,
              timeSlotId: timeSlot.id,
              isLab: session.isLab,
              isLocked: false,
              isUnlocked: false
            });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      if (!placed) {
        unplacedSessions.push(session);
      }
    }

    return {
      success: unplacedSessions.length === 0,
      programType: this.programType,
      totalPlaced: this.schedule.length,
      totalRequested: sessionsToSchedule.length,
      unplacedCount: unplacedSessions.length,
      unplacedSessions,
      schedule: this.schedule
    };
  }
}
