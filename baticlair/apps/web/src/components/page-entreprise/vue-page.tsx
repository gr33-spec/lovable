import { BadgeCheck, CalendarDays, Clock, Globe, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import {
  ambianceDe,
  lienAppel,
  ordreDesRubriques,
  rubriquesVisibles,
  sousTitre,
  type ContenuPage,
  type PhotoPublique,
  type Rubrique,
} from "@baticlair/domain/page-entreprise";
import { EDITEUR, HEBERGEUR } from "@/lib/legal";
import { TRADES } from "@/lib/trades";
import { ContactPage, SignalerPage } from "./interactions";
import { ICONES, motifCss, VisuelMetier } from "./decor";
import "./page-entreprise.css";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : LA page publique d'une entreprise, en trois architectures (« Plein écran
 * photo », « Classique en colonnes », « Sobre et direct ») ; la même vue sert la page publique (rendue par le serveur) et
 * l'aperçu en direct de l'éditeur. Aucune rubrique vide (`rubriquesVisibles`), un bouton « Appeler » toujours visible sur
 * téléphone, les couleurs de l'artisan avec un contraste toujours lisible (`paletteDeLaPage`). Mise en page par requêtes
 * de CONTENEUR : l'aperçu d'un téléphone dans l'éditeur se dessine comme un vrai téléphone, même sur un ordinateur.
 */
export const LIBELLES: Record<string, string> = Object.fromEntries(TRADES.map((t) => [t.id, t.label]));

const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter((m) => /^[A-Za-zÀ-ÿ0-9]/.test(m) && !/^(et|de|du|des|la|le|les|sarl|sas|eurl|sasu)$/i.test(m))
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("") || "•";

function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00Z`));
}

/** Une photo en AVIF puis WebP, à la bonne taille pour l'écran, chargée seulement quand elle approche. */
export function Photo({ photo, alt, sizes, prioritaire = false, className = "" }: { photo: PhotoPublique; alt: string; sizes: string; prioritaire?: boolean; className?: string }) {
  const v = photo.variantes;
  if (!v.length) return null;
  const moyenne = v[Math.min(1, v.length - 1)]!;
  return (
    <picture>
      <source type="image/avif" srcSet={v.map((x) => `${x.avif} ${x.largeur}w`).join(", ")} sizes={sizes} />
      <source type="image/webp" srcSet={v.map((x) => `${x.webp} ${x.largeur}w`).join(", ")} sizes={sizes} />
      <img
        src={moyenne.webp}
        alt={alt}
        width={photo.largeur || undefined}
        height={photo.hauteur || undefined}
        loading={prioritaire ? "eager" : "lazy"}
        decoding={prioritaire ? "sync" : "async"}
        {...(prioritaire ? { fetchPriority: "high" as const } : {})}
        className={className}
      />
    </picture>
  );
}

export interface VuePageProps {
  contenu: ContenuPage;
  /** Dans l'éditeur : pas de formulaire actif, pas de signalement, la barre d'appel reste dans le cadre. */
  apercu?: boolean;
  /** L'adresse absolue de la page (pied de page, partage). */
  url?: string;
}

export function VuePage({ contenu: c, apercu = false }: VuePageProps) {
  const { palette: p, visuel, picto } = ambianceDe(c);
  const Icone = ICONES[picto];
  const visibles = rubriquesVisibles(c);
  const ordre = ordreDesRubriques(c.modele, visibles).filter((r) => r !== "contact");
  const style = {
    "--pe-page": p.page,
    "--pe-surface": p.surface,
    "--pe-texte": p.texte,
    "--pe-doux": p.texteDoux,
    "--pe-bordure": p.bordure,
    "--pe-princ": p.principale,
    "--pe-sur-princ": p.surPrincipale,
    "--pe-bouton": p.bouton,
    "--pe-accent": p.accent,
    "--pe-voile": p.voile,
    ...(c.motif ? { "--pe-motif": motifCss(picto, p.fond === "sombre" ? "#ffffff" : p.principale, p.fond === "sombre" ? 0.05 : 0.08) } : {}),
  } as React.CSSProperties;
  const titre = sousTitre(c);
  const metiers = c.metiers.map((m) => LIBELLES[m] ?? m);

  const logo = c.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.logo} alt={`Logo de ${c.nom}`} className="pe-logo-img" width={96} height={96} />
  ) : (
    <span className="pe-initiales" aria-hidden="true">
      {initiales(c.nom)}
    </span>
  );
  const couverture = c.couverture ? (
    <Photo photo={c.couverture} alt={`Chantier réalisé par ${c.nom}`} sizes="100vw" prioritaire className="pe-couv-img" />
  ) : (
    <VisuelMetier visuel={visuel} couleur={p.principale} className="pe-couv-img" />
  );
  const boutons = (
    <div className="pe-actions">
      {c.telephone ? (
        <a href={lienAppel(c.telephone)} className="pe-btn pe-btn-plein">
          <Phone size={18} aria-hidden="true" /> Appeler {c.modele === "sobre" ? c.telephone : null}
        </a>
      ) : null}
      <a href="#contact" className={`pe-btn ${c.telephone ? "pe-btn-contour" : "pe-btn-plein"}`}>
        <MessageCircle size={18} aria-hidden="true" /> Demander un devis
      </a>
    </div>
  );
  const verifie = c.verifiee ? (
    <span className="pe-pastille pe-pastille-verif">
      <BadgeCheck size={16} aria-hidden="true" /> Entreprise vérifiée
    </span>
  ) : null;

  const rubrique = (r: Rubrique) => {
    switch (r) {
      case "preuves":
        return (
          <section key={r} className="pe-section pe-preuves" aria-label="Garanties et preuves">
            <ul className="pe-preuves-liste">
              {c.verifiee ? (
                <li>
                  <BadgeCheck size={18} aria-hidden="true" /> Entreprise vérifiée (SIRET)
                </li>
              ) : null}
              {c.certifications.map((x) => (
                <li key={x}>
                  <ShieldCheck size={18} aria-hidden="true" /> {x}
                </li>
              ))}
              {c.creeeEn ? (
                <li>
                  <CalendarDays size={18} aria-hidden="true" /> Depuis {c.creeeEn}
                </li>
              ) : null}
            </ul>
            {c.certifications.length ? <p className="pe-note">Certifications et assurances déclarées par l&apos;entreprise, non vérifiées par Mobiiz.</p> : null}
            {c.verifiee ? <p className="pe-note">« Entreprise vérifiée » : SIRET actif contrôlé à l&apos;INSEE. Ce n&apos;est pas un label de qualité.</p> : null}
          </section>
        );
      case "presentation":
        return (
          <section key={r} className="pe-section" aria-labelledby="pe-t-presentation">
            <h2 id="pe-t-presentation">Qui sommes-nous</h2>
            {c.presentation!.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="pe-texte">
                {para}
              </p>
            ))}
          </section>
        );
      case "metiers":
        return (
          <section key={r} className="pe-section" aria-labelledby="pe-t-metiers">
            <h2 id="pe-t-metiers">Nos métiers</h2>
            <ul className="pe-metiers">
              {metiers.map((m) => (
                <li key={m}>
                  {c.pictos ? (
                    <span className="pe-picto" aria-hidden="true">
                      <Icone size={18} />
                    </span>
                  ) : null}
                  {m}
                </li>
              ))}
            </ul>
          </section>
        );
      case "zone":
        return (
          <section key={r} className="pe-section" aria-labelledby="pe-t-zone">
            <h2 id="pe-t-zone">Zone d&apos;intervention</h2>
            {c.zone ? (
              <p className="pe-ligne">
                <MapPin size={18} aria-hidden="true" /> {c.zone} et alentours
              </p>
            ) : null}
            {c.adressePostale ? <p className="pe-ligne pe-doux">{c.adressePostale}</p> : null}
          </section>
        );
      case "horaires":
        return (
          <section key={r} className="pe-section" aria-labelledby="pe-t-horaires">
            <h2 id="pe-t-horaires">Horaires</h2>
            <p className="pe-ligne">
              <Clock size={18} aria-hidden="true" /> {c.horaires}
            </p>
          </section>
        );
      case "galerie":
        return (
          <section key={r} className="pe-section pe-galerie-section" aria-labelledby="pe-t-galerie">
            <h2 id="pe-t-galerie">Nos réalisations</h2>
            <ul className="pe-galerie">
              {c.photos.map((ph) => (
                <li key={ph.id}>
                  <figure>
                    <Photo photo={ph} alt={ph.legende ?? `Réalisation de ${c.nom}`} sizes="(max-width: 700px) 50vw, 400px" />
                    {ph.legende ? <figcaption>{ph.legende}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        );
      case "missions":
        return (
          <section key={r} className="pe-section pe-missions" aria-labelledby="pe-t-missions">
            <h2 id="pe-t-missions">Disponible pour des missions</h2>
            <p className="pe-texte">
              {c.missions!.disponibleDu ? `Disponible du ${dateCourte(c.missions!.disponibleDu)}${c.missions!.disponibleAu ? ` au ${dateCourte(c.missions!.disponibleAu)}` : ""}.` : "Disponible pour renforcer vos équipes."} Entre entreprises, sur Mobiiz.
            </p>
            <a href={apercu ? undefined : c.missions!.lien} className="pe-btn pe-btn-contour">
              Proposer une mission
            </a>
          </section>
        );
      default:
        return null;
    }
  };

  const infosCourtes = (
    <ul className="pe-infos">
      {c.zone ? (
        <li>
          <MapPin size={16} aria-hidden="true" /> {c.zone}
        </li>
      ) : null}
      {c.horaires ? (
        <li>
          <Clock size={16} aria-hidden="true" /> {c.horaires}
        </li>
      ) : null}
      {c.telephone ? (
        <li>
          <Phone size={16} aria-hidden="true" /> <a href={lienAppel(c.telephone)}>{c.telephone}</a>
        </li>
      ) : null}
      {c.siteWeb ? (
        <li>
          <Globe size={16} aria-hidden="true" />{" "}
          <a href={apercu ? undefined : c.siteWeb} rel="noopener nofollow" target="_blank">
            Voir mon site
          </a>
        </li>
      ) : null}
    </ul>
  );

  return (
    <div className={`pe pe-${c.modele} pe-fond-${p.fond}${apercu ? " pe-apercu" : ""}`} style={style}>
      <header className="pe-entete">
        <div className="pe-marque">
          <span className="pe-logo">{logo}</span>
          <span className="pe-entete-nom">{c.nom}</span>
        </div>
        {c.telephone ? (
          <a href={lienAppel(c.telephone)} className="pe-btn pe-btn-plein pe-entete-appel">
            <Phone size={16} aria-hidden="true" /> {c.telephone}
          </a>
        ) : null}
      </header>

      <main id="contenu">
        {c.modele === "photo" ? (
          <div className="pe-hero">
            <div className="pe-couv">{couverture}</div>
            <div className="pe-hero-voile" />
            <div className="pe-hero-texte">
              {verifie}
              <h1>{c.nom}</h1>
              <p className="pe-accroche">{titre}</p>
              {metiers.length ? <p className="pe-hero-metiers">{metiers.join(" · ")}</p> : null}
              {boutons}
            </div>
          </div>
        ) : c.modele === "colonnes" ? (
          <div className="pe-bandeau">
            <div className="pe-bandeau-logo">{logo}</div>
            <div>
              {verifie}
              <h1>{c.nom}</h1>
              <p className="pe-accroche">{titre}</p>
            </div>
          </div>
        ) : (
          <div className="pe-sobre-tete">
            <div className="pe-sobre-ligne">
              <span className="pe-logo pe-logo-grand">{logo}</span>
              {verifie}
            </div>
            <h1>{c.nom}</h1>
            <p className="pe-accroche">{titre}</p>
            {boutons}
            <div className="pe-sobre-couv">{couverture}</div>
          </div>
        )}

        {c.modele === "colonnes" ? (
          <div className="pe-grille">
            <aside className="pe-carte-infos">
              <div className="pe-couv pe-couv-carte">{couverture}</div>
              {infosCourtes}
              {boutons}
            </aside>
            <div className="pe-colonne-principale">{ordre.map(rubrique)}</div>
          </div>
        ) : (
          <div className="pe-corps">
            {c.modele === "photo" && (c.zone || c.horaires || c.siteWeb) ? <div className="pe-section pe-section-infos">{infosCourtes}</div> : null}
            {c.modele === "sobre" && c.siteWeb ? <div className="pe-section pe-section-infos">{infosCourtes}</div> : null}
            {ordre.map(rubrique)}
          </div>
        )}

        <section id="contact" className="pe-section pe-contact" aria-labelledby="pe-t-contact">
          <h2 id="pe-t-contact">Demander un devis</h2>
          <p className="pe-doux">Décrivez votre projet : {c.nom} vous répond directement.</p>
          <ContactPage adresse={c.adresse} nom={c.nom} apercu={apercu} />
        </section>
      </main>

      <footer className="pe-pied">
        <p>
          <a href={apercu ? undefined : "/"} className="pe-membre">
            Membre Mobiiz
          </a>
        </p>
        <SignalerPage adresse={c.adresse} apercu={apercu} />
        <details className="pe-mentions">
          <summary>Mentions légales</summary>
          <p>
            Page éditée par {c.nom}
            {c.siret ? ` (SIRET ${c.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")})` : ""}, responsable de son contenu, de ses photos et des informations déclarées.{" "}
            {c.adressePostale ? `Adresse : ${c.adressePostale}. ` : c.zone ? `Zone : ${c.zone}. ` : ""}Contact : le formulaire ci-dessus{c.telephone ? ` ou le ${c.telephone}` : ""}. Responsable de la publication : le représentant légal de {c.nom}.
          </p>
          <p>
            Hébergement : {EDITEUR.nom} ({EDITEUR.produit}), {EDITEUR.forme}, {EDITEUR.adresse}, {EDITEUR.contact} ; serveurs {HEBERGEUR.nom}, {HEBERGEUR.adresse}.
          </p>
          <p>
            Certifications et assurances : déclarées par l&apos;entreprise, non vérifiées par Mobiiz. « Entreprise vérifiée » : SIRET actif contrôlé à l&apos;INSEE, ce n&apos;est pas un label de qualité. Données personnelles :{" "}
            <a href={apercu ? undefined : "/confidentialite"}>politique de confidentialité</a> · <a href={apercu ? undefined : "/mentions-legales"}>mentions légales de Mobiiz</a>.
          </p>
        </details>
      </footer>

      {c.telephone ? (
        <nav className="pe-barre-appel" aria-label="Contacter l'entreprise">
          <a href={lienAppel(c.telephone)} className="pe-btn pe-btn-plein">
            <Phone size={18} aria-hidden="true" /> Appeler
          </a>
          <a href="#contact" className="pe-btn pe-btn-contour">
            <MessageCircle size={18} aria-hidden="true" /> Écrire
          </a>
        </nav>
      ) : null}
    </div>
  );
}
