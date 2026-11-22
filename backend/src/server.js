import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from './engine/scheduler.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================================
// AUTHENTICATION ROUTES (LOGIN, SIGNUP & DEMO ACCOUNTS)
// ========================================================

// 1. Login Endpoint (Accepts Username or Email)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, identifier, password } = req.body;
    const loginId = (identifier || username || email || '').toLowerCase().trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please enter your username and password.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: loginId },
          { email: loginId }
        ]
      },
      include: { college: true, department: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found. If you are new, please Sign Up first.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    res.json({
      token: `token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
        collegeName: user.college?.name,
        departmentName: user.department?.name
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Signup Endpoint (Only requires Username & Password)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, name, role, collegeId, departmentId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = `${cleanUsername}@university.edu`;
    const cleanName = name || cleanUsername;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanEmail }
        ]
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'This username is already taken. Please choose another username or log in.' });
    }

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password,
        role: role || 'STUDENT',
        collegeId: collegeId || null,
        departmentId: departmentId || null
      },
      include: { college: true, department: true }
    });

    res.status(201).json({
      token: `token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
        collegeName: user.college?.name,
        departmentName: user.department?.name
      }
    });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Demo Quick-Login Accounts List
app.get('/api/auth/demo-accounts', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { college: true, department: true },
      take: 12
    });

    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      password: u.password || 'password123',
      collegeName: u.college?.name,
      departmentName: u.department?.name
    })));
  } catch (error) {
    console.error('Error fetching demo accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// METADATA & SCHEDULE DATA ROUTES
// ========================================================

app.get('/api/meta', async (req, res) => {
  try {
    const [
      colleges,
      departments,
      instructors,
      sections,
      rooms,
      courses,
      timeSlots,
      assignments,
      users,
      blockRequests
    ] = await Promise.all([
      prisma.college.findMany({ include: { departments: { include: { sections: true, instructors: true, courses: true } } } }),
      prisma.department.findMany({ include: { college: true, instructors: true, courses: true, sections: true, allocatedRooms: true } }),
      prisma.instructor.findMany({ include: { department: true } }),
      prisma.section.findMany({ include: { department: true } }),
      prisma.room.findMany({ include: { allocatedCollege: true, allocatedDept: true }, orderBy: [{ building: 'asc' }, { roomNumber: 'asc' }] }),
      prisma.course.findMany({ include: { department: true } }),
      prisma.timeSlot.findMany({ orderBy: [{ programType: 'asc' }, { dayOfWeek: 'asc' }, { periodNumber: 'asc' }] }),
      prisma.courseAssignment.findMany({ include: { course: true, instructor: true, section: true } }),
      prisma.user.findMany({ include: { college: true, department: true } }),
      prisma.blockRequest.findMany({ include: { college: { include: { departments: true } } }, orderBy: { createdAt: 'desc' } })
    ]);

    const instructorLoads = instructors.map(inst => {
      const assigned = assignments.filter(a => a.instructorId === inst.id);
      const totalCredit = assigned.reduce((sum, a) => sum + (a.creditHours || a.course?.creditHours || 3), 0);
      return {
        ...inst,
        assignedCreditHours: totalCredit,
        isOverloaded: totalCredit > inst.maxCreditHours
      };
    });

    res.json({
      colleges,
      departments,
      instructors: instructorLoads,
      sections,
      rooms,
      courses,
      timeSlots,
      assignments,
      users,
      blockRequests
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/schedule', async (req, res) => {
  try {
    const { programType, sectionId, instructorId, roomId } = req.query;

    const where = {};
    if (programType) where.programType = programType;
    if (sectionId) where.sectionId = sectionId;
    if (instructorId) where.instructorId = instructorId;
    if (roomId) where.roomId = roomId;

    const slots = await prisma.scheduleSlot.findMany({
      where,
      include: {
        course: true,
        instructor: true,
        section: true,
        room: true,
        timeSlot: true
      },
      orderBy: [
        { timeSlot: { dayOfWeek: 'asc' } },
        { timeSlot: { periodNumber: 'asc' } }
      ]
    });

    res.json(slots);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Super Admin: Run Automated Zero-Conflict Generator
app.post('/api/schedule/generate', async (req, res) => {
  try {
    const { programType = 'REGULAR' } = req.body;

    const [courses, instructors, sections, rooms, timeSlots, courseAssignments, existingSchedule] = await Promise.all([
      prisma.course.findMany(),
      prisma.instructor.findMany(),
      prisma.section.findMany(),
      prisma.room.findMany(),
      prisma.timeSlot.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }] }),
      prisma.courseAssignment.findMany(),
      prisma.scheduleSlot.findMany({
        where: { programType },
        include: { course: true, instructor: true, section: true, room: true, timeSlot: true }
      })
    ]);

    const engine = new TimetableEngine({
      courses,
      instructors,
      sections,
      rooms,
      timeSlots,
      courseAssignments,
      existingSchedule,
      programType
    });

    const result = engine.generate();

    await prisma.$transaction(async (tx) => {
      await tx.scheduleSlot.deleteMany({
        where: { programType, isLocked: false }
      });

      for (const slot of result.schedule) {
        if (slot.isLocked) continue;
        await tx.scheduleSlot.create({
          data: {
            academicYear: '2026/2027',
            semester: 1,
            programType: slot.programType || programType,
            courseId: slot.courseId,
            instructorId: slot.instructorId,
            sectionId: slot.sectionId,
            roomId: slot.roomId,
            timeSlotId: slot.timeSlotId,
            isLab: slot.isLab,
            isLocked: false,
            isUnlocked: false
          }
        });
      }
    });

    res.json({
      success: result.success,
      programType,
      totalPlaced: result.totalPlaced,
      totalRequested: result.totalRequested,
      unplacedCount: result.unplacedCount,
      message: result.success
        ? `Successfully generated 100% zero-conflict ${programType} schedule (${result.totalPlaced} slots).`
        : `Generated ${programType} schedule with ${result.unplacedCount} unplaced slots due to tight constraints.`
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dean: Submit Classroom Request (Specifying Department Batches Count)
app.post('/api/dean/request-block', async (req, res) => {
  try {
    const { collegeId, programType = 'REGULAR', requestedRoomsCount, totalStudents, totalBatches, departmentBatches, remarks } = req.body;

    const request = await prisma.blockRequest.create({
      data: {
        collegeId,
        programType,
        requestedRoomsCount: parseInt(requestedRoomsCount),
        totalStudents: parseInt(totalStudents) || 0,
        totalBatches: parseInt(totalBatches) || 1,
        departmentBatches: departmentBatches || [],
        remarks,
        status: 'PENDING'
      },
      include: { college: { include: { departments: true } } }
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Error submitting block request:', error);
    res.status(500).json({ error: error.message });
  }
});

// General Services: Review & Allocate Lecture Blocks/Rooms to College
// RULE 1: General Services assigns to the College as a whole, NEVER to individual departments.
// RULE 2: General Services manages STANDARD LECTURE CLASSROOMS ONLY. Labs are managed by the Lab Coordinator.
app.put('/api/general-service/block-request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, allocatedBlocks, allocatedRoomIds, remarks } = req.body;

    const updated = await prisma.blockRequest.update({
      where: { id },
      data: {
        status,
        ...(allocatedBlocks !== undefined && { allocatedBlocks }),
        ...(allocatedRoomIds !== undefined && { allocatedRoomIds }),
        ...(remarks !== undefined && { remarks })
      },
      include: { college: { include: { departments: true } } }
    });

    // If approved, allocate ONLY lecture halls and classrooms to the College (leaving allocatedDeptId null for Dean)
    if (status === 'APPROVED') {
      if (Array.isArray(allocatedRoomIds) && allocatedRoomIds.length > 0) {
        await prisma.room.updateMany({
          where: {
            id: { in: allocatedRoomIds },
            roomType: { in: ['LECTURE_HALL', 'STANDARD_CLASSROOM'] }
          },
          data: { allocatedCollegeId: updated.collegeId, allocatedDeptId: null }
        });
      } else if (Array.isArray(allocatedBlocks) && allocatedBlocks.length > 0) {
        await prisma.room.updateMany({
          where: {
            building: { in: allocatedBlocks },
            roomType: { in: ['LECTURE_HALL', 'STANDARD_CLASSROOM'] }
          },
          data: { allocatedCollegeId: updated.collegeId, allocatedDeptId: null }
        });
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating block request:', error);
    res.status(500).json({ error: error.message });
  }
});

// General Services: Direct Room/Block Allocation to College
app.post('/api/general-service/allocate-rooms', async (req, res) => {
  try {
    const { collegeId, roomIds, blockNames, action = 'ALLOCATE' } = req.body;
    if (!collegeId) {
      return res.status(400).json({ error: 'College is required.' });
    }

    if (action === 'UNALLOCATE') {
      if (Array.isArray(roomIds) && roomIds.length > 0) {
        await prisma.room.updateMany({
          where: { id: { in: roomIds } },
          data: { allocatedCollegeId: null, allocatedDeptId: null }
        });
      }
      return res.json({ success: true, message: 'Rooms unallocated from college.' });
    }

    if (Array.isArray(roomIds) && roomIds.length > 0) {
      await prisma.room.updateMany({
        where: { id: { in: roomIds } },
        data: { allocatedCollegeId: collegeId, allocatedDeptId: null }
      });
    } else if (Array.isArray(blockNames) && blockNames.length > 0) {
      await prisma.room.updateMany({
        where: { building: { in: blockNames } },
        data: { allocatedCollegeId: collegeId, allocatedDeptId: null }
      });
    }

    res.json({ success: true, message: 'Classrooms allocated to college successfully!' });
  } catch (error) {
    console.error('Error in general service allocate-rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

// General Services: Direct Block Allocation to College
app.post('/api/general-service/allocate-block', async (req, res) => {
  try {
    const { building, collegeId } = req.body;
    if (!building || !collegeId) {
      return res.status(400).json({ error: 'Building name and College are required.' });
    }
    await prisma.room.updateMany({
      where: {
        building,
        roomType: { in: ['LECTURE_HALL', 'STANDARD_CLASSROOM'] }
      },
      data: { allocatedCollegeId: collegeId, allocatedDeptId: null }
    });
    res.json({ success: true, message: `Block ${building} allocated to college successfully!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// General Services: Direct Block Release (Make Free / Unallocated)
app.post('/api/general-service/release-block', async (req, res) => {
  try {
    const { building } = req.body;
    if (!building) {
      return res.status(400).json({ error: 'Building name is required.' });
    }
    await prisma.room.updateMany({
      where: { building },
      data: { allocatedCollegeId: null, allocatedDeptId: null }
    });
    res.json({ success: true, message: `Block ${building} released and marked Free!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// General Services: Add New Campus Room
app.post('/api/general-service/room', async (req, res) => {
  try {
    const { roomNumber, building, capacity, roomType = 'STANDARD_CLASSROOM', allocatedCollegeId = null } = req.body;
    if (!roomNumber || !building || !capacity) {
      return res.status(400).json({ error: 'Room number, building, and capacity are required.' });
    }
    const room = await prisma.room.create({
      data: {
        roomNumber,
        building,
        capacity: parseInt(capacity),
        roomType,
        allocatedCollegeId: allocatedCollegeId || null,
        allocatedDeptId: null
      },
      include: { allocatedCollege: true, allocatedDept: true }
    });
    res.status(201).json(room);
  } catch (error) {
    console.error('Error adding room:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dean: Distribute / Assign a College Room to a Specific Department inside the College
// RULE: The Dean assigns rooms belonging to their College to their departments (CS, IT, IS, ECE, etc.)
app.put('/api/dean/allocate-room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { departmentId, collegeId } = req.body;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { allocatedCollege: true, allocatedDept: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // Verify room is allocated to a college
    if (!room.allocatedCollegeId) {
      return res.status(400).json({ error: 'This room has not yet been allocated to your college by General Services.' });
    }

    if (collegeId && room.allocatedCollegeId !== collegeId) {
      return res.status(403).json({ error: 'This room is allocated to a different college.' });
    }

    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        return res.status(404).json({ error: 'Department not found.' });
      }
      if (dept.collegeId !== room.allocatedCollegeId) {
        return res.status(400).json({ error: 'The selected department does not belong to this college.' });
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        allocatedDeptId: departmentId || null
      },
      include: { allocatedCollege: true, allocatedDept: true }
    });

    res.json(updatedRoom);
  } catch (error) {
    console.error('Error in dean allocate-room:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dean: Batch Distribute Rooms to Departments
app.post('/api/dean/batch-allocate-rooms', async (req, res) => {
  try {
    const { allocations } = req.body; // array of { roomId, departmentId }
    if (!Array.isArray(allocations)) {
      return res.status(400).json({ error: 'Allocations list is required.' });
    }

    for (const item of allocations) {
      await prisma.room.update({
        where: { id: item.roomId },
        data: { allocatedDeptId: item.departmentId || null }
      });
    }

    res.json({ success: true, message: 'Rooms distributed to departments successfully!' });
  } catch (error) {
    console.error('Error batch allocating rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Department Head: Add New Course
app.post('/api/dept-head/course', async (req, res) => {
  try {
    const { code, name, creditHours, weeklyLectureHours, weeklyLabHours, requiresLab, departmentId, programType } = req.body;

    const course = await prisma.course.create({
      data: {
        code,
        name,
        creditHours: parseInt(creditHours),
        weeklyLectureHours: parseInt(weeklyLectureHours),
        weeklyLabHours: parseInt(weeklyLabHours || 0),
        requiresLab: Boolean(requiresLab),
        departmentId,
        programType: programType || 'REGULAR',
        isFreshmanCommon: false
      }
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: error.message });
  }
});

// Department Head: Add New Lecturer
app.post('/api/dept-head/instructor', async (req, res) => {
  try {
    const { name, email, departmentId, maxCreditHours } = req.body;

    const instructor = await prisma.instructor.create({
      data: {
        name,
        email,
        departmentId,
        maxCreditHours: parseInt(maxCreditHours || 12)
      }
    });

    res.status(201).json(instructor);
  } catch (error) {
    console.error('Error creating instructor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Department Head: Assign or Change Lecturer
app.post('/api/dept-head/assign', async (req, res) => {
  try {
    const { courseId, instructorId, sectionId, creditHours = 3, sessionType = 'LECTURE' } = req.body;

    const [instructor, currentAssignments] = await Promise.all([
      prisma.instructor.findUnique({ where: { id: instructorId } }),
      prisma.courseAssignment.findMany({ where: { instructorId } })
    ]);

    const currentLoad = currentAssignments.reduce((acc, a) => acc + a.creditHours, 0);
    const newTotal = currentLoad + parseInt(creditHours);

    if (newTotal > (instructor?.maxCreditHours || 12)) {
      return res.status(400).json({
        error: `Credit hour limit exceeded! ${instructor?.name} already has ${currentLoad} credit hours. Adding ${creditHours} exceeds max limit of ${instructor?.maxCreditHours} hours.`
      });
    }

    const assignment = await prisma.courseAssignment.upsert({
      where: {
        courseId_sectionId_sessionType: { courseId, sectionId, sessionType }
      },
      update: { instructorId, creditHours: parseInt(creditHours) },
      create: {
        courseId,
        instructorId,
        sectionId,
        creditHours: parseInt(creditHours),
        sessionType
      },
      include: { course: true, instructor: true, section: true }
    });

    res.json(assignment);
  } catch (error) {
    console.error('Error assigning course:', error);
    res.status(500).json({ error: error.message });
  }
});

// Registrar: Add Freshman Common Course
app.post('/api/registrar/freshman-course', async (req, res) => {
  try {
    const { code, name, creditHours, weeklyLectureHours, weeklyLabHours, requiresLab, streamType, programType } = req.body;

    const course = await prisma.course.create({
      data: {
        code,
        name,
        creditHours: parseInt(creditHours),
        weeklyLectureHours: parseInt(weeklyLectureHours),
        weeklyLabHours: parseInt(weeklyLabHours || 0),
        requiresLab: Boolean(requiresLab),
        isFreshmanCommon: true,
        streamType: streamType || 'NATURAL_SCIENCE',
        programType: programType || 'REGULAR'
      }
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating freshman course:', error);
    res.status(500).json({ error: error.message });
  }
});

// Classroom Usher: View daily room schedule
app.get('/api/usher/daily-schedule', async (req, res) => {
  try {
    const { dayOfWeek = 'MONDAY', building } = req.query;

    const where = {
      timeSlot: { dayOfWeek }
    };
    if (building) {
      where.room = { building };
    }

    const slots = await prisma.scheduleSlot.findMany({
      where,
      include: {
        room: true,
        course: true,
        instructor: true,
        section: true,
        timeSlot: true
      },
      orderBy: [
        { timeSlot: { periodNumber: 'asc' } },
        { room: { roomNumber: 'asc' } }
      ]
    });

    const usherSchedule = slots.map(s => ({
      ...s,
      action: s.isUnlocked ? 'LOCK' : 'UNLOCK',
      targetTime: s.isUnlocked ? s.timeSlot.endTime : s.timeSlot.startTime,
      recommendation: s.isUnlocked
        ? `Lock room ${s.room.roomNumber} after ${s.timeSlot.endTime}`
        : `Unlock room ${s.room.roomNumber} 15 mins before ${s.timeSlot.startTime}`
    }));

    res.json(usherSchedule);
  } catch (error) {
    console.error('Error fetching usher schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Classroom Usher: Toggle Room Lock
app.put('/api/usher/slot/:id/toggle-lock', async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await prisma.scheduleSlot.findUnique({ where: { id } });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const updated = await prisma.scheduleSlot.update({
      where: { id },
      data: { isUnlocked: !slot.isUnlocked },
      include: { room: true, course: true, timeSlot: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling room lock:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear Unlocked Slots
app.delete('/api/schedule/clear', async (req, res) => {
  try {
    const { programType } = req.query;
    const where = { isLocked: false };
    if (programType) where.programType = programType;

    const deleted = await prisma.scheduleSlot.deleteMany({ where });
    res.json({ message: 'Schedule cleared', deletedCount: deleted.count });
  } catch (error) {
    console.error('Error clearing schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 University Timetable Multi-Actor Backend running on http://localhost:${PORT}`);
});
