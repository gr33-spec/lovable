import { BadgeCheck, CalendarDays, Clock, Globe, Heart, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
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
import { EnTeteSite, ListeChantiers, RetourMonSite, SuiviDefilement } from "./navigation";
import { iconeDePrestation } from "./icones";
import { Photo } from "./photo";

export { Photo };
import { ContactPage, SignalerPage } from "./interactions";
import { EntrePros } from "./entre-pros";
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
  // « Couvreur à Lannion » : le métier en blanc, « à Lannion » en jaune dessous (maquette de Greg, 17 novembre 2026).
  const coupure = titre.indexOf(" à ");
  const titreHaut = coupure > 0 ? titre.slice(0, coupure) : titre;
  // « à » jamais seul sur sa ligne : il reste collé à la ville.
  const titreBas = coupure > 0 ? titre.slice(coupure + 1).replace(" ", "\u00a0") : null;
  const activite = LIBELLES[c.metierPrincipal] ?? null;
  const style = { "--pe-teinte": teinteDe(c) } as React.CSSProperties;
  const lien = (href: string) => (apercu ? undefined : href);

  return (
    <div className={`pe${accueil ? " pe-avec-photo" : ""}${apercu ? " pe-apercu" : ""}`} style={style}>
      <SuiviDefilement />
      {apercu ? null : <RetourMonSite />}
      <EnTeteSite nom={c.nom} activite={activite} logo={c.logo} initiales={initiales(c.nom)} telephone={c.telephone} menu={menu} />

      <main id="contenu">
        <section id="accueil" className="pe-accueil" aria-labelledby="pe-titre">
          {accueil ? (
            <div className="pe-accueil-photo">
              <Photo photo={accueil} alt={`Chantier réalisé par ${c.nom}`} sizes="100vw" prioritaire />
            </div>
          ) : null}
          <div className="pe-cadre pe-accueil-texte">
            <p className="pe-accueil-nom">{c.nom}</p>
            <h1 id="pe-titre">
              {titreHaut}
              {titreBas ? (
                <>
                  {" "}
                  <span className="pe-accueil-ville">{titreBas}</span>
                </>
              ) : null}
            </h1>
            {c.accroche ? <p className="pe-accueil-accroche">{c.accroche}</p> : null}
            <div className="pe-actions">
              <a href="#contact" className="pe-btn pe-btn-appel">
                <Mail size={19} strokeWidth={2.2} aria-hidden="true" /> Demander un devis
              </a>
              {c.telephone ? (
                <a href={lienAppel(c.telephone)} className="pe-btn pe-btn-second">
                  <Phone size={19} strokeWidth={2.2} aria-hidden="true" /> {c.telephone}
                </a>
              ) : null}
            </div>
            {preuves.length ? (
              <ul className="pe-preuves" aria-label="Garanties">
                {preuves.map((x) => (
                  <li key={x}>
                    <BadgeCheck size={17} strokeWidth={2.2} aria-hidden="true" /> {x}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* Le niveau « pros » : rien pour un visiteur, rien dans l'aperçu ; une entreprise connectée le voit ici. */}
        {apercu ? null : <EntrePros adresse={c.adresse} />}

        {visibles.includes("prestations") ? (
          <section id="prestations" className="pe-section" aria-labelledby="pe-t-prestations">
            <div className="pe-cadre">
              <h2 id="pe-t-prestations">Nos prestations</h2>
              <ul className="pe-prestations">
                {c.prestations.map((x) => {
                  const Icone = iconeDePrestation(x.titre, c.metierPrincipal);
                  return (
                    <li key={x.titre}>
                      <Icone className="pe-prestation-icone" size={40} strokeWidth={1.7} aria-hidden="true" />
                      <div>
                        <h3>{x.titre}</h3>
                        {x.texte ? <p>{x.texte}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {visibles.includes("realisations") ? (
          <section id="realisations" className="pe-section pe-section-realisations" aria-labelledby="pe-t-realisations">
            <div className="pe-cadre">
              <ListeChantiers realisations={c.realisations} nom={c.nom} titre={<h2 id="pe-t-realisations">Nos réalisations</h2>} />
            </div>
          </section>
        ) : null}

        {visibles.includes("zone") || c.horaires ? (
          <section id="zone" className="pe-bande" aria-label="Zone d'intervention et horaires">
            <div className="pe-cadre pe-bande-grille">
              {c.zone || c.adressePostale ? (
                <div className="pe-bande-bloc">
                  <MapPin size={34} strokeWidth={2} aria-hidden="true" />
                  <div>
                    <h2 className="pe-bande-etiquette">Zone d&apos;intervention</h2>
                    {c.zone ? <p className="pe-bande-valeur">{c.zone} et alentours</p> : null}
                    {c.adressePostale ? <p className="pe-bande-detail">{c.adressePostale}</p> : null}
                  </div>
                </div>
              ) : null}
              {c.horaires ? (
                <div className="pe-bande-bloc">
                  <Clock size={34} strokeWidth={2} aria-hidden="true" />
                  <div>
                    <h2 className="pe-bande-etiquette">Horaires</h2>
                    <p className="pe-bande-valeur pe-bande-horaires">{c.horaires}</p>
                  </div>
                </div>
              ) : null}
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
            </div>
            <div className="pe-contact-form">
              <ContactPage adresse={c.adresse} nom={c.nom} apercu={apercu} />
            </div>
          </div>
        </section>
      </main>

      <footer className="pe-pied">
        <div className="pe-cadre pe-pied-grille">
          <div className="pe-pied-marque">
            {c.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logo} alt="" className="pe-logo" width={40} height={40} />
            ) : (
              <span className="pe-initiales" aria-hidden="true">
                {initiales(c.nom)}
              </span>
            )}
            <div>
              <p className="pe-pied-nom">{c.nom}</p>
              {activite ? <p className="pe-pied-activite">{activite}</p> : null}
              {c.siret ? <p>SIRET {c.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}</p> : null}
              {c.siteWeb ? (
                <p>
                  <a href={lien(c.siteWeb)} rel="noopener nofollow" target="_blank" className="pe-pied-site">
                    <Globe size={16} aria-hidden="true" /> Voir mon site
                  </a>
                </p>
              ) : null}
            </div>
          </div>
          <div className="pe-pied-liens">
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
                Certifications et assurances : déclarées par l&apos;entreprise, non vérifiées par Mobiiz. « Entreprise vérifiée » : SIRET actif contrôlé à l&apos;INSEE, ce n&apos;est pas un label de qualité.
              </p>
            </details>
            <span className="pe-pied-sep" aria-hidden="true">|</span>
            <a href={lien("/confidentialite")} className="pe-pied-lien">
              Politique de confidentialité
            </a>
            <span className="pe-pied-sep" aria-hidden="true">|</span>
            <SignalerPage adresse={c.adresse} apercu={apercu} />
          </div>
          <a href={lien("/")} className="pe-mobiiz">
            Créé avec <strong>MOBIIZ</strong> <Heart size={15} strokeWidth={0} fill="currentColor" className="pe-coeur" aria-hidden="true" />
          </a>
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
