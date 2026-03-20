import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check } from "lucide-react";

interface PhotoCaptureProps {
  photos: string[];
  maxPhotos: number;
  onPhotosChange: (photos: string[]) => void;
}

const MAX_IMAGE_WIDTH = 1280;
const JPEG_QUALITY = 0.72;

function scaleToFit(width: number, height: number, maxWidth: number) {
  if (width <= maxWidth) return { width, height };
  const ratio = maxWidth / width;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

async function compressImageFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = scaleToFit(img.width, img.height, MAX_IMAGE_WIDTH);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

export function PhotoCapture({ photos, maxPhotos, onPhotosChange }: PhotoCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setShowCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback to file input
      handleFileInput();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      stopCamera();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      setIsProcessing(true);

      const target = scaleToFit(video.videoWidth || 1280, video.videoHeight || 720, MAX_IMAGE_WIDTH);
      canvas.width = target.width;
      canvas.height = target.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      ctx.drawImage(video, 0, 0, target.width, target.height);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

      // Avoid growing memory without bounds
      if (photos.length < maxPhotos) {
        onPhotosChange([...photos, dataUrl]);
      }
    } catch (e) {
      console.error('Error capturing photo:', e);
    } finally {
      setIsProcessing(false);
      stopCamera();
    }
  };

  const handleFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsProcessing(true);
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const compressed = await compressImageFromDataUrl(dataUrl);
        if (photos.length < maxPhotos) {
          onPhotosChange([...photos, compressed]);
        }
      } catch (error) {
        console.error('Error processing file photo:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    input.click();
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  if (showCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-foreground flex flex-col">
        <video ref={videoRef} autoPlay playsInline className="flex-1 object-contain bg-black" />
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-6 bg-gradient-to-t from-foreground/80 to-transparent">
          <Button
            variant="outline"
            size="icon"
            onClick={stopCamera}
            disabled={isProcessing}
            className="w-14 h-14 rounded-full bg-background/20 border-background/40 text-background"
          >
            <X className="w-6 h-6" />
          </Button>

          <Button
            onClick={capturePhoto}
            disabled={isProcessing}
            className="w-20 h-20 rounded-full bg-background shadow-lg"
          >
            <Camera className="w-8 h-8 text-foreground" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            disabled={isProcessing}
            onClick={() => {
              stopCamera();
              startCamera();
            }}
            className="w-14 h-14 rounded-full bg-background/20 border-background/40 text-background"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Fotos del vehículo ({photos.length}/{maxPhotos})
        </p>
        {photos.length < maxPhotos && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startCamera}
          >
            <Camera className="w-4 h-4 mr-2" />
            Tomar foto
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={photo}
              alt={`Foto ${index + 1}`}
              loading="lazy"
              className="w-full h-full object-contain bg-black"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-foreground/70 text-background text-xs">
              Foto {index + 1}
            </div>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={handleFileInput}
            className="aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <Camera className="w-8 h-8" />
            <span className="text-xs">Agregar foto</span>
          </button>
        )}
      </div>

      {photos.length >= maxPhotos && (
        <div className="flex items-center gap-2 text-sm text-success">
          <Check className="w-4 h-4" />
          <span>Todas las fotos capturadas</span>
        </div>
      )}
    </div>
  );
}
