import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  characterName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationDialog({
  open,
  characterName,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title="Delete character"
      description="This action cannot be undone."
      size="sm"
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">
        Are you sure you want to delete{' '}
        <strong className="font-semibold text-ink">{characterName || 'this character'}</strong>?
      </p>
    </Dialog>
  );
}
