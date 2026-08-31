"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/admin/ui";
import { createRow, type ActionResult } from "@/app/admin/actions";

export function AddContentForm({
  table,
  fields,
}: {
  table: string;
  fields: {
    name: string;
    label: string;
    multiline?: boolean;
    checkbox?: boolean;
    placeholder?: string;
  }[];
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createRow, null);

  return (
    <div className="border-rule bg-paper-raise mb-8 rounded border p-5">
      <h2 className="text-h3 mb-4 font-sans font-bold">Add one</h2>
      <Toast result={state} />
      <form action={action} className="grid gap-4">
        <input type="hidden" name="__table" value={table} />
        {fields.map((field) => (
          <div key={field.name} className="grid gap-1.5">
            {field.checkbox ? (
              <label
                htmlFor={`add-${field.name}`}
                className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.9375rem]"
              >
                <input
                  id={`add-${field.name}`}
                  name={field.name}
                  type="checkbox"
                  value="true"
                  className="mt-1 size-4 shrink-0"
                />
                <span>{field.label}</span>
              </label>
            ) : (
              <>
                <Label htmlFor={`add-${field.name}`}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    id={`add-${field.name}`}
                    name={field.name}
                    rows={3}
                    placeholder={field.placeholder}
                    required={field.name !== "relationship" && field.name !== "category"}
                  />
                ) : (
                  <Input
                    id={`add-${field.name}`}
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.name !== "relationship" && field.name !== "category"}
                  />
                )}
              </>
            )}
          </div>
        ))}
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Add
        </Button>
      </form>
    </div>
  );
}
