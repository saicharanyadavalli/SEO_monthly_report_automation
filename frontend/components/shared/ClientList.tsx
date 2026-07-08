"use client";

import { useState, useMemo } from "react";
import { ClientConfig } from "@/lib/config/clientRepository";
import { 
  createClientAction, 
  updateClientAction, 
  deleteClientAction 
} from "@/app/(dashboard)/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Plus, Edit, Trash2, Globe, Tag } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

export function ClientList({ initialClients }: { initialClients: ClientConfig[] }) {
  const [clients, setClients] = useState<ClientConfig[]>(initialClients);
  const [search, setSearch] = useState("");
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientConfig | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientConfig | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ClientConfig>>({});
  const [brandTermsInput, setBrandTermsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.key.toLowerCase().includes(search.toLowerCase()) ||
      c.gsc_url.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  const openAddForm = () => {
    setEditingClient(null);
    setFormData({
      key: "",
      name: "",
      gsc_url: "",
      url_speedvital: "",
      ga4_property_id: "",
      brand_terms: [],
      header_color: "#1e3a8a",
      accent_color: "#3b82f6"
    });
    setBrandTermsInput("");
    setLogoFile(null);
    setIsFormOpen(true);
  };

  const openEditForm = (client: ClientConfig) => {
    setEditingClient(client);
    setFormData(client);
    setBrandTermsInput(client.brand_terms.join(", "));
    setLogoFile(null);
    setIsFormOpen(true);
  };

  const openDeleteFlow = (client: ClientConfig) => {
    setDeletingClient(client);
    setDeleteConfirmation("");
    setIsDeleteOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name' && !editingClient && !formData.key) {
      // Auto-generate key from name if not editing
      const generatedKey = value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      setFormData(prev => ({ ...prev, name: value, key: generatedKey }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBrandTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrandTermsInput(e.target.value);
    const terms = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, brand_terms: terms }));
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key || !formData.name || !formData.gsc_url) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    // Key validation
    if (!/^[a-z0-9_]+$/.test(formData.key)) {
      toast.error("Client key can only contain lowercase letters, numbers, and underscores.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      let currentFormData = { ...formData };

      // Handle logo upload
      if (logoFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(logoFile);
        });
        const base64 = await base64Promise;
        
        const uploadRes = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: formData.key,
            imageBase64: base64,
            filename: logoFile.name
          })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.path) {
          currentFormData.logo_path = uploadData.path;
        }
      }

      if (editingClient) {
        const result = await updateClientAction(editingClient.key, currentFormData);
        if (result.error) throw new Error(result.error);
        
        setClients(clients.map(c => c.key === editingClient.key ? { ...c, ...currentFormData } as ClientConfig : c));
        toast.success(`Client ${currentFormData.name} updated successfully.`);
      } else {
        const result = await createClientAction(currentFormData as ClientConfig);
        if (result.error) throw new Error(result.error);
        
        setClients([...clients, currentFormData as ClientConfig]);
        toast.success(`Client ${currentFormData.name} added successfully.`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingClient) return;
    setIsSubmitting(true);
    
    try {
      const result = await deleteClientAction(deletingClient.key);
      if (result.error) throw new Error(result.error);
      
      setClients(clients.filter(c => c.key !== deletingClient.key));
      toast.success(`Client ${deletingClient.name} deleted successfully.`);
      setIsDeleteOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
        <Button onClick={openAddForm} className="w-full sm:w-auto gap-2">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      <div className="rounded-md border bg-background overflow-hidden shadow-sm">
        {clients.length === 0 ? (
          <EmptyState
            title="No Clients Found"
            description="You haven't added any clients yet. Add your first client to start generating reports."
            action={
              <Button onClick={openAddForm} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Add First Client
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Client Name</TableHead>
                <TableHead>GSC URL</TableHead>
                <TableHead>GA4 Property</TableHead>
                <TableHead>Brand Terms</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.key}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: client.header_color }}
                      />
                      <div className="flex flex-col">
                        <span>{client.name}</span>
                        <span className="text-xs text-muted-foreground font-normal">{client.key}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Globe className="h-3.5 w-3.5" />
                      {client.gsc_url}
                      {client.url_speedvital && (
                        <div className="ml-2 pl-2 border-l border-border flex items-center gap-1.5">
                          SpeedVital: {client.url_speedvital}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {client.ga4_property_id || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {client.brand_terms.slice(0, 2).map((term, i) => (
                        <span key={i} className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {term}
                        </span>
                      ))}
                      {client.brand_terms.length > 2 && (
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          +{client.brand_terms.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-accent hover:text-accent-foreground outline-none">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditForm(client)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => openDeleteFlow(client)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && search && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No clients match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={submitForm}>
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add Client"}</DialogTitle>
              <DialogDescription>
                Configure the data sources and branding for this client.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input id="name" name="name" value={formData.name || ""} onChange={handleFormChange} placeholder="Acme Corp" required />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="key">Client Key (ID) *</Label>
                <Input 
                  id="key" 
                  name="key" 
                  value={formData.key || ""} 
                  onChange={handleFormChange} 
                  disabled={!!editingClient}
                  placeholder="acme_corp" 
                  pattern="^[a-z0-9_]+$"
                  title="Lowercase letters, numbers, and underscores only"
                  required 
                />
                <p className="text-[10px] text-muted-foreground">Unique identifier used for folder names and internal references.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gsc_url">GSC URL *</Label>
                <Input id="gsc_url" name="gsc_url" value={formData.gsc_url || ""} onChange={handleFormChange} placeholder="sc-domain:acme.com" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="url_speedvital">SpeedVital URL</Label>
                <Input id="url_speedvital" name="url_speedvital" value={formData.url_speedvital || ""} onChange={handleFormChange} placeholder="https://acme.com" />
                <p className="text-[10px] text-muted-foreground">Optional. Used specifically for PageSpeed/Core Web Vitals if different from GSC.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logo">Company Logo</Label>
                <Input 
                  id="logo" 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setLogoFile(e.target.files[0]);
                    }
                  }} 
                />
                {formData.logo_path && !logoFile && (
                  <p className="text-[10px] text-muted-foreground">Current logo: {formData.logo_path.split(/[\\/]/).pop()}</p>
                )}
                <p className="text-[10px] text-muted-foreground">Optional. This logo will be placed on the cover slide of the PPTX report.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ga4_property_id">GA4 Property ID</Label>
                <Input id="ga4_property_id" name="ga4_property_id" value={formData.ga4_property_id || ""} onChange={handleFormChange} placeholder="123456789" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brand_terms">Brand Terms</Label>
                <div className="relative">
                  <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="brand_terms" 
                    value={brandTermsInput} 
                    onChange={handleBrandTermsChange} 
                    placeholder="acme, acme corp" 
                    className="pl-9"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Comma separated list of branded search terms.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="header_color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input id="header_color" name="header_color" type="color" value={formData.header_color || "#1e3a8a"} onChange={handleFormChange} className="w-12 p-1 h-9 cursor-pointer" />
                    <Input name="header_color" value={formData.header_color || ""} onChange={handleFormChange} className="flex-1" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accent_color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input id="accent_color" name="accent_color" type="color" value={formData.accent_color || "#3b82f6"} onChange={handleFormChange} className="w-12 p-1 h-9 cursor-pointer" />
                    <Input name="accent_color" value={formData.accent_color || ""} onChange={handleFormChange} className="flex-1" />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Client</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the configuration for <strong>{deletingClient?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="confirm-delete">
              Please type <strong>{deletingClient?.key}</strong> to confirm.
            </Label>
            <Input 
              id="confirm-delete" 
              value={deleteConfirmation} 
              onChange={(e) => setDeleteConfirmation(e.target.value)} 
              placeholder={deletingClient?.key}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button 
              type="button" 
              variant="destructive" 
              disabled={deleteConfirmation !== deletingClient?.key || isSubmitting}
              onClick={confirmDelete}
            >
              {isSubmitting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
