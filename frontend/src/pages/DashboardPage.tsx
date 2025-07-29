/* eslint-disable @typescript-eslint/no-unused-vars */
import Navbar from "@/components/Navbar";
import AnimatedBackground from "../components/AnimatedBackground";
import EmptyState from "../components/EmptyState";
import DashboardHeader from "../components/DashboardHeader";
import ImageViewer from "../components/ImageViewer";
import ResultsSidebar from "../components/ResultsSidebar";
import { useImageStore } from "../store/image";
import { useAuthStore } from "../store/auth";
import { useUploadStore } from "../store/upload";
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const DashboardPage = () => {
  const {
    currentImage,
    totalImages,
    apiResponse,
    setApiResponse,
    handlePrevious,
    handleNext,
    getCurrentImageData,
  } = useImageStore();

  const authSessionId = useAuthStore((state) => state.sessionId);
  const uploadSessionId = useUploadStore((state) => state.sessionId);
  const setUploadSessionId = useUploadStore((state) => state.setSessionId);

  const [markedPoorImages, setMarkedPoorImages] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  // const [lastImageCount, setLastImageCount] = useState(0);

  useEffect(() => {
    if (authSessionId && authSessionId !== uploadSessionId) {
      setUploadSessionId(authSessionId);
    }
  }, [authSessionId, uploadSessionId, setUploadSessionId]);

  type SessionFile = {
    filename: string;
    createdAt?: string;
    dugongCount?: number;
    calfCount?: number;
    imageClass?: string;
    imageUrl?: string;
  };

  // Fetch full session metadata and update image store
  const fetchSessionMetadata = async (sessionId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/session-status/${sessionId}`
      );
      if (response.data && response.data.success) {
        setApiResponse({
          results: response.data.files.map(
            (file: SessionFile, idx: number) => ({
              imageId: idx,
              imageUrl: file.imageUrl || "",
              createdAt: file.createdAt || response.data.lastActivity || "",
              dugongCount: file.dugongCount ?? 0,
              calfCount: file.calfCount ?? 0,
              imageClass: file.imageClass ?? "N/A",
            })
          ),
        });
        // setLastImageCount(response.data.files.length);
        return response.data.files.length;
      }
    } catch (error) {
      // console.error("Failed to fetch session metadata", error);
    }
    return 0;
  };

  // On dashboard load, fetch all images for the session
  useEffect(() => {
    if (uploadSessionId) {
      fetchSessionMetadata(uploadSessionId);
    }
    // eslint-disable-next-line
  }, [uploadSessionId]);

  // Polling function after upload
  const pollForImages = async (sessionId: string, initialCount: number) => {
    setIsPolling(true);
    let attempts = 0;
    let latestCount = initialCount;
    while (attempts < 15) {
      // up to 30 seconds (2s interval)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const count = await fetchSessionMetadata(sessionId);
      if (count > latestCount) {
        latestCount = count;
        // Optionally, break if you know the expected count
        // break;
      }
      attempts++;
    }
    setIsPolling(false);
  };

  // After upload, backfill detection results and poll for all images
  const handleImageUpload = async () => {
    if (uploadSessionId) {
      try {
        await axios.post(
          `${API_URL}/api/backfill-detections/${uploadSessionId}`
        );
      } catch (err) {
        // console.error("Failed to backfill detection results", err);
      }
      // Fetch once, then poll for new images
      const initialCount = await fetchSessionMetadata(uploadSessionId);
      pollForImages(uploadSessionId, initialCount || 0);
    }
  };

  const handleMarkPoor = (imageId: string) => {
    setMarkedPoorImages((prev) => [...prev, imageId]);
  };

  const currentImageData = getCurrentImageData();

  // If no images uploaded, show empty state
  if (!apiResponse || totalImages === 0) {
    return <EmptyState onImageUpload={handleImageUpload} />;
  }

  // Main dashboard with images
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <Navbar />

      <div className="relative z-10 p-6">
        <DashboardHeader onImageUpload={handleImageUpload} />

        {isPolling && (
          <div className="text-center py-4 text-blue-600 font-semibold animate-pulse">
            Processing images... Please wait.
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Section - Image Display */}
          <div className="lg:col-span-3">
            <ImageViewer
              currentImage={currentImage}
              totalImages={totalImages}
              currentImageData={currentImageData}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </div>

          {/* Right Section - Results */}
          <ResultsSidebar
            currentImageData={currentImageData}
            markedPoorImages={markedPoorImages}
            onMarkPoor={handleMarkPoor}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
