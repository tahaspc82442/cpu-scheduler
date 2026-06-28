export class Process {
  constructor(id, arrivalTime, burstTime, priority = 0) {
    this.id = id;
    this.arrivalTime = arrivalTime;
    this.burstTime = burstTime;
    this.priority = priority;
    
    // Tracking properties
    this.remainingTime = burstTime;
    this.startTime = -1;
    this.completionTime = -1;
    this.waitingTime = 0;
    this.turnAroundTime = 0;
    
    // Status can be: 'New', 'Ready', 'Running', 'Completed'
    this.status = 'New';
  }
}

export class SchedulerEngine {
  constructor(algorithm = 'FCFS', timeQuantum = 2) {
    this.algorithm = algorithm;
    this.timeQuantum = timeQuantum;
    this.currentTime = 0;
    this.processes = []; // All processes
    
    this.readyQueue = []; // Processes waiting to run
    this.completedQueue = []; // Processes finished
    
    this.currentRunning = null; // Process currently on CPU
    
    // For Round Robin
    this.quantumRemaining = timeQuantum;
    
    // Gantt chart: array of { processId, startTime, endTime }
    this.ganttChart = []; 
  }

  addProcess(p) {
    this.processes.push(p);
  }

  // Called on every "tick" (e.g. 1 second)
  tick() {
    // 1. Move arrived processes to Ready Queue
    for (let p of this.processes) {
      if (p.status === 'New' && p.arrivalTime <= this.currentTime) {
        p.status = 'Ready';
        this.readyQueue.push(p);
      }
    }

    // Sort Ready Queue if needed
    this.sortReadyQueue();

    let customNextId = undefined;
    if (this.algorithm === 'Custom' && this.customSchedulerCallback) {
      try {
        // We pass copies so they can't mutate the internal engine state directly
        const rqCopy = this.readyQueue.map(p => ({...p}));
        const currCopy = this.currentRunning ? {...this.currentRunning} : null;
        customNextId = this.customSchedulerCallback(rqCopy, currCopy, this.currentTime);
      } catch (e) {
        throw new Error("Custom Logic Error: " + e.message);
      }
    }

    // 2. Handle currently running process
    if (this.currentRunning) {
      this.currentRunning.remainingTime--;
      
      if (this.algorithm === 'RR') {
        this.quantumRemaining--;
      }
      
      if (this.currentRunning.remainingTime === 0) {
        this.currentRunning.status = 'Completed';
        this.currentRunning.completionTime = this.currentTime + 1;
        this.currentRunning.turnAroundTime = this.currentRunning.completionTime - this.currentRunning.arrivalTime;
        this.currentRunning.waitingTime = this.currentRunning.turnAroundTime - this.currentRunning.burstTime;
        
        this.completedQueue.push(this.currentRunning);
        this._updateGantt(this.currentRunning.id, this.currentTime, this.currentTime + 1);
        this.currentRunning = null;
      } 
      else if (this.algorithm === 'RR' && this.quantumRemaining === 0) {
        this.currentRunning.status = 'Ready';
        this.readyQueue.push(this.currentRunning);
        this._updateGantt(this.currentRunning.id, this.currentTime - this.timeQuantum, this.currentTime + 1);
        this.currentRunning = null;
      } 
      else if (this.algorithm === 'Custom' && customNextId !== this.currentRunning.id) {
        // Custom logic requested preempt!
        this.currentRunning.status = 'Ready';
        this.readyQueue.push(this.currentRunning);
        this._updateGantt(this.currentRunning.id, this.currentTime, this.currentTime + 1);
        this.currentRunning = null;
      }
      else {
        this._updateGantt(this.currentRunning.id, this.currentTime, this.currentTime + 1);
      }
    } else {
      this._updateGantt(null, this.currentTime, this.currentTime + 1);
    }

    // 3. Schedule next process if CPU is free
    if (!this.currentRunning && this.readyQueue.length > 0) {
      if (this.algorithm === 'Custom') {
        if (customNextId) {
          let idx = this.readyQueue.findIndex(p => p.id === customNextId);
          if (idx !== -1) {
            this.currentRunning = this.readyQueue.splice(idx, 1)[0];
          }
        }
      } else {
        this.currentRunning = this.readyQueue.shift();
      }

      if (this.currentRunning) {
        this.currentRunning.status = 'Running';
        if (this.currentRunning.startTime === -1) {
          this.currentRunning.startTime = this.currentTime;
        }
        if (this.algorithm === 'RR') {
          this.quantumRemaining = this.timeQuantum;
        }
      }
    }

    this.currentTime++;
  }
  
  sortReadyQueue() {
    if (this.algorithm === 'SJF') {
      // Non-preemptive SJF: sort by shortest burst time
      this.readyQueue.sort((a, b) => a.burstTime - b.burstTime);
    } else if (this.algorithm === 'SRTF') {
       // Shortest Remaining Time First (Preemptive)
       this.readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
       // Check if we need to preempt current running
       if (this.currentRunning && this.readyQueue.length > 0) {
          if (this.readyQueue[0].remainingTime < this.currentRunning.remainingTime) {
             let preempted = this.currentRunning;
             preempted.status = 'Ready';
             this.currentRunning = this.readyQueue.shift();
             this.currentRunning.status = 'Running';
             this.readyQueue.push(preempted);
             this.readyQueue.sort((a, b) => a.remainingTime - b.remainingTime); // resort
          }
       }
    } else if (this.algorithm === 'Priority') {
      // Lower number = higher priority
      this.readyQueue.sort((a, b) => a.priority - b.priority);
    }
  }

  _updateGantt(pid, start, end) {
    if (this.ganttChart.length > 0) {
      let last = this.ganttChart[this.ganttChart.length - 1];
      if (last.processId === pid) {
        last.endTime = end; // extend block
        return;
      }
    }
    this.ganttChart.push({ processId: pid, startTime: start, endTime: end });
  }
  
  getStats() {
    let completed = this.completedQueue;
    if (completed.length === 0) return { avgWait: 0, avgTurnaround: 0, cpuUtilization: 0 };
    
    let totalWait = 0;
    let totalTurn = 0;
    let totalBurst = 0;
    
    for (let p of completed) {
      totalWait += p.waitingTime;
      totalTurn += p.turnAroundTime;
      totalBurst += p.burstTime;
    }
    
    return {
      avgWait: (totalWait / completed.length).toFixed(2),
      avgTurnaround: (totalTurn / completed.length).toFixed(2),
      cpuUtilization: ((totalBurst / this.currentTime) * 100).toFixed(1)
    };
  }
}
