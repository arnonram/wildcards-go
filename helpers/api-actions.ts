import { WildCardCharacter } from "../dtos/WildCardCharacter.dto";

export async function updateCharacter(wildCardData: WildCardCharacter) {
  console.log(wildCardData._id?.toString());
  const response = await fetch(
    `http://localhost:3000/api/character/${wildCardData._id?.toString()}`,
    {
      method: "PUT",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify(wildCardData),
    }
  );
}

export async function createNewCharacter() {
  const response = await fetch(`http://localhost:3000/api/character`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(new WildCardCharacter()),
  });
  return response.json();
}
