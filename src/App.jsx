import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CedarGroveAnalytics from './components/AnalyticsDashboard';
import AdminTargets from './components/AdminTargets';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CedarGroveAnalytics />} />
        <Route path="/admin/targets" element={<AdminTargets />} />
      </Routes>
    </Router>
  );
}

export default App;