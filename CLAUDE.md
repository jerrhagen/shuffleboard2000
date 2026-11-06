# Shuffleboard 2000

Webbapp som slumpar lag till shuffleboard: fota spelare, välj antal bord, se lottningen i 3D. Publik på https://jerrhagen.github.io/shuffleboard2000/.

- Privat projekt: GitHub-kontot jerrhagen, `user.email` svensson.aron@gmail.com. Kör gh med `GH_TOKEN=$(gh auth token --user jerrhagen) gh …`.
- `npm run dev`, `npm test`, `npm run deploy` (bygger och pushar dist till grenen gh-pages, ingen CI).
- `src/domain` och `src/scene/physics.ts` är ren logik med tester. `src/scene` är three.js. `src/data/store.ts` är all lagring: spelarna ligger i IndexedDB på en enhet, så delad registrering byter ut den modulen.
- Kod på engelska, allt användaren ser och kommentarer på svenska.
