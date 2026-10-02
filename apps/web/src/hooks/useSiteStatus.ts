import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSiteStatus() {
  return useQuery({
    queryKey: ["site-status"],
    queryFn: api.getStatus
  });
}
