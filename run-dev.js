import { spawn } from 'child_process';

console.log('====================================================');
console.log('🚀 Starting University Timetable System (Full Stack)');
console.log('====================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Start Backend API (Port 5000)
console.log('📦 Launching Backend API on http://localhost:5000...');
const backend = spawn(npmCmd, ['run', 'server'], {
  stdio: 'inherit',
  shell: true
});

// 2. Start Frontend UI (Port 3000)
console.log('💻 Launching Frontend UI on http://localhost:3000...');
const frontend = spawn(npmCmd, ['run', 'client'], {
  stdio: 'inherit',
  shell: true
});

process.on('SIGINT', () => {
  console.log('\nShutting down services...');
  backend.kill();
  frontend.kill();
  process.exit();
});
