import React from 'react';
import { Shield, Bug, Eye, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';

export function RoleRevealModal({ role, onClose }) {
  if (!role) return null;

  const isSaboteur = role === 'saboteur';

  const handleDismiss = () => {
    sound.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`relative max-w-lg w-full rounded-3xl p-8 border shadow-2xl overflow-hidden transition-all ${
        isSaboteur
          ? 'bg-[#140a10] border-rose-500/60 shadow-rose-950/70 glow-rose'
          : 'bg-[#09111c] border-cyan-500/60 shadow-cyan-950/70 glow-cyan'
      }`}>
        {/* Ambient Top Glow */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none ${
          isSaboteur ? 'bg-rose-600' : 'bg-cyan-500'
        }`} />

        <div className="relative z-10 text-center space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono tracking-widest uppercase border bg-black/40 border-white/10 text-slate-300">
            <Eye className="w-3.5 h-3.5 text-rose-400" /> CONFIDENTIAL PERSONNEL ASSIGNMENT
          </div>

          <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center border shadow-xl ${
            isSaboteur
              ? 'bg-rose-950/60 border-rose-500 text-rose-400 shadow-rose-900/40'
              : 'bg-cyan-950/60 border-cyan-500 text-cyan-400 shadow-cyan-900/40'
          }`}>
            {isSaboteur ? (
              <Bug className="w-10 h-10 animate-bounce" />
            ) : (
              <Shield className="w-10 h-10" />
            )}
          </div>

          <div>
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">YOUR ROLE IN THIS SHIFT:</span>
            <h2 className={`text-3xl sm:text-4xl font-black font-heading tracking-tight mt-1 ${
              isSaboteur ? 'text-rose-400' : 'text-cyan-400'
            }`}>
              {isSaboteur ? 'THE SABOTEUR' : 'INCIDENT ENGINEER'}
            </h2>
          </div>

          {/* Role Briefing Box */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-left space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <AlertOctagon className={`w-4 h-4 ${isSaboteur ? 'text-rose-400' : 'text-cyan-400'}`} />
              <span>PRIMARY DIRECTIVES:</span>
            </div>
            
            {isSaboteur ? (
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Keep tests failing:</strong> Silently introduce subtle regressions or revert legitimate fixes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Maintain cover:</strong> Pretend to pair-program and narrate plausible debugging logic in voice/chat.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Win condition:</strong> Shift timer reaches zero with tests failing, without being voted out.</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Fix the codebase:</strong> Analyze failing Jest tests and collaborate to fix the bugs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Root out the saboteur:</strong> Watch who is modifying code and who causes test regressions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Win condition:</strong> Pass all tests before the shift ends, OR vote out the Saboteur in Standup.</span>
                </li>
              </ul>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className={`w-full py-3.5 rounded-xl font-heading font-black text-sm tracking-wider uppercase text-white shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isSaboteur
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/50'
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ACKNOWLEDGE & ENTER REPOSITORY</span>
          </button>
        </div>
      </div>
    </div>
  );
}
