import { Icon } from "@/components/ui/Icon";

export function AddressCard({
  address,
  href,
  label,
  directionsLabel,
}: {
  address: string;
  href: string;
  label: string;
  directionsLabel: string;
}) {
  return (
    <section className="rounded-card bg-cream px-2">
      <div className="py-2">
        <h3 className="font-ui text-sm font-extrabold tracking-[0.06em] text-warm uppercase">
          {label}
        </h3>
        <p className="font-ui text-sm text-brown">{address}</p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-1 border-t border-stroke py-2 font-ui text-sm font-extrabold tracking-[0.06em] text-brown uppercase transition-colors hover:text-maroon"
      >
        <Icon name="direction" className="text-warm" />
        {directionsLabel}
      </a>
    </section>
  );
}
