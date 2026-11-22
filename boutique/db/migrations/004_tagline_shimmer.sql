-- L'accroche d'accueil peut mettre un mot en valeur (effet paillettes) en
-- l'entourant d'étoiles : « Bijoux en résine *pailletée*, faits main ».
-- Seule l'accroche d'origine est modifiée (jamais un texte personnalisé).
UPDATE shop_settings SET tagline = 'Bijoux en résine *pailletée*, faits main'
WHERE id = 1 AND tagline = 'Bijoux en résine pailletée, faits main';
