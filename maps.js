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
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
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

      // Initialize autocomplete for origin
      if (originInputRef.current) {
        originAutocompleteRef.current = new window.google.maps.places.Autocomplete(
          originInputRef.current,
          { fields: ['formatted_address', 'geometry', 'name'] }
        );
        
        originAutocompleteRef.current.addListener('place_changed', () => {
          const place = originAutocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setOrigin(place.formatted_address);
          }
        });
      }

      // Initialize autocomplete for destination
      if (destInputRef.current) {
        destAutocompleteRef.current = new window.google.maps.places.Autocomplete(
          destInputRef.current,
          { fields: ['formatted_address', 'geometry', 'name'] }
        );
        
        destAutocompleteRef.current.addListener('place_changed', () => {
          const place = destAutocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setDestination(place.formatted_address);
          }
        });
      }
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
              ref={originInputRef}
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
              ref={destInputRef}
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
