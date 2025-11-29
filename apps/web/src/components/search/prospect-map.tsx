"use client";

import { useMemo, useState, useCallback } from "react";
import Map, {
  Layer,
  MapLayerMouseEvent,
  MapRef,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point, Geometry } from "geojson";
import type { Prospect } from "@/types/prospect";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const clusterLayer: any = {
  id: "clusters",
  type: "circle",
  source: "prospects",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#e4e2ff",
      10,
      "#c6c1ff",
      25,
      "#9ca0ff",
    ],
    "circle-radius": [
      "step",
      ["get", "point_count"],
      18,
      10,
      24,
      25,
      32,
    ],
  },
};

const clusterCountLayer: any = {
  id: "cluster-count",
  type: "symbol",
  source: "prospects",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-size": 12,
  },
  paint: {
    "text-color": "#18181b",
  },
};

const unclusteredPointLayer: any = {
  id: "unclustered-point",
  type: "circle",
  source: "prospects",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#18181b",
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fff",
  },
};

interface ProspectMapProps {
  prospects: Prospect[];
  selectedId?: string | null;
  selectedIds?: string[];
  onSelectProspect?: (id: string) => void;
}

export function ProspectMap({ prospects, selectedId, selectedIds = [], onSelectProspect }: ProspectMapProps) {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: prospects.map((prospect) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [prospect.location.lng, prospect.location.lat],
        },
        properties: {
          prospectId: prospect.id,
          name: prospect.name,
          aiLeadScore: prospect.aiLeadScore,
        },
      })),
    }),
    [prospects]
  );

  const selectedProspect = prospects.find((prospect) => prospect.id === selectedId);

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      if (!mapRef) return;
      const map = mapRef.getMap();
      const feature = event.features?.[0];
      if (!feature) return;

      const clusterId = feature.properties?.cluster_id as number | undefined;
      if (clusterId !== undefined) {
        const source = map.getSource("prospects") as any;
        const geometry = feature.geometry as Point;
        source.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
          if (err) return;
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
            duration: 800,
          });
        });
        return;
      }

      const prospectId = feature.properties?.prospectId as string | undefined;
      if (prospectId && onSelectProspect) {
        onSelectProspect(prospectId);
      }
    },
    [mapRef, onSelectProspect]
  );

  if (!prospects.length) {
    return (
      <Card className="flex h-[480px] items-center justify-center text-center">
        <div>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Map preview
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Run a search to see companies plotted on the map with smart clustering.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
      <Map
        ref={setMapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ latitude: 39.5, longitude: -98.35, zoom: 3.4 }}
        interactiveLayerIds={["clusters", "unclustered-point"]}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
      >
        <Source
          id="prospects"
          type="geojson"
          data={data}
          cluster
          clusterMaxZoom={14}
          clusterRadius={60}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>
      </Map>

      {selectedProspect && (
        <div className="pointer-events-none absolute left-4 top-4 w-80">
          <Card className="pointer-events-auto">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {selectedProspect.name}
            </h3>
            <p className="text-sm text-zinc-500">
              {selectedProspect.location.city}, {selectedProspect.location.state}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={selectedProspect.aiLeadScore >= 90 ? "success" : "warning"}>
                AI {selectedProspect.aiLeadScore}
              </Badge>
              <Badge variant="secondary">{selectedProspect.industry}</Badge>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
