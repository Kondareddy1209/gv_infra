const BBOX = {
  south: 17.0,
  west: 80.0,
  north: 17.5,
  east: 81.0
};

const bbox = [
  BBOX.south,
  BBOX.west,
  BBOX.north,
  BBOX.east
].join(",");

export const KHAMMAM_BBOX = BBOX;

export const osmQueries = {

  hospitals: `
    [out:json][timeout:120];
    (
      node["amenity"="hospital"](${bbox});
      way["amenity"="hospital"](${bbox});
      relation["amenity"="hospital"](${bbox});
    );
    out center geom;
  `,

  schools: `
    [out:json][timeout:120];
    (
      node["amenity"="school"](${bbox});
      way["amenity"="school"](${bbox});
      relation["amenity"="school"](${bbox});
    );
    out center geom;
  `,

  railway: `
    [out:json][timeout:120];
    (
      node["railway"="station"](${bbox});
      way["railway"="station"](${bbox});
      relation["railway"="station"](${bbox});
    );
    out center geom;
  `,

  roads: `
    [out:json][timeout:180];
    way["highway"](${bbox});
    out geom;
  `,

  water: `
    [out:json][timeout:180];
    (
      way["natural"="water"](${bbox});
      relation["natural"="water"](${bbox});
      way["waterway"="river"](${bbox});
      way["waterway"="stream"](${bbox});
    );
    out geom;
  `,

  buildings: `
    [out:json][timeout:180];
    way["building"](${bbox});
    out geom;
  `

};

export default osmQueries;
