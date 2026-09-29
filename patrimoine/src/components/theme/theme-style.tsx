"use client";

import { useStore } from "@/lib/store";
import { themeCss } from "@/lib/theme";

/**
 * Couleurs du thème choisi (Plus › Apparence), posées sur :root. Rendue dès
 * le serveur avec les données : pas de flash de couleur au chargement, et
 * mise à jour immédiate quand le choix change.
 */
export function ThemeStyle() {
  const { data } = useStore();
  return <style id="theme" dangerouslySetInnerHTML={{ __html: themeCss(data.settings.theme) }} />;
}
