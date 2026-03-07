export function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null,
  columns?: string[]
) {
  if (!error) return false;
  if (error.code === "42703") return true;
  if (!columns || columns.length === 0) return false;

  const message = error.message ?? "";
  return columns.some((column) => message.includes(column));
}
