import { Waves, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageUploadDialog from "./imageUploadDialog";
import { useUploadStore } from "@/store/upload";
// import Papa from "papaparse";

const API_URL = import.meta.env.VITE_API_URL;

interface DashboardHeaderProps {
  onImageUpload: (response: unknown) => void;
}

const DashboardHeader = ({ onImageUpload }: DashboardHeaderProps) => {
  const sessionId = useUploadStore((state) => state.sessionId);

  const handleExportCSV = async () => {
    // if (!sessionId) {
    //   alert("No sessionId found.");
    //   return;
    // }
    // try {
    //   const res = await fetch(`${API_URL}/session-status/${sessionId}`);
    //   const data = await res.json();
    //   if (!data.success) throw new Error("Failed to fetch session metadata");
    //   // Assume data.files is an array of objects to export
    //   const csv = Papa.unparse(data.files || []);
    //   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    //   const url = URL.createObjectURL(blob);
    //   const link = document.createElement("a");
    //   link.href = url;
    //   link.setAttribute("download", `session_${sessionId}_metadata.csv`);
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);
    //   URL.revokeObjectURL(url);
    // } catch (err) {
    //   alert("Error exporting CSV: " + err);
    // }
    if (!sessionId) {
      alert("No sessionId found.");
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/export-session-csv/${sessionId}`
      );
      if (!response.ok) throw new Error("Failed to export CSV");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `session_${sessionId}_metadata.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error exporting CSV: " + err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 w-full gap-4 md:gap-0">
      <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
        <div className="relative">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg">
            <img
              src="/dugong.png"
              alt="Dugong"
              className="w-8 h-8 object-contain drop-shadow-lg "
            />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <Waves className="w-2 h-2 text-blue-600" />
          </div>
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-black">
            Dashboard
          </h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
        <ImageUploadDialog onImageUploaded={onImageUpload}>
          <Button className="w-full md:w-auto gap-2 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-black hover:bg-white/30 hover:border-white/50 transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload More
          </Button>
        </ImageUploadDialog>

        <Button
          className="w-full md:w-auto gap-2 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-black hover:bg-white/30 hover:border-white/50 transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer"
          onClick={handleExportCSV}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
