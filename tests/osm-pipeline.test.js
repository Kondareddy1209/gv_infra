import test from "node:test";
import assert from "node:assert/strict";

import { parseOsmElement, parseOsmResponse } from "../src/osm/osmParser.js";
import { KHAMMAM_BBOX, osmQueries } from "../src/osm/osmQueries.js";
import { LandIntelligenceService } from "../src/services/landIntelligenceService.js";

test("OSM Queries Configuration", () => {
  assert.equal(KHAMMAM_BBOX.south, 17.0);
  assert.equal(KHAMMAM_BBOX.west, 80.0);
  assert.ok(osmQueries.hospitals.includes("hospital"));
  assert.ok(osmQueries.schools.includes("school"));
  assert.ok(osmQueries.roads.includes("highway"));
});

test("OSM Parser - Node Classification & Geometry Preservation", () => {
  const mockNode = {
    id: 123456,
    type: "node",
    lat: 17.2481,
    lon: 80.1464,
    tags: {
      amenity: "hospital",
      name: "Janata Hospital"
    }
  };

  const parsed = parseOsmElement(mockNode);
  assert.ok(parsed);
  assert.equal(parsed.osmId, 123456);
  assert.equal(parsed.category, "healthcare");
  assert.equal(parsed.subcategory, "hospital");
  assert.equal(parsed.name, "Janata Hospital");
  assert.equal(parsed.geometry.type, "Point");
  assert.deepEqual(parsed.geometry.coordinates, [80.1464, 17.2481]);
  assert.equal(parsed.centroid.latitude, 17.2481);
  assert.equal(parsed.centroid.longitude, 80.1464);
});

test("OSM Parser - Way LineString Geometry Preservation", () => {
  const mockWay = {
    id: 98765,
    type: "way",
    geometry: [
      { lat: 17.2470, lon: 80.1430 },
      { lat: 17.2475, lon: 80.1435 },
      { lat: 17.2480, lon: 80.1440 }
    ],
    tags: {
      highway: "primary",
      name: "Khammam Main Road"
    }
  };

  const parsed = parseOsmElement(mockWay);
  assert.ok(parsed);
  assert.equal(parsed.category, "highway");
  assert.equal(parsed.subcategory, "primary");
  assert.equal(parsed.geometry.type, "LineString");
  assert.equal(parsed.geometry.coordinates.length, 3);
  assert.deepEqual(parsed.geometry.coordinates[0], [80.1430, 17.2470]);
});

test("Land Intelligence Service - Offline Mode Fallback", async () => {
  const intelligence = new LandIntelligenceService({ mode: "offline" });
  const result = await intelligence.getPropertyIntelligence("LAND-001");

  assert.ok(result);
  assert.equal(result.property.id, "LAND-001");
  assert.equal(result.provenance.property, "ADMIN_VERIFIED");
  assert.equal(result.provenance.contextualData, "OPENSTREETMAP");
  assert.ok(result.connectivity.nearestRoad);
  assert.ok(result.amenities.results.length > 0);
  assert.equal(result.attribution, "© OpenStreetMap contributors");
});