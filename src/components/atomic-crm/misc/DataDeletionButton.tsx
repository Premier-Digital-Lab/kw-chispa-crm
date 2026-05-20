import { useState } from "react";
import { useTranslate } from "ra-core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DataDeletionButtonProps {
  firstName: string;
  lastName: string;
  email: string;
  id: string | number;
}

export const DataDeletionButton = ({
  firstName,
  lastName,
  email,
  id,
}: DataDeletionButtonProps) => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/.netlify/functions/send-deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, id: String(id) }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setStatus("idle"), 300);
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
      >
        {translate("crm.dataDeletion.buttonLabel")}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              {translate("crm.dataDeletion.dialogTitle")}
            </DialogTitle>
          </DialogHeader>

          {status === "success" ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              {translate("crm.dataDeletion.successMessage")}
            </p>
          ) : status === "error" ? (
            <p className="text-sm text-destructive">
              {translate("crm.dataDeletion.errorMessage")}
            </p>
          ) : (
            <DialogDescription>
              {translate("crm.dataDeletion.dialogMessage")}
            </DialogDescription>
          )}

          <DialogFooter>
            {status === "success" ? (
              <Button type="button" variant="outline" onClick={handleClose}>
                {translate("crm.dataDeletion.dialogCancel")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={status === "loading"}
                >
                  {translate("crm.dataDeletion.dialogCancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={status === "loading"}
                >
                  {status === "loading"
                    ? "…"
                    : translate("crm.dataDeletion.dialogConfirm")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
