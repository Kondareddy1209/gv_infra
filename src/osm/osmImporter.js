import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { queryOverpass } from "./overpassClient.js";
import { parseOsmResponse } from "./osmParser.js";
import { osmQueries } from "./osmQueries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_PATH = path.resolve(
  __dirname,
  "../../data/osm_features_cache.json"
);


export async function importCategory(
  pool,
  category,
  query
) {

  console.log(
    `Downloading OSM: ${category}`
  );

  const raw =
    await queryOverpass(query);

  const features =
    parseOsmResponse(raw);

  if (pool) {
    await pool.query("BEGIN");

    try {

      for (const feature of features) {

        await pool.query(
          `
          INSERT INTO osm_features (
            osm_id,
            osm_type,
            name,
            category,
            subcategory,
            tags,
            geom,
            centroid,
            source,
            source_version,
            imported_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::jsonb,
            ST_SetSRID(
              ST_GeomFromGeoJSON($7),
              4326
            ),
            CASE
              WHEN $8::double precision IS NOT NULL
               AND $9::double precision IS NOT NULL
              THEN ST_SetSRID(
                ST_MakePoint($8, $9),
                4326
              )
              ELSE NULL
            END,
            $10,
            $11,
            NOW(),
            NOW()
          )

          ON CONFLICT (osm_id, osm_type)
          DO UPDATE SET

            name = EXCLUDED.name,

            category =
              EXCLUDED.category,

            subcategory =
              EXCLUDED.subcategory,

            tags =
              EXCLUDED.tags,

            geom =
              EXCLUDED.geom,

            centroid =
              EXCLUDED.centroid,

            source_version =
              EXCLUDED.source_version,

            updated_at =
              NOW()
          `,
          [
            feature.osmId,
            feature.osmType,
            feature.name,
            feature.category,
            feature.subcategory,
            JSON.stringify(feature.tags),
            JSON.stringify(feature.geometry),
            feature.centroid?.longitude ?? null,
            feature.centroid?.latitude ?? null,
            feature.source,
            feature.sourceVersion
          ]
        );
      }

      await pool.query("COMMIT");

    } catch (error) {

      await pool.query("ROLLBACK");

      throw error;
    }
  }

  return features;
}


export async function writeGeoJsonCache(
  features
) {

  const geojson = {

    type: "FeatureCollection",

    features: features.map(feature => ({

      type: "Feature",

      properties: {

        osmId: feature.osmId,

        osmType: feature.osmType,

        name: feature.name,

        category: feature.category,

        subcategory: feature.subcategory,

        tags: feature.tags,

        source: feature.source
      },

      geometry: feature.geometry
    }))
  };

  await fs.mkdir(
    path.dirname(CACHE_PATH),
    { recursive: true }
  );

  await fs.writeFile(
    CACHE_PATH,
    JSON.stringify(
      geojson,
      null,
      2
    ),
    "utf8"
  );
}
