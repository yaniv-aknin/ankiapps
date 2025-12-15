import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Settings from './pages/Settings';
import Generate from './pages/Generate';
import Review from './pages/Review';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/review" element={<Review />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
