const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'datos.json');
const usersFile = path.join(dataDir, 'users.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]', 'utf8');
if (!fs.existsSync(usersFile)) {
  const defaults = [
    { user:'cliente', pass:'jetxcel2025', role:'client' },
    { user:'admin', pass:'jetxcelAdmin2025', role:'admin' }
  ];
  fs.writeFileSync(usersFile, JSON.stringify(defaults, null, 2), 'utf8');
}

// Root -> index
app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/client.html', (req, res)=> res.sendFile(path.join(__dirname, 'public', 'client.html')));
app.get('/admin.html', (req, res)=> res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Helpers
function loadJSON(p){ try { return JSON.parse(fs.readFileSync(p, 'utf8')||'[]'); } catch(e){ return []; } }
function saveJSON(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function genRadicado(){
  const pad = (n)=> String(n).padStart(2,'0');
  const d = new Date();
  const id = 'JX-' + d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '-' + Math.floor(Math.random()*9000+1000);
  return id;
}

// API: login
app.post('/api/login', (req, res) => {
  const { user, pass, role } = req.body || {};
  try {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
    const found = users.find(u => u.user === user && u.pass === pass && u.role === (role || u.role));
    if (found) return res.json({ success:true, user:found.user, role:found.role });
    return res.status(401).json({ success:false, message:'Usuario/contraseña o rol inválidos' });
  } catch (e) {
    return res.status(500).json({ success:false, message:'Error de servidor' });
  }
});

// API: crear PQRS
app.post('/api/pqrs', (req, res) => {
  try {
    const body = req.body || {};
    const arr = loadJSON(dataFile);
    const radicado = genRadicado();
    const now = new Date().toISOString();
    const record = {
      radicado,
      owner: body.owner || 'cliente',
      nombre: body.nombre||'',
      email: body.email||'',
      tipo: body.tipo||'Petición',
      mensaje: body.mensaje||'',
      fecha: now,
      seguimiento: { estado:'Pendiente', tipoAccion:'Visita técnica', fechaProgramada:null }
    };
    arr.push(record);
    saveJSON(dataFile, arr);
    return res.json({ success:true, radicado });
  } catch (e) {
    return res.status(500).json({ success:false, message:'No se pudo guardar' });
  }
});

// API: listar PQRS
app.get('/api/pqrs', (req, res) => {
  try {
    const scope = req.query.scope || 'mine';
    const user = req.query.user || '';
    const arr = loadJSON(dataFile);
    const out = scope === 'all' ? arr : arr.filter(x => x.owner === user);
    return res.json(out);
  } catch (e) {
    return res.status(500).json([]);
  }
});

// API: actualizar seguimiento (admin)
app.put('/api/pqrs/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { estado, accion, fecha } = req.body || {};
    const arr = loadJSON(dataFile);
    const idx = arr.findIndex(x => x.radicado === id);
    if (idx === -1) return res.status(404).json({ success:false, message:'Radicado no encontrado' });
    if (!arr[idx].seguimiento) arr[idx].seguimiento = {};
    if (estado) arr[idx].seguimiento.estado = estado;
    if (accion) arr[idx].seguimiento.tipoAccion = accion;
    if (typeof fecha === 'string' && fecha.trim().length > 0) {
      const iso = new Date(fecha).toISOString();
      arr[idx].seguimiento.fechaProgramada = iso;
    }
    saveJSON(dataFile, arr);
    return res.json({ success:true });
  } catch (e) {
    return res.status(500).json({ success:false, message:'No se pudo actualizar' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`También accesible por http://127.0.0.1:${PORT}`);
});
