export function SecretFieldNotice() {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
      API key values are write-only. Existing keys are shown only as availability status.
    </p>
  );
}
