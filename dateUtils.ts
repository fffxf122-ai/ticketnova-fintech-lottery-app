// Date utilities for dynamic draw dates and timestamps

export function getNextDrawDate(gameType: string): Date {
  const now = new Date();
  const drawDate = new Date(now);
  
  // Set draw times based on game type
  switch (gameType) {
    case 'thailand-2d':
    case 'thailand-3up':
      // Thailand draws at 3:30 PM and 6:30 PM local time
      drawDate.setHours(15, 30, 0, 0);
      if (now.getHours() >= 15) {
        drawDate.setHours(18, 30, 0, 0);
      }
      if (now.getHours() >= 18 || (now.getHours() === 18 && now.getMinutes() >= 30)) {
        drawDate.setDate(drawDate.getDate() + 1);
        drawDate.setHours(15, 30, 0, 0);
      }
      break;
    case 'kalyan-single':
    case 'kalyan-jodi':
    case 'kalyan-patti':
      // Kalyan draws at 4:00 PM
      drawDate.setHours(16, 0, 0, 0);
      if (now.getHours() >= 16) {
        drawDate.setDate(drawDate.getDate() + 1);
      }
      break;
    default:
      drawDate.setHours(20, 0, 0, 0);
      if (now.getHours() >= 20) {
        drawDate.setDate(drawDate.getDate() + 1);
      }
  }
  
  return drawDate;
}

export function getClosingTime(drawDate: Date, minutesBefore: number = 30): Date {
  const closingTime = new Date(drawDate);
  closingTime.setMinutes(closingTime.getMinutes() - minutesBefore);
  return closingTime;
}

export function formatTimeRemaining(targetDate: Date): string {
  const now = Date.now();
  const target = targetDate.getTime();
  const diff = Math.max(0, target - now);
  
  if (diff === 0) return 'Closed';
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m ${seconds}s`;
}

export function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function getDrawSchedule(): Array<{ gameType: string; nextDraw: Date; closingTime: Date }> {
  const games = [
    'thailand-2d',
    'thailand-3up',
    'kalyan-single',
    'kalyan-jodi',
    'kalyan-patti',
  ];
  
  return games.map(gameType => {
    const nextDraw = getNextDrawDate(gameType);
    const closingTime = getClosingTime(nextDraw);
    return { gameType, nextDraw, closingTime };
  });
}

// Generate dynamic draws based on current date
export function generateDynamicDraws() {
  const draws: Array<{
    id: string;
    gameType: string;
    drawDate: string;
    result?: string;
    status: 'upcoming' | 'live' | 'completed';
    closingTime: string;
  }> = [];
  const now = new Date();
  
  const gameTypes = [
    { id: 'thailand-2d', times: [15, 18] },
    { id: 'thailand-3up', times: [15, 18] },
    { id: 'kalyan-single', times: [16] },
    { id: 'kalyan-jodi', times: [16] },
    { id: 'kalyan-patti', times: [16] },
  ];
  
  // Generate past results
  for (let daysAgo = 5; daysAgo >= 1; daysAgo--) {
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - daysAgo);
    
    gameTypes.forEach((game, idx) => {
      const drawDate = new Date(pastDate);
      drawDate.setHours(game.times[0], 30, 0, 0);
      
      draws.push({
        id: `d-${daysAgo}-${game.id}`,
        gameType: game.id,
        drawDate: drawDate.toISOString().split('T')[0],
        result: generateFakeResult(game.id),
        status: 'completed' as const,
        closingTime: drawDate.toISOString(),
      });
    });
  }
  
  // Generate upcoming draws
  for (let daysAhead = 0; daysAhead <= 3; daysAhead++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    gameTypes.forEach((game) => {
      game.times.forEach((hour, timeIdx) => {
        const drawDate = new Date(futureDate);
        drawDate.setHours(hour, 30, 0, 0);
        
        // Skip past draws today
        if (drawDate <= now) return;
        
        const closingTime = new Date(drawDate);
        closingTime.setMinutes(closingTime.getMinutes() - 30);
        
        draws.push({
          id: `d-${daysAhead}-${game.id}-${timeIdx}`,
          gameType: game.id,
          drawDate: drawDate.toISOString().split('T')[0],
          status: 'upcoming' as const,
          closingTime: closingTime.toISOString(),
        });
      });
    });
  }
  
  return draws.slice(0, 20); // Limit to 20 draws
}

function generateFakeResult(gameType: string): string {
  switch (gameType) {
    case 'thailand-2d':
    case 'kalyan-jodi':
      return Math.floor(Math.random() * 100).toString().padStart(2, '0');
    case 'thailand-3up':
    case 'kalyan-patti':
      return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    case 'kalyan-single':
      return Math.floor(Math.random() * 10).toString();
    default:
      return Math.floor(Math.random() * 100).toString().padStart(2, '0');
  }
}
