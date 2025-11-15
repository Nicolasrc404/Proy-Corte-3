import { ReactNode } from "react";

type RowWithOptionalId = { id?: number };

type ColumnKey<RowType extends RowWithOptionalId> = Extract<
  keyof RowType,
  string
>;

type RowId<RowType extends RowWithOptionalId> = RowType extends {
  id?: infer Id;
}
  ? NonNullable<Id>
  : never;

type TableFormatters<RowType extends RowWithOptionalId> = Partial<{
  [Key in ColumnKey<RowType>]: (value: RowType[Key], row: RowType) => ReactNode;
}>;

interface TableProps<RowType extends RowWithOptionalId> {
  columns: ColumnKey<RowType>[];
  data: RowType[];
  onEdit?: (item: RowType) => void;
  onDelete?: (id: RowId<RowType>) => void;
  formatters?: TableFormatters<RowType>;
  renderActions?: (row: RowType) => ReactNode;
}

export default function TableList<RowType extends RowWithOptionalId>({
  columns,
  data,
  onEdit,
  onDelete,
  formatters,
  renderActions,
}: TableProps<RowType>) {
  const showActions = Boolean(onEdit || onDelete || renderActions);
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
        {data.map((row, index) => {
          const rowKey = row.id ?? `row-${index}`;
          const canDelete = Boolean(onDelete) && row.id !== undefined;
          return (
            <tr key={rowKey} className="border-b hover:bg-gray-50">
              {columns.map((col) => {
                const formatter = formatters?.[col];
                const value = row[col];
                return (
                  <td key={col} className="p-2 border">
                    {formatter ? formatter(value, row) : (value as ReactNode)}
                  </td>
                );
              })}
              {showActions && (
                <td className="p-2 flex gap-2 items-center flex-wrap">
                  {renderActions && renderActions(row)}
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
                      onClick={() =>
                        row.id !== undefined &&
                        onDelete(row.id as RowId<RowType>)
                      }
                      disabled={!canDelete}
                      className={`px-2 rounded text-white ${
                        canDelete
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
