interface TableProps {
  columns: string[];
  data: any[];
  onEdit?: (item: any) => void;
  onDelete?: (id: number) => void;
}

export default function TableList({
  columns,
  data,
  onEdit,
  onDelete,
}: TableProps) {
  const showActions = Boolean(onEdit || onDelete);
  return (
    <table className="w-full border mt-4 text-sm">
      <thead className="bg-gray-200">
        <tr>
          {columns.map((c) => (
            <th key={c} className="border p-2 text-left">
              {c}
            </th>
          ))}
          {showActions && <th className="border p-2">Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} className="border-b hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col} className="p-2 border">
                {row[col]}
              </td>
            ))}
            {showActions && (
              <td className="p-2 flex gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(row)}
                    className="bg-yellow-400 px-2 rounded hover:bg-yellow-500"
                  >
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(row.id)}
                    className="bg-red-500 text-white px-2 rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
