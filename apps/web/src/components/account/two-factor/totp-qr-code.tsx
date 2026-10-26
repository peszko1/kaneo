import { useMemo } from "react";
import { encode } from "uqr";

type TotpQrCodeProps = { uri: string; label: string };

// Drawn as SVG cells, so the secret never passes through innerHTML.
export function TotpQrCode({ uri, label }: TotpQrCodeProps) {
  const { data, size } = useMemo(() => encode(uri, { border: 2 }), [uri]);
  const cells = useMemo(
    () =>
      data.flatMap((row, y) =>
        row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : [])),
      ),
    [data],
  );

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      className="size-44 rounded-md bg-white"
      shapeRendering="crispEdges"
    >
      <path d={cells.join("")} fill="black" />
    </svg>
  );
}
