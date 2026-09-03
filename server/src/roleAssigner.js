/**
 * Assigns Engineer and Saboteur roles to players in a room
 * Asymmetric two-role structure: 1 Saboteur, remainder Engineers
 */
export function assignRoles(players) {
  if (!players || players.length === 0) return [];

  // Reset all players
  const cloned = players.map(p => ({
    ...p,
    role: 'engineer',
    isAlive: true
  }));

  // Choose 1 random saboteur
  const saboteurIndex = Math.floor(Math.random() * cloned.length);
  cloned[saboteurIndex].role = 'saboteur';

  return cloned;
}
