/* PlayZyro shared functional core - GitHub/Cloudflare stage demo data layer.
   Demo only: all data lives in this browser (localStorage). Real accounts,
   tournaments and room credentials are created through the site's own flows.
   Mirrors the later WordPress tables: users, squads, tournaments, events,
   applications, assignments, rooms. */
window.PZ_VERSION = '2026-11-20n';
(function () {
  var V = window.PZ_VARIANT || 'vx';
  var KEY = 'pz_' + V + '_db_v1';
  var SKEY = 'pz_' + V + '_session_v1';

  function uid(p) { return p + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function code() { return 'PZ-' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase(); }

  function seed() {
    var users = [
      { id: 'u_admin', username: 'demo_admin', email: 'demo-admin@example.local', pass: 'demo1234', role: 'admin' },
      { id: 'u_player', username: 'DemoPlayer', email: 'demo-player@example.local', pass: 'demo1234', role: 'user' },
      { id: 'u_m2', username: 'DemoMember2', email: 'demo-member2@example.local', pass: 'demo1234', role: 'user' },
      { id: 'u_m3', username: 'DemoMember3', email: 'demo-member3@example.local', pass: 'demo1234', role: 'user' },
      { id: 'u_m4', username: 'DemoMember4', email: 'demo-member4@example.local', pass: 'demo1234', role: 'user' }
    ];
    var squads = [
      { id: 's_demo', name: 'Demo Squad (Example)', captainId: 'u_player', memberIds: ['u_player', 'u_m2', 'u_m3', 'u_m4'], joinCode: 'PZ-DEMO1' }
    ];
    var tournaments = [
      { id: 't1', name: 'Demo Tournament 1 (Example)', dateText: 'Date to be confirmed', timeText: '', mode: 'Squad', status: 'Registration Open', slots: '' },
      { id: 't2', name: 'Demo Tournament 2 (Example)', dateText: 'Date to be confirmed', timeText: '', mode: 'Squad', status: 'Upcoming', slots: '' },
      { id: 't3', name: 'Demo Tournament 3 (Example)', dateText: 'Date to be confirmed', timeText: '', mode: 'Squad', status: 'Upcoming', slots: '' }
    ];
    var events = [
      { id: 'e1', title: 'Demo Event 1 (Example)', dateText: 'Date to be confirmed' },
      { id: 'e2', title: 'Demo Event 2 (Example)', dateText: 'Date to be confirmed' }
    ];
    return { users: users, squads: squads, tournaments: tournaments, events: events, applications: [], assignments: [], rooms: {} };
  }

  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    var db = seed(); save(db); return db;
  }
  function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

  var PZ = {
    db: load(),
    save: function () { save(PZ.db); },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    qs: function (n) { return new URLSearchParams(location.search).get(n); },
    user: function (id) { return PZ.db.users.find(function (u) { return u.id === id; }) || null; },
    session: function () { try { var id = localStorage.getItem(SKEY); return id ? PZ.user(id) : null; } catch (e) { return null; } },
    login: function (who, pass) {
      var u = PZ.db.users.find(function (x) { return (x.username.toLowerCase() === String(who).toLowerCase() || x.email.toLowerCase() === String(who).toLowerCase()) && x.pass === pass; });
      if (!u || u.banned) return null;
      try { localStorage.setItem(SKEY, u.id); } catch (e) {}
      return u;
    },
    signup: function (username, email, pass) {
      if (PZ.db.users.some(function (x) { return x.username.toLowerCase() === username.toLowerCase() || x.email.toLowerCase() === email.toLowerCase(); })) return { error: 'That username or email is already registered. Log in instead.' };
      var u = { id: uid('u_'), username: username, email: email, pass: pass, role: 'user' };
      PZ.db.users.push(u); PZ.save();
      try { localStorage.setItem(SKEY, u.id); } catch (e) {}
      return { user: u };
    },
    logout: function () { try { localStorage.removeItem(SKEY); } catch (e) {} location.href = 'index.html'; },
    mySquad: function (userId) { return PZ.db.squads.find(function (s) { return s.memberIds.indexOf(userId) > -1; }) || null; },
    createSquad: function (user, name) {
      if (PZ.mySquad(user.id)) return { error: 'You already have an active squad. One active squad per user.' };
      var s = { id: uid('s_'), name: name, captainId: user.id, memberIds: [user.id], joinCode: code() };
      PZ.db.squads.push(s); PZ.save(); return { squad: s };
    },
    joinSquad: function (user, joinCode) {
      var s = PZ.db.squads.find(function (x) { return x.joinCode.toUpperCase() === String(joinCode).trim().toUpperCase(); });
      if (!s) return { error: 'No squad found with that code. Check the code and try again.' };
      if (PZ.mySquad(user.id)) return { error: 'You already have an active squad. One active squad per user.' };
      if (s.memberIds.length >= 5) return { error: 'That squad is full (5 members maximum).' };
      s.memberIds.push(user.id); PZ.save(); return { squad: s };
    },
    apply: function (squad, tournamentId) {
      if (!squad) return { error: 'Create or join a squad first, then apply.' };
      if (squad.memberIds.length < 4) return { error: 'Your squad needs at least 4 members (captain + 3) to apply. Your squad has ' + squad.memberIds.length + '.' };
      if (PZ.db.applications.some(function (a) { return a.squadId === squad.id && a.tournamentId === tournamentId; })) return { error: 'Your squad has already applied for this tournament.' };
      PZ.db.applications.push({ id: uid('a_'), squadId: squad.id, tournamentId: tournamentId, status: 'Pending' }); PZ.save();
      return { ok: true };
    },
    appliedSquadIds: function (tournamentId) { return PZ.db.applications.filter(function (a) { return a.tournamentId === tournamentId; }).map(function (a) { return a.squadId; }); },
    assignedSquadIds: function (tournamentId) { return PZ.db.assignments.filter(function (a) { return a.tournamentId === tournamentId; }).map(function (a) { return a.squadId; }); },
    isAssigned: function (squadId, tournamentId) { return PZ.db.assignments.some(function (a) { return a.squadId === squadId && a.tournamentId === tournamentId; }); },
    assign: function (tournamentId, squadId) {
      if (PZ.isAssigned(squadId, tournamentId)) return;
      PZ.db.assignments.push({ id: uid('as_'), tournamentId: tournamentId, squadId: squadId });
      var app = PZ.db.applications.find(function (a) { return a.squadId === squadId && a.tournamentId === tournamentId; });
      if (app) app.status = 'Assigned';
      PZ.save();
    },
    publishRoom: function (tournamentId, roomId, password) { PZ.db.rooms[tournamentId] = { roomId: roomId, password: password, published: true }; PZ.save(); },
    roomFor: function (user, tournamentId) {
      var room = PZ.db.rooms[tournamentId];
      if (!room || !room.published) return null;
      var s = PZ.mySquad(user.id);
      if (!s || !PZ.isAssigned(s.id, tournamentId)) return null;
      return room;
    },
    myTournaments: function (user) {
      var s = PZ.mySquad(user.id); if (!s) return [];
      var ids = {};
      PZ.db.applications.filter(function (a) { return a.squadId === s.id; }).forEach(function (a) { ids[a.tournamentId] = true; });
      PZ.db.assignments.filter(function (a) { return a.squadId === s.id; }).forEach(function (a) { ids[a.tournamentId] = true; });
      return PZ.db.tournaments.filter(function (t) { return ids[t.id]; });
    },
    toast: function (msg) {
      var t = document.createElement('div'); t.className = 'pz-toast'; t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.classList.add('show'); }, 10);
      setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3200);
    },
    requireAuth: function () { var u = PZ.session(); if (!u) { location.href = 'auth.html?next=' + encodeURIComponent(location.pathname.split('/').pop()); return null; } return u; },
    mountUserChip: function () {
      var u = PZ.session();
      document.querySelectorAll('[data-user-chip]').forEach(function (el) {
        if (u) { el.innerHTML = PZ.esc(u.username) + ' &nbsp;<a href="#" data-logout style="color:inherit;text-decoration:underline">Log out</a>'; }
        else { el.innerHTML = '<a href="auth.html" style="color:inherit">Log in / Sign up</a>'; }
      });
      document.querySelectorAll('[data-logout]').forEach(function (el) { el.addEventListener('click', function (e) { e.preventDefault(); PZ.logout(); }); });
    }
  };
  window.PZ = PZ;
  document.addEventListener('DOMContentLoaded', function () { PZ.mountUserChip(); });
  /* Mobile drawer: slide-in panel with backdrop, wired once for every page. */
  document.addEventListener('DOMContentLoaded', function () {
    var drawer = document.querySelector('[data-drawer]');
    if (!drawer) return;
    var backdrop = document.querySelector('[data-drawer-backdrop]');
    var toggles = document.querySelectorAll('[data-nav-toggle]');
    function setOpen(open) {
      drawer.classList.toggle('open', open);
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (backdrop) backdrop.hidden = !open;
      toggles.forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      document.body.style.overflow = open ? 'hidden' : '';
    }
    toggles.forEach(function (b) { b.addEventListener('click', function () { setOpen(true); }); });
    var closeBtn = drawer.querySelector('[data-drawer-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    if (PZ.session()) {
      var chip = drawer.querySelector('[data-user-chip]');
      if (chip) chip.hidden = false;
      var loginBtn = drawer.querySelector('[data-drawer-login]');
      if (loginBtn) loginBtn.style.display = 'none';
    }
  });
})();

/* ===== PlayZyro Animations R1 (panel-approved, Chat 3) ===== */
(function(){'use strict';
function ready(f){if(document.readyState!=='loading')f();else document.addEventListener('DOMContentLoaded',f);}
function each(sel,fn){document.querySelectorAll(sel).forEach(fn);}
ready(function(){
/* S3 FAQ: height-animated accordion, single-open (panel ruling) */
  (function(){
    var items=Array.prototype.slice.call(document.querySelectorAll('.faq-item')); if(!items.length)return;
    function wrapOf(it){return it.querySelector('.pz-faq-a');}
    function innerOf(it){return it.querySelector('.pz-faq-in');}
    function slide(it,to){
      var w=wrapOf(it); if(!w)return;
      var from=w.getBoundingClientRect().height;
      w.style.height=to+'px';
      if(w.animate){var an=w.animate([{height:from+'px'},{height:to+'px'}],{duration:290,easing:'ease-in-out'}); if(an&&an.finished)an.finished.catch(function(){});}
    }
    items.forEach(function(it,idx){
      var h=it.querySelector('h3'); if(!h)return;
      h.classList.add('pz-faq-q');
      if(!h.querySelector('.pz-chev')){var c=document.createElement('span');c.className='pz-chev';c.textContent='';h.appendChild(c);}
      var p=it.querySelector('p');
      if(p && !p.closest('.pz-faq-a')){var w=document.createElement('div');w.className='pz-faq-a';var inn=document.createElement('div');inn.className='pz-faq-in';p.parentNode.insertBefore(w,p);w.appendChild(inn);inn.appendChild(p);}
      var w2=wrapOf(it); if(!w2)return;
      w2.style.display='block'; w2.style.overflow='hidden'; w2.style.height='0px';
      if(idx===0){it.classList.add('pz-open'); w2.style.height=innerOf(it).scrollHeight+'px';}
      h.addEventListener('click',function(){
        var open=it.classList.contains('pz-open');
        items.forEach(function(o){ if(o!==it && o.classList.contains('pz-open')){ o.classList.remove('pz-open'); slide(o,0);} });
        if(open){ it.classList.remove('pz-open'); slide(it,0); }
        else { it.classList.add('pz-open'); slide(it, innerOf(it).scrollHeight); }
      });
    });
  })();

    /* S2 slider motion / champion emphasis rotation */
  
  (function(){
    var box=document.querySelector('#champStrip');
    if(!box||box.getAttribute('data-pz-slider'))return;
    box.setAttribute('data-pz-slider','1');
    var prog=document.createElement('div');prog.className='pz-prog';prog.innerHTML='<i></i>';
    box.parentNode.insertBefore(prog,box.nextSibling);
    var fill=prog.querySelector('i');
    function upd(){var max=box.scrollWidth-box.clientWidth;fill.style.width=(max>0?Math.round(box.scrollLeft/max*100):0)+'%';}
    box.addEventListener('scroll',upd,{passive:true});upd();
    var paused=false,resume=null;
    function pause(){paused=true;if(resume)clearTimeout(resume);resume=setTimeout(function(){paused=false;},9000);}
    box.addEventListener('pointerdown',pause);box.addEventListener('touchstart',pause,{passive:true});box.addEventListener('wheel',pause,{passive:true});
    setInterval(function(){
      if(paused||document.hidden)return;
      var max=box.scrollWidth-box.clientWidth;if(max<=10)return;
      if(box.scrollLeft>=max-10)box.scrollTo({left:0,behavior:'smooth'});
      else box.scrollBy({left:240,behavior:'smooth'});
    },5500);
  })();

  /* S1 drawer: Esc closes an open drawer; burger glyph swaps to X while open */
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var bd=document.querySelector('.drawer-backdrop.show,.drawer-backdrop.open,.nav-backdrop');
    var open=document.querySelector('.main-nav.open,.drawer.open')||document.body.classList.contains('nav-open');
    if(open){
      var x=document.querySelector('.drawer.open .drawer-close,.drawer.open .drawer-x,.main-nav.open .drawer-close');
      if(x){x.click();return;}
      if(document.body.classList.contains('nav-open')){var t=document.querySelector('.nav-toggle');if(t)t.click();return;}
      if(bd)bd.click();
    }
  });
  /* O1 copy-code feedback */
  document.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('#copy-code,#copyCode,#copy-btn'):null;
    if(!b)return;
    var old=b.getAttribute('data-pz-old')||b.textContent;
    b.setAttribute('data-pz-old',old); b.textContent='Copied';
    setTimeout(function(){b.textContent=old;},1600);
  });
  /* O3 form message bars: gentle fade-in when a .msg gains text (no shake) */
  var msgSeen=new WeakMap();
  function scanMsg(){each('.msg',function(m){
    var t=m.textContent.trim();
    if(t&&msgSeen.get(m)!==t){msgSeen.set(m,t);m.classList.remove('pz-msg-in');void m.offsetWidth;m.classList.add('pz-msg-in');}
  });}
  scanMsg();
  new MutationObserver(scanMsg).observe(document.body,{childList:true,subtree:true,characterData:true});
  /* O4 tournaments filter/tab crossfade */
  var list=document.querySelector('#cards');
  if(list){setTimeout(function(){
    new MutationObserver(function(){list.classList.remove('pz-swap');void list.offsetWidth;list.classList.add('pz-swap');}).observe(list,{childList:true});
  },900);}
  /* O2 room card: one-time gentle reveal only when credentials are shown (publish state) */
  var room=document.querySelector('.room-box');
  if(room){
    var wrap=room;
    function checkRoom(){
      var t=room.textContent||'';
      if(!/Reveals at match time/i.test(t)&&/(Room ID|Password)/i.test(t)&&t.trim().length>40){wrap.classList.add('pz-reveal');}
    }
    checkRoom();
    new MutationObserver(checkRoom).observe(room,{childList:true,subtree:true,characterData:true});
  }
});
})();

/* PUBG-look update: rotating tournament poster artwork (featured first, no adjacent repeats) */
if (window.PZ) { PZ.posterFor = function (i) { return ['assets/img/art-poster-a.jpg','assets/img/art-poster-b.jpg','assets/img/art-hero.jpg'][((i||0)%3+3)%3]; }; }
