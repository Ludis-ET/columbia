import Link from "next/link";
import { Mail, Phone, Printer } from "lucide-react";
import { Monogram } from "@/components/brand/monogram";
import { Wave } from "@/components/brand/wave";
import { legalNav, primaryNav } from "@/lib/nav";
import { addressLine, contact, identity, published, telHref } from "@/lib/content";

/**
 * Site footer.
 *
 * Every field goes through published(). Anything the client has not confirmed —
 * phone, licence number — is simply absent. No placeholder, no "TBC".
 */
export function Footer() {
  const phone = published(contact.phonePrimary);
  const tel = telHref();
  const fax = published(contact.fax);
  const email = published(contact.email);
  const address = addressLine();
  const licence = published(contact.licenseNumber);
  const hours = published(contact.hours);
  const locationLine = published(contact.locationLine);
  const closingLine = published(identity.closingLine);

  return (
    <footer className="mt-auto">
      {/* flipped so the navy fills downward into the footer block */}
      <Wave className="block h-12 w-full sm:h-16" flip />

      <div className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          {closingLine ? (
            <p className="font-script mb-10 text-center text-3xl text-[color-mix(in_srgb,var(--paper)_92%,transparent)]">
              {closingLine}
            </p>
          ) : null}

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <Monogram className="size-11 shrink-0" decorative />
                <span className="leading-tight">
                  <span className="font-display block text-[1.05rem] font-semibold">
                    Columbia Care
                  </span>
                  <span className="label block text-[0.6875rem] opacity-70">Adult Family Home</span>
                </span>
              </div>
              {locationLine ? <p className="text-[0.95rem] opacity-80">{locationLine}</p> : null}
            </div>

            <div>
              <h2 className="label mb-3 opacity-70">Get in touch</h2>
              <ul className="space-y-2 text-[0.95rem]">
                {phone && tel ? (
                  <li>
                    <a href={tel} className="inline-flex items-center gap-2 hover:underline">
                      <Phone className="size-4 shrink-0" aria-hidden="true" />
                      {phone}
                    </a>
                  </li>
                ) : null}
                {email ? (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-2 break-all hover:underline"
                    >
                      <Mail className="size-4 shrink-0" aria-hidden="true" />
                      {email}
                    </a>
                  </li>
                ) : null}
                {fax ? (
                  <li className="inline-flex items-center gap-2">
                    <Printer className="size-4 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="sr-only">Fax: </span>
                      {fax}
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>

            <div>
              <h2 className="label mb-3 opacity-70">Visit</h2>
              {address ? (
                <address className="text-[0.95rem] not-italic opacity-90">{address}</address>
              ) : null}
              {hours ? <p className="mt-2 text-[0.95rem] opacity-80">Open {hours}</p> : null}
            </div>

            <div>
              <h2 className="label mb-3 opacity-70">Explore</h2>
              <ul className="space-y-2 text-[0.95rem]">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="opacity-90 hover:underline hover:opacity-100">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--paper)_18%,transparent)] pt-6 text-[0.875rem] opacity-75 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} Columbia Care Adult Family Home
              {licence ? ` · Washington State licence ${licence}` : ""}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {legalNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
