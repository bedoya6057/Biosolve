import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Download, Image, Loader2 } from "lucide-react";
import { Vehicle, Project } from "@/types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import type { VehiculoEntregadoDB } from "@/hooks/useProjectsDB";

interface VehicleDetailModalProps {
  vehicle: Vehicle;
  project?: Project | null;
  progress: number;
  viewMode: 'ficha' | 'fotos' | 'ficha-entrega' | 'fotos-entrega';
  deliveryData?: VehiculoEntregadoDB | null;
  onClose: () => void;
}

// Helper function to format date from YYYY-MM-DD to DD/MM/YYYY
const formatDateDDMMYYYY = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export function VehicleDetailModal({ vehicle, project, progress, viewMode, deliveryData, onClose }: VehicleDetailModalProps) {
  const fichaRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    if (!fichaRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(fichaRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      const docType = viewMode === 'ficha-entrega' ? 'Entrega' : 'Recepcion';
      pdf.save(`Ficha_${docType}_${vehicle.vin}_${vehicle.plate || 'sin-placa'}.pdf`);
      
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const groupedCheckItems = vehicle.checkItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof vehicle.checkItems>);

  // Parse delivery check items if available
  const deliveryCheckItems = deliveryData?.check_items as { category: string; item: string; hasIt: boolean | null; observation: string }[] | undefined;
  const groupedDeliveryCheckItems = deliveryCheckItems?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof deliveryCheckItems>) || {};

  const deliveryPhotos = deliveryData 
    ? [deliveryData.foto_1, deliveryData.foto_2, deliveryData.foto_3, deliveryData.foto_4].filter(Boolean) as string[] 
    : [];

  const getTitle = () => {
    switch (viewMode) {
      case 'ficha':
        return 'Ficha de Recepción';
      case 'fotos':
        return 'Fotos de Recepción';
      case 'ficha-entrega':
        return 'Ficha de Entrega';
      case 'fotos-entrega':
        return 'Fotos de Entrega';
      default:
        return 'Detalle';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-display font-bold">
              {getTitle()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {vehicle.plate || 'Sin placa'} - {vehicle.vin}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(viewMode === 'ficha' || viewMode === 'ficha-entrega') && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownloadPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Ficha de Recepción */}
            {viewMode === 'ficha' && (
              <div ref={fichaRef} className="bg-white text-black p-6 space-y-6">
                {/* Header with Logo */}
                <div className="flex items-center justify-between border-b-2 border-[#E88B2D] pb-4">
                  <img 
                    src="/logo-biosolve.png" 
                    alt="Biosolve" 
                    className="h-12 object-contain"
                  />
                  <div className="text-right">
                    <h1 className="text-xl font-bold text-[#3A3A3A]">FICHA DE RECEPCIÓN</h1>
                    <p className="text-sm text-gray-600">Fecha: {formatDateDDMMYYYY(vehicle.deliveryDate)} - {vehicle.deliveryTime}</p>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">VIN</p>
                    <p className="font-semibold">{vehicle.vin}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Placa</p>
                    <p className="font-semibold">{vehicle.plate || 'Sin placa'}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Modelo</p>
                    <p className="font-semibold">{vehicle.model || 'N/A'}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Color</p>
                    <p className="font-semibold">{vehicle.color || 'N/A'}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Kilometraje de Entrada</p>
                    <p className="font-semibold">{vehicle.kmEntry || 'N/A'} km</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Cochera</p>
                    <p className="font-semibold">{vehicle.cochera || 'N/A'}</p>
                  </div>
                </div>

                {/* Observations */}
                {vehicle.observations && (
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Observaciones Generales</p>
                    <p className="font-semibold">{vehicle.observations}</p>
                  </div>
                )}

                {/* Check Items */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#3A3A3A] border-b border-[#E88B2D] pb-1">
                    Checklist de Ingreso
                  </h3>
                  {Object.entries(groupedCheckItems).map(([category, items]) => (
                    <div key={category} className="space-y-1">
                      <h4 className="text-xs font-semibold text-[#E88B2D] uppercase">{category}</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {items.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded text-xs"
                          >
                            <span>{item.item}</span>
                            <span className={`font-semibold ${
                              item.hasIt === true ? 'text-green-600' : 
                              item.hasIt === false ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {item.hasIt === true ? 'SÍ' : item.hasIt === false ? 'NO' : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Person Signature Section */}
                {(vehicle.deliveryPersonName || vehicle.deliveryPersonPosition || vehicle.deliverySignature) && (
                  <div className="space-y-3 pt-4 border-t-2 border-[#E88B2D]">
                    <h3 className="font-bold text-[#3A3A3A]">Datos de Quien Entrega</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="border border-gray-200 p-3 rounded">
                        <p className="text-gray-500 text-xs">Nombre</p>
                        <p className="font-semibold">{vehicle.deliveryPersonName || 'N/A'}</p>
                      </div>
                      <div className="border border-gray-200 p-3 rounded">
                        <p className="text-gray-500 text-xs">Cargo</p>
                        <p className="font-semibold">{vehicle.deliveryPersonPosition || 'N/A'}</p>
                      </div>
                    </div>
                    {vehicle.deliverySignature && (
                      <div className="border border-gray-200 p-3 rounded">
                        <p className="text-gray-500 text-xs mb-2">Firma</p>
                        <img 
                          src={vehicle.deliverySignature} 
                          alt="Firma de entrega" 
                          className="h-20 object-contain mx-auto"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="text-center pt-4 border-t border-gray-200 text-xs text-gray-400">
                  <p>Documento generado por Sistema Biosolve</p>
                </div>
              </div>
            )}

            {/* Ficha de Entrega */}
            {viewMode === 'ficha-entrega' && deliveryData && (
              <div ref={fichaRef} className="bg-white text-black p-6 space-y-6">
                {/* Header with Logo */}
                <div className="flex items-center justify-between border-b-2 border-[#E88B2D] pb-4">
                  <img 
                    src="/logo-biosolve.png" 
                    alt="Biosolve" 
                    className="h-12 object-contain"
                  />
                  <div className="text-right">
                    <h1 className="text-xl font-bold text-[#3A3A3A]">FICHA DE ENTREGA</h1>
                    <p className="text-sm text-gray-600">Fecha: {formatDateDDMMYYYY(deliveryData.delivery_date)} - {deliveryData.delivery_time}</p>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">VIN</p>
                    <p className="font-semibold">{vehicle.vin}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Placa</p>
                    <p className="font-semibold">{vehicle.plate || 'Sin placa'}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Modelo</p>
                    <p className="font-semibold">{vehicle.model || 'N/A'}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Color</p>
                    <p className="font-semibold">{vehicle.color || 'N/A'}</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Km Entrada</p>
                    <p className="font-semibold">{vehicle.kmEntry || 'N/A'} km</p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Km Salida</p>
                    <p className="font-semibold">{deliveryData.km_exit || 'N/A'} km</p>
                  </div>
                </div>

                {/* Delivery Check Items */}
                {deliveryCheckItems && deliveryCheckItems.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-[#3A3A3A] border-b border-[#E88B2D] pb-1">
                      Checklist de Salida
                    </h3>
                    {Object.entries(groupedDeliveryCheckItems).map(([category, items]) => (
                      <div key={category} className="space-y-1">
                        <h4 className="text-xs font-semibold text-[#E88B2D] uppercase">{category}</h4>
                        <div className="grid grid-cols-2 gap-1">
                          {items?.map((item, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded text-xs"
                            >
                              <span>{item.item}</span>
                              <span className={`font-semibold ${
                                item.hasIt === true ? 'text-green-600' : 
                                item.hasIt === false ? 'text-red-600' : 'text-gray-400'
                              }`}>
                                {item.hasIt === true ? 'SÍ' : item.hasIt === false ? 'NO' : 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {deliveryData.notes && (
                  <div className="border border-gray-200 p-3 rounded">
                    <p className="text-gray-500 text-xs">Observaciones</p>
                    <p className="font-semibold">{deliveryData.notes}</p>
                  </div>
                )}

                {/* Receiver Signature Section */}
                <div className="space-y-3 pt-4 border-t-2 border-[#E88B2D]">
                  <h3 className="font-bold text-[#3A3A3A]">Datos de Quien Recibe</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="border border-gray-200 p-3 rounded">
                      <p className="text-gray-500 text-xs">Nombre</p>
                      <p className="font-semibold">{deliveryData.receiver_name}</p>
                    </div>
                    <div className="border border-gray-200 p-3 rounded">
                      <p className="text-gray-500 text-xs">Cargo</p>
                      <p className="font-semibold">{deliveryData.receiver_position}</p>
                    </div>
                  </div>
                  {deliveryData.receiver_signature && (
                    <div className="border border-gray-200 p-3 rounded">
                      <p className="text-gray-500 text-xs mb-2">Firma</p>
                      <img 
                        src={deliveryData.receiver_signature} 
                        alt="Firma de receptor" 
                        className="h-20 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="text-center pt-4 border-t border-gray-200 text-xs text-gray-400">
                  <p>Documento generado por Sistema Biosolve</p>
                </div>
              </div>
            )}

            {/* Fotos de Recepción */}
            {viewMode === 'fotos' && (
              <>
                {vehicle.photos.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Fotos de Recepción ({vehicle.photos.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {vehicle.photos.map((photo, idx) => (
                        <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={photo} 
                            alt={`Foto ${idx + 1}`} 
                            className="w-full h-full object-contain bg-black"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay fotos de recepción</p>
                  </div>
                )}
              </>
            )}

            {/* Fotos de Entrega */}
            {viewMode === 'fotos-entrega' && (
              <>
                {deliveryData && deliveryPhotos.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Fotos de Entrega ({deliveryPhotos.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {deliveryPhotos.map((photo, idx) => (
                        <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={photo} 
                            alt={`Foto ${idx + 1}`} 
                            className="w-full h-full object-contain bg-black"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay fotos de entrega</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
