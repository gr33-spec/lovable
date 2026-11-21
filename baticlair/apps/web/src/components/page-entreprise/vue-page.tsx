import { ArrowRight, Award, BadgeCheck, CalendarDays, Car, Clock, FileCheck, Globe, Heart, Leaf, Mail, MapPin, Phone, ShieldCheck, Star, Zap, type LucideIcon } from "lucide-react";
import {
  lienAppel,
  menuDeLaPage,
  photoAccueil,
  preuvesCourtes,
  rubriquesVisibles,
  couleurBoutonsDe,
  couleurSurSombre,
  melange,
  teinteDe,
  texteSurCouleur,
  titreAccueil,
  villeDeLaZone,
  decouperPresentation,
  zoneLisible,
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
 * ivoire et typographie de la landing de Mobiiz ; les boutons de la couleur choisie (jaune Mobiiz par défaut) ; la teinte
 * de l'artisan pour les fonds sombres. Aucune rubrique vide, ni dans la page ni dans le menu. Mise en page par requêtes de CONTENEUR :
 * l'aperçu de l'éditeur se dessine comme un vrai téléphone, même sur un ordinateur.
 */
/** L'icône d'une garantie, d'après ses mots (jamais un label inventé). */
/** Les engagements cochés par l'artisan (Greg, 18 novembre 2026) : une icône chacun. */
const ICONES_ENGAGEMENT: Record<string, LucideIcon> = { "Devis gratuit": FileCheck, "Déplacement gratuit": Car, "Intervention rapide": Zap };

function iconeDePreuve(texte: string): LucideIcon {
  if (/v[ée]rifi/i.test(texte)) return BadgeCheck;
  if (/d[ée]cennale|assurance|garantie/i.test(texte)) return ShieldCheck;
  if (/rge|[ée]co|environnement/i.test(texte)) return Leaf;
  if (/ans d'exp|depuis \d{4}/i.test(texte)) return CalendarDays;
  return Award;
}

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
  // La couleur des boutons choisie par l'artisan (jaune Mobiiz par défaut) : boutons, traits, icônes, ville du titre.
  const bouton = couleurBoutonsDe(c.couleurBoutons).hex;
  const style = {
    "--pe-teinte": teinteDe(c),
    "--jaune": bouton,
    "--jaune2": melange(bouton, "#FFFFFF", 0.18),
    "--sur-jaune": texteSurCouleur(bouton),
    "--jaune-sombre": couleurSurSombre(bouton),
  } as React.CSSProperties;
  const ville = villeDeLaZone(c.zone);
  // Le bandeau de garanties de l'accueil : seulement du vrai (preuves déclarées ou vérifiées, la zone écrite).
  // Les engagements COCHÉS par l'artisan d'abord (Greg, 18 novembre 2026), puis les preuves ; jamais un texte de Mobiiz.
  const garanties: { texte: string; Icone: LucideIcon }[] = [
    ...(c.engagements ?? []).map((x) => ({ texte: x, Icone: ICONES_ENGAGEMENT[x] ?? Award })),
    ...preuves.map((x) => ({ texte: x, Icone: iconeDePreuve(x) })),
  ];
  if (garanties.length < 3 && ville) garanties.push({ texte: `${ville} et alentours`, Icone: MapPin });
  // La présentation n'apparaît jamais deux fois (Greg, 17 novembre 2026) : la première phrase dans la carte, la suite
  // dans « À propos » ; une seule phrase, pas de carte.
  const { carte: premierePhrase, suite: suitePresentation } = decouperPresentation(c.presentation);
  const zone = zoneLisible(c.zone);
  // La barre de confiance sous les prestations : la zone, les horaires et les certifications déclarées (quatre au plus).
  const confiance: { etiquette: string; valeur: string; Icone: LucideIcon }[] = [];
  // Spécialiste UI/UX (19 novembre 2026) : la zone telle que l'artisan l'a écrite, sans « et alentours » ajouté ; une
  // certification déjà dans le bandeau n'est pas redite ; une assurance n'est pas une certification ; l'expérience n'est
  // pas dite deux fois (« 18 ans d'expérience » et « Depuis 2008 »).
  if (zone) confiance.push({ etiquette: "Zone d'intervention", valeur: zone, Icone: MapPin });
  // « 8 h à 18 h » : jamais un « h » seul en début de ligne.
  if (c.horaires) confiance.push({ etiquette: "Horaires", valeur: c.horaires.replace(/(\d) (h|H)\b/g, "$1\u00a0$2"), Icone: Clock });
  const dansLeBandeau = new Set(garanties.map((g) => g.texte.toLowerCase()));
  for (const x of c.certifications) if (confiance.length < 4 && !dansLeBandeau.has(x.toLowerCase())) confiance.push({ etiquette: /assurance|d[ée]cennale/i.test(x) ? "Assurance déclarée" : "Certification déclarée", valeur: x, Icone: iconeDePreuve(x) });
  if (confiance.length < 4 && c.creeeEn && !garanties.some((g) => /ans d'exp/i.test(g.texte))) confiance.push({ etiquette: "Expérience", valeur: `Depuis ${c.creeeEn}`, Icone: CalendarDays });
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
              <Photo photo={accueil} alt={accueil.id.startsWith("defaut:") ? "Photo d'illustration du métier" : `Chantier réalisé par ${c.nom}`} sizes="100vw" prioritaire />
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
            {c.lienGoogle ? (
              <a href={lien(c.lienGoogle)} rel="noopener nofollow" target="_blank" className="pe-lien-google">
                <Star size={17} strokeWidth={2.2} aria-hidden="true" /> Voir nos avis Google
              </a>
            ) : null}
            {garanties.length ? (
              <ul className="pe-preuves" aria-label="Garanties" lang="fr" style={{ "--pe-preuves": Math.min(garanties.length, 3) } as React.CSSProperties}>
                {garanties.map(({ texte, Icone }) => (
                  <li key={texte}>
                    <span className="pe-preuve-icone" aria-hidden="true">
                      <Icone size={20} strokeWidth={2} />
                    </span>
                    {texte}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {visibles.includes("prestations") ? (
          <section id="prestations" className="pe-section pe-section-prestations" aria-labelledby="pe-t-prestations">
            <div className="pe-cadre pe-prestations-grille">
              <div className="pe-prestations-tete">
                <h2 id="pe-t-prestations">Nos prestations</h2>
                <p className="pe-sous-titre">Ce que {c.nom} réalise pour vous{ville ? `, à ${ville} et alentours` : ""}.</p>
              </div>
              <ul className="pe-prestations">
                {c.prestations.map((x) => {
                  const Icone = iconeDePrestation(x.titre, c.metierPrincipal);
                  return (
                    <li key={x.titre}>
                      <Icone className="pe-prestation-icone" size={34} strokeWidth={1.6} aria-hidden="true" />
                      <div>
                        <h3>{x.titre}</h3>
                        {x.texte ? <p className="pe-prestation-texte">{x.texte}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {premierePhrase && visibles.includes("a-propos") ? (
                <a href={lien("#a-propos")} className={`pe-carte-apropos${c.photoEquipe ?? accueil ? " pe-carte-apropos-photo" : ""}`}>
                  {c.photoEquipe ?? accueil ? (
                    <span className="pe-carte-apropos-image" aria-hidden="true">
                      <Photo photo={(c.photoEquipe ?? accueil)!} alt="" sizes="(min-width: 960px) 30vw, 100vw" />
                    </span>
                  ) : null}
                  <span className="pe-carte-apropos-texte">
                    <span className="pe-carte-apropos-titre">{c.nom}</span>
                    <span className="pe-carte-apropos-phrase">{premierePhrase}</span>
                    <span className="pe-carte-apropos-lien">
                      En savoir plus <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
                    </span>
                  </span>
                </a>
              ) : null}
            </div>
            {confiance.length ? (
              <div className="pe-cadre">
                <ul id="zone" className="pe-confiance" aria-label="Zone d'intervention, horaires et certifications">
                  {confiance.map(({ etiquette, valeur, Icone }) => (
                    <li key={etiquette + valeur}>
                      <Icone size={30} strokeWidth={1.6} aria-hidden="true" />
                      <span>
                        <span className="pe-confiance-etiquette">{etiquette}</span>
                        <span className="pe-confiance-valeur">{valeur}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : confiance.length ? (
          <section id="zone" className="pe-section pe-section-confiance" aria-label="Zone d'intervention et horaires">
            <div className="pe-cadre">
              <ul className="pe-confiance">
                {confiance.map(({ etiquette, valeur, Icone }) => (
                  <li key={etiquette + valeur}>
                    <Icone size={30} strokeWidth={1.6} aria-hidden="true" />
                    <span>
                      <span className="pe-confiance-etiquette">{etiquette}</span>
                      <span className="pe-confiance-valeur">{valeur}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Le niveau « pros » : rien pour un visiteur, rien dans l'aperçu ; une entreprise connectée le voit ici, après les
            prestations (spécialiste UI/UX, 19 novembre 2026 : avant, il passait devant elles). */}
        {apercu ? null : <EntrePros adresse={c.adresse} />}

        {visibles.includes("realisations") ? (
          <section id="realisations" className="pe-section pe-section-realisations" aria-labelledby="pe-t-realisations">
            <div className="pe-cadre">
              <ListeChantiers realisations={c.realisations} nom={c.nom} titre={<h2 id="pe-t-realisations">Nos réalisations</h2>} />
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
                  {suitePresentation
                    ? suitePresentation.split(/\n{2,}/).map((para, i) => (
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
              <p className="pe-contact-intro">{c.nom} vous répond directement.</p>
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
                {c.adressePostale ? `Adresse : ${c.adressePostale}. ` : zone ? `Zone : ${zone}. ` : ""}Contact : le formulaire de cette page{c.telephone ? ` ou le ${c.telephone}` : ""}. Responsable de la publication : le représentant légal de {c.nom}.
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
          {c.creditPhoto ? <p className="pe-credit-photo">Photo d&apos;accueil : {c.creditPhoto}</p> : null}
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
