import { WildCardCharacter } from "../dtos/WildCardCharacter.dto";
import { updateCharacter } from "./api-actions";

export async function saveUpdate(event: any, data: WildCardCharacter) {
  event.preventDefault();
  console.log(data);
  const response = await updateCharacter(data);
}
