import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const GENDERS = ['Female', 'Male', 'Other'];
const EMPTY_FORM = {
  name: '', age: '', gender: 'Female',
  symptoms: '', diagnosis: '', village: '',
};

export default function Dashboard() {
  const [patients, setPatients]   = useState([]);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [toast, setToast]         = useState(null);
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [selected, setSelected]   = useState(null);

  /* ── fetch patients ── */
  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    setFetching(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setPatients(data || []);
    setFetching(false);
  }

  /* ── submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.age || !form.village) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .insert([{ ...form, age: Number(form.age) }])
      .select()
      .single();
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    setPatients(prev => [data, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    showToast(`Patient "${data.name}" saved successfully!`, 'success');
  }

  /* ── delete ── */
  async function handleDelete(id) {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (!error) {
      setPatients(prev => prev.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast('Record deleted', 'info');
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.village.toLowerCase().includes(search.toLowerCase()) ||
    (p.symptoms || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: patients.length,
    female: patients.filter(p => p.gender === 'Female').length,
    male: patients.filter(p => p.gender === 'Male').length,
    villages: [...new Set(patients.map(p => p.village))].length,
  };

  return (
    <>
      <Head>
        <title>SwasthyaSathi · Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --g1: #0a4d2e; --g2: #1a7a4a; --g3: #2ecc71; --gpale: #d4f5e2; --gcards: #f0faf4;
          --saf: #e67e22; --safl: #fdecd2;
          --ink: #0d1f14; --muted: #5a7366; --border: #c8e6d4;
          --white: #fff; --cream: #fdf8f0; --red: #e74c3c;
        }
        body { font-family: 'DM Sans', sans-serif; background: #f4f9f6; color: var(--ink); }

        /* ── LAYOUT ── */
        .shell { display: flex; min-height: 100vh; }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 240px; flex-shrink: 0;
          background: var(--g1); color: white;
          display: flex; flex-direction: column;
          padding: 1.5rem 1rem; position: fixed;
          top: 0; left: 0; bottom: 0; z-index: 50;
        }
        .sb-logo {
          font-family: 'Sora', sans-serif; font-weight: 800;
          font-size: 1.15rem; padding: 0.5rem 0.8rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 1.2rem;
        }
        .sb-logo span { color: var(--g3); }
        .sb-nav { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; }
        .sb-link {
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.65rem 0.8rem; border-radius: 10px;
          font-size: 0.88rem; font-weight: 500; color: rgba(255,255,255,0.65);
          cursor: pointer; transition: all .2s; text-decoration: none;
          border: none; background: none; width: 100%; text-align: left;
        }
        .sb-link:hover { background: rgba(255,255,255,0.08); color: white; }
        .sb-link.active { background: var(--g2); color: white; }
        .sb-icon { font-size: 1rem; width: 20px; text-align: center; }
        .sb-footer { font-size: 0.72rem; color: rgba(255,255,255,0.35); padding: 0.8rem; }

        /* ── MAIN ── */
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

        /* ── TOPBAR ── */
        .topbar {
          background: white; border-bottom: 1px solid var(--border);
          padding: 1rem 2rem; display: flex; align-items: center;
          justify-content: space-between; position: sticky; top: 0; z-index: 40;
        }
        .topbar h1 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1.15rem; }
        .topbar-right { display: flex; align-items: center; gap: 1rem; }
        .search-box {
          display: flex; align-items: center; gap: 0.5rem;
          background: var(--gcards); border: 1px solid var(--border);
          border-radius: 50px; padding: 0.45rem 1rem; font-size: 0.85rem;
        }
        .search-box input {
          border: none; background: none; outline: none;
          font-size: 0.85rem; width: 200px; font-family: 'DM Sans', sans-serif;
        }
        .btn-add {
          display: flex; align-items: center; gap: 0.4rem;
          background: var(--g2); color: white;
          padding: 0.55rem 1.2rem; border-radius: 50px;
          border: none; cursor: pointer; font-weight: 600;
          font-size: 0.88rem; font-family: 'DM Sans', sans-serif;
          transition: all .2s;
        }
        .btn-add:hover { background: var(--g1); transform: translateY(-1px); }

        /* ── CONTENT ── */
        .content { padding: 2rem; flex: 1; }

        /* ── STATS ── */
        .stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 1.2rem; margin-bottom: 2rem; }
        .stat-card {
          background: white; border-radius: 16px; padding: 1.4rem 1.6rem;
          border: 1px solid var(--border); display: flex; align-items: center; gap: 1rem;
          transition: box-shadow .2s;
        }
        .stat-card:hover { box-shadow: 0 4px 20px #1a7a4a12; }
        .stat-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
        }
        .stat-icon.green { background: var(--gpale); }
        .stat-icon.orange { background: var(--safl); }
        .stat-icon.blue { background: #e8f4fd; }
        .stat-icon.pink { background: #fde8f0; }
        .stat-num { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 1.8rem; line-height: 1; }
        .stat-label { font-size: 0.78rem; color: var(--muted); margin-top: 0.2rem; }

        /* ── TABLE ── */
        .table-card {
          background: white; border-radius: 16px;
          border: 1px solid var(--border); overflow: hidden;
        }
        .table-head {
          padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .table-head h2 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1rem; }
        .count-badge {
          background: var(--gpale); color: var(--g2);
          border-radius: 50px; padding: 0.2rem 0.7rem;
          font-size: 0.75rem; font-weight: 700;
        }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f8fdf9; }
        th {
          padding: 0.75rem 1.2rem; text-align: left;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--muted);
          border-bottom: 1px solid var(--border);
        }
        tbody tr {
          border-bottom: 1px solid #f0f7f3; cursor: pointer;
          transition: background .15s;
        }
        tbody tr:hover { background: var(--gcards); }
        tbody tr:last-child { border-bottom: none; }
        td { padding: 0.9rem 1.2rem; font-size: 0.88rem; vertical-align: middle; }
        .name-cell { font-weight: 600; color: var(--ink); }
        .village-cell { color: var(--muted); font-size: 0.82rem; }
        .gender-badge {
          display: inline-block; border-radius: 50px; padding: 0.2rem 0.65rem;
          font-size: 0.72rem; font-weight: 600;
        }
        .gender-badge.female { background: #fde8f0; color: #c0145a; }
        .gender-badge.male   { background: #e8f0fd; color: #144ec0; }
        .gender-badge.other  { background: var(--safl); color: var(--saf); }
        .symptom-cell {
          max-width: 160px; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; color: var(--muted); font-size: 0.82rem;
        }
        .date-cell { color: var(--muted); font-size: 0.78rem; }
        .action-btn {
          background: none; border: none; cursor: pointer;
          padding: 0.3rem 0.5rem; border-radius: 6px;
          font-size: 0.85rem; transition: background .15s;
        }
        .action-btn:hover { background: #fee; }
        .empty-state {
          text-align: center; padding: 4rem 2rem; color: var(--muted);
        }
        .empty-state .emoji { font-size: 3rem; margin-bottom: 1rem; }
        .empty-state p { font-size: 0.9rem; }

        /* ── MODAL OVERLAY ── */
        .overlay {
          position: fixed; inset: 0; background: rgba(10,30,20,0.45);
          z-index: 100; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        /* ── ADD PATIENT MODAL ── */
        .modal {
          background: white; border-radius: 24px; padding: 2rem;
          width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: slideUp .25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .modal-header h2 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1.1rem; }
        .close-btn {
          background: #f0f0f0; border: none; border-radius: 50%;
          width: 32px; height: 32px; cursor: pointer; font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .close-btn:hover { background: #e0e0e0; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group.full { grid-column: 1 / -1; }
        label { font-size: 0.78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        input, select, textarea {
          padding: 0.65rem 0.9rem; border: 1.5px solid var(--border);
          border-radius: 10px; font-size: 0.9rem; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color .2s; background: var(--gcards);
          color: var(--ink);
        }
        input:focus, select:focus, textarea:focus { border-color: var(--g2); background: white; }
        textarea { resize: vertical; min-height: 80px; }
        .required { color: var(--saf); }
        .btn-submit {
          width: 100%; padding: 0.85rem; border-radius: 12px;
          background: var(--g2); color: white; border: none;
          font-weight: 700; font-size: 0.95rem; font-family: 'DM Sans', sans-serif;
          cursor: pointer; margin-top: 1rem; transition: all .2s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .btn-submit:hover:not(:disabled) { background: var(--g1); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── DETAIL PANEL ── */
        .detail-modal {
          background: white; border-radius: 24px; padding: 2rem;
          width: 100%; max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: slideUp .25s ease;
        }
        .detail-avatar {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--gpale); display: flex; align-items: center;
          justify-content: center; font-size: 1.5rem; margin-bottom: 1rem;
        }
        .detail-name { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 1.3rem; margin-bottom: 0.2rem; }
        .detail-meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 1.5rem; }
        .detail-row { display: flex; flex-direction: column; gap: 0.2rem; margin-bottom: 1rem; }
        .detail-row .dlabel { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
        .detail-row .dval { font-size: 0.92rem; color: var(--ink); background: var(--gcards); border-radius: 8px; padding: 0.5rem 0.8rem; }
        .detail-row .dval.green { background: var(--gpale); color: var(--g1); }
        .btn-delete {
          width: 100%; padding: 0.75rem; border-radius: 12px;
          background: #fff0f0; color: var(--red); border: 1.5px solid #fdd;
          font-weight: 700; font-size: 0.88rem; font-family: 'DM Sans', sans-serif;
          cursor: pointer; margin-top: 1rem; transition: all .2s;
        }
        .btn-delete:hover { background: #fee; }

        /* ── TOAST ── */
        .toast {
          position: fixed; bottom: 2rem; right: 2rem; z-index: 200;
          padding: 0.9rem 1.4rem; border-radius: 14px;
          font-size: 0.88rem; font-weight: 600; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          animation: toastIn .3s ease;
          display: flex; align-items: center; gap: 0.5rem;
        }
        @keyframes toastIn { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .toast.success { background: var(--g1); color: white; }
        .toast.error   { background: var(--red); color: white; }
        .toast.info    { background: var(--ink); color: white; }

        /* ── LOADING ── */
        .spinner {
          width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin .7s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .skeleton {
          background: linear-gradient(90deg, #f0f7f3 25%, #e0f0e8 50%, #f0f7f3 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite; border-radius: 8px; height: 48px;
        }
        @keyframes shimmer { to { background-position: -200% 0; } }

        @media (max-width: 900px) {
          .sidebar { display: none; }
          .main { margin-left: 0; }
          .stats-row { grid-template-columns: repeat(2,1fr); }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="shell">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-logo">🌿 Swasthya<span>Sathi</span></div>
          <nav className="sb-nav">
            <a href="/" className="sb-link"><span className="sb-icon">🏠</span> Home</a>
            <button className="sb-link active"><span className="sb-icon">🩺</span> Patients</button>
            <button className="sb-link"><span className="sb-icon">📊</span> Reports</button>
            <button className="sb-link"><span className="sb-icon">💉</span> Vaccinations</button>
            <button className="sb-link"><span className="sb-icon">🔔</span> Reminders</button>
            <button className="sb-link"><span className="sb-icon">⚙️</span> Settings</button>
          </nav>
          <div className="sb-footer">ASHA Worker Portal · v1.0</div>
        </aside>

        {/* MAIN */}
        <div className="main">
          {/* TOPBAR */}
          <header className="topbar">
            <h1>Patient Records</h1>
            <div className="topbar-right">
              <div className="search-box">
                <span>🔍</span>
                <input
                  placeholder="Search patients, village..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="btn-add" onClick={() => setShowForm(true)}>
                + Add Patient
              </button>
            </div>
          </header>

          {/* CONTENT */}
          <main className="content">
            {/* STATS */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon green">🧑‍⚕️</div>
                <div><div className="stat-num">{stats.total}</div><div className="stat-label">Total Patients</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon pink">👩</div>
                <div><div className="stat-num">{stats.female}</div><div className="stat-label">Female</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">👨</div>
                <div><div className="stat-num">{stats.male}</div><div className="stat-label">Male</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">🏘</div>
                <div><div className="stat-num">{stats.villages}</div><div className="stat-label">Villages</div></div>
              </div>
            </div>

            {/* TABLE */}
            <div className="table-card">
              <div className="table-head">
                <h2>All Patients</h2>
                <span className="count-badge">{filtered.length} records</span>
              </div>
              {fetching ? (
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="emoji">🏥</div>
                  <p>{search ? 'No patients match your search.' : 'No patients yet. Add your first patient record!'}</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Village</th>
                      <th>Symptoms</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} onClick={() => setSelected(p)}>
                        <td className="name-cell">{p.name}</td>
                        <td>{p.age} yrs</td>
                        <td>
                          <span className={`gender-badge ${p.gender.toLowerCase()}`}>
                            {p.gender}
                          </span>
                        </td>
                        <td className="village-cell">📍 {p.village}</td>
                        <td><div className="symptom-cell">{p.symptoms || '—'}</div></td>
                        <td className="date-cell">
                          {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td>
                          <button
                            className="action-btn"
                            onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                            title="Delete"
                          >🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ADD PATIENT MODAL */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🩺 New Patient Record</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Patient Name <span className="required">*</span></label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Meena Devi" required />
                </div>
                <div className="form-group">
                  <label>Age <span className="required">*</span></label>
                  <input type="number" min="1" max="120" value={form.age} onChange={e => setForm(f => ({...f, age: e.target.value}))} placeholder="e.g. 34" required />
                </div>
                <div className="form-group">
                  <label>Gender <span className="required">*</span></label>
                  <select value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value}))}>
                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label>Village <span className="required">*</span></label>
                  <input value={form.village} onChange={e => setForm(f => ({...f, village: e.target.value}))} placeholder="e.g. Rampur, UP" required />
                </div>
                <div className="form-group full">
                  <label>Symptoms</label>
                  <textarea value={form.symptoms} onChange={e => setForm(f => ({...f, symptoms: e.target.value}))} placeholder="e.g. Fever, Headache, Body Pain" />
                </div>
                <div className="form-group full">
                  <label>Diagnosis / Notes</label>
                  <textarea value={form.diagnosis} onChange={e => setForm(f => ({...f, diagnosis: e.target.value}))} placeholder="e.g. Viral Fever, refer to PHC" />
                </div>
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <><span className="spinner" /> Saving...</> : '✅ Save Patient Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="detail-avatar">
                {selected.gender === 'Female' ? '👩' : selected.gender === 'Male' ? '👨' : '🧑'}
              </div>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="detail-name">{selected.name}</div>
            <div className="detail-meta">{selected.age} years · {selected.gender} · 📍 {selected.village}</div>
            <div className="detail-row">
              <div className="dlabel">Symptoms</div>
              <div className="dval">{selected.symptoms || 'Not recorded'}</div>
            </div>
            <div className="detail-row">
              <div className="dlabel">Diagnosis</div>
              <div className="dval green">{selected.diagnosis || 'Pending'}</div>
            </div>
            <div className="detail-row">
              <div className="dlabel">Record ID</div>
              <div className="dval" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{selected.id}</div>
            </div>
            <div className="detail-row">
              <div className="dlabel">Recorded On</div>
              <div className="dval">{new Date(selected.created_at).toLocaleString('en-IN')}</div>
            </div>
            <button className="btn-delete" onClick={() => handleDelete(selected.id)}>🗑 Delete Record</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'} {toast.msg}
        </div>
      )}
    </>
  );
}
