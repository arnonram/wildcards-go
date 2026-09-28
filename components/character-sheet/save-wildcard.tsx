import SaveIcon from '@mui/icons-material/Save';
import { Button } from '@mui/material';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { saveUpdate } from '../../helpers/save-action';

export interface SaveButtonProps {
  buttonText: string;
}

export default function SaveButton(props: SaveButtonProps) {
  const { wildcardData } = useWildcard();

  return (
    <Button
      startIcon={<SaveIcon />}
      variant="contained"
      color="secondary"
      type="submit"
      onClick={(e) => saveUpdate(e, wildcardData)}
    >
      {props.buttonText}
    </Button>
  );
}
