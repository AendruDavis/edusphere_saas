import React from "react";
import { ResponsiveDialog } from "./ResponsiveDialog";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <ResponsiveDialog
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      maxWidth="max-w-md"
      footer={(
        <>
          <button type="button" className="app-button-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="app-button-primary" onClick={onConfirm}>{confirmLabel}</button>
        </>
      )}
    >
      <div className="sr-only" aria-hidden="true">Confirm this action or cancel to return.</div>
    </ResponsiveDialog>
  );
}
