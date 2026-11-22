import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  User,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Building2,
  GraduationCap,
  Layers,
  Lock,
  Unlock,
  Printer,
  PlusCircle,
  KeyRound,
  Send,
  Briefcase,
  FileText,
  DoorOpen,
  DoorClosed,
  Check,
  X,
  LogIn,
  LogOut,
  UserPlus,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { DEFAULT_META, DEFAULT_SCHEDULE } from './mockData.js';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('timetable_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false); // false = Login mode, true = Signup mode
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Signup-specific fields
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState('STUDENT');

  // Dashboard Data State
  const [meta, setMeta] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  
  // Program Selector: REGULAR vs EXTENSION (Evening/Weekend)
  const [programType, setProgramType] = useState('REGULAR');

  // Multi-Actor Role: defaults to logged in user's role
  const [activeRole, setActiveRole] = useState(() => currentUser?.role || 'SUPER_ADMIN');

  // Filters
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedInstructor, setSelectedInstructor] = useState('ALL');
  const [selectedRoom, setSelectedRoom] = useState('ALL');

  // Modals & Forms for Workflows
  const [deanModal, setDeanModal] = useState(false);
  const [deptCourseModal, setDeptCourseModal] = useState(false);
  const [deptLecturerModal, setDeptLecturerModal] = useState(false);
  const [deptAssignModal, setDeptAssignModal] = useState(false);
  const [freshmanModal, setFreshmanModal] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // General Services & Dean Allocation State
  const [reviewRequestModal, setReviewRequestModal] = useState(null);
  const [reviewBlocks, setReviewBlocks] = useState([]);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [selectedDeanCollegeId, setSelectedDeanCollegeId] = useState('');
  const [generalServiceTab, setGeneralServiceTab] = useState('FREE_BLOCKS'); // 'FREE_BLOCKS' | 'ASSIGNED_BLOCKS' | 'REQUESTS' | 'INVENTORY'
  const [blockProgramFilter, setBlockProgramFilter] = useState('ALL'); // 'ALL' | 'REGULAR' | 'EXTENSION'

  // Forms
  const [deanForm, setDeanForm] = useState({ requestedRoomsCount: 6, totalStudents: 418, remarks: '', customBatches: {} });
  const [courseForm, setCourseForm] = useState({ code: '', name: '', creditHours: 3, weeklyLectureHours: 3, weeklyLabHours: 0, requiresLab: false, departmentId: '', programType: 'REGULAR' });
  const [lecturerForm, setLecturerForm] = useState({ name: '', email: '', departmentId: '', maxCreditHours: 12 });
  const [assignForm, setAssignForm] = useState({ courseId: '', instructorId: '', sectionId: '', creditHours: 3 });
  const [freshmanForm, setFreshmanForm] = useState({ code: '', name: '', creditHours: 3, weeklyLectureHours: 3, weeklyLabHours: 0, requiresLab: false, streamType: 'NATURAL_SCIENCE', programType: 'REGULAR' });

  // Safe Batch Parser
  const safeParseBatches = (batches, fallbackCollegeId) => {
    let list = [];
    if (Array.isArray(batches)) {
      list = batches;
    } else if (typeof batches === 'string') {
      try {
        const parsed = JSON.parse(batches);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }
    if (list.length === 0 && fallbackCollegeId && meta?.departments) {
      const depts = meta.departments.filter(d => d.collegeId === fallbackCollegeId);
      list = depts.map(d => ({
        code: d.code,
        departmentName: d.name,
        batchCount: d.sections?.length || 2
      }));
    }
    return list;
  };

  // Open Dean Request Modal with prefilled department batches
  const openDeanRequestModal = (collegeId) => {
    const targetCollegeId = collegeId || selectedDeanCollegeId || currentUser?.collegeId || meta?.colleges?.[0]?.id;
    if (targetCollegeId) {
      setSelectedDeanCollegeId(targetCollegeId);
    }
    const collegeDepts = meta?.departments?.filter(d => d.collegeId === targetCollegeId) || [];
    const initialBatches = {};
    collegeDepts.forEach(d => {
      initialBatches[d.id] = d.sections?.length || 2;
    });
    const total = Object.values(initialBatches).reduce((s, v) => s + v, 0);
    const deptSummary = collegeDepts.map(d => `${d.code}: ${initialBatches[d.id] || 2} batches`).join(', ');
    setDeanForm({
      requestedRoomsCount: Math.max(4, Math.ceil(total / 2)),
      totalStudents: total * 35,
      customBatches: initialBatches,
      remarks: `Official Demand: We have ${total} student batches across our ${collegeDepts.length} departments (${deptSummary}). Requesting ${Math.max(4, Math.ceil(total / 2))} lecture classrooms.`
    });
    setDeanModal(true);
  };

  const handleCollegeChangeInModal = (cId) => {
    setSelectedDeanCollegeId(cId);
    const collegeDepts = meta?.departments?.filter(d => d.collegeId === cId) || [];
    const initialBatches = {};
    collegeDepts.forEach(d => {
      initialBatches[d.id] = d.sections?.length || 2;
    });
    const total = Object.values(initialBatches).reduce((s, v) => s + v, 0);
    const deptSummary = collegeDepts.map(d => `${d.code}: ${initialBatches[d.id] || 2} batches`).join(', ');
    setDeanForm(prev => ({
      ...prev,
      requestedRoomsCount: Math.max(4, Math.ceil(total / 2)),
      totalStudents: total * 35,
      customBatches: initialBatches,
      remarks: `Official Demand: We have ${total} student batches across our ${collegeDepts.length} departments (${deptSummary}). Requesting ${Math.max(4, Math.ceil(total / 2))} lecture classrooms.`
    }));
  };

  // Load Dashboard Data when user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [programType, currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metaRes, schedRes] = await Promise.all([
        fetch('/api/meta'),
        fetch(`/api/schedule?programType=${programType}`)
      ]);
      if (!metaRes.ok || !schedRes.ok) throw new Error('API server unavailable');
      const metaData = await metaRes.json();
      const schedData = await schedRes.json();
      setMeta(metaData);
      setSchedule(schedData);
      
      if (metaData.departments?.length > 0) {
        setCourseForm(prev => ({ ...prev, departmentId: metaData.departments[0].id }));
        setLecturerForm(prev => ({ ...prev, departmentId: metaData.departments[0].id }));
      }
      if (metaData.colleges?.length > 0 && !selectedDeanCollegeId) {
        setSelectedDeanCollegeId(currentUser?.collegeId || metaData.colleges[0].id);
      }
    } catch (err) {
      console.warn('Backend not detected or offline. Running in Online Demo Mode with local dataset.', err);
      setMeta(DEFAULT_META);
      setSchedule(DEFAULT_SCHEDULE);
      if (DEFAULT_META.departments?.length > 0) {
        setCourseForm(prev => ({ ...prev, departmentId: DEFAULT_META.departments[0].id }));
        setLecturerForm(prev => ({ ...prev, departmentId: DEFAULT_META.departments[0].id }));
      }
      if (DEFAULT_META.colleges?.length > 0 && !selectedDeanCollegeId) {
        setSelectedDeanCollegeId(currentUser?.collegeId || DEFAULT_META.colleges[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auth: Handle Sign In (Username + Password)
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Login failed. Please check username and password.');
      } else {
        localStorage.setItem('timetable_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setActiveRole(data.user.role);
      }
    } catch (err) {
      // Fallback for online static deployment (GitHub Pages / Vercel)
      console.warn('Backend offline, using client-side auth for online demo mode:', err);
      const lower = username.toLowerCase().trim();
      let demoRole = 'STUDENT';
      let demoName = 'Demo User';
      let demoCollege = DEFAULT_META?.colleges?.[0];

      if (lower.includes('superadmin') || lower.includes('worku')) {
        demoRole = 'SUPER_ADMIN'; demoName = 'Dr. Worku (Super Admin)';
      } else if (lower.includes('dean') || lower.includes('kassa')) {
        demoRole = 'DEAN'; demoName = 'Dr. Kassa (Dean CoET)';
      } else if (lower.includes('cs') || lower.includes('abebe')) {
        demoRole = 'DEPT_HEAD'; demoName = 'Dr. Abebe (CS Dept Head)';
      } else if (lower.includes('registrar') || lower.includes('getachew')) {
        demoRole = 'REGISTRAR'; demoName = 'Ato Getachew (Registrar)';
      } else if (lower.includes('service') || lower.includes('bekele')) {
        demoRole = 'GENERAL_SERVICE'; demoName = 'Ato Bekele (General Services)';
      } else if (lower.includes('usher') || lower.includes('tadesse')) {
        demoRole = 'CLASSROOM_USHER'; demoName = 'Ato Tadesse (Classroom Usher)';
      } else if (lower.includes('instructor') || lower.includes('tigist')) {
        demoRole = 'INSTRUCTOR'; demoName = 'Dr. Tigist (Faculty)';
      } else if (lower.includes('lab')) {
        demoRole = 'LAB_COORDINATOR'; demoName = 'Lab Coordinator';
      }

      const mockUser = {
        id: 'demo-' + Date.now(),
        name: demoName,
        username: lower,
        role: demoRole,
        collegeId: demoCollege?.id,
        college: demoCollege
      };
      localStorage.setItem('timetable_user', JSON.stringify(mockUser));
      setCurrentUser(mockUser);
      setActiveRole(mockUser.role);
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Handle Sign Up (Register then auto-login)
  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          username,
          password,
          role: signupRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Signup failed.');
      } else {
        localStorage.setItem('timetable_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setActiveRole(data.user.role);
      }
    } catch (err) {
      // Offline / GitHub Pages fallback
      const mockUser = {
        id: 'demo-' + Date.now(),
        name: signupName || username,
        username,
        role: signupRole || 'STUDENT',
        collegeId: DEFAULT_META?.colleges?.[0]?.id,
        college: DEFAULT_META?.colleges?.[0]
      };
      localStorage.setItem('timetable_user', JSON.stringify(mockUser));
      setCurrentUser(mockUser);
      setActiveRole(mockUser.role);
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Demo Account Helper
  const fillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
    setAuthError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('timetable_user');
    setCurrentUser(null);
    setPassword('');
    setUsername('');
    setIsSignUp(false);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerationResult(null);
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programType })
      });
      const data = await res.json();
      setGenerationResult(data);
      const schedRes = await fetch(`/api/schedule?programType=${programType}`);
      setSchedule(await schedRes.json());
    } catch (err) {
      console.error('Error generating schedule:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Clear unlocked ${programType} schedule slots?`)) return;
    try {
      await fetch(`/api/schedule/clear?programType=${programType}`, { method: 'DELETE' });
      const schedRes = await fetch(`/api/schedule?programType=${programType}`);
      setSchedule(await schedRes.json());
      setGenerationResult(null);
    } catch (err) {
      console.error('Error clearing:', err);
    }
  };

  // Workflow Handlers
  const submitDeanRequest = async (e) => {
    e.preventDefault();
    try {
      const targetCollegeId = selectedDeanCollegeId || currentUser.collegeId || meta?.colleges?.[0]?.id;
      const collegeDepts = meta?.departments?.filter(d => d.collegeId === targetCollegeId) || [];
      
      const deptBatches = collegeDepts.map(d => {
        const batchCount = deanForm.customBatches?.[d.id] !== undefined
          ? parseInt(deanForm.customBatches[d.id])
          : (d.sections?.length || 2);
        return {
          departmentId: d.id,
          departmentName: d.name,
          code: d.code,
          batchCount
        };
      });

      const totalBatches = deptBatches.reduce((sum, d) => sum + d.batchCount, 0);

      const res = await fetch('/api/dean/request-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeId: targetCollegeId,
          programType,
          requestedRoomsCount: parseInt(deanForm.requestedRoomsCount),
          totalStudents: parseInt(deanForm.totalStudents) || 0,
          totalBatches,
          departmentBatches: deptBatches,
          remarks: deanForm.remarks
        })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Lecture classroom request for ${totalBatches} department batches submitted to General Services successfully!` });
        setDeanModal(false);
        fetchData();
      } else {
        const errData = await res.json();
        setActionMessage({ type: 'error', text: errData.error || 'Failed to submit request.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const openGeneralServiceReview = (req) => {
    setReviewRequestModal(req);
    // General Services ONLY allocates standard lecture blocks (no labs)
    const isExt = req.programType === 'EXTENSION';
    const defaultBlocks = isExt ? ['Block 70 (Extension)'] : ['Block 42', 'Block 43'];
    const existingBlocks = Array.isArray(req.allocatedBlocks) && req.allocatedBlocks.length > 0
      ? req.allocatedBlocks.filter(b => b !== 'Tech Complex' && b !== 'Science Block')
      : defaultBlocks;
    setReviewBlocks(existingBlocks);
    setReviewRemarks(req.remarks || `Allocated lecture blocks: ${existingBlocks.join(', ')} for ${req.college?.name} (${req.programType})`);
  };

  const submitGeneralServiceReview = async (status) => {
    if (!reviewRequestModal) return;
    try {
      const res = await fetch(`/api/general-service/block-request/${reviewRequestModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          allocatedBlocks: status === 'APPROVED' ? reviewBlocks : [],
          remarks: reviewRemarks || (status === 'APPROVED' ? `Blocks allocated: ${reviewBlocks.join(', ')}` : 'Request declined.')
        })
      });
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: status === 'APPROVED'
            ? `Successfully approved and allocated blocks to ${reviewRequestModal.college?.name}!`
            : `Request from ${reviewRequestModal.college?.name} has been declined.`
        });
        setReviewRequestModal(null);
        fetchData();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Failed to update request.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const res = await fetch(`/api/general-service/block-request/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          allocatedBlocks: [],
          remarks: 'Request declined by General Services.'
        })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Request declined successfully.' });
        fetchData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeanAssignRoom = async (roomId, departmentId) => {
    try {
      const res = await fetch(`/api/dean/allocate-room/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: departmentId || null,
          collegeId: selectedDeanCollegeId || currentUser.collegeId || meta?.colleges?.[0]?.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error || 'Failed to assign room to department.' });
      } else {
        const deptName = data.allocatedDept?.name || 'Shared College Pool (የጋራ የኮሌጅ ክፍል)';
        setActionMessage({ type: 'success', text: `Room ${data.roomNumber} assigned to: ${deptName}` });
        fetchData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeanAutoDistribute = async () => {
    try {
      const targetCollegeId = selectedDeanCollegeId || currentUser?.collegeId || meta?.colleges?.[0]?.id;
      const depts = meta?.departments?.filter(d => d.collegeId === targetCollegeId) || [];
      const rooms = meta?.rooms?.filter(r => r.allocatedCollegeId === targetCollegeId && (
        programType === 'REGULAR' ? r.programType !== 'EXTENSION' : r.programType === 'EXTENSION'
      )) || [];

      if (rooms.length === 0 || depts.length === 0) {
        setActionMessage({ type: 'error', text: 'No rooms or departments found to distribute.' });
        return;
      }

      const cs = depts.find(d => d.code === 'CS');
      const se = depts.find(d => d.code === 'SE');
      const it = depts.find(d => d.code === 'IT');
      const isDept = depts.find(d => d.code === 'IS');
      const ece = depts.find(d => d.code === 'ECE');

      const allocations = [];
      if (programType === 'REGULAR') {
        rooms.forEach(r => {
          if (r.roomNumber === 'B42-101' && cs) allocations.push({ roomId: r.id, departmentId: cs.id });
          else if (r.roomNumber === 'B42-102' && cs) allocations.push({ roomId: r.id, departmentId: cs.id });
          else if (r.roomNumber === 'B42-201' && se) allocations.push({ roomId: r.id, departmentId: se.id });
          else if (r.roomNumber === 'B42-202' && it) allocations.push({ roomId: r.id, departmentId: it.id });
          else if (r.roomNumber === 'B43-101' && isDept) allocations.push({ roomId: r.id, departmentId: isDept.id });
          else if (r.roomNumber === 'B43-102' && ece) allocations.push({ roomId: r.id, departmentId: ece.id });
          else {
            allocations.push({ roomId: r.id, departmentId: depts[allocations.length % depts.length].id });
          }
        });
      } else {
        rooms.forEach(r => {
          if (r.roomNumber === 'EXT-101' && cs) allocations.push({ roomId: r.id, departmentId: cs.id });
          else if (r.roomNumber === 'EXT-201' && cs) allocations.push({ roomId: r.id, departmentId: cs.id });
          else if (r.roomNumber === 'EXT-102' && it) allocations.push({ roomId: r.id, departmentId: it.id });
          else if (r.roomNumber === 'EXT-202' && isDept) allocations.push({ roomId: r.id, departmentId: isDept.id });
          else {
            allocations.push({ roomId: r.id, departmentId: depts[allocations.length % depts.length].id });
          }
        });
      }

      const res = await fetch('/api/dean/batch-allocate-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Successfully distributed ${allocations.length} classrooms to departments (CS, SE, IT, IS, ECE)!` });
        fetchData();
      } else {
        const d = await res.json();
        setActionMessage({ type: 'error', text: d.error || 'Failed to auto-distribute rooms.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDirectCollegeAllocation = async (roomId, collegeId) => {
    try {
      const res = await fetch('/api/general-service/allocate-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeId: collegeId || null,
          roomIds: [roomId],
          action: collegeId ? 'ALLOCATE' : 'UNALLOCATE'
        })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Room college allocation updated!' });
        fetchData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDirectBlockAllocation = async (building, collegeId) => {
    if (!collegeId) return;
    try {
      const res = await fetch('/api/general-service/allocate-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building, collegeId })
      });
      if (res.ok) {
        const collegeName = meta?.colleges?.find(c => c.id === collegeId)?.name || 'College';
        setActionMessage({ type: 'success', text: `Block ${building} successfully allocated to ${collegeName}!` });
        fetchData();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Failed to allocate block.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDirectBlockRelease = async (building) => {
    try {
      const res = await fetch('/api/general-service/release-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Block ${building} released back to Free / Available pool!` });
        fetchData();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Failed to release block.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const submitDeptCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/dept-head/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseForm)
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Course ${courseForm.code} added successfully!` });
        setDeptCourseModal(false);
        fetchData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const submitDeptLecturer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/dept-head/instructor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lecturerForm)
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Lecturer ${lecturerForm.name} added successfully!` });
        setDeptLecturerModal(false);
        fetchData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const submitDeptAssign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/dept-head/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error });
      } else {
        setActionMessage({ type: 'success', text: 'Lecturer assigned within allowable credit hours!' });
        setDeptAssignModal(false);
        fetchData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const submitFreshmanCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/registrar/freshman-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freshmanForm)
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Freshman course ${freshmanForm.code} added successfully!` });
        setFreshmanModal(false);
        fetchData();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const toggleUsherDoor = async (slotId) => {
    try {
      await fetch(`/api/usher/slot/${slotId}/toggle-lock`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      console.error('Error toggling door:', err);
    }
  };

  // ========================================================
  // VIEW 1: CLEAN & FOCUSED LOGIN / SIGNUP (USERNAME & PASSWORD ONLY)
  // ========================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center bg-indigo-600 p-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 mb-3">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">University Timetable System</h1>
            <p className="text-xs text-slate-400 mt-1">
              {isSignUp ? 'Enter a username and password to create an account' : 'Enter your username and password to log in'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl shadow-black/60">
            
            {/* Top Toggle Buttons: Login vs Sign Up */}
            <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setAuthError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  !isSignUp
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="h-4 w-4" /> Login (ግባ)
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setAuthError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  isSignUp
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="h-4 w-4" /> Sign Up (ተመዝገብ)
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-medium flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {!isSignUp ? (
              /* ================= LOGIN FORM (USERNAME & PASSWORD ONLY) ================= */
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Username (የተጠቃሚ ስም)
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Password (የይለፍ ቃል)
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  {authLoading ? 'Signing in...' : 'Login (ግባ)'}
                </button>

                <div className="text-center pt-3 border-t border-slate-800 text-xs text-slate-400">
                  New user?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setAuthError(null); }}
                    className="text-indigo-400 font-bold hover:text-indigo-300 underline underline-offset-4"
                  >
                    Sign Up here (አዲስ ከሆኑ ይመዝገቡ)
                  </button>
                </div>
              </form>
            ) : (
              /* ================= SIGNUP FORM (USERNAME & PASSWORD ONLY) ================= */
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Choose Username (የተጠቃሚ ስም)
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Password (የይለፍ ቃል)
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {authLoading ? 'Creating account...' : 'Sign Up (ተመዝገብ)'}
                </button>

                <div className="text-center pt-3 border-t border-slate-800 text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setAuthError(null); }}
                    className="text-indigo-400 font-bold hover:text-indigo-300 underline underline-offset-4"
                  >
                    Login (ከዚህ በፊት የተመዘገቡ ከሆኑ ይግቡ)
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="text-center text-[11px] text-slate-600 mt-6">
            University Academic Timetable System • Version 2.0
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW 2: AUTHENTICATED DASHBOARD (ONLY REACHED AFTER LOGIN)
  // ========================================================
  const regularDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const extensionDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const activeDays = programType === 'REGULAR' ? regularDays : extensionDays;
  const periods = programType === 'REGULAR' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];

  const filteredSchedule = schedule.filter(slot => {
    if (activeRole === 'STUDENT' && selectedSection !== 'ALL' && slot.sectionId !== selectedSection) return false;
    if (activeRole === 'INSTRUCTOR' && selectedInstructor !== 'ALL' && slot.instructorId !== selectedInstructor) return false;
    if (selectedSection !== 'ALL' && slot.sectionId !== selectedSection) return false;
    if (selectedInstructor !== 'ALL' && slot.instructorId !== selectedInstructor) return false;
    if (selectedRoom !== 'ALL' && slot.roomId !== selectedRoom) return false;
    return true;
  });

  const getSlot = (day, period) => {
    return filteredSchedule.find(
      s => s.timeSlot?.dayOfWeek === day && s.timeSlot?.periodNumber === period
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-inner">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">University Timetable System</h1>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {currentUser.role?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Conflict-Free Academic Scheduling (Regular & Extension)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Program Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setProgramType('REGULAR')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  programType === 'REGULAR'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ☀️ Regular
              </button>
              <button
                onClick={() => setProgramType('EXTENSION')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  programType === 'EXTENSION'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌙 Extension
              </button>
            </div>

            {/* Role View Switcher */}
            {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'GENERAL_SERVICE' || currentUser.role === 'DEAN' || currentUser.role === 'LAB_COORDINATOR') && (
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Switch Role:</span>
                <select
                  value={activeRole}
                  onChange={(e) => {
                    setActiveRole(e.target.value);
                    setSelectedSection('ALL');
                    setSelectedInstructor('ALL');
                    setSelectedRoom('ALL');
                  }}
                  className="bg-slate-900 text-indigo-300 text-xs font-semibold border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="GENERAL_SERVICE">🏢 General Services (አጠቃላይ አገልግሎት)</option>
                  <option value="DEAN">🎓 Dean (የኮሌጅ ዲን)</option>
                  <option value="LAB_COORDINATOR">🔬 Lab Coordinator (የላብራቶሪ አስተባባሪ)</option>
                  <option value="SUPER_ADMIN">👑 Super Admin</option>
                  <option value="DEPT_HEAD">🏛️ Dept Head</option>
                  <option value="REGISTRAR">📋 Registrar</option>
                  <option value="CLASSROOM_USHER">🔑 Classroom Usher</option>
                  <option value="INSTRUCTOR">👨‍🏫 Instructor</option>
                  <option value="STUDENT">🧑‍🎓 Student</option>
                </select>
              </div>
            )}

            {/* User Pill + Logout Button */}
            <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-1.5 py-1 rounded-xl border border-slate-700">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-200 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-indigo-400">@{currentUser.username || currentUser.email}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out (ውጣ)"
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-900/60 hover:text-rose-300 text-slate-300 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {actionMessage && (
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {actionMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
              <span className="text-sm font-semibold">{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline opacity-80 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* ===================== WORKSPACE: DEAN ===================== */}
        {activeRole === 'DEAN' && (() => {
          const currentCollege = meta?.colleges?.find(c => c.id === selectedDeanCollegeId) || meta?.colleges?.[0];
          const collegeDepartments = meta?.departments?.filter(d => d.collegeId === currentCollege?.id) || [];
          // Filter college rooms & requests strictly by programType (☀️ Regular vs 🌙 Extension)
          const collegeRooms = meta?.rooms?.filter(r => r.allocatedCollegeId === currentCollege?.id && (
            programType === 'REGULAR' ? r.programType !== 'EXTENSION' : r.programType === 'EXTENSION'
          )) || [];
          const collegeRequests = meta?.blockRequests?.filter(br => br.collegeId === currentCollege?.id && br.programType === programType) || [];

          // Department room counts
          const deptRoomCounts = {};
          collegeDepartments.forEach(d => { deptRoomCounts[d.id] = 0; });
          let sharedPoolCount = 0;
          collegeRooms.forEach(r => {
            if (r.allocatedDeptId && deptRoomCounts[r.allocatedDeptId] !== undefined) {
              deptRoomCounts[r.allocatedDeptId]++;
            } else {
              sharedPoolCount++;
            }
          });

          return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        Office of the Dean — {currentCollege?.name || 'College of Engineering & Technology'}
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {currentCollege?.code || 'COET'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dean: <strong>{currentCollege?.deanName || 'Dr. Kassa Belay'}</strong> • Coordinates departments, submits space requests to General Services, and distributes college rooms.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {meta?.colleges?.length > 1 && (
                    <select
                      value={selectedDeanCollegeId}
                      onChange={(e) => setSelectedDeanCollegeId(e.target.value)}
                      className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none"
                    >
                      {meta.colleges.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => openDeanRequestModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition"
                  >
                    <Send className="h-4 w-4" /> Request Classrooms from General Services (ክፍል ጠይቅ)
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Departments in College</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{collegeDepartments.length} Departments</span>
                  <span className="text-[10px] text-slate-400">CS, SE, IT, IS, ECE</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Active Student Batches</span>
                  <span className="text-xl font-bold text-indigo-600 mt-1 block">
                    {collegeDepartments.reduce((sum, d) => sum + (d.sections?.length || 2), 0)} Batches
                  </span>
                  <span className="text-[10px] text-slate-400">Across all 5 departments</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Lecture Rooms Granted</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">
                    {collegeRooms.filter(r => r.roomType === 'LECTURE_HALL' || r.roomType === 'STANDARD_CLASSROOM').length} Rooms
                  </span>
                  <span className="text-[10px] text-slate-400">By General Services</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Shared College Pool</span>
                  <span className="text-xl font-bold text-amber-600 mt-1 block">{sharedPoolCount} Rooms</span>
                  <span className="text-[10px] text-slate-400">Not restricted to single dept</span>
                </div>
              </div>

              {/* STEP 1: Space Requests to General Services */}
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-indigo-600" />
                      1. Lecture Classroom Requests to General Services (ለአጠቃላይ አገልግሎት የቀረቡ የመማሪያ ክፍል ጥያቄዎች)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      The Dean specifies how many student batches each of the {collegeDepartments.length} departments has to request lecture classrooms. (Labs are managed separately by the Lab Coordinator).
                    </p>
                  </div>
                  <button
                    onClick={() => openDeanRequestModal()}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> አዲስ የክፍል ጥያቄ ላክ
                  </button>
                </div>

                {collegeRequests.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                    No space requests yet. Click "Request Classrooms from General Services" above!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {collegeRequests.map(req => {
                      const reqBatches = safeParseBatches(req.departmentBatches, req.collegeId);
                      const totalBatches = req.totalBatches || reqBatches.reduce((s, b) => s + b.batchCount, 0);
                      return (
                        <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs text-slate-900">{req.college?.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 font-semibold">
                              Need: <strong>{req.requestedRoomsCount} Lecture Classrooms</strong> for <strong>{totalBatches} Batches</strong> across {reqBatches.length} Departments
                            </p>
                            {/* Department Batches Pills */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {reqBatches.map((db, idx) => (
                                <span key={idx} className="text-[10px] bg-indigo-50/80 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-100">
                                  {db.code || db.departmentName}: <strong>{db.batchCount} batches</strong>
                                </span>
                              ))}
                            </div>
                            {req.allocatedBlocks && (
                              <p className="text-xs text-indigo-700 font-semibold mt-2 flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                Assigned Lecture Blocks: {Array.isArray(req.allocatedBlocks) ? req.allocatedBlocks.join(', ') : req.allocatedBlocks}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-1.5 italic">
                            "{req.remarks || 'No remarks provided'}"
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 2: Distribute College Classrooms to Departments */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      2. Department Classroom Allocations & Distribution (የዲፓርትመንቶች የመማሪያ ክፍል ድልድል)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      General Services granted lecture rooms to <strong>{currentCollege?.name}</strong>. Here is the clear ownership dashboard showing which block and room belongs to each department.
                    </p>
                  </div>
                  <button
                    onClick={handleDeanAutoDistribute}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
                  >
                    <Sparkles className="h-4 w-4" /> ⚡ Auto-Distribute to All Departments (በራስ-ሰር ለሁሉም ዲፓርትመንት መድብ)
                  </button>
                </div>

                {/* Authority Reminder Alert */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>የዲን ስልጣንና ኃላፊነት (Dean's Authority):</strong> አጠቃላይ አገልግሎት ክፍሎቹን የመደበው ለኮሌጁ በሙሉ ነው። ከታች ባለው ዳሽቦርድ ላይ ለእያንዳንዱ ዲፓርትመንት (CS, SE, IT, IS, ECE) የተመደበው ብሎክና ክፍል (ለምሳሌ፡ ለ CS ➔ Block 42 ክፍሎች B42-101 እና B42-102) በግልጽ ተለይቶ ይታያል።
                  </div>
                </div>

                {/* DEPARTMENT ALLOCATION DASHBOARD CARDS (FOR ALL DEPARTMENTS) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      Department Classroom Ownership Dashboard (ለእያንዳንዱ ዲፓርትመንት የተመደቡ ብሎኮች እና ክፍሎች):
                    </span>
                    <span className="text-xs text-slate-400">
                      {collegeDepartments.length} Departments in {currentCollege?.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {collegeDepartments.map(dept => {
                      const deptRooms = collegeRooms.filter(r => r.allocatedDeptId === dept.id);
                      const deptCapacity = deptRooms.reduce((sum, r) => sum + r.capacity, 0);
                      const deptBlocks = [...new Set(deptRooms.map(r => r.building))];
                      const batchCount = dept.sections?.length || 2;

                      return (
                        <div
                          key={dept.id}
                          className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                            deptRooms.length > 0
                              ? 'bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border-indigo-200 shadow-2xs hover:border-indigo-300'
                              : 'bg-amber-50/20 border-dashed border-amber-200'
                          }`}
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                  <Briefcase className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                  {dept.name}
                                </h4>
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">
                                  {dept.code} Department
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                deptRooms.length > 0
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {deptRooms.length > 0 ? `🟢 ${deptRooms.length} Rooms Assigned` : '⚠️ No Rooms Assigned'}
                              </span>
                            </div>

                            {/* Batch Demand Info */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2.5">
                              <span>Active Demand: <strong>{batchCount} Student Batches</strong></span>
                              <span>Total Seats: <strong>{deptCapacity} Seats</strong></span>
                            </div>

                            {/* Assigned Blocks and Rooms Badges */}
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                Assigned Blocks & Classrooms:
                              </span>
                              {deptRooms.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {deptBlocks.map(blockName => {
                                    const roomsInBlock = deptRooms.filter(r => r.building === blockName);
                                    return (
                                      <div key={blockName} className="p-2 bg-white rounded-xl border border-indigo-100 flex flex-col gap-1">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-indigo-900">
                                          <span className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3 text-indigo-600" />
                                            {blockName}
                                          </span>
                                          <span className="text-slate-500 font-semibold">{roomsInBlock.length} room(s)</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {roomsInBlock.map(r => (
                                            <span
                                              key={r.id}
                                              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center gap-1 shadow-2xs"
                                            >
                                              🚪 {r.roomNumber} ({r.capacity} seats)
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-2.5 text-center text-[11px] text-amber-700 bg-amber-50 rounded-xl border border-dashed border-amber-200">
                                  No classrooms assigned yet. Select a room in the table below or click "Auto-Distribute".
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Status: {deptRooms.length >= 1 ? '✅ Ready for Scheduling' : '⏳ Needs Space'}</span>
                            <span className="font-semibold text-indigo-600">Dean Allocated</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Shared College Pool Card */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-slate-600" />
                              Shared College Pool (የጋራ የኮሌጅ ክፍል)
                            </h4>
                            <span className="text-[10px] text-slate-500">Open for all departments</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sharedPoolCount > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {sharedPoolCount} Rooms
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Rooms in the Shared Pool are not restricted to any single department and can be used by any department as overflow lecture space.
                        </p>
                        {sharedPoolCount > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {collegeRooms.filter(r => !r.allocatedDeptId).map(r => (
                              <span key={r.id} className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                                🚪 {r.roomNumber} ({r.building} • {r.capacity} seats)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">All rooms are currently allocated directly to departments.</p>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                        Managed by Dean
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rooms Assignment Table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Individual Room Management & Reassignment Table:
                    </span>
                    <span className="text-xs text-slate-400">{collegeRooms.length} rooms total</span>
                  </div>

                  {collegeRooms.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      No rooms are currently allocated to this college by General Services. Submit a request above first!
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3.5">Room #</th>
                            <th className="p-3.5">Building Block</th>
                            <th className="p-3.5">Capacity</th>
                            <th className="p-3.5">Room Type</th>
                            <th className="p-3.5">Assigned Department (Owner)</th>
                            <th className="p-3.5 text-right">Dean Action (ለዲፓርትመንት መድብ)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {collegeRooms.map(room => (
                            <tr key={room.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                                <DoorOpen className="h-4 w-4 text-indigo-600" />
                                {room.roomNumber}
                              </td>
                              <td className="p-3.5 font-semibold text-slate-700 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                {room.building}
                              </td>
                              <td className="p-3.5 text-slate-700 font-semibold">{room.capacity} seats</td>
                              <td className="p-3.5">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  {room.roomType?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3.5">
                                {room.allocatedDept ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                                    {room.allocatedDept.name} ({room.allocatedDept.code})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                                    🏢 Shared College Pool (የጋራ የኮሌጅ ክፍል)
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                <select
                                  value={room.allocatedDeptId || ''}
                                  onChange={(e) => handleDeanAssignRoom(room.id, e.target.value)}
                                  className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                  <option value="">🏢 Shared Pool (የጋራ የኮሌጅ ክፍል)</option>
                                  {collegeDepartments.map(dept => (
                                    <option key={dept.id} value={dept.id}>
                                      Assign to: {dept.name} ({dept.code})
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Summary Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Department Allocation Summary:</span>
                  {collegeDepartments.map(dept => (
                    <div key={dept.id} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-900 px-3 py-1 rounded-xl text-xs font-semibold">
                      <span>{dept.code}:</span>
                      <span className="font-bold text-indigo-700">{deptRoomCounts[dept.id] || 0} rooms</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-xl text-xs font-semibold">
                    <span>Shared Pool:</span>
                    <span className="font-bold text-slate-900">{sharedPoolCount} rooms</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===================== WORKSPACE: GENERAL SERVICES ===================== */}
        {activeRole === 'GENERAL_SERVICE' && (() => {
          const allRooms = meta?.rooms || [];
          const allColleges = meta?.colleges || [];
          const allRequests = meta?.blockRequests || [];

          // Only lecture rooms for General Services (excluding labs)
          const allLectureRooms = allRooms.filter(r => r.roomType === 'LECTURE_HALL' || r.roomType === 'STANDARD_CLASSROOM');

          // STRICT FILTER BY PROGRAM TYPE (☀️ REGULAR vs 🌙 EXTENSION)
          // Controlled by top navbar toggle or inside-tab program switchers
          const lectureRooms = allLectureRooms.filter(r => {
            if (programType === 'REGULAR') return r.programType !== 'EXTENSION';
            return r.programType === 'EXTENSION';
          });

          // Requests strictly filtered by programType
          const currentRequests = allRequests.filter(req => req.programType === programType);

          const buildingsMap = {};
          lectureRooms.forEach(r => {
            if (!buildingsMap[r.building]) {
              buildingsMap[r.building] = { name: r.building, rooms: [], totalCapacity: 0 };
            }
            buildingsMap[r.building].rooms.push(r);
            buildingsMap[r.building].totalCapacity += r.capacity;
          });
          const buildingsList = Object.values(buildingsMap);

          const allFreeBlocks = buildingsList.filter(b => b.rooms.every(r => !r.allocatedCollegeId));
          const allAllocatedBlocks = buildingsList.filter(b => b.rooms.some(r => r.allocatedCollegeId));

          const allocatedLectureCount = lectureRooms.filter(r => r.allocatedCollegeId).length;
          const unallocatedLectureCount = lectureRooms.filter(r => !r.allocatedCollegeId).length;

          return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        General Services & Campus Facilities Directorate (አጠቃላይ አገልግሎት ዳይሬክቶሬት)
                      </h2>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        programType === 'REGULAR'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-purple-50 text-purple-900 border-purple-300'
                      }`}>
                        {programType === 'REGULAR' ? '☀️ REGULAR PROGRAM' : '🌙 EXTENSION PROGRAM'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Reviews lecture classroom requests from College Deans and assigns university building blocks.
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
                  <button
                    onClick={() => setGeneralServiceTab('FREE_BLOCKS')}
                    className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      generalServiceTab === 'FREE_BLOCKS'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    🟢 Free Blocks ({allFreeBlocks.length})
                  </button>
                  <button
                    onClick={() => setGeneralServiceTab('ASSIGNED_BLOCKS')}
                    className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      generalServiceTab === 'ASSIGNED_BLOCKS'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    🏛️ Assigned Blocks ({allAllocatedBlocks.length})
                  </button>
                  <button
                    onClick={() => setGeneralServiceTab('REQUESTS')}
                    className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      generalServiceTab === 'REQUESTS'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    📋 Dean Requests ({currentRequests.length})
                  </button>
                  <button
                    onClick={() => setGeneralServiceTab('INVENTORY')}
                    className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      generalServiceTab === 'INVENTORY'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    🚪 Room Inventory ({lectureRooms.length})
                  </button>
                </div>
              </div>

              {/* CRUCIAL POLICY RULE ALERT BANNER */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-950 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-900 mb-0.5">
                    📌 የዩኒቨርሲቲው የአሰራር ደንብ (General Services Scope & Role Separation):
                  </h4>
                  <p className="text-indigo-800 leading-relaxed mb-1">
                    1. <strong>አጠቃላይ አገልግሎት (General Services)</strong> የመማሪያ ክፍሎችንና ብሎኮችን የሚመድበው <strong>ለኮሌጁ (College) በሙሉ</strong> ብቻ ነው፤ ለግል ዲፓርትመንት አይመድብም። ክፍሎቹን ለየዲፓርትመንቶቹ የሚያከፋፍሉት የየኮሌጁ <strong>ዲን (Dean)</strong> ናቸው።
                  </p>
                  <p className="text-indigo-800 leading-relaxed mb-1">
                    2. <strong>አጠቃላይ አገልግሎት መደበኛ የመማሪያ አዳራሾችንና ክፍሎችን (Lecture Classrooms) ብቻ ይመድባል</strong>፤ የላብራቶሪ ክፍሎችን (Computer Labs & Science Labs) አይመድብም (ላቦች የሚመደቡት በ <strong>Lab Coordinator / የላብራቶሪ አስተባባሪ</strong> ነው)!
                  </p>
                  <p className="text-indigo-800 leading-relaxed">
                    3. <strong>ዲኖች (Deans)</strong> የሚያሳውቁት በእያንዳንዱ ዲፓርትመንት ስር ያሉትን <strong>የባች ብዛት (Department Batches)</strong> ብቻ ነው፤ የትኛውን ብሎክ መስጠት እንዳለበት የሚወስነው <strong>አጠቃላይ አገልግሎት (General Services)</strong> ባለው ነፃ ብሎክ መሰረት ነው።
                  </p>
                </div>
              </div>

              {/* Campus Inventory Stats for active programType */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {programType === 'REGULAR' ? '☀️ Regular' : '🌙 Extension'} Classrooms
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{lectureRooms.length} Rooms</span>
                  <span className="text-[10px] text-slate-400">{programType} Program</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Lecture Seat Capacity</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">
                    {lectureRooms.reduce((sum, r) => sum + r.capacity, 0)} Seats
                  </span>
                  <span className="text-[10px] text-slate-400">Total {programType} Capacity</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Allocated to Colleges</span>
                  <span className="text-xl font-bold text-indigo-600 mt-1 block">{allocatedLectureCount} Rooms</span>
                  <span className="text-[10px] text-slate-400">Granted {programType} Rooms</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Available / Free</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">{unallocatedLectureCount} Rooms</span>
                  <span className="text-[10px] text-slate-400">Ready for {programType} allocation</span>
                </div>
              </div>

              {/* TAB 1: ONLY FREE AVAILABLE BLOCKS */}
              {generalServiceTab === 'FREE_BLOCKS' && (() => {
                const filteredFree = allFreeBlocks;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          🟢 Free / Available Academic Blocks (ነፃ የሆኑ ብሎኮች — ለመመደብ ዝግጁ)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Showing free blocks for: <strong>{programType === 'REGULAR' ? '☀️ Regular Program' : '🌙 Extension Program'}</strong>
                        </p>
                      </div>

                      {/* Program Switcher synced with top navbar toggle */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          onClick={() => setProgramType('REGULAR')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'REGULAR' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ☀️ Regular Free Blocks
                        </button>
                        <button
                          onClick={() => setProgramType('EXTENSION')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'EXTENSION' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🌙 Extension Free Blocks
                        </button>
                      </div>
                    </div>

                    {filteredFree.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        No free blocks found for {programType} program.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredFree.map(block => {
                          const isExtension = block.name.includes('Extension') || block.rooms.some(r => r.programType === 'EXTENSION');

                          return (
                            <div key={block.name} className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/30 flex flex-col justify-between shadow-xs hover:border-emerald-400 transition">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 font-bold">
                                      <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-base text-slate-900">{block.name}</h4>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          🟢 Free / Ready to Allocate
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          isExtension
                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}>
                                          {isExtension ? '🌙 Extension Block' : '☀️ Regular Block'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-bold text-slate-900 block">{block.rooms.length} Classrooms</span>
                                    <span className="text-[11px] text-slate-500 font-semibold">{block.totalCapacity} Total Seats</span>
                                  </div>
                                </div>

                                {/* Room Badges */}
                                <div className="flex flex-wrap gap-1.5 my-3">
                                  {block.rooms.map(r => (
                                    <span key={r.id} className="text-xs font-mono font-semibold px-2 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 shadow-2xs">
                                      🚪 {r.roomNumber} ({r.capacity} seats • {r.roomType === 'LECTURE_HALL' ? 'Lecture Hall' : 'Classroom'})
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Quick Allocation Action Bar */}
                              <div className="pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700">Assign this free block to:</span>
                                <div className="flex items-center gap-2">
                                  <select
                                    id={`assign-select-${block.name}`}
                                    className="text-xs font-semibold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                    defaultValue={allColleges[0]?.id || ''}
                                  >
                                    {allColleges.map(c => (
                                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      const sel = document.getElementById(`assign-select-${block.name}`);
                                      if (sel && sel.value) {
                                        handleDirectBlockAllocation(block.name, sel.value);
                                      }
                                    }}
                                    className="text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Allocate Block (መድብ)
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 2: ONLY ASSIGNED BLOCKS */}
              {generalServiceTab === 'ASSIGNED_BLOCKS' && (() => {
                const filteredAllocated = allAllocatedBlocks;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-indigo-600" />
                          🏛️ Allocated Campus Blocks (ለኮሌጆች የተመደቡ ብሎኮች)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Showing assigned blocks for: <strong>{programType === 'REGULAR' ? '☀️ Regular Program' : '🌙 Extension Program'}</strong>
                        </p>
                      </div>

                      {/* Program Switcher synced with top navbar toggle */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          onClick={() => setProgramType('REGULAR')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'REGULAR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ☀️ Regular Assigned Blocks
                        </button>
                        <button
                          onClick={() => setProgramType('EXTENSION')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'EXTENSION' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🌙 Extension Assigned Blocks
                        </button>
                      </div>
                    </div>

                    {filteredAllocated.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        No assigned blocks found for {programType} program.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredAllocated.map(block => {
                          const firstAllocatedRoom = block.rooms.find(r => r.allocatedCollege);
                          const collegeName = firstAllocatedRoom?.allocatedCollege?.name || 'Allocated College';
                          const collegeCode = firstAllocatedRoom?.allocatedCollege?.code || 'COLLEGE';
                          const isExtension = block.name.includes('Extension') || block.rooms.some(r => r.programType === 'EXTENSION');

                          return (
                            <div key={block.name} className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 flex flex-col justify-between shadow-xs hover:border-indigo-300 transition">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-700 font-bold">
                                      <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-base text-slate-900">{block.name}</h4>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200 inline-flex items-center gap-1">
                                          🏛️ Assigned to: {collegeName} ({collegeCode})
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          isExtension
                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}>
                                          {isExtension ? '🌙 Extension Block' : '☀️ Regular Block'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-bold text-slate-900 block">{block.rooms.length} Classrooms</span>
                                    <span className="text-[11px] text-slate-500 font-semibold">{block.totalCapacity} Total Seats</span>
                                  </div>
                                </div>

                                {/* Room Badges */}
                                <div className="flex flex-wrap gap-1.5 my-3">
                                  {block.rooms.map(r => (
                                    <span key={r.id} className="text-xs font-mono font-semibold px-2 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                                      🚪 {r.roomNumber} ({r.capacity} seats • {r.allocatedDept ? `Assigned to ${r.allocatedDept.code}` : 'Managed by Dean'})
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Release Block Button */}
                              <div className="pt-3 border-t border-indigo-200/60 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                  Managed at college level by <strong>Dean of {collegeCode}</strong>
                                </span>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to release ${block.name} back to the Free pool?`)) {
                                      handleDirectBlockRelease(block.name);
                                    }
                                  }}
                                  className="text-xs font-semibold px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl transition flex items-center gap-1 shadow-2xs"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" /> Release Block (ነፃ አድርግ)
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 3: DEAN REQUESTS */}
              {generalServiceTab === 'REQUESTS' && (() => {
                const filteredRequests = currentRequests;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Incoming Dean Requests — {programType === 'REGULAR' ? '☀️ Regular Program (የመደበኛ ፕሮግራም ጥያቄዎች)' : '🌙 Extension Program (የማታ/ቅዳሜ-እሁድ ጥያቄዎች)'}:
                        </span>
                        <span className="text-xs text-slate-400 ml-2">({filteredRequests.length} requests)</span>
                      </div>

                      {/* Program Switcher synced with top navbar toggle */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          onClick={() => setProgramType('REGULAR')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'REGULAR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ☀️ Regular Requests ({allRequests.filter(r => r.programType === 'REGULAR').length})
                        </button>
                        <button
                          onClick={() => setProgramType('EXTENSION')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'EXTENSION' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🌙 Extension Requests ({allRequests.filter(r => r.programType === 'EXTENSION').length})
                        </button>
                      </div>
                    </div>

                    {filteredRequests.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        No requests found for {programType} program.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredRequests.map(req => {
                          const isPending = req.status === 'PENDING';
                          const reqBatches = safeParseBatches(req.departmentBatches, req.collegeId);
                          const totalBatches = req.totalBatches || reqBatches.reduce((s, b) => s + b.batchCount, 0);

                          return (
                            <div
                              key={req.id}
                              className={`p-5 rounded-2xl border transition flex flex-wrap items-center justify-between gap-4 ${
                                isPending
                                  ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                                  : req.status === 'APPROVED'
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-rose-50/30 border-rose-200'
                              }`}
                            >
                              <div className="flex flex-col gap-1 max-w-xl">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-bold text-sm text-slate-900">{req.college?.name}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    req.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : req.status === 'REJECTED'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {req.status}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    req.programType === 'EXTENSION'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {req.programType === 'EXTENSION' ? '🌙 EXTENSION' : '☀️ REGULAR'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                                  Demand: <strong>{req.requestedRoomsCount} Lecture Classrooms</strong> for <strong>{totalBatches} Batches</strong> across {reqBatches.length} Departments
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {reqBatches.map((db, idx) => (
                                    <span key={idx} className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                      {db.code || db.departmentName}: <strong>{db.batchCount} batches</strong>
                                    </span>
                                  ))}
                                </div>
                                {req.allocatedBlocks && (
                                  <p className="text-xs text-indigo-700 font-semibold flex items-center gap-1.5 mt-1.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Allocated Lecture Blocks to College: {Array.isArray(req.allocatedBlocks) ? req.allocatedBlocks.join(', ') : req.allocatedBlocks}
                                  </p>
                                )}
                                <p className="text-[11px] text-slate-400 italic mt-1">
                                  "{req.remarks || 'No remarks from Dean'}"
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openGeneralServiceReview(req)}
                                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition"
                                >
                                  <Building2 className="h-4 w-4" /> Review & Allocate Free Blocks (መርምር እና ነፃ ብሎክ ፈቅድ)
                                </button>
                                {isPending && (
                                  <button
                                    onClick={() => handleDeclineRequest(req.id)}
                                    className="flex items-center gap-1 text-rose-700 hover:bg-rose-100 text-xs font-semibold px-3 py-2 rounded-xl border border-rose-200 transition"
                                  >
                                    <X className="h-3.5 w-3.5" /> Decline
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 4: CAMPUS REAL ESTATE & ROOM INVENTORY */}
              {generalServiceTab === 'INVENTORY' && (() => {
                const filteredLectureRooms = lectureRooms;

                return (
                  <div className="flex flex-col gap-4">
                    {/* Program Filter & Summary Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Campus Classrooms — {programType === 'REGULAR' ? '☀️ Regular Classrooms' : '🌙 Extension Classrooms'} ({filteredLectureRooms.length} rooms)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          onClick={() => setProgramType('REGULAR')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'REGULAR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ☀️ Regular Rooms ({allLectureRooms.filter(r => r.programType !== 'EXTENSION').length})
                        </button>
                        <button
                          onClick={() => setProgramType('EXTENSION')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                            programType === 'EXTENSION' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🌙 Extension Rooms ({allLectureRooms.filter(r => r.programType === 'EXTENSION').length})
                        </button>
                      </div>
                    </div>

                    {/* Building cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {buildingsList.map(b => {
                        const isExt = b.name.includes('Extension') || b.rooms.some(r => r.programType === 'EXTENSION');
                        return (
                          <div key={b.name} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                  <Building2 className="h-4 w-4 text-indigo-600" />
                                  {b.name}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isExt ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {isExt ? '🌙 Extension' : '☀️ Regular'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Total Capacity: <strong>{b.totalCapacity} seats</strong> ({b.rooms.length} rooms)
                              </p>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap gap-1">
                              {b.rooms.map(r => (
                                <span
                                  key={r.id}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                    r.allocatedCollegeId ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {r.roomNumber}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Room Inventory Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3.5">Room #</th>
                            <th className="p-3.5">Building</th>
                            <th className="p-3.5">Program</th>
                            <th className="p-3.5">Capacity</th>
                            <th className="p-3.5">Type</th>
                            <th className="p-3.5">College Allocation (General Services)</th>
                            <th className="p-3.5">Department Status (Dean)</th>
                            <th className="p-3.5 text-right">Assign/Reassign College</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredLectureRooms.map(room => (
                            <tr key={room.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                                <DoorOpen className="h-4 w-4 text-indigo-600" />
                                {room.roomNumber}
                              </td>
                              <td className="p-3.5 text-slate-600">{room.building}</td>
                              <td className="p-3.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  room.programType === 'EXTENSION' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {room.programType === 'EXTENSION' ? '🌙 EXTENSION' : '☀️ REGULAR'}
                                </span>
                              </td>
                              <td className="p-3.5 font-semibold text-slate-700">{room.capacity} seats</td>
                              <td className="p-3.5">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  {room.roomType?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3.5">
                                {room.allocatedCollege ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    🏛️ {room.allocatedCollege.name} ({room.allocatedCollege.code})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    🟢 Free / Unallocated
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-slate-500 text-[11px]">
                                {room.allocatedDept ? (
                                  <span className="font-semibold text-indigo-800">
                                    {room.allocatedDept.name} ({room.allocatedDept.code})
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Managed by Dean (Shared)</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                <select
                                  value={room.allocatedCollegeId || ''}
                                  onChange={(e) => handleDirectCollegeAllocation(room.id, e.target.value)}
                                  className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                  <option value="">🟢 Free / Unallocated</option>
                                  {allColleges.map(c => (
                                    <option key={c.id} value={c.id}>
                                      Allocate to: {c.name} ({c.code})
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ===================== WORKSPACE: LAB COORDINATOR ===================== */}
        {activeRole === 'LAB_COORDINATOR' && (() => {
          const labRooms = meta?.rooms?.filter(r => r.roomType === 'COMPUTER_LAB' || r.roomType === 'SCIENCE_LAB') || [];
          const labCourses = meta?.courses?.filter(c => c.requiresLab) || [];
          const scheduledLabSlots = schedule?.filter(s => s.isLab) || [];

          return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-purple-600">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Laboratory & Technical Facilities Directorate (የላብራቶሪ አስተባባሪ ዳይሬክቶሬት)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Responsible for managing, equipping, and scheduling Computer Labs and Science Labs across all university departments.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-200">
                    🔬 Exclusive Lab Facility Manager
                  </span>
                </div>
              </div>

              {/* CRUCIAL ROLE DISTINCTION BANNER */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-950 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-900 mb-0.5">
                    🔬 የላብራቶሪ አስተባባሪ ኃላፊነት (Lab Coordinator's Authority):
                  </h4>
                  <p className="text-purple-800 leading-relaxed">
                    አጠቃላይ አገልግሎት (General Services) መደበኛ የመማሪያ ክፍሎችን (Lecture Classrooms) ብቻ ይመድባል። <strong>የላብራቶሪ ክፍሎችን (Computer Labs & Science Labs)</strong> የመመደብ፣ የላብ ክፍለ-ጊዜዎችን (Practical Sessions) የማስተናገድ እና የመሳሪያዎችን ዝግጁነት የመቆጣጠር ስልጣን የ <strong>Lab Coordinator (የላብራቶሪ አስተባባሪ)</strong> ብቻ ነው።
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total University Labs</span>
                  <span className="text-xl font-bold text-purple-700 mt-1 block">{labRooms.length} Labs</span>
                  <span className="text-[10px] text-slate-400">Computer & Science Labs</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Workstations / PCs</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">
                    {labRooms.reduce((sum, r) => sum + r.capacity, 0)} Stations
                  </span>
                  <span className="text-[10px] text-slate-400">Equipped with network & software</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Courses Requiring Lab</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{labCourses.length} Courses</span>
                  <span className="text-[10px] text-slate-400">Data Structures, Database, Web...</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Active Practical Sessions</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">{scheduledLabSlots.length} Sessions</span>
                  <span className="text-[10px] text-slate-400">100% Conflict-Free Scheduled</span>
                </div>
              </div>

              {/* Campus Lab Inventory Cards */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Campus Laboratory Facilities (የዩኒቨርሲቲው የላብራቶሪ ክፍሎች):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {labRooms.map(lab => (
                    <div key={lab.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-purple-600" />
                            {lab.roomNumber} ({lab.building})
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            {lab.roomType?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Capacity: <strong>{lab.capacity} Student Workstations</strong> • Status: <span className="text-emerald-700 font-semibold">Ready & Equipped</span>
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>High-speed LAN • Projector • UPS Backup</span>
                        <span className="font-semibold text-indigo-700">Managed by Lab Coordinator</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Courses Table */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Department Courses Requiring Practical Laboratory Sessions:
                </span>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Course Code & Name</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5">Weekly Lab Hours</th>
                        <th className="p-3.5">Required Lab Facility</th>
                        <th className="p-3.5">Assigned Lab Room</th>
                        <th className="p-3.5 text-right">Lab Coordinator Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {labCourses.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 font-bold text-slate-900">
                            {c.code} — {c.name}
                          </td>
                          <td className="p-3.5 text-slate-600">
                            {c.department?.name || 'Computer Science'} ({c.department?.code || 'CS'})
                          </td>
                          <td className="p-3.5 text-slate-700 font-semibold">
                            {c.weeklyLabHours} hrs/week
                          </td>
                          <td className="p-3.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              Computer Lab
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-indigo-700 font-bold">
                            TECH-PC-LAB1
                          </td>
                          <td className="p-3.5 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Allocated & Ready
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {activeRole === 'DEPT_HEAD' && (() => {
          const dept = meta?.departments?.find(d => d.code === 'CS') || meta?.departments?.[0];
          const assignedRooms = meta?.rooms?.filter(r => r.allocatedDeptId === dept?.id && (
            programType === 'REGULAR' ? r.programType !== 'EXTENSION' : r.programType === 'EXTENSION'
          )) || [];
          const totalCapacity = assignedRooms.reduce((sum, r) => sum + r.capacity, 0);

          return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                    Department Head Workspace ({dept?.name || 'Computer Science'})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Assign lectures, monitor credit hours limit, add courses, and change assigned instructors.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setDeptAssignModal(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
                  >
                    <User className="h-3.5 w-3.5" /> Assign / Swap Lecturer
                  </button>
                  <button
                    onClick={() => setDeptCourseModal(true)}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add Course
                  </button>
                  <button
                    onClick={() => setDeptLecturerModal(true)}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add Lecturer
                  </button>
                </div>
              </div>

              {/* Allocated Classrooms Banner for Department */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
                    Dean Allocated Classrooms for {dept?.name} ({dept?.code}):
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {assignedRooms.length > 0 ? (
                      assignedRooms.map(r => (
                        <span key={r.id} className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-white border border-indigo-300 text-indigo-900 shadow-2xs flex items-center gap-1.5">
                          <DoorOpen className="h-3.5 w-3.5 text-indigo-600" />
                          {r.building} ➔ <strong>{r.roomNumber}</strong> ({r.capacity} seats • {r.roomType?.replace('_', ' ')})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                        No exclusive rooms allocated yet by the Dean.
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block">{assignedRooms.length} Lecture Classrooms</span>
                  <span className="text-xs text-indigo-600 font-semibold">{totalCapacity} Total Seats</span>
                </div>
              </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Department Faculty Credit Hours Monitor (Max 12 hrs/semester):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {meta?.instructors?.map(inst => (
                  <div key={inst.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900">{inst.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inst.isOverloaded ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {inst.assignedCreditHours} / {inst.maxCreditHours} Cr. Hrs
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${inst.isOverloaded ? 'bg-rose-600' : 'bg-indigo-600'}`}
                        style={{ width: `${Math.min(100, (inst.assignedCreditHours / inst.maxCreditHours) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

        {activeRole === 'REGISTRAR' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Office of the University Registrar
                </h2>
                <p className="text-xs text-slate-500">
                  Responsible for university-wide Common Freshman Courses (Natural & Social Science streams) and academic streams.
                </p>
              </div>
              <button
                onClick={() => setFreshmanModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition"
              >
                <PlusCircle className="h-4 w-4" /> Add Freshman Common Course
              </button>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Official Freshman Common Curriculum:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {meta?.courses?.filter(c => c.isFreshmanCommon).map(c => (
                  <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">{c.code}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {c.creditHours} Cr. Hrs
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{c.name}</p>
                    <span className="text-[10px] font-semibold text-indigo-600 mt-1 inline-block">
                      Stream: {c.streamType?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeRole === 'CLASSROOM_USHER' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-600" />
                Classroom Usher & Key Proctor Schedule (ክፍል ከፋችና ዘጊ)
              </h2>
              <p className="text-xs text-slate-500">
                Check schedule to see which classrooms need to be opened 15 minutes before lecture and locked afterwards.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                    <th className="p-3">Building / Room</th>
                    <th className="p-3">Day & Period</th>
                    <th className="p-3">Time Window</th>
                    <th className="p-3">Course & Instructor</th>
                    <th className="p-3">Door Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedule.map(slot => (
                    <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">
                        {slot.room?.building} — {slot.room?.roomNumber}
                      </td>
                      <td className="p-3 text-slate-700">
                        {slot.timeSlot?.dayOfWeek} (Period {slot.timeSlot?.periodNumber})
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {slot.timeSlot?.startTime} - {slot.timeSlot?.endTime}
                      </td>
                      <td className="p-3 text-slate-800">
                        <span className="font-semibold">{slot.course?.code}</span> ({slot.instructor?.name})
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          slot.isUnlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {slot.isUnlocked ? <DoorOpen className="h-3 w-3" /> : <DoorClosed className="h-3 w-3" />}
                          {slot.isUnlocked ? 'UNLOCKED / OPEN' : 'LOCKED'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleUsherDoor(slot.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            slot.isUnlocked
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {slot.isUnlocked ? 'Lock Door' : 'Unlock Door'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeRole === 'STUDENT' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between text-indigo-950">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-indigo-600" />
              <div>
                <p className="font-bold text-sm">Official Student Timetable Viewer</p>
                <p className="text-xs text-indigo-700">
                  Read-only view. Select your cohort/section to see lecture rooms, labs, and times.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              <Printer className="h-4 w-4" /> Download / Print Timetable
            </button>
          </div>
        )}

        {activeRole === 'INSTRUCTOR' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Personal Faculty Teaching Schedule</h3>
                <p className="text-xs text-slate-500">
                  Check lecture hours, laboratory assignments, and free study blocks.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 transition"
            >
              <Printer className="h-4 w-4" /> Export Personal Schedule
            </button>
          </div>
        )}

        {/* TIMETABLE SECTION (ONLY FOR ACADEMIC SCHEDULING ROLES - HIDDEN FOR GENERAL SERVICES & LAB COORDINATOR) */}
        {activeRole !== 'GENERAL_SERVICE' && activeRole !== 'LAB_COORDINATOR' && (
          <>
            {/* TIMETABLE STATS & GENERATOR BAR */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{programType}</p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Slots</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{schedule.length}</p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Rooms</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{meta?.rooms?.length || 0}</p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hard Conflicts</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span className="text-emerald-700 font-bold text-base">0 Clashes (100% Conflict-Free)</span>
              </div>
            </div>
          </div>

          {activeRole === 'SUPER_ADMIN' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Optimizing Schedule...' : `Auto-Generate ${programType} Timetable`}
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl transition"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-500" /> Filters:
            </span>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Cohort / Section:</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Sections ({meta?.sections?.length || 0})</option>
                {meta?.sections?.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.studentCount} students, {s.programType})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Instructor:</label>
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Instructors ({meta?.instructors?.length || 0})</option>
                {meta?.instructors?.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.assignedCreditHours} cr. hrs)</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Room:</label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Rooms ({meta?.rooms?.length || 0})</option>
                {meta?.rooms?.map(r => (
                  <option key={r.id} value={r.id}>{r.building} - {r.roomNumber} ({r.roomType})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-28">
                    Day / Period
                  </th>
                  {periods.map(p => {
                    const sampleSlot = meta?.timeSlots?.find(t => t.periodNumber === p && t.programType === programType);
                    return (
                      <th key={p} className="p-3.5 text-center border-l border-slate-200 text-xs font-bold text-slate-700 uppercase">
                        <div>Period {p}</div>
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                          {sampleSlot ? `${sampleSlot.startTime} - ${sampleSlot.endTime}` : ''}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeDays.map((day) => (
                  <tr key={day} className="border-b border-slate-200 hover:bg-slate-50/50 transition">
                    <td className="p-4 font-bold text-xs text-slate-800 bg-slate-50/80 uppercase tracking-wider">
                      {day}
                    </td>
                    {periods.map(period => {
                      const slot = getSlot(day, period);

                      return (
                        <td key={period} className="p-2 border-l border-slate-200 align-top min-w-[175px] h-32">
                          {slot ? (
                            <div className={`h-full p-2.5 rounded-xl border flex flex-col justify-between shadow-sm transition hover:shadow-md ${
                              slot.isLab
                                ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                                : 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
                            }`}>
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-bold text-xs text-slate-900 tracking-tight">
                                    {slot.course?.code}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                      slot.isLab ? 'bg-purple-200 text-purple-800' : 'bg-indigo-200 text-indigo-800'
                                    }`}>
                                      {slot.isLab ? 'Lab' : 'Lecture'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[11px] font-medium text-slate-700 line-clamp-1">
                                  {slot.course?.name}
                                </p>
                              </div>

                              <div className="mt-2 flex flex-col gap-0.5 text-[10px] text-slate-600">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{slot.instructor?.name}</span>
                                </div>
                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{slot.room?.building} — {slot.room?.roomNumber}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-slate-500 truncate">
                                  <GraduationCap className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{slot.section?.name}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full rounded-xl border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-center text-slate-300 text-[11px]">
                              Free Slot
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}

  </main>

      {/* MODALS */}
      {/* 1. Dean Request Modal */}
      {deanModal && (() => {
        const targetCollegeId = selectedDeanCollegeId || currentUser?.collegeId || meta?.colleges?.[0]?.id;
        const currentCollege = meta?.colleges?.find(c => c.id === targetCollegeId) || meta?.colleges?.[0];
        const collegeDepts = meta?.departments?.filter(d => d.collegeId === targetCollegeId) || [];

        const totalBatchesInModal = collegeDepts.reduce((sum, d) => {
          const count = deanForm.customBatches?.[d.id] !== undefined
            ? parseInt(deanForm.customBatches[d.id]) || 0
            : (d.sections?.length || 2);
          return sum + count;
        }, 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Request Classrooms from General Services
                    </h3>
                    <p className="text-[11px] text-slate-500">ለአጠቃላይ አገልግሎት ዳይሬክቶሬት የመማሪያ ክፍሎች ጥያቄ ማቅረቢያ</p>
                  </div>
                </div>
                <button onClick={() => setDeanModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scope & Role Notice */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  📌 <strong>ማሳሰቢያ (Notice):</strong> አጠቃላይ አገልግሎት የሚመድበው <strong>መደበኛ የመማሪያ ክፍሎችን (Lecture Classrooms)</strong> ብቻ ነው። የላብራቶሪ ክፍሎች (Computer Labs & Science Labs) በ <strong>Lab Coordinator</strong> ነው የሚመደቡት።
                </p>
              </div>

              <form onSubmit={submitDeanRequest} className="flex flex-col gap-4">
                {/* College Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target College (የሚጠይቀው ኮሌጅ):</label>
                  <select
                    value={targetCollegeId}
                    onChange={(e) => handleCollegeChangeInModal(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {meta?.colleges?.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                {/* Department Batches Input Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Departments & Active Student Batches ({collegeDepts.length} Departments):
                    </label>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      Total: {totalBatchesInModal} Batches
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Enter the number of student batches (sections) in each department to justify classroom needs:
                  </p>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-slate-50/50">
                    {collegeDepts.map(dept => {
                      const batchCount = deanForm.customBatches?.[dept.id] !== undefined
                        ? deanForm.customBatches[dept.id]
                        : (dept.sections?.length || 2);
                      return (
                        <div key={dept.id} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition">
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{dept.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Code: {dept.code} • {dept.sections?.length || 2} registered cohort sections
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-medium">Batches:</span>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={batchCount}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setDeanForm(prev => {
                                  const updated = { ...prev.customBatches, [dept.id]: val };
                                  const newTotal = Object.values(updated).reduce((s, v) => s + v, 0);
                                  return {
                                    ...prev,
                                    customBatches: updated,
                                    totalStudents: newTotal * 35,
                                    requestedRoomsCount: Math.max(4, Math.ceil(newTotal / 2))
                                  };
                                });
                              }}
                              className="w-16 text-center text-xs font-bold border border-slate-300 rounded-lg py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lecture Rooms Needed */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Lecture Classrooms Needed (የሚፈለጉ የመማሪያ ክፍሎች ብዛት):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={deanForm.requestedRoomsCount}
                    onChange={(e) => setDeanForm({ ...deanForm, requestedRoomsCount: e.target.value })}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Calculated for {totalBatchesInModal} batches across {collegeDepts.length} departments (labs excluded).
                  </span>
                </div>

                {/* Academic Demand Justification */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Academic Demand Justification (የትምህርት መርሃ-ግብር ማብራሪያ):
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-1.5 leading-relaxed">
                    📌 <strong>ማሳሰቢያ፡</strong> ዲኑ የዲፓርትመንቶቹን የባች ብዛት ብቻ ነው የሚያሳውቀው፤ የትኛውን ብሎክ መስጠት እንዳለበት የሚወስነው <strong>አጠቃላይ አገልግሎት (General Services)</strong> ብቻ ነው።
                  </p>
                  <textarea
                    value={deanForm.remarks}
                    onChange={(e) => setDeanForm({ ...deanForm, remarks: e.target.value })}
                    placeholder="e.g. Official demand for active student batches across our departments..."
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                    rows={2}
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeanModal(false)}
                    className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                  >
                    <Send className="h-4 w-4" /> Submit Request to General Services
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 2. General Services Review & Allocate Modal */}
      {reviewRequestModal && (() => {
        const reqBatches = safeParseBatches(reviewRequestModal.departmentBatches, reviewRequestModal.collegeId);
        const totalBatches = reviewRequestModal.totalBatches || reqBatches.reduce((s, b) => s + b.batchCount, 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Allocate Lecture Blocks to College (ለኮሌጁ የመማሪያ ብሎክ ፈቅድ)
                    </h3>
                    <p className="text-[11px] text-slate-500">General Services Directorate Classroom Allocation</p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewRequestModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Request Summary Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{reviewRequestModal.college?.name}</span>
                  <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {reviewRequestModal.programType}
                  </span>
                </div>

                <p className="text-slate-700 font-semibold">
                  Requesting: <strong>{reviewRequestModal.requestedRoomsCount} Lecture Classrooms</strong> for <strong>{totalBatches} Student Batches</strong> across {reqBatches.length} Departments
                </p>

                {/* Department Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/70">
                  {reqBatches.map((b, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500 font-semibold truncate">{b.departmentName || b.code}</span>
                      <span className="text-xs font-bold text-indigo-600">{b.batchCount} Batches</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 italic mt-1">"{reviewRequestModal.remarks || 'No remarks from Dean'}"</p>
              </div>

              {/* Policy Reminder */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  📌 <strong>የአሰራር ደንብ፡</strong> አጠቃላይ አገልግሎት ክፍሎችን የሚመድበው <strong>ለኮሌጁ በሙሉ</strong> ብቻ ነው (ለዲፓርትመንቶች የሚያከፋፍሉት የኮሌጁ ዲን ናቸው)። <strong>የላብራቶሪ ክፍሎች (Labs) አይካተቱም</strong>፤ በ Lab Coordinator ነው የሚመደቡት።
                </p>
              </div>

              {/* Available Campus Lecture Blocks to Select */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Select Lecture Blocks to Allocate ({reviewRequestModal?.programType === 'EXTENSION' ? '🌙 Extension Blocks / የማታ እና ቅዳሜ-እሁድ ብሎኮች' : '☀️ Regular Blocks / መደበኛ የመማሪያ ብሎኮች'}):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(reviewRequestModal?.programType === 'EXTENSION'
                    ? ['Block 70 (Extension)', 'Block 25 (Extension)']
                    : ['Block 42', 'Block 43', 'Block 50', 'Block 12']
                  ).map(blockName => {
                    const isChecked = reviewBlocks.includes(blockName);
                    const blockRooms = meta?.rooms?.filter(r => r.building === blockName && (r.roomType === 'LECTURE_HALL' || r.roomType === 'STANDARD_CLASSROOM')) || [];
                    const blockCapacity = blockRooms.reduce((sum, r) => sum + r.capacity, 0);

                    return (
                      <button
                        key={blockName}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setReviewBlocks(reviewBlocks.filter(b => b !== blockName));
                          } else {
                            setReviewBlocks([...reviewBlocks, blockName]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-xs block">{blockName}</span>
                          <span className="text-[10px] text-slate-500">
                            {blockRooms.length} lecture rooms • {blockCapacity} seats
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allocation Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Approval Remarks / Allocation Note:
                </label>
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="e.g. Allocated Block 42 and Block 43 for College of Engineering & Technology"
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => submitGeneralServiceReview('REJECTED')}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
                >
                  <X className="h-4 w-4 inline mr-1" /> Decline Request
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewRequestModal(null)}
                    className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitGeneralServiceReview('APPROVED')}
                    disabled={reviewBlocks.length === 0}
                    className="text-xs font-bold px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" /> Approve & Allocate to College (ለኮሌጁ አጽድቅ)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {deptAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">Assign or Swap Course Lecturer</h3>
            <p className="text-xs text-slate-500 mb-4">Assign an instructor to a course with automatic credit hours limit validation.</p>
            <form onSubmit={submitDeptAssign} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Select Course:</label>
                <select
                  value={assignForm.courseId}
                  onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {meta?.courses?.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name} ({c.creditHours} cr. hrs)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Select Instructor:</label>
                <select
                  value={assignForm.instructorId}
                  onChange={(e) => setAssignForm({ ...assignForm, instructorId: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                  required
                >
                  <option value="">-- Choose Instructor --</option>
                  {meta?.instructors?.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (Current: {i.assignedCreditHours}/{i.maxCreditHours} cr. hrs)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Select Section:</label>
                <select
                  value={assignForm.sectionId}
                  onChange={(e) => setAssignForm({ ...assignForm, sectionId: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                  required
                >
                  <option value="">-- Choose Section --</option>
                  {meta?.sections?.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.programType})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setDeptAssignModal(false)} className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">Cancel</button>
                <button type="submit" className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {freshmanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">Register Freshman Common Course</h3>
            <p className="text-xs text-slate-500 mb-4">University Registrar manages common natural and social science courses.</p>
            <form onSubmit={submitFreshmanCourse} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Course Code:</label>
                  <input
                    type="text"
                    value={freshmanForm.code}
                    onChange={(e) => setFreshmanForm({ ...freshmanForm, code: e.target.value })}
                    placeholder="e.g. LOGIC101"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Credit Hours:</label>
                  <input
                    type="number"
                    value={freshmanForm.creditHours}
                    onChange={(e) => setFreshmanForm({ ...freshmanForm, creditHours: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Course Name:</label>
                <input
                  type="text"
                  value={freshmanForm.name}
                  onChange={(e) => setFreshmanForm({ ...freshmanForm, name: e.target.value })}
                  placeholder="e.g. Introduction to Logic & Critical Thinking"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Stream:</label>
                  <select
                    value={freshmanForm.streamType}
                    onChange={(e) => setFreshmanForm({ ...freshmanForm, streamType: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                  >
                    <option value="NATURAL_SCIENCE">Natural Science</option>
                    <option value="SOCIAL_SCIENCE">Social Science</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Program:</label>
                  <select
                    value={freshmanForm.programType}
                    onChange={(e) => setFreshmanForm({ ...freshmanForm, programType: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="EXTENSION">Extension</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setFreshmanModal(false)} className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">Cancel</button>
                <button type="submit" className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
