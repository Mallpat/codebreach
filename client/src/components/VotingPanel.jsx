import React from 'react';
import { AlertTriangle, Vote, Shield, Bug, UserX, Clock, CheckCircle2, User, FileCode, Bot } from 'lucide-react';
import { sound } from '../utils/audio';

export function VotingPanel({
  players = [],
  votes = {},
  myId,
  onVote,
  timer,
  standupReason
}) {
  const livingPlayers = players.filter(p => p.isAlive);
  const myVote = votes[myId];
  const totalVotesCast = Object.keys(votes).length;

  // Calculate votes for each candidate
  const voteCounts = {};
  for (const targetId of Object.values(votes)) {
    if (targetId) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }
  }

  const handleVote = (targetId) => {
    sound.playClick();
    onVote(targetId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="relative max-w-4xl w-full rounded-3xl p-6 sm:p-8 bg-[#0d0a14] border border-rose-500/50 shadow-2xl shadow-rose-950/80 overflow-hidden">
        {/* Animated Emergency Strobe Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-rose-500/20 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  DAILY STANDUP IN SESSION
                </span>
                <span className="text-xs font-mono text-slate-400">ROUND 4 OF 6</span>
              </div>
              <h2 className="text-2xl font-black font-heading text-white mt-1">
                Root Out The Saboteur
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {standupReason || 'Discussion & Accusation Meeting'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-rose-500/40 flex items-center gap-2 font-mono text-rose-400 glow-rose">
              <Clock className="w-4 h-4" />
              <span className="text-2xl font-bold">{timer}s</span>
            </div>
          </div>
        </div>

        {/* Instructions & Vote Tally summary */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-6 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800">
          <span>Discuss suspicions out loud. Strict majority required to eject.</span>
          <span className="text-cyan-400 font-bold">
            Votes Recorded: {totalVotesCast} / {livingPlayers.length}
          </span>
        </div>

        {/* Suspect Roster Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {players.map((player) => {
            const isMe = player.id === myId;
            const hasVotedForThis = myVote === player.id;
            const currentVotes = voteCounts[player.id] || 0;
            const isAlive = player.isAlive;

            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                  !isAlive
                    ? 'bg-slate-900/30 border-slate-800/40 opacity-50'
                    : hasVotedForThis
                    ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50 glow-rose'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                      !isAlive 
                        ? 'bg-slate-800 text-slate-500' 
                        : isMe 
                        ? 'bg-indigo-600 text-white' 
                        : player.isNpc
                        ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-800 text-slate-200'
                    }`}>
                      {player.isNpc ? <Bot className="w-5 h-5 text-cyan-400" /> : player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-sm text-white">{player.name}</span>
                        {isMe && (
                          <span className="text-[10px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300">YOU</span>
                        )}
                        {player.isNpc && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">AI</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-mono ${isAlive ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                        {isAlive ? (player.isNpc ? 'AI Teammate' : 'Active Teammate') : 'Eliminated'}
                      </span>
                    </div>
                  </div>

                  {/* Vote count badge */}
                  {currentVotes > 0 && isAlive && (
                    <div className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-mono font-bold shadow-md shadow-rose-900/60 animate-pulse">
                      {currentVotes} {currentVotes === 1 ? 'vote' : 'votes'}
                    </div>
                  )}
                </div>

                {/* Last commit / edit info */}
                {player.lastEdit && (
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mb-3 bg-black/30 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                    <FileCode className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">Last edit: {player.lastEdit.file}</span>
                  </div>
                )}

                {/* Vote Action Button */}
                {isAlive ? (
                  <button
                    onClick={() => handleVote(player.id)}
                    disabled={isMe}
                    className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isMe
                        ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                        : hasVotedForThis
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                        : 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40'
                    }`}
                  >
                    <Vote className="w-3.5 h-3.5" />
                    <span>{hasVotedForThis ? 'Voted to Eject' : isMe ? 'Cannot Vote Self' : 'Accuse as Saboteur'}</span>
                  </button>
                ) : (
                  <div className="py-2 text-center text-xs font-mono text-slate-500 flex items-center justify-center gap-1">
                    <UserX className="w-3.5 h-3.5" /> Eliminated
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Skip / Abstain Action Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
          <span className="text-xs font-mono text-slate-400">
            Unsure who is sabotaging? You can skip this round to preserve headcount.
          </span>

          <button
            onClick={() => handleVote('skip')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              myVote === 'skip'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{myVote === 'skip' ? 'Vote Skipped' : 'Skip Vote (Abstain)'}</span>
            {voteCounts['skip'] > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-900 text-slate-300">
                {voteCounts['skip']}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
