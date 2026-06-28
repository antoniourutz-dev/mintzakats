import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isValidLoginInput } from '../utils/username';
import { buttonBaseStyle, inputStyle } from '../styles';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  initialStep?: 'sign-in' | 'profile';
};

export function AuthModal({ open, onClose, initialStep = 'sign-in' }: AuthModalProps) {
  const { signIn, updateProfile, needsProfileSetup } = useAuth();
  const [step, setStep] = useState<'sign-in' | 'profile'>(initialStep);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(needsProfileSetup ? 'profile' : initialStep);
      setError(null);
    }
  }, [open, initialStep, needsProfileSetup]);

  if (!open) return null;

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();

    if (!isValidLoginInput(username)) {
      setError('Idatzi baliozko erabiltzaile-izen bat.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signIn(username, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore bat gertatu da.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfile = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await updateProfile(profileUsername, displayName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore bat gertatu da.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border-4 border-neutral-900 w-full max-w-md p-6 shadow-[10px_10px_0_0_rgba(23,23,23,1)]">
        <div className="flex items-start justify-between mb-6">
          <h2 id="auth-modal-title" className="text-2xl font-black tracking-tight">
            {step === 'profile' ? 'Osatu zure profila' : 'Sartu Mintzakats-era'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-4 border-neutral-900 p-2 bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-500"
            aria-label="Itxi"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            id="auth-modal-error"
            className="bg-red-100 border-4 border-red-900 p-3 mb-4 font-bold text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {step === 'sign-in' && (
          <form onSubmit={handleSignIn} className="space-y-4" aria-describedby={error ? 'auth-modal-error' : undefined}>
            <label className="block font-bold">
              Erabiltzaile-izena
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={`${inputStyle} mt-2`}
                placeholder="adib. ikasle005"
                autoComplete="username"
                required
              />
            </label>
            <p className="text-sm font-bold text-neutral-600">
              Idatzi zure erabiltzaile-izena; ez da posta elektronikoa idatzi behar.
            </p>
            <label className="block font-bold">
              Pasahitza
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputStyle} mt-2`}
                autoComplete="current-password"
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className={`${buttonBaseStyle} bg-indigo-500 hover:bg-indigo-400 w-full disabled:opacity-60`}
            >
              {loading ? 'SARTZEN...' : 'Sartu'}
            </button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfile} className="space-y-4">
            <label className="block font-bold">
              Erabiltzaile-izena
              <input
                type="text"
                value={profileUsername}
                onChange={(event) => setProfileUsername(event.target.value)}
                className={`${inputStyle} mt-2`}
                pattern="[A-Za-z0-9_-]{3,24}"
                required
              />
            </label>
            <label className="block font-bold">
              Izen ikusgai (aukerakoa)
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={`${inputStyle} mt-2`}
                maxLength={40}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className={`${buttonBaseStyle} bg-indigo-500 hover:bg-indigo-400 w-full disabled:opacity-60`}
            >
              {loading ? 'GORDETZEN...' : 'Gorde profila'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
