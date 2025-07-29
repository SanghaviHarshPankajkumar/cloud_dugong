import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ImageViewerProps {
  currentImage: number;
  totalImages: number;
  currentImageData: {
    imageUrl?: string;
  } | null;
  onPrevious: () => void;
  onNext: () => void;
}

const ImageViewer = ({
  currentImage,
  totalImages,
  currentImageData,
  onPrevious,
  onNext,
}: ImageViewerProps) => {
  return (
    <Card className="border-0 shadow-2xl backdrop-blur-md bg-gradient-to-br from-blue-400 via-teal-500 to-blue-600">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-white hover:bg-white/20 hover:text-white transition-all duration-200"
            disabled={currentImage === 1}
            onClick={onPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-medium">
              Image {currentImage} of {totalImages}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-white hover:bg-white/20 hover:text-white transition-all duration-200"
            disabled={currentImage === totalImages}
            onClick={onNext}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative overflow-hidden rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm inline-block shadow-lg">
          {currentImageData && (
            <img
              src={
                currentImageData?.imageUrl
                  ? `${currentImageData.imageUrl}`
                  : ""
              }
              alt="Dugong monitoring capture"
              className="w-auto h-auto max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageViewer;
