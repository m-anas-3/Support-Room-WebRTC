import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function trackLocalMedia(page: Page) {
  await page.addInitScript(() => {
    const nativePeerConnection = window.RTCPeerConnection;
    const nativeWebSocket = window.WebSocket;
    const peers: RTCPeerConnection[] = [];
    const sockets: WebSocket[] = [];
    Object.defineProperty(window, "supportTestPeers", { value: peers });
    Object.defineProperty(window, "supportTestSockets", { value: sockets });
    window.WebSocket = class extends nativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        if (protocols === undefined) super(url);
        else super(url, protocols);
        sockets.push(this);
      }
    };
    window.RTCPeerConnection = class extends nativePeerConnection {
      constructor(configuration?: RTCConfiguration) { super(configuration); peers.push(this); }
      close() {
        const count = Number(sessionStorage.getItem("supportroom:test-closed-peers") ?? 0);
        sessionStorage.setItem("supportroom:test-closed-peers", String(count + 1));
        super.close();
      }
    };
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const instrumentStops = (stream: MediaStream, key: string) => {
      for (const track of stream.getTracks()) {
        const originalStop = track.stop.bind(track);
        track.stop = () => {
          const count = Number(sessionStorage.getItem(key) ?? 0);
          sessionStorage.setItem(key, String(count + 1));
          originalStop();
        };
      }
      return stream;
    };
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      return instrumentStops(await original(constraints), "supportroom:test-stopped-tracks");
    };
    // Headless Chromium cannot show an operating-system screen picker. Return a
    // separate native video track so the test still exercises replaceTrack().
    navigator.mediaDevices.getDisplayMedia = async () => {
      const stream = instrumentStops(await original({ video: { width: 1280, height: 720 }, audio: false }), "supportroom:test-stopped-display-tracks");
      Object.defineProperty(window, "supportTestDisplayStream", { value: stream, configurable: true });
      return stream;
    };
  });
}

async function startCall(context: BrowserContext, host: Page) {
  const customer = await context.newPage();
  await Promise.all([trackLocalMedia(host), trackLocalMedia(customer)]);

  await host.goto("/dashboard");
  await host.getByRole("button", { name: "New room" }).click();
  await host.getByLabel("Reference").fill("WebRTC browser test");
  await host.getByRole("button", { name: "Create room" }).click();
  const invitation = await host.getByText(/^http:\/\/127\.0\.0\.1:3100\/join\//).textContent();
  expect(invitation).toBeTruthy();
  await host.getByRole("button", { name: "Open room" }).click();
  await host.getByRole("button", { name: "Start camera" }).click();
  await expect(host.getByTestId("local-video").locator("video")).toHaveJSProperty("paused", false);

  await customer.goto(invitation!);
  await customer.getByRole("button", { name: "Start preview" }).click();
  await customer.getByLabel("Your name").fill("Jordan Taylor");
  await customer.getByRole("button", { name: "Ask to join" }).click();

  const admit = host.getByRole("button", { name: "Admit" });
  await expect(admit).toBeEnabled();
  for (const page of [host, customer]) {
    expect(await page.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)).toBe(0);
  }
  await admit.click();
  await expect(host.getByText("Media: connected")).toBeVisible();
  await expect(customer.getByText("Media: connected")).toBeVisible();
  return customer;
}

async function inboundBytes(page: Page, kind: "audio" | "video") {
  return page.evaluate(async (mediaKind) => {
    const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)!;
    let bytes = 0;
    (await peer.getStats()).forEach((stat) => {
      if (stat.type === "inbound-rtp" && stat.kind === mediaKind) bytes += stat.bytesReceived;
    });
    return bytes;
  }, kind);
}

test("connects two real browser peers, controls tracks, and cleans up", async ({ context, page: host }) => {
  const customer = await startCall(context, host);

  for (const page of [host, customer]) {
    const remoteVideo = page.getByTestId("remote-video").locator("video");
    await expect.poll(() => remoteVideo.evaluate((video) => {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
      return stream?.getTracks().filter((track) => track.readyState === "live").length ?? 0;
    })).toBe(2);
    await expect.poll(() => remoteVideo.evaluate((video) => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    await expect.poll(() => remoteVideo.evaluate((video) => (video as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(async () => {
      const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)!;
      const stats = await peer.getStats();
      const receiving = new Set<string>();
      stats.forEach((stat) => { if (stat.type === "inbound-rtp" && stat.bytesReceived > 0) receiving.add(stat.kind); });
      return [...receiving].sort();
    })).toEqual(["audio", "video"]);
  }

  await host.getByRole("button", { name: "Call settings" }).click();
  const hostSettings = host.getByRole("complementary", { name: "Call settings" });
  await expect(hostSettings.getByText("Camera", { exact: true })).toBeVisible();
  await expect(hostSettings.getByText("Microphone", { exact: true })).toBeVisible();
  await expect(hostSettings.getByText("Speaker", { exact: true })).toBeVisible();
  await hostSettings.getByRole("button", { name: "Close side panel" }).click();

  await customer.getByRole("button", { name: "Call settings" }).click();
  const customerSettings = customer.getByRole("complementary", { name: "Call settings" });
  await expect(customerSettings.getByText("Camera", { exact: true })).toBeVisible();
  await expect(customerSettings.getByText("Microphone", { exact: true })).toBeVisible();
  await customerSettings.getByRole("button", { name: "Close call settings" }).click();

  await expect(host.getByTestId("host-diagnostics-panel")).toHaveCount(0);
  await host.getByRole("button", { name: "Connection diagnostics" }).click();
  await expect(host.getByTestId("diagnostic-send-bitrate")).not.toHaveText("—");
  await expect(host.getByTestId("diagnostic-receive-bitrate")).not.toHaveText("—");
  await expect(host.getByTestId("diagnostic-latency")).not.toHaveText("—");
  await expect(host.getByTestId("diagnostic-packet-loss")).not.toHaveText("—");
  await expect(host.getByTestId("diagnostic-ice-route")).toContainText("Host");
  await expect(host.getByTestId("diagnostic-send-active")).toHaveCount(2);
  await expect(host.getByTestId("diagnostic-receive-active")).toHaveCount(2);
  expect(await host.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  expect(await customer.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  expect(await host.getByTestId("host-call-stage").evaluate((stage) => stage.getBoundingClientRect().bottom <= window.innerHeight)).toBe(true);
  expect(await customer.getByTestId("customer-call-stage").evaluate((stage) => stage.getBoundingClientRect().bottom <= window.innerHeight)).toBe(true);
  expect(await host.getByTestId("host-diagnostics-panel").evaluate((panel) => {
    const style = getComputedStyle(panel);
    return style.overflowY === "auto" && panel.scrollHeight > panel.clientHeight;
  })).toBe(true);

  const hostCameraTrackId = await host.evaluate(() => {
    const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)!;
    return peer.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id;
  });
  await host.getByRole("button", { name: "Share screen" }).click();
  await expect(host.getByRole("button", { name: "Stop sharing" })).toBeVisible();
  await expect(customer.getByText("Support agent · Presenting")).toBeVisible();
  await expect.poll(() => host.evaluate(() => {
    const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)!;
    return peer.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id;
  })).not.toBe(hostCameraTrackId);
  const displayTrackId = await host.evaluate(() => (window as unknown as { supportTestDisplayStream: MediaStream }).supportTestDisplayStream.getVideoTracks()[0]?.id);
  expect(await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id)).toBe(displayTrackId);
  expect(await host.getByTestId("local-video").locator("video").evaluate((video) => ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]?.id)).toBe(hostCameraTrackId);
  await expect(host.getByTestId("local-video").getByText("Host · Presenting")).toBeVisible();
  await host.getByRole("button", { name: "Stop sharing" }).click();
  await expect(host.getByRole("button", { name: "Share screen" })).toBeVisible();
  await expect(customer.getByText("Support agent", { exact: true })).toBeVisible();
  await expect.poll(() => host.evaluate(() => {
    const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)!;
    return peer.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id;
  })).toBe(hostCameraTrackId);
  await expect.poll(() => host.evaluate(() => Number(sessionStorage.getItem("supportroom:test-stopped-display-tracks") ?? 0))).toBeGreaterThanOrEqual(1);

  await customer.getByRole("button", { name: "Share screen" }).click();
  await expect(host.getByText("Customer · Presenting")).toBeVisible();

  await host.getByRole("button", { name: "Mute microphone" }).click();
  await expect(host.getByRole("button", { name: "Unmute microphone" })).toBeVisible();
  expect(await host.getByTestId("local-video").locator("video").evaluate((video) => ((video as HTMLVideoElement).srcObject as MediaStream).getAudioTracks()[0]?.enabled)).toBe(false);

  const peerCountBeforeCameraChanges = await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length);
  const cameraTrackBeforeStop = await host.getByTestId("local-video").locator("video").evaluate((video) => ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]?.id);
  await host.getByRole("button", { name: "Turn off camera" }).click();
  await expect.poll(() => host.getByTestId("local-video").locator("video").evaluate((video) => ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks().length)).toBe(0);
  await expect.poll(() => host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "video")?.sender.track?.id ?? null)).toBeNull();
  await expect(customer.getByTestId("remote-video").getByText("Camera is off")).toBeVisible();
  expect(await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)).toBe(peerCountBeforeCameraChanges);

  await host.getByRole("button", { name: "Turn on camera" }).click();
  await expect.poll(() => host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id)).not.toBe(cameraTrackBeforeStop);
  await expect(customer.getByTestId("remote-video").getByText("Camera is off")).toHaveCount(0);
  await expect(customer.getByTestId("remote-video").locator("video")).toBeVisible();
  const videoBytesAfterRestore = await inboundBytes(customer, "video");
  await expect.poll(() => inboundBytes(customer, "video")).toBeGreaterThan(videoBytesAfterRestore);
  expect(await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)).toBe(peerCountBeforeCameraChanges);

  const cameraTrackBeforeRapidRestart = await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id);
  await host.getByRole("button", { name: "Turn off camera" }).click();
  await host.getByRole("button", { name: "Turn on camera" }).click();
  await expect.poll(() => host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id)).not.toBe(cameraTrackBeforeRapidRestart);
  await expect(customer.getByTestId("remote-video").locator("video")).toBeVisible();
  const videoBytesAfterRapidRestart = await inboundBytes(customer, "video");
  await expect.poll(() => inboundBytes(customer, "video")).toBeGreaterThan(videoBytesAfterRapidRestart);
  expect(await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)).toBe(peerCountBeforeCameraChanges);

  const cameraTrackBeforeDisconnect = await host.getByTestId("local-video").locator("video").evaluate((video) => ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]?.id);
  const audioSenderBeforeDisconnect = await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getSenders().find((sender) => sender.track?.kind === "audio")?.track?.id);
  await host.getByTestId("local-video").locator("video").evaluate((video) => {
    const track = ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0];
    track.stop();
    track.dispatchEvent(new Event("ended"));
  });
  await expect.poll(() => host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getSenders().find((sender) => sender.track?.kind === "video")?.track?.id)).not.toBe(cameraTrackBeforeDisconnect);
  expect(await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)?.getSenders().find((sender) => sender.track?.kind === "audio")?.track?.id)).toBe(audioSenderBeforeDisconnect);
  expect(await host.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)).toBe(peerCountBeforeCameraChanges);
  await expect(host.getByText("Media: connected")).toBeVisible();

  await customer.getByRole("button", { name: "Leave call" }).click();
  await customer.getByRole("button", { name: "Leave call" }).last().click();
  await expect(host.getByText("Waiting for the customer")).toBeVisible();
  await expect.poll(() => customer.evaluate(() => Number(sessionStorage.getItem("supportroom:test-stopped-tracks") ?? 0))).toBeGreaterThanOrEqual(2);
  await expect.poll(() => customer.evaluate(() => Number(sessionStorage.getItem("supportroom:test-stopped-display-tracks") ?? 0))).toBeGreaterThanOrEqual(1);
  await expect.poll(() => customer.evaluate(() => Number(sessionStorage.getItem("supportroom:test-closed-peers") ?? 0))).toBeGreaterThanOrEqual(1);

  await host.getByRole("button", { name: "End room" }).click();
  await host.getByRole("button", { name: "End room" }).last().click();
  await expect(host).toHaveURL(/\/dashboard$/);
  await expect.poll(() => host.evaluate(() => Number(sessionStorage.getItem("supportroom:test-stopped-tracks") ?? 0))).toBeGreaterThanOrEqual(2);
  await expect.poll(() => host.evaluate(() => Number(sessionStorage.getItem("supportroom:test-closed-peers") ?? 0))).toBeGreaterThanOrEqual(1);
});

test("ending the host room releases the connected customer's devices", async ({ context, page: host }) => {
  const customer = await startCall(context, host);
  await host.getByRole("button", { name: "End room" }).click();
  await host.getByRole("button", { name: "End room" }).last().click();
  await expect(customer.getByText("Unable to join this room")).toBeVisible();
  await expect(customer.getByText("The support agent ended this room.")).toBeVisible();
  await expect.poll(() => customer.evaluate(() => Number(sessionStorage.getItem("supportroom:test-stopped-tracks") ?? 0))).toBeGreaterThanOrEqual(2);
  await expect.poll(() => customer.evaluate(() => Number(sessionStorage.getItem("supportroom:test-closed-peers") ?? 0))).toBeGreaterThanOrEqual(1);
});

test("recovers a dropped signaling socket without releasing local devices", async ({ context, page: host }) => {
  const customer = await startCall(context, host);
  const stoppedBefore = await Promise.all([host, customer].map((page) => page.evaluate(() => Number(sessionStorage.getItem("supportroom:test-stopped-tracks") ?? 0))));
  const peerCountsBefore = await Promise.all([host, customer].map((page) => page.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)));

  await host.evaluate(() => {
    const sockets = (window as unknown as { supportTestSockets: WebSocket[] }).supportTestSockets;
    const signalingSocket = sockets.findLast((socket) => socket.readyState === WebSocket.OPEN);
    if (!signalingSocket) throw new Error("No open signaling socket was found.");
    signalingSocket.close(4000, "Test interruption");
  });

  const admit = host.getByRole("button", { name: "Admit" });
  await expect(admit).toBeEnabled();
  await expect(customer.getByText("You’re in the waiting room")).toBeVisible();
  for (const [index, page] of [host, customer].entries()) {
    await expect.poll(() => page.evaluate(() => Number(sessionStorage.getItem("supportroom:test-stopped-tracks") ?? 0))).toBe(stoppedBefore[index]);
  }

  await admit.click();
  await expect(host.getByText("Media: connected")).toBeVisible();
  await expect(customer.getByText("Media: connected")).toBeVisible();
  for (const [index, page] of [host, customer].entries()) {
    await expect.poll(() => page.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)).toBeGreaterThan(peerCountsBefore[index]);
    await expect.poll(() => inboundBytes(page, "audio")).toBeGreaterThan(0);
  }
});
