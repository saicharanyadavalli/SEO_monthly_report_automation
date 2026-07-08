"use server";

import { revalidatePath } from "next/cache";
import { 
  getAllClients, 
  getClient, 
  saveClient, 
  updateClient, 
  deleteClient,
  ClientConfig
} from "@/lib/config/clientRepository";

export async function fetchClients() {
  return getAllClients();
}

export async function createClientAction(data: ClientConfig) {
  try {
    const exists = await getClient(data.key);
    if (exists) {
      return { error: `Client with key '${data.key}' already exists.` };
    }
    await saveClient(data);
    revalidatePath("/clients");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create client" };
  }
}

export async function updateClientAction(key: string, data: Partial<ClientConfig>) {
  try {
    await updateClient(key, data);
    revalidatePath("/clients");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update client" };
  }
}

export async function deleteClientAction(key: string) {
  try {
    await deleteClient(key);
    revalidatePath("/clients");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete client" };
  }
}
