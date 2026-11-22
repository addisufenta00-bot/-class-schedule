import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Comprehensive University Timetable Seeding (Multi-Actor & Extension)...');

  // 1. Wipe old records safely
  await prisma.scheduleSlot.deleteMany({});
  await prisma.courseAssignment.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.instructor.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.blockRequest.deleteMany({});
  await prisma.timeSlot.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.college.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // 2. Create College (Dean's College)
  const coet = await prisma.college.create({
    data: {
      name: 'College of Engineering and Technology',
      code: 'COET',
      deanName: 'Dr. Kassa Belay'
    }
  });

  const cbe = await prisma.college.create({
    data: {
      name: 'College of Business and Economics',
      code: 'CBE',
      deanName: 'Dr. Almaz Tefera'
    }
  });

  console.log('🏛️ Colleges created.');

  // 3. Create Departments under CoET
  const csDept = await prisma.department.create({
    data: { name: 'Computer Science', code: 'CS', collegeId: coet.id }
  });
  const itDept = await prisma.department.create({
    data: { name: 'Information Technology', code: 'IT', collegeId: coet.id }
  });
  const isDept = await prisma.department.create({
    data: { name: 'Information Systems', code: 'IS', collegeId: coet.id }
  });
  const eceDept = await prisma.department.create({
    data: { name: 'Electrical & Computer Engineering', code: 'ECE', collegeId: coet.id }
  });
  const seDept = await prisma.department.create({
    data: { name: 'Software Engineering', code: 'SE', collegeId: coet.id }
  });

  console.log('🏢 Departments created under CoET (CS, IT, IS, ECE, SE).');

  // 4. Create General Services Block Request (Dean to General Service workflow)
  await prisma.blockRequest.create({
    data: {
      collegeId: coet.id,
      academicYear: '2026/2027',
      semester: 1,
      programType: 'REGULAR',
      requestedRoomsCount: 6,
      totalStudents: 1250,
      status: 'APPROVED',
      allocatedBlocks: ['Block 42', 'Block 43', 'Tech Complex'],
      remarks: 'Allocated 6 lecture halls & 2 computer labs for College of Engineering & Technology.'
    }
  });

  console.log('📑 Dean request to General Services created and approved.');

  // 5. Create Rooms allocated by General Services and distributed to Departments by Dean
  const roomsData = [
    // Regular rooms allocated to COET departments
    { roomNumber: 'B42-101', building: 'Block 42', capacity: 120, roomType: 'LECTURE_HALL', allocatedCollegeId: coet.id, allocatedDeptId: csDept.id, programType: 'REGULAR' },
    { roomNumber: 'B42-102', building: 'Block 42', capacity: 100, roomType: 'LECTURE_HALL', allocatedCollegeId: coet.id, allocatedDeptId: csDept.id, programType: 'REGULAR' },
    { roomNumber: 'B42-201', building: 'Block 42', capacity: 65, roomType: 'STANDARD_CLASSROOM', allocatedCollegeId: coet.id, allocatedDeptId: seDept.id, programType: 'REGULAR' },
    { roomNumber: 'B42-202', building: 'Block 42', capacity: 65, roomType: 'STANDARD_CLASSROOM', allocatedCollegeId: coet.id, allocatedDeptId: itDept.id, programType: 'REGULAR' },
    { roomNumber: 'B43-101', building: 'Block 43', capacity: 55, roomType: 'STANDARD_CLASSROOM', allocatedCollegeId: coet.id, allocatedDeptId: isDept.id, programType: 'REGULAR' },
    { roomNumber: 'B43-102', building: 'Block 43', capacity: 55, roomType: 'STANDARD_CLASSROOM', allocatedCollegeId: coet.id, allocatedDeptId: eceDept.id, programType: 'REGULAR' },
    { roomNumber: 'TECH-PC-LAB1', building: 'Tech Complex', capacity: 65, roomType: 'COMPUTER_LAB', allocatedCollegeId: coet.id, programType: 'REGULAR' },
    { roomNumber: 'SCIENCE-LAB-1', building: 'Science Block', capacity: 65, roomType: 'SCIENCE_LAB', allocatedCollegeId: coet.id, programType: 'REGULAR' },

    // Extension rooms allocated to COET departments
    { roomNumber: 'EXT-101', building: 'Block 70 (Extension)', capacity: 60, roomType: 'STANDARD_CLASSROOM', allocatedCollegeId: coet.id, allocatedDeptId: csDept.id, programType: 'EXTENSION' },
    { roomNumber: 'EXT-201', building: 'Block 70 (Extension)', capacity: 100, roomType: 'LECTURE_HALL', allocatedCollegeId: coet.id, allocatedDeptId: csDept.id, programType: 'EXTENSION' },
    { roomNumber: 'EXT-102', building: 'Block 70 (Extension)', capacity: 60, roomType: 'STANDARD_CLASSROOM', allocatedCollegeId: coet.id, allocatedDeptId: itDept.id, programType: 'EXTENSION' },
    { roomNumber: 'EXT-202', building: 'Block 70 (Extension)', capacity: 65, roomType: 'STANDARD_CLASSROOM', allocatedCollegeId: coet.id, allocatedDeptId: isDept.id, programType: 'EXTENSION' },

    // Free / Available Unallocated Campus Rooms (for General Services to allocate)
    { roomNumber: 'B12-201', building: 'Block 12', capacity: 70, roomType: 'STANDARD_CLASSROOM', programType: 'REGULAR' },
    { roomNumber: 'B12-202', building: 'Block 12', capacity: 70, roomType: 'STANDARD_CLASSROOM', programType: 'REGULAR' },
    { roomNumber: 'B50-101', building: 'Block 50', capacity: 110, roomType: 'LECTURE_HALL', programType: 'REGULAR' },
    { roomNumber: 'B50-102', building: 'Block 50', capacity: 110, roomType: 'LECTURE_HALL', programType: 'REGULAR' },
    { roomNumber: 'EXT-301', building: 'Block 25 (Extension)', capacity: 65, roomType: 'STANDARD_CLASSROOM', programType: 'EXTENSION' },
    { roomNumber: 'EXT-302', building: 'Block 25 (Extension)', capacity: 65, roomType: 'STANDARD_CLASSROOM', programType: 'EXTENSION' }
  ];

  for (const r of roomsData) {
    await prisma.room.create({ data: r });
  }
  console.log('🏫 Rooms allocated by General Services (Block 42, Block 43, Tech Complex).');

  // 6. Create Time Slots (REGULAR and EXTENSION)
  // 6a. REGULAR Slots: Mon-Fri, 6 periods (08:30 - 16:00)
  const regularDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const regularPeriods = [
    { period: 1, start: '08:30', end: '09:30' },
    { period: 2, start: '09:30', end: '10:30' },
    { period: 3, start: '10:45', end: '11:45' },
    { period: 4, start: '11:45', end: '12:45' },
    { period: 5, start: '14:00', end: '15:00' },
    { period: 6, start: '15:00', end: '16:00' }
  ];
  for (const day of regularDays) {
    for (const p of regularPeriods) {
      await prisma.timeSlot.create({
        data: {
          programType: 'REGULAR',
          dayOfWeek: day,
          periodNumber: p.period,
          startTime: p.start,
          endTime: p.end
        }
      });
    }
  }

  // 6b. EXTENSION Slots: Evening Mon-Fri (18:00 - 21:00) + Weekend Sat-Sun
  for (const day of regularDays) {
    await prisma.timeSlot.create({
      data: { programType: 'EXTENSION', dayOfWeek: day, periodNumber: 1, startTime: '18:00', endTime: '19:30' }
    });
    await prisma.timeSlot.create({
      data: { programType: 'EXTENSION', dayOfWeek: day, periodNumber: 2, startTime: '19:30', endTime: '21:00' }
    });
  }
  // Weekend: Saturday & Sunday
  const weekendDays = ['SATURDAY', 'SUNDAY'];
  const weekendPeriods = [
    { period: 1, start: '08:30', end: '10:00' },
    { period: 2, start: '10:15', end: '11:45' },
    { period: 3, start: '13:30', end: '15:00' },
    { period: 4, start: '15:15', end: '16:45' }
  ];
  for (const day of weekendDays) {
    for (const p of weekendPeriods) {
      await prisma.timeSlot.create({
        data: {
          programType: 'EXTENSION',
          dayOfWeek: day,
          periodNumber: p.period,
          startTime: p.start,
          endTime: p.end
        }
      });
    }
  }

  console.log('⏰ TimeSlots created: 30 Regular + 18 Extension Slots.');

  // 7. Create Users for all Actors
  await prisma.user.createMany({
    data: [
      { name: 'Dr. Worku (Super Admin)', username: 'superadmin', email: 'superadmin@university.edu', password: 'password123', role: 'SUPER_ADMIN' },
      { name: 'Ato Getachew (Registrar)', username: 'registrar', email: 'registrar@university.edu', password: 'password123', role: 'REGISTRAR' },
      { name: 'Dr. Kassa Belay (Dean of CoET)', username: 'dean', email: 'dean.coet@university.edu', password: 'password123', role: 'DEAN', collegeId: coet.id },
      { name: 'Dr. Abebe Kebede (Head, CS Dept)', username: 'cshead', email: 'cs.head@university.edu', password: 'password123', role: 'DEPT_HEAD', departmentId: csDept.id },
      { name: 'Dr. Martha Desta (Head, IT Dept)', username: 'ithead', email: 'it.head@university.edu', password: 'password123', role: 'DEPT_HEAD', departmentId: itDept.id },
      { name: 'Ato Bekele (General Services Director)', username: 'generalservice', email: 'general.services@university.edu', password: 'password123', role: 'GENERAL_SERVICE' },
      { name: 'Sr. Genet (Lab Coordinator)', username: 'labcoordinator', email: 'lab.coordinator@university.edu', password: 'password123', role: 'LAB_COORDINATOR' },
      { name: 'Ato Tadesse (Block 42 Usher / Proctor)', username: 'usher', email: 'usher.tadesse@university.edu', password: 'password123', role: 'CLASSROOM_USHER' },
      { name: 'Dr. Tigist Mengistu (Lecturer)', username: 'tigist', email: 'tigist.m@university.edu', password: 'password123', role: 'INSTRUCTOR', departmentId: csDept.id },
      { name: 'Kidus Yohannes (Regular Student)', username: 'kidus', email: 'kidus.student@university.edu', password: 'password123', role: 'STUDENT', departmentId: csDept.id },
      { name: 'Selamawit Alene (Extension Student)', username: 'selamawit', email: 'selamawit.ext@university.edu', password: 'password123', role: 'STUDENT', departmentId: itDept.id }
    ]
  });

  console.log('👥 Multi-role users created for all 9 Actors.');

  // 8. Create Instructors (with credit hours limit)
  const instructors = [
    await prisma.instructor.create({
      data: { name: 'Dr. Abebe Kebede', email: 'abebe.k@university.edu', departmentId: csDept.id, maxCreditHours: 12 }
    }),
    await prisma.instructor.create({
      data: { name: 'Dr. Tigist Mengistu', email: 'tigist.m@university.edu', departmentId: csDept.id, maxCreditHours: 12 }
    }),
    await prisma.instructor.create({
      data: { name: 'Ms. Bethlehem Tadesse', email: 'bethlehem.t@university.edu', departmentId: csDept.id, maxCreditHours: 12 }
    }),
    await prisma.instructor.create({
      data: { name: 'Dr. Martha Desta', email: 'martha.d@university.edu', departmentId: itDept.id, maxCreditHours: 12 }
    }),
    await prisma.instructor.create({
      data: { name: 'Mr. Henok Alemu', email: 'henok.a@university.edu', departmentId: itDept.id, maxCreditHours: 12 }
    }),
    await prisma.instructor.create({
      data: { name: 'Prof. Dawit Haile', email: 'dawit.h@university.edu', departmentId: eceDept.id, maxCreditHours: 12 }
    })
  ];
  console.log('👨‍🏫 Instructors created with credit hours constraints.');

  // 9. Create Student Sections (Regular & Extension)
  const secCsY2Reg = await prisma.section.create({
    data: { name: 'CS Year 2 - Regular', year: 2, studentCount: 45, programType: 'REGULAR', departmentId: csDept.id }
  });
  const secCsY3Reg = await prisma.section.create({
    data: { name: 'CS Year 3 - Regular', year: 3, studentCount: 38, programType: 'REGULAR', departmentId: csDept.id }
  });
  const secItY2Ext = await prisma.section.create({
    data: { name: 'IT Year 2 - Extension (Evening)', year: 2, studentCount: 35, programType: 'EXTENSION', departmentId: itDept.id }
  });
  const secFreshNat = await prisma.section.create({
    data: { name: 'Freshman Natural Science - Sec 1', year: 1, studentCount: 60, programType: 'REGULAR', streamType: 'NATURAL_SCIENCE' }
  });

  console.log('🎓 Student sections created (Regular & Extension).');

  // 10. Courses: Registrar's Freshman Common Courses + Departmental Courses
  // 10a. Registrar Freshman Common Courses
  const cMath = await prisma.course.create({
    data: { code: 'MATH101', name: 'Mathematics for Natural Science', creditHours: 4, weeklyLectureHours: 4, weeklyLabHours: 0, isFreshmanCommon: true, streamType: 'NATURAL_SCIENCE', programType: 'REGULAR' }
  });
  const cPhys = await prisma.course.create({
    data: { code: 'PHYS101', name: 'General Physics', creditHours: 3, weeklyLectureHours: 3, weeklyLabHours: 2, requiresLab: true, isFreshmanCommon: true, streamType: 'NATURAL_SCIENCE', programType: 'REGULAR' }
  });
  const cEnglish = await prisma.course.create({
    data: { code: 'ENGL101', name: 'Communicative English Skills', creditHours: 3, weeklyLectureHours: 3, weeklyLabHours: 0, isFreshmanCommon: true, streamType: 'NATURAL_SCIENCE', programType: 'REGULAR' }
  });

  // 10b. Departmental Courses (CS & IT)
  const cDataStructures = await prisma.course.create({
    data: { code: 'CS201', name: 'Data Structures & Algorithms', creditHours: 4, weeklyLectureHours: 3, weeklyLabHours: 2, requiresLab: true, departmentId: csDept.id, programType: 'REGULAR' }
  });
  const cDatabase = await prisma.course.create({
    data: { code: 'CS301', name: 'Database Systems', creditHours: 4, weeklyLectureHours: 3, weeklyLabHours: 2, requiresLab: true, departmentId: csDept.id, programType: 'REGULAR' }
  });
  const cWebTech = await prisma.course.create({
    data: { code: 'IT202', name: 'Web Technologies (Extension)', creditHours: 3, weeklyLectureHours: 2, weeklyLabHours: 2, requiresLab: true, departmentId: itDept.id, programType: 'EXTENSION' }
  });

  console.log('📚 Courses created (Registrar Freshman Common + Departmental Specialized).');

  // 11. Course Assignments (with credit hour verification)
  const assignmentsData = [
    // Freshman Natural Science Section 1 (Registrar assignment)
    { courseId: cMath.id, instructorId: instructors[0].id, sectionId: secFreshNat.id, creditHours: 4 },
    { courseId: cPhys.id, instructorId: instructors[5].id, sectionId: secFreshNat.id, creditHours: 3 },
    { courseId: cEnglish.id, instructorId: instructors[2].id, sectionId: secFreshNat.id, creditHours: 3 },

    // CS Year 2 Regular (Dept Head assignment)
    { courseId: cDataStructures.id, instructorId: instructors[1].id, sectionId: secCsY2Reg.id, creditHours: 4 },

    // CS Year 3 Regular (Dept Head assignment)
    { courseId: cDatabase.id, instructorId: instructors[0].id, sectionId: secCsY3Reg.id, creditHours: 4 },

    // IT Year 2 Extension (Dept Head assignment)
    { courseId: cWebTech.id, instructorId: instructors[3].id, sectionId: secItY2Ext.id, creditHours: 3 }
  ];

  for (const a of assignmentsData) {
    await prisma.courseAssignment.create({ data: a });
  }

  console.log('✅ Course assignments configured.');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
