# ADR 008 — Polices locales de la présentation arabe

La présentation fournie utilise Cairo et Reem Kufi. Pour conserver sa forme sans charger Google Fonts ni transmettre de données de navigation à un service externe, les deux polices variables sont distribuées localement et encodées dans le document isolé. Aucune offre payante, clé ou dépendance logicielle supplémentaire n'est utilisée.

Le 4 novembre 2026, vérification dans le dépôt officiel Google Fonts : [Cairo](https://github.com/google/fonts/tree/main/ofl/cairo) et [Reem Kufi](https://github.com/google/fonts/tree/main/ofl/reemkufi). Leurs fichiers `OFL.txt` indiquent la licence SIL Open Font License 1.1 ; des copies sont conservées sous `src/assets/fonts/`. Fichiers référencés lors de l'import : blob Git Cairo `25641b1c828857698457bcd9f5a102616b4e8033`, Reem Kufi `ad1a769f41ed4a2b87e3afe4289c9115acb9cc97`. Vérifier les droits et licences associés à tout autre média avant diffusion.
