import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function trackLocalMedia(page: Page, tone = false) {
  await page.addInitScript((useTone) => {
    const nativePeerConnection = window.RTCPeerConnection;
    const nativeWebSocket = window.WebSocket;
    const peers: RTCPeerConnection[] = [];
    const sockets: WebSocket[] = [];
    Object.defineProperty(window, "supportTestPeers", { value: peers });
    Object.defineProperty(window, "supportTestSockets", { value: sockets });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          const requests = Number(sessionStorage.getItem("supportroom:test-wake-lock-requests") ?? 0);
          sessionStorage.setItem("supportroom:test-wake-lock-requests", String(requests + 1));
          let released = false;
          const sentinel = new EventTarget() as WakeLockSentinel;
          Object.defineProperty(sentinel, "released", { get: () => released });
          Object.defineProperty(sentinel, "type", { value: "screen" });
          sentinel.release = async () => {
            if (released) return;
            released = true;
            const releases = Number(sessionStorage.getItem("supportroom:test-wake-lock-releases") ?? 0);
            sessionStorage.setItem("supportroom:test-wake-lock-releases", String(releases + 1));
            sentinel.dispatchEvent(new Event("release"));
          };
          return sentinel;
        },
      },
    });
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
      const stream = await original(constraints);
      if (useTone && constraints?.audio) {
        // A known signal lets us verify received audio energy, not just RTP bytes
        // (silent/muted audio can still send packets).
        for (const track of stream.getAudioTracks()) { stream.removeTrack(track); track.stop(); }
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const destination = context.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        await context.resume();
        const track = destination.stream.getAudioTracks()[0];
        const contexts = (window as unknown as { supportTestAudioContexts?: AudioContext[] });
        (contexts.supportTestAudioContexts ??= []).push(context);
        const stop = track.stop.bind(track);
        let stopped = false;
        track.stop = () => {
          if (stopped) return;
          stopped = true;
          stop(); oscillator.stop(); void context.close();
        };
        stream.addTrack(track);
      }
      return instrumentStops(stream, "supportroom:test-stopped-tracks");
    };
    // Headless Chromium cannot show an operating-system screen picker. Return a
    // separate native video track so the test still exercises replaceTrack().
    navigator.mediaDevices.getDisplayMedia = async () => {
      const stream = instrumentStops(await original({ video: { width: 1280, height: 720 }, audio: false }), "supportroom:test-stopped-display-tracks");
      Object.defineProperty(window, "supportTestDisplayStream", { value: stream, configurable: true });
      return stream;
    };
  }, tone);
}

async function startCall(context: BrowserContext, host: Page, options: { customerCameraOff?: boolean; hostCameraOff?: boolean; tone?: boolean } = {}) {
  const customer = await context.newPage();
  await Promise.all([trackLocalMedia(host, options.tone), trackLocalMedia(customer, options.tone)]);

  await host.goto("/dashboard");
  await host.getByRole("button", { name: "New room" }).click();
  await host.getByLabel("Reference").fill("WebRTC browser test");
  await host.getByRole("button", { name: "Create room" }).click();
  const invitation = await host.getByText(/^http:\/\/127\.0\.0\.1:3100\/join\//).textContent();
  expect(invitation).toBeTruthy();
  await host.getByRole("button", { name: "Open room" }).click();
  await host.getByRole("button", { name: "Start camera" }).click();
  await expect(host.getByTestId("local-video").locator("video")).toHaveJSProperty("paused", false);
  if (options.hostCameraOff) await host.getByRole("button", { name: "Turn off camera", exact: true }).click();

  await customer.goto(invitation!);
  await customer.getByRole("button", { name: "Start preview" }).click();
  if (options.customerCameraOff) await customer.getByRole("switch", { name: "Toggle Camera", exact: true }).click();
  await customer.getByLabel("Your name").fill("Jordan Taylor");
  await customer.getByRole("button", { name: "Ask to join" }).click();

  await expect(host.getByText("Jordan Taylor is waiting to join")).toBeVisible();

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

async function receivedEnergy(page: Page) {
  return page.evaluate(async () => {
    const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.at(-1)!;
    let energy = 0;
    (await peer.getStats()).forEach((stat) => {
      if (stat.type === "inbound-rtp" && stat.kind === "audio") energy += stat.totalAudioEnergy ?? 0;
    });
    return energy;
  });
}

for (const hostCameraOff of [false, true]) test(`customer camera can start after joining with camera off (host camera ${hostCameraOff ? "off" : "on"})`, async ({ context, page: host }) => {
  const customer = await startCall(context, host, { customerCameraOff: true, hostCameraOff });
  await expect(host.getByTestId("remote-video").getByText("Camera is off")).toBeVisible();
  await customer.getByRole("button", { name: "Turn on camera", exact: true }).click();
  await expect(host.getByTestId("remote-video").locator("video")).toBeVisible();
  await expect(host.getByTestId("remote-video").locator("video")).toHaveAttribute("aria-hidden", "false");
  const bytes = await inboundBytes(host, "video");
  await expect.poll(() => inboundBytes(host, "video")).toBeGreaterThan(bytes);
  if (hostCameraOff) {
    await host.getByRole("button", { name: "Turn on camera", exact: true }).click();
    await expect(customer.getByTestId("remote-video").locator("video")).toHaveAttribute("aria-hidden", "false");
    await expect.poll(() => inboundBytes(customer, "video")).toBeGreaterThan(0);
  }
  for (const page of [host, customer]) {
    expect(await page.evaluate(() => {
      const peers = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers;
      return { peers: peers.length, directions: peers[0].getTransceivers().map((item) => item.currentDirection) };
    })).toEqual({ peers: 1, directions: ["sendrecv", "sendrecv"] });
  }
});

test("repeated microphone and camera toggles restore received media on both sides", async ({ context, page: host }) => {
  test.setTimeout(90_000);
  const customer = await startCall(context, host, { tone: true });
  for (const [sender, receiver] of [[host, customer], [customer, host]]) {
    await expect.poll(() => receivedEnergy(receiver)).toBeGreaterThan(0.001);
    for (let cycle = 0; cycle < 3; cycle++) {
      await sender.getByRole("button", { name: "Mute microphone", exact: true }).click();
      await sender.getByRole("button", { name: "Turn off camera", exact: true }).click();
      await expect(receiver.getByTestId("remote-video").getByText("Camera is off")).toBeVisible();
      // Give buffered media a moment to drain, then check that muted audio is silent.
      await expect.poll(async () => {
        const before = await receivedEnergy(receiver);
        await new Promise((resolve) => setTimeout(resolve, 200));
        return (await receivedEnergy(receiver)) - before;
      }).toBeLessThan(0.00001);
      await sender.getByRole("button", { name: "Unmute microphone", exact: true }).click();
      const energy = await receivedEnergy(receiver);
      await expect.poll(() => receivedEnergy(receiver)).toBeGreaterThan(energy + 0.001);
      await sender.getByRole("button", { name: "Turn on camera", exact: true }).click();
      await expect(receiver.getByTestId("remote-video").locator("video")).toBeVisible();
      await expect(receiver.getByTestId("remote-video").locator("video")).toHaveAttribute("aria-hidden", "false");
      const bytes = await inboundBytes(receiver, "video");
      await expect.poll(() => inboundBytes(receiver, "video")).toBeGreaterThan(bytes);
      await expect(receiver.getByTestId("remote-video").locator("video")).toHaveJSProperty("paused", false);
    }
    expect(await sender.evaluate(() => (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers.length)).toBe(1);
  }
});

test("unmute reacquires a microphone that ended while muted", async ({ context, page: host }) => {
  const customer = await startCall(context, host, { tone: true });
  await expect.poll(() => receivedEnergy(customer)).toBeGreaterThan(0.001);
  await host.getByRole("button", { name: "Mute microphone", exact: true }).click();
  const previous = await host.evaluate(() => {
    const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers[0];
    const track = peer.getSenders().find((sender) => sender.track?.kind === "audio")!.track!;
    const videoId = peer.getSenders().find((sender) => sender.track?.kind === "video")!.track!.id;
    // stop() intentionally does not emit ended: exercise a click observing an
    // ended track before the browser's device-loss event handler has run.
    track.stop();
    return { audioId: track.id, videoId };
  });
  await host.getByRole("button", { name: "Unmute microphone", exact: true }).click();
  await expect.poll(() => host.evaluate(() => {
    const peer = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers[0];
    return peer.getSenders().find((sender) => sender.track?.kind === "audio")?.track?.id;
  })).not.toBe(previous.audioId);
  const energy = await receivedEnergy(customer);
  await expect.poll(() => receivedEnergy(customer)).toBeGreaterThan(energy + 0.001);
  expect(await host.evaluate(() => {
    const peers = (window as unknown as { supportTestPeers: RTCPeerConnection[] }).supportTestPeers;
    return { count: peers.length, videoId: peers[0].getSenders().find((sender) => sender.track?.kind === "video")?.track?.id };
  })).toEqual({ count: 1, videoId: previous.videoId });
});

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
    await expect.poll(() => page.evaluate(() => Number(sessionStorage.getItem("supportroom:test-wake-lock-requests") ?? 0))).toBeGreaterThanOrEqual(1);
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
  await expect(host.getByTestId("diagnostic-jitter")).not.toHaveText("—");
  await expect(host.getByTestId("diagnostic-packet-loss")).not.toHaveText("—");
  await expect(host.getByTestId("diagnostic-health")).toHaveText(/Excellent|Good|Fair|Poor/);
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
  await expect.poll(() => customer.evaluate(() => Number(sessionStorage.getItem("supportroom:test-wake-lock-releases") ?? 0))).toBeGreaterThanOrEqual(1);

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
