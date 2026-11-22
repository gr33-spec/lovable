-- Récapitulatif hebdomadaire envoyé à la créatrice chaque lundi matin.
ALTER TABLE email_outbox DROP CONSTRAINT email_outbox_kind_check;
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_kind_check CHECK (
  kind IN ('order_confirmation', 'admin_new_order', 'order_shipped', 'order_refunded', 'order_cancelled', 'admin_alert', 'weekly_report')
);
