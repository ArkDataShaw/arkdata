import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

export default function NotificationManager({ currentUser }) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      setEnabled(localStorage.getItem("push-notifications") === "true");
    }
  }, []);

  useEffect(() => {
    if (!enabled || !currentUser) return;

    // Subscribe to notifications for this user
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data.user_email === currentUser.email && event.type === "create") {
        showNotification(event.data);
      }
    });

    return unsubscribe;
  }, [enabled, currentUser]);

  const requestPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setEnabled(true);
        localStorage.setItem("push-notifications", "true");
        
        // Test notification
        new Notification("Notifications Enabled", {
          body: "You'll now receive important updates from Ark Data",
          icon: "/logo.png",
          badge: "/logo.png"
        });
      }
    }
  };

  const toggleNotifications = () => {
    if (permission !== "granted") {
      requestPermission();
    } else {
      const newState = !enabled;
      setEnabled(newState);
      localStorage.setItem("push-notifications", newState.toString());
    }
  };

  const showNotification = (data) => {
    if (permission === "granted" && enabled) {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || "/logo.png",
        badge: "/logo.png",
        tag: data.type,
        requireInteraction: data.type === "visitor_identified" || data.type === "rule_triggered"
      });

      notification.onclick = () => {
        window.focus();
        if (data.link) {
          window.location.href = data.link;
        }
        notification.close();
      };
    }
  };

  if (!("Notification" in window)) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-slate-500 dark:text-slate-400"
      onClick={toggleNotifications}
      title={enabled ? "Disable notifications" : "Enable notifications"}
    >
      {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
    </Button>
  );
}