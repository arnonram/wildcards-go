import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

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
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Character</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete <strong>{characterName || 'this character'}</strong>? This
          action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="primary">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
