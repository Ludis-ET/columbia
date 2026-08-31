import type { Metadata } from "next";
import { Monogram } from "@/components/brand/monogram";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const { next, message } = await searchParams;

  return (
    <div className="bg-paper-sunk flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Monogram className="mb-4 size-16" decorative />
          <h1 className="text-h2">Columbia Care</h1>
          <p className="label text-stone mt-1">Website admin</p>
        </div>

        <div className="border-rule bg-paper-raise rounded border p-6 shadow-sm">
          <LoginForm next={next ?? "/admin"} notice={message} />
        </div>

        <p className="text-stone mt-6 text-center text-[0.875rem]">
          Only people invited by Columbia Care can sign in here.
        </p>
      </div>
    </div>
  );
}
