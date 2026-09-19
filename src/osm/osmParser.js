function classify(tags = {}) {

  if (tags.amenity === "hospital") {
    return {
      category: "healthcare",
      subcategory: "hospital"
    };
  }

  if (tags.amenity === "school") {
    return {
      category: "education",
      subcategory: "school"
    };
  }

  if (tags.railway === "station") {
    return {
      category: "transport",
      subcategory: "railway_station"
    };
  }

  if (tags.highway) {

    const highway = tags.highway;

    if (
      ["motorway", "trunk", "primary"].includes(highway)
    ) {
      return {
        category: "highway",
        subcategory: highway
      };
    }

    return {
      category: "road",
      subcategory: highway
    };
  }

  if (tags.building) {
    return {
      category: "building",
      subcategory: tags.building
    };
  }

  if (tags.natural === "water") {
    return {
      category: "water",
      subcategory: "water_body"
    };
  }

  if (tags.waterway) {
    return {
      category: "water",
      subcategory: tags.waterway
    };
  }

  if (tags.shop) {
    return {
      category: "commercial",
      subcategory: tags.shop
    };
  }

  if (tags.amenity === "place_of_worship") {
    return {
      category: "religious",
      subcategory: "place_of_worship"
    };
  }

  return {
    category: "other",
    subcategory: null
  };
}


function coordinatesFromElement(element) {

  if (element.type === "node") {

    return [
      [element.lon, element.lat]
    ];
  }

  if (!Array.isArray(element.geometry)) {
    return [];
  }

  return element.geometry.map(point => [
    point.lon,
    point.lat
  ]);
}


function isClosed(coords) {

  if (coords.length < 4) {
    return false;
  }

  const first = coords[0];
  const last = coords[coords.length - 1];

  return (
    first[0] === last[0] &&
    first[1] === last[1]
  );
}


function buildGeometry(element) {

  if (element.type === "node") {

    return {
      type: "Point",
      coordinates: [
        element.lon,
        element.lat
      ]
    };
  }

  const coordinates =
    coordinatesFromElement(element);

  if (!coordinates.length) {
    return null;
  }

  const tags = element.tags || {};

  const isPolygon =
    tags.building ||
    tags.landuse ||
    tags.natural === "water" ||
    tags.water;

  if (isPolygon && isClosed(coordinates)) {

    return {
      type: "Polygon",
      coordinates: [coordinates]
    };
  }

  return {
    type: "LineString",
    coordinates
  };
}


function calculateCentroid(element, geometry) {

  if (element.center) {

    return {
      longitude: element.center.lon,
      latitude: element.center.lat
    };
  }

  if (
    geometry?.type === "Point"
  ) {

    return {
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1]
    };
  }

  if (
    !geometry?.coordinates?.length
  ) {
    return null;
  }

  const points =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates;

  let lng = 0;
  let lat = 0;

  for (const point of points) {
    lng += point[0];
    lat += point[1];
  }

  return {
    longitude: lng / points.length,
    latitude: lat / points.length
  };
}


export function parseOsmElement(element) {

  const tags = element.tags || {};

  const classification =
    classify(tags);

  const geometry =
    buildGeometry(element);

  if (!geometry) {
    return null;
  }

  const centroid =
    calculateCentroid(
      element,
      geometry
    );

  return {

    osmId: element.id,

    osmType: element.type,

    name:
      tags.name ||
      tags["name:en"] ||
      null,

    category:
      classification.category,

    subcategory:
      classification.subcategory,

    tags,

    geometry,

    centroid,

    source: "OpenStreetMap",

    sourceVersion:
      element.version?.toString() || null
  };
}


export function parseOsmResponse(data) {

  if (
    !data ||
    !Array.isArray(data.elements)
  ) {
    throw new Error(
      "Invalid OSM response"
    );
  }

  return data.elements
    .map(parseOsmElement)
    .filter(Boolean);
}
