import { AdminApiError } from "../../lib/adminApi";

interface FormErrorProps {
  error: unknown;
}

function errorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Request failed.";
}

export function FormError({ error }: FormErrorProps) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-300">
      {errorMessage(error)}
    </div>
  );
}
