export function readPublicEnv(name: string, fallback: string): string {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };

  if (meta.env?.[name]) {
    return meta.env[name];
  }

  if (typeof process !== "undefined" && process.env[name]) {
    return process.env[name];
  }

  return fallback;
}
