interface LoadingStateProps {
  message: string;
}

/** État de chargement explicite : jamais de page blanche (design system §2). */
export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-blue"
        aria-hidden="true"
      />
      <p className="font-display text-lg font-bold">{message}</p>
      <p className="font-sans text-sm text-muted">
        Ça peut prendre une minute, merci de patienter.
      </p>
    </div>
  );
}
