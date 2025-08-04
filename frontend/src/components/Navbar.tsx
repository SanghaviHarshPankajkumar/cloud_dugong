/* eslint-disable @typescript-eslint/no-unused-vars */
//Navbar.tsx
import React, { useState, useEffect } from "react";
import { LogOut, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLink, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/auth";
import { useImageStore } from "@/store/image";
import { useUploadStore } from "@/store/upload";
import axios from "axios";

interface NavbarProps {
  imageCount?: number;
  onUploadClick?: () => void;
  userName?: string;
  userEmail?: string;
}

// Utility function to get initials from user name
function getInitials(name: string) {
  if (!name) return "";
  const words = name.trim().split(" ");
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// Utility function to format time remaining
function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

const Navbar: React.FC<NavbarProps> = ({ imageCount = 0 }) => {
  const navigate = useNavigate();
  const [sessionTimeLeft, setSessionTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const { sessionId, sessionStartTime } = useUploadStore();
  const { username: userName, email: userEmail } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogout = React.useCallback(async () => {
    try {
      // Call backend cleanup endpoint before logging out
      if (userEmail && sessionId) {
        await axios.post(
          `${API_URL}/cleanup-sessions/${userEmail}?session_id=${sessionId}`
        );
      }
    } catch (err) {
      // console.error("Cleanup on logout failed", err);
    }
    // Clear all stores and localStorage
    Cookies.remove("access_token");
    useAuthStore.getState().clearStore();
    useImageStore.getState().clearStore();
    if (useImageStore) {
      useImageStore.getState().setApiResponse(null);
    }
    // Remove all related localStorage keys
    localStorage.removeItem("auth-storage");
    localStorage.removeItem("upload-store");
    localStorage.removeItem("image-storage");
    navigate("/");
  }, [userEmail, sessionId, navigate, API_URL]);

  const handleSessionExpiry = React.useCallback(() => {
    handleLogout();
  }, [handleLogout]);

  // Update session timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (sessionStartTime) {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const remaining = Math.max(0, 15 * 60 - elapsed);
        setSessionTimeLeft(remaining);

        if (remaining === 0 && !isSessionExpired) {
          setIsSessionExpired(true);
          // Auto logout when session expires
          handleSessionExpiry();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, isSessionExpired, handleSessionExpiry]);

  // Get timer color based on time remaining
  const getTimerColor = () => {
    if (sessionTimeLeft <= 5 * 60) return "text-red-600"; // Last 5 minutes
    if (sessionTimeLeft <= 10 * 60) return "text-orange-600"; // Last 10 minutes
    return "text-green-600"; // More than 10 minutes
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main navbar row */}
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left Section - Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              <span className="hidden sm:inline">Dugong Detector</span>
              <span className="sm:hidden">Dugong</span>
            </h1>
          </div>

          {/* Right Section - Status, Timer, and User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Status Badge - Hidden on very small screens */}
            {imageCount > 0 && (
              <div className="hidden xs:flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-medium text-green-700">
                  <span className="hidden sm:inline">{imageCount} Active</span>
                  <span className="sm:hidden">{imageCount}</span>
                </span>
              </div>
            )}

            {/* Session Timer - Compact on mobile */}
            {sessionId && sessionStartTime && (
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-slate-50 border border-slate-200 rounded-full">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" />
                <span className={`text-xs sm:text-sm font-medium ${getTimerColor()} whitespace-nowrap`}>
                  {formatTimeRemaining(sessionTimeLeft)}
                </span>
              </div>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="cursor-pointer relative h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-full"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-md">
                    {userName && getInitials(userName)}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sessionId && sessionStartTime && (
                  <>
                    <DropdownMenuItem disabled>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className={`text-sm ${getTimerColor()}`}>
                          Session: {formatTimeRemaining(sessionTimeLeft)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem className="gap-2 text-red-600">
                  <NavLink
                    to="/"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </NavLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile-only second row for status when needed */}
        {imageCount > 0 && (
          <div className="xs:hidden pb-2">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">
                  {imageCount} Active
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;