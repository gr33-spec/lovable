import { BadgeCheck, CalendarDays, Check, Mail, Phone, ShieldCheck, Star } from "lucide-react";
import { lienAppel } from "@baticlair/domain/page-entreprise";
import { EnTeteSite, ListeChantiers, RetourMonSite, SuiviDefilement } from "./navigation";
import { iconeDePrestation } from "./icones";
import { Photo } from "./photo";
import { ContactPage } from "./interactions";
import { EntrePros } from "./entre-pros";
import { BarreAppel, PiedSite, initiales, preparerSite, type VuePageProps } from "./vue-page";
import "./modele-sobre.css";

/**
 * LE MODÈLE « SOBRE » (Greg, 27 novembre 2026, cahier 03 : « un deuxième modèle vraiment différent »). Les MÊMES données
 * que le modèle « Atelier », un autre habillage : fond clair partout, accueil en deux parties (le texte d'un côté, la
 * photo de l'autre dans un cadre haut), prestations en liste à filets (pas de cartes), une bande de la teinte pour la zone,
 * les horaires et les certifications, chantiers en mosaïque, contact sur fond clair. Rien n'est inventé : tout vient de
 * ce que l'artisan a écrit ou déclaré ; une rubrique vide ne s'affiche pas.
 */
export function ModeleSobre({ contenu: c, apercu = false, annee = new Date().getFullYear() }: VuePageProps) {
  const { visibles, menu, accueil, titreHaut, titreBas, activite, style, garanties, premierePhrase, suitePresentation, zone, confiance, lien } = preparerSite(c, apercu, annee);
  const presentation = [premierePhrase, suitePresentation].filter(Boolean).join(" ").trim();
  return (
    <div className={`pe pe-m-sobre${accueil ? " ps-avec-photo" : ""}${apercu ? " pe-apercu" : ""}`} data-modele="sobre" style={style}>
      <SuiviDefilement />
      {apercu ? null : <RetourMonSite />}
      <EnTeteSite nom={c.nom} activite={activite} logo={c.logo} initiales={initiales(c.nom)} telephone={c.telephone} menu={menu} />

      <main id="contenu">
        <section id="accueil" className="ps-accueil" aria-labelledby="pe-titre">
          <div className="pe-cadre ps-accueil-grille">
            <div className="ps-accueil-texte">
              <p className="ps-surtitre">
                {c.nom}
                {zone ? <span> · {zone}</span> : null}
              </p>
              <h1 id="pe-titre">
                {titreHaut}
                {titreBas ? (
                  <>
                    {" "}
                    <span className="ps-ville">{titreBas}</span>
                  </>
                ) : null}
              </h1>
              {c.accroche ? <p className="ps-accroche">{c.accroche}</p> : null}
              <div className="pe-actions ps-actions">
                <a href="#contact" className="pe-btn pe-btn-appel">
                  <Mail size={19} strokeWidth={2.2} aria-hidden="true" /> Demander un devis
                </a>
                {c.telephone ? (
                  <a href={lienAppel(c.telephone)} className="pe-btn ps-btn-contour">
                    <Phone size={19} strokeWidth={2.2} aria-hidden="true" /> {c.telephone}
                  </a>
                ) : null}
              </div>
              {c.lienGoogle ? (
                <a href={lien(c.lienGoogle)} rel="noopener nofollow" target="_blank" className="ps-lien">
                  <Star size={17} strokeWidth={2.2} aria-hidden="true" /> Voir nos avis Google
                </a>
              ) : null}
              {garanties.length ? (
                <ul className="ps-garanties" aria-label="Garanties">
                  {garanties.map(({ texte }) => (
                    <li key={texte}>
                      <Check size={18} strokeWidth={2.6} aria-hidden="true" />
                      {texte}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {accueil ? (
              <div className="ps-accueil-photo">
                <Photo photo={accueil} alt={accueil.id.startsWith("defaut:") ? "Photo d'illustration du métier" : `Chantier réalisé par ${c.nom}`} sizes="(min-width: 960px) 45vw, 100vw" prioritaire />
              </div>
            ) : null}
          </div>
        </section>

        {visibles.includes("prestations") ? (
          <section id="prestations" className="ps-section" aria-labelledby="pe-t-prestations">
            <div className="pe-cadre ps-deux-colonnes">
              <div className="ps-tete">
                <h2 id="pe-t-prestations">Nos prestations</h2>
                <p className="ps-sous-titre">Ce que {c.nom} réalise pour vous.</p>
              </div>
              <ul className="ps-prestations">
                {c.prestations.map((x) => {
                  const Icone = iconeDePrestation(x.titre, c.metierPrincipal);
                  return (
                    <li key={x.titre}>
                      <Icone className="ps-prestation-icone" size={28} strokeWidth={1.7} aria-hidden="true" />
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

        {confiance.length ? (
          <section id="zone" className="ps-bande" aria-label="Zone d'intervention, horaires et certifications">
            <ul className="pe-cadre ps-bande-liste">
              {confiance.map(({ etiquette, valeur, Icone }) => (
                <li key={etiquette + valeur}>
                  <Icone size={26} strokeWidth={1.7} aria-hidden="true" />
                  <span>
                    <span className="ps-bande-etiquette">{etiquette}</span>
                    <span className="ps-bande-valeur">{valeur}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {apercu ? null : <EntrePros adresse={c.adresse} />}

        {visibles.includes("realisations") ? (
          <section id="realisations" className="ps-section ps-realisations" aria-labelledby="pe-t-realisations">
            <div className="pe-cadre">
              <ListeChantiers realisations={c.realisations} nom={c.nom} titre={<h2 id="pe-t-realisations">Nos réalisations</h2>} />
            </div>
          </section>
        ) : null}

        {visibles.includes("a-propos") ? (
          <section id="a-propos" className="ps-section ps-apropos" aria-labelledby="pe-t-apropos">
            <div className="pe-cadre ps-apropos-grille">
              {c.photoEquipe ? (
                <div className="ps-apropos-photo">
                  <Photo photo={c.photoEquipe} alt={`L'équipe de ${c.nom}`} sizes="(min-width: 960px) 30vw, 100vw" />
                </div>
              ) : null}
              <div>
                <h2 id="pe-t-apropos">À propos</h2>
                {presentation
                  ? presentation.split(/\n{2,}/).map((para, i) => (
                      <p key={i} className="ps-texte">
                        {para}
                      </p>
                    ))
                  : null}
                {c.verifiee || c.certifications.length || c.creeeEn ? (
                  <ul className="ps-qualifs">
                    {c.verifiee ? (
                      <li>
                        <BadgeCheck size={19} aria-hidden="true" /> Entreprise vérifiée
                      </li>
                    ) : null}
                    {c.certifications.map((x) => (
                      <li key={x}>
                        <ShieldCheck size={19} aria-hidden="true" /> {x}
                      </li>
                    ))}
                    {c.creeeEn ? (
                      <li>
                        <CalendarDays size={19} aria-hidden="true" /> Depuis {c.creeeEn}
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                {c.certifications.length ? <p className="pe-note">Certifications et assurances déclarées par l&apos;entreprise.</p> : null}
              </div>
            </div>
          </section>
        ) : null}

        <section id="contact" className="ps-contact" aria-labelledby="pe-t-contact">
          <div className="pe-cadre ps-contact-grille">
            <div>
              <h2 id="pe-t-contact">Parlons de votre projet</h2>
              <p className="ps-sous-titre">{c.nom} vous répond directement.</p>
              {c.telephone ? (
                <a href={lienAppel(c.telephone)} className="ps-telephone">
                  <Phone size={22} strokeWidth={2.2} aria-hidden="true" /> {c.telephone}
                </a>
              ) : null}
            </div>
            <div className="ps-contact-carte">
              <ContactPage adresse={c.adresse} nom={c.nom} apercu={apercu} />
            </div>
          </div>
        </section>
      </main>

      <PiedSite c={c} activite={activite} zone={zone} lien={lien} apercu={apercu} />
      <BarreAppel telephone={c.telephone} />
    </div>
  );
}
