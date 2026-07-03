export const MOTIVATIONAL_PHRASES = [
  'The secret of getting ahead is getting started.',
  'It always seems impossible until it\'s done.',
  'Efficiency is doing things right; effectiveness is doing the right things.',
  'Success is the sum of small efforts repeated day in and day out.',
  'The best time to act was yesterday. The next best time is now.',
  'A place for everything, and everything in its place.',
  'Great things are done by a series of small things brought together.',
  'Work hard in silence. Let success make the noise.',
  'Don\'t watch the clock. Do what it does — keep going.',
  'The way to get started is to quit talking and begin doing.',
  'Discipline is the bridge between goals and accomplishment.',
  'Small daily improvements lead to stunning long-term results.',
  'Organized people are simply too lazy to look for things.',
  'Every expert was once a beginner. Keep moving.',
  'Productivity is never an accident. It\'s the result of commitment.',
  'Focus on progress, not perfection.',
  'The harder you work, the luckier you get.',
  'Order is the foundation of all great work.',
  'What you do today can improve all your tomorrows.',
  'Consistency beats intensity every single time.',
];

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getRandomPhrase(): string {
  return MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];
}
