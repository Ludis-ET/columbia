import { NextResponse, type NextRequest } from "next/server";
import { processTourSubmission } from "@/lib/forms/process-tour";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || undefined;
    const result = await processTourSubmission(formData, host);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/inquiries] error:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          "Something went wrong sending that. Please try again, or call us instead, we would much rather hear from you.",
      },
      { status: 500 },
    );
  }
}
