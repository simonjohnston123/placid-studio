# Handover: Placid Studio → a posting queue

Placid Studio is a standalone product. It makes reels in the browser and you
download them. **Optionally** it can hand a finished reel to a posting queue —
today that means PlacidCRM's Social Poster — so a person can approve it and post
it to the connected channels.

Nothing in the studio posts anything itself. It has no server, holds no platform
tokens, and never will: it is a public static page.

## What the studio sends

```
POST <queue address>                 multipart/form-data
Authorization: Bearer <token>

video    the file, mp4 (or webm where mp4 is unavailable)
payload  JSON, below
```

```jsonc
{
  "source": "placid-studio",
  "contract": 1,
  "createdAt": "2026-09-20T04:11:22.000Z",
  "product": {
    "url": "https://placiddeals.com/p/midea-p7-bldc-stick-vacuum-flexi-tube",
    "title": "Midea P7 BLDC Stick Vacuum | Flexi Tube",
    "priceLabel": "$489.95",
    "priceCents": 48995,
    "stockQuantity": null          // a real count only when it is 5 or fewer
  },
  "creative": {
    "hook": "Still dragging a heavy vacuum around?",
    "script": "Still dragging a heavy vacuum around? Here's the fix. …",
    "caption": "Still dragging a heavy vacuum around?\n\nMidea P7… — $489.95\nhttps://…\n\n#placiddeals #australia …",
    "hashtags": ["#placiddeals", "#australia", "…"],
    "format": "vertical",          // 720x1280
    "durationSeconds": 29.6,
    "mime": "video/mp4",
    "bytes": 25693159
  },
  "approval": "required",          // the studio never asks for immediate posting
  "suggestedChannels": ["tiktok", "facebook", "youtube"]
}
```

## What the queue must answer

```jsonc
200 { "ok": true, "id": "post_123", "reviewUrl": "https://placidcrm.com/dashboard/l/…/social" }
```

Anything else is shown to the operator as an error. `401`/`403` are reported as a
bad token, `404` as a wrong address.

## What the CRM side needs

1. **An endpoint** that accepts the above, stores the video (the media upload
   path already exists) and creates a social post in **approval state** — never
   published directly.
2. **CORS** for the studio's origin. The allowlist already exists in
   `src/lib/studio-origins.ts` (`STUDIO_ORIGINS`), used by
   `/api/public/product-card`.
3. **A token** the operator can copy from the CRM and paste into the studio.
   It should be per-business and revocable, and it must not be able to publish
   on its own — only to add a post that still needs approval.

Per-channel copy (title lengths, hashtag style, aspect ratios) is the CRM's job:
`src/lib/social/media-requirements.ts` and `poster-copy.ts` already hold those
rules. The studio sends one caption and the facts behind it; the CRM shapes it
per channel.

## Standalone

With no queue address set, the studio behaves exactly as before: make the reel,
download the file, copy the post text, upload it by hand. The Send button only
appears once a destination is saved, and the address and token live in that
browser alone.
