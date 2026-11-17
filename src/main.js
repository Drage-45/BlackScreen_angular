"use strict";
/* BlackScreen Cinema - logica de la aplicacion.
   Persistencia en localStorage (sin backend). Contrasenas con SHA-256: solo para fines academicos. */
const CINEMA_NAME = 'BlackScreen';
const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COLS = 8;
const CAPACITY = ROWS.length * COLS;
const DAYS_AHEAD = 5;
const MOVIES = [
    { id: 1, title: 'Inception', genre: 'Ciencia ficcion', duration: '148 min', rating: 'B',
        synopsis: 'Un ladron especializado en robar secretos desde los suenos recibe una tarea imposible: implantar una idea en la mente de un heredero.',
        trailer: 'YoHD9XEInc0', colors: ['#2b1b5e', '#7c4dff'] },
    { id: 2, title: 'Interstellar', genre: 'Ciencia ficcion', duration: '169 min', rating: 'B',
        synopsis: 'Un grupo de astronautas viaja a traves de un agujero de gusano en busca de un nuevo hogar para la humanidad.',
        trailer: 'zSWdZVtXT7E', colors: ['#10163a', '#5a6bd8'] },
    { id: 3, title: 'The Dark Knight', genre: 'Accion', duration: '152 min', rating: 'B15',
        synopsis: 'Batman se enfrenta al Joker, un criminal que sume a Gotham en el caos y pone a prueba los limites del heroe.',
        trailer: 'EXeTwQWrcwY', colors: ['#14121c', '#4a3a78'] },
    { id: 4, title: 'Dune', genre: 'Aventura', duration: '155 min', rating: 'B',
        synopsis: 'Paul Atreides viaja al planeta desertico Arrakis, donde su familia queda en medio de una guerra por el recurso mas valioso del universo.',
        trailer: 'n9xhJrPXop4', colors: ['#4a2340', '#c2497f'] },
    { id: 5, title: 'Parasite', genre: 'Drama', duration: '132 min', rating: 'C',
        synopsis: 'Una familia sin recursos se infiltra poco a poco en la vida de una familia adinerada, con consecuencias inesperadas.',
        trailer: '5xH0HfJHsaY', colors: ['#1d2a3a', '#7a52c7'] },
    { id: 6, title: 'Joker', genre: 'Drama', duration: '122 min', rating: 'C',
        synopsis: 'Arthur Fleck, un comediante fracasado, se transforma lentamente en el criminal conocido como Joker.',
        trailer: 'zAGVQLHvwOY', colors: ['#3a1330', '#9b3f9f'] },
    { id: 7, title: 'The Matrix', genre: 'Ciencia ficcion', duration: '136 min', rating: 'B15',
        synopsis: 'Un programador descubre que la realidad es una simulacion y se une a una rebelion contra las maquinas.',
        trailer: 'vKQi3bBA1y8', colors: ['#0e1a1a', '#5b34c9'] },
];
const TIME_SLOTS = ['13:00', '15:30', '18:00', '20:30', '22:45'];
/* ---------- Utilidades ---------- */
const $ = (sel) => {
    const el = document.querySelector(sel);
    if (!el)
        throw new Error(`No se encontro ${sel}`);
    return el;
};
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    }
    catch {
        return fallback;
    }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
};
const fmtLongDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const hashStr = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};
async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
/* ---------- Funciones (horarios) y asientos ---------- */
function buildShowtimes() {
    const list = [];
    const now = new Date();
    for (let d = 0; d < DAYS_AHEAD; d++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
        const iso = toISO(day);
        MOVIES.forEach((m, i) => {
            for (let k = 0; k < 3; k++) {
                const time = TIME_SLOTS[(i + k * 2 + d) % TIME_SLOTS.length];
                const [h, min] = time.split(':').map(Number);
                const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, min);
                if (start.getTime() <= now.getTime())
                    continue; // funcion ya iniciada
                const room = ((i + k) % 5) + 1;
                const id = `${m.id}-${iso}-${time}`;
                if (!list.some(s => s.date === iso && s.time === time && s.room === room)) {
                    list.push({ id, movieId: m.id, date: iso, time, room });
                }
            }
        });
    }
    return list;
}
const SHOWTIMES = buildShowtimes();
/** Asientos ocupados por funcion. Se siembran de forma determinista la primera vez. */
function takenSeats(showId) {
    const store = load('bs_seats', {});
    if (!store[showId]) {
        const all = ROWS.flatMap(r => Array.from({ length: COLS }, (_, i) => `${r}${i + 1}`));
        const seed = hashStr(showId);
        store[showId] = all.filter((_, i) => hashStr(`${seed}-${i}`) % 100 < 22);
        save('bs_seats', store);
    }
    return store[showId];
}
function occupy(showId, seats) {
    const store = load('bs_seats', {});
    store[showId] = [...takenSeats(showId), ...seats];
    save('bs_seats', store);
}
const available = (showId) => CAPACITY - takenSeats(showId).length;
/* ---------- Estado ---------- */
let session = load('bs_session', null); // correo
let currentMovie = null;
let selectedDate = '';
let selectedShow = null;
let selectedSeats = [];
const getUsers = () => load('bs_users', []);
const getUser = () => getUsers().find(u => u.email === session);
const getTickets = () => load('bs_tickets', []);
/* ---------- Tema ---------- */
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('#themeBtn').textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    save('bs_theme', theme);
}
/* ---------- Interfaz base ---------- */
function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    window.setTimeout(() => { t.hidden = true; }, 2800);
}
function openModal(html, narrow = false) {
    const m = $('#modal');
    m.innerHTML = `<div class="modal ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true">
    <button class="close" data-action="close" aria-label="Cerrar">&times;</button>${html}</div>`;
    m.hidden = false;
}
function closeModal() {
    $('#modal').hidden = true;
    $('#modal').innerHTML = '';
    currentMovie = null;
    selectedShow = null;
    selectedSeats = [];
}
function renderUserZone() {
    const zone = $('#userZone');
    const user = getUser();
    if (!user) {
        zone.innerHTML = `<button class="btn" data-action="auth">Iniciar sesion</button>`;
        return;
    }
    zone.innerHTML = `<div class="user-menu" id="userMenu">
    <button class="btn ghost" data-action="toggle-menu">${esc(user.name)}</button>
    <div class="user-dropdown">
      <div class="who"><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></div>
      <button data-action="history">Mis boletos</button>
      <button data-action="logout">Cerrar sesion</button>
    </div>
  </div>`;
}
function renderMovies() {
    $('#movies').innerHTML = MOVIES.map(m => `
    <article class="card">
      <div class="poster" style="background: linear-gradient(160deg, ${m.colors[0]}, ${m.colors[1]})">
        <span class="tag">${esc(m.genre)}</span>
        <h3>${esc(m.title)}</h3>
      </div>
      <div class="card-body">
        <div class="meta"><span>${m.duration}</span><span>Clasificacion ${m.rating}</span></div>
        <button class="btn" data-action="movie" data-id="${m.id}">Ver detalles y comprar</button>
      </div>
    </article>`).join('');
}
/* ---------- Autenticacion ---------- */
function openAuth(mode = 'login') {
    const reg = mode === 'register';
    openModal(`
    <h2>${reg ? 'Crear cuenta' : 'Iniciar sesion'}</h2>
    <div class="tabs">
      <button class="chip ${reg ? '' : 'active'}" data-action="auth-tab" data-mode="login">Entrar</button>
      <button class="chip ${reg ? 'active' : ''}" data-action="auth-tab" data-mode="register">Registrarme</button>
    </div>
    <form id="authForm" data-mode="${mode}" novalidate>
      ${reg ? `<div class="field"><label for="aName">Nombre</label><input id="aName" autocomplete="name"></div>` : ''}
      <div class="field"><label for="aMail">Correo electronico</label><input id="aMail" type="email" autocomplete="email"></div>
      <div class="field"><label for="aPass">Contrasena</label><input id="aPass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
      <div class="error" id="authError"></div>
      <button class="btn" type="submit" style="width:100%">${reg ? 'Registrarme' : 'Entrar'}</button>
    </form>`, true);
}
async function handleAuth(form) {
    const mode = form.dataset.mode;
    const email = form.querySelector('#aMail').value.trim().toLowerCase();
    const pass = form.querySelector('#aPass').value;
    const err = $('#authError');
    const fail = (m) => { err.textContent = m; };
    if (!/^\S+@\S+\.\S+$/.test(email))
        return fail('Ingresa un correo valido.');
    if (pass.length < 6)
        return fail('La contrasena debe tener al menos 6 caracteres.');
    const hash = await sha256(pass);
    const users = getUsers();
    if (mode === 'register') {
        const name = form.querySelector('#aName').value.trim();
        if (name.length < 2)
            return fail('Ingresa tu nombre.');
        if (users.some(u => u.email === email))
            return fail('Ese correo ya esta registrado.');
        users.push({ name, email, hash });
        save('bs_users', users);
    }
    else {
        const u = users.find(x => x.email === email);
        if (!u || u.hash !== hash)
            return fail('Correo o contrasena incorrectos.');
    }
    session = email;
    save('bs_session', session);
    const pendingMovie = currentMovie;
    closeModal();
    renderUserZone();
    toast(`Bienvenido, ${getUser()?.name ?? ''}`);
    if (pendingMovie)
        openMovie(pendingMovie.id);
}
function logout() {
    session = null;
    localStorage.removeItem('bs_session');
    renderUserZone();
    toast('Sesion cerrada');
}
/* ---------- Detalle, funciones y compra ---------- */
function openMovie(id) {
    const movie = MOVIES.find(m => m.id === id);
    if (!movie)
        return;
    currentMovie = movie;
    selectedShow = null;
    selectedSeats = [];
    const dates = [...new Set(SHOWTIMES.filter(s => s.movieId === id).map(s => s.date))];
    selectedDate = dates[0] ?? '';
    renderMovieModal(dates);
}
function renderMovieModal(dates) {
    const m = currentMovie;
    if (!m)
        return;
    const shows = SHOWTIMES.filter(s => s.movieId === m.id && s.date === selectedDate);
    const dateChips = dates.map(d => `<button class="chip ${d === selectedDate ? 'active' : ''}" data-action="date" data-date="${d}">${fmtDate(d)}</button>`).join('');
    const showChips = shows.map(s => {
        const left = available(s.id);
        return `<button class="chip ${selectedShow?.id === s.id ? 'active' : ''} ${left === 0 ? 'soldout' : ''}"
      data-action="show" data-id="${s.id}">${s.time}<small>Sala ${s.room} - ${left} libres</small></button>`;
    }).join('') || '<p class="empty">No hay funciones disponibles para este dia.</p>';
    openModal(`
    <h2>${esc(m.title)}</h2>
    <iframe class="trailer" src="https://www.youtube.com/embed/${m.trailer}" title="Trailer de ${esc(m.title)}"
      allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>
    <p class="synopsis">${esc(m.synopsis)}<br><br>${esc(m.genre)} &middot; ${m.duration} &middot; Clasificacion ${m.rating}</p>
    <div class="section-title">Fecha</div><div class="chips">${dateChips}</div>
    <div class="section-title">Funcion</div><div class="chips">${showChips}</div>
    <div id="seatZone"></div>`);
    if (selectedShow)
        renderSeats();
}
function renderSeats() {
    const show = selectedShow;
    const zone = document.getElementById('seatZone');
    if (!show || !zone)
        return;
    const taken = takenSeats(show.id);
    const rows = ROWS.map(r => `<div class="seat-row"><span class="row-label">${r}</span>${Array.from({ length: COLS }, (_, i) => {
        const seat = `${r}${i + 1}`;
        const isTaken = taken.includes(seat);
        const sel = selectedSeats.includes(seat);
        return `<button class="seat ${sel ? 'selected' : ''}" data-action="seat" data-seat="${seat}" ${isTaken ? 'disabled' : ''}
        aria-label="Asiento ${seat}">${i + 1}</button>`;
    }).join('')}</div>`).join('');
    zone.innerHTML = `
    <div class="section-title">Asientos - Sala ${show.room} (${available(show.id)} disponibles)</div>
    <div class="screen">PANTALLA</div>
    <div class="seats">${rows}</div>
    <div class="legend">
      <span><i style="background:var(--seat-free)"></i>Libre</span>
      <span><i style="background:var(--accent)"></i>Seleccionado</span>
      <span><i style="background:var(--seat-taken)"></i>Ocupado</span>
    </div>
    <div class="summary">
      <div class="info">
        <b>${fmtLongDate(show.date)}</b> a las <b>${show.time}</b><br>
        Asientos: <b>${selectedSeats.length ? selectedSeats.join(', ') : 'ninguno'}</b>
      </div>
      <button class="btn accent" data-action="buy" ${selectedSeats.length ? '' : 'disabled'}>Comprar boletos</button>
    </div>`;
}
function buyTickets() {
    const user = getUser();
    const movie = currentMovie;
    const show = selectedShow;
    if (!movie || !show || !selectedSeats.length)
        return;
    if (!user) {
        toast('Inicia sesion para comprar');
        openAuthKeepingMovie();
        return;
    }
    // Revalidar disponibilidad antes de confirmar
    const taken = takenSeats(show.id);
    if (selectedSeats.some(s => taken.includes(s))) {
        selectedSeats = selectedSeats.filter(s => !taken.includes(s));
        toast('Algunos asientos ya no estan disponibles');
        renderSeats();
        return;
    }
    occupy(show.id, selectedSeats);
    const now = new Date().toISOString();
    const bought = selectedSeats.map(seat => ({
        code: `BS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        email: user.email, movieTitle: movie.title, seat, room: show.room,
        date: show.date, time: show.time, purchasedAt: now,
    }));
    save('bs_tickets', [...getTickets(), ...bought]);
    selectedSeats = [];
    showPurchased(bought);
}
function openAuthKeepingMovie() {
    const keep = currentMovie;
    openAuth('login');
    currentMovie = keep; // para reabrir la funcion tras iniciar sesion
}
/* ---------- Boletos ---------- */
function ticketHTML(t) {
    return `<div class="ticket">
    <div class="ticket-head"><h1>Black<span>Screen</span></h1><p>Boleto de entrada</p></div>
    <div class="ticket-body">
      <div class="movie">${esc(t.movieTitle)}</div>
      <div class="ticket-grid">
        <div><small>Sala</small><strong>${t.room}</strong></div>
        <div><small>Asiento</small><strong>${esc(t.seat)}</strong></div>
        <div><small>Fecha</small><strong>${fmtDate(t.date)}</strong></div>
        <div><small>Hora</small><strong>${t.time}</strong></div>
      </div>
    </div>
    <div class="ticket-foot">${CINEMA_NAME.toUpperCase()} CINEMA &middot; CODIGO ${t.code}</div>
  </div>`;
}
function printTickets(tickets) {
    $('#printArea').innerHTML = tickets.map(ticketHTML).join('');
    window.print();
}
function showPurchased(tickets) {
    openModal(`
    <h2>Compra realizada</h2>
    <div class="ticket-preview">
      ${tickets.map(ticketHTML).join('')}
      <button class="btn" data-action="print-codes" data-codes="${tickets.map(t => t.code).join(',')}">Imprimir boleto${tickets.length > 1 ? 's' : ''}</button>
    </div>`);
}
function openHistory() {
    const mine = getTickets().filter(t => t.email === session).reverse();
    const body = mine.length
        ? `<div class="history">${mine.map(t => `
        <div class="history-item">
          <div>
            <h4>${esc(t.movieTitle)}</h4>
            <p>Sala ${t.room} &middot; Asiento ${esc(t.seat)}<br>${fmtLongDate(t.date)}, ${t.time}<br>Codigo ${t.code}</p>
          </div>
          <button class="btn ghost small" data-action="print-codes" data-codes="${t.code}">Imprimir</button>
        </div>`).join('')}</div>`
        : '<p class="empty">Aun no has comprado boletos.</p>';
    openModal(`<h2>Historial de boletos</h2><p class="synopsis">Usuario: ${esc(getUser()?.name ?? '')}</p>${body}`);
}
/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
    const target = ev.target;
    const menu = document.getElementById('userMenu');
    if (menu && !menu.contains(target))
        menu.classList.remove('open');
    if (target.id === 'modal')
        return closeModal(); // clic en el fondo
    const el = target.closest('[data-action]');
    if (!el)
        return;
    const d = el.dataset;
    switch (d.action) {
        case 'close':
            closeModal();
            break;
        case 'auth':
            openAuth('login');
            break;
        case 'auth-tab': {
            const keep = currentMovie;
            openAuth(d.mode === 'register' ? 'register' : 'login');
            currentMovie = keep;
            break;
        }
        case 'toggle-menu':
            $('#userMenu').classList.toggle('open');
            break;
        case 'logout':
            logout();
            break;
        case 'history':
            $('#userMenu').classList.remove('open');
            openHistory();
            break;
        case 'movie':
            openMovie(Number(d.id));
            break;
        case 'date': {
            selectedDate = d.date ?? '';
            selectedShow = null;
            selectedSeats = [];
            const dates = [...new Set(SHOWTIMES.filter(s => s.movieId === currentMovie?.id).map(s => s.date))];
            renderMovieModal(dates);
            break;
        }
        case 'show': {
            selectedShow = SHOWTIMES.find(s => s.id === d.id) ?? null;
            selectedSeats = [];
            const dates = [...new Set(SHOWTIMES.filter(s => s.movieId === currentMovie?.id).map(s => s.date))];
            renderMovieModal(dates);
            document.getElementById('seatZone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
        }
        case 'seat': {
            const seat = d.seat ?? '';
            selectedSeats = selectedSeats.includes(seat) ? selectedSeats.filter(s => s !== seat) : [...selectedSeats, seat];
            renderSeats();
            break;
        }
        case 'buy':
            buyTickets();
            break;
        case 'print-codes': {
            const codes = (d.codes ?? '').split(',');
            printTickets(getTickets().filter(t => codes.includes(t.code)));
            break;
        }
    }
});
document.addEventListener('submit', ev => {
    const form = ev.target;
    if (form.id === 'authForm') {
        ev.preventDefault();
        void handleAuth(form);
    }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape')
    closeModal(); });
$('#themeBtn').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
$('#brand').addEventListener('click', ev => { ev.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
/* ---------- Inicio ---------- */
applyTheme(load('bs_theme', 'dark'));
renderMovies();
renderUserZone();
