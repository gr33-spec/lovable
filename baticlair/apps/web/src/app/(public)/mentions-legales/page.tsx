import type { Metadata } from "next";
import Link from "next/link";
import { EnteteVitrine, PiedVitrine } from "@/components/vitrine";
import { EDITEUR, HEBERGEUR, HEBERGEUR_BASE } from "@/lib/legal";
import { NOM_APP } from "@/lib/nom";

export const metadata: Metadata = {
  title: { absolute: `Mentions légales · ${NOM_APP}` },
};

const s = { h2: "mz-titre mz-legal-h2", p: "mz-legal-p" };

/**
 * Les mentions légales (LCEN, article 6-III ; Greg, 24 octobre 2026). Les informations du Kbis que seul Greg peut donner
 * portent le repère « [A COMPLETER] » : la construction de production échoue tant qu'il en reste un. Mise en page de la vitrine
 * depuis le 26 octobre 2026 (colonne de lecture décalée, titres en Bricolage étroite) ; le texte n'a pas changé.
 */
export default function MentionsLegalesPage() {
  return (
    <div className="mz">
      <div className="mz-page">
        <EnteteVitrine />
        <main className="mz-legal">
          <article>
            <p className="mz-cote mz-etiq" style={{ marginBottom: 22 }}>
              <span>Version du 26/10/2026</span>
              <i aria-hidden="true" />
            </p>
            <h1 className="mz-titre mz-h2">Mentions légales</h1>
            <section className="mz-legal-bloc">
              <h2 className={s.h2}>Éditeur</h2>
              <p className={s.p}>Service édité par {EDITEUR.nom}.</p>
              <p className={s.p}>
                {EDITEUR.produit} est édité par {EDITEUR.nom}, {EDITEUR.forme}{" "}
                au capital de {EDITEUR.capital} €, immatriculée au RCS de{" "}
                {EDITEUR.rcs} sous le numéro {EDITEUR.siren}, SIRET{" "}
                {EDITEUR.siret}, dont le siège est situé {EDITEUR.adresse}. TVA
                intracommunautaire {EDITEUR.tva}.
              </p>
              <p className={s.p}>
                Directeur de la publication : {EDITEUR.directeurPublication}.
              </p>
            </section>
            <section id="contact" className="mz-legal-bloc">
              <h2 className={s.h2}>Contact</h2>
              <p className={s.p}>
                Par e-mail : {EDITEUR.contact}. Par courrier : {EDITEUR.nom},{" "}
                {EDITEUR.adresse}. Les demandes sur vos données personnelles
                reçoivent une réponse dans un délai d&apos;un mois.
              </p>
            </section>
            <section className="mz-legal-bloc">
              <h2 className={s.h2}>Hébergeurs</h2>
              <p className={s.p}>
                Site et application : {HEBERGEUR.nom}, {HEBERGEUR.adresse} (
                {HEBERGEUR.site}), serveurs à {HEBERGEUR.serveurs}.
              </p>
              <p className={s.p}>
                Base de données : {HEBERGEUR_BASE.nom}, {HEBERGEUR_BASE.adresse}{" "}
                ({HEBERGEUR_BASE.site}), serveurs à {HEBERGEUR_BASE.serveurs}.
              </p>
            </section>
            <section className="mz-legal-bloc">
              <h2 className={s.h2}>Propriété</h2>
              <p className={s.p}>
                Le nom {NOM_APP}, l&apos;application et ses référentiels métier
                appartiennent à {EDITEUR.nom}. Les listes et les devis que vous
                déposez restent les vôtres :{NOM_APP} les lit pour vous rendre
                le service, rien d&apos;autre.
              </p>
            </section>
            <Link href="/" className="mz-lien">
              Retour à l&apos;accueil
            </Link>
          </article>
        </main>
        <PiedVitrine sansEditeur />
      </div>
    </div>
  );
}
