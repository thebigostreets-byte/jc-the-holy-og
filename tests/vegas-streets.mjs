import assert from 'node:assert/strict';
import {createVegasStreetNetwork,nearestStreet,resolveStreetLocation,VEGAS_LOCATIONS} from '../vegas-streets.js';

const network=createVegasStreetNetwork();
const strip=network.project(VEGAS_LOCATIONS.strip.lon,VEGAS_LOCATIONS.strip.lat);
assert.deepEqual([strip.x,strip.z],[0,0],'Strip reference projects to the world origin');
assert.ok(network.routes.some(route=>route.name==='Las Vegas Blvd'));
assert.ok(network.routes.some(route=>route.name==='I-15'&&route.kind==='freeway'));
assert.ok(network.routes.some(route=>route.name==='Airport Connector'));
assert.ok(network.segments.length>30,'street network contains connected segments');
const nearest=nearestStreet(strip.x,strip.z,network);
assert.equal(nearest.name,'Las Vegas Blvd');
assert.equal(nearest.distance,0);
assert.match(resolveStreetLocation(strip.x,strip.z,network).label,/LAS VEGAS BLVD · THE STRIP/);
const airport=network.project(VEGAS_LOCATIONS.airport.lon,VEGAS_LOCATIONS.airport.lat);
assert.ok(airport.x>0&&airport.z>0,'airport is east and south of the Strip reference');
assert.equal(VEGAS_LOCATIONS.psalms.label,'PSALMS · PALMS AREA');
console.log('PASS: Vegas coordinates, streets, districts and Psalms/Airport destinations resolve.');
