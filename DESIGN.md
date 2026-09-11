# Design Brief

## Direction

Coral Current — a friendly, warm real-time messaging app with a distinctive coral accent, teal online-status cues, and a clean split-view chat canvas.

## Tone

Warm, approachable, and polished — a consumer-grade messaging feel (WhatsApp/Slack energy) with soft surfaces and generous rounded shapes, never clinical or corporate.

## Differentiation

A signature coral-to-teal gradient on the active conversation and call actions, paired with mono-font timestamps and pulsing online dots, makes REALCHAT feel alive and instantly recognizable.

## Color Palette

| Token      | OKLCH           | Role                                  |
| ---------- | --------------- | ------------------------------------- |
| background | 0.985 0.006 230 | app canvas (cool off-white)           |
| foreground | 0.18 0.02 240   | primary text                          |
| card       | 1 0.003 230     | chat bubbles, panels                  |
| primary    | 0.62 0.19 35    | sent bubbles, send button (coral)     |
| accent     | 0.6 0.13 190    | online status, active states (teal)   |
| muted      | 0.95 0.012 230  | sidebar hover, subtle fills           |
| success    | 0.55 0.16 150   | online dot, read receipts             |
| destructive| 0.55 0.22 25    | end-call, decline, delete             |

## Typography

- Display: Space Grotesk — app name, headers, empty-state titles
- Body: DM Sans — messages, names, UI labels, previews
- Mono: JetBrains Mono — timestamps, call codes, unread counts
- Scale: hero `text-3xl md:text-4xl font-bold tracking-tight`, h2 `text-xl font-semibold`, label `text-xs font-semibold tracking-widest uppercase`, body `text-sm md:text-base`

## Elevation & Depth

Two-tier surface hierarchy — flat sidebar on `bg-sidebar` and elevated chat area on `bg-background`, with `shadow-subtle` for cards and `shadow-bubble` for message bubbles; no heavy shadows.

## Structural Zones

| Zone      | Background         | Border      | Notes                                  |
| --------- | ------------------ | ----------- | -------------------------------------- |
| Sidebar   | `bg-sidebar`       | `border-r`  | conversation list, search, unread badges |
| Chat      | `bg-background`    | —           | message bubbles, day dividers           |
| Chat header| `bg-card/80`      | `border-b`  | active contact, online status, call btn |
| Composer  | `bg-card`          | `border-t`  | input field + send button               |
| Call view | `bg-background`    | —           | full video viewport, floating controls  |

## Spacing & Rhythm

Consistent 4px base grid; sidebar rows `py-3 px-4`, chat gutter `px-4 md:px-6`, message gap `gap-2`, section gaps `gap-6`; generous padding around bubbles for readability.

## Component Patterns

- Buttons: rounded-full, coral primary, teal accent, `shadow-subtle`, hover `brightness-105`
- Cards: `rounded-xl` on `bg-card` with `shadow-subtle`; bubbles `rounded-2xl` with tail-like asymmetry
- Badges: `rounded-full` coral pill with white mono count for unread; teal dot for online
- Avatars: `rounded-full` with gradient ring for active contacts

## Motion

- Entrance: message bubbles `animate-message-in` (0.25s) as they appear; lists `animate-fade-up`
- Hover: sidebar rows lift with `shadow-subtle` + background shift (0.3s)
- Decorative: online dots `animate-status-pulse`; incoming call button `animate-ring-pulse`

## Constraints

- Token-only styling — no raw hex/rgb in components
- AA+ contrast in both light and dark modes
- Responsive: sidebar collapses to a drawer on mobile, call controls scale down
- Light mode is primary; dark mode is a tuned inversion, not a simple flip

## Signature Detail

The coral-to-teal gradient applied to the active conversation row and the in-call ring makes the live, human connection the visual hero of REALCHAT.
