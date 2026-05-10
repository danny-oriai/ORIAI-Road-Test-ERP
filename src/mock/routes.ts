import type { Route, POI } from "../types";

export const ROUTES: Route[] = [
  { id: "R-001", name: "M11 Cambridge → London Stansted",  distance: 58,  city: "Cambridge → London",   project: "PRJ-2025-014", duration: "1h 10m", type: "Highway", pois: 6 },
  { id: "R-002", name: "London Inner ULEZ Sweep",          distance: 42,  city: "London",               project: "PRJ-2025-016", duration: "2h 30m", type: "Urban",   pois: 14 },
  { id: "R-003", name: "Edinburgh → Aviemore A9",          distance: 132, city: "Edinburgh → Aviemore", project: "PRJ-2025-015", duration: "2h 45m", type: "Highway", pois: 9 },
  { id: "R-004", name: "Cambridge Ring Road Loop",         distance: 18,  city: "Cambridge",            project: "PRJ-2025-017", duration: "0h 45m", type: "Urban",   pois: 5 },
  { id: "R-005", name: "Manchester Orbital — M60",         distance: 56,  city: "Manchester",           project: null,            duration: "1h 15m", type: "Highway", pois: 4 },
];

export const POIS: POI[] = [
  { id: "POI-001", name: "M11 J9 Northbound Camera Site", type: "Camera Site", lat: 52.0813, lng: 0.1903,  city: "Cambridge", route: "R-001", project: "PRJ-2025-014" },
  { id: "POI-002", name: "Stansted Long-Stay Car Park",   type: "Parking",     lat: 51.8847, lng: 0.2378,  city: "Stansted",  route: "R-001", project: "PRJ-2025-014" },
  { id: "POI-003", name: "Aviemore Cold-Soak Yard",       type: "Test Site",   lat: 57.1916, lng: -3.8294, city: "Aviemore",  route: "R-003", project: "PRJ-2025-015" },
  { id: "POI-004", name: "Mile End ULEZ Boundary",        type: "Boundary",    lat: 51.5240, lng: -0.0337, city: "London",    route: "R-002", project: "PRJ-2025-016" },
  { id: "POI-005", name: "Old Street Roundabout",         type: "Junction",    lat: 51.5258, lng: -0.0876, city: "London",    route: "R-002", project: "PRJ-2025-016" },
  { id: "POI-006", name: "Madingley Park & Ride",         type: "Parking",     lat: 52.2167, lng: 0.0500,  city: "Cambridge", route: "R-004", project: "PRJ-2025-017" },
  { id: "POI-007", name: "Perth Ionity Charging Hub",     type: "Charging",    lat: 56.4083, lng: -3.4717, city: "Perth",     route: "R-003", project: "PRJ-2025-015" },
];
