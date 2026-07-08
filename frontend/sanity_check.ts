import { getAllClients, getClient, saveClient, updateClient, deleteClient } from './lib/config/clientRepository.js';
import { SLIDE_CATALOG } from './lib/catalog/slides.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Running Sanity Checks ---');

  // Test 1: Slide Catalog
  console.log(`\n1. Slides Loaded: ${SLIDE_CATALOG.length}`);
  console.log(`First slide: ${SLIDE_CATALOG[0].name} (Requires AI: ${SLIDE_CATALOG[0].requiresAI})`);

  // Test 2: Client Repository
  console.log('\n2. Testing Client Repository');
  
  const clients = await getAllClients();
  console.log(`Loaded ${clients.length} clients from config.`);
  
  if (clients.length > 0) {
    const firstClient = clients[0];
    console.log(`First client: ${firstClient.name} (${firstClient.key})`);
    
    // Read
    const readBack = await getClient(firstClient.key);
    console.log(`Read back client match: ${readBack?.name === firstClient.name ? 'SUCCESS' : 'FAILED'}`);
    
    // Update & Save (We will create a dummy client to avoid mutating real data)
    const dummyKey = 'test_dummy_client_123';
    const dummyClient = {
      key: dummyKey,
      name: 'Test Dummy',
      gsc_url: 'https://dummy.com',
      ga4_property_id: '123456',
      brand_terms: ['dummy'],
      header_color: '#000000',
      accent_color: '#ffffff'
    };
    
    console.log('Creating dummy client...');
    await saveClient(dummyClient);
    const created = await getClient(dummyKey);
    console.log(`Dummy created: ${created ? 'SUCCESS' : 'FAILED'}`);
    
    console.log('Updating dummy client...');
    await updateClient(dummyKey, { name: 'Updated Dummy' });
    const updated = await getClient(dummyKey);
    console.log(`Dummy updated name: ${updated?.name} (Expected: Updated Dummy)`);
    
    console.log('Deleting dummy client...');
    await deleteClient(dummyKey);
    const deleted = await getClient(dummyKey);
    console.log(`Dummy deleted: ${deleted === null ? 'SUCCESS' : 'FAILED'}`);
  }
}

// Ensure Node handles TypeScript (using ts-node or similar)
// For simplicity, we just execute this directly if compiled, or via tsx/ts-node.
runTests();
