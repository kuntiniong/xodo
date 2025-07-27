
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface PassphraseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (passphrase: string) => Promise<void>;
  mode: 'create' | 'unlock';
  error?: string;
  isLoading?: boolean;
}

export function PassphraseDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  mode, 
  error,
  isLoading = false 
}: PassphraseDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // Clear form when dialog opens/closes or mode changes
  useEffect(() => {
    if (!open) {
      setPassphrase("");
      setConfirmPassphrase("");
      setLocalError("");
      setSubmitAttempts(0);
      setLastSubmitTime(0);
    }
  }, [open, mode]);

  const handleSubmit = async () => {
    setLocalError("");
    
    // Prevent spam submissions (1 second cooldown)
    const now = Date.now();
    if (now - lastSubmitTime < 1000) {
      setLocalError("Please wait before trying again");
      return;
    }
    
    // Limit submission attempts to prevent abuse
    if (submitAttempts >= 5) {
      setLocalError("Too many attempts. Please refresh the page and try again.");
      return;
    }
    
    if (mode === 'create') {
      if (passphrase.length < 6) {
        setLocalError("Passphrase must be at least 6 characters long");
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setLocalError("Passphrases do not match");
        return;
      }
    }
    
    if (!passphrase.trim()) {
      setLocalError("Passphrase is required");
      return;
    }

    try {
      setSubmitAttempts(prev => prev + 1);
      setLastSubmitTime(now);
      
      await onSubmit(passphrase);
      
      // Reset form on successful submission
      setPassphrase("");
      setConfirmPassphrase("");
      setLocalError("");
      setSubmitAttempts(0);
    } catch (error) {
      console.error("Passphrase submission error:", error);
      // Error handling is done in the parent component
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  const displayError = error || localError;

  return (
    <Dialog open={open} onOpenChange={!isLoading ? onOpenChange : undefined}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Passphrase' : 'Enter Passphrase'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a secure passphrase to encrypt your data. This passphrase will be required to access your todos on any device.'
              : 'Enter your passphrase to decrypt and access your encrypted todo data.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="passphrase">
              Passphrase
            </Label>
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyPress={handleKeyPress}
              className="col-span-3"
              disabled={isLoading}
              placeholder={mode === 'create' ? 'Create a strong passphrase' : 'Enter your passphrase'}
            />
          </div>
          
          {mode === 'create' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassphrase">
                Confirm
              </Label>
              <Input
                id="confirmPassphrase"
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                onKeyPress={handleKeyPress}
                className="col-span-3"
                disabled={isLoading}
                placeholder="Confirm your passphrase"
              />
            </div>
          )}
          
          {displayError && (
            <div className="text-red-600 text-sm mt-2">
              {displayError}
            </div>
          )}
          
          {mode === 'create' && (
            <div className="text-sm text-muted-foreground mt-2">
              <strong>Important:</strong> Remember this passphrase! It cannot be recovered if lost.
              Your data will be encrypted with this passphrase and stored securely.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !passphrase.trim() || (mode === 'create' && !confirmPassphrase.trim())}
          >
            {isLoading ? 'Processing...' : (mode === 'create' ? 'Create Account' : 'Unlock Data')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
