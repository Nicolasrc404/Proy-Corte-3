export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 text-center py-3 mt-10">
      <p className="text-sm">
        ⚗️{" "}
        <span className="font-semibold">Plataforma Alquímica de Amestris</span>{" "}
        — Departamento de Alquimia Estatal © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
