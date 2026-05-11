import { useState, useEffect } from "react";
import { useTranslate } from "ra-core";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, RefreshCw, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecurringEvents } from "./RecurringEvents";

type EventbriteEvent = {
  id: string;
  name: string;
  description: string;
  start: string;
  end: string;
  timezone: string;
  url: string;
  venue: { name: string; address: string } | null;
  logo: string | null;
};

const SHORT_DAYS = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(2024, 0, 7 + i); // Jan 7 2024 = Sunday
  return date.toLocaleDateString(undefined, { weekday: "short" });
});

function getEventsOnDay(
  events: EventbriteEvent[],
  year: number,
  month: number,
  day: number
): EventbriteEvent[] {
  return events.filter((e) => {
    if (!e.start) return false;
    const [datePart] = e.start.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    return y === year && m === month + 1 && d === day;
  });
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const [datePart, timePart] = dateStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart ?? "00:00").split(":").map(Number);
  const date = new Date(y, m - 1, d, h, min);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatFullDate(year: number, month: number, day: number): string {
  return new Date(year, month, day).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max = 160): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "…";
}

const TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "EST",
  "America/Chicago": "CST",
  "America/Denver": "MST",
  "America/Phoenix": "MST",
  "America/Los_Angeles": "PST",
  "America/Anchorage": "AKST",
  "Pacific/Honolulu": "HST",
};

function getTimezoneLabel(tz: string): string {
  return TIMEZONE_LABELS[tz] ?? tz;
}

function formatEventDateTime(dateStr: string, tz = ""): string {
  if (!dateStr) return "";
  const [datePart, timePart] = dateStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart ?? "00:00").split(":").map(Number);
  const date = new Date(y, m - 1, d, h, min);
  const timeStr =
    date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return tz ? `${timeStr} ${getTimezoneLabel(tz)}` : timeStr;
}

export const EventsPage = () => {
  const translate = useTranslate();
  const today = new Date();

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [events, setEvents] = useState<EventbriteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/.netlify/functions/eventbrite-events")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setEvents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(translate("crm.events.error"));
        setLoading(false);
      });
  }, [translate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  const selectedEvents = selectedDay
    ? getEventsOnDay(events, year, month, selectedDay)
    : [];

  const featuredEvents = events
    .filter((e) => events.filter((ev) => ev.name === e.name).length === 1)
    .sort((a, b) => a.start.localeCompare(b.start));

  const goToPrevMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const goToNextMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6" />
        <h1 className="text-2xl font-bold">{translate("crm.events.title")}</h1>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold capitalize">{monthLabel}</h2>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {SHORT_DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar body */}
          {loading ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              {translate("crm.events.loading")}
            </div>
          ) : error ? (
            <div className="h-52 flex items-center justify-center text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} />;
                }
                const dayEvents = getEventsOnDay(events, year, month, day);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDay === day;
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() =>
                      hasEvents
                        ? setSelectedDay(isSelected ? null : day)
                        : undefined
                    }
                    disabled={!hasEvents}
                    className={[
                      "flex flex-col items-center py-1 rounded-md transition-colors",
                      hasEvents
                        ? "cursor-pointer hover:bg-muted"
                        : "cursor-default",
                      isSelected ? "bg-muted" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={[
                        "w-8 h-8 flex items-center justify-center rounded-full text-sm",
                        isTodayDay
                          ? "bg-primary text-primary-foreground font-bold"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {day}
                    </span>
                    {hasEvents ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-0.5" />
                    ) : (
                      <span className="w-1.5 h-1.5 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events for selected day */}
      {selectedDay !== null && selectedEvents.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {translate("crm.events.events_on_day", {
              date: formatFullDate(year, month, selectedDay),
            })}
          </h3>
          {selectedEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-snug mb-1.5">
                      {event.name}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {formatTime(event.start)}
                        {event.end && ` – ${formatTime(event.end)}`}
                      </span>
                      {event.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {event.venue.name}
                          {event.venue.address &&
                            ` · ${event.venue.address}`}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {truncate(event.description)}
                      </p>
                    )}
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {translate("crm.events.register")}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {translate("crm.events.no_events_this_month")}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-muted-foreground">
              Featured Events
            </h2>
          </div>
          {featuredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming featured events</p>
          ) : (
            <div className="space-y-3">
              {featuredEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  {event.logo && (
                    <img
                      src={event.logo}
                      alt={event.name}
                      className="w-full h-[300px] object-contain bg-black"
                    />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base leading-snug mb-1.5">
                          {event.name}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {formatEventDateTime(event.start, event.timezone)}
                          </span>
                          {event.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              {event.venue.name}
                              {event.venue.address && ` · ${event.venue.address}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        className="shrink-0 bg-[#CC0000] hover:bg-[#aa0000] text-white"
                      >
                        <a href={event.url} target="_blank" rel="noopener noreferrer">
                          Register on Eventbrite
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-muted-foreground">
            Recurring Events
          </h2>
        </div>
        <RecurringEvents />
      </div>
    </div>
  );
};

EventsPage.path = "/events";
