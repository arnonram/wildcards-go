import {
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Power } from "../../dtos/Power.dto";
import { Weapon } from "../../dtos/Weapon.dto";

export interface TableProps {
  tableName: string;
  data: Weapon[] | Power[];
}

export default function Table(props: TableProps) {
  return (
    <TableContainer id={`wildcard-table-${props.tableName}`}>
      <TableHead>
        <TableRow key={props.tableName}>
          {Object.keys(props.data[0]).map((x) => (
            <TableCell
              sx={{
                fontWeight: "bold",
                fontSize: "medium",
                textTransform: "uppercase",
              }}
            >
              {x}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {props.data.map((item) => (
          <TableRow key={`wildcard-${props.tableName}-${item.name}`}>
            {Object.values(item).map((x) => (
              <TableCell>{x ?? ""}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}
