import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, token } = useAuth();

  return (
    <nav className="bg-gray-900 text-white flex justify-between px-6 py-3 items-center">
      <div className="flex gap-4 items-center">
        {token ? (
          <>
            <Link to="/dashboard" className="hover:text-blue-400">
              Dashboard
            </Link>
            <Link to="/missions" className="hover:text-blue-400">
              Misiones
            </Link>
            <Link to="/materials" className="hover:text-blue-400">
              Materiales
            </Link>
            <Link to="/transmutations" className="hover:text-blue-400">
              Transmutaciones
            </Link>
            {user?.role === "supervisor" && (
              <>
                <Link to="/alchemists" className="hover:text-blue-400">
                  Alquimistas
                </Link>
                <Link to="/audits" className="hover:text-blue-400">
                  Auditorías
                </Link>
              </>
            )}
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

      {token && user && (
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right leading-tight">
            <p className="font-semibold">{user.name}</p>
            <p className="text-gray-300">{user.email}</p>
            <p className="text-gray-400 capitalize">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
