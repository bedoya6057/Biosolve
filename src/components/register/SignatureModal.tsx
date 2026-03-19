import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Eraser, Save } from "lucide-react";

export interface DeliveryPersonData {
  fullName: string;
  position: string;
  dni: string;
  signature: string;
}

interface SignatureModalProps {
  onConfirm: (data: DeliveryPersonData) => void;
  onCancel: () => void;
}

export function SignatureModal({ onConfirm, onCancel }: SignatureModalProps) {
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [dni, setDni] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!fullName.trim() || !position.trim() || !dni.trim() || !hasSignature) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL("image/png");
    onConfirm({
      fullName: fullName.trim(),
      position: position.trim(),
      dni: dni.trim(),
      signature: signatureData,
    });
  };

  const isValid = fullName.trim() && position.trim() && dni.trim() && hasSignature;

  return (
    <div className="fixed inset-0 z-[1000] bg-background animate-fade-in flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h2 className="text-lg font-display font-bold">Firma de Entrega</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete los datos de la persona que entrega el vehículo
        </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre y Apellido *</Label>
              <Input
                id="fullName"
                placeholder="Ingrese nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Cargo *</Label>
              <Input
                id="position"
                placeholder="Ej: Conductor, Supervisor"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                placeholder="Número de documento"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="h-12"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Firma *</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                  className="text-muted-foreground"
                >
                  <Eraser className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Firme con el dedo o mouse en el recuadro
              </p>
            </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card">
        <Button
          onClick={handleConfirm}
          className="w-full h-12 font-semibold"
          disabled={!isValid}
        >
          <Save className="w-5 h-5 mr-2" />
          Guardar Vehículo
        </Button>
      </div>
    </div>
  );
}