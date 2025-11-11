import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Key, 
  Plus, 
  Trash2,
  AlertCircle,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { CreateApiKeyDialog } from "@/components/admin/CreateApiKeyDialog";
import { RevokeApiKeyDialog } from "@/components/admin/RevokeApiKeyDialog";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  scopes: any;
  created_at: string;
  last_used_at?: string;
  request_count: number;
  expires_at?: string;
  centro_code?: string;
}

export default function ApiKeysManagement() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error: any) {
      toast.error(`Error loading API keys: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-success/10 text-success border-success/20',
      revoked: 'bg-destructive/10 text-destructive border-destructive/20',
      expired: 'bg-warning/10 text-warning border-warning/20'
    };
    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            API Keys Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Generate and manage API keys for external integrations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Card className="p-6">
        {keys.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {key.key_prefix}...
                    </code>
                  </TableCell>
                  <TableCell>{getStatusBadge(key.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(() => {
                        const scopesArray = Array.isArray(key.scopes) 
                          ? key.scopes 
                          : (key.scopes && typeof key.scopes === 'object' ? Object.keys(key.scopes) : []);
                        return scopesArray.length > 0 ? (
                          scopesArray.map((scope: string) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No scopes</span>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {key.request_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {key.last_used_at 
                      ? format(new Date(key.last_used_at), 'dd/MM/yy HH:mm')
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(key.created_at), 'dd/MM/yy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {key.status === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRevokeKeyId(key.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              No API keys created yet
            </p>
            <p className="text-sm text-muted-foreground">
              Click "Create API Key" to generate your first key for external integrations
            </p>
          </div>
        )}
      </Card>

      <CreateApiKeyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onKeyCreated={loadApiKeys}
      />

      {revokeKeyId && (
        <RevokeApiKeyDialog
          keyId={revokeKeyId}
          onClose={() => setRevokeKeyId(null)}
          onRevoked={loadApiKeys}
        />
      )}
    </div>
  );
}
