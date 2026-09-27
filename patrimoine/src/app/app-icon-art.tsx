// Pictogramme de l'application : trois immeubles stylisés, bleu nuit et or.
export function IconArt({ size }: { size: number }) {
  const u = size / 180;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0b2545 0%, #13315c 100%)",
        paddingBottom: 44 * u,
        gap: 8 * u,
      }}
    >
      <div style={{ width: 30 * u, height: 58 * u, background: "#b08d57", borderRadius: 4 * u }} />
      <div style={{ width: 36 * u, height: 92 * u, background: "#ffffff", borderRadius: 4 * u }} />
      <div style={{ width: 30 * u, height: 72 * u, background: "#8fa6c7", borderRadius: 4 * u }} />
    </div>
  );
}
