-- Vérifier l'ID de Georges
SELECT id, email, name FROM prospects WHERE email = 'georges@yopmail.com';

-- Vérifier ses formulaires
SELECT * FROM client_form_panels WHERE prospect_id = 'e74ffbca-e65a-46ff-bdec-eeb8a495ff8c';
