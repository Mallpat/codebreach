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
  isTesting
}) {
  const files = codebase?.files || [];
  const [activeFileName, setActiveFileName] = useState(files[0]?.name || 'auth.js');
  const [mobileTab, setMobileTab] = useState('editor'); // 'editor' | 'tests'
  const [anonymousEditAlert, setAnonymousEditAlert] = useState(false);
  const editorRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const prevActiveFileNameRef = useRef(activeFileName);

  const activeFile = files.find(f => f.name === activeFileName) || files[0];

  // Smoothly sync remote file updates into Monaco without cursor jumps or glitches
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFile) return;

    const fileChanged = prevActiveFileNameRef.current !== activeFileName;
    prevActiveFileNameRef.current = activeFileName;

    const currentEditorText = editor.getValue();
    const targetText = activeFile.content || '';

    if (fileChanged) {
      editor.setValue(targetText);
      return;
    }

    // Only update if remote content changed and is different from local buffer
    if (currentEditorText !== targetText) {
      const model = editor.getModel();
      if (model) {
        const pos = editor.getPosition();
        const sel = editor.getSelections();

        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: targetText }],
          () => null
        );

        if (pos) editor.setPosition(pos);
        if (sel) editor.setSelections(sel);

        // Flash subtle anonymous update indicator
        setAnonymousEditAlert(true);
        const t = setTimeout(() => setAnonymousEditAlert(false), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [activeFile?.content, activeFileName]);

  const handleEditorChange = (value) => {
    if (!activeFile || activeFile.readOnly) return;
    isTypingRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce network emit by 120ms to prevent socket saturation & cursor rubberbanding
    debounceTimerRef.current = setTimeout(() => {
      onCodeChange(activeFile.name, value || '');
      isTypingRef.current = false;
    }, 120);
  };

  const handleRunTestsFlushed = () => {
    if (debounceTimerRef.current && editorRef.current && activeFile) {
      clearTimeout(debounceTimerRef.current);
      onCodeChange(activeFile.name, editorRef.current.getValue() || '');
    }
    onRunTests();
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

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
      <div className="bg-[#0e121d] border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* File Tabs & Mobile Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => { setActiveFileName(file.name); sound.playClick(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFileName === file.name
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${activeFileName === file.name ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{file.name}</span>
                {file.readOnly && <Lock className="w-2.5 h-2.5 text-slate-500" title="Read only test file" />}
              </button>
            ))}
          </div>

          {/* Mobile switcher */}
          <div className="flex lg:hidden bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 ml-2">
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
          {/* Emergency Standup Call Button */}
          <button
            onClick={() => onCallStandup('Emergency discussion called by teammate')}
            className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 hover:border-rose-500 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
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
                value={activeFile.content || ''}
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
              <div className="absolute top-3 right-5 z-20 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-slate-400 text-xs font-mono flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Test Suite (Reference Only)</span>
              </div>
            )}
          </div>

          {/* Bottom Editor Status Ribbon */}
          <div className="h-9 bg-[#0b0e17] border-t border-slate-800 px-4 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" /> {activeFile?.name}
              </span>
              <span className="hidden sm:inline text-slate-500">UTF-8 • JavaScript</span>
            </div>

            {/* Discreet Role Reminder */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
              isSaboteur
                ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                : 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/30'
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
            onRunTests={onRunTests}
          />
        </div>
      </div>
    </div>
  );
}
