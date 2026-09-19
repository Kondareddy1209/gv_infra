import "dotenv/config";

import pg from "pg";

import {
  osmQueries,
  KHAMMAM_BBOX
} from "../src/osm/osmQueries.js";

import {
  importCategory,
  writeGeoJsonCache
} from "../src/osm/osmImporter.js";

const {
  Pool
} = pg;

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000
  });
}


async function main() {

  const bbox =
    `${KHAMMAM_BBOX.south},` +
    `${KHAMMAM_BBOX.west},` +
    `${KHAMMAM_BBOX.north},` +
    `${KHAMMAM_BBOX.east}`;

  let runId = null;

  if (pool) {
    try {
      const run =
        await pool.query(
          `
          INSERT INTO osm_import_runs (
            bbox,
            status,
            source
          )
          VALUES ($1, $2, $3)
          RETURNING id
          `,
          [
            bbox,
            "RUNNING",
            "Overpass"
          ]
        );

      runId = run.rows[0].id;
    } catch (e) {
      console.warn("PostgreSQL not accessible for import tracking; running JSON cache import only.");
      pool = null;
    }
  }

  const allFeatures = [];

  try {

    for (
      const [category, query]
      of Object.entries(osmQueries)
    ) {

      console.log(
        `\n=== ${category.toUpperCase()} ===`
      );

      const features =
        await importCategory(
          pool,
          category,
          query
        );

      allFeatures.push(
        ...features
      );

      console.log(
        `Imported: ${features.length}`
      );
    }

    await writeGeoJsonCache(
      allFeatures
    );

    if (pool && runId) {
      await pool.query(
        `
        UPDATE osm_import_runs
        SET
          status = $1,
          completed_at = NOW(),
          feature_count = $2
        WHERE id = $3
        `,
        [
          "SUCCESS",
          allFeatures.length,
          runId
        ]
      );
    }

    console.log(
      "\n================================"
    );

    console.log(
      "OSM IMPORT COMPLETE"
    );

    console.log(
      `Features: ${allFeatures.length}`
    );

    console.log(
      `PostGIS: ${pool ? "SUCCESS" : "OFFLINE (JSON Cache Active)"}`
    );

    console.log(
      "GeoJSON cache: SUCCESS"
    );

  } catch (error) {

    console.error(
      "OSM import failed:",
      error
    );

    if (pool && runId) {
      await pool.query(
        `
        UPDATE osm_import_runs
        SET
          status = $1,
          completed_at = NOW(),
          error_message = $2
        WHERE id = $3
        `,
        [
          "FAILED",
          error.message,
          runId
        ]
      );
    }

    process.exitCode = 1;

  } finally {

    if (pool) {
      await pool.end();
    }
  }
}


main();
