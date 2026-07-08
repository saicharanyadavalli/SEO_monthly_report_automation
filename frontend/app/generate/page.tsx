import { fetchClients } from "@/app/(dashboard)/clients/actions";
import { GenerateWizard } from "./GenerateWizard";

export default async function GeneratePage() {
  const clients = await fetchClients();
  
  return (
    <GenerateWizard clients={clients} />
  );
}
