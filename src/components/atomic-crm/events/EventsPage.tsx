import { useTranslate } from "ra-core";
import { Calendar, ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/card";

const EVENTBRITE_URL = "https://www.eventbrite.com/o/kw-chispa-50449792693";

export const EventsPage = () => {
  const translate = useTranslate();

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6" />
        <h1 className="text-2xl font-bold">{translate("crm.events.title")}</h1>
      </div>

      <Card className="overflow-hidden">
        <iframe
          src={EVENTBRITE_URL}
          title={translate("crm.events.title")}
          className="w-full border-0"
          style={{ minHeight: "800px" }}
          loading="lazy"
        />
      </Card>

      <div className="mt-4 text-center">
        <a
          href={EVENTBRITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {translate("crm.events.view_on_eventbrite")}
        </a>
      </div>
    </div>
  );
};

EventsPage.path = "/events";
