import React, { useState, useMemo } from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Terminal, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Bot, 
  GitCommit, 
  FileCode, 
  Clock, 
  History, 
  ArrowRight
} from 'lucide-react';

function formatRelativeTime(ts) {
  if (!ts) return '';
  try {
    const diffMs = Math.max(0, Date.now() - ts);
    if (diffMs < 5000) return 'just now';
    if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function TestPanel({ 
  testResults = [], 
  isTesting = false, 
  onRunTests, 
  editTimeline = [], 
  players = [],
  lastCommit = null,
  lastTestRun = null 
}) {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'changes'
  const [expandedTest, setExpandedTest] = useState(null);
  const [expandedChangeId, setExpandedChangeId] = useState(null);
  const [fileFilter, setFileFilter] = useState('all');

  const safeTestResults = Array.isArray(testResults) ? testResults : [];
  const safeTimeline = Array.isArray(editTimeline) ? editTimeline : [];

  const passedCount = safeTestResults.filter(t => Boolean(t?.passed)).length;
  const totalCount = safeTestResults.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  // Distinct file names from timeline
  const editedFiles = useMemo(() => {
    const set = new Set();
    safeTimeline.forEach(e => {
      if (e?.file) set.add(e.file);
    });
    return Array.from(set);
  }, [safeTimeline]);

  const filteredTimeline = useMemo(() => {
    if (fileFilter === 'all') return safeTimeline;
    return safeTimeline.filter(e => e?.file === fileFilter);
  }, [safeTimeline, fileFilter]);

  // Latest revision
  const latestEdit = safeTimeline.length > 0 ? safeTimeline[safeTimeline.length - 1] : null;

  const getAuthorName = (edit) => {
    if (edit?.playerName) return edit.playerName;
    if (edit?.playerId && Array.isArray(players)) {
      const found = players.find(p => p.id === edit.playerId);
      if (found?.name) return found.name;
    }
    return 'Anonymous Teammate';
  };

  return (
    <div className="flex flex-col h-full glass-panel border-t lg:border-t-0 lg:border-l border-white/10 text-xs font-mono select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d101a]/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-bold uppercase tracking-wider text-slate-200 truncate">VERIFICATION SUITE</span>
          {totalCount > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                allPassed 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              }`}>
                {passedCount} / {totalCount} PASSING
              </span>
              {passedCount < totalCount && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {totalCount - passedCount} {totalCount - passedCount === 1 ? 'ERROR' : 'ERRORS'}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onRunTests}
          disabled={isTesting}
          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 ${
            isTesting
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 glow-emerald'
          }`}
          title="Run Jest test suite with your code & sync to team (Ctrl+Enter)"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Sub-Header Navigation Tabs: [ Tests ] vs [ Code Changes ] */}
      <div className="flex items-center border-b border-white/10 bg-[#0a0d16]/70 px-3 py-1.5 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'tests'
              ? 'bg-white/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Tests</span>
          {totalCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              allPassed ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {passedCount}/{totalCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('changes')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
            activeTab === 'changes'
              ? 'bg-white/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Code Changes</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-800 text-slate-300">
            {safeTimeline.length}
          </span>
          {safeTimeline.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </button>

        {activeTab === 'changes' && editedFiles.length > 1 && (
          <div className="ml-auto flex items-center gap-1 text-[10px]">
            <select
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              className="bg-black/60 border border-white/15 text-slate-300 rounded px-1.5 py-0.5 text-[10px] outline-none"
            >
              <option value="all">All Files ({safeTimeline.length})</option>
              {editedFiles.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* ================= TAB 1: TESTS ================= */}
        {activeTab === 'tests' && (
          <>
            {/* Quick banner: Latest code modification alert */}
            {latestEdit && (
              <div 
                onClick={() => setActiveTab('changes')}
                className="p-2.5 rounded-xl glass-card-interactive border-cyan-500/30 flex items-center justify-between gap-2 cursor-pointer hover:border-cyan-400/50 transition-all text-[11px]"
                title="Click to view all code changes and diffs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                    <GitCommit className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold truncate">
                      <span>{getAuthorName(latestEdit)}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-cyan-300 flex items-center gap-1 truncate">
                        <FileCode className="w-3 h-3 shrink-0" /> {latestEdit.file}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-2">
                      <span>{latestEdit.summary || 'Code updated'}</span>
                      <span className="text-slate-500">•</span>
                      <span>{formatRelativeTime(latestEdit.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 shrink-0">
                  <span>Audit Diff</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            )}

            {safeTestResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 min-h-[220px]">
                <Terminal className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                <p className="font-bold text-slate-300 text-sm">No test runs executed yet</p>
                <p className="text-slate-400 text-[11px] mt-1 max-w-xs">
                  Click <span className="text-emerald-400 font-bold">"Run Tests"</span> to execute automated tests against your current code.
                </p>
              </div>
            ) : (
              safeTestResults.map((test, idx) => {
                const isExpanded = expandedTest === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl transition-all overflow-hidden ${
                      test?.passed
                        ? 'glass-card-interactive border-emerald-500/30'
                        : 'glass-card-interactive-rose border-rose-500/50 shadow-sm'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedTest(isExpanded ? null : idx)}
                      className="p-3 flex items-start justify-between gap-2 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {test?.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <span className={`font-semibold block truncate ${test?.passed ? 'text-slate-200' : 'text-rose-200'}`}>
                            {test?.testName || `Test #${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Terminal className="w-3 h-3 text-cyan-400" /> Automated Verification Run
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Expanded Assertion / Output Diff */}
                    {(!test?.passed || isExpanded) && (
                      <div className="p-3 bg-black/50 border-t border-white/10 text-[11px] font-mono overflow-x-auto leading-relaxed text-slate-300 whitespace-pre-wrap">
                        <span className="text-slate-400 block mb-1 uppercase font-bold text-[10px]">
                          {test?.passed ? 'OUTPUT LOG:' : 'FAILURE REASON / ASSERTION ERROR:'}
                        </span>
                        <span className={test?.passed ? 'text-emerald-400' : 'text-rose-400'}>
                          {test?.output || 'No output log recorded'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ================= TAB 2: CODE CHANGES & AUDIT TRAIL ================= */}
        {activeTab === 'changes' && (
          <>
            <div className="flex items-center justify-between pb-1 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wider">
                <GitCommit className="w-3.5 h-3.5 text-cyan-400" /> Code Updates Log ({filteredTimeline.length})
              </span>
              <span className="text-[10px] text-slate-500">
                Newest First
              </span>
            </div>

            {filteredTimeline.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 min-h-[220px]">
                <History className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                <p className="font-bold text-slate-300 text-sm">No code updates recorded yet</p>
                <p className="text-slate-400 text-[11px] mt-1 max-w-xs">
                  Whenever you or a teammate clicks <span className="text-emerald-400 font-bold">"Run Tests"</span>, code revisions, commit diffs, and verification metrics will appear here.
                </p>
              </div>
            ) : (
              filteredTimeline.slice().reverse().map((edit, rIdx) => {
                const revNum = filteredTimeline.length - rIdx;
                const isExpanded = expandedChangeId === (edit.id || rIdx);
                const hasDiff = Array.isArray(edit.changes) && edit.changes.length > 0;
                const author = getAuthorName(edit);

                return (
                  <div
                    key={edit.id || rIdx}
                    className="rounded-xl glass-card-interactive border-white/10 hover:border-cyan-500/40 transition-all overflow-hidden"
                  >
                    <div 
                      onClick={() => setExpandedChangeId(isExpanded ? null : (edit.id || rIdx))}
                      className="p-3 cursor-pointer hover:bg-white/5 transition-colors space-y-2"
                    >
                      {/* Top row: revision badge, author, file, time */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                            #{revNum}
                          </span>

                          <span className="flex items-center gap-1 font-bold text-slate-200 text-xs truncate">
                            {edit.isNpc ? (
                              <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                            <span className="truncate">{author}</span>
                          </span>

                          <span className="text-slate-400 text-[10px] flex items-center gap-1 shrink-0">
                            <FileCode className="w-3 h-3 text-cyan-400" /> {edit.file}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(edit.timestamp)}</span>
                          <div className="ml-1 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>

                      {/* Summary line & diff badges */}
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <p className="text-slate-300 font-sans truncate min-w-0">
                          {edit.summary || 'Code modification'}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {edit.addedCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                              +{edit.addedCount}
                            </span>
                          )}
                          {edit.removedCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                              -{edit.removedCount}
                            </span>
                          )}
                          {edit.testRun && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                              edit.testRun.allPassed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}>
                              {edit.testRun.passedCount}/{edit.testRun.totalCount} {edit.testRun.allPassed ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable diff / preview block */}
                    {isExpanded && (
                      <div className="p-3 bg-black/60 border-t border-white/10 space-y-2 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                          <span>{hasDiff ? 'LINE-BY-LINE DIFF PREVIEW:' : 'CODE SNIPPET PREVIEW:'}</span>
                          <span className="text-slate-500">{edit.file}</span>
                        </div>

                        {hasDiff ? (
                          <div className="rounded-lg overflow-hidden border border-white/10 divide-y divide-white/5 font-mono text-[10.5px]">
                            {edit.changes.map((ch, chIdx) => {
                              const isAdd = ch.type === 'add';
                              return (
                                <div
                                  key={chIdx}
                                  className={`px-2.5 py-1 flex items-start gap-2 overflow-x-auto ${
                                    isAdd
                                      ? 'bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500'
                                      : 'bg-rose-950/30 text-rose-300 border-l-2 border-rose-500'
                                  }`}
                                >
                                  <span className="w-5 text-slate-500 select-none text-right shrink-0">
                                    {ch.lineNum || ''}
                                  </span>
                                  <span className="font-bold select-none shrink-0">
                                    {isAdd ? '+' : '-'}
                                  </span>
                                  <span className="whitespace-pre">
                                    {ch.text || ch.content || ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : edit.snippet ? (
                          <div className="p-2.5 rounded-lg bg-black/70 border border-white/10 text-slate-300 whitespace-pre-wrap leading-relaxed">
                            <code>{edit.snippet}</code>
                          </div>
                        ) : (
                          <p className="text-slate-500 italic text-[10px]">No diff details recorded for this modification.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
