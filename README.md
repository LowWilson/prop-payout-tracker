# Prop Payout Tracker - Supabase Google Login版

## 1. Supabase側でやること

1. Supabaseで新規Project作成
2. SQL Editorを開く
3. `supabase_schema.sql` の中身を全部貼ってRun
4. Authentication > Providers > Google をON
5. Authentication > URL Configuration にGitHub PagesのURLを入れる
   - Site URL: `https://あなたのID.github.io/リポジトリ名/`
   - Redirect URLsにも同じURLを追加

## 2. Google Cloud側でやること

Google OAuth Client ID / Client Secretを作り、SupabaseのGoogle Providerに貼る。

Authorized redirect URI は Supabase の Google Provider画面に出ている Callback URL を使う。

## 3. config.jsを書き換える

Supabase Project Settings > API から

- Project URL
- anon public key

をコピーして `config.js` に貼る。

## 4. GitHub Pagesにアップロード

このフォルダの中身を全部アップロード。
