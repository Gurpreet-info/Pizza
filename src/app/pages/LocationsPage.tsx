import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MapPin, Phone, Clock, ExternalLink } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { usePageMeta } from '../hooks/usePageMeta';

/**
 * Map embeds use each location’s `address` from the API.
 * To change what appears on the map: Admin → Locations → edit “address” (or update rows
 * in the `locations` table). Use a full street address + city (and postal code if needed)
 * so Google resolves the pin correctly.
 */
function googleMapsEmbedUrl(address: string) {
  const q = encodeURIComponent(address.trim());
  return `https://maps.google.com/maps?q=${q}&output=embed`;
}

function googleMapsOpenUrl(address: string) {
  const q = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function LocationsPage() {
  usePageMeta(
    'Locations',
    'Find Pizza Offers store addresses, hours, phone numbers, and map directions for pickup or visits.'
  );

  const { locations, ensureLocationsPageLoaded } = useApp();

  useEffect(() => {
    void ensureLocationsPageLoaded();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Our Locations</h1>
        <p className="text-gray-600 text-lg">Visit us at any of our convenient locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {locations.map((location) => (
          <Card key={location.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video relative">
              <ImageWithFallback
                src={location.image || 'https://images.unsplash.com/photo-1752754331999-a20ee211ec20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwc3RvcmVmcm9udCUyMGV4dGVyaW9yfGVufDF8fHx8MTc3NDY4ODU1NHww&ixlib=rb-4.1.0&q=80&w=1080'}
                alt={location.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle>{location.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-gray-600">{location.address}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-gray-600">{location.phone}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Hours</p>
                  <p className="text-gray-600">{location.hours}</p>
                </div>
              </div>

              {location.address?.trim() ? (
                <div className="pt-2 space-y-2">
                  <p className="text-sm font-medium text-gray-900">Map</p>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-inner">
                    <iframe
                      title={`Map for ${location.name}`}
                      className="aspect-video min-h-[220px] w-full border-0 sm:min-h-[260px]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={googleMapsEmbedUrl(location.address)}
                      allowFullScreen
                    />
                  </div>
                  <a
                    href={googleMapsOpenUrl(location.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    Open in Google Maps
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
