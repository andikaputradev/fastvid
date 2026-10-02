import type { SocialPlatform } from "../types/platform.types.js";

export const SUPPORTED_PLATFORMS: SocialPlatform[] = [
  {
    id: "instagram",
    name: "Instagram",
    hostnames: ["instagram.com", "www.instagram.com"],
    status: "inactive",
    publicOnly: true
  },
  {
    id: "tiktok",
    name: "TikTok",
    hostnames: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
    status: "inactive",
    publicOnly: true
  },
  {
    id: "facebook",
    name: "Facebook",
    hostnames: ["facebook.com", "www.facebook.com", "fb.watch"],
    status: "inactive",
    publicOnly: true
  },
  {
    id: "x",
    name: "X",
    hostnames: ["x.com", "twitter.com", "www.twitter.com"],
    status: "inactive",
    publicOnly: true
  },
  {
    id: "youtube",
    name: "YouTube",
    hostnames: ["youtube.com", "www.youtube.com", "youtu.be"],
    status: "inactive",
    publicOnly: true
  },
  {
    id: "threads",
    name: "Threads",
    hostnames: ["threads.net", "www.threads.net"],
    status: "inactive",
    publicOnly: true
  }
];
