// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadObject } from "@/lib/tenant/upload-object";

type Sent = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: FormData | null;
};

/** Just enough XMLHttpRequest to see what was sent and to answer it. */
function fakeXhr(answer: { status: number; body?: string; progress?: number[] }) {
  const sent: Sent[] = [];
  class FakeXhr {
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    status = 0;
    responseText = "";
    private record: Sent = { method: "", url: "", headers: {}, body: null };
    open(method: string, url: string) { this.record.method = method; this.record.url = url; }
    setRequestHeader(name: string, value: string) { this.record.headers[name] = value; }
    send(body: FormData) {
      this.record.body = body;
      sent.push(this.record);
      for (const loaded of answer.progress ?? []) {
        this.upload.onprogress?.({ lengthComputable: true, loaded, total: 100 });
      }
      this.status = answer.status;
      this.responseText = answer.body ?? "";
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  return sent;
}

function client(session: { access_token: string } | null) {
  const upload = vi.fn().mockResolvedValue({ error: null });
  return {
    upload,
    supabase: {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session } }) },
      storage: { from: vi.fn(() => ({ upload })) },
    } as unknown as Parameters<typeof uploadObject>[0],
  };
}

const coords = { supabaseUrl: "https://demo.supabase.co/", anonKey: "anon-key" };
const file = new File(["%PDF-1.4"], "exhibit.pdf", { type: "application/pdf" });

afterEach(() => vi.unstubAllGlobals());

describe("uploading with progress", () => {
  it("sends the request storage-js would, as the member, and reports how far it got", async () => {
    const sent = fakeXhr({ status: 200, body: "{}", progress: [25, 80] });
    const { supabase, upload } = client({ access_token: "member-token" });
    const seen: number[] = [];
    const result = await uploadObject(supabase, coords, "member/abc-exhibit.pdf", file, (f) => seen.push(f));

    expect(result).toEqual({ error: null });
    expect(upload).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    expect(sent[0].method).toBe("POST");
    expect(sent[0].url).toBe("https://demo.supabase.co/storage/v1/object/department-files/member/abc-exhibit.pdf");
    expect(sent[0].headers).toEqual({
      authorization: "Bearer member-token",
      apikey: "anon-key",
      "x-upsert": "false",
    });
    expect(sent[0].body?.get("cacheControl")).toBe("3600");
    expect((sent[0].body?.get("") as File).name).toBe("exhibit.pdf");
    expect(seen).toEqual([0.25, 0.8, 1]);
  });

  it("passes storage's own refusal back as an error, not a success", async () => {
    fakeXhr({ status: 400, body: JSON.stringify({ statusCode: "409", error: "Duplicate", message: "The resource already exists" }) });
    const { supabase } = client({ access_token: "member-token" });
    const result = await uploadObject(supabase, coords, "member/abc-exhibit.pdf", file, () => {});
    expect(result.error?.message).toBe("The resource already exists");
  });

  it("uploads through the library, without a percentage, when there is no session to send", async () => {
    const sent = fakeXhr({ status: 200 });
    const { supabase, upload } = client(null);
    const result = await uploadObject(supabase, coords, "member/abc-exhibit.pdf", file, () => {});
    expect(result).toEqual({ error: null });
    expect(sent).toHaveLength(0);
    expect(upload).toHaveBeenCalledWith("member/abc-exhibit.pdf", file, { contentType: "application/pdf", upsert: false });
  });
});
