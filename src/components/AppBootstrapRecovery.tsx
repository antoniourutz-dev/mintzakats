import { useAuth } from '../contexts/AuthContext';
import { buttonBaseStyle } from '../styles';

export function AppBootstrapRecovery() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="bg-red-100 border-4 border-red-900 p-6 max-w-lg w-full text-center space-y-4">
        <p className="font-bold">Ezin izan da aplikazioa kargatu.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${buttonBaseStyle} w-full`}
        >
          Saiatu berriro
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className={`${buttonBaseStyle} w-full bg-white`}
        >
          Saioa itxi
        </button>
      </div>
    </div>
  );
}
