import { Terminal } from './components/Terminal';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AdminDashboard } from './components/AdminDashboard';

import { MusicPlayer } from './components/MusicPlayer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Terminal />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      <MusicPlayer />
    </Router>
  );
}

export default App;
