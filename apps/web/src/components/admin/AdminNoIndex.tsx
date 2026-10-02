import { MetaTags } from "../seo/MetaTags";

interface AdminNoIndexProps {
  title: string;
}

export function AdminNoIndex({ title }: AdminNoIndexProps) {
  return (
    <MetaTags
      title={`${title} | VidSaveID Admin`}
      description="VidSaveID admin area."
      robots="noindex,nofollow"
    />
  );
}
