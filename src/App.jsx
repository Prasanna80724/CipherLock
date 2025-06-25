import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./home/home";
import Menu from "./menu/Menu";
import Notes from "./notes/Notes";
import Link from "./Link/link"
import Password from "./Password/password"

const isAuthenticated = () => {
  return !!localStorage.getItem("Safe-notes"); // returns true if logged in
};

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu"
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          }
        />
        <Route path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />

          <Route path="/links"
          element={
            <ProtectedRoute>
              <Link/>
            </ProtectedRoute>
          }
        />

        <Route path="/passwords"
          element={
            <ProtectedRoute>
              <Password/>
            </ProtectedRoute>
          }
        />
        
        
      
      </Routes>
    </Router>
  );
}

export default App;
