import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasUsers, setHasUsers] = useState(false);

  useEffect(() => {
    // Check if any users exist already
    get(ref(db, "users")).then((snap) => {
      setHasUsers(snap.exists());
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Setup Complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">An admin account already exists. Please use the login page.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/login" })}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(db, `users/${cred.user.uid}`), {
        email,
        role: "admin",
        displayName: email.split("@")[0],
        createdAt: Date.now(),
      });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Initial Setup</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create the first admin account</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="setup-email">Admin Email</Label>
            <Input id="setup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-password">Password</Label>
            <Input id="setup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Admin Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
