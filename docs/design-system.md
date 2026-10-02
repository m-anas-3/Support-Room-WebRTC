# SupportRoom interface

The workspace is light; the call room uses a scoped dark theme. Use the same semantic Tailwind tokens in both. Avoid hardcoded colors in feature components except the fixed dark authentication and device-preview surfaces.

## Foundations

- Geist Sans is the interface font. Geist Mono is for identifiers and diagnostic values.
- Page titles: 28px, semibold, tight tracking. Section titles: 18px. Interface copy: 14px with 20–24px leading. Supporting metadata: 12px. Mobile form inputs: 16px.
- Spacing follows a 4px scale. Use 8px corners for controls, 12px for panels, and 16px for video tiles and large surfaces.
- Use borders to separate surfaces. Shadows belong to floating UI, not every card.
- `PageHeader` owns the page heading and primary action. `AppShell` owns navigation, breadcrumbs, gutters, and a 1200px content container. Forms may be narrower inside that shared container.
- Workspace navigation: Overview, Device check, Sessions, Settings. Do not add nonfunctional actions or status claims without backing data.

## Components

`components/ui` contains only primitives installed by the shadcn CLI (Base UI / base-nova). Install missing primitives through the CLI. Product compositions live in their feature folders.

- `PageHeader`, `StatusNotice`, and `ResultState`: consistent page hierarchy, notices, and recovery states.
- `AuthShell`: sign-in and account recovery composition.
- `DevicePreview` and `CallDeviceSettings`: shared local setup and device selection.
- `CallLayout`, `CallPanel`, and `SharingState`: shared host/customer presentation.

Use explicit component class names and props. Do not redefine Tailwind's text sizes with global selectors or recolor child components from their parent.

## Call layout and lifecycle

Normal conversation uses equal participant tiles. Portrait phones stack them; landscape screens use two columns. Presentations prioritize received content with contain sizing. Local sharing uses a status surface instead of a recursive screen preview. The single outgoing video sender still carries either the camera or screen, not both simultaneously.

The call fills the dynamic viewport and includes safe-area padding. The control bar remains visible. Desktop panels dock beside the stage; below 1024px they use an accessible Sheet. Only panel content and long notices scroll. Breakpoint and panel changes must not remount video elements, replace streams, restart capture, or recreate peer connections.

Mic/camera labels describe the action they perform. Busy controls are disabled during changes. End room is reserved for the host; Leave call belongs to the customer. Destructive actions require the existing confirmation dialog.

## Settings

Settings is a single page with three sections: name, call privacy, and password change. Calls always begin with the camera and microphone off; the privacy section explains this instead of offering conflicting startup switches. No tabs, role/email fields, notifications section, or video-quality selector. Saved quality and notification preferences remain intact. Password verification controls appear only when the server requires reauthentication.

## Information and accessibility

Connection quality and expected media activity come before technical details. Unknown measurements render as an em dash; zero remains a real measurement. Disabled media is labeled Off, not failed. ICE route and transport state are available in expandable sections.

Keep one page h1, named icon buttons, visible focus, readable contrast, 44px primary mobile targets, and reduced-motion support. Error messages include a useful next action. Treat loading, unavailable data, empty history, and no filter matches as separate states.

## Room navigation

Overview and Sessions show Open rooms for unexpired rooms created by the signed-in agent in the current browser tab. Host credentials stay in sessionStorage. Closing the creation dialog, navigating away, or refreshing the tab preserves access. Ending a room or receiving an unavailable-room response clears saved access. Session table rows navigate from any non-interactive cell and retain a real link for keyboard access. Available rooms open their call screen; completed or unavailable sessions open their report.

## Loading and pending work

The app entry routes (`/`, `/dashboard`, and `/login`) render without a startup splash or skeleton. The initial session check completes before rendering the appropriate page. Other routes keep loading fallbacks that match their layout: workspace skeletons, account form skeletons, the guest device preview, and a dark call stage. Use the installed shadcn Skeleton component; never delay completed work just to display a loader.

Sidebar links keep their normal appearance during navigation; loading feedback belongs to the page content. Saving profile or passwords keeps the form visible, disables duplicate submissions, and announces its busy state. Room creation also displays a spinner and locks the reference until it finishes. Media controls retain their existing busy state and lifecycle; video placeholders remain visible until the current source presents a fresh frame.

## Verification

Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm test:e2e`. The browser suite builds the production application, tests real peer connections with simulated devices, and checks layouts at 360, 390, 768, 1280, and 1440px plus phone landscape. Screenshots are saved in ignored `test-results` directories for visual review. Real iPhone Safari and Android Chrome media/permission behavior must also be checked before release.
