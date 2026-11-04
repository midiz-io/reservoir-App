import { useRef, useState, useCallback, useEffect } from 'react';
import { RefreshCcw, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, previewUrl: string) => void;
}

export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  }, [facingMode]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const previewUrl = URL.createObjectURL(blob);
            onCapture(blob, previewUrl);
            onClose();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-none sm:rounded-3xl h-[80vh] sm:h-[600px] flex flex-col">
        <div className="relative flex-1 w-full bg-black flex flex-col">
          <div className="absolute top-4 right-4 z-10 flex gap-4">
            <Button variant="secondary" size="icon" className="rounded-full bg-white/20 hover:bg-white/40 text-white border-none" onClick={toggleCamera}>
              <RefreshCcw className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full bg-white/20 hover:bg-white/40 text-white border-none" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
            <button
              onClick={capture}
              className="h-16 w-16 rounded-full border-4 border-white bg-white/30 hover:bg-white/50 transition-all flex items-center justify-center backdrop-blur-sm"
            >
              <div className="h-12 w-12 rounded-full bg-white" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
