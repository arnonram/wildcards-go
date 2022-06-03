import { WildCardCharacter } from "../dtos/WildCardCharacter.dto";

export async function updateCharacter(wildCardData: WildCardCharacter) {
  const response = await fetch(
    `http://localhost:3000/api/character/${wildCardData._id?.toString()}`,
    {
      method: "PUT",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify(wildCardData),
    }
  );
}
