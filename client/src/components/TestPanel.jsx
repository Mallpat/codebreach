import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, Loader2, Terminal, AlertCircle, ChevronDown, ChevronRight, User } from 'lucide-react';

export function TestPanel({ testResults = [], isTesting, onRunTests }) {
  const [expandedTest, setExpandedTest] = useState(null);

  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] border-t lg:border-t-0 lg:border-l border-slate-800 text-xs font-mono">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-[#0d101a] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold uppercase tracking-wider text-slate-200">VERIFICATION SUITE</span>
          {totalCount > 0 && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              allPassed 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {passedCount} / {totalCount} PASSING
            </span>
          )}
        </div>

        <button
          onClick={onRunTests}
          disabled={isTesting}
          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
            isTesting
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 glow-emerald'
          }`}
          title="Run Jest test suite (Ctrl+Enter)"
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

      {/* Tests Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {testResults.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Terminal className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
            <p className="font-bold text-slate-400 text-sm">No test runs executed yet</p>
            <p className="text-slate-500 text-[11px] mt-1 max-w-xs">
              Click <span className="text-emerald-400 font-bold">"Run Tests"</span> to inspect current system failures.
            </p>
          </div>
        ) : (
          testResults.map((test, idx) => {
            const isExpanded = expandedTest === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all overflow-hidden ${
                  test.passed
                    ? 'bg-emerald-950/10 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                }`}
              >
                <div
                  onClick={() => setExpandedTest(isExpanded ? null : idx)}
                  className="p-2.5 flex items-start justify-between gap-2 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className={`font-semibold block truncate ${test.passed ? 'text-slate-300' : 'text-rose-200'}`}>
                        {test.testName}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Terminal className="w-3 h-3 text-cyan-400" /> Automated Verification Run
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Assertion / Output Diff */}
                {(!test.passed || isExpanded) && (
                  <div className="p-3 bg-black/50 border-t border-slate-800 text-[11px] font-mono overflow-x-auto leading-relaxed text-slate-300 whitespace-pre-wrap">
                    <span className="text-slate-500 block mb-1 uppercase font-bold text-[10px]">
                      {test.passed ? 'OUTPUT LOG:' : 'FAILURE REASON / ASSERTION ERROR:'}
                    </span>
                    <span className={test.passed ? 'text-emerald-400' : 'text-rose-400'}>
                      {test.output}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
