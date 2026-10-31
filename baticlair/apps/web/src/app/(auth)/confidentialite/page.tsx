import type { Metadata } from "next";
import Link from "next/link";
import { styleLegal as s } from "@/components/legal-style";
import { PageTitle } from "@/components/ui";
import { EDITEUR, HEBERGEUR_BASE } from "@/lib/legal";
import { NOM_APP, nom } from "@/lib/nom";

export const metadata: Metadata = { title: `Confidentialité — ${NOM_APP}` };

/** La version de cette page (une date, comme les CGU). */
const VERSION = "26/10/2026";

/**
 * La politique de confidentialité (RGPD, Greg, 24 octobre 2026) : en tableau, chaque traitement avec ses données, sa base
 * légale et sa durée ; les durées sont celles de `docs/groupe/RGPD-REGISTRE.md`, appliquées chaque nuit par la purge
 * (`apps/api/.../privacy/application/purges.ts`). Les sous-traitants sont ceux de `docs/groupe/RGPD-SOUS-TRAITANTS.md`.
 */
const TRAITEMENTS: readonly { finalite: string; donnees: string; base: string; duree: string }[] = [
  {
    finalite: "Ton compte artisan et le service (listes, devis, demandes de prix)",
    donnees: "Nom, e-mail, mot de passe chiffré, entreprise, SIRET, adresse, téléphone, chantiers, listes, devis déposés (anonymisés), fournisseurs",
    base: "Contrat (les CGU)",
    duree: "Tant que le compte vit, puis 3 ans après la dernière connexion",
  },
  {
    finalite: "Le fichier d'origine d'un devis client",
    donnees: "Le PDF ou la photo déposés",
    base: "Contrat",
    duree: "30 jours ; seul le texte anonymisé reste ensuite",
  },
  {
    finalite: `Les listes et les devis du ${nom}`,
    donnees: "Lignes de matériaux, quantités, commune de livraison, grilles de prix des négoces",
    base: "Contrat",
    duree: "Tant que le compte vit (Greg, 26 octobre 2026 : devis et e-mails, durée du compte)",
  },
  {
    finalite: "Les e-mails reçus sur contact@mobiiz.fr et sur l'adresse Mobiiz de ton entreprise (réponses des négoces, pièces jointes)",
    donnees: "Expéditeur, destinataire, objet, texte, pièces jointes",
    base: "Contrat (les CGU) ; intérêt légitime pour contact@ (te répondre)",
    duree: "Tant que le compte vit ; contact@ : renvoyé à l'équipe, pas gardé dans l'application",
  },
  {
    finalite: "Les statistiques anonymes de prix (« prix observés dans ton secteur »)",
    donnees: "Moyennes arrondies par article et par département, sans nom ni identifiant ; publiées seulement au-delà de 5 entreprises ou 2 regroupements",
    base: "Intérêt légitime (informer le secteur), données anonymes",
    duree: "Sans limite : ce ne sont plus des données personnelles",
  },
  {
    finalite: "Les comptes des négoces inscrits",
    donnees: "Enseigne, e-mail, téléphone, SIRET, dépôts, conditions de livraison, acceptation des conditions",
    base: "Contrat (les conditions négoces)",
    duree: "Tant que le compte vit, puis 3 ans après la dernière connexion",
  },
  {
    finalite: "Les négoces invités par un artisan, pas encore inscrits",
    donnees: "Nom du négoce, e-mail donné par l'artisan, département",
    base: "Intérêt légitime (faire chiffrer la commande de l'artisan)",
    duree: "3 relances au plus, puis effacé ; 12 mois au plus",
  },
  {
    finalite: "Les bons de commande passés",
    donnees: "Négoce, montant, date ; sans le nom de l'artisan une fois son compte supprimé",
    base: "Obligation légale (conservation des documents commerciaux)",
    duree: "10 ans",
  },
  {
    finalite: "L'abonnement et ses factures",
    donnees: "Raison sociale, SIRET, adresse, n° de TVA, montants, dates de paiement ; jamais le numéro de carte (gardé par Stripe seul)",
    base: "Contrat (les CGU) et obligation légale (comptabilité)",
    duree: "Factures : 10 ans, même après la suppression du compte",
  },
  {
    finalite: "La preuve de ton accord aux CGU ou aux conditions négoces",
    donnees: "Version, date, e-mail chiffré (empreinte)",
    base: "Intérêt légitime (prouver l'accord)",
    duree: "5 ans après la fin du compte",
  },
  {
    finalite: "Les e-mails envoyés et les journaux techniques",
    donnees: "Destinataire, objet, date, erreurs, adresse IP des connexions à l'admin",
    base: "Intérêt légitime (sécurité, preuve d'envoi)",
    duree: "1 an",
  },
  {
    finalite: "La liste d'exclusion (« ne plus jamais être contacté »)",
    donnees: "Empreinte de l'e-mail et du SIRET, jamais en clair",
    base: "Obligation légale (respecter ton opposition)",
    duree: "Tant que l'opposition vaut",
  },
];

const SOUS_TRAITANTS: readonly { nom: string; role: string; pays: string; garantie: string }[] = [
  { nom: "Vercel Inc.", role: "Hébergement du site et de l'application", pays: "Serveurs à Francfort (UE) ; société aux États-Unis", garantie: "Clauses contractuelles types, Data Privacy Framework" },
  { nom: HEBERGEUR_BASE.nom, role: "Base de données", pays: "Serveurs à Francfort (UE) ; société aux États-Unis", garantie: "Clauses contractuelles types" },
  { nom: "Anthropic", role: "Lecture des listes et des devis par l'IA (texte anonymisé)", pays: "États-Unis", garantie: "Clauses contractuelles types ; API commerciale : aucune donnée utilisée pour entraîner les modèles" },
  { nom: "Stripe", role: "Paiement de l'abonnement (carte bancaire, prélèvements, portail client)", pays: "Irlande (UE) ; société mère aux États-Unis", garantie: "Clauses contractuelles types, Data Privacy Framework" },
  { nom: "Resend", role: "Envoi des e-mails, et réception des e-mails écrits à contact@mobiiz.fr", pays: "Serveurs en Irlande (UE) ; société aux États-Unis", garantie: "Clauses contractuelles types, Data Privacy Framework" },
  { nom: "Cloudflare (Turnstile)", role: "Vérification anti-robots à l'inscription et sur les pages négoce, quand elle est activée (adresse IP et signaux du navigateur, sans cookie publicitaire)", pays: "UE et États-Unis", garantie: "Clauses contractuelles types, Data Privacy Framework" },
  { nom: "API Sirene de l'INSEE", role: "Vérification du SIRET (le numéro seul)", pays: "France", garantie: "Service public, aucun transfert" },
  { nom: "API Adresse de l'État", role: "Distance de livraison (adresses du chantier et du dépôt)", pays: "France", garantie: "Service public, aucun transfert" },
  { nom: "Apple, Google", role: "Notifications sur ton téléphone, si tu les actives", pays: "UE et États-Unis", garantie: "Message transmis, jamais gardé" },
];

const cellule = "border-t border-line px-2 py-2 align-top text-[14px] leading-snug";
const entete = "px-2 py-2 text-left text-[12px] font-semibold tracking-[0.04em] text-muted uppercase";

export default function ConfidentialitePage() {
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Confidentialité</PageTitle>
      <p className="text-sm text-muted">Version du {VERSION}.</p>
      <p className={s.p}>
        {NOM_APP} lit tes listes de matériaux et tes devis pour en sortir la liste des fournitures à chiffrer, et regroupe les besoins de plusieurs artisans pour
        obtenir un meilleur prix auprès des négoces. Voici ce que nous gardons, pourquoi, combien de temps, chez qui, et comment le récupérer ou l&apos;effacer.
        Pas de publicité, pas de revente, pas de pistage d&apos;un site à l&apos;autre.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Responsable du traitement</h2>
        <p className={s.p}>
          {EDITEUR.nom}, {EDITEUR.forme}, {EDITEUR.adresse}, SIREN {EDITEUR.siren}. Contact : {EDITEUR.contact}. {EDITEUR.nom} n&apos;a pas de délégué à la protection
          des données (il n&apos;est pas obligatoire pour cette activité) : le fondateur répond lui-même.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Ce que nous gardons, pourquoi et combien de temps</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <caption className="sr-only">Les traitements : finalité, données, base légale, durée</caption>
            <thead>
              <tr>
                <th scope="col" className={entete}>Pourquoi</th>
                <th scope="col" className={entete}>Données</th>
                <th scope="col" className={entete}>Base légale</th>
                <th scope="col" className={entete}>Durée</th>
              </tr>
            </thead>
            <tbody>
              {TRAITEMENTS.map((t) => (
                <tr key={t.finalite}>
                  <th scope="row" className={`${cellule} text-left font-semibold`}>{t.finalite}</th>
                  <td className={cellule}>{t.donnees}</td>
                  <td className={cellule}>{t.base}</td>
                  <td className={cellule}>{t.duree}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.p}>
          Avant d&apos;être gardé et lu par l&apos;IA, un devis client est anonymisé : le nom, le téléphone, l&apos;e-mail et la rue du client sont retirés, la commune
          reste. Ces durées sont appliquées chaque nuit, automatiquement.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Qui reçoit les données</h2>
        <p className={s.p}>
          Toi, et les négoces de le {nom} pour ce qu&apos;il faut chiffrer et livrer (lignes, quantités, commune ; ton nom seulement quand tu passes commande).
          Un négoce ne voit jamais les prix d&apos;un autre. Et nos sous-traitants, chacun pour sa seule tâche :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <caption className="sr-only">Les sous-traitants : rôle, pays, garantie du transfert</caption>
            <thead>
              <tr>
                <th scope="col" className={entete}>Sous-traitant</th>
                <th scope="col" className={entete}>Rôle</th>
                <th scope="col" className={entete}>Pays</th>
                <th scope="col" className={entete}>Garantie</th>
              </tr>
            </thead>
            <tbody>
              {SOUS_TRAITANTS.map((x) => (
                <tr key={x.nom}>
                  <th scope="row" className={`${cellule} text-left font-semibold`}>{x.nom}</th>
                  <td className={cellule}>{x.role}</td>
                  <td className={cellule}>{x.pays}</td>
                  <td className={cellule}>{x.garantie}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.p}>
          Transferts hors de l&apos;Union européenne : seulement vers ces sociétés américaines, encadrés par les clauses contractuelles types de la Commission
          européenne (et le Data Privacy Framework quand la société y adhère).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Cookies</h2>
        <p className={s.p}>
          Seulement ceux qui sont nécessaires : le cookie qui te garde connecté (artisan ou négoce), et quelques réglages gardés dans ton navigateur
          (l&apos;entreprise choisie, une aide déjà vue). Aucun cookie de publicité ni de mesure d&apos;audience, rien à accepter. Seule exception, quand elle
          est activée : la vérification anti-robots de Cloudflare (Turnstile) à l&apos;inscription et sur les pages négoce, qui ne dépose pas de cookie
          publicitaire. Tu peux les effacer depuis les réglages de ton navigateur ; il faudra alors te reconnecter.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={s.h2}>Tes droits, en libre-service</h2>
        <ul className={s.ul}>
          <li>
            <strong>Accès et portabilité</strong> : Compte → Mes données → « Télécharger mes données » (un fichier JSON) ou « En PDF ». Côté négoce : Mon compte →
            Mes données.
          </li>
          <li>
            <strong>Rectification</strong> : chaque information se corrige dans l&apos;application (Compte, ou Mon compte côté négoce).
          </li>
          <li>
            <strong>Effacement</strong> : « Supprimer mon compte », immédiat. Seuls restent, sans ton nom, les bons de commande (10 ans) et la preuve de ton accord
            (5 ans).
          </li>
          <li>
            <strong>Opposition</strong> : « Ne plus recevoir ces e-mails » en bas de chaque e-mail, en un clic. Un négoce invité peut demander à ne plus jamais être
            contacté : il est mis sur une liste d&apos;exclusion, respectée même si un autre artisan le rajoute.
          </li>
        </ul>
        <p className={s.p}>
          Pour tout le reste, écris à {EDITEUR.contact} ou à {EDITEUR.nom}, {EDITEUR.adresse} : réponse dans un délai d&apos;un mois. Tu peux aussi saisir la CNIL
          (cnil.fr, 3 place de Fontenoy, 75007 Paris) si tu estimes que tes droits ne sont pas respectés.
        </p>
      </section>
      <Link href="/" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text">
        Retour à l&apos;accueil
      </Link>
    </article>
  );
}
