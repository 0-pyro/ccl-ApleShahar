const turf = require('@turf/turf');
const fs = require('fs');

// Load wards from local file
function initWards() {
  const data = JSON.parse(fs.readFileSync('./all_wards.json', 'utf8'));
  
  const wardsWithBbox = data.features.map(feature => ({
    feature,
    bbox: turf.bbox(feature),
    properties: feature.properties
  }));

  console.log(`✅ Loaded ${wardsWithBbox.length} wards`);
  return wardsWithBbox;
}

// Detect ward from coordinates
function detectWard(userLat, userLng, wardsWithBbox) {
  const userPoint = turf.point([userLng, userLat]);

  const match = wardsWithBbox.find(({ feature, bbox }) => {
    const [minLng, minLat, maxLng, maxLat] = bbox;

    if (userLng < minLng || userLng > maxLng ||
        userLat < minLat || userLat > maxLat) {
      return false;
    }

    return turf.booleanPointInPolygon(userPoint, feature);
  });

  if (match) {
    console.log(`✅ User is in Ward No: ${match.properties.ward_no}`);
    console.log(`✅ Org No: ${match.properties.org_no}`);
    return match.properties;
  } else {
    console.log(`❌ User is not inside any ward`);
    return null;
  }
}

// Run
const wardsWithBbox = initWards();
detectWard(19.462857, 72.762668, wardsWithBbox);