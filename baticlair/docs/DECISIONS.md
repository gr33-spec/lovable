# Décisions prises seul (plan du 20 octobre 2026, jusqu'au vendredi 23 octobre 12 h)

Greg tranche après coup. Une ligne par décision : date, question, choix, pourquoi.

| Date | Question | Choix | Pourquoi |
|---|---|---|---|
| 2026-10-20 | Comment un parcours e2e lit-il les e-mails (liens de dépôt des négoces, réponses) ? | Une « boîte aux lettres de test » : `EMAIL_PROVIDER=capture` et la route `GET /v1/internal/test/emails` (secret `CRON_SECRET`), qui n'existe qu'en `NODE_ENV=test` ; jamais en ligne. | Les e2e ne peuvent pas lire la console du serveur ; le test API capture déjà les e-mails ainsi. |
| 2026-10-20 | Un négoce répond par e-mail au lieu de la page de dépôt. | Le webhook ne prend aucun devis : il renvoie un lien de dépôt neuf avec la phrase de commission ; l'ancien lien meurt. | Section 6 : « pas de case cochée, pas de réponse prise en compte » ; le jeton n'est gardé que haché. |
| 2026-10-20 | Un lot envoyé sans offre valable après 7 jours. | Lot « clos », besoins gardés engagés dedans, rien ne repart seul ; Greg relance ou libère depuis l'admin. | Évite de renvoyer la même demande en boucle aux mêmes négoces. |
| 2026-10-20 | Le prix d'un palier « à partir de 100 » pour un volume ferme de 46. | Écarté (`palier_insuffisant`) ; seul le volume ferme compte. | Section 4 : le prix annoncé est le prix payé. |
| 2026-10-20 | TVA sur la facture de commission. | 20 % sur la commission (`FACTURE_TVA_POURCENT`), TTC sur la facture et dans l'e-mail. | Décision de Greg du 20 octobre (assujettie). |
| 2026-10-20 | Contrat d'apporteur d'affaires (PDF à côté de la case). | Texte de travail en 6 articles, titré « version 2026-10-20 (projet, à valider) ». | À faire relire par un avocat avant le premier lot réel (section 6). |
