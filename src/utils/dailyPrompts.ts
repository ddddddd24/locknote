/**
 * Daily drawing prompts — one per day, cycling through the list.
 * Both users see the same prompt because it's purely date-based.
 */

const PROMPTS = [
  'Draw how you\'re feeling right now',
  'Draw what you can see from your window',
  'Draw what you had for breakfast',
  'Draw your mood as a weather forecast',
  'Draw the last thing that made you laugh',
  'Draw where you wish you were right now',
  'Draw something soft',
  'Draw what you\'re craving right now',
  'Draw your energy level today',
  'Draw a memory from this week',
  'Draw something that\'s been on your mind',
  'Draw what tonight feels like',
  'Draw your dream date with them',
  'Draw the sky where you are right now',
  'Draw how you feel when you think of them',
  'Draw something tiny and beautiful',
  'Draw what you\'d teleport to them if you could',
  'Draw a word that describes your day',
  'Draw what you\'re looking forward to',
  'Draw something that felt heavy today',
  'Draw your favorite sound as a shape',
  'Draw something that made you think of them today',
  'Draw what you wish they could see right now',
  'Draw a secret',
  'Draw something that makes you feel cozy',
  'Draw your morning routine',
  'Draw the last place you went outside',
  'Draw something that smells good to you',
  'Draw tonight\'s vibe',
  'Draw what home feels like',
];

export function getTodayPrompt(): string {
  const origin = new Date('2026-01-01').setHours(0, 0, 0, 0);
  const today  = new Date().setHours(0, 0, 0, 0);
  const days   = Math.floor((today - origin) / 86_400_000);
  return PROMPTS[((days % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
}
