# Browser media security

SupportRoom sends response headers from `next.config.ts` on every frontend route. The media-related Permissions Policy allows the application’s own origin to request camera, microphone, display capture, speaker selection, fullscreen, autoplay, and a screen wake lock. Unused device and location capabilities are disabled.

Permissions Policy defines which documents may ask to use a capability. It does not bypass the browser’s camera, microphone, screen-sharing, or speaker permission prompts. Screen sharing still requires a current user action, and screen wake lock remains advisory: the browser or operating system may release or deny it because of visibility, battery, or power-saving conditions.

During an admitted call, each participant requests a screen wake lock so supported phones and computers do not dim or lock during an otherwise hands-free conversation. SupportRoom releases the lock when the call view is left. Browsers automatically release it when the document becomes hidden, so the hook requests it again when the call page becomes visible.

The frontend also sends these general response protections:

- `X-Frame-Options: DENY` prevents the call UI from being embedded in another page.
- `X-Content-Type-Options: nosniff` disables MIME-type guessing.
- `Referrer-Policy: strict-origin-when-cross-origin` limits cross-origin referrer details.
- `Strict-Transport-Security` is included in production responses.
- The default Next.js `X-Powered-By` response header is disabled.

## Authoritative references

- [Next.js headers configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
- [MDN Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)
- [W3C Screen Capture permissions integration](https://www.w3.org/TR/screen-capture/#permissions-policy-integration)
- [W3C Audio Output Devices permissions policy](https://www.w3.org/TR/audio-output/#permissions-policy)
- [W3C Screen Wake Lock API](https://www.w3.org/TR/screen-wake-lock/)
