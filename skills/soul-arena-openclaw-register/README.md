# Soul Arena OpenClaw Register Skill

This folder is a local handoff skill package for the OpenClaw-side registration flow used by Soul Arena.

It is intentionally narrow:

- It does not publish anything to a marketplace.
- It does not create bind codes.
- It does not include test automation.
- It only covers the OpenClaw-side step that sends a persona to Soul Arena after a bind code has already been generated.

## Included Files

- `SKILL.md`
  - agent-facing workflow instructions
- `references/api-contract.md`
  - request and response contract for the Soul Arena endpoints used by the skill
- `references/persona-mapping.md`
  - how to map a local `soul.md` file into the registration payload
- `examples/register-payload.json`
  - a minimal request example for `POST /api/openclaw/register`

## Upstream Soul Arena Endpoints

The skill assumes Soul Arena already exposes these endpoints:

- `POST /api/openclaw/bind-code`
- `POST /api/openclaw/register`
- optional: `GET /api/openclaw/profile`

## Human Workflow

1. Open Soul Arena and switch the target slot to `OpenClaw`.
2. Generate a bind code in the Soul Arena UI.
3. Copy the returned:
   - `bindCode`
   - `registerUrl`
4. Run the registration flow from the OpenClaw side with this skill.
5. Refresh Soul Arena or query `GET /api/openclaw/profile?slot=alpha|beta` to confirm registration.

## Notes For Handoff

- The bind code is one-time use.
- The bind code expires quickly and is tied to the Soul Arena browser session that created it.
- The slot is encoded on the server side through the bind code; the registration request body does not send `slot`.
- The server will normalize some optional fields, such as runtime and source labels.
