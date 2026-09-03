import React from 'react';
import { AlertTriangle, Terminal, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { sound } from '../utils/audio';

export function HandoffScreen({ incidentReport, timer, challengeTitle, onSkip }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in zoom-in-95 duration-400">
      <div className="glass-panel-glow rounded-3xl p-8 border-rose-500/40 shadow-2xl relative overflow-hidden">
        {/* Urgent header strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rose-500/20 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  SEV-1 PRODUCTION INCIDENT
                </span>
                <span className="text-xs font-mono text-slate-400">THE HANDOFF</span>
              </div>
              <h2 className="text-2xl font-black font-heading text-white mt-1">
                {challengeTitle || 'Project Nimbus Incident Takeover'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right font-mono">
              <span className="text-[10px] uppercase text-slate-400 block">HANDOFF IN</span>
              <span className="text-2xl font-bold text-rose-400 tracking-wider">{timer}s</span>
            </div>
            {onSkip && (
              <button
                onClick={() => { sound.playClick(); onSkip(); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <span>Jump In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Markdown-like Incident report briefing */}
        <div className="space-y-4 font-mono text-xs sm:text-sm text-slate-300 bg-slate-950/60 rounded-2xl p-6 border border-slate-800/80 leading-relaxed whitespace-pre-line max-h-[50vh] overflow-y-auto">
          <div className="flex items-center gap-2 text-cyan-400 pb-2 border-b border-slate-800 font-bold text-xs uppercase tracking-wider">
            <Terminal className="w-4 h-4" /> INCIDENT DOSSIER // DEPLOYED AUTOMATED DIAGNOSTICS
          </div>
          {incidentReport}
        </div>

        {/* Footer instructions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Shared repository loaded. All keystrokes and test executions are synchronized live.</span>
          </div>
          <span className="text-rose-400 font-bold">Watch your teammates carefully.</span>
        </div>
      </div>
    </div>
  );
}
