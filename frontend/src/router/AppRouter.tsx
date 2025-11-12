import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login.tsx";
import Dashboard from "../pages/Dashboard.tsx";
import Alchemists from "../pages/Alchemists.tsx";
import Missions from "../pages/Missions.tsx";
import Materials from "../pages/Materials.tsx";
import Transmutations from "../pages/Transmutations.tsx";
import Audits from "../pages/Audits.tsx";
import { useAuth } from "../context/AuthContext";
import Register from "../pages/Register.tsx";

export default function AppRouter() {
  const { token, user } = useAuth();

  if (!token)
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );

  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      {user?.role === "supervisor" && (
        <>
          <Route path="/alchemists" element={<Alchemists />} />
          <Route path="/audits" element={<Audits />} />
        </>
      )}
      <Route path="/missions" element={<Missions />} />
      <Route path="/materials" element={<Materials />} />
      <Route path="/transmutations" element={<Transmutations />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
