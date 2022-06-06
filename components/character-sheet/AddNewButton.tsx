import { Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export interface AddNewButtonProps {
  buttonText: string;
  onClick: any;
}

export default function AddNewButton(props: AddNewButtonProps) {
  return (
    <Button
      startIcon={<AddIcon />}
      variant="contained"
      color="primary"
      onClick={props.onClick}
    >
      {props.buttonText}
    </Button>
  );
}
