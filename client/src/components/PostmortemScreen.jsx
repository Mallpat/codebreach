import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  ShieldCheck, 
  Bug, 
  RotateCcw, 
  Clock, 
  GitCommit, 
  FileCode, 
  AlertTriangle,
  User,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { sound } from '../utils/audio';

export function PostmortemScreen({
  players = [],
  winner,
  winReason,
  editTimeline = [],
  standupHistory = [],
  onPlayAgain
}) {
  const isEngineersWin = winner === 'engineers';

  useEffect(() => {
    if (isEngineersWin) {
      sound.playTestPass();
      // Shoot celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      const t = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);
      return () => clearTimeout(t);
    } else {
      sound.playAlarm();
    }
  }, [isEngineersWin]);

  const formatTimeAgo = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      {/* Climax Hero Banner */}
      <div className={`p-8 rounded-3xl border shadow-2xl text-center relative overflow-hidden ${
        isEngineersWin
          ? 'bg-gradient-to-b from-[#091b15] to-[#080d14] border-emerald-500/50 glow-emerald'
          : 'bg-gradient-to-b from-[#1b0910] to-[#080d14] border-rose-500/50 glow-rose'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-3 uppercase tracking-wider bg-black/40 border border-white/10 text-slate-300">
          <Clock className="w-3.5 h-3.5" /> OFFICIAL POSTMORTEM REPORT
        </div>

        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center border shadow-xl mb-4 ${
          isEngineersWin
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            : 'bg-rose-500/20 border-rose-500 text-rose-400'
        }`}>
          {isEngineersWin ? (
            <ShieldCheck className="w-10 h-10" />
          ) : (
            <Bug className="w-10 h-10 animate-bounce" />
          )}
        </div>

        <h1 className={`text-4xl sm:text-5xl font-black font-heading tracking-tight mb-2 ${
          isEngineersWin ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {isEngineersWin ? 'ENGINEERS VICTORY — REPOSITORY SAVED' : 'SABOTEUR VICTORY — SYSTEM BREACHED'}
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
          {winReason || (isEngineersWin 
            ? 'All test assertions passed before the deadline expired.' 
            : 'The shift timer ran out with production bugs remaining unsolved.')}
        </p>

        <div className="mt-6">
          <button
            onClick={() => { sound.playClick(); onPlayAgain(); }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-heading font-black text-sm tracking-wider uppercase shadow-xl hover:shadow-2xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>START NEXT SHIFT (PLAY AGAIN)</span>
          </button>
        </div>
      </div>

      {/* Grid: Role Reveal Dossier */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" /> SQUAD DOSSIER (TRUE ROLES REVEALED)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {players.map((p) => {
            const isSab = p.role === 'saboteur';
            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  isSab
                    ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/60 glow-rose'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-mono font-bold text-xl mb-3 shadow-md ${
                  isSab ? 'bg-rose-600 text-white' : 'bg-slate-800 text-cyan-300'
                }`}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>

                <h4 className="font-heading font-bold text-base text-white">{p.name}</h4>

                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                    isSab
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  }`}>
                    {isSab ? <Bug className="w-3.5 h-3.5 text-rose-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    {isSab ? 'THE SABOTEUR' : 'ENGINEER'}
                  </span>
                </div>

                <div className="mt-3 text-[11px] font-mono text-slate-400">
                  Status: {p.isAlive ? (
                    <span className="text-emerald-400">Survived Shift</span>
                  ) : (
                    <span className="text-rose-400">Ejected in Standup</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Commit & Edit Timeline Audit */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-cyan-400" /> COMMIT & CODE EDIT TIMELINE
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {editTimeline.length} total modifications logged
          </span>
        </div>

        {editTimeline.length === 0 ? (
          <p className="text-sm font-mono text-slate-500 text-center py-6">
            No code edits recorded during this session.
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {editTimeline.slice().reverse().map((edit) => {
              const isSaboteurEdit = edit.playerRole === 'saboteur';
              return (
                <div
                  key={edit.id}
                  className={`p-3.5 rounded-xl border font-mono text-xs transition-all ${
                    isSaboteurEdit
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{edit.playerName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        isSaboteurEdit
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      }`}>
                        {isSaboteurEdit ? 'SABOTEUR' : 'ENGINEER'}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <FileCode className="w-3 h-3 text-cyan-400" /> {edit.file}
                      </span>
                    </div>

                    <span className="text-slate-500 text-[10px]">
                      {formatTimeAgo(edit.timestamp)}
                    </span>
                  </div>

                  <p className="text-slate-300 mb-2">{edit.summary}</p>

                  {edit.snippet && (
                    <div className="p-2 rounded bg-black/40 border border-slate-800/80 text-[10px] text-slate-400 truncate">
                      <code>{edit.snippet}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Standup Meeting History */}
      {standupHistory.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> STANDUP ACCUSATION LOGS
          </h3>
          <div className="space-y-2">
            {standupHistory.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs font-mono flex items-center justify-between">
                <span>Meeting #{item.round}: Accused: <strong className="text-white">{item.accusedName}</strong></span>
                {item.eliminated ? (
                  <span className="text-rose-400 font-bold">EJECTED (Was: {item.role})</span>
                ) : (
                  <span className="text-slate-400">No Consensus / Skipped</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
