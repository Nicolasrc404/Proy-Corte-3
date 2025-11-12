import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, token } = useAuth();

  return (
    <nav className="bg-gray-900 text-white flex justify-between px-6 py-3 items-center">
      <div className="flex gap-4">
        {token ? (
          <>
            <Link to="/dashboard" className="hover:text-blue-400">
              Dashboard
            </Link>
            {user?.role === "supervisor" && (
              <>
                <Link to="/alchemists" className="hover:text-blue-400">
                  Alchemists
                </Link>
                <Link to="/audits" className="hover:text-blue-400">
                  Audits
                </Link>
              </>
            )}
            <Link to="/missions" className="hover:text-blue-400">
              Missions
            </Link>
            <Link to="/materials" className="hover:text-blue-400">
              Materials
            </Link>
            <Link to="/transmutations" className="hover:text-blue-400">
              Transmutations
            </Link>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-blue-400">
              Iniciar sesión
            </Link>
            <Link to="/register" className="hover:text-blue-400">
              Registrarse
            </Link>
          </>
        )}
      </div>

      {token && (
        <div className="flex items-center gap-4">
          <span className="text-sm italic">{user?.email}</span>
          <button
            onClick={logout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-sm"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
