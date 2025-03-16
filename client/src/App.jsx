import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import Landing from "./pages/Landing";
import { Toaster } from "./components/ui/toaster";

function AppContent() {
  return (
    <>
      <Toaster />

      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
