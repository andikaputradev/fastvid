import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function usePlatforms(options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: ["platforms"],
    queryFn: api.getPlatforms
  });
}
