import { useEffect } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BottomSheet = ({ open, onClose, children }: BottomSheetProps) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-foreground/40 fade-in-overlay" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-card rounded-t-3xl px-6 pb-8 pt-3 slide-up">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-muted-foreground/30" />
        {children}
      </div>
    </div>
  );
};

export default BottomSheet;
