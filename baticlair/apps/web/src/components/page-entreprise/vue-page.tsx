import { BadgeCheck, CalendarDays, Clock, Globe, MapPin, Phone, ShieldCheck } from "lucide-react";
import {
  lienAppel,
  menuDeLaPage,
  photoAccueil,
  preuvesCourtes,
  rubriquesVisibles,
  teinteDe,
  titreAccueil,
  type ContenuPage,
} from "@baticlair/domain/page-entreprise";
import { EDITEUR, HEBERGEUR } from "@/lib/legal";
import { TRADES } from "@/lib/trades";
import { ChantierRealise, EnTeteSite, SuiviDefilement } from "./navigation";
import { Photo } from "./photo";

export { Photo };
import { ContactPage, SignalerPage } from "./interactions";
import "./page-entreprise.css";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026, REFONTE du même jour : « quand un client ouvre le lien, il doit croire qu'il est
 * sur le site web de l'artisan »). UN SEUL MODÈLE, le site vitrine d'une page d'un bon artisan : barre du haut, accueil
 * plein écran sur une vraie photo, prestations, réalisations par chantier, à propos, zone, contact, pied de page. Fond
 * ivoire et typographie de la landing de Mobiiz ; « Appeler » en jaune Mobiiz ; la teinte de l'artisan (une des quatre)
 * pour les détails. Aucune rubrique vide, ni dans la page ni dans le menu. Mise en page par requêtes de CONTENEUR :
 * l'aperçu de l'éditeur se dessine comme un vrai téléphone, même sur un ordinateur.
 */
export const LIBELLES: Record<string, string> = Object.fromEntries(TRADES.map((t) => [t.id, t.label]));

export const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter((m) => /^[A-Za-zÀ-ÿ0-9]/.test(m) && !/^(et|de|du|des|la|le|les|sarl|sas|eurl|sasu)$/i.test(m))
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("") || "•";

function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00Z`));
}

export interface VuePageProps {
  contenu: ContenuPage;
  /** Dans l'éditeur : rien ne part, les liens ne mènent nulle part. */
  apercu?: boolean;
  /** L'année en cours (« 15 ans d'expérience »). */
  annee?: number;
}

export function VuePage({ contenu: c, apercu = false, annee = new Date().getFullYear() }: VuePageProps) {
  const visibles = rubriquesVisibles(c);
  const menu = menuDeLaPage(c);
  const accueil = photoAccueil(c);
  const preuves = preuvesCourtes(c, annee);
  const titre = titreAccueil(c);
  const style = { "--pe-teinte": teinteDe(c) } as React.CSSProperties;
  const lien = (href: string) => (apercu ? undefined : href);

  return (
    <div className={`pe${accueil ? " pe-avec-photo" : ""}${apercu ? " pe-apercu" : ""}`} style={style}>
      <SuiviDefilement />
      <EnTeteSite nom={c.nom} logo={c.logo} initiales={initiales(c.nom)} telephone={c.telephone} menu={menu} />

      <main id="contenu">
        <section id="accueil" className="pe-accueil" aria-labelledby="pe-titre">
          {accueil ? (
            <div className="pe-accueil-photo">
              <Photo photo={accueil} alt={`Chantier réalisé par ${c.nom}`} sizes="100vw" prioritaire />
            </div>
          ) : null}
          <div className="pe-cadre pe-accueil-texte">
            <h1 id="pe-titre">{titre}</h1>
            <p className="pe-accueil-nom">{c.nom}</p>
            {preuves.length ? (
              <ul className="pe-preuves" aria-label="Garanties">
                {preuves.map((x) => (
                  <li key={x}>
                    <BadgeCheck size={17} strokeWidth={2.2} aria-hidden="true" /> {x}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="pe-actions">
              {c.telephone ? (
                <a href={lienAppel(c.telephone)} className="pe-btn pe-btn-appel">
                  <Phone size={19} strokeWidth={2.2} aria-hidden="true" /> Appeler
                </a>
              ) : null}
              <a href="#contact" className="pe-btn pe-btn-second">
                Demander un devis
              </a>
            </div>
          </div>
        </section>

        {visibles.includes("prestations") ? (
          <section id="prestations" className="pe-section" aria-labelledby="pe-t-prestations">
            <div className="pe-cadre">
              <h2 id="pe-t-prestations">Nos prestations</h2>
              <ul className="pe-prestations">
                {c.prestations.map((x) => (
                  <li key={x.titre}>
                    <h3>{x.titre}</h3>
                    {x.texte ? <p>{x.texte}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {visibles.includes("realisations") ? (
          <section id="realisations" className="pe-section pe-section-os" aria-labelledby="pe-t-realisations">
            <div className="pe-cadre">
              <h2 id="pe-t-realisations">Nos réalisations</h2>
              <ul className="pe-chantiers">
                {c.realisations.map((r) => (
                  <li key={r.id}>
                    <ChantierRealise realisation={r} nom={c.nom} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {visibles.includes("a-propos") ? (
          <section id="a-propos" className="pe-section" aria-labelledby="pe-t-apropos">
            <div className={`pe-cadre pe-apropos${c.photoEquipe ? " pe-apropos-photo" : ""}`}>
              {c.photoEquipe ? (
                <div className="pe-apropos-image">
                  <Photo photo={c.photoEquipe} alt={`L'équipe de ${c.nom}`} sizes="(min-width: 900px) 40vw, 100vw" />
                </div>
              ) : null}
              <div className="pe-apropos-texte">
                <div className="pe-apropos-tete">
                  <h2 id="pe-t-apropos">À propos</h2>
                  {c.accroche ? <p className="pe-chapeau">{c.accroche}</p> : null}
                </div>
                <div className="pe-apropos-corps">
                  {c.presentation
                    ? c.presentation.split(/\n{2,}/).map((para, i) => (
                        <p key={i} className="pe-texte">
                          {para}
                        </p>
                      ))
                    : null}
                  {c.verifiee || c.certifications.length || c.creeeEn ? (
                    <ul className="pe-qualifs">
                      {c.verifiee ? (
                        <li>
                          <BadgeCheck size={20} aria-hidden="true" /> Entreprise vérifiée
                        </li>
                      ) : null}
                      {c.certifications.map((x) => (
                        <li key={x}>
                          <ShieldCheck size={20} aria-hidden="true" /> {x}
                        </li>
                      ))}
                      {c.creeeEn ? (
                        <li>
                          <CalendarDays size={20} aria-hidden="true" /> Depuis {c.creeeEn}
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                  {c.certifications.length ? <p className="pe-note">Certifications et assurances déclarées par l&apos;entreprise.</p> : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {visibles.includes("zone") ? (
          <section id="zone" className="pe-section pe-zone" aria-labelledby="pe-t-zone">
            <div className="pe-cadre">
              <h2 id="pe-t-zone">Zone d&apos;intervention</h2>
              {c.zone ? (
                <p className="pe-zone-ville">
                  <MapPin size={26} strokeWidth={2.2} aria-hidden="true" /> {c.zone} et alentours
                </p>
              ) : null}
              {c.adressePostale ? <p className="pe-texte">{c.adressePostale}</p> : null}
            </div>
          </section>
        ) : null}

        <section id="contact" className="pe-contact" aria-labelledby="pe-t-contact">
          <div className="pe-cadre pe-contact-grille">
            <div className="pe-contact-gauche">
              <h2 id="pe-t-contact">Un projet ? Parlons-en</h2>
              <p className="pe-contact-intro">Devis gratuit. {c.nom} vous répond directement.</p>
              {c.telephone ? (
                <a href={lienAppel(c.telephone)} className="pe-btn pe-btn-appel pe-btn-grand">
                  <Phone size={21} strokeWidth={2.2} aria-hidden="true" /> {c.telephone}
                </a>
              ) : null}
              {c.horaires ? (
                <p className="pe-contact-ligne">
                  <Clock size={19} aria-hidden="true" /> {c.horaires}
                </p>
              ) : null}
              {c.missions ? (
                <p className="pe-contact-ligne">
                  Disponible pour des missions entre entreprises
                  {c.missions.disponibleDu ? ` du ${dateCourte(c.missions.disponibleDu)}${c.missions.disponibleAu ? ` au ${dateCourte(c.missions.disponibleAu)}` : ""}` : ""}.{" "}
                  <a href={lien(c.missions.lien)}>Proposer une mission</a>
                </p>
              ) : null}
            </div>
            <div className="pe-contact-form">
              <ContactPage adresse={c.adresse} nom={c.nom} apercu={apercu} />
            </div>
          </div>
        </section>
      </main>

      <footer className="pe-pied">
        <div className="pe-cadre pe-pied-grille">
          <div>
            <p className="pe-pied-nom">{c.nom}</p>
            {c.siret ? <p>SIRET {c.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}</p> : null}
            {c.siteWeb ? (
              <p>
                <a href={lien(c.siteWeb)} rel="noopener nofollow" target="_blank" className="pe-pied-site">
                  <Globe size={16} aria-hidden="true" /> Voir mon site
                </a>
              </p>
            ) : null}
          </div>
          <div className="pe-pied-droite">
            <details className="pe-mentions">
              <summary>Mentions légales</summary>
              <p>
                Page éditée par {c.nom}
                {c.siret ? ` (SIRET ${c.siret})` : ""}, responsable de son contenu, de ses photos et des informations déclarées.{" "}
                {c.adressePostale ? `Adresse : ${c.adressePostale}. ` : c.zone ? `Zone : ${c.zone}. ` : ""}Contact : le formulaire de cette page{c.telephone ? ` ou le ${c.telephone}` : ""}. Responsable de la publication : le représentant légal de {c.nom}.
              </p>
              <p>
                Hébergement : {EDITEUR.nom} ({EDITEUR.produit}), {EDITEUR.forme}, {EDITEUR.adresse}, {EDITEUR.contact} ; serveurs {HEBERGEUR.nom}, {HEBERGEUR.adresse}.
              </p>
              <p>
                Certifications et assurances : déclarées par l&apos;entreprise, non vérifiées par Mobiiz. « Entreprise vérifiée » : SIRET actif contrôlé à l&apos;INSEE, ce n&apos;est pas un label de qualité. Données personnelles : <a href={lien("/confidentialite")}>politique de confidentialité</a>.
              </p>
            </details>
            <SignalerPage adresse={c.adresse} apercu={apercu} />
            <a href={lien("/")} className="pe-mobiiz">
              Page créée avec Mobiiz
            </a>
          </div>
        </div>
      </footer>

      {c.telephone ? (
        <div className="pe-barre-appel">
          <a href={lienAppel(c.telephone)} className="pe-btn pe-btn-appel">
            <Phone size={19} strokeWidth={2.2} aria-hidden="true" /> Appeler le {c.telephone}
          </a>
        </div>
      ) : null}
    </div>
  );
}
