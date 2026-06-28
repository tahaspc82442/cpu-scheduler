# 🖥️ Interactive CPU Scheduling Simulator

![CPU Scheduler Demo](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)

**Live Demo:** [cpu-scheduler-tahaspc.vercel.app](https://cpu-scheduler-tahaspc.vercel.app)

An interactive, educational web application designed to visualize and experiment with operating system CPU scheduling algorithms. Built to make complex OS concepts intuitive through real-time visualizations and interactive coding sandboxes.

---

## ✨ Features

- **Live Visualizations:** Watch processes dynamically move between the Ready Queue and the CPU Core with smooth animations.
- **Real-Time Gantt Chart:** A dynamic timeline that plots CPU allocation on every clock tick.
- **Live Statistics:** Instantly calculates Average Waiting Time, Average Turnaround Time, and CPU Utilization to compare algorithmic efficiency.
- **Standard Algorithms Included:**
  - First-Come, First-Serve (FCFS)
  - Shortest Job First (SJF - Non-Preemptive)
  - Shortest Remaining Time First (SRTF - Preemptive)
  - Round Robin (RR - Preemptive)
  - Priority Scheduling (Non-Preemptive)
- 👨‍💻 **"Code Your Own" Algorithm Sandbox:** 
  - Features an embedded VS Code-style editor (Monaco Editor).
  - Write custom JavaScript scheduling logic on the fly.
  - Safely compiles and executes your code every tick to dictate the CPU's behavior.

---

## 🚀 Getting Started Locally

If you'd like to run or modify this project on your own machine:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tahaspc82442/cpu-scheduler.git
   cd cpu-scheduler
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` (or whichever port Vite gives you).

---

## 🛠️ Tech Stack

- **Framework:** React + Vite
- **Styling:** Raw CSS (Glassmorphism design language)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Code Editor:** `@monaco-editor/react`

---

## 📝 Example Sandbox Algorithm

Want to test out the custom sandbox? Copy and paste this **"Worst Possible Scheduler (Anti-SJF)"** algorithm into the editor. It intentionally picks the longest job first to ruin your system's efficiency!

```javascript
// Combine the ready queue and the currently running process
const pool = currentRunning ? [...readyQueue, currentRunning] : [...readyQueue];

if (pool.length === 0) return null;

// Sort descending by remaining time (biggest jobs first)
pool.sort((a, b) => b.remainingTime - a.remainingTime);

// Return the ID of the heaviest job
return pool[0].id;
```
