// import React, { useState, useCallback } from 'react';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Navigation, MapPin } from 'lucide-react';

export default function ShadeRouteMap() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const directionsRendererRef = useRef([]);
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  const originAutocompleteRef = useRef(null);
  const destAutocompleteRef = useRef(null);

  useEffect(() => {
    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBp_7yJL_HcKqbpKAEALv4tWlj_cBPfFXk&libraries=places`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initMap = () => {
    if (mapRef.current && window.google) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 43.4643, lng: -79.7035 }, // Oakville
        zoom: 13,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
    }
  };

  const calculateShadeScore = (route) => {
    // Simulated shade scoring algorithm
    // In production, this would analyze:
    // 1. Street View imagery for tree canopy
    // 2. Building heights + sun angle for shadow casting
    // 3. Time of day and sun position
    
    const baseScore = Math.random() * 100;
    const steps = route.legs[0].steps.length;
    
    // Penalize routes with fewer turns (often more exposed)
    const turnBonus = Math.min(steps * 2, 20);
    
    return Math.round(baseScore + turnBonus);
  };

  const findRoutes = async () => {
    if (!origin || !destination || !window.google) return;
    
    setLoading(true);
    const directionsService = new window.google.maps.DirectionsService();
    
    try {
      // Clear previous routes
      directionsRendererRef.current.forEach(renderer => renderer.setMap(null));
      directionsRendererRef.current = [];

      // Get multiple route alternatives
      const result = await directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.WALKING,
        provideRouteAlternatives: true
      });

      if (result.routes) {
        const scoredRoutes = result.routes.map((route, idx) => ({
          route,
          shadeScore: calculateShadeScore(route),
          id: idx
        }));

        // Sort by shade score
        scoredRoutes.sort((a, b) => b.shadeScore - a.shadeScore);
        setRoutes(scoredRoutes);

        // Render all routes
        scoredRoutes.forEach((scoredRoute, idx) => {
          const renderer = new window.google.maps.DirectionsRenderer({
            map: googleMapRef.current,
            directions: result,
            routeIndex: scoredRoute.id,
            polylineOptions: {
              strokeColor: idx === 0 ? '#10b981' : '#94a3b8',
              strokeWeight: idx === 0 ? 6 : 3,
              strokeOpacity: idx === 0 ? 0.8 : 0.5
            },
            suppressMarkers: false,
            preserveViewport: idx !== 0
          });
          directionsRendererRef.current.push(renderer);
        });

        setSelectedRoute(scoredRoutes[0]);
      }
    } catch (error) {
      console.error('Error finding routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRoute = (scoredRoute, idx) => {
    setSelectedRoute(scoredRoute);
    
    // Update visual emphasis
    directionsRendererRef.current.forEach((renderer, i) => {
      renderer.setOptions({
        polylineOptions: {
          strokeColor: i === idx ? '#10b981' : '#94a3b8',
          strokeWeight: i === idx ? 6 : 3,
          strokeOpacity: i === idx ? 0.8 : 0.5
        }
      });
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-96 bg-white shadow-lg p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <Sun className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-800">Shade Route</h1>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Starting Point
            </label>
            <input
              type="text"
              placeholder="Enter origin address"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Navigation className="w-4 h-4 inline mr-1" />
              Destination
            </label>
            <input
              type="text"
              placeholder="Enter destination address"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={findRoutes}
            disabled={loading || !origin || !destination}
            className="w-full bg-emerald-500 text-white py-3 rounded-lg font-medium hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Finding Shady Routes...' : 'Find Shadiest Route'}
          </button>
        </div>

        {routes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Route Options</h2>
            <div className="space-y-3">
              {routes.map((scoredRoute, idx) => {
                const leg = scoredRoute.route.legs[0];
                return (
                  <button
                    key={idx}
                    onClick={() => selectRoute(scoredRoute, idx)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedRoute?.id === scoredRoute.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">
                        Route {idx + 1}
                        {idx === 0 && <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-1 rounded">Shadiest</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-emerald-600">{scoredRoute.shadeScore}%</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>{leg.distance.text} • {leg.duration.text}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
              <strong>Note:</strong> This demo uses simulated shade scores. A production version would analyze street view imagery, building shadows, and tree coverage for accurate shade prediction.
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        {!window.google && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <p className="text-gray-600 mb-2">Add your Google Maps API key to enable the map</p>
              <p className="text-sm text-gray-500">Replace YOUR_API_KEY in the code</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// import Map, { Marker, Source, Layer } from 'react-map-gl';
// import maplibregl from 'maplibre-gl';
// import 'maplibre-gl/dist/maplibre-gl.css';
// import axios from 'axios';
// import debounce from 'lodash.debounce';

// const API_BASE = 'http://localhost:8000';

// const glassStyle = {
//   background: 'rgba(255,255,255,0.15)',
//   boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
//   backdropFilter: 'blur(8px)',
//   WebkitBackdropFilter: 'blur(8px)',
//   borderRadius: '16px',
//   border: '1px solid rgba(255,255,255,0.18)',
// };

// function App() {
//   const [initialized, setInitialized] = useState(false);
//   const [loading, setLoading] = useState(false);

//   // New state for address search
//   const [originQuery, setOriginQuery] = useState('');
//   const [originOptions, setOriginOptions] = useState([]);
//   const [origin, setOrigin] = useState(null);

//   const [destinationQuery, setDestinationQuery] = useState('');
//   const [destinationOptions, setDestinationOptions] = useState([]);
//   const [destination, setDestination] = useState(null);

//   const [route, setRoute] = useState(null);
//   const [routeStats, setRouteStats] = useState(null);
//   const [shadePreference, setShadePreference] = useState(0.5);
//   const [datetime, setDatetime] = useState('2024-08-16T12:00:00');

//   const [country, setCountry] = useState('');
//   const [province, setProvince] = useState('');

//   const handleAddressSearch = useCallback(
//     debounce(async (query, setOptions) => {
//       if (!query) {
//         setOptions([]);
//         return;
//       }
//       let fullQuery = query;
//       if (province) fullQuery += `, ${province}`;
//       if (country) fullQuery += `, ${country}`;
//       try {
//         const res = await axios.get(
//           `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}`
//         );
//         setOptions(res.data);
//       } catch (error) {
//         setOptions([]);
//         alert('Address search service is temporarily unavailable. Please try again later.');
//       }
//     }, 500),
//     [country, province]
//   );

//   const initializeSystem = async () => {
//     if (!country || !province) {
//       alert('Please enter both country and province/state.');
//       return;
//     }
//     setLoading(true);
//     try {
//       await axios.post(`${API_BASE}/initialize`, {
//         place_name: `${province}, ${country}`,
//         latitude: 43.65,
//         longitude: -79.38,
//         timezone: "America/Toronto"
//       });
//       setInitialized(true);
//       alert('System initialized! Type and select your origin and destination.');
//     } catch (error) {
//       console.error('Initialization failed:', error);
//       alert('Initialization failed. Check console for details.');
//     }
//     setLoading(false);
//   };

//   const calculateRoute = async () => {
//     if (!origin || !destination) {
//       alert('Please set both origin and destination.');
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await axios.post(
//         `${API_BASE}/route`,
//         {
//           origin: origin,
//           destination: destination,
//           datetime: datetime,
//           shade_preference: shadePreference
//         }
//         // { timeout: 60000 } // 20 seconds timeout
//       );

//       setRoute(response.data.route_geojson);
//       setRouteStats(response.data.stats);
//     } catch (error) {
//       console.error('Route calculation failed:', error);
//       if (error.code === 'ECONNABORTED') {
//         alert('Route calculation timed out. Please try again or adjust your input.');
//       } else if (error.response) {
//         alert(`Route calculation failed: ${error.response.status} ${error.response.statusText}`);
//       } else {
//         alert('Route calculation failed. Check console for details.');
//       }
//     }
//     setLoading(false);
//   };

//   return (
//     <div style={{ height: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
//       {/* Glassmorphism Control Panel */}
//       <div style={{
//         width: 340,
//         padding: 24,
//         ...glassStyle,
//         margin: 24,
//         position: 'absolute',
//         zIndex: 10,
//         left: 0,
//         top: 0,
//         color: '#222'
//       }}>
//         <h2 style={{ fontWeight: 700, letterSpacing: 1 }}>Shade-Aware Routing</h2>
//         {/* Country/Province Inputs */}
//         <div style={{ marginBottom: 16 }}>
//           <label>Country:</label>
//           <input
//             type="text"
//             placeholder="Enter country (e.g., Canada)"
//             value={country}
//             onChange={e => setCountry(e.target.value)}
//             style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc', marginTop: 4, marginBottom: 8, background: 'rgba(255,255,255,0.5)' }}
//           />
//           <label>Province/State:</label>
//           <input
//             type="text"
//             placeholder="Enter province/state (e.g., Ontario)"
//             value={province}
//             onChange={e => setProvince(e.target.value)}
//             style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc', marginTop: 4, background: 'rgba(255,255,255,0.5)' }}
//           />
//         </div>
//         {/* Initialize Button */}
//         {!initialized ? (
//           <button
//             onClick={initializeSystem}
//             disabled={loading}
//             style={{
//               width: '100%',
//               padding: 12,
//               marginBottom: 16,
//               borderRadius: 12,
//               border: 'none',
//               fontWeight: 600,
//               fontSize: 16,
//               color: '#fff',
//               background: 'rgba(30, 41, 59, 0.7)',
//               cursor: loading ? 'not-allowed' : 'pointer',
//               ...glassStyle
//             }}
//           >
//             {loading ? 'Initializing...' : 'Initialize System'}
//           </button>
//         ) : (
//           <>
//             {/* Origin Input */}
//             <div style={{ marginBottom: 12 }}>
//               <label>Origin:</label>
//               <input
//                 type="text"
//                 placeholder="Enter your location"
//                 value={originQuery}
//                 onChange={e => {
//                   setOriginQuery(e.target.value);
//                   handleAddressSearch(e.target.value, setOriginOptions);
//                 }}
//                 style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc', marginTop: 4, background: 'rgba(255,255,255,0.5)' }}
//               />
//               <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 100, overflowY: 'auto', background: '#fff', border: originOptions.length ? '1px solid #ccc' : 'none', borderRadius: 8 }}>
//                 {originOptions.map(option => (
//                   <li
//                     key={option.place_id}
//                     onClick={() => {
//                       setOrigin([parseFloat(option.lat), parseFloat(option.lon)]);
//                       setOriginQuery(option.display_name);
//                       setOriginOptions([]);
//                     }}
//                     style={{ cursor: 'pointer', padding: 6 }}
//                   >
//                     {option.display_name}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//             {/* Destination Input */}
//             <div style={{ marginBottom: 12 }}>
//               <label>Destination:</label>
//               <input
//                 type="text"
//                 placeholder="Enter your destination"
//                 value={destinationQuery}
//                 onChange={e => {
//                   setDestinationQuery(e.target.value);
//                   handleAddressSearch(e.target.value, setDestinationOptions);
//                 }}
//                 style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc', marginTop: 4, background: 'rgba(255,255,255,0.5)' }}
//               />
//               <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 100, overflowY: 'auto', background: '#fff', border: destinationOptions.length ? '1px solid #ccc' : 'none', borderRadius: 8 }}>
//                 {destinationOptions.map(option => (
//                   <li
//                     key={option.place_id}
//                     onClick={() => {
//                       setDestination([parseFloat(option.lat), parseFloat(option.lon)]);
//                       setDestinationQuery(option.display_name);
//                       setDestinationOptions([]);
//                     }}
//                     style={{ cursor: 'pointer', padding: 6 }}
//                   >
//                     {option.display_name}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//             {/* Date/Time, Shade Preference, Route Button */}
//             <div style={{ marginBottom: 12 }}>
//               <label>Date & Time:</label>
//               <input
//                 type="datetime-local"
//                 value={datetime}
//                 onChange={e => setDatetime(e.target.value)}
//                 style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc', marginTop: 4, background: 'rgba(255,255,255,0.5)' }}
//               />
//             </div>
//             <div style={{ marginBottom: 12 }}>
//               <label>Shade Preference: {(shadePreference * 100).toFixed(0)}%</label>
//               <input
//                 type="range"
//                 min="0"
//                 max="1"
//                 step="0.1"
//                 value={shadePreference}
//                 onChange={e => setShadePreference(parseFloat(e.target.value))}
//                 style={{ width: '100%' }}
//               />
//               <small>0% = Shortest distance, 100% = Maximum shade</small>
//             </div>
//             <button
//               onClick={calculateRoute}
//               disabled={loading || !origin || !destination}
//               style={{
//                 width: '100%',
//                 padding: 12,
//                 marginBottom: 16,
//                 borderRadius: 12,
//                 border: 'none',
//                 fontWeight: 600,
//                 fontSize: 16,
//                 color: '#fff',
//                 background: 'rgba(30, 41, 59, 0.7)',
//                 cursor: loading ? 'not-allowed' : 'pointer',
//                 ...glassStyle
//               }}
//             >
//               {loading ? 'Calculating...' : 'Find Shaded Route'}
//             </button>
//             {routeStats && (
//               <div style={{ background: 'rgba(255,255,255,0.7)', padding: 10, borderRadius: 8 }}>
//                 <h4>Route Statistics:</h4>
//                 <p>Distance: {(routeStats.total_distance_m / 1000).toFixed(2)} km</p>
//                 <p>Shaded: {routeStats.shade_percentage}%</p>
//                 <p>Shaded Distance: {(routeStats.shaded_distance_m / 1000).toFixed(2)} km</p>
//               </div>
//             )}
//           </>
//         )}
//       </div>
//       {/* Modern Map */}
//       <div style={{ flex: 1 }}>
//         <Map
//           mapLib={maplibregl}
//           initialViewState={{
//             latitude: 43.65,
//             longitude: -79.38,
//             zoom: 13
//           }}
//           style={{ width: '100%', height: '100%' }}
//           mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
//         >
//           {/* Markers */}
//           {origin && (
//             <Marker longitude={origin[1]} latitude={origin[0]} color="green" />
//           )}
//           {destination && (
//             <Marker longitude={destination[1]} latitude={destination[0]} color="red" />
//           )}
//           {/* Route GeoJSON */}
//           {route && (
//             <Source id="route" type="geojson" data={route}>
//               <Layer
//                 id="route-layer"
//                 type="line"
//                 paint={{
//                   'line-color': '#2563eb',
//                   'line-width': 6,
//                   'line-opacity': 0.8
//                 }}
//               />
//             </Source>
//           )}
//         </Map>
//       </div>
//     </div>
//   );
// }

// export default App;
