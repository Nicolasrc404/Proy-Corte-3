import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "alchemist",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Crear el usuario
    const res = await apiFetch("/auth/register", "POST", form);
    if (!res?.data) {
      alert("Error al registrar usuario");
      return;
    }

    // 2️⃣ Iniciar sesión automáticamente
    const loginRes = await apiFetch("/auth/login", "POST", {
      email: form.email,
      password: form.password,
    });

    if (loginRes?.token) {
      const payload = JSON.parse(atob(loginRes.token.split(".")[1]));
      login(loginRes.token, { email: payload.email, role: payload.role });

      // ✅ Redirigir al Dashboard de forma explícita
      window.location.href = "http://localhost:5173/dashboard";
    } else {
      alert("Error al iniciar sesión automáticamente");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 w-80 flex flex-col gap-3"
      >
        <h2 className="text-xl font-bold text-center mb-2">
          Registro de Usuario
        </h2>

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

        <button
          type="submit"
          className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
        >
          Registrarse
        </button>

        {/* Enlace hacia Login */}
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
