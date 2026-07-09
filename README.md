# Challenge Préfectures — version collaborative

Application React/Vite permettant à deux personnes de suivre leur challenge des 96 préfectures métropolitaines.

## Couleurs de la carte

- vert : département visité par le membre 1 ;
- bleu : département visité par le membre 2 ;
- turquoise : département visité par les deux ;
- blanc : département restant à visiter.

## Essai local sans compte

```bash
npm install
npm run dev
```

Sans configuration Supabase, l'application démarre en mode démonstration. Les deux profils sont accessibles depuis la barre latérale et les données restent enregistrées dans le navigateur.

## Activer la collaboration en ligne

1. Créer un projet gratuit sur https://supabase.com.
2. Ouvrir **SQL Editor**, copier le contenu de `supabase/schema.sql`, puis l'exécuter.
3. Dans **Authentication > Providers > Email**, activer la connexion par e-mail et mot de passe.
   Pour éviter les liens de confirmation, désactiver **Confirm email**.
4. Dans **Authentication > URL Configuration**, ajouter :
   - `http://localhost:5173` pour le développement ;
   - l'adresse Vercel définitive pour la production.
5. Copier `.env.example` vers `.env.local`.
6. Renseigner l'URL du projet et sa clé **Publishable** dans `.env.local`.
7. Relancer `npm run dev`.

Les cinq premières personnes qui créent un accès avec prénom, e-mail et mot de passe deviennent les membres du challenge. Les autres visiteurs peuvent consulter le site en lecture seule.

L'écran de connexion contient aussi un lien **Mot de passe oublié ?**. Il envoie un e-mail de réinitialisation via Supabase, puis le lien reçu renvoie vers le site pour choisir un nouveau mot de passe.

## Mettre en ligne avec Vercel

1. Envoyer ce dossier dans un dépôt GitHub.
2. Importer le dépôt sur https://vercel.com/new.
3. Ajouter dans les variables d'environnement Vercel :
   - `VITE_SUPABASE_URL` ;
   - `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Déployer, puis ajouter l'URL obtenue aux URL autorisées dans Supabase Authentication.

Les modifications des deux membres sont resynchronisées automatiquement toutes les quatre secondes et dès que l'onglet redevient actif.
