import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { TestPanel } from './TestPanel';
import { 
  FileCode, 
  Play, 
  Users, 
  AlertTriangle, 
  Flame, 
  Shield, 
  Bug, 
  Clock, 
  Lock,
  Sparkles,
  Info
} from 'lucide-react';
import { sound } from '../utils/audio';

export function EditorScreen({
  codebase,
  testResults = [],
  timer,
  myRole,
  onRunTests,
  onCodeChange,
  onCallStandup,
  players = [],
  myId,
  phase,
  isTesting,
  lastCommit,
  lastTestRun,
  editTimeline = []
}) {
  const files = codebase?.files || [];
  const [activeFileName, setActiveFileName] = useState(files[0]?.name || 'auth.js');
  const [mobileTab, setMobileTab] = useState('editor'); // 'editor' | 'tests'
  const [anonymousEditAlert, setAnonymousEditAlert] = useState(false);
  const editorRef = useRef(null);
  const prevActiveFileNameRef = useRef(activeFileName);
  // Track what we last submitted so we can detect genuinely external changes
  const lastSubmittedCodeRef = useRef({});
  // Track last known remote content per file to detect external updates
  const lastRemoteContentRef = useRef({});

  const activeFile = files.find(f => f.name === activeFileName) || files[0];

  // When the active file changes, always load that file's content into the editor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFile) return;

    const fileChanged = prevActiveFileNameRef.current !== activeFileName;
    prevActiveFileNameRef.current = activeFileName;

    if (fileChanged) {
      // Switching files: load content unconditionally
      editor.setValue(activeFile.content || '');
      lastRemoteContentRef.current[activeFileName] = activeFile.content || '';
      return;
    }

    // Same file: only apply remote update if it came from an EXTERNAL source
    // i.e. it differs from what we last submitted AND differs from last known remote
    const incomingRemote = activeFile.content || '';
    const lastRemote = lastRemoteContentRef.current[activeFileName];
    const lastSubmitted = lastSubmittedCodeRef.current[activeFileName];

    // If remote content changed vs what we knew before (teammate or NPC edit)
    if (incomingRemote !== lastRemote) {
      lastRemoteContentRef.current[activeFileName] = incomingRemote;

      // Only overwrite editor if the new content is NOT what we ourselves submitted
      if (incomingRemote !== lastSubmitted) {
        const model = editor.getModel();
        if (model) {
          const pos = editor.getPosition();
          const sel = editor.getSelections();
          model.pushEditOperations(
            [],
            [{ range: model.getFullModelRange(), text: incomingRemote }],
            () => null
          );
          if (pos) editor.setPosition(pos);
          if (sel) editor.setSelections(sel);

          // Flash subtle anonymous update indicator
          setAnonymousEditAlert(true);
          const t = setTimeout(() => setAnonymousEditAlert(false), 2500);
          return () => clearTimeout(t);
        }
      }
    }
  }, [activeFile?.content, activeFileName]);

  // Seed initial remote ref on first mount / file load
  useEffect(() => {
    if (activeFile) {
      const fn = activeFile.name;
      if (lastRemoteContentRef.current[fn] === undefined) {
        lastRemoteContentRef.current[fn] = activeFile.content || '';
      }
    }
  }, [activeFile?.name]);

  const handleEditorChange = (value) => {
    // value is provided by Monaco — no need to read from ref here
    // We intentionally do NOT broadcast keystroke-level changes (private edits)
  };

  const handleRunTestsFlushed = () => {
    if (isTesting) return;
    const editor = editorRef.current;
    const currentCode = editor ? editor.getValue() : (activeFile?.content || '');
    const fileName = activeFile?.name;
    // Record what we just submitted so remote sync won't wipe our code
    if (fileName) {
      lastSubmittedCodeRef.current[fileName] = currentCode;
      lastRemoteContentRef.current[fileName] = currentCode;
    }
    // Submit current editor code to server → run tests → sync to teammates
    onRunTests(fileName, currentCode);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Seed initial content tracking for the first file
    if (activeFile) {
      lastRemoteContentRef.current[activeFile.name] = activeFile.content || '';
    }

    // Add keyboard shortcut Ctrl+Enter or Cmd+Enter to run tests
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunTestsFlushed();
    });
  };

  const formatTimer = (seconds) => {
    if (seconds === undefined || seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isSaboteur = myRole === 'saboteur';

  return (
    <div className="flex flex-col h-[calc(100vh-62px)] bg-[#080a11] overflow-hidden">
      {/* Top Workspace Toolbar */}
      <div className="glass-panel border-b border-white/10 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        {/* File Tabs & Mobile Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center glass-pill p-0.5 rounded-xl">
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => { setActiveFileName(file.name); sound.playClick(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFileName === file.name
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${activeFileName === file.name ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{file.name}</span>
                {file.readOnly && <Lock className="w-2.5 h-2.5 text-slate-500" title="Read only test file" />}
              </button>
            ))}
          </div>

          {/* Mobile switcher */}
          <div className="flex lg:hidden glass-pill p-0.5 rounded-xl ml-2">
            <button
              onClick={() => setMobileTab('editor')}
              className={`px-3 py-1 rounded-lg text-xs font-mono ${mobileTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Code
            </button>
            <button
              onClick={() => setMobileTab('tests')}
              className={`px-3 py-1 rounded-lg text-xs font-mono ${mobileTab === 'tests' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Tests ({testResults.length})
            </button>
          </div>
        </div>

        {/* Center: Live Anonymous Edit Alert */}
        {anonymousEditAlert && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono animate-pulse">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Anonymous codebase update synced</span>
          </div>
        )}

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">

          {/* Live: Last Committed By indicator */}
          {lastTestRun && !isTesting && (
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
              lastTestRun.allPassed
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              <span className="text-slate-400">Last push:</span>
              <span className="font-bold text-white">{lastTestRun.ranBy}</span>
              <span className={`font-bold ${
                lastTestRun.allPassed ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {lastTestRun.passedCount}/{lastTestRun.totalCount}
                {lastTestRun.allPassed ? ' ✓' : ' ✗'}
              </span>
            </div>
          )}
          {/* Emergency Standup Call Button */}
          <button
            onClick={() => onCallStandup('Emergency discussion called by teammate')}
            className="px-3 py-1.5 rounded-xl glass-card-interactive-rose border-rose-500/40 hover:border-rose-500 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Call an emergency standup discussion to vote out suspected saboteur"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">CALL</span> STANDUP
          </button>

          {/* Run Tests Button */}
          <button
            onClick={handleRunTestsFlushed}
            disabled={isTesting}
            className={`px-4 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isTesting
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 glow-emerald'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RUN TESTS</span>
            <span className="text-[10px] opacity-70 hidden md:inline border-l border-emerald-400/40 pl-1.5">Ctrl+Enter</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
        {/* Left: Monaco Editor (7 or 8 cols) */}
        <div className={`lg:col-span-8 flex flex-col h-full overflow-hidden ${mobileTab === 'tests' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-1 relative">
            {activeFile && (
              <Editor
                height="100%"
                language="javascript"
                theme="vs-dark"
                defaultValue={activeFile.content || ''}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  readOnly: Boolean(activeFile.readOnly),
                  fontSize: 13.5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontLigatures: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  cursorBlinking: 'smooth',
                  renderLineHighlight: 'all',
                  tabSize: 2,
                  wordWrap: 'on'
                }}
              />
            )}

            {/* Read-only overlay badge */}
            {activeFile?.readOnly && (
              <div className="absolute top-3 right-5 z-20 px-2.5 py-1 rounded-md glass-panel text-slate-400 text-xs font-mono flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Test Suite (Reference Only)</span>
              </div>
            )}
          </div>

          {/* Bottom Editor Status Ribbon */}
          <div className="h-9 glass-panel border-t border-white/10 px-4 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-200">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" /> {activeFile?.name}
              </span>
              <span className="hidden sm:inline text-slate-500">UTF-8 • JavaScript</span>
            </div>

            {/* Discreet Role Reminder */}
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isSaboteur
                ? 'bg-rose-950/50 text-rose-300 border border-rose-500/40'
                : 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/40'
            }`}>
              {isSaboteur ? <Bug className="w-3 h-3 text-rose-400" /> : <Shield className="w-3 h-3 text-cyan-400" />}
              <span>{isSaboteur ? 'SABOTEUR (KEEP IT BROKEN)' : 'ENGINEER (FIX ALL TESTS)'}</span>
            </div>
          </div>
        </div>

        {/* Right: Test Verification Panel (4 or 5 cols) */}
        <div className={`lg:col-span-4 h-full overflow-hidden ${mobileTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
          <TestPanel
            testResults={testResults}
            isTesting={isTesting}
            onRunTests={handleRunTestsFlushed}
            editTimeline={editTimeline}
            players={players}
            lastCommit={lastCommit}
            lastTestRun={lastTestRun}
          />
        </div>
      </div>
    </div>
  );
}
