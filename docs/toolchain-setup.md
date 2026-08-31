# Toolchain setup

Phase 0 deliverable. Do this once, it carries through every later phase.

## Already configured

[`.mcp.json`](../.mcp.json) declares three MCP servers at project scope. Claude Code will
prompt you to approve them the next time you start a session in this repo.

| Server            | What it gives you                                                        |
| ----------------- | ------------------------------------------------------------------------ |
| `playwright`      | Drive a real browser, screenshot pages, verify builds visually           |
| `chrome-devtools` | Lighthouse, Core Web Vitals, network waterfalls                          |
| `context7`        | Current docs for Next 16 / Tailwind 4 / Supabase, not training-data docs |

They run via `npx` on demand, nothing to install ahead of time.

## You need to run these, slash commands, typed into Claude Code

Plugin marketplaces can't be added programmatically. Paste these one at a time:

```
/plugin marketplace add secondsky/claude-skills
/plugin install frontend-skills@claude-skills
/plugin install auth-skills@claude-skills
/plugin install cms-skills@claude-skills
```

What each buys us:

| Skill                 | Priority  | Used for                                                         |
| --------------------- | --------- | ---------------------------------------------------------------- |
| `tailwind-v4-shadcn`  | Essential | Phase 1, Tailwind v4 + shadcn setup, CSS-variable theming        |
| `motion`              | Essential | Phase 3, the scroll-linked day gradient, reduced-motion handling |
| `react-hook-form-zod` | Essential | Phase 6, tour form, contact form, every admin form               |
| `nextjs`              | Essential | Phase 1, App Router, server actions, metadata, ISR               |
| `tanstack-table`      | High      | Phase 5, the inquiries inbox                                     |
| `auth-skills`         | High      | Phase 5, session handling, middleware guards, MFA                |

`frontend-skills` installs 21 skills including the first four above.

## Deferred on purpose

**shadcn MCP** needs a `components.json`, which doesn't exist until Phase 1. Add it right
after `shadcn init`:

```bash
pnpm dlx shadcn@latest mcp init --client claude
```

**Supabase MCP** needs a project ref, which doesn't exist until Phase 4. Add it then:

```bash
claude mcp add supabase -- pnpm dlx @supabase/mcp-server-supabase@latest --project-ref=<REF>
```

Or append to `.mcp.json` directly:

```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=<REF>"]
}
```

**Cloudflare skills** only if images or Turnstile move onto Cloudflare. Not planned.

## Already available, no install needed

The Figma MCP server is connected. Useful here:

- `/figma-generate-design` push the homepage and admin layouts into Figma for sign-off
- `get_design_context` pull a Figma design back as code

Built-in skills worth reaching for:

| Skill              | When                                                            |
| ------------------ | --------------------------------------------------------------- |
| `/design`          | Multi-artboard mockups, homepage, day timeline, admin dashboard |
| `/dataviz`         | Admin dashboard stat tiles                                      |
| `/code-review`     | Before every deploy                                             |
| `/security-review` | Before every deploy, the admin panel handles personal data      |
| `/run`             | Launch and screenshot the app                                   |

## Still outstanding

- [ ] Register the domain, `columbiacareafh.com` if available. **Your action.**
- [ ] Send [client-questions.md](client-questions.md) to the client
- [ ] Run the four `/plugin` commands above
- [ ] Approve the three MCP servers when prompted
- [ ] Create the Vercel project and connect the repo. **Your action** needs your account.
      Once connected, `.github/workflows/ci.yml` and Vercel's own preview deploys both run
      on every PR.

`shadcn init` has not been run yet, Phase 2 does that, then add the shadcn MCP as above.
