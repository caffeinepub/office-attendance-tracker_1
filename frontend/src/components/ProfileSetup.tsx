import React, { useState } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

export default function ProfileSetup() {
  const { data: userProfile, isLoading, isFetched } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const [name, setName] = useState('');

  const showModal = !isLoading && isFetched && userProfile === null;

  const handleSave = async () => {
    if (!name.trim()) return;
    await saveProfile.mutateAsync({ name: name.trim() });
  };

  return (
    <Dialog open={showModal}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader className="text-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <User className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-display font-bold">Welcome!</DialogTitle>
          <DialogDescription className="text-center">
            Let's set up your profile. What should we call you?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="h-12 rounded-xl"
              autoFocus
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || saveProfile.isPending}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {saveProfile.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
