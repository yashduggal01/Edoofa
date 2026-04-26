import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import './App.css';
import Navbar from './components/Navbar';
import CreateRfqPage from './pages/CreateRfqPage';
import DetailsPage from './pages/DetailsPage';
import ListingPage from './pages/ListingPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <Routes>
          <Route path="/" element={<ListingPage />} />
          <Route path="/create" element={<CreateRfqPage />} />
          <Route path="/rfq/:id" element={<DetailsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
