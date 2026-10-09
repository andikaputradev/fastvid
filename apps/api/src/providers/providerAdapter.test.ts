import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";
import { encryptApiKey } from "@vidsaveid/security";
import type { PublicProviderRecord } from "../repositories/provider.repository.js";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
const encryptionKey = Buffer.alloc(32, 2);
process.env.API_KEY_ENCRYPTION_KEY = encryptionKey.toString("base64");
process.env.ADMIN_SESSION_SECRET = "a".repeat(32);

const publicProvider: PublicProviderRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Public Open Extractor",
  slug: "public-extractor",
  platformSlug: "tiktok",
  baseUrl: "https://extractor.example.test/api/extract",
  apiKeyEncrypted: null,
  priority: 1,
  dailyLimit: 1000,
  dailyUsed: 0,
  isActive: true
};

type FetchInit = Parameters<typeof fetch>[1];

test("ProviderAdapter handles public API provider without auth headers", async () => {
  const { ProviderAdapter } = await import("./providerAdapter.js");
  let capturedHeaders: Record<string, string> | undefined;
  let capturedBody: string | undefined;

  const mockFetch = async (_input: string | URL | Request, init?: FetchInit): Promise<Response> => {
    capturedHeaders = init?.headers as Record<string, string> | undefined;
    capturedBody = init?.body as string;

    return new Response(
      JSON.stringify({
        status: "tunnel",
        url: "https://cdn.example.test/video.mp4",
        title: "Test Public Video"
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const adapter = new ProviderAdapter({
    fetchFn: mockFetch as typeof fetch,
    ssrfResolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });
  const result = await adapter.extractMedia("https://www.tiktok.com/@user/video/1", publicProvider);

  assert.equal(result.title, "Test Public Video");
  assert.equal(result.media.length, 1);
  assert.equal(result.media[0]?.url, "https://cdn.example.test/video.mp4");
  assert.equal(capturedHeaders?.Authorization, undefined);
  assert.equal(JSON.parse(capturedBody ?? "{}").url, "https://www.tiktok.com/@user/video/1");
});

test("ProviderAdapter handles private API provider and decrypts API key", async () => {
  const { ProviderAdapter } = await import("./providerAdapter.js");
  const encResult = encryptApiKey("my-secret-private-key", encryptionKey);
  assert.equal(encResult.ok, true);

  const privateProvider: PublicProviderRecord = {
    ...publicProvider,
    slug: "private-extractor",
    apiKeyEncrypted: encResult.value
  };

  let capturedHeaders: Record<string, string> | undefined;

  const mockFetch = async (_input: string | URL | Request, init?: FetchInit): Promise<Response> => {
    capturedHeaders = init?.headers as Record<string, string> | undefined;

    return new Response(
      JSON.stringify({
        data: {
          title: "Private Video",
          formats: [
            { format: "mp4", quality: "1080p", url: "https://cdn.example.test/1080.mp4" },
            { format: "mp3", quality: "128kbps", url: "https://cdn.example.test/audio.mp3" }
          ]
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const adapter = new ProviderAdapter({
    fetchFn: mockFetch as typeof fetch,
    ssrfResolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });
  const result = await adapter.extractMedia("https://www.tiktok.com/@user/video/2", privateProvider);

  assert.equal(result.title, "Private Video");
  assert.equal(result.media.length, 2);
  assert.equal(capturedHeaders?.Authorization, "Bearer my-secret-private-key");
  assert.equal(capturedHeaders?.["x-api-key"], "my-secret-private-key");
});

test("ProviderAdapter rejects invalid/private SSRF target hostnames", async () => {
  const { ProviderAdapter } = await import("./providerAdapter.js");
  const loopbackProvider: PublicProviderRecord = {
    ...publicProvider,
    baseUrl: "http://127.0.0.1:8080/extract"
  };

  const adapter = new ProviderAdapter();
  await assert.rejects(
    () => adapter.extractMedia("https://www.tiktok.com/@user/video/1", loopbackProvider),
    (err: Error) => err.message.includes("kebijakan keamanan")
  );
});

test("ProviderAdapter handles Kyzzz / REST API response structure and query apikey", async () => {
  const { ProviderAdapter } = await import("./providerAdapter.js");
  const encResult = encryptApiKey("kyzz-test-api-key", encryptionKey);
  assert.equal(encResult.ok, true);

  const kyzzzProvider: PublicProviderRecord = {
    ...publicProvider,
    baseUrl: "https://api.kyzzz.xyz/api/download/tiktok",
    apiKeyEncrypted: encResult.value
  };

  let capturedUrl: string | undefined;
  let capturedMethod: string | undefined;

  const mockFetch = async (input: string | URL | Request, init?: FetchInit): Promise<Response> => {
    capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    capturedMethod = init?.method;

    return new Response(
      JSON.stringify({
        status: true,
        creator: "Kyu:英俊的",
        result: {
          description: "Scramble up ur name & I’ll try to guess it😍❤️",
          author: {
            nickname: "Scout, Suki & Stella"
          },
          media: {
            video: {
              downloadUrl: "https://cdn.example.test/download.mp4",
              watermarkUrl: "https://cdn.example.test/wm.mp4",
              duration: 12,
              quality: "hd",
              cover: "https://cdn.example.test/thumb.jpg"
            }
          },
          music: {
            playUrl: "https://cdn.example.test/audio.mp3"
          }
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const adapter = new ProviderAdapter({
    fetchFn: mockFetch as typeof fetch,
    ssrfResolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });

  const result = await adapter.extractMedia("https://vt.tiktok.com/ZSQDBXDTp/", kyzzzProvider);

  assert.equal(capturedMethod, "GET");
  assert.match(capturedUrl ?? "", /apikey=kyzz-test-api-key/);
  assert.match(capturedUrl ?? "", /url=https%3A%2F%2Fvt\.tiktok\.com%2FZSQDBXDTp%2F/);
  assert.equal(result.title, "Scramble up ur name & I’ll try to guess it😍❤️");
  assert.equal(result.author, "Scout, Suki & Stella");
  assert.equal(result.thumbnailUrl, "https://cdn.example.test/thumb.jpg");
  assert.equal(result.duration, 12);
  assert.equal(result.media.length, 3);
  assert.equal(result.media[0]?.quality, "HD");
  assert.equal(result.media[0]?.format, "mp4");
  assert.equal(result.media[1]?.quality, "With Watermark");
  assert.equal(result.media[2]?.format, "mp3");
});

test("ProviderAdapter propagates specific provider error message when status is false", async () => {
  const { ProviderAdapter } = await import("./providerAdapter.js");
  const kyzzzProvider: PublicProviderRecord = {
    ...publicProvider,
    baseUrl: "https://api.kyzzz.xyz/api/download/tiktok"
  };

  const mockFetch = async (): Promise<Response> => {
    return new Response(
      JSON.stringify({
        status: false,
        creator: "Kyu:英俊的",
        error: "Video/post tidak ditemukan atau bersifat privat di TikTok"
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const adapter = new ProviderAdapter({
    fetchFn: mockFetch as typeof fetch,
    ssrfResolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });

  await assert.rejects(
    () => adapter.extractMedia("https://vt.tiktok.com/ZSQDBXDTp/", kyzzzProvider),
    (err: Error) => {
      assert.equal(err.message, "Video/post tidak ditemukan atau bersifat privat di TikTok");
      return true;
    }
  );
});

test("ProviderAdapter handles Jerexd aiov2 format and reroutes fastdl endpoint", async () => {
  const { ProviderAdapter } = await import("./providerAdapter.js");
  const encResult = encryptApiKey("jerexd-test-api-key", encryptionKey);
  assert.equal(encResult.ok, true);

  const jerexdProvider: PublicProviderRecord = {
    ...publicProvider,
    baseUrl: "https://api.jerexd.my.id/api/downloader/fastdl",
    apiKeyEncrypted: encResult.value
  };

  let capturedUrl: string | undefined;

  const mockFetch = async (input: string | URL | Request): Promise<Response> => {
    capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    return new Response(
      JSON.stringify({
        statusCode: 200,
        status: true,
        result: {
          title: "TikTok Video Title",
          author: "TikTokCreator",
          thumbnail: "https://cdn.example.test/thumb.jpg",
          duration: 24564,
          medias: [
            {
              url: "https://cdn.example.test/video-hd.mp4",
              data_size: 1967308,
              quality: "hd_no_watermark",
              extension: "mp4",
              type: "video"
            },
            {
              url: "https://cdn.example.test/video-nowm.mp4",
              data_size: 1200000,
              quality: "no_watermark",
              extension: "mp4",
              type: "video"
            },
            {
              url: "https://cdn.example.test/audio.mp3",
              duration: 24,
              quality: "audio",
              extension: "mp3",
              type: "audio"
            }
          ]
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const adapter = new ProviderAdapter({
    fetchFn: mockFetch as typeof fetch,
    ssrfResolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });

  const result = await adapter.extractMedia("https://www.tiktok.com/@tiktok/video/7106594312292453675", jerexdProvider);

  assert.match(capturedUrl ?? "", /\/api\/downloader\/aiov2/);
  assert.match(capturedUrl ?? "", /apikey=jerexd-test-api-key/);
  assert.equal(result.title, "TikTok Video Title");
  assert.equal(result.author, "TikTokCreator");
  assert.equal(result.thumbnailUrl, "https://cdn.example.test/thumb.jpg");
  assert.equal(result.duration, 25);
  assert.equal(result.media.length, 3);
  assert.equal(result.media[0]?.quality, "HD (No Watermark)");
  assert.equal(result.media[0]?.format, "mp4");
  assert.equal(result.media[0]?.sizeBytes, 1967308);
  assert.equal(result.media[1]?.quality, "No Watermark");
  assert.equal(result.media[2]?.quality, "Audio (MP3)");
  assert.equal(result.media[2]?.format, "mp3");
});

test("ProviderAdapter parses duration strings like MM:SS and lengthSeconds", async () => {
  const { ProviderAdapter } = await import("./providerAdapter.js");
  const ytProvider: PublicProviderRecord = {
    ...publicProvider,
    baseUrl: "https://api.jerexd.my.id/api/downloader/aiov2"
  };

  const mockFetch = async (): Promise<Response> => {
    return new Response(
      JSON.stringify({
        status: true,
        result: {
          title: "Rick Astley - Never Gonna Give You Up",
          author: "Rick Astley",
          duration: "3:33",
          lengthSeconds: "213",
          medias: [
            {
              url: "https://cdn.example.test/yt.mp4",
              quality: "720p",
              extension: "mp4",
              type: "video"
            }
          ]
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const adapter = new ProviderAdapter({
    fetchFn: mockFetch as typeof fetch,
    ssrfResolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });

  const result = await adapter.extractMedia("https://www.youtube.com/watch?v=dQw4w9WgXcQ", ytProvider);

  assert.equal(result.duration, 213);
  assert.equal(result.title, "Rick Astley - Never Gonna Give You Up");
  assert.equal(result.media.length, 1);
});


