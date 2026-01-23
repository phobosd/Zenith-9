import { Terminal } from './components/Terminal';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AdminDashboard } from './components/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Terminal />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/:tab" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
