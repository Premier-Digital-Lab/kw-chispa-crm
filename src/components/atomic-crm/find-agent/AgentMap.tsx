import { useEffect } from "react";
import { useTranslate } from "ra-core";
import { Link } from "react-router";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import type { Contact } from "../types";

// Fix Leaflet's default icon URLs broken by Vite's asset pipeline
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const US_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

// Fits map bounds to all visible pins after results load
const BoundsAdjuster = ({ contacts }: { contacts: Contact[] }) => {
  const map = useMap();

  useEffect(() => {
    const pinned = contacts.filter(
      (c) => c.latitude != null && c.longitude != null
    );
    if (pinned.length === 0) return;

    const bounds = L.latLngBounds(
      pinned.map((c) => [c.latitude!, c.longitude!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [contacts, map]);

  return null;
};

export const AgentMap = ({ contacts }: { contacts: Contact[] }) => {
  const translate = useTranslate();

  const pinned = contacts.filter(
    (c) => c.latitude != null && c.longitude != null
  );

  return (
    <div className="rounded-lg overflow-hidden border">
      {pinned.length === 0 ? (
        <div className="h-[400px] sm:h-[500px] flex items-center justify-center text-sm text-muted-foreground bg-muted">
          {translate("crm.find_agent.map_no_locations")}
        </div>
      ) : (
        <MapContainer
          center={US_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-[400px] sm:h-[500px] w-full dark:[filter:invert(0.85)_hue-rotate(180deg)_brightness(0.9)]"
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <BoundsAdjuster contacts={contacts} />
          {pinned.map((contact) => (
            <Marker
              key={contact.id}
              position={[contact.latitude!, contact.longitude!]}
            >
              <Popup minWidth={220}>
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold text-base mb-1">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.agent_role && (
                    <p className="text-muted-foreground">{contact.agent_role}</p>
                  )}
                  {contact.market_center_name && (
                    <p>{contact.market_center_name}</p>
                  )}
                  {(contact.mc_city || contact.mc_state) && (
                    <p className="text-muted-foreground">
                      {[contact.mc_city, contact.mc_state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {contact.languages_spoken && contact.languages_spoken.length > 0 && (
                    <p>
                      <span className="font-medium">Languages:</span>{" "}
                      {contact.languages_spoken.join(", ")}
                    </p>
                  )}
                  {contact.cell_number && (
                    <p>
                      <a
                        href={`tel:${contact.cell_number}`}
                        className="underline hover:no-underline"
                      >
                        {contact.cell_number}
                      </a>
                    </p>
                  )}
                  {contact.email_jsonb?.[0]?.email && (
                    <p>
                      <a
                        href={`mailto:${contact.email_jsonb[0].email}`}
                        className="underline hover:no-underline"
                      >
                        {contact.email_jsonb[0].email}
                      </a>
                    </p>
                  )}
                  <div className="pt-1">
                    <Link
                      to={`/contacts/${contact.id}/show`}
                      className="text-primary underline hover:no-underline font-medium"
                    >
                      View Profile →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
};
