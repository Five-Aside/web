# Railway deploy (aji70)
#
# 1. Push this repo to GitHub (aji70)
# 2. railway login
# 3. railway init / link
# 4. Add a Volume mounted at /data (Dashboard → Volumes)
# 5. Set variables:
#      DATABASE_URL=file:/data/prod.db
#      ADMIN_PASSWORD=your-strong-password
#      SESSION_SECRET=random-long-string
# 6. railway up   OR connect the GitHub repo in Railway for auto-deploys
#
# SQLite lives on the volume so player data survives restarts.
