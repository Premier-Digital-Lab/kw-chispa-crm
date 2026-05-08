import { useTranslate } from "ra-core";
import { Calendar, ExternalLink } from "lucide-react";
import { Link } from "react-router";

import { Card, CardContent } from "@/components/ui/card";

const EVENTBRITE_URL = "https://www.eventbrite.com/o/kw-chispa-50449792693";

export const UpcomingEvents = () => {
  const translate = useTranslate();

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
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <iframe
            src={EVENTBRITE_URL}
            title={translate("crm.events.upcoming_events")}
            className="w-full border-0"
            style={{ height: "400px" }}
            loading="lazy"
          />
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
