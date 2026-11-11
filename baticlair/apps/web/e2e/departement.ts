import { test } from "@playwright/test";

/**
 * Un département tiré dans une plage réservée à CE test et à CET appareil (11 novembre 2026). Avant, chaque test tirait
 * parmi les mêmes 19 (ou 40) départements : deux tests de la même passe tombaient parfois sur le même, l'un rejoignait
 * l'achat groupé de l'autre et lisait un autre état. Le hasard reste (une base réutilisée ne se répète pas), les plages
 * ne se recoupent plus.
 */
export function departementReserve(telephone: [number, number], ordinateur: [number, number]): string {
  const [debut, fin] = test.info().project.name === "telephone" ? telephone : ordinateur;
  return String(debut + Math.floor(Math.random() * (fin - debut + 1))).padStart(2, "0");
}
