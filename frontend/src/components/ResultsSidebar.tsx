/* eslint-disable @typescript-eslint/no-unused-vars */
import { Info, ThumbsDown, Shell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUploadStore } from "@/store/upload";


const FloatingBubble = ({ size = "small", delay = 0 }) => (
  <div
    className={`absolute rounded-full bg-gradient-to-t from-cyan-200/20 to-blue-200/40 animate-pulse ${size === "small" ? "w-3 h-3" : size === "medium" ? "w-5 h-5" : "w-7 h-7"
      }`}
    style={{
      animationDelay: `${delay}s`,
      animationDuration: `${3 + Math.random() * 2}s`
    }}
  />
);
interface ImageData {
  imageId: string;
  imageUrl: string;
  dugongCount: number;
  calfCount: number;
  imageClass?: string;
  createdAt?: string;
}

interface ResultsSidebarProps {
  currentImageData: ImageData;
  markedPoorImages: string[];
  onMarkPoor: (imageId: string) => void;
}
const extractFormattedDate = (imageName: string) => {
  // Regular expression to match the pattern after first underscore with 8 digits (assumed to be YYYYMMDD)
  const match = imageName.match(/_(\d{8})/);

  if (!match || match.length < 2) return "not found";

  const rawDate = match[1];
  const year = rawDate.substring(0, 4);
  const month = rawDate.substring(4, 6);
  const day = rawDate.substring(6, 8);

  // Basic date validation (not checking leap years, etc., but enough to catch typos)
  const dateObject = new Date(`${year}-${month}-${day}`);
  if (
    dateObject.getFullYear().toString() !== year ||
    (dateObject.getMonth() + 1).toString().padStart(2, "0") !== month ||
    dateObject.getDate().toString().padStart(2, "0") !== day
  ) {
    return "not found";
  }

  return `${day}/${month}/${year}`;
};
const ResultsSidebar = ({
  currentImageData,
  markedPoorImages,
  onMarkPoor,
}: ResultsSidebarProps) => {
  const sessionId = useUploadStore((state) => state.sessionId);
  const isMarkedPoor =
    currentImageData && markedPoorImages.includes(currentImageData.imageId);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleMarkPoor = async () => {
    if (!currentImageData || !sessionId) {
      return;
    }

    if (
      window.confirm("Are you sure? You cannot change your decision later.")
    ) {
      const targetClass = currentImageData?.imageClass;
      const imageName = currentImageData.imageUrl.split("/").pop();

      try {
        const response = await fetch(`${API_URL}/move-to-false-positive/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            imageName,
            targetClass,
          }),
        });

        if (response.ok) {
          onMarkPoor(currentImageData.imageId);
        }
      } catch (error) {
        // console.error("Error:", error);
      }
    }
  };
  return (
    <div className="w-full min-h-screen  p-3 relative overflow-hidden">
      {/* Floating Bubbles */}
      <div className="fixed inset-0 pointer-events-none">
        <FloatingBubble size="small" delay={0} />
        <FloatingBubble size="medium" delay={1} />
        <FloatingBubble size="large" delay={2} />
      </div>

      {/* Coral Pattern Background */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-10 left-10 w-20 h-20 bg-orange-400 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-10 w-32 h-32 bg-pink-400 rounded-full blur-xl"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-purple-400 rounded-full blur-xl"></div>
      </div>

      <div className="w-full flex flex-col gap-3 relative z-10">
        {/* Detection Results */}
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-teal-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500"></div>
          <CardHeader className="bg-gradient-to-r from-teal-50/80 to-cyan-50/80 relative py-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-teal-800">
              <div className="p-1.5 bg-teal-100 rounded-full shadow-md">
                <Shell className="w-4 h-4 text-teal-600" />
              </div>
              Detection Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-3 px-4">
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200/50 hover:border-teal-300 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Dugong Count
              </span>
              <Badge className="text-sm bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-none shadow-md hover:shadow-lg transition-shadow">
                {currentImageData?.dugongCount || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200/50 hover:border-teal-300 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Mother Calf Count
              </span>
              <Badge className="text-sm bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-none shadow-md hover:shadow-lg transition-shadow">
                {currentImageData?.calfCount || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200/50 hover:border-teal-300 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Total Count
              </span>
              <Badge className="text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-none shadow-md hover:shadow-lg transition-shadow">
                {2 * currentImageData?.calfCount + currentImageData?.dugongCount || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200/50 hover:border-teal-300 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Behaviour
              </span>
              <Badge className="text-sm bg-gradient-to-r from-orange-400 to-pink-400 text-white border-none shadow-md hover:shadow-lg transition-shadow">
                {currentImageData?.imageClass || "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Meta Data */}
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-teal-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-teal-400 to-cyan-500"></div>
          <CardHeader className="bg-gradient-to-r from-blue-50/80 to-teal-50/80 relative py-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-blue-800">
              <div className="p-1.5 bg-blue-100 rounded-full shadow-md">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              Meta Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-3 px-4">
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200/50 hover:border-blue-300 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Captured Date
              </span>
              <Badge className="text-sm bg-gradient-to-r from-blue-500 to-teal-500 text-white border-none shadow-md hover:shadow-lg transition-shadow">
                {extractFormattedDate(
                  currentImageData?.imageUrl.split("/").pop() || ""
                )}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200/50 hover:border-blue-300 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Processed Date
              </span>
              <Badge className="text-sm bg-gradient-to-r from-blue-500 to-teal-500 text-white border-none shadow-md hover:shadow-lg transition-shadow">
                {currentImageData?.createdAt
                  ? new Date(currentImageData.createdAt).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200/50 hover:border-blue-300 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Image Name
              </span>
              <Badge
                className="max-w-[120px] text-xs bg-gradient-to-r from-slate-500 to-teal-600 text-white border-none shadow-md hover:shadow-lg transition-shadow truncate"
                title={
                  currentImageData?.imageUrl
                    ? currentImageData.imageUrl.split("/").pop()
                    : "image.jpg"
                }
              >
                {currentImageData?.imageUrl
                  ? currentImageData.imageUrl.split("/").pop()
                  : "image.jpg"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quality Assessment */}
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-teal-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-orange-400 to-pink-400"></div>
          <CardHeader className="bg-gradient-to-r from-red-50/80 to-orange-50/80 relative py-2">
            <CardTitle className="text-lg font-semibold text-red-800">
              Quality Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <Button
              className={`w-full gap-2 transition-all duration-500 min-h-[36px] text-sm ${isMarkedPoor
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-500 hover:to-red-600"
                : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400"
                } border-none shadow-lg text-white hover:shadow-xl`}
              onClick={handleMarkPoor}
              disabled={isMarkedPoor}
            >
              <ThumbsDown className="w-4 h-4 flex-shrink-0" />
              <span className="text-center">
                {isMarkedPoor ? "Marked as Poor Quality" : "Mark as Poor Quality"}
              </span>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ResultsSidebar;