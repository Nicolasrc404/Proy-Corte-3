import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // ✅ import Link
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/auth/login", "POST", { email, password });
      if (!res?.token) {
        throw new Error("Respuesta inválida del servidor");
      }
      login(res.token, {
        id: res.id,
        name: res.name,
        email: res.email,
        specialty: res.specialty,
        role: res.role,
      });
      navigate("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Credenciales incorrectas";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 w-80 flex flex-col gap-3"
      >
        <h2 className="text-xl font-bold text-center">Iniciar Sesión</h2>
        <input
          type="email"
          placeholder="Correo electrónico"
          className="border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>

        {/* 🔽 Enlace al registro */}
        <p className="text-sm text-center text-gray-600 mt-2">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
