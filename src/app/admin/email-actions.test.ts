import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/lib/db/server", () => ({ getAdminProfile: mocks.profile }));
vi.mock("@/lib/email/send", () => ({ verifyEmailConnection: mocks.verify }));
import { checkEmailConnection } from "./email-actions";

beforeEach(() => vi.clearAllMocks());

describe("owner-only email diagnostics", () => {
  it.each([null, { role: "editor" }])(
    "does not contact SMTP for an unauthorized session: %j",
    async (profile) => {
      mocks.profile.mockResolvedValue(profile);
      expect((await checkEmailConnection()).ok).toBe(false);
      expect(mocks.verify).not.toHaveBeenCalled();
    },
  );

  it("allows the owner to verify the current mail connection", async () => {
    mocks.profile.mockResolvedValue({ role: "owner" });
    mocks.verify.mockResolvedValue({ ok: true, message: "Mailbox verified" });
    expect(await checkEmailConnection()).toEqual({ ok: true, message: "Mailbox verified" });
    expect(mocks.verify).toHaveBeenCalledOnce();
  });
});
