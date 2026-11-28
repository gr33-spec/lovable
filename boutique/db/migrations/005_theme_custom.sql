-- Palette personnalisée (« Créer ma palette ») : trois couleurs seulement.
-- Toutes les autres nuances sont calculées par l'application, contrastes
-- garantis. NULL tant que la créatrice n'a pas créé sa palette.
ALTER TABLE shop_settings ADD COLUMN theme_custom jsonb;
ALTER TABLE shop_settings ADD CONSTRAINT shop_settings_theme_custom_check CHECK (
  theme_custom IS NULL OR (
    jsonb_typeof(theme_custom) = 'object'
    AND (theme_custom ->> 'primary') ~ '^#[0-9A-Fa-f]{6}$'
    AND (theme_custom ->> 'secondary') ~ '^#[0-9A-Fa-f]{6}$'
    AND (theme_custom ->> 'accent') ~ '^#[0-9A-Fa-f]{6}$'
  )
);
