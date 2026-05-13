import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import LiveTimer from '@/components/ui/LiveTimer';
import toast from 'react-hot-toast';

type GameType = 'thailand-2d' | 'thailand-3up' | 'kalyan-single' | 'kalyan-jodi' | 'kalyan-patti';

interface GameConfig {
  id: GameType;
  name: string;
  icon: string;
  maxDigits: number;
  maxNumber: number;
  multiplier: number;
  description: string;
}

const games: GameConfig[] = [
  { id: 'thailand-2d', name: 'Thailand 2D', icon: '🇹🇭', maxDigits: 2, maxNumber: 99, multiplier: 90, description: 'Pick 2 digits (00-99)' },
  { id: 'thailand-3up', name: 'Thailand 3UP', icon: '🎯', maxDigits: 3, maxNumber: 999, multiplier: 900, description: 'Pick 3 digits (000-999)' },
  { id: 'kalyan-single', name: 'Kalyan Single', icon: '1️⃣', maxDigits: 1, maxNumber: 9, multiplier: 9, description: 'Pick 1 digit (0-9)' },
  { id: 'kalyan-jodi', name: 'Kalyan Jodi', icon: '🎲', maxDigits: 2, maxNumber: 99, multiplier: 90, description: 'Pick 2 digits (00-99)' },
  { id: 'kalyan-patti', name: 'Kalyan Patti', icon: '🃏', maxDigits: 3, maxNumber: 999, multiplier: 900, description: 'Pick 3 digits (000-999)' },
];

export default function LotteryPage() {
  const { user, addBet, draws, bets, setCurrentPage, refreshDraws } = useStore();
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);
  const [number, setNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('lottery-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Refresh draws on mount
  useEffect(() => {
    refreshDraws();
  }, [refreshDraws]);

  // Save favorites
  useEffect(() => {
    localStorage.setItem('lottery-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const betAmountNum = parseFloat(betAmount) || 0;
  const potentialWin = selectedGame ? betAmountNum * selectedGame.multiplier : 0;

  const upcomingDraws = draws.filter(d => d.status === 'upcoming');
  const completedDraws = draws.filter(d => d.status === 'completed').slice(0, 5);

  // Get hot/cold numbers from actual bets
  const getHotNumbers = () => {
    const numberCounts: Record<string, number> = {};
    bets.forEach(b => {
      if (b.number.length === 2) {
        numberCounts[b.number] = (numberCounts[b.number] || 0) + 1;
      }
    });
    return Object.entries(numberCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
  };

  const hotNumbers = getHotNumbers().length > 0 
    ? getHotNumbers() 
    : ['47', '23', '89', '56', '12', '78', '34', '91', '05', '67'];
  
  const coldNumbers = ['03', '88', '41', '99', '15', '72', '60', '28', '54', '36'];

  const luckyPick = () => {
    if (!selectedGame) return;
    const max = selectedGame.maxNumber;
    const num = Math.floor(Math.random() * (max + 1));
    setNumber(num.toString().padStart(selectedGame.maxDigits, '0'));
    toast('🍀 Lucky number picked!', { icon: '🎲' });
  };

  const toggleFavorite = (num: string) => {
    setFavorites(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
    toast.success(favorites.includes(num) ? 'Removed from favorites' : 'Added to favorites');
  };

  const handlePlaceBet = () => {
    if (!user || !selectedGame) return;
    if (!number) { toast.error('Enter a number'); return; }
    if (betAmountNum < 10) { toast.error('Minimum bet is 10 SAR'); return; }
    if (betAmountNum > 10000) { toast.error('Maximum bet is 10,000 SAR'); return; }
    if (betAmountNum > user.balance) { toast.error('Insufficient balance'); return; }

    const numValue = parseInt(number);
    if (numValue > selectedGame.maxNumber || numValue < 0) {
      toast.error(`Number must be between 0-${selectedGame.maxNumber}`);
      return;
    }

    // Check for duplicate
    const paddedNumber = number.padStart(selectedGame.maxDigits, '0');
    const duplicate = bets.find(b =>
      b.gameType === selectedGame.id &&
      b.number === paddedNumber &&
      b.status === 'pending'
    );
    if (duplicate) { 
      toast.error('You already have a pending bet on this number'); 
      return; 
    }

    const draw = upcomingDraws.find(d => d.gameType === selectedGame.id) || upcomingDraws[0];
    
    if (!draw) {
      toast.error('No upcoming draws available');
      return;
    }

    // Check if draw is still open
    const closingTime = new Date(draw.closingTime).getTime();
    if (Date.now() > closingTime) {
      toast.error('Betting is closed for this draw');
      refreshDraws();
      return;
    }

    addBet({
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      userId: user.id,
      odfserId: user.id,
      gameType: selectedGame.id,
      number: paddedNumber,
      amount: betAmountNum,
      potentialWin,
      status: 'pending',
      drawId: draw.id,
      drawDate: draw.drawDate,
      createdAt: new Date().toISOString(),
    });

    toast.success(`Bet placed! 🎰 #${paddedNumber}`);
    setNumber('');
    setBetAmount('');
  };

  // Next draw for the timer
  const nextDraw = upcomingDraws[0];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-display">🎰 Lottery Games</h2>
        <button
          onClick={() => setCurrentPage('bet-history')}
          className="text-xs text-gold/60 hover:text-gold px-3 py-1.5 rounded-xl bg-gold/5"
        >
          My Bets ({bets.filter(b => b.status === 'pending').length}) →
        </button>
      </div>

      {/* Next Draw Timer */}
      {nextDraw && (
        <GlassCard glow animate={false} className="text-center py-5">
          <p className="text-xs text-white/40 mb-2">Next Draw Closes In</p>
          <LiveTimer 
            targetDate={nextDraw.closingTime} 
            size="md"
            onExpire={refreshDraws}
          />
          <p className="text-xs text-white/30 mt-3">
            {nextDraw.gameType.replace(/-/g, ' ').toUpperCase()} • {nextDraw.drawDate}
          </p>
        </GlassCard>
      )}

      {/* Game Selection */}
      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <h3 className="text-sm font-semibold text-white/50">Choose a Game</h3>
            {games.map((game, i) => {
              const gameUpcoming = upcomingDraws.find(d => d.gameType === game.id);
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard
                    onClick={() => setSelectedGame(game)}
                    className="flex items-center gap-4 hover:border-gold/20"
                    animate={false}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/10 to-orange/10 flex items-center justify-center text-2xl">
                      {game.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{game.name}</p>
                      <p className="text-xs text-white/40">{game.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gold/60">Win up to {game.multiplier}x</span>
                        {gameUpcoming && (
                          <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-white/20 text-lg">›</span>
                  </GlassCard>
                </motion.div>
              );
            })}

            {/* Recent Results */}
            <h3 className="text-sm font-semibold text-white/50 mt-6">Recent Results</h3>
            {completedDraws.length === 0 ? (
              <GlassCard animate={false} className="text-center py-6">
                <span className="text-3xl">📭</span>
                <p className="text-white/30 text-sm mt-2">No results yet</p>
              </GlassCard>
            ) : (
              completedDraws.map((draw, i) => (
                <motion.div
                  key={draw.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard animate={false} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{draw.gameType.includes('thailand') ? '🇹🇭' : '🎲'}</span>
                      <div>
                        <p className="text-sm font-medium">{draw.gameType.replace(/-/g, ' ').toUpperCase()}</p>
                        <p className="text-xs text-white/30">{draw.drawDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold gradient-gold-text font-display">{draw.result}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}

            {/* Hot & Cold Numbers */}
            <h3 className="text-sm font-semibold text-white/50 mt-4">🔥 Hot Numbers</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {hotNumbers.map(n => (
                <button 
                  key={n} 
                  onClick={() => { setSelectedGame(games[0]); setNumber(n); }}
                  className="shrink-0 w-12 h-12 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-sm font-bold text-red-400 hover:bg-accent-red/20 transition-colors"
                >
                  {n}
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-white/50">❄️ Cold Numbers</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {coldNumbers.map(n => (
                <button 
                  key={n}
                  onClick={() => { setSelectedGame(games[0]); setNumber(n); }}
                  className="shrink-0 w-12 h-12 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-sm font-bold text-blue-400 hover:bg-accent-blue/20 transition-colors"
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="betting" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {/* Game Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedGame(null)} 
                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
              >
                ←
              </button>
              <div className="flex-1">
                <h3 className="font-bold">{selectedGame.icon} {selectedGame.name}</h3>
                <p className="text-xs text-white/40">{selectedGame.description} • {selectedGame.multiplier}x multiplier</p>
              </div>
            </div>

            {/* Timer for selected game */}
            {upcomingDraws.find(d => d.gameType === selectedGame.id) && (
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="text-xs text-white/40">Closes in:</span>
                <LiveTimer 
                  targetDate={upcomingDraws.find(d => d.gameType === selectedGame.id)!.closingTime}
                  size="sm"
                  onExpire={() => { refreshDraws(); toast.error('Betting closed!'); }}
                />
              </div>
            )}

            {/* Number Input */}
            <GlassCard glow animate={false}>
              <p className="text-sm text-white/50 mb-2">Enter Your Number</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={number}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.length <= selectedGame.maxDigits) setNumber(val);
                  }}
                  placeholder={'0'.repeat(selectedGame.maxDigits)}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-3xl font-bold font-display text-center tracking-[0.3em] outline-none focus:border-gold/30"
                  min="0"
                  max={selectedGame.maxNumber.toString()}
                />
                <button
                  onClick={luckyPick}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 to-orange/20 border border-gold/20 flex items-center justify-center text-2xl hover:scale-105 transition-transform active:scale-95"
                >
                  🎲
                </button>
              </div>

              {/* Favorite numbers */}
              {favorites.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-white/30 mb-2">⭐ Favorites</p>
                  <div className="flex gap-2 flex-wrap">
                    {favorites.map(f => (
                      <button
                        key={f}
                        onClick={() => setNumber(f)}
                        className="px-3 py-1.5 rounded-lg bg-gold/10 text-gold text-sm font-medium hover:bg-gold/20 transition-colors"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {number && (
                <button
                  onClick={() => toggleFavorite(number.padStart(selectedGame.maxDigits, '0'))}
                  className="mt-2 text-xs text-white/30 hover:text-gold transition-colors"
                >
                  {favorites.includes(number.padStart(selectedGame.maxDigits, '0')) ? '★ Remove from favorites' : '☆ Add to favorites'}
                </button>
              )}
            </GlassCard>

            {/* Number Grid */}
            <GlassCard animate={false}>
              <p className="text-sm text-white/50 mb-3">Quick Select</p>
              <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto hide-scrollbar">
                {Array.from({ length: Math.min(selectedGame.maxNumber + 1, 100) }).map((_, i) => {
                  const num = i.toString().padStart(selectedGame.maxDigits, '0');
                  const isSelected = number === num || number === i.toString();
                  const isFavorite = favorites.includes(num);
                  return (
                    <button
                      key={i}
                      onClick={() => setNumber(num)}
                      className={`py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                        isSelected
                          ? 'gradient-gold text-black'
                          : isFavorite
                          ? 'bg-gold/10 text-gold border border-gold/20'
                          : 'bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {num}
                      {isFavorite && !isSelected && (
                        <span className="absolute -top-1 -right-1 text-[8px]">⭐</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            {/* Bet Amount */}
            <GlassCard animate={false}>
              <p className="text-sm text-white/50 mb-2">Bet Amount (SAR)</p>
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xl font-bold text-center outline-none focus:border-gold/30"
              />
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[10, 50, 100, 500].map(a => (
                  <button
                    key={a}
                    onClick={() => setBetAmount(a.toString())}
                    className={`py-2 rounded-xl text-sm font-medium transition-all ${
                      betAmountNum === a ? 'gradient-gold text-black' : 'bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              {betAmountNum > 0 && number && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-xl bg-gold/[0.05] border border-gold/10"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Number</span>
                    <span className="font-bold gradient-gold-text">{number.padStart(selectedGame.maxDigits, '0')}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-white/40">Bet Amount</span>
                    <span className="font-bold">{betAmountNum} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-white/40">Multiplier</span>
                    <span className="font-bold text-gold">{selectedGame.multiplier}x</span>
                  </div>
                  <div className="border-t border-white/[0.06] mt-2 pt-2 flex justify-between">
                    <span className="text-white/60 font-medium">Potential Win</span>
                    <span className="text-lg font-bold gradient-gold-text">{potentialWin.toLocaleString()} SAR</span>
                  </div>
                </motion.div>
              )}
            </GlassCard>

            <Button
              fullWidth
              size="lg"
              onClick={handlePlaceBet}
              disabled={!number || betAmountNum < 10}
            >
              🎰 Place Bet — {betAmountNum || 0} SAR
            </Button>

            <p className="text-center text-white/20 text-[10px]">
              Balance: {user?.balance.toFixed(2)} SAR • Min: 10 SAR • Max: 10,000 SAR
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
