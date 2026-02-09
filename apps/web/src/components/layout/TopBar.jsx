import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Search, Bell, HelpCircle, Calendar, ChevronDown, LogOut, User, Shield, Moon, Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NotificationManager from "@/components/notifications/NotificationManager";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";

export default function TopBar({ onHelpClick, isAdmin, children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState("Last 7 days");
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const datePresets = ["Today", "Yesterday", "Last 7 days", "Last 30 days", "Last 90 days"];

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 lg:px-6 gap-2 lg:gap-4 flex-shrink-0">
      {/* Mobile Nav */}
      {children}
      
      {/* Date Range */}
      {!isAdmin && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 h-9">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-sm">{dateRange}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="start">
            {datePresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setDateRange(preset)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  dateRange === preset ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {preset}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {/* Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={isAdmin ? "Search tenants, users..." : "Search people, companies, pages..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-slate-500 dark:text-slate-400 hidden sm:flex" 
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Notifications */}
        <NotificationManager currentUser={user} />

        {/* Help */}
        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 dark:text-slate-400" onClick={onHelpClick}>
          <HelpCircle className="w-4 h-4" />
        </Button>

        {/* Admin toggle */}
        {user?.role === "admin" && (
          <Link to={createPageUrl(isAdmin ? "Home" : "AdminTenants")} className="hidden md:block">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-1.5 bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{isAdmin ? "View Customer App" : "View Admin Portal"}</span>
            </Button>
          </Link>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {user?.full_name?.charAt(0) || "U"}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <p className="text-sm font-medium dark:text-slate-200">{user?.full_name || "User"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={createPageUrl("Profile")} className="flex items-center cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}