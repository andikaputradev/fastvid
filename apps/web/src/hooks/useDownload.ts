import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useDownload() {
  return useMutation({
    mutationFn: api.requestDownload
  });
}
