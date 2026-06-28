import { Dialog } from './Dialog';
import { PlayerHistoryPanel } from './PlayerHistoryPanel';
import type { AdminPlayer } from '../../types/admin';

type PlayerHistoryDrawerProps = {
  open: boolean;
  player: AdminPlayer | null;
  onClose: () => void;
  onPlayersChanged?: () => void;
};

export function PlayerHistoryDrawer({
  open,
  player,
  onClose,
  onPlayersChanged,
}: PlayerHistoryDrawerProps) {
  return (
    <Dialog
      open={open}
      wide
      title={player ? `Historia · ${player.username}` : 'Jokalariaren historia'}
      onClose={onClose}
    >
      <PlayerHistoryPanel
        player={player}
        onPlayersChanged={() => {
          onPlayersChanged?.();
        }}
      />
    </Dialog>
  );
}
