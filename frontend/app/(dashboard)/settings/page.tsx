"use client";

import { useState } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { SUPPORTED_LLM_MODELS, LLMModel } from "@/lib/pipeline/models";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { customModels, addCustomModel, removeCustomModel, defaultModel, setDefaultModel } = useSettingsStore();
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [newModelProvider, setNewModelProvider] = useState("");

  const allModels = [...SUPPORTED_LLM_MODELS, ...customModels];

  const handleAddCustomModel = () => {
    if (!newModelId || !newModelName || !newModelProvider) {
      toast.error("Please fill out all fields for the custom model.");
      return;
    }
    
    if (allModels.find(m => m.id === newModelId)) {
      toast.error("Model ID already exists.");
      return;
    }

    addCustomModel({
      id: newModelId,
      name: newModelName,
      provider: newModelProvider
    });

    setNewModelId("");
    setNewModelName("");
    setNewModelProvider("");
    toast.success(`Custom model ${newModelName} added.`);
  };

  const handleRemoveCustomModel = (id: string) => {
    removeCustomModel(id);
    if (defaultModel === id) {
      setDefaultModel(SUPPORTED_LLM_MODELS[0].id);
    }
    toast.success("Custom model removed.");
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure application preferences and add custom LLM models for generation.
        </p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>LLM Models</CardTitle>
            <CardDescription>
              Manage which AI models are available when generating insights. Supported models include GLM-5 and GLM-4 series.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Available Models</h3>
              <div className="grid gap-3">
                {allModels.map((model) => {
                  const isCustom = customModels.some(c => c.id === model.id);
                  const isDefault = defaultModel === model.id;
                  
                  return (
                    <div key={model.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isDefault ? 'border-primary bg-primary/5' : 'bg-card'}`}>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {model.name}
                          {isDefault && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          {isCustom && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full uppercase font-bold text-muted-foreground tracking-wider">Custom</span>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ID: {model.id} &middot; Provider: {model.provider}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isDefault && (
                          <Button variant="outline" size="sm" onClick={() => setDefaultModel(model.id)}>
                            Set Default
                          </Button>
                        )}
                        {isCustom && (
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemoveCustomModel(model.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">Add Custom Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Model ID</label>
                  <Input 
                    placeholder="e.g., my-custom-glm" 
                    value={newModelId} 
                    onChange={e => setNewModelId(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <Input 
                    placeholder="e.g., My Custom GLM" 
                    value={newModelName} 
                    onChange={e => setNewModelName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Provider</label>
                  <Input 
                    placeholder="e.g., Zhipu" 
                    value={newModelProvider} 
                    onChange={e => setNewModelProvider(e.target.value)} 
                  />
                </div>
              </div>
              <Button onClick={handleAddCustomModel} className="gap-2">
                <Plus className="h-4 w-4" /> Add Model
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
