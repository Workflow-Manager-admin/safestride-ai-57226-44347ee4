// PUBLIC_INTERFACE
import React, { useState, useRef, useEffect } from "react";
import "./App.css";

// --- Constants & helper for route demo ---
const DEMO_START = { lat: 40.7436, lng: -73.9914 }; // Example: Madison Sq Park
const DEMO_END = { lat: 40.7476, lng: -73.9857 }; // Example: Empire State Bldg

// Two polylines: one green/safe, one red/riskier
const DEMO_ROUTES = [
  {
    name: "Safer Route",
    color: "#19b96c",
    points: [
      { lat: 40.7436, lng: -73.9914 },
      { lat: 40.7450, lng: -73.9888 },
      { lat: 40.7476, lng: -73.9857 },
    ],
    safety: "safe",
    warning: null,
  },
  {
    name: "Riskier Route",
    color: "#ec2323",
    points: [
      { lat: 40.7436, lng: -73.9914 },
      { lat: 40.7443, lng: -73.9908 },
      { lat: 40.7476, lng: -73.9857 },
    ],
    safety: "risky",
    warning: "Enters high-crime zone",
  },
];

// Example polygons (mock crime zones)
// This high-crime polygon intentionally intersects the riskier route.
const CRIME_POLYGONS = [
  {
    name: "High-Crime Area",
    color: "#e02451",
    warning: "Avoid: reported crimes (robbery/theft)",
    path: [
      { lat: 40.7447, lng: -73.9895 },
      { lat: 40.7460, lng: -73.9880 },
      { lat: 40.7470, lng: -73.9888 },
      { lat: 40.7464, lng: -73.9902 },
      { lat: 40.7447, lng: -73.9895 },
    ],
  },
];

/**
 * PUBLIC_INTERFACE
 * Fetch real live weather using OpenWeatherMap API.
 * @param {Object} center - { lat, lng }
 * @returns Weather object: { temperature, weathercode, warning }
 */
async function getLiveWeatherOpenWeatherMap(center) {
  // IMPORTANT: To enable live weather,
  // Replace REPLACE_WITH_YOUR_OWM_API_KEY with your actual OpenWeatherMap API Key.
  // For demo/dev: Get one free at https://openweathermap.org/appid
  // Or expose as env variable/process.env.REACT_APP_OWM_KEY in production.
  // If omitted, mock data will always be used.
  const OPENWEATHERMAP_API_KEY = "REPLACE_WITH_YOUR_OWM_API_KEY";
  if (OPENWEATHERMAP_API_KEY === "REPLACE_WITH_YOUR_OWM_API_KEY") {
    // Do not attempt API call if not set
    return { temperature: null, weathercode: null, warning: "Weather unavailable (API key not set)" };
  }
  if (!center || center.lat == null || center.lng == null) {
    return { temperature: null, weathercode: null, warning: "Location unavailable" };
  }
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${center.lat}&lon=${center.lng}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data || !data.weather || !data.weather.length) throw new Error("No OWM weather");

    // Map OWM weather codes to the project's scheme
    const owmCode = data.weather[0].id;
    let code = 1; // default clear
    // Map as: thunderstorm codes: 2xx, drizzle: 3xx, rain: 5xx, snow: 6xx, fog: 7xx, clear: 800, clouds: 80x
    if (owmCode >= 200 && owmCode < 300) code = 95;    // Thunderstorm
    else if (owmCode >= 300 && owmCode < 400) code = 51; // Drizzle
    else if (owmCode >= 500 && owmCode < 600) code = 61; // Rain
    else if (owmCode >= 600 && owmCode < 700) code = 71; // Snow
    else if (owmCode >= 700 && owmCode < 800) code = 45; // Fog/mist
    else if (owmCode === 800) code = 1; // Clear
    else if (owmCode > 800 && owmCode < 900) code = 3; // Clouds

    // Create a human-friendly warning
    let warning = null;
    if ([51, 61].includes(code)) warning = "Drizzle/Rain 🌦️";
    else if (code === 95) warning = "Thunderstorm ⛈️";
    else if (code === 71) warning = "Snow/Sleet ❄️";
    else if (code === 45) warning = "Fog/Mist 🌫️";
    else if (code === 3) warning = "Cloudy";
    else if (code === 1) warning = null;

    return {
      temperature: data.main.temp,
      weathercode: code,
      warning,
      owm_raw: data
    };
  } catch (err) {
    return { temperature: null, weathercode: null, warning: "Weather unavailable" };
  }
}
// Legacy fallback: mock weather (maintain for error fallback only)
function getMockWeather(center) {
  // Returns fake bad weather if center lng < -73.987 else good
  if (center && center.lng && center.lng < -73.987) {
    return { temperature: 8, weathercode: 61, warning: "Rain 🌧️" }; // rain weather code
  }
  return { temperature: 19, weathercode: 1, warning: null };
}

// -- Google Maps Loader --
function loadGoogleMapsScript(apiKey, callback) {
  // Loads the Google Maps JS API and invokes callback only when ready; handles multiple calls gracefully.
  if (window.google && window.google.maps) {
    callback();
    return;
  }
  const scriptId = "google-maps-script";
  const existing = document.getElementById(scriptId);
  if (existing) {
    existing.addEventListener("load", callback);
    return;
  }
  const script = document.createElement("script");
  script.id = scriptId;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.onerror = () => callback(new Error("Google Maps script failed to load."));
  script.onload = () => {
    script.removeEventListener("load", callback); // Avoid dup calls
    callback();
  };
  document.body.appendChild(script);
}

// --- Theme Color Constants for Consistency (fallback if CSS variables fail) ---
const THEME = {
  primary: "#4CAF50",
  secondary: "#FFC107",
  accent: "#E91E63",
  neutral: "#F7F7F9",
};

/* === Utility UI and helper components for new features === */
// PUBLIC_INTERFACE
function FeedbackModal({ open, onClose }) {
  const [comment, setComment] = useState("");
  return !open ? null : (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(44,44,44,0.27)", zIndex: 3000, display: "flex",
      justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        background: "white", color: "#131",
        borderRadius: 14, boxShadow: "0 6px 32px #1211", padding: 30,
        minWidth: 340, maxWidth: 420, fontWeight: 500
      }}>
        <div style={{ fontSize: "1.21em", fontWeight: 700, marginBottom: 10, color: "#E87A41" }}>Feedback</div>
        <div style={{ color: "#444", fontSize: 15, marginBottom: 10 }}>How can we improve SafeStride?</div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{
            width: "100%", padding: 8, border: "1.5px solid #e2e2e2",
            borderRadius: 6, minHeight: 54, fontFamily: "inherit"
          }}
          autoFocus
        />
        <div style={{ marginTop: 15, display: "flex", gap: 9 }}>
          <button
            className="btn"
            style={{ background: "#4CAF50", color: "#fff", fontWeight: 700 }}
            onClick={() => { setComment(""); onClose(); }}>
            Submit
          </button>
          <button
            className="btn"
            style={{ background: "#e5e5e5", color: "#222", fontWeight: 500 }}
            onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function ReportUnsafeSpotModal({ open, onClose, onSubmit, location }) {
  const [description, setDescription] = useState("");
  return !open ? null : (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(44,44,44,0.21)", zIndex: 2999, display: "flex",
      justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        background: "white", color: "#111", borderRadius: 13,
        boxShadow: "0 3px 22px #1938", padding: 28, minWidth: 340, maxWidth: 420
      }}>
        <div style={{ fontSize: "1.16em", fontWeight: 700, color: "#E91E63" }}>
          Report Unsafe Spot
        </div>
        <div style={{ marginBottom: 9, color: "#444", fontSize: 15 }}>
          Describe the safety issue at your current (or map) location.
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%", padding: 7, border: "1.4px solid #ccc",
            borderRadius: 6, minHeight: 41, fontFamily: "inherit"
          }}
          autoFocus
        />
        <div style={{ fontSize: 13, color: "#444", margin: "5px 0" }}>
          Location: {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "unknown"}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() => { setDescription(""); onSubmit(description); }}
            style={{ background: "#E91E63", color: "#fff", fontWeight: 700 }}
          >
            Report
          </button>
          <button className="btn" style={{ background: "#e5e5e5", color: "#222" }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function SOSShareModal({ open, onClose, location }) {
  // Provide a WhatsApp or mail share link with the current location and panic text.
  const locStr = location ? `${location.lat.toFixed(5)},${location.lng.toFixed(5)}` : "unknown location";
  const shareText = encodeURIComponent(`SOS! I need help at this location: https://maps.google.com/?q=${locStr}`);
  const waLink = `https://wa.me/?text=${shareText}`;
  const mailLink = `mailto:?subject=SOS! Help Needed&body=${shareText}`;
  return !open ? null : (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(44,44,44,0.21)", zIndex: 3050, display: "flex",
      justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        background: "white", color: "#d32f2f", borderRadius: 16,
        boxShadow: "0 3px 22px #8818", padding: 28, minWidth: 340, maxWidth: 430,
        fontWeight: 600, fontSize: "1.07em"
      }}>
        <div style={{ fontSize: "1.19em", fontWeight: 900, color: "#E91E63" }}>
          🚨 SOS - Send My Location
        </div>
        <div style={{ color: "#222", marginBottom: 7 }}>Share your real-time location with your emergency contacts:</div>
        <a className="btn" style={{ background: "#25d366", color: "#fff", marginBottom: 6, display: "block" }}
          href={waLink} rel="noopener noreferrer" target="_blank">WhatsApp Link</a>
        <a className="btn" style={{ background: "#1976D2", color: "#fff", marginBottom: 10, display: "block" }}
          href={mailLink} rel="noopener noreferrer" target="_blank">Email Link</a>
        {location && (
          <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>
            Coordinates: <b>{locStr}</b>
          </div>
        )}
        <button className="btn" style={{ background: "#e5e5e5", color: "#222", marginTop: 9 }}
          onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* === Main App with key safety & usability flows added === */
function App() {
  // -- Google Maps API Key (Demo Only) --
  const GOOGLE_MAPS_API_KEY = "AIzaSyCztCqCWGgNNh1xnr_Ey91rJGJC4ZC5VNY";

  // Main states
  const [showCrime, setShowCrime] = useState(true);
  const [showLighting, setShowLighting] = useState(true);
  const [showCrowds, setShowCrowds] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [personalization, setPersonalization] = useState({
    preferWellLit: true,
    avoidCrowds: false,
    receiveAlerts: true,
    homeLocation: "",
  });
  const [sosActive, setSosActive] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [weather, setWeather] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showUnsafeModal, setShowUnsafeModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [lastUnsafeSpot, setLastUnsafeSpot] = useState(null); // {desc, coords}

  // Google Maps/geolocation improvement state
  const [geo, setGeo] = useState({ status: "loading", coords: null, error: null });
  const [userMarker, setUserMarker] = useState(null);

  // Map Refs
  const mapRef = useRef();
  const mapCanvasRef = useRef();
  const overlaysRef = useRef({}); // overlay objects, e.g., for cleanup

  // (A) SETUP: Google Maps Loader & Initial Map Draw
  useEffect(() => {
    // set theme CSS variables just as before
    const root = document.documentElement;
    root.style.setProperty("--base-light", THEME.primary);
    root.style.setProperty("--primary", THEME.primary);
    root.style.setProperty("--secondary", THEME.secondary);
    root.style.setProperty("--accent", THEME.accent);
    root.style.setProperty("--base-dark", "#fff");
    root.style.setProperty("--text-color", "#222222");
    root.style.setProperty("--text-secondary", "rgba(34,34,34,0.7)");
    root.style.setProperty("--border-color", "rgba(34,34,34,0.075)");
    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY, (err) => {
      if (err) {
        setMapLoaded(false);
        setGeo({ status: "error", coords: null, error: "Google Maps failed to load." });
      } else {
        setMapLoaded(true);
      }
    });
  }, []);

  // (A.1) Request browser geolocation ONCE after mount & map lib loaded
  useEffect(() => {
    if (!mapLoaded) return;
    if (!navigator.geolocation) {
      setGeo({
        status: "error",
        coords: null,
        error: "Geolocation is not supported by your browser.",
      });
      return;
    }
    setGeo({ status: "loading", coords: null, error: null });
    // timeout 12s, high accuracy off (faster startup)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ status: "success", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null });
      },
      (err) => {
        // Permission denied, unavailable, timeout
        setGeo({
          status: "error",
          coords: null,
          error: err.code === 1
            ? "Location permission denied by user. Showing default city."
            : "Unable to access current location. Showing default city.",
        });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 15000 }
    );
  }, [mapLoaded]);

  // (B) Map Initialization/Overlay Functions: (draw routes, polygons, etc.)
  useEffect(() => {
    if (!mapLoaded) return;
    if (!mapCanvasRef.current) return;
    if (mapRef.current) return; // already initialized

    // Center on geo or fallback
    const fallbackCoords = { lat: 40.7445, lng: -73.9906 };
    const initialCoords =
      geo.status === "success" && geo.coords
        ? geo.coords
        : fallbackCoords;

    const mapToUse = new window.google.maps.Map(mapCanvasRef.current, {
      center: initialCoords,
      zoom: 14.1,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
    mapRef.current = mapToUse;

    // Mark user if geo avail
    if (geo.status === "success" && geo.coords) {
      const marker = new window.google.maps.Marker({
        position: geo.coords,
        map: mapToUse,
        title: "Your Location",
        label: { text: "You", color: "#E91E63", fontWeight: "bold" },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: "#2196f3",
          fillOpacity: 0.9,
          strokeColor: "#fff",
          strokeWeight: 3,
          scale: 10,
        },
      });
      setUserMarker(marker);
    }

    drawAllOverlays(mapToUse);
  // eslint-disable-next-line
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    clearAllOverlays();
    drawAllOverlays(mapRef.current);
    // eslint-disable-next-line
  }, [showCrime, showLighting, showCrowds, personalization]);

  // (B.2) Update center and marker if geolocation changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const fallbackCoords = { lat: 40.7445, lng: -73.9906 };
    if (geo.status === "success" && geo.coords) {
      mapRef.current.panTo(geo.coords);
      if (userMarker) {
        userMarker.setPosition(geo.coords);
        userMarker.setMap(mapRef.current);
      } else {
        const marker = new window.google.maps.Marker({
          position: geo.coords,
          map: mapRef.current,
          title: "Your Location",
          label: { text: "You", color: "#E91E63", fontWeight: "bold" },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#2196f3",
            fillOpacity: 0.9,
            strokeColor: "#fff",
            strokeWeight: 3,
            scale: 10,
          },
        });
        setUserMarker(marker);
      }
    } else {
      if (userMarker) {
        userMarker.setMap(null);
        setUserMarker(null);
      }
      if (geo.status === "error") {
        mapRef.current.panTo(fallbackCoords);
      }
    }
  // eslint-disable-next-line
  }, [geo, mapLoaded]);

  // Weather effect (use OpenWeatherMap if enabled and API key present; fallback to mock for demo)
  useEffect(() => {
    async function fetchWeather() {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      const lat = center.lat();
      const lng = center.lng();

      // === LIVE WEATHER via OpenWeatherMap ===
      // Developer: Replace the API key variable in getLiveWeatherOpenWeatherMap.
      let wxData = null;
      try {
        wxData = await getLiveWeatherOpenWeatherMap({ lat, lng });
        // If API not configured or fails, fallback:
        if (wxData == null || wxData.temperature == null) {
          wxData = getMockWeather({ lat, lng });
        }
      } catch {
        wxData = getMockWeather({ lat, lng });
      }
      setWeather(wxData);
    }
    if (showWeather && mapLoaded) fetchWeather();
    // eslint-disable-next-line
  }, [showWeather, mapLoaded]);

  // Notification for SOS
  useEffect(() => {
    if (sosActive) {
      setShowSOSModal(true);
      setNotification("Emergency SOS triggered! Help is on the way.");
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [sosActive]);

  // --- Overlays ---
  function clearAllOverlays() {
    for (const key in overlaysRef.current) {
      if (overlaysRef.current[key]?.setMap) {
        overlaysRef.current[key].setMap(null);
      }
      if (Array.isArray(overlaysRef.current[key])) {
        overlaysRef.current[key].forEach((item) => {
          if (item?.setMap) item.setMap(null);
        });
      }
    }
    overlaysRef.current = {};
  }

  // Draw: routes, polygons for crime, warning zones; highlight best
  function drawAllOverlays(map) {
    // 1. Draw demo routes
    overlaysRef.current.routes = DEMO_ROUTES.map((route, i) =>
      new window.google.maps.Polyline({
        path: route.points,
        geodesic: true,
        strokeColor: route.color,
        strokeOpacity: route.safety === "safe" ? 0.97 : 0.82,
        strokeWeight: route.safety === "safe" ? 7 : 6,
        map,
        zIndex: 10 + i,
      })
    );

    // 2. Draw crime zones
    if (showCrime) {
      overlaysRef.current.crimeZones = CRIME_POLYGONS.map((poly, idx) =>
        new window.google.maps.Polygon({
          paths: poly.path,
          strokeColor: poly.color,
          strokeOpacity: 0.9,
          strokeWeight: 1,
          fillColor: poly.color,
          fillOpacity: 0.29,
          map,
          zIndex: 18,
        })
      );
    }

    // 3. Mark start/end
    overlaysRef.current.start = new window.google.maps.Marker({
      position: DEMO_START,
      map,
      title: "Start",
      label: { text: "A", color: "#3a3", fontWeight: "bold" },
      icon: {
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 7,
        fillColor: "#4CAF50",
        fillOpacity: 1,
        strokeWeight: 1,
      },
      zIndex: 15,
    });
    overlaysRef.current.end = new window.google.maps.Marker({
      position: DEMO_END,
      map,
      title: "Destination",
      label: { text: "B", color: "#1976d2", fontWeight: "bold" },
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 7,
        fillColor: "#1976d2",
        fillOpacity: 1,
        strokeWeight: 1,
      },
      zIndex: 15,
    });
  }

  // Utility: does a route intersect a crime polygon?
  function routeCrossesCrime(routePoints, crimePolygon) {
    function pointInPoly(pt, polyPath) {
      // Ray casting even-odd algorithm (for convex polygons, suffices for sample data)
      let n = polyPath.length, inside = false;
      for (let i = 0, j = n-1; i < n; j = i++) {
        const xi = polyPath[i].lng, yi = polyPath[i].lat;
        const xj = polyPath[j].lng, yj = polyPath[j].lat;
        const intersect = ((yi > pt.lat) !== (yj > pt.lat))
          && (pt.lng < (xj - xi) * (pt.lat - yi) / (yj - yi + 1e-9) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }
    return crimePolygon ? routePoints.some(pt => pointInPoly(pt, crimePolygon.path)) : false;
  }

  // (E) Notification effect for demo purposes (SOS, alerts)
  useEffect(() => {
    if (sosActive) {
      setNotification("Emergency SOS triggered! Help is on the way.");
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [sosActive]);

  // =============== Overlay Drawing Logic ===============
  function clearAllOverlays() {
    for (const key in overlaysRef.current) {
      if (overlaysRef.current[key]?.setMap) {
        overlaysRef.current[key].setMap(null);
      }
      // For Polyline/arrays
      if (Array.isArray(overlaysRef.current[key])) {
        overlaysRef.current[key].forEach((item) => {
          if (item?.setMap) item.setMap(null);
        });
      }
    }
    overlaysRef.current = {};
  }
  function drawDemoOverlays(map) {
    // (1) Crime Data (mock: red circles around certain blocks)
    if (showCrime) {
      const crimeSpots = [
        { lat: 40.7435, lng: -73.9916, level: 3 }, // High
        { lat: 40.7462, lng: -73.9887, level: 2 }, // Mod.
        { lat: 40.7411, lng: -73.9939, level: 1 }, // Low
      ];
      overlaysRef.current.crime = new window.google.maps.Data();
      overlaysRef.current.crime.addGeoJson({
        type: "FeatureCollection",
        features: crimeSpots.map((p, i) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { severity: p.level },
        })),
      });
      overlaysRef.current.crime.setStyle(f => ({
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor:
            pSeverityColor(f.getProperty("severity"), THEME.primary, THEME.accent),
          fillOpacity: 0.33 + 0.13 * f.getProperty("severity"),
          strokeWeight: 0,
          scale: 25 + 7 * f.getProperty("severity"),
        },
        zIndex: 2,
      }));
      overlaysRef.current.crime.setMap(map);
    }
    // (2) Lighting (polyline overlays: yellow for well-lit, gray for dark)
    if (showLighting) {
      const demoStreets = [
        { points: [ {lat:40.7448, lng:-73.991}, {lat:40.7475, lng:-73.9901 } ], lit: true },
        { points: [ {lat:40.743, lng:-73.9929}, {lat:40.7447, lng:-73.9952 } ], lit: false }
      ];
      overlaysRef.current.lighting = demoStreets.map((s, i) => 
        new window.google.maps.Polyline({
          path: s.points,
          geodesic: true,
          strokeColor: s.lit ? THEME.secondary : "#919191",
          strokeOpacity: s.lit ? 0.95 : 0.42,
          strokeWeight: s.lit ? 8 : 6,
          map,
          zIndex: 3,
        })
      );
    }
    // (3) Crowd Density (mock: shaded areas—rectangles/polygons, color by density)
    if (showCrowds) {
      overlaysRef.current.crowds = new window.google.maps.Data();
      overlaysRef.current.crowds.addGeoJson({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [-73.9927,40.7460],[-73.9914,40.7460],[-73.9914,40.7470],[-73.9927,40.7470],[-73.9927,40.7460]
              ]],
            },
            properties: { density: 3 },
          },
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [-73.9886,40.7428],[-73.9874,40.7428],[-73.9874,40.7440],[-73.9886,40.7440],[-73.9886,40.7428]
              ]],
            },
            properties: { density: 1 },
          },
        ],
      });
      overlaysRef.current.crowds.setStyle(f => ({
        fillColor: densityColor(f.getProperty("density")),
        fillOpacity: 0.21 + 0.18*f.getProperty("density"),
        strokeWeight: 0,
        zIndex: 1,
      }));
      overlaysRef.current.crowds.setMap(map);
    }
    // (4) Demo: pan to homeLocation if set
    if (personalization?.homeLocation && window.google?.maps?.Geocoder) {
      const geo = new window.google.maps.Geocoder();
      geo.geocode(
        { address: personalization.homeLocation },
        (results, status) => {
          if (status === "OK") {
            map.panTo(results[0].geometry.location);
          }
        });

    }
  }
  function pSeverityColor(sev, primary, accent) {
    // 1 = low, 2 = mod, 3 = high
    if (sev === 3) return accent || "#E91E63";
    if (sev === 2) return "#F44336";
    return primary || "#4CAF50";
  }
  function densityColor(density) {
    if (density >= 3) return "#E91E63";
    if (density === 2) return "#FFC107";
    return "#4CAF50";
  }

  // ================ UI: Render ==================
  // Route, crime, weather alert integration
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const selectedRoute = DEMO_ROUTES[currentRouteIndex];
  const crimeAlerts = CRIME_POLYGONS
    .map((poly) =>
      routeCrossesCrime(selectedRoute.points, poly)
        ? `Route enters ${poly.name}: ${poly.warning}`
        : null
    )
    .filter(Boolean);
  const wxAlert =
    weather && (
      // Project weather codes that indicate severe OR if direct warning string is present
      ([61, 63, 65, 71, 80, 81, 82, 95, 96, 99, 45, 51].includes(weather.weathercode) || !!weather.warning)
    )
      ? `Weather Alert${weather.warning ? `: ${weather.warning}` : ""} – suggest safest or covered route. ⚠️`
      : null;

  return (
    <div className="app"
      style={{
        background: THEME.neutral,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column"
      }}>
      {/* Navigation Bar */}
      <nav className="navbar" style={{ background: THEME.primary, color: "white" }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="logo">
              <span
                className="logo-symbol"
                style={{
                  color: THEME.accent,
                  fontWeight: 800,
                  fontSize: "1.3rem",
                  marginRight: 6
                }}
                aria-hidden="true"
              >🚶‍♂️</span>{" "}
              SafeStride AI
            </div>
            <UserMenu prefs={personalization} onPrefsChange={setPersonalization} />
          </div>
        </div>
      </nav>
      <main style={{ flex: 1, paddingTop: 90 }}>
        <div className="container" style={{ maxWidth: "1400px", width: "100%" }}>
          {/* Add route/alert panel above map */}
          <section className="hero"
            style={{
              padding: "28px 0 20px 0",
              display: "flex",
              gap: "24px",
              alignItems: "flex-start",
              flexDirection: "row-reverse",
              minHeight: 480,
              position: "relative"
            }}>
            {/* Google Maps */}
            <div
              style={{
                flex: 3.5,
                minWidth: 390,
                height: 450,
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 4px 36px 0 rgba(44,44,44,.14)",
                border: `2.5px solid ${THEME.primary}`,
                position: "relative",
                background: "#f9f9fb"
              }}>
              {/* Status/UI Banners */}
              {(geo.status === "loading" || !mapLoaded) && (
                <div style={{
                  position: "absolute", top: 21, left: "50%", transform: "translateX(-50%)",
                  background: "#fff8", color: THEME.primary, fontWeight: 600, borderRadius: 8,
                  padding: "10px 22px", zIndex: 11, fontSize: "1.03em",
                  textShadow: "0 1px 10px #fff", boxShadow: "0 2px 10px rgba(44,44,44,.08)"
                }}>
                  {!mapLoaded ? "Loading map..." : "Getting your location…"}
                </div>
              )}
              {(geo.status === "error") && (
                <div style={{
                  position: "absolute", top: 21, left: "50%", transform: "translateX(-50%)",
                  background: "#ffe3e3", color: "#d32f2f", fontWeight: 700, borderRadius: 8,
                  padding: "11px 22px", zIndex: 11, fontSize: "1.04em",
                  boxShadow: "0 2px 10px rgba(200,40,60,.09)"
                }}>
                  <span role="img" aria-label="warn" style={{ marginRight: 4 }}>⚠️</span>
                  {geo.error || "Could not access your location. Showing default area."}
                </div>
              )}
              {/* Route choose / alert panel */}
              <div style={{
                position: "absolute", top: 11, left: 14, right: 16, zIndex: 20, minHeight: 0
              }}>
                <div style={{
                  display: "flex", background: "#fff", borderRadius: 9, boxShadow: "0 2px 18px #2c2c2c0f",
                  fontSize: 16, fontWeight: 600, alignItems: "center", gap: 12, padding: "10px 15px"
                }}>
                  <span style={{ color: "#E91E63", marginRight: 8, fontSize: "1.17em" }}>🧭</span>
                  <span>Demo Routes:</span>
                  {DEMO_ROUTES.map((r, i) => (
                    <button key={i}
                      className="btn"
                      style={{
                        fontWeight: 700,
                        fontSize: ".97em",
                        marginLeft: 4,
                        background: r.safety === "safe" ? "#26c46c" : "#ec2323",
                        color: "#fff",
                        opacity: i === currentRouteIndex ? 1 : 0.74,
                        border: i === currentRouteIndex ? "2.5px solid #444" : "1.2px solid #e2e5ff"
                      }}
                      aria-label={`Show ${r.name}`}
                      onClick={() => setCurrentRouteIndex(i)}
                    >{r.name}</button>
                  ))}
                  <span style={{ marginLeft: "auto" }} />
                  {/* Feedback/Report/SOS compact */}
                  <button
                    className="btn"
                    style={{ background: "#E91E63", fontWeight: 600, fontSize: ".93em" }}
                    aria-label="Give Feedback"
                    onClick={() => setShowFeedback(true)}>
                    💬 Feedback
                  </button>
                  <button
                    className="btn"
                    style={{ background: "#ff9800", fontWeight: 600, marginLeft: 6, fontSize: ".93em" }}
                    aria-label="Report Unsafe Spot"
                    onClick={() => setShowUnsafeModal(true)}>
                    🚩 Report
                  </button>
                  <button
                    className="btn"
                    style={{
                      background: "#1976D2",
                      fontWeight: 900,
                      marginLeft: 7,
                      color: "#fff",
                      fontSize: ".96em"
                    }}
                    aria-label="SOS"
                    onClick={() => setShowSOSModal(true)}
                  >
                    🚨 SOS
                  </button>
                </div>
                {/* Warnings */}
                {(crimeAlerts.length > 0 || wxAlert) && (
                  <div style={{
                    marginTop: 8,
                    background: "#ffe3e3",
                    color: "#d32f2f",
                    fontWeight: 700,
                    fontSize: "1.01em",
                    borderRadius: 7,
                    padding: "8px 14px",
                    boxShadow: "0 2px 8px #790c0c13",
                    zIndex: 22
                  }}>
                    {crimeAlerts.length > 0 &&
                      <div><span role="img" aria-label="warn">❗</span> {crimeAlerts.join(" | ")}</div>
                    }
                    {wxAlert && (
                      <div style={{ marginTop: crimeAlerts.length > 0 ? 5 : 0 }}>
                        <span role="img" aria-label="weather">🌧️</span> {wxAlert}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div
                ref={mapCanvasRef}
                tabIndex={0}
                aria-label="Map showing safety features"
                style={{ width: "100%", height: "100%" }}
              />
              <Legend
                showCrime={showCrime}
                showLighting={showLighting}
                showCrowds={showCrowds}
                theme={THEME}
              />
              {/* SOS Floating Button */}
              <button
                aria-label="Emergency SOS"
                tabIndex={0}
                className="btn"
                onClick={() => setShowSOSModal(true)}
                style={{
                  position: "absolute",
                  right: 16,
                  bottom: 18,
                  background: THEME.accent,
                  color: "white",
                  borderRadius: "18px",
                  fontWeight: 800,
                  fontSize: "1.11rem",
                  boxShadow: "0 3px 16px rgba(230,12,84,0.14)",
                  zIndex: 4,
                  padding: "11px 30px"
                }}>
                🚨 SOS
              </button>
              {/* Modal UIs */}
              <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
              <ReportUnsafeSpotModal
                open={showUnsafeModal}
                onClose={() => setShowUnsafeModal(false)}
                onSubmit={(desc) => {
                  setShowUnsafeModal(false);
                  setLastUnsafeSpot({ desc, coords: geo.coords });
                  setNotification("Thank you! Unsafe spot reported.");
                  setTimeout(() => setNotification(null), 2600);
                }}
                location={geo.coords || DEMO_START}
              />
              <SOSShareModal
                open={showSOSModal}
                onClose={() => setShowSOSModal(false)}
                location={geo.coords || DEMO_START}
              />
            </div>
            {/* Sidebar */}
            <div style={{ flex: 2, minWidth: 250, maxWidth: 350, paddingRight: 4, paddingLeft: 8 }}>
              <div style={{
                color: THEME.primary,
                fontWeight: 600,
                fontSize: "1.12rem",
                letterSpacing: ".02em",
                marginBottom: "10px",
              }}>
                <span role="img" aria-label="Route">🦺</span>{" "}
                Move Safer, Walk Smarter
              </div>
              <div className="description" style={{ color: "#222", fontSize: "1.05rem", marginBottom: 12 }}>
                Real-time safety overlays, AI-powered rerouting, and alerts.
              </div>
              {/* Feature Toggles */}
              <FeatureToggles
                showCrime={showCrime}
                setShowCrime={setShowCrime}
                showLighting={showLighting}
                setShowLighting={setShowLighting}
                showCrowds={showCrowds}
                setShowCrowds={setShowCrowds}
                showWeather={showWeather}
                setShowWeather={setShowWeather}
                theme={THEME}
              />
              {/* Weather Info */}
              {showWeather && <WeatherInfo weather={weather} />}
              {/* Personalization Mini-Panel */}
              <PersonalizationPanel
                prefs={personalization}
                onChange={setPersonalization}
                theme={THEME}
              />
              {/* Last unsafe spot check notification */}
              {lastUnsafeSpot && (
                <div style={{
                  background: "#fffde7", color: "#1565c0",
                  fontWeight: 600, fontSize: ".98em",
                  margin: "12px 0", borderRadius: 5, padding: "7px 12px"
                }}>
                  <span role="img" aria-label="flag">🚩</span>{" "}
                  You reported: "{lastUnsafeSpot.desc}" at location {lastUnsafeSpot.coords ? `${lastUnsafeSpot.coords.lat.toFixed(4)},${lastUnsafeSpot.coords.lng.toFixed(4)}` : ""}
                </div>
              )}
            </div>
          </section>
          {/* Feature/stub panels (unchanged) */}
          <section
            style={{
              display: 'flex',
              flexWrap: "wrap",
              gap: 32,
              margin: "18px 0 18px 0"
            }}>
            <FeatureColumn>
              <FeatureCard name="Real-time Crime Data" color={THEME.primary}>
                <CrimeDataStub active={showCrime} />
              </FeatureCard>
              <FeatureCard name="Lighting Detection" color={THEME.secondary}>
                <LightingDetectionStub active={showLighting} />
              </FeatureCard>
              <FeatureCard name="Crowd Density Analysis" color={THEME.accent}>
                <CrowdDensityStub active={showCrowds} />
              </FeatureCard>
            </FeatureColumn>
            <FeatureColumn>
              <FeatureCard name="Weather Adaptation" color={THEME.secondary}>
                <WeatherAdaptationStub weather={weather} />
              </FeatureCard>
              <FeatureCard name="Emergency SOS" color={THEME.accent}>
                <SOSFeatureStub active={showSOSModal} onReset={() => setShowSOSModal(false)} />
              </FeatureCard>
              <FeatureCard name="User Personalization" color={THEME.primary}>
                <PersonalizationStub prefs={personalization} />
              </FeatureCard>
            </FeatureColumn>
            <FeatureColumn>
              <FeatureCard name="Data Aggregation" color={THEME.primary}>
                <DataAggregationStub />
              </FeatureCard>
              <FeatureCard name="AI Routing Engine" color={THEME.secondary}>
                <AIRoutingStub prefs={personalization} />
              </FeatureCard>
              <FeatureCard name="User Management" color={THEME.accent}>
                <UserManagementStub />
              </FeatureCard>
              <FeatureCard name="Notification Service" color={THEME.secondary}>
                <NotificationServiceStub notification={notification} />
              </FeatureCard>
            </FeatureColumn>
          </section>
        </div>
      </main>
      {/* Alert/Notification Snackbar */}
      {notification &&
        <div
          style={{
            background: THEME.accent,
            color: "#fff",
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: 18,
            boxShadow: "0 2px 14px rgba(230,12,84,0.16)",
            padding: "18px 40px",
            zIndex: 2000,
            fontWeight: 700,
            fontSize: "1.08rem"
          }}>
          {notification}
        </div>
      }
      <footer style={{
        background: "#fff",
        color: THEME.accent,
        borderTop: "1px solid var(--border-color)",
        textAlign: "center",
        padding: "18px 0",
        marginTop: 32,
        fontWeight: 500,
        letterSpacing: ".08em",
        fontSize: "0.96rem"
      }}>
        © {new Date().getFullYear()} SafeStride AI. Be alert. Be safe.
      </footer>
    </div>
  );
}

/* ===== Legend for Overlays on Map ===== */
function Legend({ showCrime, showLighting, showCrowds, theme }) {
  // PUBLIC_INTERFACE
  return (
    <div
      aria-label="Map Overlay Legend"
      style={{
        position: "absolute",
        left: 20, bottom: 19,
        zIndex: 6,
        background: "#fff",
        boxShadow: "0 2px 10px rgb(44,44,44,.09)",
        borderRadius: 10,
        padding: "11px 18px 10px 12px",
        fontSize: "0.97rem",
        minWidth: 120,
        color: "#333",
        opacity: 0.97,
        pointerEvents: "none",
      }}>
      <span style={{ display: "block", fontWeight: 600, color: theme.primary, fontSize: ".99em", marginBottom: 5 }}>
        Legend
      </span>
      <div style={{ display: "flex", gap: 10, fontSize: ".95em", marginBottom: 1 }}>
        {showCrime && <><span style={{
          background: theme.accent, display: 'inline-block', width: 18, height: 8, borderRadius: 6, marginRight: 3
        }} /> Crime hotspot</>}
        {showLighting && <><span style={{
          background: theme.secondary, display: 'inline-block', width: 18, height: 8, borderRadius: 6, marginRight: 3
        }} /> Lit street</>}
        {showCrowds && <><span style={{
          background: theme.primary, display: 'inline-block', width: 18, height: 8, borderRadius: 6, marginRight: 3
        }} /> Crowd area</>}
      </div>
    </div>
  );
}

/* ===== Feature Toggles for Overlay Control ===== */
function FeatureToggles({
  showCrime, setShowCrime,
  showLighting, setShowLighting,
  showCrowds, setShowCrowds,
  showWeather, setShowWeather,
  theme
}) {
  // PUBLIC_INTERFACE
  return (
    <div style={{
      marginBottom: 15,
      padding: "11px 8px 9px 13px",
      background: "#fff",
      borderRadius: 7,
      boxShadow: "0 2px 8px rgba(44,44,44,0.07)",
      fontSize: ".98rem"
    }}>
      <label style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <input type="checkbox" checked={showCrime} onChange={e => setShowCrime(e.target.checked)}
          style={{ accentColor: theme.accent, marginRight: 7 }}
        />
        Crime Hotspots
      </label>
      <label style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <input type="checkbox" checked={showLighting} onChange={e => setShowLighting(e.target.checked)}
          style={{ accentColor: theme.secondary, marginRight: 7 }}
        />
        Lighting
      </label>
      <label style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <input type="checkbox" checked={showCrowds} onChange={e => setShowCrowds(e.target.checked)}
          style={{ accentColor: theme.primary, marginRight: 7 }}
        />
        Crowd Density
      </label>
      <label style={{ display: "flex", alignItems: "center" }}>
        <input type="checkbox" checked={showWeather} onChange={e => setShowWeather(e.target.checked)}
          style={{ accentColor: "#3377e1", marginRight: 7 }}
        />
        Weather
      </label>
    </div>
  );
}

/* ========== Weather Info for Sidebar ========== */
function WeatherInfo({ weather }) {
  // PUBLIC_INTERFACE
  if (!weather) return (
    <div style={{ color: "#222" }}>Getting weather...</div>
  );
  const icon = (code => {
    // Open-Meteo Wx Code: https://open-meteo.com/en/docs
    if ([0,1].includes(code)) return "☀️";
    if ([2,3].includes(code)) return "🌥️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51,53,55,61,63,65,80,81,82].includes(code)) return "🌦️";
    if ([71,73,75,77,85,86].includes(code)) return "❄️";
    if ([95,96,99].includes(code)) return "⛈️";
    return "☁️";
  })(weather.weathercode);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      color: "#223", fontWeight: 600, fontSize: "1.07em", marginBottom: 12
    }}>
      <span style={{ fontSize: 19 }}>{icon}</span>
      <span>
        {Math.round(weather.temperature)}°C
      </span>
      <span style={{ fontWeight: 400, fontSize: ".99em", marginLeft: 3 }}>
        Weather
      </span>
    </div>
  );
}

/* ========== Basic Personalization State Panel ========== */
function PersonalizationPanel({ prefs, onChange, theme }) {
  // PUBLIC_INTERFACE
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 12px rgba(44,44,44,0.07)",
        padding: "14px 14px 10px 14px",
        marginBottom: 14,
        fontSize: ".97em",
        color: "#222"
      }}>
      <div style={{
        fontWeight: 700, fontSize: "1.04em", color: theme.primary, marginBottom: 4, marginLeft: 1
      }}>
        User Preferences
      </div>
      <form autoComplete="off">
        <label style={{ display: "block", marginBottom: 5 }}>
          <input
            type="checkbox"
            checked={prefs.preferWellLit}
            onChange={e => onChange({ ...prefs, preferWellLit: e.target.checked })}
            style={{ marginRight: 7, accentColor: theme.secondary }}
          />
          Prefer Well-Lit Routes
        </label>
        <label style={{ display: "block", marginBottom: 5 }}>
          <input
            type="checkbox"
            checked={prefs.avoidCrowds}
            onChange={e => onChange({ ...prefs, avoidCrowds: e.target.checked })}
            style={{ marginRight: 7, accentColor: theme.accent }}
          />
          Avoid Crowds
        </label>
        <label style={{ display: "block", marginBottom: 5 }}>
          <input
            type="checkbox"
            checked={prefs.receiveAlerts}
            onChange={e => onChange({ ...prefs, receiveAlerts: e.target.checked })}
            style={{ marginRight: 7, accentColor: theme.primary }}
          />
          Receive Alerts
        </label>
        <label style={{ display: "block", marginBottom: 5 }}>
          Home/Start location:
          <input
            type="text"
            value={prefs.homeLocation}
            placeholder="Enter a place or address"
            onChange={e => onChange({ ...prefs, homeLocation: e.target.value })}
            style={{
              padding: "5px 7px", borderRadius: 5, border: "1px solid #e2e2e2", marginLeft: 7, fontSize: ".96em"
            }}
            autoComplete="off"
            size={22}
          />
        </label>
      </form>
    </div>
  );
}

/* ========== Feature Column Layout */
function FeatureColumn({ children }) {
  // PUBLIC_INTERFACE
  return (
    <div
      style={{
        minWidth: 260,
        flex: "1 1 280px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {children}
    </div>
  );
}

/* ========== FeatureCard Component */
function FeatureCard({ name, color, children }) {
  // PUBLIC_INTERFACE
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(44,44,44,.07)",
        padding: "22px 18px",
        marginBottom: 4,
        borderLeft: `4px solid ${color || "var(--primary)"}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 120,
        transition: "box-shadow 0.1s",
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: "1rem" }}>{name}</span>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

/* ========== Feature Stubs / Demos for Each Feature ========== */

// PUBLIC_INTERFACE
function CrimeDataStub({ active }) {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="alert" style={{ color: THEME.primary }}>🛑</span>{" "}
      {active ? "Showing crime hotspots on map (demo data)." : "Enable to see hotspots."}
    </div>
  );
}
// PUBLIC_INTERFACE
function LightingDetectionStub({ active }) {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="light" style={{ color: THEME.secondary }}>💡</span>{" "}
      {active ? "Well-lit/unlit routes visualized as overlays." : "Enable to show street lighting."}
    </div>
  );
}
// PUBLIC_INTERFACE
function CrowdDensityStub({ active }) {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="crowd" style={{ color: THEME.accent }}>👥</span>{" "}
      {active ? "Crowd density analysis: shaded map areas." : "Enable for crowd info."}
    </div>
  );
}
// PUBLIC_INTERFACE
function WeatherAdaptationStub({ weather }) {
  let wx = "Cloudy", emoji = "☁️"; // Demo fallback
  if (weather) {
    if ([0, 1].includes(weather.weathercode))      { wx = "Clear";  emoji = "☀️"; }
    else if ([2, 3].includes(weather.weathercode)) { wx = "Cloudy"; emoji = "🌥️"; }
    else if ([45, 48].includes(weather.weathercode)) { wx = "Foggy"; emoji = "🌫️";}
    else if ([51,53,55,61,63,65,80,81,82].includes(weather.weathercode)) { wx = "Rainy"; emoji = "🌦️";}
    else if ([71,73,75,77,85,86].includes(weather.weathercode)) { wx="Snow"; emoji="❄️"; }
    else if ([95,96,99].includes(weather.weathercode)) { wx = "Thunderstorm"; emoji="⛈️"; }
  }
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="weather" style={{ color: THEME.secondary }}>{emoji}</span>{" "}
      Current: {wx}. Smart routing will adjust for weather risks.
    </div>
  );
}
// PUBLIC_INTERFACE
function SOSFeatureStub({ active, onReset }) {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="SOS" style={{ color: THEME.accent }}>🚨</span>{" "}
      Emergency SOS is <b>{active ? "ACTIVE" : "idle"}</b>.
      <br />
      <button
        className="btn"
        style={{
          background: THEME.accent,
          color: "white",
          fontSize: ".95em",
          padding: "7px 22px",
          margin: "10px 0 0 0"
        }}
        onClick={onReset}
        disabled={!active}
      >
        Reset SOS
      </button>
    </div>
  );
}
// PUBLIC_INTERFACE
function PersonalizationStub({ prefs }) {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="settings" style={{ color: THEME.primary }}>⚙️</span>{" "}
      Preferences: {prefs.preferWellLit ? "Prefer Well-Lit" : ""}
      {prefs.avoidCrowds ? ", Avoid Crowds" : ""}
      {prefs.homeLocation ? `, Home: ${prefs.homeLocation}` : ""}
      {!prefs.preferWellLit && !prefs.avoidCrowds && !prefs.homeLocation ? "No special preferences." : ""}
    </div>
  );
}
// PUBLIC_INTERFACE
function DataAggregationStub() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="database" style={{ color: THEME.primary }}>🗄️</span>{" "}
      Aggregates data for safety analysis. (Stub)
    </div>
  );
}
// PUBLIC_INTERFACE
function AIRoutingStub({ prefs }) {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="AI" style={{ color: THEME.secondary }}>🤖</span>{" "}
      AI recommends best routes with:{" "}
      {prefs.preferWellLit && <>Well-Lit</>}
      {prefs.avoidCrowds && <> & Less Crowds</>}
      {!prefs.preferWellLit && !prefs.avoidCrowds && <>Standard settings.</>}
    </div>
  );
}
// PUBLIC_INTERFACE
function UserManagementStub() {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="user" style={{ color: THEME.accent }}>👤</span>{" "}
      User profile, feedback, and demo auth. (Stub)
    </div>
  );
}
// PUBLIC_INTERFACE
function NotificationServiceStub({ notification }) {
  return (
    <div style={{ color: "#333", fontSize: 14 }}>
      <span role="img" aria-label="bell" style={{ color: THEME.secondary }}>🔔</span>{" "}
      {notification ? notification : "No new alerts. (Demo stub)"}
    </div>
  );
}

/* ========== Top Nav: User Profile Pane (Settings Cog with Name) */
function UserMenu({ prefs, onPrefsChange }) {
  // PUBLIC_INTERFACE
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn"
        style={{
          background: THEME.accent,
          color: "white",
          fontWeight: 600,
          borderRadius: 7,
          padding: "7px 17px 7px 13px",
          fontSize: "1.07em"
        }}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-label="Open user profile/settings"
      >
        <span style={{ fontWeight: 900, marginRight: 5, fontSize: "1.13em" }}>👤</span>
        User
        <span style={{ marginLeft: 7, fontWeight: 800 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open &&
        <div
          role="dialog"
          aria-modal="true"
          aria-label="User Preferences"
          style={{
            minWidth: 250,
            position: "absolute",
            right: 0,
            background: "#fff",
            color: "#111",
            top: "110%",
            boxShadow: "0 10px 50px rgb(44,44,44,0.10)",
            borderRadius: 11,
            padding: "20px 18px",
            zIndex: 999,
          }}
        >
          <div style={{ fontWeight: 700, color: THEME.primary, marginBottom: 5 }}>User Preferences</div>
          <PersonalizationPanel prefs={prefs} onChange={onPrefsChange} theme={THEME} />
          <button
            className="btn"
            onClick={() => setOpen(false)}
            style={{
              background: THEME.primary, color: "#fff", fontWeight: 700, fontSize: ".98em",
              marginTop: 6, borderRadius: 7, padding: "6px 16px"
            }}>
            Close
          </button>
        </div>
      }
    </div>
  );
}

export default App;
