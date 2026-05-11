import type { ReactNode } from "react";
import { Calendar, Settings, User, Users, Star, Sparkles } from "lucide-react";
import { CanAccess, useTranslate, useUserMenu } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { useConfigurationContext } from "../root/ConfigurationContext";

const Header = () => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();
  const translate = useTranslate();

  let currentPath: string | boolean = "/";
  if (matchPath("/", location.pathname)) {
    currentPath = "/";
  } else if (matchPath("/find-agent", location.pathname)) {
    currentPath = "/find-agent";
  } else if (matchPath("/contacts/*", location.pathname)) {
    currentPath = "/contacts";
  } else if (matchPath("/companies/*", location.pathname)) {
    currentPath = "/companies";
  } else if (matchPath("/deals/*", location.pathname)) {
    currentPath = "/deals";
  } else if (matchPath("/premier", location.pathname)) {
    currentPath = "/premier";
  } else if (matchPath("/content-generator", location.pathname)) {
    currentPath = "/content-generator";
  } else if (matchPath("/events", location.pathname)) {
    currentPath = "/events";
  } else {
    currentPath = false;
  }

  return (
    <>
      <nav className="grow">
        <header className="bg-secondary">
          <div className="px-4">
            <div className="flex justify-between items-center flex-1">
              <Link
                to="/"
                className="flex items-center gap-2 text-secondary-foreground no-underline"
              >
                <img
                  className="[.light_&]:hidden h-12"
                  src={darkModeLogo}
                  alt={title}
                />
                <img
                  className="[.dark_&]:hidden h-12"
                  src={lightModeLogo}
                  alt={title}
                />
                <h1 className="text-2xl font-semibold">Central</h1>
              </Link>
              <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <nav className="flex">
                  <NavigationTab
                    label={translate("ra.page.dashboard")}
                    to="/"
                    isActive={currentPath === "/"}
                  />
                  <NavigationTab
                    label={translate("crm.find_agent.nav_label")}
                    to="/find-agent"
                    isActive={currentPath === "/find-agent"}
                  />
                  <NavigationTab
                    label={translate("resources.contacts.name", {
                      smart_count: 2,
                    })}
                    to="/contacts"
                    isActive={currentPath === "/contacts"}
                  />
                  <NavigationTab
                    label={translate("crm.premier.nav_label")}
                    to="/premier"
                    isActive={currentPath === "/premier"}
                    icon={<Star className="w-3.5 h-3.5" />}
                  />
                  <NavigationTab
                    label={translate("crm.content_generator.nav_label")}
                    to="/content-generator"
                    isActive={currentPath === "/content-generator"}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                  />
                  <NavigationTab
                    label={translate("crm.events.nav_label")}
                    to="/events"
                    isActive={currentPath === "/events"}
                    icon={<Calendar className="w-3.5 h-3.5" />}
                  />
                </nav>
              </div>
              <div className="flex items-center">
                <ThemeModeToggle />
                <RefreshButton />
                <UserMenu>
                  <ProfileMenu />
                  <CanAccess resource="sales" action="list">
                    <UsersMenu />
                  </CanAccess>
                  <CanAccess resource="configuration" action="edit">
                    <SettingsMenu />
                  </CanAccess>
                </UserMenu>
              </div>
            </div>
          </div>
        </header>
        <div style={{height: "3px", background: "linear-gradient(90deg, #CC0000 0%, #e6a817 50%, #CC0000 100%)"}} />
      </nav>
    </>
  );
};

const NavigationTab = ({
  label,
  to,
  isActive,
  icon,
}: {
  label: string;
  to: string;
  isActive: boolean;
  icon?: ReactNode;
}) => (
  <Link
    to={to}
    className={`flex items-center gap-1.5 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
      isActive
        ? "text-secondary-foreground border-secondary-foreground"
        : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
    }`}
  >
    {icon}
    {label}
  </Link>
);

const UsersMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<UsersMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/sales" className="flex items-center gap-2">
        <Users />
        {translate("resources.sales.name", { smart_count: 2 })}
      </Link>
    </DropdownMenuItem>
  );
};

const ProfileMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ProfileMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/profile" className="flex items-center gap-2">
        <User />
        {translate("crm.profile.title")}
      </Link>
    </DropdownMenuItem>
  );
};

const SettingsMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<SettingsMenu> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <Settings />
        {translate("crm.settings.title")}
      </Link>
    </DropdownMenuItem>
  );
};

export default Header;
