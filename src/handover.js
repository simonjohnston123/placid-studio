// HANDOVER: send a finished reel to a posting queue (PlacidCRM today, anything
// that implements the same contract tomorrow).
//
// The studio stays a standalone product: with nothing configured, every feature
// still works and videos are downloaded by hand. Configure a destination and a
// "Send to queue" button appears next to the finished video.
//
// The contract is deliberately small and documented in HANDOVER.md:
//
//   POST <endpoint>            multipart/form-data
//     Authorization: Bearer <token>
//     video   — the mp4/webm file
//     payload — JSON (see postPayload below)
//   200 { ok: true, id, reviewUrl? }   anything else is an error to show the user
//
// The token is the operator's own, typed on their own machine and kept in their
// browser. Nothing is baked into the published site, which is public.

export const CONTRACT_VERSION = 1;

export function postPayload({ card, hook, script, caption, video, durationSeconds, format }) {
  const hashtags = (caption.match(/#[\w]+/g) || []);
  return {
    source: 'placid-studio',
    contract: CONTRACT_VERSION,
    createdAt: new Date().toISOString(),
    product: {
      url: card.url,
      title: card.title,
      priceLabel: card.priceLabel ?? null,
      priceCents: card.priceCents ?? null,
      stockQuantity: card.stockQuantity ?? null,
    },
    creative: {
      hook,
      script,
      caption: caption.replace(/\n{3,}/g, '\n\n'),
      hashtags,
      format,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      mime: video.type,
      bytes: video.size,
    },
    // The studio never decides what goes live: the queue holds it for a person.
    approval: 'required',
    suggestedChannels: ['tiktok', 'facebook', 'youtube'],
  };
}

export async function sendToQueue({ endpoint, token, video, payload, onProgress }) {
  if (!endpoint) throw new Error('No destination set. Open Send settings and paste the queue address.');
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('That destination is not a web address.'); }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('The destination must be https — a token should never travel in the clear.');
  }

  const body = new FormData();
  const ext = video.type.includes('mp4') ? 'mp4' : 'webm';
  body.append('video', video, `placid-studio-${Date.now()}.${ext}`);
  body.append('payload', JSON.stringify(payload));

  // XHR rather than fetch: a 25 MB upload deserves a progress bar.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url.href);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data?.ok !== false) return resolve(data || { ok: true });
      reject(new Error(
        data?.error
        || (xhr.status === 401 || xhr.status === 403 ? 'The queue refused the token. Check it in Send settings.'
          : xhr.status === 404 ? 'That address does not exist on the queue.'
          : xhr.status === 0 ? 'Could not reach the queue. It also has to allow this studio to talk to it.'
          : `The queue answered ${xhr.status}.`)
      ));
    };
    xhr.onerror = () => reject(new Error('Could not reach the queue. Check the address, and that it allows this studio to talk to it.'));
    xhr.send(body);
  });
}
