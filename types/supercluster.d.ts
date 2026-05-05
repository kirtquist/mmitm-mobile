// Local TypeScript declaration for the `supercluster` package.
//
// Why this file exists:
// - `supercluster@8.0.1` ships JavaScript but no `.d.ts` types in this project.
// - Without this module declaration, TypeScript treats the import as `any`.
// - We only declare the subset of the API used by `app/map.native.tsx`.
declare module "supercluster" {
  // Constructor/options and instance methods exposed by the default export.
  class Supercluster<Props extends object = Record<string, unknown>> {
    constructor(options?: Supercluster.Options);

    // Load point features into the spatial index.
    load(points: Supercluster.PointFeature<Props>[]): Supercluster<Props>;

    // Read either cluster bubbles or individual point features for a bbox/zoom.
    getClusters(
      bbox: [number, number, number, number],
      zoom: number
    ): Supercluster.AnyFeature<Props>[];

    // Calculate the zoom level needed to expand a tapped cluster.
    getClusterExpansionZoom(clusterId: number): number;
  }

  // Namespace merge so existing `Supercluster.PointFeature<...>` references compile.
  namespace Supercluster {
    export type Position = [number, number];

    // GeoJSON point feature shape used when loading raw stop markers into the index.
    export type PointFeature<Props extends object = Record<string, unknown>> = {
      type: "Feature";
      properties: Props;
      geometry: {
        type: "Point";
        coordinates: Position;
      };
    };

    // Properties added by Supercluster for generated cluster bubbles.
    export type ClusterProperties = {
      cluster: true;
      cluster_id: number;
      point_count: number;
      point_count_abbreviated: number | string;
    };

    export type ClusterFeature<
      Props extends object = Record<string, unknown>
    > = PointFeature<Props & ClusterProperties>;

    export type AnyFeature<Props extends object = Record<string, unknown>> =
      | PointFeature<Props>
      | ClusterFeature<Props>;

    export type Options = {
      minZoom?: number;
      maxZoom?: number;
      minPoints?: number;
      radius?: number;
      extent?: number;
      nodeSize?: number;
    };
  }

  export default Supercluster;
}
