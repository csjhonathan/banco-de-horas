/** Chip com o usuário logado. */
export function UserChip({ username }: { username: string }) {
  return (
    <span className="rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-bold text-accent">
      @{username}
    </span>
  );
}
