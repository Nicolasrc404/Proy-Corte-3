import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    email: "",
    password: "",
    role: "alchemist",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/register", "POST", form);
      alert("Usuario registrado correctamente ✅");
      navigate("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 w-96 flex flex-col gap-3"
      >
        <h2 className="text-xl font-bold text-center mb-2">
          Registro de Usuario
        </h2>

        <input
          type="text"
          placeholder="Nombre completo"
          className="border p-2 rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Especialidad alquímica"
          className="border p-2 rounded"
          value={form.specialty}
          onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          className="border p-2 rounded"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="border p-2 rounded"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <select
          className="border p-2 rounded"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="alchemist">Alchemist</option>
          <option value="supervisor">Supervisor</option>
        </select>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Registrando..." : "Registrarse"}
        </button>

        <p className="text-sm text-center text-gray-600 mt-2">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
