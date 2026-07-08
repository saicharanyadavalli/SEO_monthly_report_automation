import fs from 'fs/promises';
import path from 'path';

export interface ClientConfig {
  key: string;
  name: string;
  gsc_url: string; // GSC property URL (e.g., sc-domain:example.com)
  url_speedvital?: string; // Optional: URL for PageSpeed Insights (if different from GSC)
  ga4_property_id: string;
  brand_terms: string[];
  header_color: string; // primary_color
  accent_color: string; // secondary_color
}

// Path to the backend company_config.json
const CONFIG_PATH = process.env.COMPANY_CONFIG_PATH || path.join(process.cwd(), '..', 'backend', 'company_config.json');

export async function getAllClients(): Promise<ClientConfig[]> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const json = JSON.parse(data);
    const companies = json.companies || {};

    return Object.entries(companies).map(([key, config]: [string, any]) => ({
      key,
      name: config.name || key,
      gsc_url: config.gsc_url || '',
      url_speedvital: config.url_speedvital || '',
      ga4_property_id: config.ga4_property_id || '',
      brand_terms: config.brand_terms || [],
      header_color: config.header_color || '#1e3a8a',
      accent_color: config.accent_color || '#3b82f6',
    }));
  } catch (error) {
    console.error('Failed to read clients config:', error);
    return [];
  }
}

export async function getClient(key: string): Promise<ClientConfig | null> {
  const clients = await getAllClients();
  return clients.find(c => c.key === key) || null;
}

export async function saveClient(client: ClientConfig): Promise<boolean> {
  try {
    let json: any = { companies: {} };
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf-8');
      json = JSON.parse(data);
    } catch (e) {
      // File doesn't exist or is invalid, start fresh
    }

    if (!json.companies) json.companies = {};

    // Omit the 'key' property when saving to match Python schema
    const { key, ...clientData } = client;
    json.companies[key] = clientData;

    await fs.writeFile(CONFIG_PATH, JSON.stringify(json, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save client:', error);
    return false;
  }
}

export async function updateClient(key: string, updates: Partial<ClientConfig>): Promise<boolean> {
  const client = await getClient(key);
  if (!client) return false;

  const updatedClient = { ...client, ...updates, key };
  return saveClient(updatedClient);
}

export async function deleteClient(key: string): Promise<boolean> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const json = JSON.parse(data);

    if (json.companies && json.companies[key]) {
      delete json.companies[key];
      await fs.writeFile(CONFIG_PATH, JSON.stringify(json, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete client:', error);
    return false;
  }
}
