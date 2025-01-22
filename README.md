# GitRace.dev

[GitRace.dev](https://gitrace.dev) is fun project to track your Github commits and show a leaderboard.

### Workflow:
- Submit a github url
- Wait for the leaderboard to update

## Stack

- [x] Node.js (TypeScript)
- [x] Express.js
- [x] Prisma (PostgreSQL)
- [x] Auth (Lucia)
- [x] Zod
- [x] Template Engine (EJS)
- [x] Styling with TailwindCSS
- [x] Commitlint
- [x] Swagger UI

Uses **PostgreSQL** database.

## Development

Create `.env` from `.example.env`

Then:

```bash
bun i
bun dev
```

## Docker

```bash
docker build -t local/bun-express-starter -f Dockerfile .
docker run -p 3000:3000 local/bun-express-starter
# OR
docker compose up
```

## Deploy with [DXUP](https://dxup.dev)

```bash
dx up
# dx up --prod
```

## CI/CD

- [x] Github Actions: Create Pull Request to `main` branch will trigger a build and push to `preview` environment
- [x] Github Actions: Merge Pull Request to `main` branch will trigger a build and push to `production` environment

## Author

Please feel free to contribute to this project!

- X: [Goon Nguyen](https://x.com/goon_nguyen)
- CTO at [TOP GROUP](https://wearetopgroup.com), [DIGITOP](https://digitop.vn) & [XinChao Live Music](https://xinchao.world)

## Check out my other products

- [IndieBoosting.com](https://indieboosting.com) - Indie Makers Unite: Feature, Support, Succeed
- [DigiCord AI](https://digicord.site) - The Most Useful AI Chatbot on Discord
- [BoostTogether.com](https://boosttogether.com) - The Power of WE in Advertising
- [TopRanking.ai](https://topranking.ai) - AI Directory, listing AI products
- [ZII.ONE](https://zii.one) - Personalized Link Shortener
- [VidCap.xyz](https://vidcap.xyz) - Extract Youtube caption, download videos, capture screenshot, summarize,…
- [ReadTube.me](https://readtube.me) - Write blog articles based on Youtube videos
- [AIVN.Site](https://aivn.site) - Face Swap, Remove BG, Photo Editor,…
- [ReviewWeb.site](https://reviewweb.site) - FREE Website Review Tool with AI

Thank you!