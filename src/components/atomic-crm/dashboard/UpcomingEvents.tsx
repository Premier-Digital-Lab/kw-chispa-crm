import { useState, useEffect } from "react";
import { useTranslate } from "ra-core";
import { Calendar, ExternalLink, MapPin } from "lucide-react";
import { Link } from "react-router";

import { Card, CardContent } from "@/components/ui/card";

type EventbriteEvent = {
  id: string;
  name: string;
  start: string;
  url: string;
  venue: { name: string; address: string } | null;
};

function formatEventDate(dateStr: string): string {
  if (!dateStr) return "";
  const [datePart] = dateStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(dateStr: string): string {
  if (!dateStr) return "";
  const [datePart, timePart] = dateStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function filterUpcoming(events: EventbriteEvent[]): EventbriteEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => {
      if (!e.start) return false;
      const [datePart] = e.start.split("T");
      const [y, m, d] = datePart.split("-").map(Number);
      return new Date(y, m - 1, d) >= today;
    })
    .slice(0, 5);
}

export const UpcomingEvents = () => {
  const translate = useTranslate();
  const [events, setEvents] = useState<EventbriteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/.netlify/functions/eventbrite-events")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setEvents(filterUpcoming(Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="mr-3 flex">
          <Calendar className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground flex-1">
          {translate("crm.events.upcoming_events")}
        </h2>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error || events.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {error
                ? translate("crm.events.error")
                : translate("crm.events.no_upcoming_events")}
            </div>
          ) : (
            <div className="divide-y">
              {events.map((event) => (
                <div key={event.id} className="px-4 py-3">
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline leading-snug block mb-0.5"
                  >
                    {event.name}
                  </a>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>
                      {formatEventDate(event.start)} ·{" "}
                      {formatEventTime(event.start)}
                    </span>
                    {event.venue?.name && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {event.venue.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <div className="px-4 py-3 border-t">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {translate("crm.events.view_all_events")}
          </Link>
        </div>
      </Card>
    </div>
  );
};
