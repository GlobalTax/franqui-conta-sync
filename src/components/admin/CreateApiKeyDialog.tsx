import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AVAILABLE_SCOPES = [
  { id: 'invoices:read', label: 'Read Invoices', description: 'View invoice data' },
  { id: 'invoices:write', label: 'Write Invoices', description: 'Create and modify invoices' },
  { id: 'bank:read', label: 'Read Bank Transactions', description: 'View banking data' },
  { id: 'accounts:read', label: 'Read Accounts', description: 'View chart of accounts' },
  { id: 'reports:read', label: 'Read Reports', description: 'Access P&L and reports' }
];

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyCreated: () => void;
}

export function CreateApiKeyDialog({ 
  open, 
  onOpenChange, 
  onKeyCreated 
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_api_key', {
        p_name: name,
        p_scopes: selectedScopes
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setGeneratedKey(data[0].api_key);
        toast.success('API Key created successfully');
        onKeyCreated();
      }
    } catch (error: any) {
      toast.error(`Error creating API key: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedScopes([]);
    setGeneratedKey(null);
    setShowKey(false);
    onOpenChange(false);
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success('API Key copied to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for external integrations
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Key Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Webhook Integration"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this API key
              </p>
            </div>

            <div className="space-y-3">
              <Label>Permissions (Scopes) *</Label>
              <div className="space-y-3 border rounded-lg p-4">
                {AVAILABLE_SCOPES.map((scope) => (
                  <div key={scope.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={scope.id}
                      checked={selectedScopes.includes(scope.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedScopes([...selectedScopes, scope.id]);
                        } else {
                          setSelectedScopes(selectedScopes.filter(s => s !== scope.id));
                        }
                      }}
                    />
                    <div className="grid gap-1 leading-none">
                      <label 
                        htmlFor={scope.id} 
                        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {scope.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {scope.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select at least one permission scope for this API key
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create API Key'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert className="border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                <p className="font-medium mb-1">⚠️ Save this key now!</p>
                <p className="text-sm">
                  This is the only time you'll see the full API key. Store it securely.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedKey}
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key in the <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code> header for API requests
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
