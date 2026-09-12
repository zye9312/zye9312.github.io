const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const playerScript = fs.readFileSync(
  path.join(__dirname, "..", "assets", "player", "player.js"),
  "utf8"
);

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.parentNode = null;
    this.hidden = false;
    this.textContent = "";
    this.value = "";
    this.paused = true;
    this.ended = false;
    this.seeking = false;
    this.currentTime = 0;
    this.duration = 120;
    this.currentSrc = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertAdjacentElement(_position, child) {
    return this.appendChild(child);
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  dispatch(type) {
    for (const listener of this.listeners[type] || []) {
      listener({ type, target: this });
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === "src") {
      this.currentSrc = "";
    }
  }

  set src(value) {
    this._src = new URL(value, "https://example.test/videos/show.html").href;
    this.currentSrc = this._src;
    this.ended = false;
  }

  get src() {
    return this._src || "";
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness(options = {}) {
  const video = new FakeElement("video");
  const select = new FakeElement("select");
  const toolbar = new FakeElement("div");
  const picker = new FakeElement("div");
  const videoContainer = new FakeElement("div");
  const wrapper = new FakeElement("main");
  const body = new FakeElement("body");
  picker.appendChild(select);
  toolbar.appendChild(picker);
  videoContainer.appendChild(video);
  wrapper.appendChild(toolbar);
  wrapper.appendChild(videoContainer);

  video.pauseCalls = 0;
  video.playCalls = 0;
  video.playResults = options.playResults || [];
  video.pause = function () {
    this.pauseCalls += 1;
    if (!this.paused) {
      this.paused = true;
      this.dispatch("pause");
    }
  };
  video.play = function () {
    this.playCalls += 1;
    this.paused = false;
    this.dispatch("play");
    return this.playResults.shift() || Promise.resolve();
  };

  const storage = new Map();
  const windowListeners = {};
  const document = {
    body,
    title: "",
    createElement: (tagName) => new FakeElement(tagName),
    getElementById(id) {
      if (id === "my-video") return video;
      if (id === "video-select") return select;
      if (id === "player-toolbar") return toolbar;
      return null;
    },
  };
  const window = {
    location: { pathname: "/videos/show.html", href: "" },
    addEventListener(type, listener) {
      (windowListeners[type] ||= []).push(listener);
    },
  };
  const localStorage = {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
  };
  const warnings = [];
  const context = {
    URL,
    console: { warn: (...args) => warnings.push(args) },
    document,
    localStorage,
    setInterval: () => 1,
    setTimeout: () => 1,
    clearTimeout: () => {},
    sources: [
      { title: "第1集", src: "https://media.test/1.m3u8" },
      { title: "第2集", src: "https://media.test/2.m3u8" },
      { title: "第3集", src: "https://media.test/3.m3u8" },
    ],
    window,
  };
  vm.runInNewContext(playerScript, context, { filename: "player.js" });

  const controls = toolbar.children.find(
    (element) => element.attributes["data-player-state"]
  );
  return { controls, select, toolbar, video, warnings };
}

function switchEpisode(harness, index) {
  harness.select.value = String(index);
  harness.select.dispatch("change");
}

async function run() {
  {
    const harness = createHarness();
    assert.equal(harness.controls.parentNode, harness.toolbar);
    assert.equal(harness.controls.attributes["data-player-state"], "loading");
    assert.equal(harness.controls.attributes["aria-busy"], "true");
    harness.video.dispatch("loadedmetadata");
    assert.equal(harness.controls.attributes["data-player-state"], "ready");
    harness.video.dispatch("canplay");
    assert.equal(harness.controls.attributes["aria-busy"], "false");
    harness.video.paused = false;
    harness.video.dispatch("play");
    harness.video.dispatch("waiting");
    assert.equal(harness.controls.attributes["data-player-state"], "buffering");
    harness.video.dispatch("playing");
    assert.equal(harness.controls.attributes["data-player-state"], "playing");
    harness.video.paused = true;
    harness.video.dispatch("pause");
    assert.equal(harness.controls.attributes["data-player-state"], "paused");
    harness.video.dispatch("error");
    assert.equal(harness.controls.attributes["data-player-state"], "error");
  }

  {
    const harness = createHarness();
    harness.video.paused = false;
    harness.video.dispatch("play");
    harness.video.paused = true;
    harness.video.dispatch("pause");
    assert.equal(
      harness.controls.attributes["data-player-state"],
      "paused",
      "新资源加载期间的真实暂停操作必须生效"
    );
  }

  {
    const harness = createHarness();
    harness.video.paused = false;
    harness.video.dispatch("playing");
    switchEpisode(harness, 1);
    assert.equal(harness.video.pauseCalls, 1, "切集前应显式暂停旧资源");
    assert.equal(harness.video.playCalls, 1, "播放中切集应继续播放新资源");
    assert.equal(harness.video.currentSrc, "https://media.test/2.m3u8");
    assert.equal(harness.controls.attributes["data-player-state"], "loading");
  }

  {
    const harness = createHarness();
    switchEpisode(harness, 1);
    assert.equal(harness.video.pauseCalls, 0, "暂停状态切集无需重复暂停");
    assert.equal(harness.video.playCalls, 0, "暂停状态切集不应擅自播放");
    assert.equal(harness.video.currentSrc, "https://media.test/2.m3u8");
  }

  {
    const firstPlay = deferred();
    const secondPlay = deferred();
    const harness = createHarness({
      playResults: [firstPlay.promise, secondPlay.promise],
    });
    harness.video.paused = false;
    harness.video.dispatch("playing");
    switchEpisode(harness, 1);
    switchEpisode(harness, 2);
    firstPlay.reject(new Error("旧资源播放请求被中止"));
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(harness.video.playCalls, 2, "连续切集均应继承播放意图");
    assert.equal(harness.video.currentSrc, "https://media.test/3.m3u8");
    assert.equal(
      harness.controls.attributes["data-player-state"],
      "loading",
      "旧资源的异步失败不得覆盖新资源状态"
    );
    assert.equal(harness.warnings.length, 0);
    secondPlay.resolve();
  }

  {
    const failedPlay = deferred();
    const harness = createHarness({ playResults: [failedPlay.promise] });
    harness.video.paused = false;
    harness.video.dispatch("playing");
    switchEpisode(harness, 1);
    failedPlay.reject(new Error("自动播放被拒绝"));
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(harness.controls.attributes["data-player-state"], "paused");
    assert.equal(harness.warnings.length, 1);
  }

  {
    const harness = createHarness();
    harness.video.ended = true;
    harness.video.dispatch("ended");
    assert.equal(harness.select.value, "1");
    assert.equal(harness.video.playCalls, 1, "自然结束后下一集应自动播放");
  }

  {
    const harness = createHarness();
    switchEpisode(harness, 2);
    harness.video.ended = true;
    harness.video.dispatch("ended");
    assert.equal(harness.video.currentSrc, "https://media.test/3.m3u8");
    assert.equal(harness.video.playCalls, 0, "最后一集结束后不应重复播放");
    assert.equal(harness.controls.attributes["data-player-state"], "ended");
  }

  console.log("player state tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
