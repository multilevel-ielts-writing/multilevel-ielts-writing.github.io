// offline support: the app opens without internet (AI checks still need internet)
const C = "sayyora-writing-v53";
const M = "yozgin-meta";  // the app keeps here the last day and the streak; the reminder reads it
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "owl-happy.png", "owl-sad.png", "owl-cry.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C && x !== M).map((x) => caches.delete(x))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // pages: network first, so updates arrive at once; files: cache first
  if (e.request.mode === "navigate" || u.pathname.endsWith(".html") || u.pathname.endsWith("config.js")) {
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
  } else {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});
// reminders: the server sends an empty push to learners who have been away for a few days; one kind sentence is shown
const REMIND = [
  "Assalomu alaykum! Bugun bir oz yozib köramizmi? Kiçik qadam ham katta natijaga olib boradi.",
  "Sizni soğindik! Qisqa bir dars sizni kutmoqda, atigi 10 daqiqa yetarli.",
  "Har kungi kiçik maşq imtihonda katta işonç beradi. Davom ettiramizmi?",
  "Yozişni davom ettirişga tayyormisiz? Bugungi topşiriq sizni kutmoqda.",
  "Ilm olişdan töxtamang! Bugun bitta matn yozib, AI'dan fikr oling.",
  "Qaytganingizdan xursand bölamiz. Tuşlikdan keyin bir qisqa maşq qilib olamizmi?"
];
// v53: the owl's face and the words depend on how long the learner has been away
const OWL = {
  keep: ["🔥 {n} kunlik seriyangiz bugun uzilib qolmasin! 5 daqiqalik maşq yetarli.", "{n} kun ketma-ket! Bugun ham bitta qadam qöyamizmi? 🔥", "Seriyangiz {n} kun! Yozgin AI bugun ham sizni kutyapti 🦉"],
  miss: ["Yozgin AI sizni soğindi 🥺 Bugun bitta qisqa dars qilamizmi?", "Kiçik maşq ham katta natija beradi. Qaytib keling, Yozgin AI kutyapti 🦉", "Keça kelmadingiz… Bugun 10 daqiqa yozamizmi? 🥺"],
  long: ["Yozgin AI yiğlayapti 😢 Sizsiz zerikdi. Bitta topşiriq bilan qayting!", "Ancha bölibdi! Yozgin AI hali ham sizni kutyapti. Bugun 10 daqiqa yozamizmi? 🦉", "Imtihon yaqinlaşyapti, Yozgin AI xavotirda 😢 Bugun bitta matn yozing!"]
};
const tdayW = (ms) => new Date((ms || Date.now()) + 5 * 3600000).toISOString().slice(0, 10);
self.addEventListener("push", (e) => {
  let text = "";
  try { text = e.data ? e.data.text() : ""; } catch (x) { text = ""; }
  const day = Math.floor(Date.now() / 864e5), pick = (a) => a[day % a.length];
  e.waitUntil(caches.open(M).then((c) => c.match("./__meta")).then((r) => (r ? r.json() : null)).catch(() => null).then((m) => {
    let icon = "icon-192.png";
    if (!text && m && m.last) {
      const gap = Math.round((Date.parse(tdayW()) - Date.parse(m.last)) / 864e5);
      if (gap <= 1 && m.streak >= 2) { text = pick(OWL.keep).replace("{n}", m.streak); icon = "owl-happy.png"; }
      else if (gap >= 4) { text = pick(OWL.long); icon = "owl-cry.png"; }
      else if (gap >= 2) { text = pick(OWL.miss); icon = "owl-sad.png"; }
    }
    if (!text) text = pick(REMIND);
    try { if (self.navigator && self.navigator.setAppBadge) self.navigator.setAppBadge(1).catch(() => {}); } catch (x) {}
    return self.registration.showNotification("Yozgin AI", { body: text, icon, badge: "icon-192.png", tag: "yozgin-remind", renotify: false, data: { url: "./#/" } });
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || "./");
  }));
});
