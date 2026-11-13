export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Process readiness only; external services have their own diagnostics.
export function GET() {
  return Response.json(
    {
      status: "ok",
      release: process.env.DEPLOYMENT_ID ?? "development",
      commit: process.env.DEPLOYMENT_COMMIT ?? "development",
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
