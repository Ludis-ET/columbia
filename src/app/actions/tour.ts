"use server";

import { headers } from "next/headers";
import { processTourSubmission, type TourFormState } from "@/lib/forms/process-tour";

export { type TourFormState } from "@/lib/forms/process-tour";

export async function submitTourRequest(
  _prev: TourFormState,
  formData: FormData,
): Promise<TourFormState> {
  const host = (await headers()).get("host") ?? undefined;
  return processTourSubmission(formData, host);
}
