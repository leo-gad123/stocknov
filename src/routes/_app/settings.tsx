import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUserSettings, updateUserSettings } from "@/lib/firebase-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, Save } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { settings, loading } = useUserSettings(user?.uid);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.stockJournalStartDate) setStartDate(format(new Date(settings.stockJournalStartDate), "yyyy-MM-dd"));
      if (settings.stockJournalEndDate) setEndDate(format(new Date(settings.stockJournalEndDate), "yyyy-MM-dd"));
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserSettings(user.uid, {
        stockJournalStartDate: startDate ? new Date(startDate).getTime() : undefined,
        stockJournalEndDate: endDate ? new Date(endDate).getTime() : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="max-w-lg">
        <div className="rounded-lg border bg-card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Stock Journal Period
          </h2>
          <p className="text-sm text-muted-foreground">Set the start and end dates for your stock journal tracking period.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "Saved ✓" : <><Save className="h-4 w-4" /> Save Settings</>}
          </Button>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Account Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.displayName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
