import { RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import chispaRaicesImg from "@/assets/chispa-raices.png";
import despertarImg from "@/assets/despertar-en-comunidad.png";

type RecurringEvent = {
  image: string;
  name: string;
  schedule: string;
  platform: string;
  url: string;
};

const RECURRING_EVENTS: RecurringEvent[] = [
  {
    image: chispaRaicesImg,
    name: "CHISPA RAICES",
    schedule: "Every Thursday · 11 AM CST / 12 PM EST",
    platform: "Facebook Live",
    url: "https://www.eventbrite.com/e/chispa-raices-tickets-1011311047567",
  },
  {
    image: despertarImg,
    name: "Despertar en Comunidad con KW CHISPA",
    schedule: "Monday–Friday · 8 AM CT / 9 AM EST",
    platform: "Zoom & Facebook Live",
    url: "https://www.eventbrite.com/e/despertar-en-comunidad-con-kw-chispa-tickets-1989064925737",
  },
];

export const RecurringEvents = () => (
  <div className="flex flex-col gap-4 sm:flex-row">
    {RECURRING_EVENTS.map((event) => (
      <Card key={event.name} className="flex-1 overflow-hidden flex flex-col">
        <img
          src={event.image}
          alt={event.name}
          className="w-full max-h-64 object-contain bg-muted"
        />
        <CardContent className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug">{event.name}</h3>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#CC0000] text-white text-xs font-medium px-2 py-0.5">
              <RefreshCw className="w-3 h-3" />
              Recurring Event
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{event.schedule}</p>
          <p className="text-xs text-muted-foreground">{event.platform}</p>
          <Button
            asChild
            size="sm"
            className="mt-auto bg-[#CC0000] hover:bg-[#aa0000] text-white"
          >
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              Register on Eventbrite
            </a>
          </Button>
        </CardContent>
      </Card>
    ))}
  </div>
);
