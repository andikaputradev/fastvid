import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";

interface ConfirmButtonProps {
  disabled?: boolean;
  label: string;
  message: string;
  onConfirm: () => void;
}

export function ConfirmButton({ disabled = false, label, message, onConfirm }: ConfirmButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-9 px-3 text-red-700 hover:bg-red-50"
      disabled={disabled}
      title={label}
      onClick={() => {
        if (window.confirm(message)) {
          onConfirm();
        }
      }}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}
