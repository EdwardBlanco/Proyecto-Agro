import { FormEvent, ReactNode, useState } from "react";

type View = "login" | "dashboard" | "users" | "register";

const photoUrl =
  "https://images.unsplash.com/photo-1508175688576-0c076b47b5b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600";

const iconPaths: Record<string, ReactNode> = {
  leaf: <path d="M20.8 3.2C14.3 3.3 8.4 5.4 5.1 10c-2.8 4-.9 8.7 3 9.7 4.6 1.1 8.7-2.7 10.5-7.2 1.3-3.1 1.7-6.3 2.2-9.3ZM4 21c2.5-5.5 6.3-9.2 12-11.2" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z" /><path d="M8 3v15M16 6v15" /></>,
  crop: <><path d="M12 22V9" /><path d="M8 13c-3.5 0-5-2-5-5 3.5 0 5 2 5 5ZM16 10c3.5 0 5-2 5-5-3.5 0-5 2-5 5ZM12 9c-3.5 0-5-2-5-5 3.5 0 5 2 5 5Z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
  droplet: <path d="M12 2S5 9.2 5 14.5a7 7 0 0 0 14 0C19 9.2 12 2 12 2Z" />,
  box: <><path d="m21 8-9 5-9-5 9-5 9 5Z" /><path d="m3 8 9 5 9-5v9l-9 5-9-5V8ZM12 13v9" /></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  wifi: <><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01" /></>,
  tractor: <><path d="M5 17h7V8H8L6 13H3v4h2ZM12 11h5l3 3v3h-2" /><circle cx="7" cy="18" r="3" /><circle cx="17" cy="18" r="2" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`logo ${inverse ? "logo-inverse" : ""}`}>
      <span className="logo-mark"><Icon name="leaf" size={24} /></span>
      <span>Agro<span>Gestión</span></span>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onLogin();
  }

  return (
    <main className="login-page">
      <section className="login-photo">
        <img src={photoUrl} alt="Vista aérea de campos cultivados" />
        <div className="photo-overlay" />
        <div className="login-photo-content">
          <Logo inverse />
          <div>
            <span className="eyebrow light">Gestión agrícola inteligente</span>
            <h1>Cultiva información.<br />Cosecha mejores decisiones.</h1>
            <p>Administra tus predios, cultivos y recursos desde un solo lugar.</p>
          </div>
          <p className="photo-credit">Fotografía de Yulian Alexeyev en Unsplash</p>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-logo"><Logo /></div>
          <span className="eyebrow">Bienvenido de vuelta</span>
          <h2>Inicia sesión</h2>
          <p className="login-subtitle">Ingresa tus datos para acceder a tu finca.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Usuario</span>
              <input type="text" placeholder="Ej. admin@finca.com" defaultValue="admin@finca.com" required />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <span className="input-icon-wrap">
                <input type={showPassword ? "text" : "password"} placeholder="Ingresa tu contraseña" defaultValue="admin123" required />
                <button className="icon-button input-action" type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar u ocultar contraseña">
                  <Icon name="eye" size={19} />
                </button>
              </span>
            </label>
            <div className="login-options">
              <label className="check"><input type="checkbox" defaultChecked /> <span>Recordarme</span></label>
              <button type="button" className="link-button" onClick={() => setMessage("Te enviaremos instrucciones al correo registrado.")}>Olvidé mi contraseña</button>
            </div>
            {message && <div className="inline-message">{message}</div>}
            <button className="primary-button login-button" type="submit">Iniciar sesión <Icon name="chevron" size={18} /></button>
          </form>
          <p className="support">¿Necesitas ayuda? <button className="link-button" type="button">Contacta a soporte</button></p>
        </div>
      </section>
    </main>
  );
}

const navItems = [
  ["grid", "Resumen"],
  ["map", "Predios y lotes"],
  ["crop", "Cultivos"],
  ["calendar", "Calendario"],
  ["droplet", "Riego e IoT"],
  ["box", "Inventario"],
];

function Shell({ view, setView, onLogout, children }: { view: View; setView: (view: View) => void; onLogout: () => void; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-head">
          <Logo inverse />
          <button className="icon-button menu-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><Icon name="close" /></button>
        </div>
        <div className="farm-switcher">
          <span className="farm-avatar"><Icon name="tractor" /></span>
          <span><small>Finca activa</small><strong>El Paraíso</strong></span>
          <Icon name="chevron" size={15} />
        </div>
        <nav className="sidebar-nav">
          <small>MENÚ PRINCIPAL</small>
          {navItems.map(([icon, label]) => (
            <button key={label} className={view === "dashboard" && label === "Resumen" ? "active" : ""} onClick={() => { if (label === "Resumen") setView("dashboard"); setMenuOpen(false); }}>
              <Icon name={icon} /> <span>{label}</span>
            </button>
          ))}
          <small>ADMINISTRACIÓN</small>
          <button className={view === "users" || view === "register" ? "active" : ""} onClick={() => { setView("users"); setMenuOpen(false); }}>
            <Icon name="users" /> <span>Usuarios</span>
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-profile">
            <span className="avatar">CM</span>
            <span><strong>Carlos Méndez</strong><small>Administrador</small></span>
          </div>
          <button className="logout-button" onClick={onLogout}><Icon name="logout" size={17} /> Cerrar sesión</button>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></button>
          <div className="top-search"><Icon name="search" size={19} /><input placeholder="Buscar lote, cultivo o actividad..." /></div>
          <div className="top-actions">
            <span className="weather">24° <small>Parcialmente nublado</small></span>
            <button className="icon-button notification-button" aria-label="Notificaciones"><Icon name="bell" /><span /></button>
            <div className="top-user">
              <span className="top-avatar">CM</span>
              <span><strong>Carlos Méndez</strong><small>Administrador</small></span>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

const summaryCards = [
  { icon: "map", label: "Predios activos", value: "4", meta: "12 lotes en total", tone: "green" },
  { icon: "crop", label: "Cultivos activos", value: "8", meta: "6 en etapa productiva", tone: "lime" },
  { icon: "grid", label: "Área cultivada", value: "86,4 ha", meta: "de 112 ha disponibles", tone: "earth" },
  { icon: "droplet", label: "Riego activo", value: "3 lotes", meta: "Última lectura hace 8 min", tone: "blue" },
];

function Dashboard() {
  return (
    <main className="page-content">
      <div className="page-heading">
        <div><p className="overline">MARTES, 24 DE JUNIO</p><h1>Buenos días, Carlos</h1><p>Aquí tienes el estado general de tu finca.</p></div>
        <button className="primary-button"><Icon name="plus" size={18} /> Registrar actividad</button>
      </div>
      <div className="summary-grid">
        {summaryCards.map((card) => (
          <article className="summary-card" key={card.label}>
            <span className={`metric-icon ${card.tone}`}><Icon name={card.icon} /></span>
            <div><p>{card.label}</p><strong>{card.value}</strong><small>{card.meta}</small></div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card crop-status wide">
          <div className="card-header"><div><h2>Estado de cultivos</h2><p>Progreso de los ciclos activos</p></div><button className="text-button">Ver todos <Icon name="chevron" size={15} /></button></div>
          <div className="crop-row">
            <span className="crop-symbol avocado">A</span>
            <div className="crop-info"><strong>Aguacate Hass</strong><span>Lote Norte · 18,5 ha</span></div>
            <span className="stage-tag">Floración</span>
            <div className="progress-cell"><span><small>Progreso</small><strong>68%</strong></span><div className="progress"><i style={{ width: "68%" }} /></div></div>
          </div>
          <div className="crop-row">
            <span className="crop-symbol coffee">C</span>
            <div className="crop-info"><strong>Café Castillo</strong><span>Lote La Colina · 24 ha</span></div>
            <span className="stage-tag pale">Maduración</span>
            <div className="progress-cell"><span><small>Progreso</small><strong>82%</strong></span><div className="progress"><i style={{ width: "82%" }} /></div></div>
          </div>
          <div className="crop-row">
            <span className="crop-symbol corn">M</span>
            <div className="crop-info"><strong>Maíz amarillo</strong><span>Lote El Roble · 12,8 ha</span></div>
            <span className="stage-tag yellow">Desarrollo</span>
            <div className="progress-cell"><span><small>Progreso</small><strong>41%</strong></span><div className="progress"><i style={{ width: "41%" }} /></div></div>
          </div>
        </section>
        <section className="card alerts">
          <div className="card-header"><div><h2>Alertas</h2><p>Requieren tu atención</p></div><span className="count-badge">4</span></div>
          <Alert tone="critical" title="Humedad crítica" text="Lote 07 · Aguacate" time="Hace 12 min" />
          <Alert tone="warning" title="Insumo por vencer" text="Fertilizante NPK · 3 unidades" time="Vence en 8 días" />
          <Alert tone="info" title="Sensor sin conexión" text="Estación Norte · S-104" time="Hace 2 horas" />
          <button className="full-link">Ver todas las alertas</button>
        </section>
        <section className="card calendar-card">
          <div className="card-header"><div><h2>Calendario agrícola</h2><p>Próximas actividades</p></div><button className="icon-button bordered"><Icon name="calendar" size={18} /></button></div>
          <div className="day-row"><div className="date-box active"><strong>24</strong><small>HOY</small></div><div className="activity-icon water"><Icon name="droplet" size={17} /></div><div><strong>Riego programado</strong><span>Lote Norte · 06:30</span></div></div>
          <div className="day-row"><div className="date-box"><strong>25</strong><small>MIÉ</small></div><div className="activity-icon soil"><Icon name="crop" size={17} /></div><div><strong>Aplicación fertilizante</strong><span>Lote La Colina · 08:00</span></div></div>
          <div className="day-row"><div className="date-box"><strong>27</strong><small>VIE</small></div><div className="activity-icon harvest"><Icon name="box" size={17} /></div><div><strong>Cosecha proyectada</strong><span>Lote El Descanso · Todo el día</span></div></div>
        </section>
        <section className="card iot-card">
          <div className="card-header"><div><h2>Monitoreo IoT</h2><p>Promedio de los sensores</p></div><span className="live"><i /> En línea</span></div>
          <div className="sensor-grid">
            <div><span className="sensor-icon moisture"><Icon name="droplet" /></span><p>Humedad suelo</p><strong>64<span>%</span></strong><small className="positive">Óptima</small></div>
            <div><span className="sensor-icon temp">°</span><p>Temperatura</p><strong>24<span>°C</span></strong><small>Máx. 27°</small></div>
            <div><span className="sensor-icon humidity"><Icon name="droplet" /></span><p>Hum. ambiente</p><strong>72<span>%</span></strong><small>Estable</small></div>
          </div>
          <div className="device-status"><span><Icon name="wifi" size={17} /> 18 de 20 sensores conectados</span><button className="text-button">Ver dispositivos</button></div>
        </section>
        <section className="card harvest-card">
          <div className="card-header"><div><h2>Próximas cosechas</h2><p>Proyección a 30 días</p></div></div>
          <div className="harvest-feature">
            <div><span className="tag">EN 6 DÍAS</span><h3>Tomate chonto</h3><p>Lote El Descanso · 5,2 ha</p><strong>18,4 <small>ton estimadas</small></strong></div>
            <span className="harvest-art"><Icon name="crop" size={42} /></span>
          </div>
          <div className="mini-harvest"><span><i className="coffee-dot" /><span><strong>Café Castillo</strong><small>12 de julio · 24 ha</small></span></span><strong>16 días</strong></div>
        </section>
        <section className="card finance-card">
          <div className="card-header"><div><h2>Resumen financiero</h2><p>Este mes</p></div><button className="text-button">Ver reporte</button></div>
          <div className="finance-numbers"><div><small>Ingresos</small><strong>$48,2 M</strong><span>+12,4%</span></div><div><small>Costos</small><strong>$31,6 M</strong><span className="neutral">+3,1%</span></div><div className="margin"><small>Margen</small><strong>34,4%</strong></div></div>
          <div className="bars"><i style={{ height: "52%" }} /><i style={{ height: "64%" }} /><i style={{ height: "45%" }} /><i style={{ height: "72%" }} /><i style={{ height: "66%" }} /><i className="active" style={{ height: "88%" }} /></div>
          <div className="months"><span>ENE</span><span>FEB</span><span>MAR</span><span>ABR</span><span>MAY</span><span>JUN</span></div>
        </section>
        <section className="card inventory-card">
          <div className="card-header"><div><h2>Inventario</h2><p>Estado de insumos</p></div><button className="text-button">Ver inventario</button></div>
          <div className="inventory-summary"><div><span className="big-ring">78<small>%</small></span><p>Abastecimiento<br /><strong>general</strong></p></div><div><p><span>Fertilizantes</span><strong>84%</strong></p><div className="progress small"><i style={{ width: "84%" }} /></div><p><span>Control de plagas</span><strong>61%</strong></p><div className="progress small warning"><i style={{ width: "61%" }} /></div></div></div>
          <p className="inventory-alert"><span>!</span> 3 productos próximos a vencer</p>
        </section>
      </div>
    </main>
  );
}

function Alert({ tone, title, text, time }: { tone: string; title: string; text: string; time: string }) {
  return <div className="alert-row"><span className={`alert-indicator ${tone}`}>!</span><div><strong>{title}</strong><span>{text}</span><small>{time}</small></div><Icon name="chevron" size={16} /></div>;
}

const userRows = [
  { initials: "JP", name: "Jorge Pérez", email: "jorge@elparaiso.com", role: "Operario", status: "Activo", last: "Hoy, 07:42" },
  { initials: "LM", name: "Laura Martínez", email: "laura@elparaiso.com", role: "Agrónomo", status: "Activo", last: "Ayer, 18:10" },
  { initials: "DR", name: "Diego Rojas", email: "diego@elparaiso.com", role: "Supervisor", status: "Activo", last: "23 jun, 16:24" },
  { initials: "AS", name: "Ana Silva", email: "ana@elparaiso.com", role: "Operario", status: "Inactivo", last: "18 jun, 09:12" },
];

function Users({ onCreate }: { onCreate: () => void }) {
  return (
    <main className="page-content users-page">
      <div className="page-heading">
        <div><p className="overline">ADMINISTRACIÓN</p><h1>Usuarios y accesos</h1><p>Crea cuentas y administra los permisos de tu equipo.</p></div>
        <button className="primary-button" onClick={onCreate}><Icon name="plus" size={18} /> Nuevo usuario</button>
      </div>
      <div className="users-layout table-only">
        <section className="card users-list">
          <div className="card-header users-header">
            <div><h2>Equipo de la finca</h2><p>5 usuarios registrados</p></div>
            <div className="mini-search"><Icon name="search" size={17} /><input placeholder="Buscar usuario..." /></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th /></tr></thead>
              <tbody>
                <tr><td><div className="table-user"><span className="avatar admin">CM</span><span><strong>Carlos Méndez</strong><small>carlos@elparaiso.com</small></span></div></td><td><span className="role admin-role">Administrador</span></td><td><span className="status active">Activo</span></td><td>Ahora</td><td><button className="dots" aria-label="Opciones">•••</button></td></tr>
                {userRows.map((user) => <tr key={user.email}>
                  <td><div className="table-user"><span className="avatar">{user.initials}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
                  <td><span className="role">{user.role}</span></td><td><span className={`status ${user.status === "Activo" ? "active" : ""}`}>{user.status}</span></td><td>{user.last}</td><td><button className="dots" aria-label={`Opciones para ${user.name}`}>•••</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function RegisterUser({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function createUser(event: FormEvent) {
    event.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  return (
    <main className="page-content users-page">
      <div className="page-heading">
        <div><p className="overline">ADMINISTRACIÓN</p><h1>Registrar usuario</h1><p>Crea una nueva cuenta y asigna sus permisos de acceso.</p></div>
        <button className="secondary-button" onClick={onBack}><span className="back-icon"><Icon name="chevron" size={18} /></span> Volver al listado</button>
      </div>
      <div className="register-layout">
        <section className="card create-user">
          <div className="form-heading"><span className="metric-icon green"><Icon name="users" /></span><div><h2>Registrar usuario</h2><p>Completa la información del trabajador.</p></div></div>
          {saved && <div className="success-message">Usuario creado correctamente.</div>}
          <form onSubmit={createUser}>
            <div className="form-grid">
              <label className="field"><span>Nombre</span><input placeholder="Ej. María" required /></label>
              <label className="field"><span>Apellido</span><input placeholder="Ej. Gómez" required /></label>
            </div>
            <label className="field"><span>Correo electrónico</span><input type="email" placeholder="nombre@finca.com" required /></label>
            <label className="field"><span>Teléfono <em>Opcional</em></span><input type="tel" placeholder="+57 300 000 0000" /></label>
            <label className="field"><span>Rol asignado</span><select defaultValue="" required><option value="" disabled>Selecciona un rol</option><option>Administrador</option><option>Agrónomo</option><option>Supervisor</option><option>Operario</option></select></label>
            <div className="permissions-note"><Icon name="leaf" size={18} /><p><strong>Operario</strong><span>Puede consultar tareas, registrar actividades y reportar incidencias.</span></p></div>
            <label className="field"><span>Contraseña temporal</span><span className="input-icon-wrap"><input type={showPass ? "text" : "password"} placeholder="Mínimo 8 caracteres" required minLength={8} /><button className="icon-button input-action" type="button" onClick={() => setShowPass(!showPass)} aria-label="Mostrar contraseña"><Icon name="eye" size={18} /></button></span></label>
            <label className="check terms"><input type="checkbox" defaultChecked /><span>Solicitar cambio de contraseña al iniciar sesión</span></label>
            <button className="primary-button form-submit" type="submit">Crear usuario <Icon name="chevron" size={17} /></button>
          </form>
        </section>
        <aside className="register-help">
          <span className="metric-icon green"><Icon name="leaf" /></span>
          <h2>Acceso seguro para tu equipo</h2>
          <p>Cada trabajador recibirá sus propias credenciales y únicamente podrá acceder a las funciones permitidas por su rol.</p>
          <div><strong>Administrador</strong><span>Control completo de la finca y usuarios.</span></div>
          <div><strong>Agrónomo</strong><span>Gestiona cultivos, labores y recomendaciones.</span></div>
          <div><strong>Supervisor</strong><span>Asigna tareas y consulta reportes operativos.</span></div>
          <div><strong>Operario</strong><span>Consulta y registra sus actividades diarias.</span></div>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState<View>("login");
  if (view === "login") return <Login onLogin={() => setView("dashboard")} />;
  return (
    <Shell view={view} setView={setView} onLogout={() => setView("login")}>
      {view === "register"
        ? <RegisterUser onBack={() => setView("users")} />
        : <Users onCreate={() => setView("register")} />}
    </Shell>
  );
}
