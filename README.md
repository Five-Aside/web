# Five Aside — Web

Next.js **SaaS portal** for weekly five-a-side leagues — multi-tenant fixtures, tables, payments, discipline, live match ops, and a platform console to onboard new clubs.

Product: **Five Aside** (evolved from Thursday Night Football).

## Companion repos

- Backend domain + Prisma + Stellar stubs: https://github.com/Five-Aside/backend  
- Soroban contracts: https://github.com/Five-Aside/contract  

## SaaS surfaces

| Surface | Route | Audience |
|---------|-------|----------|
| Platform landing / admin | `/platform` | Five Aside operators + league applicants |
| League site | `/{slug}` | Players & organisers of one tenant |
| League admin | `/{slug}/admin` | Organisers — results, purse, settings |
| Payments | `/{slug}/payments` | Monthly fees / walk-ins |
| Billing (Stellar) | platform / organiser | Pay STARTER·CLUB·PRO in USDC |

## Stack

Next.js 16 · React 19 · Prisma · Tailwind v4 · PostgreSQL

## Stellar

Organisers can pay SaaS plans in **USDC on Stellar**; official match weeks can show on-chain receipt badges (see `Five-Aside/contract`).

## Local

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Never commit real `.env` files.

## License

See `LICENSE`.
