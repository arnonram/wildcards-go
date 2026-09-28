import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';

export interface AddNewButtonProps {
  buttonText: string;
  onClick: () => void;
}

export default function AddNewButton(props: AddNewButtonProps) {
  return (
    <Button startIcon={<AddIcon />} variant="contained" color="primary" onClick={props.onClick}>
      {props.buttonText}
    </Button>
  );
}
