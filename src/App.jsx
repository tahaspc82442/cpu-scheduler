import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Activity, Cpu, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Process, SchedulerEngine } from './scheduler';
import './index.css';

const DEFAULT_CUSTOM_CODE = `// Write your custom scheduling algorithm here!
// 
// Parameters available:
// - readyQueue: Array of processes waiting to run
// - currentRunning: The process currently on the CPU (or null)
// - currentTime: The current simulation time (integer)
//
// Return: The ID (string) of the process you want to run next.
// Return null to leave the CPU idle.

if (readyQueue.length > 0) {
    // Example: Always pick the first in the queue (FCFS)
    return readyQueue[0].id;
}

// Keep running current process if queue is empty
return currentRunning ? currentRunning.id : null;
`;

export default function App() {
  const [engine, setEngine] = useState(new SchedulerEngine('FCFS'));
  const [isRunning, setIsRunning] = useState(false);
  const [tickRate, setTickRate] = useState(1000); 
  
  // Custom Code state
  const [customCode, setCustomCode] = useState(DEFAULT_CUSTOM_CODE);
  const [codeError, setCodeError] = useState(null);
  const latestCode = useRef(customCode);

  useEffect(() => {
    latestCode.current = customCode;
  }, [customCode]);

  // State for rendering
  const [time, setTime] = useState(0);
  const [processes, setProcesses] = useState([]);
  const [readyQueue, setReadyQueue] = useState([]);
  const [currentRunning, setCurrentRunning] = useState(null);
  const [completedQueue, setCompletedQueue] = useState([]);
  const [ganttChart, setGanttChart] = useState([]);
  const [stats, setStats] = useState({ avgWait: 0, avgTurnaround: 0, cpuUtilization: 0 });
  
  const [newProc, setNewProc] = useState({ burst: 5, arrival: 0, priority: 1 });
  const [procIdCounter, setProcIdCounter] = useState(1);

  const syncState = (eng) => {
    setTime(eng.currentTime);
    setProcesses([...eng.processes]);
    setReadyQueue([...eng.readyQueue]);
    setCurrentRunning(eng.currentRunning ? { ...eng.currentRunning } : null);
    setCompletedQueue([...eng.completedQueue]);
    setGanttChart([...eng.ganttChart]);
    setStats(eng.getStats());
  };

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        try {
          if (engine.algorithm === 'Custom') {
            engine.customSchedulerCallback = (rq, curr, time) => {
              const userFunc = new Function('readyQueue', 'currentRunning', 'currentTime', latestCode.current);
              return userFunc(rq, curr, time);
            };
          }
          engine.tick();
          syncState(engine);
          setCodeError(null); // Clear errors if it ran successfully

          if (engine.processes.length > 0 && engine.completedQueue.length === engine.processes.length) {
            setIsRunning(false);
          }
        } catch (err) {
          setIsRunning(false);
          setCodeError(err.message);
        }
      }, tickRate);
    }
    return () => clearInterval(interval);
  }, [isRunning, engine, tickRate]);

  const handleAddProcess = () => {
    const p = new Process(`P${procIdCounter}`, parseInt(newProc.arrival), parseInt(newProc.burst), parseInt(newProc.priority));
    engine.addProcess(p);
    setProcIdCounter(prev => prev + 1);
    syncState(engine);
  };

  const handleAlgorithmChange = (e) => {
    const newEng = new SchedulerEngine(e.target.value, engine.timeQuantum);
    processes.forEach(p => {
      newEng.addProcess(new Process(p.id, p.arrivalTime, p.burstTime, p.priority));
    });
    setEngine(newEng);
    syncState(newEng);
    setIsRunning(false);
    setCodeError(null);
  };

  const handleReset = () => {
    const newEng = new SchedulerEngine(engine.algorithm, engine.timeQuantum);
    setEngine(newEng);
    setProcIdCounter(1);
    syncState(newEng);
    setIsRunning(false);
    setCodeError(null);
  };

  const getProcessColor = (pid) => {
    if (!pid) return 'rgba(255,255,255,0.1)';
    const num = parseInt(pid.replace('P', ''));
    return `var(--process-colors-${num % 7})`;
  };

  return (
    <div className="app-container" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Activity color="var(--accent-blue)" size={32} />
        <h1>CPU Scheduling Simulator</h1>
      </header>

      {/* Main Grid: Sandbox Mode vs Normal Mode layout */}
      <div style={{ display: 'grid', gridTemplateColumns: engine.algorithm === 'Custom' ? '500px 1fr 300px' : '1fr 300px', gap: '2rem' }}>
        
        {/* Code Sandbox Panel (Only visible if Custom) */}
        {engine.algorithm === 'Custom' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '800px', padding: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '18px' }}>
              <Code color="var(--accent-amber)" size={20}/> Algorithm Sandbox
            </h2>
            <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={customCode}
                onChange={(val) => setCustomCode(val)}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on'
                }}
              />
            </div>
            {codeError && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid var(--accent-rose)', borderRadius: '8px', color: '#fca5a5', fontFamily: 'monospace', fontSize: '12px', maxHeight: '100px', overflowY: 'auto' }}>
                <strong>Execution Error:</strong><br/>
                {codeError}
              </div>
            )}
          </div>
        )}

        {/* Center Vis Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel">
            <h2>Gantt Chart (Timeline)</h2>
            <div style={{ display: 'flex', height: '60px', marginTop: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
              {ganttChart.map((block, i) => (
                <div 
                  key={i} 
                  style={{ 
                    flex: block.endTime - block.startTime, 
                    background: getProcessColor(block.processId),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRight: '1px solid rgba(0,0,0,0.2)',
                    fontWeight: 'bold', fontSize: '14px',
                    minWidth: block.endTime - block.startTime > 0 ? '30px' : '0'
                  }}
                  title={`Time ${block.startTime} to ${block.endTime}`}
                >
                  {block.processId || 'Idle'}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              <span>Time: 0</span>
              <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>Current: {time}s</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="glass-panel" style={{ textAlign: 'center', border: '1px solid var(--accent-blue)', boxShadow: '0 0 20px var(--accent-blue-glow)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Cpu color="var(--accent-blue)" /> CPU Core
              </h2>
              <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <AnimatePresence mode="popLayout">
                  {currentRunning ? (
                    <motion.div
                      key={currentRunning.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      style={{ 
                        background: getProcessColor(currentRunning.id),
                        padding: '1rem 2rem', borderRadius: '8px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                      }}
                    >
                      <h3 style={{ margin: 0 }}>{currentRunning.id}</h3>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '14px' }}>Remaining: {currentRunning.remainingTime}s</p>
                    </motion.div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>IDLE</span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="glass-panel">
              <h2>Ready Queue</h2>
              <div style={{ height: '150px', marginTop: '1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <AnimatePresence>
                  {readyQueue.map((p, i) => (
                    <motion.div
                      layout
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      key={p.id}
                      style={{ 
                        background: getProcessColor(p.id),
                        padding: '1rem', borderRadius: '8px', minWidth: '80px',
                        textAlign: 'center', flexShrink: 0
                      }}
                    >
                      <strong>{p.id}</strong>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>BT: {p.remainingTime}</div>
                    </motion.div>
                  ))}
                  {readyQueue.length === 0 && <div style={{ color: 'var(--text-muted)', margin: 'auto' }}>Empty</div>}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <h2>Process Workload</h2>
            <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '0.5rem' }}>ID</th>
                  <th>Arrival</th>
                  <th>Burst</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Wait Time</th>
                </tr>
              </thead>
              <tbody>
                {processes.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getProcessColor(p.id) }} />
                      {p.id}
                    </td>
                    <td>{p.arrivalTime}</td>
                    <td>{p.burstTime}</td>
                    <td>{p.priority}</td>
                    <td>{p.status}</td>
                    <td>{p.status === 'Completed' ? p.waitingTime : '-'}</td>
                  </tr>
                ))}
                {processes.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No processes added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>Simulation Controls</h2>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--text-muted)' }}>Algorithm</label>
              <select value={engine.algorithm} onChange={handleAlgorithmChange} style={{ width: '100%' }} disabled={isRunning || time > 0}>
                <option value="FCFS">First-Come-First-Serve (FCFS)</option>
                <option value="SJF">Shortest Job First (Non-Preemptive)</option>
                <option value="SRTF">Shortest Remaining Time (Preemptive)</option>
                <option value="RR">Round Robin (RR)</option>
                <option value="Priority">Priority (Non-Preemptive)</option>
                <option value="Custom" style={{ fontWeight: 'bold', color: 'var(--accent-amber)' }}>[Sandbox] Custom Code</option>
              </select>
            </div>

            {engine.algorithm === 'RR' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--text-muted)' }}>Time Quantum</label>
                <input 
                  type="number" 
                  value={engine.timeQuantum} 
                  onChange={(e) => {
                    const newEng = new SchedulerEngine(engine.algorithm, parseInt(e.target.value) || 1);
                    processes.forEach(p => newEng.addProcess(new Process(p.id, p.arrivalTime, p.burstTime, p.priority)));
                    setEngine(newEng);
                    syncState(newEng);
                  }}
                  style={{ width: '100%' }}
                  disabled={isRunning || time > 0}
                  min="1"
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--text-muted)' }}>Simulation Speed (ms per cycle)</label>
              <input type="range" min="100" max="2000" step="100" value={tickRate} onChange={e => setTickRate(e.target.value)} style={{ width: '100%' }} />
              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>{tickRate}ms</div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn primary" onClick={() => setIsRunning(!isRunning)} style={{ flex: 1, justifyContent: 'center' }}>
                {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
              </button>
              <button className="btn" onClick={handleReset} title="Reset">
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>Add Process</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Arrival Time</label>
                <input type="number" min="0" value={newProc.arrival} onChange={e => setNewProc({...newProc, arrival: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Burst Time</label>
                <input type="number" min="1" value={newProc.burst} onChange={e => setNewProc({...newProc, burst: e.target.value})} style={{ width: '100%' }} />
              </div>
              {(engine.algorithm === 'Priority' || engine.algorithm === 'Custom') && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Priority (Lower = Higher)</label>
                  <input type="number" min="0" value={newProc.priority} onChange={e => setNewProc({...newProc, priority: e.target.value})} style={{ width: '100%' }} />
                </div>
              )}
            </div>
            <button className="btn" onClick={handleAddProcess} style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={18} /> Add Process P{procIdCounter}
            </button>
          </div>

          <div className="glass-panel">
            <h2>Live Statistics</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Avg Waiting Time:</span>
                <span className="mono">{stats.avgWait}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Avg Turnaround:</span>
                <span className="mono">{stats.avgTurnaround}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>CPU Utilization:</span>
                <span className="mono">{stats.cpuUtilization}%</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
