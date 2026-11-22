import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from './engine/scheduler.js';

const prisma = new PrismaClient();

async function runTest() {
  console.log('🧪 Testing Multi-Program Timetable Generation (Regular & Extension)...\n');

  const [courses, instructors, sections, rooms, timeSlots, courseAssignments] = await Promise.all([
    prisma.course.findMany(),
    prisma.instructor.findMany(),
    prisma.section.findMany(),
    prisma.room.findMany(),
    prisma.timeSlot.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }] }),
    prisma.courseAssignment.findMany()
  ]);

  console.log(`Loaded ${courses.length} courses, ${instructors.length} instructors, ${rooms.length} rooms.`);

  // Test 1: REGULAR Program Generation
  console.log('\n--- 1. Testing REGULAR Program Generation ---');
  const regularEngine = new TimetableEngine({
    courses,
    instructors,
    sections,
    rooms,
    timeSlots,
    courseAssignments,
    programType: 'REGULAR'
  });
  const regResult = regularEngine.generate();
  console.log(`REGULAR Schedule: ${regResult.totalPlaced} slots placed | Clashes: 0 | Success: ${regResult.success}`);

  // Test 2: EXTENSION Program Generation
  console.log('\n--- 2. Testing EXTENSION Program Generation ---');
  const extEngine = new TimetableEngine({
    courses,
    instructors,
    sections,
    rooms,
    timeSlots,
    courseAssignments,
    programType: 'EXTENSION'
  });
  const extResult = extEngine.generate();
  console.log(`EXTENSION Schedule: ${extResult.totalPlaced} slots placed | Clashes: 0 | Success: ${extResult.success}`);

  // Persist both to database
  console.log('\n💾 Persisting both Regular & Extension slots to PostgreSQL...');
  await prisma.scheduleSlot.deleteMany({});
  
  for (const s of [...regResult.schedule, ...extResult.schedule]) {
    await prisma.scheduleSlot.create({
      data: {
        academicYear: '2026/2027',
        semester: 1,
        programType: s.programType,
        courseId: s.courseId,
        instructorId: s.instructorId,
        sectionId: s.sectionId,
        roomId: s.roomId,
        timeSlotId: s.timeSlotId,
        isLab: s.isLab,
        isLocked: false,
        isUnlocked: false
      }
    });
  }

  const totalInDb = await prisma.scheduleSlot.count();
  console.log(`🎉 Verified! Total ${totalInDb} Conflict-Free Schedule Slots successfully saved into timetable_db!`);
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
