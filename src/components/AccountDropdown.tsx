"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function AccountDropdown({ 
  className = "",
  compact = false,
}: { 
  className?: string;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const { data: session } = useSession();
  const [businessName, setBusinessName] = useState<string>("");

  const isAdmin = session?.user?.role === "ADMIN";

  // Fetch business profile if available
  useEffect(() => {
    if (!session) return;

    fetch("/api/business/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.name && data.name.trim()) {
          setBusinessName(data.name.trim());
        }
      })
      .catch(() => {});
  }, [session]);

  const activeName = (
    businessName || 
    session?.user?.businessName || 
    session?.user?.name || 
    "iBrainLabs"
  ).trim();

  const activeInitial = (activeName[0] || "Y").toUpperCase();

  return (
    <div className={`relative ${className}`}>
      {/* Meta Business Suite Style Static Account Badge (No Popup) */}
      <div
        className="w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-white border border-slate-200/90 rounded-xl shadow-2xs select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar Square with Initial (matching reference screenshot) */}
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-heading font-extrabold text-sm shadow-2xs shrink-0">
            {activeInitial}
          </div>

          {/* Account / Business Name */}
          <div className="flex flex-col text-left min-w-0">
            <span className="font-heading font-bold text-xs sm:text-sm text-slate-800 tracking-wide uppercase truncate max-w-[140px] leading-tight">
              {activeName}
            </span>
            {isAdmin && !compact && (
              <span className="text-[9px] font-bold text-brand-purple uppercase tracking-wider leading-none mt-0.5">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
