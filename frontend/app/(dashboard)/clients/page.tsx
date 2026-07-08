import { fetchClients } from "./actions";
import { ClientList } from "@/components/shared/ClientList";
import { Users } from "lucide-react";

export default async function ManageClientsPage() {
  const clients = await fetchClients();

  return (
    <div className="flex flex-col space-y-6 max-w-6xl mx-auto py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Manage Clients
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure data sources, branding, and properties for your clients.
          </p>
        </div>
      </div>
      
      <ClientList initialClients={clients} />
    </div>
  );
}
