"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Painting } from "@/types/artwork";
import { setPaintings } from "@/content/paintings";
import { measurePaintings } from "@/lib/museum/fromArchive";

/**
 * The museum's layout, camera route and scroll timeline are computed from the painting list when their modules are
 * first imported. So the archive's paintings are measured and registered here first, and the museum is imported only
 * afterwards. The plain-HTML collection below it is rendered on the server and does not depend on any of this.
 */
export function MuseumLoader({ paintings }: { paintings: Painting[] }) {
  const [Museum, setMuseum] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPaintings(await measurePaintings(paintings));
      const { MuseumExperience } = await import("./MuseumExperience");
      if (!cancelled) setMuseum(() => MuseumExperience);
    })();
    return () => {
      cancelled = true;
    };
  }, [paintings]);

  return Museum ? <Museum /> : <div className="museum-boot" role="status">Preparing the gallery</div>;
}
